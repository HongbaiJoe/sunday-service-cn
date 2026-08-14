/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// 安全响应头（统一附加到所有响应）
const SECURITY_HEADERS: Record<string, string> = {
  // 防 MIME 嗅探
  "x-content-type-options": "nosniff",
  // 防点击劫持
  "x-frame-options": "SAMEORIGIN",
  // 减少 Referer 泄露（只传同源完整地址，跨源只传来源）
  "referrer-policy": "strict-origin-when-cross-origin",
  // 强制 HTTPS
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  // CSP 保守起步：仅本站资源 + 站内联样式/脚本（Next.js 需要）；图片允许 https、data 与 blob（封面上传本地预览用 createObjectURL 生成的 blob URL）
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; media-src 'self' https: blob:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
  // 禁 MIME 类型混淆下载
  "x-download-options": "noopen",
};

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
      return response;
    }

    const response = await handler.fetch(request, env, ctx);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
    return response;
  },
};

export default worker;
