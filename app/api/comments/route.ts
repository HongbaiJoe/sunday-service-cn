import { ensureDatabase, getD1 } from "../../../db/runtime";
import { requireUser } from "../../lib/auth";
import { inputErrorResponse, json, requiredText } from "../../lib/http";

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
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const postId = requiredText(body.postId, "帖子编号", 80);
    const exists = await getD1().prepare("SELECT id FROM posts WHERE id = ? AND status = 'published'").bind(postId).first();
    if (!exists) return json({ error: "帖子不存在" }, 404);
    const id = crypto.randomUUID();
    await getD1().prepare("INSERT INTO comments (id,post_id,author_id,body) VALUES (?,?,?,?)")
      .bind(id, postId, user.id, requiredText(body.body, "回复", 1200)).run();
    return json({ id, status: "published" }, 201);
  } catch (error) { return inputErrorResponse(error); }
}
