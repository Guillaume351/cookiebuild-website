import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.MOBILE_PLATFORM_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("mobile platform PostgreSQL primitives", () => {
  let setupSql: Sql;
  let databaseModule: typeof import("../db/client");
  let rateLimitStore: typeof import("../server/services/mobile-rate-limit-store");
  let maintenance: typeof import("../server/services/skyblock-maintenance");

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = databaseUrl!;
    setupSql = postgres(databaseUrl!, { prepare: false, max: 4 });
    await setupSql.unsafe(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      CREATE TABLE skyblock_storage_items (
        id text PRIMARY KEY,
        reserved_quantity integer NOT NULL,
        version integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE skyblock_market_listings (
        id text PRIMARY KEY,
        storage_item_id text NOT NULL REFERENCES skyblock_storage_items(id),
        quantity integer NOT NULL,
        status text NOT NULL,
        version integer NOT NULL DEFAULT 0,
        expires_at timestamptz NOT NULL,
        resolved_at timestamptz
      );
      CREATE TABLE skyblock_market_quotes (
        id text PRIMARY KEY,
        expires_at timestamptz NOT NULL,
        consumed_at timestamptz
      );
      CREATE TABLE skyblock_mobile_requests (
        id text PRIMARY KEY,
        created_at timestamptz NOT NULL
      );
    `);
    const migration = await readFile(
      new URL("../drizzle/0013_mobile_platform_consolidation.sql", import.meta.url),
      "utf8",
    );
    await setupSql.unsafe(migration);
    databaseModule = await import("../db/client");
    rateLimitStore = await import("../server/services/mobile-rate-limit-store");
    maintenance = await import("../server/services/skyblock-maintenance");
  }, 30_000);

  afterAll(async () => {
    await databaseModule?.postgresClient.end({ timeout: 2 });
    await setupSql?.end({ timeout: 2 });
  });

  it("enforces one atomic limit across concurrent consumers", async () => {
    const now = new Date("2026-08-23T12:00:00Z");
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        rateLimitStore.postgresMobileRateLimitStore.consume({
          keyHash: "a".repeat(64),
          limit: 5,
          windowMs: 60_000,
          now,
        }),
      ),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    const [row] = await setupSql<{ count: number }[]>`
      SELECT request_count::int AS count
        FROM mobile_rate_limits
       WHERE key_hash = ${"a".repeat(64)}
    `;
    expect(row).toEqual({ count: 6 });
  });

  it("expires reservations and purges each retention table idempotently", async () => {
    await setupSql.unsafe(`
      INSERT INTO skyblock_storage_items (id, reserved_quantity) VALUES ('storage-old', 4);
      INSERT INTO skyblock_market_listings
        (id, storage_item_id, quantity, status, expires_at)
      VALUES ('listing-old', 'storage-old', 4, 'active', now() - interval '1 hour');
      INSERT INTO skyblock_market_quotes (id, expires_at, consumed_at) VALUES
        ('quote-old', now() - interval '8 days', now() - interval '8 days'),
        ('quote-current', now() + interval '1 day', NULL);
      INSERT INTO skyblock_mobile_requests (id, created_at) VALUES
        ('request-old', now() - interval '31 days'),
        ('request-current', now());
      INSERT INTO mobile_rate_limits (key_hash, request_count, resets_at) VALUES
        ('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 1,
         now() - interval '2 days');
    `);

    await expect(maintenance.runSkyblockMaintenance()).resolves.toEqual({
      expiredListings: 1,
      purgedQuotes: 1,
      purgedIdempotencyRequests: 1,
      purgedRateLimits: 1,
    });
    await expect(maintenance.runSkyblockMaintenance()).resolves.toEqual({
      expiredListings: 0,
      purgedQuotes: 0,
      purgedIdempotencyRequests: 0,
      purgedRateLimits: 0,
    });

    const [state] = await setupSql<{
      listingStatus: string;
      reserved: number;
      quotes: number;
      requests: number;
    }[]>`
      SELECT
        (SELECT status FROM skyblock_market_listings WHERE id = 'listing-old') AS "listingStatus",
        (SELECT reserved_quantity::int FROM skyblock_storage_items WHERE id = 'storage-old') AS reserved,
        (SELECT count(*)::int FROM skyblock_market_quotes) AS quotes,
        (SELECT count(*)::int FROM skyblock_mobile_requests) AS requests
    `;
    expect(state).toEqual({
      listingStatus: "expired",
      reserved: 0,
      quotes: 1,
      requests: 1,
    });
  });
});
