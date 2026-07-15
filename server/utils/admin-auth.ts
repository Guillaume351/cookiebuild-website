import { eq } from "drizzle-orm";
import { createError, getCookie, getHeader, getRequestIP, type H3Event } from "h3";
import db from "../../db/client";
import { adminAuditLog, adminUsers } from "../../db/schema";
import { firebaseAuth } from "./mobile-auth";
import {
  isAdminRole,
  permissionsForAdminRole,
  requireAdminPermission,
  type AdminPermission,
  type AdminRole,
} from "./admin-rbac";
import { adminSessionCookieName } from "./admin-security";

export interface AdminAuthContext {
  uid: string;
  email: string;
  displayName: string | null;
  role: AdminRole;
  permissions: AdminPermission[];
  authenticatedAtMs: number;
}

type AdminContext = H3Event["context"] & { adminAuth?: AdminAuthContext };

export async function verifyAdminSession(event: H3Event) {
  const cookie = getCookie(event, adminSessionCookieName());
  if (!cookie) throw createError({ statusCode: 401, statusMessage: "Admin authentication required" });

  let token;
  try {
    token = await firebaseAuth().verifySessionCookie(cookie, true);
  } catch {
    throw createError({ statusCode: 401, statusMessage: "Invalid or expired admin session" });
  }
  if (token.admin !== true) {
    throw createError({ statusCode: 403, statusMessage: "Firebase admin claim required" });
  }

  const [user] = await db
    .select({
      uid: adminUsers.firebaseUid,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      enabled: adminUsers.enabled,
    })
    .from(adminUsers)
    .where(eq(adminUsers.firebaseUid, token.uid))
    .limit(1);
  if (!user || !user.enabled || !isAdminRole(user.role)) {
    throw createError({ statusCode: 403, statusMessage: "Admin account is disabled or not provisioned" });
  }
  const auth: AdminAuthContext = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    permissions: permissionsForAdminRole(user.role),
    authenticatedAtMs: Number(token.auth_time || 0) * 1_000,
  };
  (event.context as AdminContext).adminAuth = auth;
  return auth;
}

export function requireRecentAdminAuth(event: H3Event, maximumAgeMs = 15 * 60_000) {
  const auth = requireAdminAuth(event);
  if (!auth.authenticatedAtMs || Date.now() - auth.authenticatedAtMs > maximumAgeMs) {
    throw createError({ statusCode: 401, statusMessage: "Recent admin login required for this action" });
  }
  return auth;
}

export function requireAdminAuth(event: H3Event, permission?: AdminPermission) {
  const auth = (event.context as AdminContext).adminAuth;
  if (!auth) throw createError({ statusCode: 401, statusMessage: "Admin authentication required" });
  if (permission) requireAdminPermission(auth.role, permission);
  return auth;
}

export function adminAuditValues(
  event: H3Event,
  action: string,
  resourceType: string,
  resourceId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  const auth = requireAdminAuth(event);
  return {
    actorUid: auth.uid,
    actorRole: auth.role,
    action,
    resourceType,
    resourceId: resourceId || null,
    requestId: String(event.context.requestId || "").slice(0, 64) || null,
    ipAddress: getRequestIP(event, { xForwardedFor: true })?.slice(0, 64) || null,
    userAgent: getHeader(event, "user-agent")?.slice(0, 512) || null,
    metadata,
  };
}

export async function writeAdminAudit(
  event: H3Event,
  action: string,
  resourceType: string,
  resourceId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(adminAuditLog).values(adminAuditValues(event, action, resourceType, resourceId, metadata));
}
