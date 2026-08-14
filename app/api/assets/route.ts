import { ensureDatabase, getD1, getMediaBucket } from "../../../db/runtime";
import { assertTrustedOrigin, requireAdmin } from "../../lib/auth";
import { apiError, json } from "../../lib/http";
import { getSiteAssets } from "../../lib/site-assets";
import { SITE_ASSET_KEYS } from "../../lib/site-assets-meta";

export const dynamic = "force-dynamic";

const MAX_ASSET_BYTES = 8 * 1024 * 1024; // 单张素材图上限 8MB

/** 公开：返回全部素材位（含未设置时的默认图）。 */
export async function GET() {
  try {
    const assets = await getSiteAssets();
    return json({ assets });
  } catch (error) {
    return apiError(error);
  }
}

/** 仅管理员：上传/替换某个素材位的图片。 */
export async function PUT(request: Request) {
  try {
    await assertTrustedOrigin();
    await requireAdmin();
    await ensureDatabase();

    const form = await request.formData();
    const key = String(form.get("key") ?? "");
    const file = form.get("file");
    if (!SITE_ASSET_KEYS.includes(key)) return json({ error: "素材位无效" }, 400);
    if (!(file instanceof File)) return json({ error: "请选择要上传的图片" }, 400);
    if (file.size <= 0 || file.size > MAX_ASSET_BYTES) return json({ error: "图片大小需在 8MB 以内" }, 400);

    const ext = (file.name.includes(".") ? file.name.split(".").pop() : "webp")?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
    const storageKey = `uploads/site-assets/${key}/${Date.now()}.${ext}`;
    await getMediaBucket().put(storageKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "image/webp" },
    });
    const url = `/api/media/file/${storageKey}`;

    await getD1().prepare(
      "INSERT INTO site_assets (key, url, alt, updated_at) VALUES (?, ?, '', CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET url = excluded.url, updated_at = CURRENT_TIMESTAMP",
    ).bind(key, url).run();

    return json({ ok: true, key, url });
  } catch (error) {
    return apiError(error);
  }
}
