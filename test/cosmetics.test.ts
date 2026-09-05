import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  COSMETIC_CATALOG,
  COSMETIC_CATALOG_RESPONSE,
  COSMETIC_PRODUCTS,
} from "../shared/cosmetics-catalog";

describe("web cosmetic catalog", () => {
  it("uses the canonical gameplay IDs and slots", () => {
    expect(COSMETIC_CATALOG.map(({ id, slot }) => ({ id, slot }))).toEqual([
      { id: "supporter_badge", slot: "BADGE" },
      { id: "cookie_crumb_trail", slot: "HUB_TRAIL" },
      { id: "cookie_cheer", slot: "EMOTE" },
      { id: "golden_cookie_burst", slot: "VICTORY_EFFECT" },
      { id: "supporter_profile_frame", slot: "PROFILE_FRAME" },
      { id: "lobby_flight", slot: "LOBBY_FLIGHT" },
      { id: "supporter_join_flair", slot: "JOIN_FLAIR" },
      { id: "cookie_sparkle_trail", slot: "HUB_TRAIL" },
    ]);
    expect(new Set(COSMETIC_CATALOG.map((item) => item.slot)).size).toBe(7);
    expect(COSMETIC_CATALOG.every((item) => !("permanent" in item))).toBe(true);
  });

  it("documents the native platform behavior and conservative fallbacks", () => {
    expect(COSMETIC_CATALOG.find((item) => item.id === "supporter_badge")?.platformSupport)
      .toMatchObject({
        java: { mode: "native", implementation: expect.stringContaining("préfixe chat") },
        bedrock: { mode: "native", implementation: expect.stringContaining("Geyser") },
      });
    expect(COSMETIC_CATALOG.find((item) => item.id === "lobby_flight")?.platformSupport)
      .toMatchObject({
        java: { implementation: expect.stringContaining("allowFlight") },
        bedrock: { implementation: expect.stringContaining("Geyser") },
      });
    expect(COSMETIC_CATALOG.find((item) => item.id === "supporter_join_flair")?.platformSupport)
      .toMatchObject({
        java: { implementation: expect.stringContaining("6 END_ROD") },
        bedrock: { implementation: expect.stringContaining("note.chime") },
      });
    expect(COSMETIC_CATALOG.find((item) => item.id === "supporter_profile_frame")?.platformSupport)
      .toMatchObject({ java: { mode: "web_only" }, bedrock: { mode: "web_only" } });
  });

  it("keeps checkout disabled and distinguishes subscription from permanent access", () => {
    expect(COSMETIC_CATALOG_RESPONSE).toMatchObject({
      availability: "coming_soon",
      purchaseEnabled: false,
      checkoutUrl: null,
      currency: "EUR",
    });
    expect(COSMETIC_PRODUCTS.find((product) => product.id === "supporter_monthly"))
      .toMatchObject({
        priceTtcCents: 100,
        access: "subscription",
        recurrence: { unit: "month", interval: 1, isoPeriod: "P1M" },
        grants: [
          "supporter_badge",
          "lobby_flight",
          "supporter_join_flair",
          "supporter_profile_frame",
        ],
      });
    expect(COSMETIC_PRODUCTS.find((product) => product.id === "supporter_permanent"))
      .toMatchObject({
        priceTtcCents: 499,
        access: "permanent",
        recurrence: null,
        grants: ["supporter_badge"],
      });
    expect(COSMETIC_PRODUCTS.filter((product) => product.kind === "individual_cosmetic"))
      .toHaveLength(4);
    expect(COSMETIC_PRODUCTS.find((product) => product.id === "first_collection_pack"))
      .toMatchObject({ priceTtcCents: 399, access: "permanent" });
  });

  it("never exchanges a voluntary contribution for an entitlement", () => {
    const support = COSMETIC_PRODUCTS.filter((product) => product.kind === "voluntary_support");
    expect(support.map((product) => product.priceTtcCents)).toEqual([249, 499, 999]);
    expect(support.every((product) => product.access === "none" && product.grants.length === 0))
      .toBe(true);
  });
});

describe("public cosmetic API", () => {
  beforeAll(() => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("setHeader", vi.fn());
  });

  afterAll(() => vi.unstubAllGlobals());

  it("fails closed to coming soon when commerce configuration is incomplete", async () => {
    const handler = (await import("../server/api/cosmetics/catalog.get")).default as (
      event: unknown,
    ) => { data: typeof COSMETIC_CATALOG_RESPONSE };
    expect(handler({})).toMatchObject({
      data: { purchaseEnabled: false, availability: "coming_soon", checkoutUrl: null },
    });
  });
});

describe("cosmetic schema and web rendering", () => {
  it("stores nullable expiry and enforces canonical slot pairs", async () => {
    const migration = await readFile(
      new URL("../drizzle/0015_cosmetic_entitlements.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain('"expires_at" timestamp');
    expect(migration).toContain('"expires_at" IS NULL OR "expires_at" > "granted_at"');
    expect(migration).toContain("('LOBBY_FLIGHT', 'lobby_flight')");
    expect(migration).toContain("('JOIN_FLAIR', 'supporter_join_flair')");
    expect(migration).toContain('PRIMARY KEY ("player_id", "cosmetic_id")');
    expect(migration).toContain('PRIMARY KEY ("player_id", "slot")');
    const commerceMigration = await readFile(
      new URL("../drizzle/0016_stripe_commerce.sql", import.meta.url),
      "utf8",
    );
    expect(commerceMigration).toContain('PRIMARY KEY ("player_id", "cosmetic_id", "source")');
    expect(commerceMigration).toContain('DROP CONSTRAINT IF EXISTS "cosmetic_selections_entitlement_fk"');
  });

  it("renders an accessible web-only catalog with reduced-motion support", async () => {
    const [page, preview] = await Promise.all([
      readFile(new URL("../pages/shop/index.vue", import.meta.url), "utf8"),
      readFile(new URL("../components/cosmetics/CosmeticPreview.vue", import.meta.url), "utf8"),
    ]);
    expect(page).toContain('useFetch("/api/cosmetics/catalog"');
    expect(page).toContain("1 € TTC / mois");
    expect(page).toContain('aria-disabled="true"');
    expect(page).toContain("Aucun avantage compétitif");
    expect(page).not.toContain("/api/mobile/v1");
    expect(preview).toContain('role="img"');
    expect(preview).toContain("prefers-reduced-motion: reduce");
  });

  it("shows the selected active frame on the public player profile without entitlement details", async () => {
    const [route, page] = await Promise.all([
      readFile(new URL("../server/api/player-stats.get.ts", import.meta.url), "utf8"),
      readFile(new URL("../pages/player-stats.vue", import.meta.url), "utf8"),
    ]);
    expect(route).toContain("frame_entitlement.revoked_at IS NULL");
    expect(route).toContain("frame_entitlement.expires_at > NOW()");
    expect(route).toContain('.as("supporterProfileFrame")');
    expect(page).toContain("Cadre Biscuit doré actif");
    expect(page).toContain("supporterProfileFrame");
    expect(route).not.toContain('frame_entitlement.source AS');
  });
});
