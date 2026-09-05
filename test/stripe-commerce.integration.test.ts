import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.COMMERCE_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const testSchema = "commerce_test_" + randomUUID().replaceAll("-", "");
const scopedUrl = databaseUrl ? new URL(databaseUrl) : null;
scopedUrl?.searchParams.set("search_path", testSchema);
const PLAYER = "76000000-0000-4000-8000-000000000001";

integration("Stripe commerce database invariants", () => {
  let client: Sql;
  beforeAll(async () => {
    const bootstrap = postgres(databaseUrl!, { max: 1 });
    await bootstrap.unsafe(`CREATE SCHEMA "${testSchema}"`);
    await bootstrap.end();
    client = postgres(scopedUrl!.toString(), { prepare: false, max: 4 });
    await client.unsafe(`
      CREATE TABLE playerdata (id uuid PRIMARY KEY, name varchar(255));
      CREATE TABLE player_link_challenges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), player_id uuid NOT NULL REFERENCES playerdata(id),
        edition varchar(16) NOT NULL, code_hmac varchar(64) NOT NULL, expires_at timestamptz NOT NULL,
        consumed_at timestamptz, created_at timestamptz DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX player_link_challenges_code_hmac_uq ON player_link_challenges(code_hmac);
      CREATE UNIQUE INDEX player_link_challenges_active_player_uq ON player_link_challenges(player_id) WHERE consumed_at IS NULL;
      INSERT INTO playerdata(id, name) VALUES ('${PLAYER}', 'CommerceTest');
    `);
    for (const file of ["0015_cosmetic_entitlements.sql", "0016_stripe_commerce.sql"]) {
      const migration = await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
      await client.unsafe(migration.replaceAll("--> statement-breakpoint", ""));
    }
  }, 30_000);
  afterAll(async () => {
    await client?.end({ timeout: 2 });
    const cleanup = postgres(databaseUrl!, { max: 1 });
    await cleanup.unsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
    await cleanup.end();
  });

  it("can replay both migrations without changing grants or constraints", async () => {
    for (const file of ["0015_cosmetic_entitlements.sql", "0016_stripe_commerce.sql"]) {
      await client.unsafe((await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8")).replaceAll("--> statement-breakpoint", ""));
    }
    const constraints = await client`SELECT conname FROM pg_constraint WHERE conrelid='commerce_orders'::regclass AND conname='commerce_orders_withdrawal_payment_fk'`;
    expect(constraints).toHaveLength(1);
  });

  it("keeps mobile and commerce challenges active independently", async () => {
    await client`INSERT INTO player_link_challenges(player_id, edition, purpose, code_hmac, expires_at) VALUES (${PLAYER}, 'java', 'mobile_link', ${"a".repeat(64)}, now() + interval '10 min')`;
    await expect(client`INSERT INTO player_link_challenges(player_id, edition, purpose, code_hmac, expires_at) VALUES (${PLAYER}, 'java', 'commerce_session', ${"b".repeat(64)}, now() + interval '10 min')`).resolves.toHaveLength(0);
    await expect(client`INSERT INTO player_link_challenges(player_id, edition, purpose, code_hmac, expires_at) VALUES (${PLAYER}, 'java', 'commerce_session', ${"c".repeat(64)}, now() + interval '10 min')`).rejects.toMatchObject({ code: "23505" });
  });

  it("allows permanent and subscription grants to coexist and blocks concurrent duplicate active orders", async () => {
    await client`INSERT INTO cosmetic_entitlements(player_id, cosmetic_id, source) VALUES (${PLAYER}, 'supporter_badge', 'manual:permanent'), (${PLAYER}, 'supporter_badge', 'stripe:invoice:test')`;
    const grants = await client`SELECT source FROM cosmetic_entitlements WHERE player_id = ${PLAYER} ORDER BY source`;
    expect(grants.map((row) => row.source)).toEqual(["manual:permanent", "stripe:invoice:test"]);

    const orderValues = [PLAYER, "supporter_monthly", 1, "Supporter mensuel", "subscription", client.json(["supporter_badge"]), 100, "EUR", "test", "stripe:order:76000000-0000-4000-8000-000000000010", "v1", "notice"];
    const insert = () => client.unsafe(`INSERT INTO commerce_orders(player_id,product_id,product_version,product_name,access,grants_snapshot,amount_ttc_cents,currency,stripe_mode,entitlement_source,consumer_notice_version,consumer_notice_text,terms_accepted_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,now())`, orderValues);
    const settled = await Promise.allSettled([insert(), insert()]);
    expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(settled.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("enforces immutable product versions and grant snapshots at the database boundary", async () => {
    const base = [PLAYER, "snapshot_test", "Snapshot test", 199, "EUR", "test", "stripe:order:76000000-0000-4000-8000-000000000020", "v1", "notice"] as const;
    const insert = (version: number, access: string, grants: string[]) => client.unsafe(`
      INSERT INTO commerce_orders(
        player_id, product_id, product_version, product_name, access, grants_snapshot,
        amount_ttc_cents, currency, stripe_mode, entitlement_source,
        consumer_notice_version, consumer_notice_text, terms_accepted_at
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,now())
    `, [base[0], base[1], version, base[2], access, client.json(grants), base[3], base[4], base[5], base[6], base[7], base[8]]);

    await expect(insert(0, "permanent", ["supporter_badge"])).rejects.toMatchObject({ code: "23514" });
    await expect(insert(1, "permanent", [])).rejects.toMatchObject({ code: "23514" });
    await expect(insert(1, "none", ["supporter_badge"])).rejects.toMatchObject({ code: "23514" });
  });
});
