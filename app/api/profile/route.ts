import { getD1 } from "../../../db/runtime";
import { requireUser } from "../../lib/auth";
import { inputErrorResponse, json, optionalPhone, optionalText, optionalUrl, requiredText } from "../../lib/http";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    const displayName = requiredText(body.displayName, "显示名称", 50);
    const username = requiredText(body.username, "用户名", 32).replace(/[^a-zA-Z0-9_-]/g, "-");
    const bio = optionalText(body.bio, 280) ?? "";
    const phone = optionalPhone(body.phone);
    const avatarUrl = optionalUrl(body.avatarUrl);
    const duplicate = await getD1().prepare("SELECT id FROM users WHERE username = ? AND id != ?").bind(username, user.id).first();
    if (duplicate) return json({ error: "这个用户名已经被使用" }, 409);
    if (phone) {
      const phoneDuplicate = await getD1().prepare("SELECT id FROM users WHERE phone = ? AND id != ?").bind(phone, user.id).first();
      if (phoneDuplicate) return json({ error: "这个手机号已经被其他成员使用" }, 409);
    }
    await getD1().prepare("UPDATE users SET display_name = ?, username = ?, bio = ?, phone = ?, phone_verified_at = CASE WHEN phone = ? THEN phone_verified_at ELSE NULL END, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(displayName, username, bio, phone, phone, avatarUrl, user.id).run();
    return json({ ok: true });
  } catch (error) { return inputErrorResponse(error); }
}
