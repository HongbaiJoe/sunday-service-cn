import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { assertTrustedOrigin, requireAdmin } from "../../../lib/auth";
import { inputErrorResponse, json, optionalText, requiredText } from "../../../lib/http";
import { log } from "../../../lib/log";

export async function GET() {
  try {
    await requireAdmin();
    await ensureDatabase();
    const db = getD1();
    const [library, exhibitions, posts, users, comments] = await Promise.all([
      db.prepare(`SELECT library_entries.id, title, category, summary, body, title_en AS titleEn, summary_en AS summaryEn, body_en AS bodyEn, category_en AS categoryEn, library_entries.status AS status, reviewer_note AS reviewerNote, users.display_name AS owner FROM library_entries JOIN users ON users.id = library_entries.owner_id WHERE library_entries.status != 'approved' ORDER BY library_entries.created_at DESC`).all(),
      db.prepare(`SELECT exhibitions.id, title, summary, curatorial_statement AS body, title_en AS titleEn, summary_en AS summaryEn, curatorial_statement_en AS bodyEn, exhibitions.status AS status, reviewer_note AS reviewerNote, users.display_name AS owner FROM exhibitions JOIN users ON users.id = exhibitions.owner_id WHERE exhibitions.status != 'approved' ORDER BY exhibitions.created_at DESC`).all(),
      db.prepare(`SELECT posts.id, posts.title, posts.body, posts.title_en AS titleEn, posts.body_en AS bodyEn, posts.status AS status, posts.created_at AS createdAt, users.display_name AS author FROM posts JOIN users ON users.id = posts.author_id ORDER BY posts.created_at DESC LIMIT 100`).all(),
      db.prepare(`SELECT id, display_name AS displayName, username, email, role, status, created_at AS createdAt FROM users ORDER BY created_at DESC`).all(),
      db.prepare(`SELECT comments.id, comments.body, comments.body_en AS bodyEn, comments.status AS status, users.display_name AS author, posts.id AS postId, posts.title AS postTitle, posts.title_en AS postTitleEn FROM comments JOIN users ON users.id = comments.author_id JOIN posts ON posts.id = comments.post_id ORDER BY comments.created_at DESC LIMIT 100`).all(),
    ]);
    return json({ library: library.results, exhibitions: exhibitions.results, posts: posts.results, users: users.results, comments: comments.results });
  } catch (error) { return inputErrorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    await assertTrustedOrigin();
    const admin = await requireAdmin();
    const body = await request.json() as Record<string, unknown>;
    const entityType = requiredText(body.entityType, "对象类型", 30);
    const entityId = requiredText(body.entityId, "对象编号", 80);
    const action = requiredText(body.action, "操作", 30);
    const note = optionalText(body.note, 500) ?? "";
    const titleEn = optionalText(body.titleEn, 200);
    const summaryEn = optionalText(body.summaryEn, 600);
    const bodyEn = optionalText(body.bodyEn, 16000);
    const categoryEn = optionalText(body.categoryEn, 60);
    const db = getD1();

    if (entityType === "library" || entityType === "exhibition") {
      if (action !== "approve" && action !== "reject") return json({ error: "审核操作无效" }, 400);
      const table = entityType === "library" ? "library_entries" : "exhibitions";
      const translationSql = entityType === "library" ? "category_en = COALESCE(?, category_en), title_en = COALESCE(?, title_en), summary_en = COALESCE(?, summary_en), body_en = COALESCE(?, body_en)," : "title_en = COALESCE(?, title_en), summary_en = COALESCE(?, summary_en), curatorial_statement_en = COALESCE(?, curatorial_statement_en),";
      const values = entityType === "library" ? [categoryEn, titleEn, summaryEn, bodyEn] : [titleEn, summaryEn, bodyEn];
      await db.prepare(`UPDATE ${table} SET ${translationSql} status = ?, reviewer_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(...values, action === "approve" ? "approved" : "rejected", note, admin.id, entityId).run();
    } else if (entityType === "post") {
      if (action !== "publish" && action !== "hide") return json({ error: "帖子操作无效" }, 400);
      await db.prepare("UPDATE posts SET title_en = COALESCE(?, title_en), body_en = COALESCE(?, body_en), status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(titleEn, bodyEn, action === "publish" ? "published" : "hidden", entityId).run();
    } else if (entityType === "comment") {
      if (action !== "publish" && action !== "hide") return json({ error: "评论操作无效" }, 400);
      await db.prepare("UPDATE comments SET body_en = COALESCE(?, body_en), status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(bodyEn, action === "publish" ? "published" : "hidden", entityId).run();
    } else if (entityType === "user") {
      if (!["activate", "suspend", "promote", "demote"].includes(action)) return json({ error: "用户操作无效" }, 400);
      if (entityId === admin.id && (action === "suspend" || action === "demote")) return json({ error: "不能移除自己的管理员权限" }, 400);
      if (action === "activate" || action === "suspend") {
        await db.prepare("UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(action === "activate" ? "active" : "suspended", entityId).run();
      } else {
        await db.prepare("UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(action === "promote" ? "admin" : "member", entityId).run();
      }
    } else return json({ error: "对象类型无效" }, 400);

    await db.prepare("INSERT INTO admin_actions (id,admin_id,entity_type,entity_id,action,note) VALUES (?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), admin.id, entityType, entityId, action, note).run();
    log("admin.review", { adminId: admin.id, entityType, entityId, action, result: "success" });
    return json({ ok: true });
  } catch (error) { return inputErrorResponse(error); }
}
