import { getMediaBucket } from "../../../../db/runtime";
import { requireUser } from "../../../lib/auth";
import { apiError, json } from "../../../lib/http";

const MAX_CHUNK_BYTES = 700 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
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
