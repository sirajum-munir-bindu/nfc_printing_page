import { logoutAdmin } from "@/lib/auth";
import { jsonResponse } from "@/lib/api-helper";

export async function POST() {
  await logoutAdmin();
  return jsonResponse({ message: "Logged out successfully" });
}
