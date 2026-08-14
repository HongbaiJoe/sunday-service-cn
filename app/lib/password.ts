/**
 * 密码哈希与校验（PBKDF2-SHA256，Web Crypto 实现，兼容 Workers / Node）。
 * 存储格式：pbkdf2$<iterations>$<salt-b64>$<hash-b64>
 */

// Cloudflare Workers 的 Web Crypto 将 PBKDF2 迭代次数上限限制为 100_000（超出抛 NotSupportedError）。
// 这里使用上限值 100_000，同时保留足够的安全强度。
const ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256 bits
const SALT_BYTES = 16;
const PREFIX = "pbkdf2";

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBuffer(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    KEY_LENGTH * 8,
  );
}

/** 生成密码哈希。 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${bufferToBase64(salt.buffer)}$${bufferToBase64(derived)}`;
}

/** 校验密码是否匹配哈希。格式不支持时返回 false（不抛错，避免泄露信息）。 */
export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== PREFIX) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 10_000) return false;
  try {
    const salt = base64ToBuffer(parts[2]);
    const expected = base64ToBuffer(parts[3]);
    const derived = new Uint8Array(await derive(password, salt, iterations));
    if (derived.length !== expected.length) return false;
    // 恒定时间比较
    let diff = 0;
    for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}
