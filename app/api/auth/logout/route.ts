import { cookies } from "next/headers";
import { ensureDatabase, getD1 } from "../../../../db/runtime";
import { assertTrustedOrigin, clearSessionCookie } from "../../../lib/auth";
import { apiError } from "../../../lib/http";
import { log } from "../../../lib/log";

export const dynamic = "force-dynamic";

export async function POST() {
  // Origin 校验在 try 之外：校验失败必须返回 403（AuthError），不能被兜底 catch 吞掉
  try {
    await assertTrustedOrigin();
  } catch (error) {
    return apiError(error);
  }
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sss_session")?.value ?? "";
    if (sessionId) {
      await ensureDatabase();
      await getD1().prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
      log("auth.logout", { sessionId: sessionId.slice(0, 8), result: "success" });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() },
    });
  } catch {
    // 登出失败也清除 cookie，保证用户能退出
    log("auth.logout", { result: "clear_cookie_only" }, "warn");
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() },
    });
  }
}
