import { describe, expect, it } from "vitest";
import { hasAdminPermission, permissionsForAdminRole } from "../server/utils/admin-rbac";

describe("admin RBAC", () => {
  it("keeps viewer access read-only", () => {
    expect(hasAdminPermission("viewer", "dashboard:read")).toBe(true);
    expect(hasAdminPermission("viewer", "runtime:read")).toBe(true);
    expect(hasAdminPermission("viewer", "audit:read")).toBe(true);
    expect(hasAdminPermission("viewer", "updates:read")).toBe(true);
    expect(hasAdminPermission("viewer", "content:write")).toBe(false);
    expect(hasAdminPermission("viewer", "operations:write")).toBe(false);
  });

  it("separates moderation, editorial and operational writes", () => {
    expect(hasAdminPermission("moderator", "moderation:write")).toBe(true);
    expect(hasAdminPermission("moderator", "notifications:write")).toBe(false);
    expect(hasAdminPermission("editor", "content:write")).toBe(true);
    expect(hasAdminPermission("editor", "operations:write")).toBe(false);
    expect(hasAdminPermission("operator", "operations:write")).toBe(true);
    expect(hasAdminPermission("operator", "updates:write")).toBe(true);
  });

  it("grants owners every declared permission", () => {
    expect(permissionsForAdminRole("owner")).toHaveLength(16);
  });
});
