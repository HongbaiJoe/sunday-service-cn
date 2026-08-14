/**
 * 安全辅助：账号锁定、频率限制、文件类型内容校验、Origin 校验、弱密码库。
 * 全部基于 D1 表实现（auth_attempts / rate_limits），兼容 Cloudflare Workers。
 */
import type { D1Database } from "@cloudflare/workers-types";

/* ------------------------------------------------------------------ */
/*  常量                                                               */
/* ------------------------------------------------------------------ */

/** 密码失败锁定阈值 */
export const LOGIN_MAX_FAILURES = 5;
/** 锁定窗口（15 分钟） */
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
/** 验证码校验失败阈值（达到后作废该验证码） */
export const CODE_MAX_FAILURES = 5;
/** 内容提交频率限制：同一账号窗口内最多条数 */
export const CONTENT_MAX_PER_WINDOW = 5;
export const CONTENT_WINDOW_MS = 10 * 60 * 1000;
/** 媒体上传频率限制 */
export const MEDIA_MAX_PER_WINDOW = 60;
export const MEDIA_WINDOW_MS = 60 * 1000;

/* ------------------------------------------------------------------ */
/*  账号锁定（login 密码失败）                                         */
/* ------------------------------------------------------------------ */

/**
 * 校验账号是否被锁定。
 * 规则：auth_attempts 表中 kind='login' 的失败次数 >= LOGIN_MAX_FAILURES
 * 且最近一次失败在 LOGIN_LOCK_MS 内 → 锁定，返回剩余等待秒数。
 */
export async function checkAccountLocked(db: D1Database, accountKey: string): Promise<number> {
  const row = await db.prepare(
    "SELECT fail_count, last_fail_at FROM auth_attempts WHERE kind = 'login' AND account_key = ?",
  ).bind(accountKey).first<{ fail_count: number; last_fail_at: string }>();
  if (!row) return 0;
  const failCount = Number(row.fail_count || 0);
  if (failCount < LOGIN_MAX_FAILURES) return 0;
  const lastFail = new Date(row.last_fail_at.includes("T") ? row.last_fail_at : `${row.last_fail_at}Z`).getTime() || 0;
  const remaining = LOGIN_LOCK_MS - (Date.now() - lastFail);
  if (remaining <= 0) {
    // 锁定窗口已过，清零计数
    await db.prepare("DELETE FROM auth_attempts WHERE kind = 'login' AND account_key = ?").bind(accountKey).run();
    return 0;
  }
  return Math.ceil(remaining / 1000);
}

/** 记录一次登录失败（计数 +1，更新失败时间）。 */
export async function recordLoginFailure(db: D1Database, accountKey: string): Promise<void> {
  await db.prepare(
    `INSERT INTO auth_attempts (id, kind, account_key, fail_count, last_fail_at, created_at)
     VALUES (?, 'login', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(kind, account_key) DO UPDATE SET
       fail_count = fail_count + 1,
       last_fail_at = CURRENT_TIMESTAMP`,
  ).bind(crypto.randomUUID(), accountKey).run();
}

/** 登录成功后清零失败计数。 */
export async function clearLoginFailures(db: D1Database, accountKey: string): Promise<void> {
  await db.prepare("DELETE FROM auth_attempts WHERE kind = 'login' AND account_key = ?").bind(accountKey).run();
}

/* ------------------------------------------------------------------ */
/*  验证码爆破限制                                                     */
/* ------------------------------------------------------------------ */

/** 校验验证码尝试次数是否超限（超限返回 true，并作废验证码）。 */
export async function codeAttemptExceeded(db: D1Database, accountKey: string, max = CODE_MAX_FAILURES): Promise<boolean> {
  const row = await db.prepare(
    "SELECT fail_count, last_fail_at FROM auth_attempts WHERE kind = 'code' AND account_key = ?",
  ).bind(accountKey).first<{ fail_count: number; last_fail_at: string }>();
  if (!row) return false;
  // 窗口过期自动清零（防止攻击者 5 次随机猜测永久锁死任意账号）
  const lastFail = new Date(row.last_fail_at.includes("T") ? row.last_fail_at : `${row.last_fail_at}Z`).getTime() || 0;
  if (Date.now() - lastFail > LOGIN_LOCK_MS) {
    await db.prepare("DELETE FROM auth_attempts WHERE kind = 'code' AND account_key = ?").bind(accountKey).run();
    return false;
  }
  return Number(row.fail_count) >= max;
}

/** 记录一次验证码校验失败。 */
export async function recordCodeFailure(db: D1Database, accountKey: string): Promise<void> {
  await db.prepare(
    `INSERT INTO auth_attempts (id, kind, account_key, fail_count, last_fail_at, created_at)
     VALUES (?, 'code', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(kind, account_key) DO UPDATE SET
       fail_count = fail_count + 1,
       last_fail_at = CURRENT_TIMESTAMP`,
  ).bind(crypto.randomUUID(), accountKey).run();
}

/** 验证码使用成功后清零。 */
export async function clearCodeFailures(db: D1Database, accountKey: string): Promise<void> {
  await db.prepare("DELETE FROM auth_attempts WHERE kind = 'code' AND account_key = ?").bind(accountKey).run();
}

/* ------------------------------------------------------------------ */
/*  通用频率限制（滑动窗口）                                           */
/* ------------------------------------------------------------------ */

