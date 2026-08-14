import { getD1 } from "../../../db/runtime";
import { assertTrustedOrigin, requireUser } from "../../lib/auth";
import { inputErrorResponse, json, optionalPhone, optionalText, optionalUrl, requiredText } from "../../lib/http";
import { log, maskAccount } from "../../lib/log";
import { moderateContent } from "../../lib/moderation";

export async function PATCH(request: Request) {
  try {
    await assertTrustedOrigin();
    const user = await requireUser();
    const body = await request.json() as Record<string, unknown>;
    // 用户名即显示名称：只接受 displayName，自动同步 username（允许中文）
    const displayName = requiredText(body.displayName, "用户名", 24);
    const bio = optionalText(body.bio, 280) ?? "";
    const phone = optionalPhone(body.phone);
    const avatarUrl = optionalUrl(body.avatarUrl);

    // 内容审核：用户名与个人简介在保存前必须通过屏蔽词检测
    const moderation = moderateContent(displayName, bio);
    if (!moderation.passed) return json({ error: moderation.message }, 400);

    // 用户名唯一性：同名用户自动追加数字后缀（如 名字、名字2、名字3…）
    const db = getD1();
    const findDuplicate = (name: string) => db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").bind(name, user.id).first();
    let username = displayName;
    let suffix = 2;
    while (await findDuplicate(username)) {
      username = `${displayName}${suffix}`;
      suffix += 1;
      if (suffix > 100) return json({ error: "该用户名已被大量占用，请换一个名字" }, 400);
    }
    if (phone) {
      const phoneDuplicate = await db.prepare("SELECT id FROM users WHERE phone = ? AND id != ?").bind(phone, user.id).first();
      if (phoneDuplicate) return json({ error: "这个手机号已经被其他成员使用" }, 409);
    }
    await db.prepare("UPDATE users SET display_name = ?, username = ?, bio = ?, phone = ?, phone_verified_at = CASE WHEN phone = ? THEN phone_verified_at ELSE NULL END, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(displayName, username, bio, phone, phone, avatarUrl, user.id).run();
    log("profile.update", { userId: user.id, account: maskAccount(user.email ? "email" : "phone", user.email ?? user.phone ?? "unknown"), result: "ok" });
    return json({ ok: true });
  } catch (error) { return inputErrorResponse(error); }
}
