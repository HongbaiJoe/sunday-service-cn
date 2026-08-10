import { cookies } from "next/headers";
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

export function isDevelopmentPreview() {
  return process.env.NODE_ENV !== "production";
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const chatGPTUser = await getChatGPTUser();
  let identity: { email: string; phone?: string; displayName: string; role: AppUser["role"] } | null = chatGPTUser
    ? { email: chatGPTUser.email, displayName: chatGPTUser.displayName, role: "member" }
    : null;

  if (!identity && isDevelopmentPreview()) {
    const previewValue = (await cookies()).get(DEV_COOKIE)?.value ?? "";
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
