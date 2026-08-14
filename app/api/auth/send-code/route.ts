import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { inputErrorResponse, json } from "../../../lib/http";
import { SmsError, sendSmsCode } from "../../../lib/sms";
import { EmailError, sendEmailCode } from "../../../lib/email";
import { log, maskAccount } from "../../../lib/log";
import { assertTrustedOrigin } from "../../../lib/auth";
import { rateLimitAllow } from "../../../lib/security";
import {
  AuthChannel,
  MAX_PENDING_PER_ACCOUNT,
  checkCooldown,
  generateCode,
  normalizeEmail,
  normalizePhone,
  pendingCodeCount,
  storeCode,
} from "../../../lib/auth-helpers";

export const dynamic = "force-dynamic";

/** 同一 IP 每分钟最多发送验证码次数（防短信/邮件轰炸） */
const IP_SEND_MAX_PER_MINUTE = 5;

export async function POST(request: Request) {
  try {
    await assertTrustedOrigin();
    const body = await request.json().catch(() => ({})) as { channel?: unknown; phone?: unknown; email?: unknown };
    const channel: AuthChannel = body.channel === "email" ? "email" : "phone";
    const account = channel === "phone" ? normalizePhone(body.phone) : normalizeEmail(body.email);

    await ensureDatabase();
    const db = getD1();

    // 限频1：同一 IP 每分钟最多 5 次（防轰炸）
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipAllowed = await rateLimitAllow(db, "send_code_ip", ip, IP_SEND_MAX_PER_MINUTE, 60 * 1000);
    if (!ipAllowed) {
      log("auth.send_code", { channel, account: maskAccount(channel, account), result: "ip_rate_limited" }, "warn");
      return json({ error: "发送太频繁，请稍后再试" }, 429);
    }

    // 限频2：60 秒内同一账号只能发一次
    const waitSeconds = await checkCooldown(db, channel, account);
    if (waitSeconds > 0) {
      return json({ error: `发送太频繁，请 ${waitSeconds} 秒后再试` }, 429);
    }

    // 清理过期验证码，限制未使用数量
    const pending = await pendingCodeCount(db, channel, account);
    if (pending >= MAX_PENDING_PER_ACCOUNT) {
      return json({ error: "验证码请求过多，请稍后再试" }, 429);
    }

    // 生成验证码并存储
    const code = generateCode();
    await storeCode(db, channel, account, code);

    // 发送
    try {
      if (channel === "phone") {
        await sendSmsCode(account, code);
      } else {
        await sendEmailCode(account, code);
      }
    } catch (error) {
      // 发送失败时删除验证码
      await db.prepare("DELETE FROM sms_codes WHERE phone = ? AND code = ?").bind(account, code).run().catch(() => {});
      await db.prepare("DELETE FROM sms_codes WHERE email = ? AND code = ?").bind(account, code).run().catch(() => {});
      if (error instanceof SmsError || error instanceof EmailError) {
        log("auth.send_code", { channel, account: maskAccount(channel, account), result: "provider_error", error: error.message.slice(0, 200) }, "error");
        return json({ error: error.message }, 502);
      }
      throw error;
    }

    log("auth.send_code", { channel, account: maskAccount(channel, account), result: "sent" });
    return json({ ok: true, message: channel === "phone" ? "验证码已发送" : "验证码已发送到邮箱" });
  } catch (error) {
    return inputErrorResponse(error);
  }
}
