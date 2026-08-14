import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { hashPassword } from "../../../lib/password";
import { assertTrustedOrigin, sessionCookie } from "../../../lib/auth";
import { inputErrorResponse, json } from "../../../lib/http";
import { moderateContent } from "../../../lib/moderation";
import { log, maskAccount } from "../../../lib/log";
import {
  checkAccountLocked,
  clearCodeFailures,
  codeAttemptExceeded,
  recordCodeFailure,
  validatePasswordStrength,
} from "../../../lib/security";
import {
  AuthChannel,
  SESSION_TTL_MS,
  findUser,
  findUserByUsername,
  latestUnusedCode,
  markCodeUsed,
  normalizeCode,
  normalizeDisplayName,
  normalizeEmail,
  normalizePassword,
  normalizePhone,
} from "../../../lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await assertTrustedOrigin();
    const body = await request.json().catch(() => ({})) as { channel?: unknown; phone?: unknown; email?: unknown; code?: unknown; password?: unknown; displayName?: unknown };
    const channel: AuthChannel = body.channel === "email" ? "email" : "phone";
    const account = channel === "phone" ? normalizePhone(body.phone) : normalizeEmail(body.email);
    const code = normalizeCode(body.code);
    const password = normalizePassword(body.password);
    const accountKey = `${channel}:${account}`;

    await ensureDatabase();
    const db = getD1();

    // 登录态锁定检查（防止验证码爆破：同一账号连续失败 >= 5 次后锁定 15 分钟）
    const lockSeconds = await checkAccountLocked(db, accountKey);
    if (lockSeconds > 0) {
      log("auth.verify", { channel, account: maskAccount(channel, account), result: "locked", waitSeconds: lockSeconds }, "warn");
      return json({ error: `尝试次数过多，请 ${lockSeconds} 秒后再试` }, 429);
    }

    // 验证码错误次数超限：作废该账号所有未用验证码，提示重新获取。
    // 注意：不写入 login 锁定（避免攻击者 5 次随机猜测永久 DoS 目标账号的验证码登录）。
    // code 失败计数窗口过期自动清零（见 security.ts codeAttemptExceeded）。
    if (await codeAttemptExceeded(db, accountKey)) {
      await db.prepare("UPDATE sms_codes SET used = 1 WHERE email = ? AND used = 0").bind(account).run().catch(() => {});
      await db.prepare("UPDATE sms_codes SET used = 1 WHERE phone = ? AND used = 0").bind(account).run().catch(() => {});
      await db.prepare("DELETE FROM auth_attempts WHERE kind = 'code' AND account_key = ?").bind(accountKey).run().catch(() => {});
      log("auth.verify", { channel, account: maskAccount(channel, account), result: "code_attempts_exhausted" }, "warn");
      return json({ error: "验证码错误次数过多，请重新获取验证码" }, 429);
    }

    // 找到该账号最近一条未使用的验证码
    const record = await latestUnusedCode(db, channel, account);
    if (!record) {
      await recordCodeFailure(db, accountKey);
      return json({ error: "验证码不正确或已失效，请重新获取" }, 400);
    }

    const expired = new Date(record.expires_at).getTime() < Date.now();
    if (expired) {
      await markCodeUsed(db, record.id);
      await recordCodeFailure(db, accountKey);
      return json({ error: "验证码已过期，请重新获取" }, 400);
    }

    if (record.code !== code) {
      await recordCodeFailure(db, accountKey);
      log("auth.verify", { channel, account: maskAccount(channel, account), result: "wrong_code" }, "warn");
      return json({ error: "验证码不正确" }, 400);
    }

    // 密码强度校验（注册必填密码；登录/改密若提供新密码同样校验）
    if (password) {
      const strengthError = validatePasswordStrength(password);
      if (strengthError) return json({ error: strengthError }, 400);
    }

    // 标记验证码已使用
    await markCodeUsed(db, record.id);
    await clearCodeFailures(db, accountKey);

    // 查询或创建用户
    let user = await findUser(db, channel, account);
    const isNewUser = !user;
    if (!user) {
      const id = crypto.randomUUID();
      const passwordHash = password ? await hashPassword(password) : null;
      // 用户名：注册时用户填写的名字（必填），直接作为用户名，不再自动生成随机后缀
      const displayName = normalizeDisplayName(body.displayName);
      // 内容审核：用户名需通过屏蔽词检测
      const moderation = moderateContent(displayName);
      if (!moderation.passed) return json({ error: moderation.message }, 400);
      // 用户名唯一性：同名用户自动追加数字后缀（如 名字、名字2、名字3…）
      let username = displayName;
      let suffix = 2;
      while (await findUserByUsername(db, username)) {
        username = `${displayName}${suffix}`;
        suffix += 1;
        if (suffix > 100) return json({ error: "该用户名已被大量占用，请换一个名字" }, 400);
      }

      if (channel === "phone") {
        await db.prepare(
          "INSERT INTO users (id, email, phone, phone_verified_at, display_name, username, role, password_hash) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 'member', ?)",
        ).bind(id, `phone-${account}@sundayservice.cn`, account, displayName, username, passwordHash).run();
      } else {
        await db.prepare(
          "INSERT INTO users (id, email, phone_verified_at, display_name, username, role, password_hash) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, 'member', ?)",
        ).bind(id, account, displayName, username, passwordHash).run();
      }
      user = await findUser(db, channel, account);
      log("auth.verify", { channel, account: maskAccount(channel, account), result: "registered", userId: user!.id });
    } else {
      // 已有用户：更新验证时间；若提供了新密码则更新密码
      if (channel === "phone") {
        await db.prepare("UPDATE users SET phone_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE phone = ?").bind(account).run();
      }
      if (password) {
        const passwordHash = await hashPassword(password);
        await db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?").bind(passwordHash, user.email).run();
        // 安全：修改密码后立即使该用户所有旧会话失效（防止被盗会话在改密后继续有效）
        await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
        log("auth.verify", { channel, account: maskAccount(channel, account), result: "password_changed", userId: user.id });
      }
      user = await findUser(db, channel, account);
    }

    // 签发会话：登录与注册都自动登录，注册成功后无需再次登录
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, user!.id, expiresAt).run();
    const setCookieHeader = sessionCookie(sessionId);

    log("auth.verify", { channel, account: maskAccount(channel, account), result: "success", isNewUser, userId: user!.id });

    return new Response(JSON.stringify({
      ok: true,
      user: { id: user!.id, email: user!.email, phone: user!.phone ?? "", displayName: user!.display_name },
      hasPassword: Boolean(user!.password_hash),
      isNewUser,
    }), {
      headers: {
        "content-type": "application/json",
        ...(setCookieHeader ? { "set-cookie": setCookieHeader } : {}),
      },
    });
  } catch (error) {
    return inputErrorResponse(error);
  }
}
