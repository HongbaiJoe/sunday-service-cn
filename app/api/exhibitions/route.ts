import { ensureDatabase, getD1 } from "../../../db/runtime";
import { requireUser } from "../../lib/auth";
import { inputErrorResponse, json, optionalUrl, requiredText } from "../../lib/http";

export async function GET() {
  try {
    await ensureDatabase();
    const result = await getD1().prepare(`SELECT exhibitions.id, title, summary, curatorial_statement AS curatorialStatement, external_url AS externalUrl, cover_url AS coverUrl, exhibitions.updated_at AS updatedAt, users.display_name AS curator FROM exhibitions JOIN users ON users.id = exhibitions.owner_id WHERE exhibitions.status = 'approved' ORDER BY exhibitions.updated_at DESC`).all();
    return json({ exhibitions: result.results });
  } catch (error) { return inputErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const id = crypto.randomUUID();
    await getD1().prepare("INSERT INTO exhibitions (id,owner_id,title,summary,curatorial_statement,external_url,cover_url) VALUES (?,?,?,?,?,?,?)")
      .bind(id, user.id, requiredText(body.title, "展览标题", 140), requiredText(body.summary, "简介", 320), requiredText(body.curatorialStatement, "策展说明", 12000), optionalUrl(body.externalUrl), optionalUrl(body.coverUrl)).run();
    return json({ id, status: "pending" }, 201);
  } catch (error) { return inputErrorResponse(error); }
}
