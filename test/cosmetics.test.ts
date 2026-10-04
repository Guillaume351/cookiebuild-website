import { readFile } from "node:fs/promises";
import { getTableConfig } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { cosmeticEntitlements, cosmeticSelections, cosmeticWelcomeGifts } from "../db/schema";
import {
  COSMETIC_CATALOG,
  COSMETIC_CATALOG_RESPONSE,
  COSMETIC_PRODUCTS,
  COIN_COSMETICS,
  OWNABLE_COSMETICS,
  REWARD_COSMETICS,
  cosmeticById,
  isFreeCosmetic,
  isRewardOnlyCosmetic,
} from "../shared/cosmetics-catalog";

/** Cosmetics introduced by migration 0026 (release polish-20261004). */
const ADDED_BY_0026 = new Set([
  "chocolate_chip_trail",
  "cherry_petal_trail",
  "soul_flame_trail",
  "rainbow_trail",
  "lucky_clover_trail",
  "cookie_rain_victory",
  "totem_victory",
  "firework_victory",
]);
const grantedByAnyProduct = (id: string) =>
  COSMETIC_PRODUCTS.some((product) => (product.grants as readonly string[]).includes(id));

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
        productVersion: 2,
        priceTtcCents: 499,
        access: "permanent",
        recurrence: null,
        grants: [
          "supporter_badge",
          "lobby_flight",
          "supporter_join_flair",
          "supporter_profile_frame",
        ],
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
    expect(page).toContain("euros(subscriptionProduct.priceTtcCents)");
    expect(page).toContain("shop.monthlyTax");
    expect(page).toContain('aria-disabled="true"');
    expect(page).toContain("shop.fairTitle");
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

