import { cookies } from "next/headers";
import { chatGPTSignInPath, chatGPTSignOutPath } from "../../chatgpt-auth";
import { getCurrentUser, isDevelopmentPreview } from "../../lib/auth";
import { apiError, json } from "../../lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const hasSessionCookie = Boolean((await cookies()).get("sss_session")?.value);
    return json({
      user,
      developmentPreview: isDevelopmentPreview(),
      signInPath: chatGPTSignInPath("/account"),
      signOutPath: hasSessionCookie ? "/api/auth/logout" : chatGPTSignOutPath("/"),
    });
  } catch (error) {
    return apiError(error);
  }
}
