import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { verifyPassword } from "../../../lib/password";
import { assertTrustedOrigin, sessionCookie } from "../../../lib/auth";
import { inputErrorResponse, json } from "../../../lib/http";
import { log, maskAccount } from "../../../lib/log";
import { checkAccountLocked, clearLoginFailures, recordLoginFailure } from "../../../lib/security";
import {
  AuthChannel,
  SESSION_TTL_MS,
  findUser,
  normalizeEmail,
  normalizePhone,
} from "../../../lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await assertTrustedOrigin();
    const body = await request.json().catch(() => ({})) as { channel?: unknown; phone?: unknown; email?: unknown; password?: unknown };
    const channel: AuthChannel = body.channel === "email" ? "email" : "phone";
    const account = channel === "phone" ? normalizePhone(body.phone) : normalizeEmail(body.email);
    if (typeof body.password !== "string" || !body.password) {
      return json({ error: "请输入密码" }, 400);
    }

    await ensureDatabase();
    const db = getD1();
    const accountKey = `${channel}:${account}`;

    // 通用错误提示（不区分"账号不存在"和"密码错误"，避免泄露账号信息）
    const fail = () => json({ error: "账号或密码不正确" }, 401);

    // 账号锁定检查：连续失败 >= 5 次后锁定 15 分钟
    const lockSeconds = await checkAccountLocked(db, accountKey);
    if (lockSeconds > 0) {
      log("auth.login", { channel, account: maskAccount(channel, account), result: "locked", waitSeconds: lockSeconds }, "warn");
      return json({ error: `尝试次数过多，请 ${lockSeconds} 秒后再试` }, 429);
    }

    const user = await findUser(db, channel, account);
    if (!user || user.status !== "active") {
      // 账号不存在或被停用：不记录失败计数。
      // 原因：锁不存在的账号没有意义，反而让攻击者可以预先"锁定"目标邮箱（DoS）。
      // 仍返回统一错误文案，不泄露账号是否存在。
      log("auth.login", { channel, account: maskAccount(channel, account), result: "account_not_found_or_inactive" }, "warn");
      return fail();
    }

    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) {
      await recordLoginFailure(db, accountKey);
      log("auth.login", { channel, account: maskAccount(channel, account), result: "invalid_password" }, "warn");
      return fail();
    }

    // 登录成功：清零失败计数
    await clearLoginFailures(db, accountKey);

    // 签发会话
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, user.id, expiresAt).run();

    log("auth.login", { channel, account: maskAccount(channel, account), result: "success", userId: user.id });

    return new Response(JSON.stringify({
      ok: true,
      user: { id: user.id, email: user.email, phone: user.phone ?? "", displayName: user.display_name },
    }), {
      headers: { "content-type": "application/json", "set-cookie": sessionCookie(sessionId) },
    });
  } catch (error) {
    return inputErrorResponse(error);
  }
}
