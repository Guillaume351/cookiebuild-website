import { sql } from "drizzle-orm";
import db from "../../../db/client";
import { requireAdminAuth } from "../../utils/admin-auth";
import { databaseErrorCode } from "../../utils/database-error";

interface SummaryRow extends Record<string, unknown> {
  islands: number | string;
  active24h: number | string;
  active7d: number | string;
  players: number | string;
  totalBalance: number | string;
  medianBalance: number | string;
  largestBalance: number | string;
  minted24h: number | string;
  burned24h: number | string;
  activeListings: number | string;
  overdueListings: number | string;
  sales24h: number | string;
  volume24h: number | string;
  npcSoldToday: number | string;
  npcBoughtToday: number | string;
  storageInvariantViolations: number | string;
}

const numberValue = (value: unknown) => Number(value || 0);

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "dashboard:read");
  setHeader(event, "Cache-Control", "no-store");
  try {
    const [summaryRows, sources, items] = await Promise.all([
      db.execute<SummaryRow>(sql`
        SELECT
          (SELECT count(*) FROM skyblock_islands WHERE state = 'active') AS islands,
          (SELECT count(*) FROM skyblock_islands WHERE state = 'active'
             AND last_active_at >= now() - interval '24 hours') AS "active24h",
          (SELECT count(*) FROM skyblock_islands WHERE state = 'active'
             AND last_active_at >= now() - interval '7 days') AS "active7d",
          (SELECT count(*) FROM skyblock_island_members) AS players,
          (SELECT coalesce(sum(balance), 0) FROM skyblock_island_accounts) AS "totalBalance",
          (SELECT coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY balance), 0)
             FROM skyblock_island_accounts) AS "medianBalance",
          (SELECT coalesce(max(balance), 0) FROM skyblock_island_accounts) AS "largestBalance",
          (SELECT coalesce(sum(amount), 0) FROM skyblock_coin_transactions
             WHERE amount > 0 AND source <> 'market:sell'
               AND created_at >= now() - interval '24 hours') AS "minted24h",
          ((SELECT coalesce(-sum(amount), 0) FROM skyblock_coin_transactions
              WHERE amount < 0 AND source <> 'market:buy'
                AND created_at >= now() - interval '24 hours')
            + (SELECT coalesce(sum(fee_coins), 0) FROM skyblock_market_sales
                WHERE created_at >= now() - interval '24 hours')) AS "burned24h",
          (SELECT count(*) FROM skyblock_market_listings WHERE status = 'active') AS "activeListings",
          (SELECT count(*) FROM skyblock_market_listings
             WHERE status = 'active' AND expires_at <= now()) AS "overdueListings",
          (SELECT count(*) FROM skyblock_market_sales
             WHERE created_at >= now() - interval '24 hours') AS "sales24h",
          (SELECT coalesce(sum(price_coins), 0) FROM skyblock_market_sales
             WHERE created_at >= now() - interval '24 hours') AS "volume24h",
          (SELECT coalesce(sum(sold_quantity), 0) FROM skyblock_npc_trade_daily
             WHERE trade_date = current_date) AS "npcSoldToday",
          (SELECT coalesce(sum(bought_quantity), 0) FROM skyblock_npc_trade_daily
             WHERE trade_date = current_date) AS "npcBoughtToday",
          (SELECT count(*) FROM skyblock_storage_items
             WHERE quantity < 0 OR reserved_quantity < 0 OR reserved_quantity > quantity)
             AS "storageInvariantViolations"
      `),
      db.execute(sql`
        WITH flows AS (
          SELECT source,
                 CASE WHEN source NOT IN ('market:buy', 'market:sell') THEN amount END AS amount
            FROM skyblock_coin_transactions
           WHERE created_at >= now() - interval '7 days'
          UNION ALL
          SELECT 'market:fee' AS source, -fee_coins::bigint AS amount
            FROM skyblock_market_sales
           WHERE created_at >= now() - interval '7 days' AND fee_coins > 0
        )
        SELECT source,
               coalesce(sum(amount) FILTER (WHERE amount > 0), 0) AS minted,
               coalesce(-sum(amount) FILTER (WHERE amount < 0), 0) AS burned,
               count(amount) AS transactions
          FROM flows
         WHERE amount IS NOT NULL
         GROUP BY source
         ORDER BY greatest(
           coalesce(sum(amount) FILTER (WHERE amount > 0), 0),
           coalesce(-sum(amount) FILTER (WHERE amount < 0), 0)
         ) DESC, source
         LIMIT 30
      `),
      db.execute(sql`
        SELECT item_id AS "itemId",
               count(*) AS sales,
               sum(quantity) AS quantity,
               sum(price_coins) AS volume,
               round(sum(price_coins)::numeric / nullif(sum(quantity), 0), 2) AS "weightedUnitPrice",
               round((percentile_cont(0.5) WITHIN GROUP
                 (ORDER BY price_coins::numeric / nullif(quantity, 0)))::numeric, 2) AS "medianUnitPrice"
          FROM skyblock_market_sales
         WHERE created_at >= now() - interval '7 days'
         GROUP BY item_id
         ORDER BY volume DESC, item_id
         LIMIT 30
      `),
    ]);
    const row = summaryRows[0]!;
    return { data: {
      available: true,
      generatedAt: new Date().toISOString(),
      summary: Object.fromEntries(Object.entries(row).map(([key, value]) => [key, numberValue(value)])),
      sources: [...sources].map((source) => ({
        ...source,
        minted: numberValue(source.minted),
        burned: numberValue(source.burned),
        transactions: numberValue(source.transactions),
      })),
      items: [...items].map((item) => ({
        ...item,
        sales: numberValue(item.sales),
        quantity: numberValue(item.quantity),
        volume: numberValue(item.volume),
        weightedUnitPrice: numberValue(item.weightedUnitPrice),
        medianUnitPrice: numberValue(item.medianUnitPrice),
      })),
    } };
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code === "42P01") {
      return { data: {
        available: false,
        unavailableReason: "schema_missing" as const,
        generatedAt: new Date().toISOString(),
        summary: null,
        sources: [],
        items: [],
      } };
    }
    console.error("admin_skyblock_economy_query_failed", { code });
    throw createError({
      statusCode: 503,
      statusMessage: "Les métriques économiques Skyblock sont temporairement indisponibles.",
    });
  }
});
