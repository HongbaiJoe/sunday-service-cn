import { AuthError } from "./auth";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function apiError(error: unknown) {
  if (error instanceof AuthError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: "服务器暂时无法处理该请求" }, 500);
}

export function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim()) throw new InputError(`${label}不能为空`);
  const clean = value.trim();
  if (clean.length > max) throw new InputError(`${label}不能超过 ${max} 个字符`);
  return clean;
}

export function optionalText(value: unknown, max: number) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new InputError("字段格式不正确");
  const clean = value.trim();
  if (clean.length > max) throw new InputError(`字段不能超过 ${max} 个字符`);
  return clean || null;
}

export function optionalUrl(value: unknown) {
  const clean = optionalText(value, 1000);
  if (!clean) return null;
  if (clean.startsWith("/api/media/file/")) return clean;
  try {
    const url = new URL(clean);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new InputError("链接必须是有效的 http 或 https 地址");
  }
}

export function loginIdentifier(value: unknown) {
  const clean = requiredText(value, "邮箱或手机号", 120).toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { kind: "email" as const, value: clean };
  const phone = clean.replace(/[\s()-]/g, "");
  if (/^\+?\d{6,18}$/.test(phone)) return { kind: "phone" as const, value: phone.startsWith("+") ? phone : `+86${phone}` };
  throw new InputError("请输入有效的邮箱或手机号");
}

export function optionalPhone(value: unknown) {
  if (value == null || value === "") return null;
  const identifier = loginIdentifier(value);
  if (identifier.kind !== "phone") throw new InputError("请输入有效的手机号");
  return identifier.value;
}

export class InputError extends Error {}

export function inputErrorResponse(error: unknown) {
  return error instanceof InputError ? json({ error: error.message }, 400) : apiError(error);
}
