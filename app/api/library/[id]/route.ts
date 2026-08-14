import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireUser } from "../../../lib/auth";
import { inputErrorResponse, json } from "../../../lib/http";

export const dynamic = "force-dynamic";

/** 获取单篇资料文章详情（需要登录；仅返回已审核通过的文章）。 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    // 登录保护：未登录返回 401，前端/页面层负责跳转登录页
    await requireUser();
    await ensureDatabase();
    const entry = await getD1().prepare(
      `SELECT library_entries.id, category, title, summary, body, source_url AS sourceUrl, media_url AS mediaUrl, library_entries.created_at AS createdAt, library_entries.updated_at AS updatedAt, users.display_name AS author
       FROM library_entries JOIN users ON users.id = library_entries.owner_id
       WHERE library_entries.id = ? AND library_entries.status = 'approved'`,
    ).bind(id).first<Record<string, string>>();
    if (!entry) return json({ error: "文章不存在或未通过审核" }, 404);
    return json({ entry });
  } catch (error) { return inputErrorResponse(error); }
}