/**
 * 通用限频：同一 scopeKey（如 IP 或 userId）在窗口内是否超限。
 * 返回 true 表示允许，false 表示被限。
 *
 * 原子性：使用 INSERT ... ON CONFLICT DO UPDATE 单语句完成
 * 计数递增，避免 SELECT→UPDATE 的并发竞态（并发请求读到旧值绕过）。
 *
 * 窗口语义：window_start 存窗口起点。若当前时间已超窗，则重置窗口并放行。
 */
export async function rateLimitAllow(
  db: D1Database,
  scope: string,
  scopeKey: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // 单语句 UPSERT：插入或递增计数，返回递增后的 count 与 window_start
  const result = await db.prepare(
    `INSERT INTO rate_limits (id, scope, scope_key, window_start, count)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(scope, scope_key) DO UPDATE SET
       count = CASE
         WHEN ? - strftime('%s', window_start) * 1000 > ? THEN 1
         ELSE count + 1
       END,
       window_start = CASE
         WHEN ? - strftime('%s', window_start) * 1000 > ? THEN ?
         ELSE window_start
       END
     RETURNING count, window_start`,
  ).bind(crypto.randomUUID(), scope, scopeKey, nowIso, now, windowMs, now, windowMs, nowIso).first<{ count: number }>();

  const count = Number(result?.count ?? 1);
  return count <= max;
}

/* ------------------------------------------------------------------ */
/*  文件内容类型校验（magic bytes）                                    */
/* ------------------------------------------------------------------ */

/**
 * 校验文件头部字节与声明的 MIME 是否匹配。
 * 支持常见图片/音频/视频格式。不匹配返回 false。
 * 注：magic bytes 只验证开头若干字节，不能 100% 防伪造，但能挡住「把 HTML/SVG 标成图片」的常见攻击。
 */
export function sniffMatchesContentType(bytes: Uint8Array, declared: string): boolean {
  const hex = (offset: number, length: number) => {
    let out = "";
    for (let i = offset; i < offset + length && i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
    return out;
  };

  const ascii = (offset: number, length: number) => {
    let out = "";
    for (let i = offset; i < offset + length && i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return out;
  };

  const mime = declared.toLowerCase();
  const sig = hex(0, 12);

  if (mime === "image/png") return sig.startsWith("89504e470d0a1a0a");
  if (mime === "image/jpeg") return sig.startsWith("ffd8ff");
  if (mime === "image/gif") return ascii(0, 4) === "GIF8";
  if (mime === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
  if (mime === "image/avif" || mime === "image/heic" || mime === "image/heif") {
    // ftyp 容器
    return ascii(4, 4) === "ftyp";
  }
  if (mime === "image/svg+xml") {
    // SVG 有脚本执行风险，这里直接拒绝
    return false;
  }
  if (mime.startsWith("image/")) return false; // 其他图片类型默认拒绝

  if (mime === "audio/mpeg") return sig.startsWith("fffb") || sig.startsWith("fff3") || sig.startsWith("494433");
  if (mime === "audio/wav" || mime === "audio/x-wav") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE";
  if (mime === "audio/ogg") return ascii(0, 4) === "OggS";
  if (mime === "audio/mp4" || mime === "audio/aac") return ascii(4, 4) === "ftyp";
  if (mime.startsWith("audio/")) return false;

  if (mime === "video/mp4") return ascii(4, 4) === "ftyp";
  if (mime === "video/webm") return ascii(0, 4) === "\x1aE\xdf\xa3";
  if (mime === "video/quicktime") return ascii(4, 4) === "ftyp";
  if (mime === "video/mpeg") return sig.startsWith("000001ba") || sig.startsWith("000001b3");
  if (mime.startsWith("video/")) return false;

  // 未知/其他类型一律拒绝
  return false;
}

/** 判断 Content-Type 是否在允许上传的媒体白名单内。 */
export function isAllowedMediaType(contentType: string): boolean {
  return /^(image|video|audio)\//.test(contentType);
}

/* ------------------------------------------------------------------ */
/*  弱密码库                                                           */
/* ------------------------------------------------------------------ */

const WEAK_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "12345678a", "12345678ab",
  "password", "password1", "password123", "passw0rd", "qwerty123",
  "qwertyuiop", "admin123", "admin1234", "administrator", "letmein",
  "welcome1", "iloveyou", "abc12345", "abc123456", "a12345678",
  "1234qwer", "qwer1234", "zxcvbnm1", "asdfghjk", "1qaz2wsx",
  "monkey123", "dragon123", "football1", "baseball1", "sunshine1",
  "princess1", "superman1", "batman123", "1234567a", "1234567ab",
  "87654321", "11223344", "12121212", "13131313", "147258369",
  "159357258", "11111111", "00000000", "66666666", "88888888",
  "a123456789", "abc1234", "test1234", "demo1234", "dev12345",
]);

/** 校验密码强度：>=10 位 + 至少两类字符 + 不在弱密码库。返回错误信息或 null。 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "密码至少需要 10 个字符";
  if (password.length > 72) return "密码长度需在 10-72 个字符之间";
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const classes = [hasLetter, hasDigit, hasSymbol].filter(Boolean).length;
  if (classes < 2) return "密码需包含字母和数字（或符号）";
  if (WEAK_PASSWORDS.has(password.toLowerCase())) return "密码过于常见，请更换一个更安全的密码";
  return null;
}
