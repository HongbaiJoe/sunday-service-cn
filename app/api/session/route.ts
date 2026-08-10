import { chatGPTSignInPath, chatGPTSignOutPath } from "../../chatgpt-auth";
import { getCurrentUser, isDevelopmentPreview } from "../../lib/auth";
import { apiError, json } from "../../lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return json({
      user,
      developmentPreview: isDevelopmentPreview(),
      signInPath: chatGPTSignInPath("/account"),
      signOutPath: chatGPTSignOutPath("/"),
    });
  } catch (error) {
    return apiError(error);
  }
}