describe("reward-only and coin-only cosmetics", () => {
  it("is ownable and selectable as a badge but never sold or listed by the shop", () => {
    expect(REWARD_COSMETICS.map(({ id, slot }) => ({ id, slot }))).toEqual([
      { id: "app_companion_badge", slot: "BADGE" },
      { id: "streak_star_trail", slot: "HUB_TRAIL" },
      { id: "lucky_clover_trail", slot: "HUB_TRAIL" },
    ]);
    expect(cosmeticById("app_companion_badge")?.slot).toBe("BADGE");
    expect(isRewardOnlyCosmetic("app_companion_badge")).toBe(true);
    expect(isFreeCosmetic("app_companion_badge")).toBe(false);
    expect(COSMETIC_CATALOG_RESPONSE.items.some((item) => item.id === "app_companion_badge" as string)).toBe(false);
    expect(COSMETIC_PRODUCTS.some((product) =>
      (product.grants as readonly string[]).includes("app_companion_badge"))).toBe(false);
  });

  it("widens every database constraint that lists cosmetic IDs", async () => {
    const migration = await readFile(
      new URL("../drizzle/0021_reward_and_coin_cosmetics.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain("('BADGE', 'app_companion_badge')");
    expect(migration).toContain("('HUB_TRAIL', 'note_trail')");
    expect(migration).toContain("('HUB_TRAIL', 'heart_trail')");
    expect(migration).toContain("('HUB_TRAIL', 'streak_star_trail')");
    expect(migration).toContain("cosmetic_first_activations");
    for (const item of [...COSMETIC_CATALOG, ...COIN_COSMETICS, ...REWARD_COSMETICS]) {
      if (item.id === "starter_spark_trail" || ADDED_BY_0026.has(item.id)) continue; // added by 0025/0026
      expect(migration.match(new RegExp(`'${item.id}'`, "g"))!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("widens every cosmetic constraint again for the 250-coin starter trail", async () => {
    const migration = await readFile(
      new URL("../drizzle/0025_starter_coin_cosmetic.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain("('HUB_TRAIL', 'starter_spark_trail')");
    expect(migration).toContain("DROP CONSTRAINT IF EXISTS \"cosmetic_entitlements_id_ck\"");
    expect(migration).toContain("DROP CONSTRAINT IF EXISTS \"cosmetic_selections_slot_cosmetic_ck\"");
    expect(migration).toContain("cosmetic_first_activations");
    for (const item of [...COSMETIC_CATALOG, ...COIN_COSMETICS, ...REWARD_COSMETICS]) {
      if (ADDED_BY_0026.has(item.id)) continue;
      expect(migration.match(new RegExp(`'${item.id}'`, "g"))!.length).toBeGreaterThanOrEqual(3);
    }
    const starter = cosmeticById("starter_spark_trail");
    expect(starter?.slot).toBe("HUB_TRAIL");
    expect(isRewardOnlyCosmetic("starter_spark_trail")).toBe(false);
    expect(isFreeCosmetic("starter_spark_trail")).toBe(false);
    expect(COSMETIC_PRODUCTS.some((product) =>
      (product.grants as readonly string[]).includes("starter_spark_trail"))).toBe(false);
  });

  it("keeps earned-coin trails and victory effects in game only with server-side prices", () => {
    expect(COIN_COSMETICS.map(({ id, slot, coinPrice }) => ({ id, slot, coinPrice }))).toEqual([
      { id: "chocolate_chip_trail", slot: "HUB_TRAIL", coinPrice: 150 },
      { id: "starter_spark_trail", slot: "HUB_TRAIL", coinPrice: 250 },
      { id: "cherry_petal_trail", slot: "HUB_TRAIL", coinPrice: 400 },
      { id: "cookie_rain_victory", slot: "VICTORY_EFFECT", coinPrice: 500 },
      { id: "soul_flame_trail", slot: "HUB_TRAIL", coinPrice: 600 },
      { id: "note_trail", slot: "HUB_TRAIL", coinPrice: 750 },
      { id: "totem_victory", slot: "VICTORY_EFFECT", coinPrice: 900 },
      { id: "heart_trail", slot: "HUB_TRAIL", coinPrice: 1_200 },
      { id: "firework_victory", slot: "VICTORY_EFFECT", coinPrice: 1_500 },
      { id: "rainbow_trail", slot: "HUB_TRAIL", coinPrice: 2_000 },
    ]);
    const prices = COIN_COSMETICS.map((item) => item.coinPrice);
    expect(prices.every((price) => Number.isInteger(price) && price > 0)).toBe(true);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(new Set(prices).size).toBe(prices.length);
    for (const item of COIN_COSMETICS) {
      expect(item.acquisition).toBe("coins");
      expect(cosmeticById(item.id)?.slot).toBe(item.slot);
      expect(isFreeCosmetic(item.id)).toBe(false);
      expect(isRewardOnlyCosmetic(item.id)).toBe(false);
      expect(grantedByAnyProduct(item.id)).toBe(false);
      expect(COSMETIC_CATALOG_RESPONSE.items.some((entry) => entry.id === item.id as string)).toBe(false);
      expect(item.preview.kind).toBe(item.slot === "VICTORY_EFFECT" ? "burst" : "trail");
      expect(item.platformSupport.java.implementation).toContain(
        item.slot === "VICTORY_EFFECT" ? "victoire confirmée, sans entité ni dégâts" : "lobby uniquement",
      );
      expect(item.platformSupport.bedrock.implementation).toContain("Geyser");
    }
    expect(COSMETIC_CATALOG_RESPONSE.coinItems).toBe(COIN_COSMETICS);
  });

  it("makes the 150-coin chocolate trail the first purchase and renames the 250-coin trail", () => {
    expect(COIN_COSMETICS[0]).toMatchObject({ id: "chocolate_chip_trail", coinPrice: 150 });
    expect(Math.min(...COIN_COSMETICS.map((item) => item.coinPrice))).toBe(150);
    const starter = COIN_COSMETICS.find((item) => item.id === "starter_spark_trail")!;
    expect(starter).toMatchObject({ coinPrice: 250, name: "Éclats critiques", nameEn: "Critical Sparks" });
    expect(starter.description).not.toContain("premier objet");
    // The paid name must not be confused with the free "Étincelles de cookie".
    const free: { name: string; nameEn: string } = COSMETIC_CATALOG.find((item) => item.id === "cookie_sparkle_trail")!;
    const coinNames: ReadonlyArray<{ name: string; nameEn: string }> = COIN_COSMETICS;
    expect(coinNames.some((item) => item.name === free.name || item.nameEn === free.nameEn)).toBe(false);
  });

  it("unlocks the lucky clover trail only through the ten-match achievement", () => {
    const clover = REWARD_COSMETICS.find((item) => item.id === "lucky_clover_trail")!;
    expect(clover).toMatchObject({ slot: "HUB_TRAIL", acquisition: "reward", rewardOnly: true, nameEn: "Lucky Trail" });
    expect(clover.description).toContain("10 parties");
    expect(clover.platformSupport.java.implementation).toContain("HAPPY_VILLAGER");
    expect(isRewardOnlyCosmetic("lucky_clover_trail")).toBe(true);
    expect(isFreeCosmetic("lucky_clover_trail")).toBe(false);
    expect(grantedByAnyProduct("lucky_clover_trail")).toBe(false);
    expect(COIN_COSMETICS.some((item) => item.id === "lucky_clover_trail" as string)).toBe(false);
    expect(COSMETIC_CATALOG_RESPONSE.items.some((item) => item.id === "lucky_clover_trail" as string)).toBe(false);
  });

  it("keeps every ownable cosmetic ID unique across shop, coin and reward lists", () => {
    const ids = OWNABLE_COSMETICS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ADDED_BY_0026) expect(ids).toContain(id);
  });

  it("gives the permanent Supporter purchase at least the monthly plan's cosmetics", () => {
    const monthly = COSMETIC_PRODUCTS.find((product) => product.id === "supporter_monthly")!;
    const permanent = COSMETIC_PRODUCTS.find((product) => product.id === "supporter_permanent")!;
    for (const grant of monthly.grants) expect(permanent.grants).toContain(grant);
    expect(permanent.productVersion).toBeGreaterThan(1);
  });
});

describe("shop activation migration 0026", () => {
  const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

  it("widens every constraint that lists cosmetic IDs for the eight new cosmetics", async () => {
    const migration = await read("../drizzle/0026_shop_activation_cosmetics.sql");
    expect(migration).toContain('DROP CONSTRAINT IF EXISTS "cosmetic_entitlements_id_ck"');
    expect(migration).toContain('DROP CONSTRAINT IF EXISTS "cosmetic_selections_slot_cosmetic_ck"');
    expect(migration).toContain("cosmetic_first_activations_cosmetic_id_check");
    for (const item of OWNABLE_COSMETICS) {
      expect(migration.match(new RegExp(`'${item.id}'`, "g"))!.length).toBeGreaterThanOrEqual(3);
      expect(migration).toContain(`('${item.slot}', '${item.id}')`);
    }
    expect(migration).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
    expect(migration).not.toMatch(/CREATE INDEX (?!IF NOT EXISTS)/);
  });

  it("creates the once-per-account welcome gift marker for the free trail only", async () => {
    const migration = await read("../drizzle/0026_shop_activation_cosmetics.sql");
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "cosmetic_welcome_gifts"');
    expect(migration).toContain('"player_id" uuid PRIMARY KEY NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE');
    expect(migration).toContain(`CHECK ("cosmetic_id" IN ('cookie_sparkle_trail'))`);
    expect(migration).toContain(`CHECK ("edition" IN ('java', 'bedrock', 'unknown'))`);
    expect(migration).toContain("REVOKE ALL ON public.cosmetic_welcome_gifts FROM PUBLIC");
    expect(migration).toContain("REVOKE ALL ON public.cosmetic_welcome_gifts FROM cookiebuild_metrics");
    expect(isFreeCosmetic("cookie_sparkle_trail")).toBe(true);
  });

  it("records gift, purchase and grant provenance from a transaction-local setting", async () => {
    const migration = await read("../drizzle/0026_shop_activation_cosmetics.sql");
    expect(migration).toContain("current_setting('cookiebuild.cosmetic_source', true)");
    expect(migration).toContain("IF provenance NOT IN ('selection', 'gift', 'purchase', 'grant')");
    expect(migration).toContain("provenance := 'selection'");
    expect(migration).toMatch(/observed_source IN \(\s*'baseline', 'selection', 'gift', 'purchase', 'grant'\)/);
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toContain("ON CONFLICT (player_id, cosmetic_id) DO NOTHING");
  });

  it("exposes only security-barriered aggregate views to the metrics role", async () => {
    const migration = await read("../drizzle/0026_shop_activation_cosmetics.sql");
    expect(migration.match(/CREATE OR REPLACE VIEW metrics\.shop_/g)).toHaveLength(2);
    expect(migration.match(/WITH \(security_barrier = true\)/g)).toHaveLength(2);
    expect(migration).toContain("metrics.shop_welcome_gifts_daily");
    expect(migration).toContain("metrics.shop_coin_purchases_daily");
    expect(migration).toContain("to_regclass('public.coin_transactions') IS NOT NULL");
    expect(migration).not.toMatch(/GRANT\s+SELECT\s+ON\s+public\./i);
    expect(migration).not.toMatch(/player_id\s*(,|AS)[^;]*FROM public\.cosmetic_welcome_gifts/);
  });

  it("is registered in the drizzle journal right after 0025", async () => {
    const journal = JSON.parse(await read("../drizzle/meta/_journal.json")) as {
      entries: Array<{ idx: number; tag: string; when: number; breakpoints: boolean }>;
    };
    const start = journal.entries.findIndex((entry) => entry.tag === "0025_starter_coin_cosmetic");
    const [previous, current] = journal.entries.slice(start, start + 2);
    expect(previous).toMatchObject({ idx: 25, tag: "0025_starter_coin_cosmetic" });
    expect(current).toMatchObject({ idx: 26, version: "7", tag: "0026_shop_activation_cosmetics", breakpoints: true });
    expect(current!.when).toBeGreaterThan(previous!.when);
  });

  it("declares the same constraints and welcome gift table in the drizzle schema", () => {
    const entitlementCheck = getTableConfig(cosmeticEntitlements).checks
      .find((check) => check.name === "cosmetic_entitlements_id_ck")!;
    const selectionCheck = getTableConfig(cosmeticSelections).checks
      .find((check) => check.name === "cosmetic_selections_slot_cosmetic_ck")!;
    const sqlText = (check: { value: { queryChunks: unknown[] } }) =>
      check.value.queryChunks.map((chunk) => (chunk as { value?: string[] }).value?.join("") ?? "").join("");
    for (const item of OWNABLE_COSMETICS) {
      expect(sqlText(entitlementCheck)).toContain(`'${item.id}'`);
      expect(sqlText(selectionCheck)).toContain(`('${item.slot}', '${item.id}')`);
    }
    const gifts = getTableConfig(cosmeticWelcomeGifts);
    expect(gifts.name).toBe("cosmetic_welcome_gifts");
    expect(gifts.columns.map((column) => column.name)).toEqual(["player_id", "cosmetic_id", "equipped", "edition", "granted_at"]);
    expect(gifts.columns.find((column) => column.name === "player_id")?.primary).toBe(true);
    expect(gifts.foreignKeys).toHaveLength(1);
    expect(gifts.checks.map((check) => check.name).sort()).toEqual([
      "cosmetic_welcome_gifts_cosmetic_ck",
      "cosmetic_welcome_gifts_edition_ck",
    ]);
    expect(gifts.indexes.map((index) => index.config.name)).toEqual(["cosmetic_welcome_gifts_time_idx"]);
  });
});
