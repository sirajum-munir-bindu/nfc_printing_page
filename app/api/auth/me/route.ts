import { getSessionUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-helper";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse("Not authenticated", 401);
  }
  return jsonResponse({ user });
}
