import { ensureDatabase, getD1 } from "../../../db/runtime";
import { assertTrustedOrigin, requireUser } from "../../lib/auth";
import { inputErrorResponse, json, optionalUrl, requiredText } from "../../lib/http";
import { moderateContent } from "../../lib/moderation";
import { log } from "../../lib/log";
import { CONTENT_MAX_PER_WINDOW, CONTENT_WINDOW_MS, rateLimitAllow } from "../../lib/security";

export async function GET() {
  try {
    await ensureDatabase();
    const result = await getD1().prepare(`SELECT exhibitions.id, title, summary, curatorial_statement AS curatorialStatement, title_en AS titleEn, summary_en AS summaryEn, curatorial_statement_en AS curatorialStatementEn, external_url AS externalUrl, cover_url AS coverUrl, exhibitions.updated_at AS updatedAt, users.display_name AS curator FROM exhibitions JOIN users ON users.id = exhibitions.owner_id WHERE exhibitions.status = 'approved' ORDER BY exhibitions.updated_at DESC`).all();
    return json({ exhibitions: result.results });
  } catch (error) { return inputErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    await assertTrustedOrigin();
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const title = requiredText(body.title, "展览标题", 140);
    const summary = requiredText(body.summary, "简介", 320);
    const statement = requiredText(body.curatorialStatement, "策展说明", 12000);
    const externalUrl = optionalUrl(body.externalUrl);
    const coverUrl = optionalUrl(body.coverUrl);
    const blocks = typeof body.blocks === "string" ? body.blocks : null;

    // 内容限频：与发帖/评论共用窗口
    await ensureDatabase();
    const db = getD1();
    const allowed = await rateLimitAllow(db, "content_post", user.id, CONTENT_MAX_PER_WINDOW, CONTENT_WINDOW_MS);
    if (!allowed) {
      log("exhibitions.create", { userId: user.id, result: "rate_limited" }, "warn");
      return json({ error: "提交太频繁，请稍后再试" }, 429);
    }

    // 内容审核：展览申请在入库前必须先通过屏蔽词检测
    const moderation = moderateContent(title, summary, statement);
    if (!moderation.passed) return json({ error: moderation.message }, 400);

    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO exhibitions (id,owner_id,title,summary,curatorial_statement,external_url,cover_url,blocks) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id, user.id, title, summary, statement, externalUrl, coverUrl, blocks).run();
    log("exhibitions.create", { userId: user.id, exhibitionId: id, result: "pending" });
    return json({ id, status: "pending" }, 201);
  } catch (error) { return inputErrorResponse(error); }
}
