import { NextRequest } from "next/server";
import { loginAdmin } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-helper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    const isSecure = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

    const result = await loginAdmin(email, password, isSecure);
    if (!result.success) {
      return errorResponse(result.error || "Authentication failed", 401);
    }

    return jsonResponse({
      message: "Login successful",
      user: result.user,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return errorResponse(msg, 500);
  }
}
