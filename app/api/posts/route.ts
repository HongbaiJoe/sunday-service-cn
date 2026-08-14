import { ensureDatabase, getD1 } from "../../../db/runtime";
import { assertTrustedOrigin, requireUser } from "../../lib/auth";
import { inputErrorResponse, json, optionalText, optionalUrl, requiredText } from "../../lib/http";
import { moderateContent } from "../../lib/moderation";
import { log } from "../../lib/log";
import { CONTENT_MAX_PER_WINDOW, CONTENT_WINDOW_MS, rateLimitAllow } from "../../lib/security";

export async function GET() {
  try {
    await ensureDatabase();
    const result = await getD1().prepare(`SELECT posts.id, posts.title, posts.body, posts.tags, posts.title_en AS titleEn, posts.body_en AS bodyEn, posts.tags_en AS tagsEn, posts.media_url AS mediaUrl, posts.created_at AS createdAt, users.display_name AS author, users.username, COUNT(comments.id) AS commentCount FROM posts JOIN users ON users.id = posts.author_id LEFT JOIN comments ON comments.post_id = posts.id AND comments.status = 'published' WHERE posts.status = 'published' GROUP BY posts.id ORDER BY posts.created_at DESC LIMIT 50`).all();
    return json({ posts: result.results });
  } catch (error) { return inputErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await assertTrustedOrigin();
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const title = requiredText(body.title, "标题", 120);
    const postBody = requiredText(body.body, "正文", 5000);
    const tags = optionalText(body.tags, 240) ?? "";
    const mediaUrl = optionalUrl(body.mediaUrl);

    // 内容限频：同一用户 10 分钟内最多发 5 条内容（防灌水）
    await ensureDatabase();
    const db = getD1();
    const allowed = await rateLimitAllow(db, "content_post", user.id, CONTENT_MAX_PER_WINDOW, CONTENT_WINDOW_MS);
    if (!allowed) {
      log("posts.create", { userId: user.id, result: "rate_limited" }, "warn");
      return json({ error: "发布太频繁，请稍后再试" }, 429);
    }

    // 内容审核：任何登录用户发布的内容在入库前必须先通过屏蔽词检测
    const moderation = moderateContent(title, postBody, tags);
    if (!moderation.passed) return json({ error: moderation.message }, 400);

    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO posts (id,author_id,title,body,tags,media_url) VALUES (?,?,?,?,?,?)")
      .bind(id, user.id, title, postBody, tags, mediaUrl).run();
    log("posts.create", { userId: user.id, postId: id, result: "success" });
    return json({ id, status: "published" }, 201);
  } catch (error) { return inputErrorResponse(error); }
}
