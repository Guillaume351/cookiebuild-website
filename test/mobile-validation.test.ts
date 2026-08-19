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
} from "../server/utils/mobile-validation";
import {
  enforceLinkClaimRateLimit,
  enforceMobileRequestRateLimit,
} from "../server/utils/mobile-rate-limit";

describe("mobile API validation", () => {
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

  it("limits repeated claim attempts and resets the window", () => {
    const key = `test:${Math.random()}`;
    for (let index = 0; index < 8; index += 1) {
      expect(() => enforceLinkClaimRateLimit(key, 1_000)).not.toThrow();
    }
    expect(() => enforceLinkClaimRateLimit(key, 1_000)).toThrowError();
    expect(() => enforceLinkClaimRateLimit(key, 601_001)).not.toThrow();
  });

  it("supports bounded per-user limits for private mobile reads", () => {
    const key = `dashboard-${crypto.randomUUID()}`;
    expect(() => enforceMobileRequestRateLimit(key, 2, 1_000, 10)).not.toThrow();
    expect(() => enforceMobileRequestRateLimit(key, 2, 1_000, 20)).not.toThrow();
    expect(() => enforceMobileRequestRateLimit(key, 2, 1_000, 30)).toThrowError();
    expect(() => enforceMobileRequestRateLimit(key, 2, 1_000, 1_011)).not.toThrow();
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
