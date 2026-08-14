import { ensureDatabase, getD1 } from "../../../db/runtime";
import { assertTrustedOrigin, requireUser } from "../../lib/auth";
import { inputErrorResponse, json, optionalUrl, requiredText } from "../../lib/http";
import { moderateContent } from "../../lib/moderation";
import { log } from "../../lib/log";
import { CONTENT_MAX_PER_WINDOW, CONTENT_WINDOW_MS, rateLimitAllow } from "../../lib/security";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const category = new URL(request.url).searchParams.get("category");
    const query = `SELECT library_entries.id, category, title, summary, body, source_url AS sourceUrl, media_url AS mediaUrl, library_entries.updated_at AS updatedAt, users.display_name AS author FROM library_entries JOIN users ON users.id = library_entries.owner_id WHERE library_entries.status = 'approved'${category ? " AND category = ?" : ""} ORDER BY library_entries.updated_at DESC`;
    const statement = getD1().prepare(query);
    const result = category ? await statement.bind(category).all() : await statement.all();
    return json({ entries: result.results });
  } catch (error) { return inputErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await assertTrustedOrigin();
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const category = requiredText(body.category, "分类", 30);
    const title = requiredText(body.title, "标题", 140);
    const summary = requiredText(body.summary, "简介", 300);
    const entryBody = requiredText(body.body, "正文", 12000);
    const sourceUrl = optionalUrl(body.sourceUrl);
    const mediaUrl = optionalUrl(body.mediaUrl);
    const blocks = typeof body.blocks === "string" ? body.blocks : null;

    // 内容限频：与发帖/评论共用窗口
    await ensureDatabase();
    const db = getD1();
    const allowed = await rateLimitAllow(db, "content_post", user.id, CONTENT_MAX_PER_WINDOW, CONTENT_WINDOW_MS);
    if (!allowed) {
      log("library.create", { userId: user.id, result: "rate_limited" }, "warn");
      return json({ error: "提交太频繁，请稍后再试" }, 429);
    }

    // 内容审核：资料提交在入库前必须先通过屏蔽词检测
    const moderation = moderateContent(category, title, summary, entryBody);
    if (!moderation.passed) return json({ error: moderation.message }, 400);

    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO library_entries (id,owner_id,category,title,summary,body,source_url,media_url,blocks) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(id, user.id, category, title, summary, entryBody, sourceUrl, mediaUrl, blocks).run();
    log("library.create", { userId: user.id, entryId: id, result: "pending" });
    return json({ id, status: "pending" }, 201);
  } catch (error) { return inputErrorResponse(error); }
}
