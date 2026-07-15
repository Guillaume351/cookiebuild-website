import { eq } from "drizzle-orm";
import { deleteCookie, getRequestIP, readBody, setCookie } from "h3";
import db from "../../../../db/client";
import { adminAuditLog, adminUsers } from "../../../../db/schema";
import { firebaseAuth } from "../../../utils/mobile-auth";
import { isAdminRole, permissionsForAdminRole } from "../../../utils/admin-rbac";
import { adminSessionCookieName, enforceAdminRateLimit } from "../../../utils/admin-security";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1_000;

function loginText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown; password?: unknown }>(event);
  const email = loginText(body?.email, 320).toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  const ip = getRequestIP(event, { xForwardedFor: true }) || "unknown";
  enforceAdminRateLimit(`login-ip:${ip}`, 20, 15 * 60_000);
  enforceAdminRateLimit(`login:${ip}:${email}`, 5, 15 * 60_000);
  if (!email || !password || password.length > 1024) {
    throw createError({ statusCode: 400, statusMessage: "Email and password are required" });
  }

  const apiKey = process.env.NUXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw createError({ statusCode: 503, statusMessage: "Admin login is not configured" });

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const result = await response.json() as { idToken?: string };
  if (!response.ok || !result.idToken) {
    throw createError({ statusCode: 401, statusMessage: "Invalid admin credentials" });
  }

  const token = await firebaseAuth().verifyIdToken(result.idToken, true);
  if (token.admin !== true) {
    throw createError({ statusCode: 403, statusMessage: "Firebase admin claim required" });
  }
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.firebaseUid, token.uid)).limit(1);
  if (!user || !user.enabled || !isAdminRole(user.role)) {
    throw createError({ statusCode: 403, statusMessage: "Admin account is disabled or not provisioned" });
  }

  const sessionCookie = await firebaseAuth().createSessionCookie(result.idToken, {
    expiresIn: SESSION_DURATION_MS,
  });
  await db.transaction(async (tx) => {
    await tx.update(adminUsers).set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(adminUsers.firebaseUid, user.firebaseUid));
    await tx.insert(adminAuditLog).values({
      actorUid: user.firebaseUid,
      actorRole: user.role,
      action: "auth.login",
      resourceType: "admin_session",
      resourceId: user.firebaseUid,
      ipAddress: ip.slice(0, 64),
      userAgent: getHeader(event, "user-agent")?.slice(0, 512) || null,
      metadata: {},
    });
  });

  deleteCookie(event, adminSessionCookieName());
  setCookie(event, adminSessionCookieName(), sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1_000,
  });
  setHeader(event, "Cache-Control", "no-store");
  return { data: {
    user: {
      uid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      permissions: permissionsForAdminRole(user.role),
    },
  } };
});
