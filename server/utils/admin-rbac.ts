import { createError } from "h3";

export const ADMIN_ROLES = ["viewer", "moderator", "editor", "operator", "owner"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export const ADMIN_PERMISSIONS = [
  "dashboard:read",
  "reports:read",
  "reports:write",
  "content:read",
  "content:write",
  "notifications:read",
  "notifications:write",
  "audit:read",
  "runtime:read",
  "runtime:write",
  "moderation:read",
  "moderation:write",
  "operations:read",
  "operations:write",
  "updates:read",
  "updates:write",
] as const;
export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

const VIEWER_PERMISSIONS: AdminPermission[] = [
  "dashboard:read",
  "reports:read",
  "content:read",
  "notifications:read",
  "audit:read",
  "runtime:read",
  "moderation:read",
  "operations:read",
  "updates:read",
];
const MODERATOR_PERMISSIONS: AdminPermission[] = [...VIEWER_PERMISSIONS, "reports:write", "moderation:write"];
const EDITOR_PERMISSIONS: AdminPermission[] = [...MODERATOR_PERMISSIONS, "content:write", "notifications:write"];
const OPERATOR_PERMISSIONS: AdminPermission[] = [...EDITOR_PERMISSIONS, "runtime:write", "operations:write", "updates:write"];

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  viewer: new Set(VIEWER_PERMISSIONS),
  moderator: new Set(MODERATOR_PERMISSIONS),
  editor: new Set(EDITOR_PERMISSIONS),
  operator: new Set(OPERATOR_PERMISSIONS),
  owner: new Set(ADMIN_PERMISSIONS),
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function hasAdminPermission(role: AdminRole, permission: AdminPermission) {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function requireAdminPermission(role: AdminRole, permission: AdminPermission) {
  if (!hasAdminPermission(role, permission)) {
    throw createError({ statusCode: 403, statusMessage: "Insufficient admin permission" });
  }
}

export function permissionsForAdminRole(role: AdminRole) {
  return [...ROLE_PERMISSIONS[role]];
}
