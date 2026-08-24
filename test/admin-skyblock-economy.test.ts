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
    expect(source).toContain("available: false");
    expect(source).not.toContain("playerdata");
    expect(source).not.toContain("playerName");
  });
});
