import { describe, expect, it } from "vitest";
import {
  bearerToken,
  isValidLinkPepper,
  linkCodeHmac,
  normalizeLinkCode,
  optionalIanaTimezone,
  optionalInteger,
  optionalObservedAt,
  optionalQuietHour,
  positiveInteger,
  requiredInteger,
  requiredString,
  optionalString,
} from "../server/utils/mobile-validation";
import {
  enforceLinkClaimRateLimit,
  enforceMobileRequestRateLimit,
  type MobileRateLimitStore,
} from "../server/utils/mobile-rate-limit";

describe("mobile API validation", () => {
  it.each([{}, ["ios"], 12345678, true, null, undefined])("rejects non-string device fields: %j", (value) => {
    expect(() => requiredString(value, "installationId", { minimum: 8, maximum: 128 }))
      .toThrow("Invalid installationId");
  });

  it("preserves trimmed string fields and explicitly absent optional fields", () => {
    expect(requiredString(" installation-1 ", "installationId", { minimum: 8, maximum: 128 })).toBe("installation-1");
    expect(optionalString(null, "locale", 16)).toBeNull();
    expect(optionalString(undefined, "locale", 16)).toBeNull();
    expect(optionalString("", "locale", 16)).toBeNull();
    expect(() => optionalString({}, "locale", 16)).toThrow("Invalid locale");
  });

  it("continues limiting private reads while the shared store is unavailable", async () => {
    const store: MobileRateLimitStore = { consume: async () => { throw new Error("unavailable"); } };
    const key = `fallback-${crypto.randomUUID()}`;
    await expect(enforceMobileRequestRateLimit(key, 1, 1_000, { now: 1, store })).resolves.toBeUndefined();
    await expect(enforceMobileRequestRateLimit(key, 1, 1_000, { now: 2, store })).rejects.toMatchObject({ statusCode: 429 });
    await expect(enforceMobileRequestRateLimit(key, 1, 1_000, { now: 1_001, store })).resolves.toBeUndefined();
  });

  it("extracts only a well-formed bearer token", () => {
    expect(bearerToken("Bearer firebase-token")).toBe("firebase-token");
    expect(bearerToken("bearer firebase-token")).toBe("firebase-token");
    expect(bearerToken("Basic credentials")).toBeUndefined();
    expect(bearerToken("Bearer token with-spaces")).toBeUndefined();
  });

  it("normalizes the same link code format as the Minecraft command", () => {
    expect(normalizeLinkCode("  ab23cd45  ")).toBe("AB23CD45");
    expect(() => normalizeLinkCode("short")).toThrowError();
    expect(() => normalizeLinkCode("AB12CD34")).toThrowError();
    expect(() => normalizeLinkCode("INVALID!")).toThrowError();
  });

  it("uses a keyed digest and rejects an unsafe pepper", () => {
    const pepper = "0123456789abcdef0123456789abcdef";
    expect(linkCodeHmac("AB23CD45", pepper)).toBe(
      "6e274e7e3258346ff0383180a07b70c438e169152ffe46ca480741c143af5f25",
    );
    expect(linkCodeHmac("AB23CD45", pepper)).not.toBe(linkCodeHmac("AB23CD46", pepper));
    expect(() => linkCodeHmac("AB23CD45", "too-short")).toThrowError();
    expect(isValidLinkPepper("replace-with-a-secret-of-at-least-32-characters")).toBe(false);
    expect(isValidLinkPepper(pepper)).toBe(true);
  });

  it("bounds pagination and validates quiet hours", () => {
    expect(positiveInteger("500", 20, 50)).toBe(50);
    expect(positiveInteger("bad", 20, 50)).toBe(20);
    expect(optionalQuietHour("23:59", "quietHoursStart")).toBe("23:59");
    expect(() => optionalQuietHour("24:00", "quietHoursStart")).toThrowError();
  });

  it("accepts only exact numeric kit levels within the route bounds", () => {
    expect(requiredInteger(2, "level", { minimum: 1, maximum: 3 })).toBe(2);
    expect(() => requiredInteger("2", "level", { minimum: 1, maximum: 3 })).toThrowError();
    expect(() => requiredInteger(1.5, "level", { minimum: 1, maximum: 3 })).toThrowError();
    expect(() => requiredInteger(4, "level", { minimum: 1, maximum: 3 })).toThrowError();
  });

  it("limits repeated claim attempts and resets the shared window", async () => {
    const key = `test:${Math.random()}`;
    const store = memoryRateLimitStore();
    for (let index = 0; index < 8; index += 1) {
      await expect(enforceLinkClaimRateLimit(key, { now: 1_000, store })).resolves.toBeUndefined();
    }
    await expect(enforceLinkClaimRateLimit(key, { now: 1_000, store })).rejects.toMatchObject({ statusCode: 429 });
    await expect(enforceLinkClaimRateLimit(key, { now: 601_001, store })).resolves.toBeUndefined();
  });

  it("supports bounded per-user limits for private mobile reads", async () => {
    const key = `dashboard-${crypto.randomUUID()}`;
    const store = memoryRateLimitStore();
    await expect(enforceMobileRequestRateLimit(key, 2, 1_000, { now: 10, store })).resolves.toBeUndefined();
    await expect(enforceMobileRequestRateLimit(key, 2, 1_000, { now: 20, store })).resolves.toBeUndefined();
    await expect(enforceMobileRequestRateLimit(key, 2, 1_000, { now: 30, store })).rejects.toMatchObject({ statusCode: 429 });
    await expect(enforceMobileRequestRateLimit(key, 2, 1_000, { now: 1_011, store })).resolves.toBeUndefined();
  });

  it("fails closed for mutations when the shared limiter is unavailable", async () => {
    const store: MobileRateLimitStore = {
      consume: async () => { throw new Error("database unavailable"); },
    };
    await expect(enforceMobileRequestRateLimit("write", 1, 1_000, {
      failClosed: true,
      store,
    })).rejects.toMatchObject({ statusCode: 503 });
  });

  it("validates a bounded and timestamped device timezone snapshot", () => {
    expect(optionalIanaTimezone("Europe/Paris", "timezone")).toBe("Europe/Paris");
    expect(optionalIanaTimezone("UTC", "timezone")).toBe("UTC");
    expect(optionalIanaTimezone(undefined, "timezone")).toBeNull();
    expect(() => optionalIanaTimezone("GMT+2 unsafe", "timezone")).toThrowError();
    expect(optionalInteger(-840, "timezoneOffsetMinutes", { minimum: -840, maximum: 840 }))
      .toBe(-840);
    expect(() => optionalInteger(841, "timezoneOffsetMinutes", { minimum: -840, maximum: 840 }))
      .toThrowError();
    expect(optionalObservedAt(
      "2026-08-19T10:00:00Z",
      "timezoneObservedAt",
      new Date("2026-08-19T10:01:00Z"),
    )).toEqual(new Date("2026-08-19T10:00:00Z"));
    expect(() => optionalObservedAt(
      "2026-08-19T10:07:00Z",
      "timezoneObservedAt",
      new Date("2026-08-19T10:01:00Z"),
    )).toThrowError();
  });
});

function memoryRateLimitStore(): MobileRateLimitStore {
  const attempts = new Map<string, { count: number; resetsAt: Date }>();
  return {
    async consume({ keyHash, limit, windowMs, now }) {
      const current = attempts.get(keyHash);
      if (!current || current.resetsAt <= now) {
        const result = { count: 1, resetsAt: new Date(now.getTime() + windowMs) };
        attempts.set(keyHash, result);
        return { allowed: true, resetsAt: result.resetsAt };
      }
      current.count += 1;
      return { allowed: current.count <= limit, resetsAt: current.resetsAt };
    },
  };
}
