import { getD1, getMediaBucket } from "../../../../db/runtime";
import { requireUser } from "../../../lib/auth";
import { apiError, json, requiredText } from "../../../lib/http";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const uploadId = requiredText(body.uploadId, "上传编号", 36);
    const filename = requiredText(body.filename, "文件名", 180);
    const contentType = requiredText(body.contentType, "文件类型", 100);
    const totalParts = Number(body.totalParts);
    const expectedSize = Number(body.size);
    if (!/^[a-f0-9-]{36}$/i.test(uploadId) || !Number.isInteger(totalParts) || totalParts < 1 || totalParts > 64 || !Number.isInteger(expectedSize) || expectedSize < 1 || expectedSize > 25 * 1024 * 1024) return json({ error: "上传信息无效" }, 400);
    if (!/^(image|video|audio)\//.test(contentType)) return json({ error: "只支持图片、视频或音频" }, 400);

    const bucket = getMediaBucket();
    const chunkKeys = Array.from({ length: totalParts }, (_, part) => `chunks/${user.id}/${uploadId}/${String(part).padStart(3, "0")}`);
    const chunks = await Promise.all(chunkKeys.map((key) => bucket.get(key)));
    if (chunks.some((chunk) => !chunk)) return json({ error: "上传分片不完整，请重试" }, 400);
    const buffers = await Promise.all(chunks.map((chunk) => chunk!.arrayBuffer()));
    const actualSize = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    if (actualSize !== expectedSize) return json({ error: "文件大小校验失败" }, 400);
    const merged = new Uint8Array(actualSize);
    let offset = 0;
    for (const buffer of buffers) { merged.set(new Uint8Array(buffer), offset); offset += buffer.byteLength; }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "media";
    const id = crypto.randomUUID();
    const key = `uploads/${user.id}/${id}-${safeName}`;
    await bucket.put(key, merged, { httpMetadata: { contentType }, customMetadata: { ownerId: user.id, originalName: filename } });
    await Promise.all(chunkKeys.map((chunkKey) => bucket.delete(chunkKey)));
    await getD1().prepare("INSERT INTO media_assets (id,owner_id,storage_key,filename,content_type,size) VALUES (?,?,?,?,?,?)")
      .bind(id, user.id, key, filename, contentType, actualSize).run();
    return json({ id, url: `/api/media/file/${key}`, filename, contentType }, 201);
  } catch (error) { return apiError(error); }
}
