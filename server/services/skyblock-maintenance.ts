import { sql } from "drizzle-orm";
import type { MobileDbTransaction } from "./mobile-user";

const BATCH_SIZE = 250;

export interface SkyblockMaintenanceResult {
  expiredListings: number;
  purgedQuotes: number;
  purgedIdempotencyRequests: number;
  purgedRateLimits: number;
}

export interface SkyblockMaintenanceExecutor {
  expireListings(): Promise<number>;
  purgeQuotes(): Promise<number>;
  purgeIdempotencyRequests(): Promise<number>;
  purgeRateLimits(): Promise<number>;
}

interface ExpiredListingRow extends Record<string, unknown> {
  id: string;
  storageItemId: string;
  quantity: number;
}

export async function runSkyblockMaintenance(
  executor: SkyblockMaintenanceExecutor = postgresSkyblockMaintenance,
): Promise<SkyblockMaintenanceResult> {
  const [expiredListings, purgedQuotes, purgedIdempotencyRequests, purgedRateLimits] =
    await Promise.all([
      executor.expireListings(),
      executor.purgeQuotes(),
      executor.purgeIdempotencyRequests(),
      executor.purgeRateLimits(),
    ]);
  return { expiredListings, purgedQuotes, purgedIdempotencyRequests, purgedRateLimits };
}

async function expireListingsInTransaction(tx: MobileDbTransaction) {
  const listings = await tx.execute<ExpiredListingRow>(sql`
    SELECT id,
           storage_item_id AS "storageItemId",
           quantity
      FROM skyblock_market_listings
     WHERE status = 'active'
       AND expires_at <= now()
     ORDER BY expires_at, id
     LIMIT ${BATCH_SIZE}
     FOR UPDATE SKIP LOCKED
  `);
  if (!listings.length) return 0;

  const quantities = new Map<string, number>();
  for (const listing of listings) {
    const quantity = Number(listing.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error("Invalid quantity on expired Skyblock listing");
    }
    quantities.set(listing.storageItemId, (quantities.get(listing.storageItemId) ?? 0) + quantity);
  }

  for (const [storageItemId, quantity] of quantities) {
    const released = await tx.execute<{ id: string } & Record<string, unknown>>(sql`
      UPDATE skyblock_storage_items
         SET reserved_quantity = reserved_quantity - ${quantity},
             version = version + 1,
             updated_at = now()
       WHERE id = ${storageItemId}
         AND reserved_quantity >= ${quantity}
      RETURNING id
    `);
    if (released.length !== 1) {
      throw new Error("Expired listing reservation is inconsistent");
    }
  }

  const ids = listings.map((listing) => listing.id);
  const resolved = await tx.execute<{ id: string } & Record<string, unknown>>(sql`
    UPDATE skyblock_market_listings
       SET status = 'expired',
           resolved_at = now(),
           version = version + 1
     WHERE status = 'active'
       AND id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
    RETURNING id
  `);
  if (resolved.length !== listings.length) {
    throw new Error("Expired Skyblock listing batch changed while locked");
  }
  return resolved.length;
}

async function deleteBatch(table: ReturnType<typeof sql>, predicate: ReturnType<typeof sql>) {
  const { default: db } = await import("../../db/client");
  const rows = await db.execute<{ count: number } & Record<string, unknown>>(sql`
    WITH doomed AS (
      SELECT ctid
        FROM ${table}
       WHERE ${predicate}
       LIMIT ${BATCH_SIZE}
    ), deleted AS (
      DELETE FROM ${table}
       WHERE ctid IN (SELECT ctid FROM doomed)
      RETURNING 1
    )
    SELECT count(*)::int AS count FROM deleted
  `);
  return Number(rows[0]?.count ?? 0);
}

export const postgresSkyblockMaintenance: SkyblockMaintenanceExecutor = {
  expireListings: async () => {
    const { default: db } = await import("../../db/client");
    return db.transaction(expireListingsInTransaction);
  },
  purgeQuotes: () => deleteBatch(
    sql`skyblock_market_quotes`,
    sql`(consumed_at IS NOT NULL OR expires_at < now()) AND expires_at < now() - interval '7 days'`,
  ),
  purgeIdempotencyRequests: () => deleteBatch(
    sql`skyblock_mobile_requests`,
    sql`created_at < now() - interval '30 days'`,
  ),
  purgeRateLimits: () => deleteBatch(
    sql`mobile_rate_limits`,
    sql`resets_at < now() - interval '1 day'`,
  ),
};
