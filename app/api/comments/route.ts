import { ensureDatabase, getD1 } from "../../../db/runtime";
import { assertTrustedOrigin, requireUser } from "../../lib/auth";
import { inputErrorResponse, json, requiredText } from "../../lib/http";
import { moderateText } from "../../lib/moderation";
import { log } from "../../lib/log";
import { CONTENT_MAX_PER_WINDOW, CONTENT_WINDOW_MS, rateLimitAllow } from "../../lib/security";

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    const postId = new URL(request.url).searchParams.get("postId");
    if (!postId) return json({ error: "缺少帖子编号" }, 400);
    const result = await getD1().prepare(`SELECT comments.id, comments.body, comments.created_at AS createdAt, users.display_name AS author FROM comments JOIN users ON users.id = comments.author_id WHERE comments.post_id = ? AND comments.status = 'published' ORDER BY comments.created_at ASC`).bind(postId).all();
    return json({ comments: result.results });
  } catch (error) { return inputErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await assertTrustedOrigin();
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const postId = requiredText(body.postId, "帖子编号", 80);

    await ensureDatabase();
    const db = getD1();

    // 内容限频：同一用户 10 分钟内最多 5 条（与发帖共用窗口，防灌水）
    const allowed = await rateLimitAllow(db, "content_post", user.id, CONTENT_MAX_PER_WINDOW, CONTENT_WINDOW_MS);
    if (!allowed) {
      log("comments.create", { userId: user.id, result: "rate_limited" }, "warn");
      return json({ error: "回复太频繁，请稍后再试" }, 429);
    }

    const exists = await db.prepare("SELECT id FROM posts WHERE id = ? AND status = 'published'").bind(postId).first();
    if (!exists) return json({ error: "帖子不存在" }, 404);
    const commentBody = requiredText(body.body, "回复", 1200);

    // 内容审核：评论在入库前必须先通过屏蔽词检测
    const moderation = moderateText(commentBody);
    if (!moderation.passed) return json({ error: moderation.message }, 400);

    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO comments (id,post_id,author_id,body) VALUES (?,?,?,?)")
      .bind(id, postId, user.id, commentBody).run();
    log("comments.create", { userId: user.id, commentId: id, postId, result: "success" });
    return json({ id, status: "published" }, 201);
  } catch (error) { return inputErrorResponse(error); }
}
