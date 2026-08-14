import { ensureDatabase, getD1 } from "../../db/runtime";
import { SITE_ASSET_DEFAULTS, type SiteAsset } from "./site-assets-meta";

/** 读取全部素材位，后台设置的值覆盖默认值；数据库异常时静默回退默认。 */
export async function getSiteAssets(): Promise<Record<string, SiteAsset>> {
  const result: Record<string, SiteAsset> = {};
  for (const [key, def] of Object.entries(SITE_ASSET_DEFAULTS)) {
    result[key] = { key, url: def.url, alt: def.alt };
  }
  try {
    await ensureDatabase();
    const rows = await getD1().prepare("SELECT key, url, alt FROM site_assets").all<{ key: string; url: string; alt: string }>();
    for (const row of rows.results) {
      if (result[row.key] && row.url) {
        result[row.key] = { key: row.key, url: row.url, alt: row.alt ?? "" };
      }
    }
  } catch {
    // 数据库暂不可用时保持默认值
  }
  return result;
}
