export async function uploadMedia(file: File) {
  const chunkSize = 640 * 1024;
  const totalParts = Math.ceil(file.size / chunkSize);
  const uploadId = crypto.randomUUID();
  if (file.size > 25 * 1024 * 1024) throw new Error("文件大小必须在 25MB 以内");

  for (let index = 0; index < totalParts; index += 1) {
    const form = new FormData();
    form.set("chunk", file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize), file.type), "chunk");
    form.set("uploadId", uploadId);
    form.set("part", String(index));
    const response = await fetch("/api/media/upload", { method: "POST", body: form });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "媒体分片上传失败");
  }

  const response = await fetch("/api/media/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uploadId, totalParts, filename: file.name, contentType: file.type, size: file.size }),
  });
  const result = await response.json() as { url?: string; error?: string };
  if (!response.ok || !result.url) throw new Error(result.error ?? "媒体合并失败");
  return result;
}
