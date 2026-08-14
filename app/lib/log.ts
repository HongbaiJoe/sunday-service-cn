/**
 * 轻量结构化日志（JSON 单行，Cloudflare Workers Logs 直接可查）。
 *
 * 铁律：本模块严禁记录 password / code / token / 完整 email / 完整手机号。
 * 所有账号类字段必须走 maskEmail / maskPhone 脱敏后再传入。
 *
 * 用法：
 *   import { log } from "./log";
 *   log("auth.login", { channel: "email", accountTail: maskEmail(email), result: "success", userId });
 */

type Level = "info" | "warn" | "error";

export function log(event: string, fields: Record<string, unknown> = {}, level: Level = "info") {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else console.log(line);
  return line;
}

/** 邮箱脱敏：只保留域名 + 本地部分首尾各 1 个字符。bob@gmail.com → b**b@gmail.com */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return email.length <= 3 ? "***" : `${email.slice(0, 1)}***`;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(2, local.length - 2))}${local.at(-1)}@${domain}`;
}

/** 手机号脱敏：13800138000 → 138****8000 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return `${digits.slice(0, 2)}***`;
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

/** 账号字段统一脱敏入口（识别邮箱或手机号）。 */
export function maskAccount(channel: "email" | "phone", account: string): string {
  return channel === "phone" ? maskPhone(account) : maskEmail(account);
}
