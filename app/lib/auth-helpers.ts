/**
 * 认证辅助：统一的 phone / email 通道处理。
 * 验证码统一存 sms_codes 表（channel 区分 phone / email）。
 */
import type { D1Database } from "@cloudflare/workers-types";
import { InputError } from "./http";

export type AuthChannel = "phone" | "email";

export const CODE_TTL_MS = 5 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_PENDING_PER_ACCOUNT = 5;

/** 归一化手机号（纯数字）。 */
export function normalizePhone(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new InputError("请输入手机号");
  const clean = value.trim().replace(/[\s()-]/g, "");
  if (!/^\+?\d{6,18}$/.test(clean)) throw new InputError("请输入有效的手机号");
  return clean.startsWith("+") ? clean.replace(/\D/g, "") : clean;
}

/** 归一化邮箱（小写）。 */
export function normalizeEmail(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new InputError("请输入邮箱");
  const clean = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 120) throw new InputError("请输入有效的邮箱");
  return clean;
}

/** 归一化验证码（6 位数字）。 */
export function normalizeCode(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new InputError("请输入验证码");
  const clean = value.trim();
  if (!/^\d{6}$/.test(clean)) throw new InputError("验证码格式不正确");
  return clean;
}

/** 归一化密码（8-72 位）。 */
export function normalizePassword(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length < 8 || value.length > 72) {
    throw new InputError("密码长度需在 8-72 个字符之间");
  }
  return value;
}

/** 归一化用户名（注册时填写）：1-24 个字符，去除首尾空白。 */
export function normalizeDisplayName(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new InputError("请输入用户名");
  const clean = value.trim();
  if (clean.length < 1 || clean.length > 24) throw new InputError("用户名需在 1-24 个字符之间");
  return clean;
}

/** 生成 6 位验证码。 */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** 校验发送限频；返回等待秒数（>0 表示需要等待）。 */
export async function checkCooldown(db: D1Database, channel: AuthChannel, account: string): Promise<number> {
  const column = channel === "phone" ? "phone" : "email";
  const recent = await db.prepare(
    `SELECT created_at FROM sms_codes WHERE channel = ? AND ${column} = ? ORDER BY created_at DESC LIMIT 1`,
  ).bind(channel, account).first<{ created_at: string }>();
  if (!recent) return 0;
  const lastSent = new Date(recent.created_at.includes("T") ? recent.created_at : `${recent.created_at}Z`).getTime() || Date.now();
  const waitMs = RESEND_COOLDOWN_MS - (Date.now() - lastSent);
  return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
}

/** 清理过期验证码并返回未使用数量。 */
export async function pendingCodeCount(db: D1Database, channel: AuthChannel, account: string): Promise<number> {
  const column = channel === "phone" ? "phone" : "email";
  await db.prepare("DELETE FROM sms_codes WHERE expires_at < ?").bind(new Date(Date.now() - CODE_TTL_MS).toISOString()).run();
  const result = await db.prepare(
    `SELECT COUNT(*) AS count FROM sms_codes WHERE channel = ? AND ${column} = ? AND used = 0`,
  ).bind(channel, account).first<{ count: number }>();
  return result?.count ?? 0;
}

/** 存入验证码，返回验证码。 */
export async function storeCode(db: D1Database, channel: AuthChannel, account: string, code: string): Promise<void> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  if (channel === "phone") {
    await db.prepare("INSERT INTO sms_codes (id, phone, channel, code, expires_at) VALUES (?, ?, 'phone', ?, ?)")
      .bind(id, account, code, expiresAt).run();
  } else {
    await db.prepare("INSERT INTO sms_codes (id, email, channel, code, expires_at) VALUES (?, ?, 'email', ?, ?)")
      .bind(id, account, code, expiresAt).run();
  }
}

/** 取最近一条未使用验证码。 */
export async function latestUnusedCode(db: D1Database, channel: AuthChannel, account: string) {
  const column = channel === "phone" ? "phone" : "email";
  return db.prepare(
    `SELECT id, code, expires_at, used FROM sms_codes WHERE channel = ? AND ${column} = ? AND used = 0 ORDER BY created_at DESC LIMIT 1`,
  ).bind(channel, account).first<{ id: string; code: string; expires_at: string; used: number }>();
}

/** 标记验证码已使用。 */
export async function markCodeUsed(db: D1Database, id: string): Promise<void> {
  await db.prepare("UPDATE sms_codes SET used = 1 WHERE id = ?").bind(id).run();
}

/** 按 phone 或 email 查找用户。 */
export async function findUser(db: D1Database, channel: AuthChannel, account: string) {
  const column = channel === "phone" ? "phone" : "email";
  return db.prepare(`SELECT * FROM users WHERE ${column} = ?`).bind(account).first<Record<string, string>>();
}

/** 按用户名查找用户（用户名唯一性检查用）。 */
export async function findUserByUsername(db: D1Database, username: string) {
  return db.prepare("SELECT id FROM users WHERE username = ?").bind(username).first<{ id: string }>();
}

/** 新用户显示名。 */
export function defaultDisplayName(channel: AuthChannel, account: string): string {
  return channel === "phone" ? `成员${account.slice(-4)}` : account.split("@")[0].slice(0, 24) || "新成员";
}
