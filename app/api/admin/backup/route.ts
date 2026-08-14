import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireAdmin } from "../../../lib/auth";
import { apiError } from "../../../lib/http";
import { log } from "../../../lib/log";

export async function GET() {
  try {
    const admin = await requireAdmin();
    await ensureDatabase();
    const db = getD1();
    // 审计：备份导出是敏感操作（含用户邮箱/手机号），记录操作日志与 admin_actions
    await db.prepare("INSERT INTO admin_actions (id,admin_id,entity_type,entity_id,action,note) VALUES (?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), admin.id, "system", "backup", "export", `JSON backup exported at ${new Date().toISOString()}`).run();
    log("admin.backup", { adminId: admin.id, result: "success" });
    const tables = ["users", "posts", "comments", "media_assets", "library_entries", "exhibitions", "admin_actions"];
    const data: Record<string, unknown[]> = {};
    for (const table of tables) data[table] = (await db.prepare(`SELECT * FROM ${table}`).all()).results;
    return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), exportedBy: admin.email, data }, null, 2), {
      headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="sss-cn-backup-${new Date().toISOString().slice(0, 10)}.json"` },
    });
  } catch (error) { return apiError(error); }
}
