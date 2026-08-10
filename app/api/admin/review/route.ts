import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { requireAdmin } from "../../../lib/auth";
import { inputErrorResponse, json, optionalText, requiredText } from "../../../lib/http";

export async function GET() {
  try {
    await requireAdmin();
    await ensureDatabase();
    const db = getD1();
    const [library, exhibitions, posts, users, comments] = await Promise.all([
      db.prepare(`SELECT library_entries.id, title, category, summary, library_entries.status AS status, reviewer_note AS reviewerNote, users.display_name AS owner FROM library_entries JOIN users ON users.id = library_entries.owner_id WHERE library_entries.status != 'approved' ORDER BY library_entries.created_at DESC`).all(),
      db.prepare(`SELECT exhibitions.id, title, summary, exhibitions.status AS status, reviewer_note AS reviewerNote, users.display_name AS owner FROM exhibitions JOIN users ON users.id = exhibitions.owner_id WHERE exhibitions.status != 'approved' ORDER BY exhibitions.created_at DESC`).all(),
      db.prepare(`SELECT posts.id, posts.title, posts.status AS status, posts.created_at AS createdAt, users.display_name AS author FROM posts JOIN users ON users.id = posts.author_id ORDER BY posts.created_at DESC LIMIT 100`).all(),
      db.prepare(`SELECT id, display_name AS displayName, username, email, role, status, created_at AS createdAt FROM users ORDER BY created_at DESC`).all(),
      db.prepare(`SELECT comments.id, comments.body, comments.status AS status, users.display_name AS author, posts.title AS postTitle FROM comments JOIN users ON users.id = comments.author_id JOIN posts ON posts.id = comments.post_id ORDER BY comments.created_at DESC LIMIT 100`).all(),
    ]);
    return json({ library: library.results, exhibitions: exhibitions.results, posts: posts.results, users: users.results, comments: comments.results });
  } catch (error) { return inputErrorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json() as Record<string, unknown>;
    const entityType = requiredText(body.entityType, "对象类型", 30);
    const entityId = requiredText(body.entityId, "对象编号", 80);
    const action = requiredText(body.action, "操作", 30);
    const note = optionalText(body.note, 500) ?? "";
    const db = getD1();

    if (entityType === "library" || entityType === "exhibition") {
      if (action !== "approve" && action !== "reject") return json({ error: "审核操作无效" }, 400);
      const table = entityType === "library" ? "library_entries" : "exhibitions";
      await db.prepare(`UPDATE ${table} SET status = ?, reviewer_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(action === "approve" ? "approved" : "rejected", note, admin.id, entityId).run();
    } else if (entityType === "post") {
      if (action !== "publish" && action !== "hide") return json({ error: "帖子操作无效" }, 400);
      await db.prepare("UPDATE posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(action === "publish" ? "published" : "hidden", entityId).run();
    } else if (entityType === "comment") {
      if (action !== "publish" && action !== "hide") return json({ error: "评论操作无效" }, 400);
      await db.prepare("UPDATE comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(action === "publish" ? "published" : "hidden", entityId).run();
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
    return json({ ok: true });
  } catch (error) { return inputErrorResponse(error); }
}
