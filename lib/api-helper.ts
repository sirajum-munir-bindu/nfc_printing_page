import { NextResponse } from "next/server";
import { getSessionUser } from "./auth";

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status }
  );
}

export async function requireApiAuth() {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }
  return user;
}
