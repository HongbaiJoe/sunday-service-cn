import { getD1, getMediaBucket } from "../../../../db/runtime";
import { assertTrustedOrigin, requireUser } from "../../../lib/auth";
import { apiError, json, requiredText } from "../../../lib/http";
import { log } from "../../../lib/log";
import { isAllowedMediaType, sniffMatchesContentType } from "../../../lib/security";

export async function POST(request: Request) {
  try {
    await assertTrustedOrigin();
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const uploadId = requiredText(body.uploadId, "上传编号", 36);
    const filename = requiredText(body.filename, "文件名", 180);
    const contentType = requiredText(body.contentType, "文件类型", 100);
    const totalParts = Number(body.totalParts);
    const expectedSize = Number(body.size);
    if (!/^[a-f0-9-]{36}$/i.test(uploadId) || !Number.isInteger(totalParts) || totalParts < 1 || totalParts > 64 || !Number.isInteger(expectedSize) || expectedSize < 1 || expectedSize > 25 * 1024 * 1024) return json({ error: "上传信息无效" }, 400);
    if (!isAllowedMediaType(contentType)) return json({ error: "只支持图片、视频或音频" }, 400);
    // 明确拒绝 SVG（可携带脚本，存在 XSS 风险）
    if (contentType.toLowerCase() === "image/svg+xml") return json({ error: "不支持 SVG 格式" }, 400);

    const bucket = getMediaBucket();
    const chunkKeys = Array.from({ length: totalParts }, (_, part) => `chunks/${user.id}/${uploadId}/${String(part).padStart(3, "0")}`);
    // 无论成功还是失败都清理分片，避免中断的上传在 R2 残留孤儿分片（对象只能删自己前缀下的分片，无越权面）
    const cleanupChunks = () => Promise.all(chunkKeys.map((key) => bucket.delete(key).catch(() => {})));
    const chunks = await Promise.all(chunkKeys.map((key) => bucket.get(key)));
    if (chunks.some((chunk) => !chunk)) { await cleanupChunks(); return json({ error: "上传分片不完整，请重试" }, 400); }
    const buffers = await Promise.all(chunks.map((chunk) => chunk!.arrayBuffer()));
    const actualSize = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    if (actualSize !== expectedSize) { await cleanupChunks(); return json({ error: "文件大小校验失败" }, 400); }
    const merged = new Uint8Array(actualSize);
    let offset = 0;
    for (const buffer of buffers) { merged.set(new Uint8Array(buffer), offset); offset += buffer.byteLength; }

    // 安全：按文件真实内容（magic bytes）校验，防止「把 HTML/脚本伪装成图片/视频」上传
    const headerBytes = merged.slice(0, 64);
    if (!sniffMatchesContentType(headerBytes, contentType)) {
      await cleanupChunks();
      log("media.complete", { userId: user.id, result: "content_type_mismatch", declared: contentType }, "warn");
      return json({ error: "文件内容与声明类型不符，已拒绝" }, 400);
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "media";
    const id = crypto.randomUUID();
    const key = `uploads/${user.id}/${id}-${safeName}`;
    await bucket.put(key, merged, { httpMetadata: { contentType }, customMetadata: { ownerId: user.id, originalName: filename } });
    await cleanupChunks();
    await getD1().prepare("INSERT INTO media_assets (id,owner_id,storage_key,filename,content_type,size) VALUES (?,?,?,?,?,?)")
      .bind(id, user.id, key, filename, contentType, actualSize).run();
    log("media.complete", { userId: user.id, mediaId: id, size: actualSize, contentType, result: "success" });
    return json({ id, url: `/api/media/file/${key}`, filename, contentType }, 201);
  } catch (error) { return apiError(error); }
}
