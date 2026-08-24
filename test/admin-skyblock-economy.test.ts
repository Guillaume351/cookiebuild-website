import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Skyblock economy admin dashboard", () => {
  it("tracks monetary flows, liquidity and storage invariants without exposing player identities", async () => {
    const source = await readFile(
      new URL("../server/api/admin/skyblock-economy.get.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("skyblock_coin_transactions");
    expect(source).toContain("skyblock_npc_trade_daily");
    expect(source).toContain("skyblock_market_sales");
    expect(source).toContain("source <> 'market:sell'");
    expect(source).toContain("source <> 'market:buy'");
    expect(source).toContain("'market:fee'");
    expect(source).toContain("reserved_quantity > quantity");
    expect(source).toContain("(ORDER BY price_coins::numeric / nullif(quantity, 0)))::numeric, 2");
    expect(source).toContain("available: false");
    expect(source).not.toContain("playerdata");
    expect(source).not.toContain("playerName");
  });

  it("only reports a missing migration for schema errors and surfaces other query failures", async () => {
    const [route, page] = await Promise.all([
      readFile(new URL("../server/api/admin/skyblock-economy.get.ts", import.meta.url), "utf8"),
      readFile(new URL("../pages/admin/skyblock-economy.vue", import.meta.url), "utf8"),
    ]);

    expect(route).toContain('code === "42P01"');
    expect(route).not.toContain('code === "42703"');
    expect(route).toContain('unavailableReason: "schema_missing"');
    expect(route).toContain("admin_skyblock_economy_query_failed");
    expect(route).toContain("statusCode: 503");
    expect(route).toContain("throw createError");
    expect(route).not.toContain("} catch {");
    expect(page).toContain("Le schéma économique Skyblock V2 n’est pas présent dans cette base.");
    expect(page).not.toContain("Les métriques Skyblock V2 seront disponibles après application");
  });
});
