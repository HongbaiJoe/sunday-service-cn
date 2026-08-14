import { cookies, headers } from "next/headers";
import { getChatGPTUser } from "../chatgpt-auth";
import { ensureDatabase, getD1 } from "../../db/runtime";

export type AppUser = {
  id: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  role: "member" | "admin";
  status: "active" | "suspended";
};

const DEV_COOKIE = "sss_dev_identity";
const SESSION_COOKIE = "sss_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

export function isDevelopmentPreview() {
  return process.env.NODE_ENV !== "production";
}

/** 签发会话 Cookie（手机号验证码登录后调用）。 */
export function sessionCookie(sessionId: string): string {
  const expires = new Date(Date.now() + SESSION_TTL_MS).toUTCString();
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function findUserBySession(sessionId: string): Promise<AppUser | null> {
  if (!sessionId) return null;
  const db = getD1();
  const session = await db.prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?").bind(sessionId).first<{ user_id: string; expires_at: string }>();
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
    return null;
  }
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(session.user_id).first<Record<string, string>>();
  if (!row) return null;
  // 顺带更新 last_seen_at（约 1% 概率，避免每次写库）
  if (Math.random() < 0.01) {
    await db.prepare("UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?").bind(sessionId).run();
  }
  return mapUser(row);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  // 1. 手机号验证码会话（正式登录）
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  if (sessionId) {
    await ensureDatabase();
    const sessionUser = await findUserBySession(sessionId);
    if (sessionUser) return sessionUser;
  }

  // 2. ChatGPT 托管登录（Cloudflare 托管环境注入 header）
  const chatGPTUser = await getChatGPTUser();
  let identity: { email: string; phone?: string; displayName: string; role: AppUser["role"] } | null = chatGPTUser
    ? { email: chatGPTUser.email, displayName: chatGPTUser.displayName, role: "member" }
    : null;

  if (!identity && isDevelopmentPreview()) {
    const previewValue = cookieStore.get(DEV_COOKIE)?.value ?? "";
    const [previewRole, encodedIdentifier, encodedName] = previewValue.split("|");
    if (previewRole === "member" || previewRole === "admin") {
      const identifier = safeDecode(encodedIdentifier) || `${previewRole}@local.sundayservice.cn`;
      const phone = identifier.startsWith("+") ? identifier : "";
      identity = {
        email: phone ? `phone-${phone.replace(/\D/g, "")}@local.sundayservice.cn` : identifier,
        phone,
        displayName: safeDecode(encodedName) || (previewRole === "admin" ? "本地管理员" : "本地成员"),
        role: previewRole,
      };
    }
  }
  if (!identity) return null;

  await ensureDatabase();
  const db = getD1();
  const existing = await db.prepare("SELECT * FROM users WHERE email = ?").bind(identity.email).first<Record<string, string>>();
  if (!existing) {
    const id = crypto.randomUUID();
    const base = identity.email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 24) || "member";
    const username = `${base}-${id.slice(0, 6)}`;
    await db.prepare("INSERT INTO users (id,email,phone,display_name,username,role) VALUES (?,?,?,?,?,?)")
      .bind(id, identity.email, "phone" in identity ? identity.phone || null : null, identity.displayName, username, identity.role).run();
  } else {
    const allowlist = (process.env.ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase());
    const role = identity.role === "admin" || allowlist.includes(identity.email.toLowerCase()) ? "admin" : existing.role;
    await db.prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
      .bind(role, identity.email).run();
  }

  const row = await db.prepare("SELECT * FROM users WHERE email = ?").bind(identity.email).first<Record<string, string>>();
  return row ? mapUser(row) : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== "active") throw new AuthError(401, "请先登录后再继续");
  return user;
}

/**
 * CSRF 双保险：校验请求 Origin 是否为本站（或配置的受信来源）。
 * SameSite=Lax 已挡跨站 POST；这里再加一层服务端校验，防止同站子域/边缘场景。
 * 仅对带 Origin 头的浏览器请求生效；非浏览器请求（无 Origin）放行。
 */
export async function assertTrustedOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (!origin) return; // 非浏览器请求
  try {
    const url = new URL(origin);
    const host = requestHeaders.get("host") ?? "";
    const sameHost = url.hostname === host.split(":")[0];
    if (sameHost) return;
    // 额外受信来源（逗号分隔，如 CDN/子域前端）
    const extra = (process.env.TRUSTED_ORIGINS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (extra.some((item) => url.hostname === item || url.hostname.endsWith(`.${item}`))) return;
  } catch {
    throw new AuthError(400, "请求来源不合法");
  }
  throw new AuthError(403, "请求来源不合法");
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new AuthError(403, "需要管理员权限");
  return user;
}

export class AuthError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function devIdentityCookie(role: "member" | "admin") {
  return devMemberIdentityCookie(role, `${role}@local.sundayservice.cn`, role === "admin" ? "本地管理员" : "本地成员");
}

export function devMemberIdentityCookie(role: "member" | "admin", identifier: string, displayName: string) {
  const value = `${role}|${encodeURIComponent(identifier)}|${encodeURIComponent(displayName)}`;
  return `${DEV_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

export function clearDevIdentityCookie() {
  return `${DEV_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function mapUser(row: Record<string, string>): AppUser {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone ?? "",
    phoneVerified: Boolean(row.phone_verified_at),
    displayName: row.display_name,
    username: row.username,
    bio: row.bio,
    avatarUrl: row.avatar_url ?? "",
    role: row.role as AppUser["role"],
    status: row.status as AppUser["status"],
  };
}

function safeDecode(value?: string) {
  if (!value) return "";
  try { return decodeURIComponent(value); } catch { return ""; }
}
