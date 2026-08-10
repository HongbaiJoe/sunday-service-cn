import { ensureDatabase, getD1 } from "../../../db/runtime";
import { requireUser } from "../../lib/auth";
import { inputErrorResponse, json, optionalText, optionalUrl, requiredText } from "../../lib/http";

export async function GET() {
  try {
    await ensureDatabase();
    const result = await getD1().prepare(`SELECT posts.id, posts.title, posts.body, posts.tags, posts.media_url AS mediaUrl, posts.created_at AS createdAt, users.display_name AS author, users.username, COUNT(comments.id) AS commentCount FROM posts JOIN users ON users.id = posts.author_id LEFT JOIN comments ON comments.post_id = posts.id AND comments.status = 'published' WHERE posts.status = 'published' GROUP BY posts.id ORDER BY posts.created_at DESC LIMIT 50`).all();
    return json({ posts: result.results });
  } catch (error) { return inputErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const id = crypto.randomUUID();
    await getD1().prepare("INSERT INTO posts (id,author_id,title,body,tags,media_url) VALUES (?,?,?,?,?,?)")
      .bind(id, user.id, requiredText(body.title, "标题", 120), requiredText(body.body, "正文", 5000), optionalText(body.tags, 240) ?? "", optionalUrl(body.mediaUrl)).run();
    return json({ id, status: "published" }, 201);
  } catch (error) { return inputErrorResponse(error); }
}
