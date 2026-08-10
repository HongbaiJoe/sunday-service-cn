import { ensureDatabase, getD1 } from "../../../db/runtime";
import { requireUser } from "../../lib/auth";
import { inputErrorResponse, json, optionalUrl, requiredText } from "../../lib/http";

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
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const id = crypto.randomUUID();
    await getD1().prepare("INSERT INTO library_entries (id,owner_id,category,title,summary,body,source_url,media_url) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id, user.id, requiredText(body.category, "分类", 30), requiredText(body.title, "标题", 140), requiredText(body.summary, "简介", 300), requiredText(body.body, "正文", 12000), optionalUrl(body.sourceUrl), optionalUrl(body.mediaUrl)).run();
    return json({ id, status: "pending" }, 201);
  } catch (error) { return inputErrorResponse(error); }
}
