/**
 * 腾讯云短信服务（SMS）客户端
 * 使用 TC3-HMAC-SHA256 签名，可在 Cloudflare Workers 环境运行（crypto.subtle）。
 * 文档：https://cloud.tencent.com/document/api/382/55981（发送短信）
 */
import { env } from "cloudflare:workers";

const SMS_ENDPOINT = "sms.tencentcloudapi.com";
const SMS_SERVICE = "sms";
const SMS_VERSION = "2021-01-11";
const SMS_ACTION = "SendSms";

export class SmsError extends Error {}

/** 环境变量：TENCENT_SECRET_ID / TENCENT_SECRET_KEY / TENCENT_SMS_SDK_APP_ID / TENCENT_SMS_SIGN_NAME / TENCENT_SMS_TEMPLATE_ID */

function hmac(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const keyBuffer = typeof key === "string" ? new TextEncoder().encode(key) : key;
  return crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((imported) => crypto.subtle.sign("HMAC", imported, new TextEncoder().encode(data)));
}

function sha256hex(data: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then((buffer) =>
    Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join(""),
  );
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** 发送短信验证码。phone 为纯数字（如 13800138000），返回腾讯云返回的 RequestId。 */
export async function sendSmsCode(phone: string, code: string): Promise<string> {
  const secretId = env.TENCENT_SECRET_ID;
  const secretKey = env.TENCENT_SECRET_KEY;
  const sdkAppId = env.TENCENT_SMS_SDK_APP_ID;
  const signName = env.TENCENT_SMS_SIGN_NAME;
  const templateId = env.TENCENT_SMS_TEMPLATE_ID;

  const missing = [
    ["TENCENT_SECRET_ID", secretId],
    ["TENCENT_SECRET_KEY", secretKey],
    ["TENCENT_SMS_SDK_APP_ID", sdkAppId],
    ["TENCENT_SMS_SIGN_NAME", signName],
    ["TENCENT_SMS_TEMPLATE_ID", templateId],
  ].filter(([, value]) => !value).map(([name]) => name as string);
  if (missing.length) {
    throw new SmsError(`短信服务未配置：缺少 ${missing.join(", ")}。请在 Cloudflare 控制台为 Worker 添加这些环境变量。`);
  }

  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000);
  const date = now.toISOString().slice(0, 10);

  // 1. 拼接规范请求串
  const payload = JSON.stringify({
    PhoneNumberSet: [`+86${phone}`],
    SmsSdkAppId: sdkAppId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: [code, "5"],
  });

  const canonicalHeaders = "content-type:application/json; charset=utf-8\nhost:sms.tencentcloudapi.com\n";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    "content-type;host",
    await sha256hex(payload),
  ].join("\n");

  // 2. 拼接待签名字符串
  const credentialScope = `${date}/${SMS_SERVICE}/tc3_request`;
  const stringToSign = [
    "TC3-HMAC-SHA256",
    timestamp,
    credentialScope,
    await sha256hex(canonicalRequest),
  ].join("\n");

  // 3. 计算签名
  const secretDate = await hmac(`TC3${secretKey}`, date);
  const secretService = await hmac(secretDate, SMS_SERVICE);
  const secretSigning = await hmac(secretService, "tc3_request");
  const signature = hex(await hmac(secretSigning, stringToSign));

  // 4. 拼接 Authorization
  const authorization = [
    "TC3-HMAC-SHA256",
    `Credential=${secretId}/${credentialScope}`,
    `SignedHeaders=content-type;host`,
    `Signature=${signature}`,
  ].join(", ");

  const response = await fetch(`https://${SMS_ENDPOINT}`, {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Content-Type": "application/json; charset=utf-8",
      "Host": SMS_ENDPOINT,
      "X-TC-Action": SMS_ACTION,
      "X-TC-Version": SMS_VERSION,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Region": "",
    },
    body: payload,
  });

  const body = await response.json().catch(() => null) as {
    Response?: { SendStatusSet?: { Code?: string; Message?: string }[]; Error?: { Code?: string; Message?: string }; RequestId?: string };
  } | null;
  const result = body?.Response;

  if (!response.ok || result?.Error) {
    const errorMessage = result?.Error?.Message ?? body?.Response?.SendStatusSet?.[0]?.Message ?? `HTTP ${response.status}`;
    throw new SmsError(`短信发送失败：${errorMessage}`);
  }

  const sendStatus = result?.SendStatusSet?.[0];
  if (sendStatus?.Code && sendStatus.Code !== "Ok") {
    throw new SmsError(`短信发送失败：${sendStatus.Message ?? sendStatus.Code}`);
  }

  return result?.RequestId ?? "";
}
