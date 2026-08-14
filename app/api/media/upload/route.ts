import { ensureDatabase, getD1, getMediaBucket } from "../../../../db/runtime";
import { assertTrustedOrigin, requireUser } from "../../../lib/auth";
import { apiError, json } from "../../../lib/http";
import { log } from "../../../lib/log";
import { MEDIA_MAX_PER_WINDOW, MEDIA_WINDOW_MS, rateLimitAllow } from "../../../lib/security";

const MAX_CHUNK_BYTES = 700 * 1024;

export async function POST(request: Request) {
  try {
    await assertTrustedOrigin();
    const user = await requireUser();
    // 限频：同一用户每分钟最多 60 个分片（约 40MB/分钟，防止无限写 R2）
    await ensureDatabase();
    const db = getD1();
    const allowed = await rateLimitAllow(db, "media_upload", user.id, MEDIA_MAX_PER_WINDOW, MEDIA_WINDOW_MS);
    if (!allowed) {
      log("media.upload", { userId: user.id, result: "rate_limited" }, "warn");
      return json({ error: "上传太频繁，请稍后再试" }, 429);
    }

    const form = await request.formData();
    const chunk = form.get("chunk");
    const uploadId = String(form.get("uploadId") ?? "");
    const part = Number(form.get("part"));
    if (!(chunk instanceof File) || !/^[a-f0-9-]{36}$/i.test(uploadId) || !Number.isInteger(part) || part < 0 || part > 63) return json({ error: "上传分片格式无效" }, 400);
    if (chunk.size <= 0 || chunk.size > MAX_CHUNK_BYTES) return json({ error: "上传分片过大" }, 400);
    const key = `chunks/${user.id}/${uploadId}/${String(part).padStart(3, "0")}`;
    await getMediaBucket().put(key, await chunk.arrayBuffer(), { customMetadata: { ownerId: user.id } });
    return json({ ok: true, part });
  } catch (error) { return apiError(error); }
}
