import { clearDevIdentityCookie, devIdentityCookie, devMemberIdentityCookie, isDevelopmentPreview } from "../../lib/auth";
import { inputErrorResponse, json, loginIdentifier, optionalText } from "../../lib/http";

export async function POST(request: Request) {
  if (!isDevelopmentPreview()) return json({ error: "仅本地开发环境可用" }, 404);
  try {
    const body = await request.json().catch(() => ({})) as { role?: string; identifier?: string; displayName?: string };
    if (body.role !== "member" && body.role !== "admin") return json({ error: "身份无效" }, 400);
    const cookie = body.identifier
      ? devMemberIdentityCookie(body.role, loginIdentifier(body.identifier).value, optionalText(body.displayName, 50) ?? "本地成员")
      : devIdentityCookie(body.role);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json", "set-cookie": cookie },
    });
  } catch (error) { return inputErrorResponse(error); }
}

export async function DELETE() {
  if (!isDevelopmentPreview()) return json({ error: "仅本地开发环境可用" }, 404);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": clearDevIdentityCookie() },
  });
}
