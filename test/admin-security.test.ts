import { describe, expect, it, beforeEach } from "vitest";
import {
  createAdminCsrfToken,
  enforceAdminRateLimit,
  resetAdminRateLimitsForTests,
  validAdminCsrfToken,
} from "../server/utils/admin-security";

describe("admin request security", () => {
  beforeEach(() => resetAdminRateLimitsForTests());

  it("accepts only an exact CSRF cookie/header pair", () => {
    const token = createAdminCsrfToken();
    expect(token).toHaveLength(43);
    expect(validAdminCsrfToken(token, token)).toBe(true);
    expect(validAdminCsrfToken(token, createAdminCsrfToken())).toBe(false);
    expect(validAdminCsrfToken("bad", "bad")).toBe(false);
  });

  it("limits repeated requests inside a fixed window", () => {
    enforceAdminRateLimit("login:test", 2, 1_000, 100);
    enforceAdminRateLimit("login:test", 2, 1_000, 200);
    expect(() => enforceAdminRateLimit("login:test", 2, 1_000, 300)).toThrow(/Too many admin requests/);
    expect(() => enforceAdminRateLimit("login:test", 2, 1_000, 1_101)).not.toThrow();
  });
});
