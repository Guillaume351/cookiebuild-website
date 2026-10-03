import { describe, expect, it, vi } from "vitest";
import type { H3Event } from "h3";
import {
  appLikerKey,
  galleryCookieSecret,
  signGalleryCookie,
  verifyGalleryCookie,
  webLikerKey,
} from "../server/buildbattle/identity";
import { enforceGalleryLikeLimits, enforceGalleryReportLimits, GALLERY_RATE_LIMITS } from "../server/buildbattle/rate-limit";
import { createMemoryRateLimitStore } from "../server/utils/mobile-memory-rate-limit";
import { enforceMobileRequestRateLimit } from "../server/utils/mobile-rate-limit";

function memoryEnforcer(now = Date.UTC(2026, 9, 3, 12)) {
  const store = createMemoryRateLimitStore();
  return ((key: string, limit: number, windowMs: number) =>
    enforceMobileRequestRateLimit(key, limit, windowMs, { store, now })) as typeof enforceMobileRequestRateLimit;
}

const event = {} as H3Event;

describe("gallery identities", () => {
  it("hashes liker keys and keeps them within varchar(80)", () => {
    expect(appLikerKey("firebase-uid")).toMatch(/^app:[0-9a-f]{64}$/);
    expect(webLikerKey("anonymous")).toMatch(/^web:[0-9a-f]{64}$/);
    expect(appLikerKey("firebase-uid")).not.toContain("firebase-uid");
    expect(appLikerKey("x").length).toBeLessThanOrEqual(80);
  });

  it("signs the cb_gid cookie and rejects tampering", () => {
    const secret = "s".repeat(40);
    const id = "abcdefghijklmnopqrstuvwxyz012345";
    const cookie = signGalleryCookie(id, secret);
    expect(verifyGalleryCookie(cookie, secret)).toBe(id);
    expect(verifyGalleryCookie(cookie, "t".repeat(40))).toBeNull();
    expect(verifyGalleryCookie(`${id}x.${cookie.split(".")[1]}`, secret)).toBeNull();
    expect(verifyGalleryCookie(id, secret)).toBeNull();
    expect(verifyGalleryCookie(undefined, secret)).toBeNull();
  });

  it("derives the cookie key from the explicit secret or the link pepper", () => {
    expect(galleryCookieSecret({ BB_GALLERY_COOKIE_SECRET: "k".repeat(32) })).toBe("k".repeat(32));
    const derived = galleryCookieSecret({ MOBILE_LINK_PEPPER: "p".repeat(40) });
    expect(derived).toMatch(/^[0-9a-f]{64}$/);
    expect(derived).not.toContain("pppp");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const ephemeral = galleryCookieSecret({});
    expect(galleryCookieSecret({})).toBe(ephemeral);
  });
});

describe("gallery rate limits", () => {
  it("caps web likes per IP across rotating cookies", async () => {
    const enforce = memoryEnforcer();
    const { limit } = GALLERY_RATE_LIMITS.likePerIp;
    for (let index = 0; index < limit; index += 1) {
      await enforceGalleryLikeLimits(event, "203.0.113.7", { kind: "web", key: `web:${index}` }, enforce);
    }
    await expect(enforceGalleryLikeLimits(event, "203.0.113.7", { kind: "web", key: "web:new" }, enforce))
      .rejects.toMatchObject({ statusCode: 429 });
    await expect(enforceGalleryLikeLimits(event, "198.51.100.1", { kind: "web", key: "web:new" }, enforce)).resolves.toBeUndefined();
  });

  it("caps each identity and lets app users share an address", async () => {
    const enforce = memoryEnforcer();
    const { limit } = GALLERY_RATE_LIMITS.likePerIdentity;
    for (let index = 0; index < limit; index += 1) {
      await enforceGalleryLikeLimits(event, `192.0.2.${index}`, { kind: "web", key: "web:same" }, enforce);
    }
    await expect(enforceGalleryLikeLimits(event, "192.0.2.250", { kind: "web", key: "web:same" }, enforce))
      .rejects.toMatchObject({ statusCode: 429 });
    for (let index = 0; index < GALLERY_RATE_LIMITS.likePerIp.limit + 5; index += 1) {
      await enforceGalleryLikeLimits(event, "203.0.113.9", { kind: "app", key: `app:${index}` }, enforce);
    }
  });

  it("accepts one web report per address and build", async () => {
    const enforce = memoryEnforcer();
    await enforceGalleryReportLimits(event, "203.0.113.7", { kind: "web", key: "web:a" }, "Ab12Cd34", enforce);
    await expect(enforceGalleryReportLimits(event, "203.0.113.7", { kind: "web", key: "web:b" }, "Ab12Cd34", enforce))
      .rejects.toMatchObject({ statusCode: 429 });
    await enforceGalleryReportLimits(event, "203.0.113.7", { kind: "web", key: "web:b" }, "Other123", enforce);
    await enforceGalleryReportLimits(event, "203.0.113.7", { kind: "app", key: "app:c" }, "Ab12Cd34", enforce);
  });
});
