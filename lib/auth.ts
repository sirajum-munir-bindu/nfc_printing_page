import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const AUTH_COOKIE_NAME = "nfc_studio_session";
const AUTH_SECRET = process.env.AUTH_SECRET || "nfc-studio-fallback-secret-at-least-32-chars-long";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Creates an HMAC signature for a payload.
 */
function signPayload(payloadStr: string): string {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payloadStr).digest("base64url");
}

/**
 * Serializes and signs session data.
 */
export function createSessionToken(user: SessionUser): string {
  const payload = {
    ...user,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(payloadStr);
  return `${payloadStr}.${signature}`;
}

/**
 * Verifies and decodes a session token.
 */
export function verifySessionToken(token: string): SessionUser | null {
  try {
    const [payloadStr, signature] = token.split(".");
    if (!payloadStr || !signature) return null;

    const expectedSig = signPayload(payloadStr);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf8"));
    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Gets the current authenticated session user from request cookies.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Ensures the default admin user exists in PostgreSQL.
 */
export async function ensureDefaultAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const defaultPassword = (process.env.ADMIN_PASSWORD || "AdminSecurePassword123!").trim();

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    await prisma.user.create({
      data: {
        name: "Studio Administrator",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`[Auth] Created default admin user: ${adminEmail}`);
  }
}

/**
 * Verifies admin credentials and sets session cookie.
 */
export async function loginAdmin(
  email: string,
  password: string,
  isSecure?: boolean
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  await ensureDefaultAdmin();

  const normalizedEmail = (email || "").trim().toLowerCase();
  const trimmedPassword = (password || "").trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }

  let isValid = await bcrypt.compare(trimmedPassword, user.passwordHash);

  // If password didn't match the database hash, check if it matches the current ADMIN_PASSWORD from .env
  const configuredPassword = (process.env.ADMIN_PASSWORD || "AdminSecurePassword123!").trim();
  const configuredEmail = (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  if (!isValid && normalizedEmail === configuredEmail && trimmedPassword === configuredPassword) {
    // Sync the database password hash with the current environment variable configuration
    const salt = await bcrypt.genSalt(10);
    const updatedHash = await bcrypt.hash(configuredPassword, salt);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: updatedHash },
    });
    isValid = true;
  }

  if (!isValid) {
    return { success: false, error: "Invalid email or password" };
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const token = createSessionToken(sessionUser);
  const cookieStore = await cookies();

  // Only set secure: true if the incoming request is HTTPS or COOKIE_SECURE=true
  // This ensures cookie is accepted when running on HTTP (e.g. http://localhost:3000, 127.0.0.1, or local IP)
  const useSecureCookie = isSecure ?? (process.env.COOKIE_SECURE === "true" || (process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://"))));

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: Boolean(useSecureCookie),
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return { success: true, user: sessionUser };
}

/**
 * Clears session cookie.
 */
export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  try {
    cookieStore.delete({
      name: AUTH_COOKIE_NAME,
      path: "/",
    });
  } catch {
    cookieStore.delete(AUTH_COOKIE_NAME);
  }
}

/**
 * Helper to require authentication for server actions / API handlers.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
