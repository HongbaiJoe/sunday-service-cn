/**
 * Resend 邮件发送（邮箱验证码）。
 * 需要环境变量：RESEND_API_KEY、RESEND_FROM（发件人地址，如 "Sunday Service CN <no-reply@sundayservicecn.com>"）
 */
import { env } from "cloudflare:workers";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export class EmailError extends Error {}

export async function sendEmailCode(email: string, code: string): Promise<string> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM;

  const missing = [
    ["RESEND_API_KEY", apiKey],
    ["RESEND_FROM", from],
  ].filter(([, value]) => !value).map(([name]) => name as string);
  if (missing.length) {
    throw new EmailError(`邮件服务未配置：缺少 ${missing.join(", ")}。请在 Cloudflare 控制台为 Worker 添加这些环境变量。`);
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Sunday Service CN 登录验证码",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;border:1px solid #e5e5e5;border-radius:16px;">
          <h2 style="margin:0 0 8px;font-size:20px;">Sunday Service CN</h2>
          <p style="margin:0 0 24px;color:#666;font-size:14px;">你的邮箱验证码</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f5f5f5;border-radius:12px;">${code}</div>
          <p style="margin:24px 0 0;color:#999;font-size:13px;line-height:1.6;">验证码 5 分钟内有效。如非本人操作，请忽略此邮件。</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new EmailError(`邮件发送失败：HTTP ${response.status} ${body.slice(0, 200)}`);
  }

  const result = await response.json().catch(() => null) as { id?: string } | null;
  return result?.id ?? "";
}
