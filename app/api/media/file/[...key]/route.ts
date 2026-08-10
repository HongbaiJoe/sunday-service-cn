import { getMediaBucket } from "../../../../../db/runtime";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const storageKey = key.join("/");
  if (!storageKey.startsWith("uploads/") || storageKey.includes("..")) return new Response("Not found", { status: 404 });
  const object = await getMediaBucket().get(storageKey);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "cache-control": "public, max-age=3600", etag: object.httpEtag });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
}
