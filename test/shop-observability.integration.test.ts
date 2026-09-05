import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.COMMERCE_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const suffix = randomUUID().replaceAll("-", "");
const schema = `shop_test_${suffix}`;
const metrics = `shop_metrics_${suffix}`;
const role = `shop_reader_${suffix}`;
const java = "65000000-0000-4000-8000-000000000001";
const bedrock = "00000000-0000-0000-0009-000000000001";
const unknown = "65000000-0000-1000-8000-000000000003";
const free = "cookie_sparkle_trail";
const migration = readFileSync(new URL("../drizzle/0019_shop_activation_metrics.sql", import.meta.url), "utf8")
  .replaceAll("public.", `${schema}.`)
  .replace(/\bmetrics\b/g, metrics)
  .replaceAll("cookiebuild_metrics", role);

integration("durable shop activation aggregates", () => {
  let sql: Sql;
  const apply = () => sql.begin((tx) => tx.unsafe(migration));

  beforeAll(async () => {
    sql = postgres(databaseUrl!, { max: 4, prepare: false, onnotice: () => {} });
    await sql.unsafe(`CREATE SCHEMA ${schema}; CREATE ROLE ${role} NOLOGIN`);
    await sql.unsafe(`
      CREATE TABLE ${schema}.playerdata (id uuid PRIMARY KEY);
      CREATE TABLE ${schema}.cosmetic_selections (
        player_id uuid REFERENCES ${schema}.playerdata ON DELETE CASCADE,
        slot text NOT NULL, cosmetic_id text NOT NULL,
        selected_at timestamp NOT NULL DEFAULT now(), PRIMARY KEY(player_id, slot));
      CREATE TABLE ${schema}.cosmetic_entitlements (
        player_id uuid REFERENCES ${schema}.playerdata ON DELETE CASCADE,
        cosmetic_id text NOT NULL, source text NOT NULL, revoked_at timestamp, expires_at timestamp,
        PRIMARY KEY(player_id, cosmetic_id, source));
      CREATE TABLE ${schema}.player_link_challenges (
        player_id uuid REFERENCES ${schema}.playerdata ON DELETE CASCADE,
        edition text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE ${schema}.mobile_player_links (
        player_id uuid REFERENCES ${schema}.playerdata ON DELETE CASCADE,
        edition text NOT NULL, linked_at timestamptz DEFAULT now(), revoked_at timestamptz);
      CREATE TABLE ${schema}.commerce_sessions (
        player_id uuid REFERENCES ${schema}.playerdata ON DELETE CASCADE,
        revoked_at timestamptz, expires_at timestamptz NOT NULL);
      CREATE TABLE ${schema}.commerce_orders (
        id uuid PRIMARY KEY, created_at timestamptz NOT NULL, purchased_at timestamptz,
        stripe_mode text NOT NULL, stripe_checkout_session_id text);
      CREATE TABLE ${schema}.commerce_payments (
        id uuid PRIMARY KEY, order_id uuid REFERENCES ${schema}.commerce_orders,
        paid_at timestamptz, currency text, amount_cents integer,
        refunded_amount_cents integer, status text);
      CREATE TABLE ${schema}.commerce_subscriptions (
        order_id uuid REFERENCES ${schema}.commerce_orders, status text,
        cancel_at_period_end boolean, ended_at timestamptz, current_period_end timestamptz);
    `);
    await sql.unsafe(`INSERT INTO ${schema}.playerdata VALUES ($1),($2),($3)`, [java, bedrock, unknown]);
    await sql.unsafe(`INSERT INTO ${schema}.cosmetic_selections VALUES ($1,'HUB_TRAIL',$2,'2020-01-01')`, [java, free]);
    await apply();
  }, 30_000);

  afterAll(async () => {
    if (!sql) return;
    await sql.unsafe(`DROP SCHEMA IF EXISTS ${metrics} CASCADE; DROP SCHEMA IF EXISTS ${schema} CASCADE; DROP ROLE IF EXISTS ${role}`);
    await sql.end();
  });

  it("records baseline at observation time and replay preserves its identity", async () => {
    const [before] = await sql.unsafe(`SELECT * FROM ${schema}.cosmetic_first_activations`);
    if (!before) throw new Error("Missing baseline activation");
    expect(before.observed_source).toBe("baseline");
    expect(before.edition).toBe("java");
    expect(new Date(before.first_selected_at).getTime()).toBeGreaterThan(Date.now() - 60_000);
    await apply();
    const rows = await sql.unsafe(`SELECT * FROM ${schema}.cosmetic_first_activations`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(before);
  });

  it("deduplicates retries, timestamps, deselect/reselect, and counts different accounts", async () => {
    await sql.unsafe(`UPDATE ${schema}.cosmetic_selections SET selected_at=now() WHERE player_id=$1`, [java]);
    await sql.unsafe(`DELETE FROM ${schema}.cosmetic_selections WHERE player_id=$1`, [java]);
    await sql.unsafe(`INSERT INTO ${schema}.cosmetic_selections (player_id,slot,cosmetic_id) VALUES ($1,'HUB_TRAIL',$2),($3,'HUB_TRAIL',$2)`, [java, free, bedrock]);
    await sql.unsafe(`UPDATE ${schema}.cosmetic_selections SET cosmetic_id=$1 WHERE player_id=$2`, [free, bedrock]);
    const rows = await sql.unsafe(`SELECT edition,observed_source FROM ${schema}.cosmetic_first_activations ORDER BY edition`);
    expect(rows).toEqual([{ edition: "bedrock", observed_source: "selection" }, { edition: "java", observed_source: "baseline" }]);
    const summary = await sql.unsafe(`SELECT sum(activated_accounts)::integer AS accounts FROM ${metrics}.shop_activation_summary WHERE cosmetic_id=$1`, [free]);
    expect(summary[0]!.accounts).toBe(2);
  });

  it("captures cosmetic replacement, preserves history after deselection and filters expired paid access", async () => {
    await sql.unsafe(`UPDATE ${schema}.cosmetic_selections SET cosmetic_id='cookie_crumb_trail' WHERE player_id=$1`, [java]);
    const counts = await sql.unsafe(`SELECT cosmetic_id FROM ${schema}.cosmetic_first_activations WHERE player_id=$1 ORDER BY cosmetic_id`, [java]);
    expect(counts.map((row) => row.cosmetic_id)).toEqual(["cookie_crumb_trail", free]);
    expect(await sql.unsafe(`SELECT * FROM ${metrics}.shop_equipped_current WHERE cosmetic_id='cookie_crumb_trail'`)).toHaveLength(0);
    await sql.unsafe(`INSERT INTO ${schema}.cosmetic_entitlements VALUES ($1,'cookie_crumb_trail','first',NULL,now()+interval '1 day'),($1,'cookie_crumb_trail','second',NULL,NULL)`, [java]);
    expect((await sql.unsafe(`SELECT equipped_accounts FROM ${metrics}.shop_equipped_current WHERE cosmetic_id='cookie_crumb_trail'`))[0]!.equipped_accounts).toBe("1");
    await sql.unsafe(`UPDATE ${schema}.cosmetic_entitlements SET expires_at=now()-interval '1 second' WHERE player_id=$1`, [java]);
    expect(await sql.unsafe(`SELECT * FROM ${metrics}.shop_equipped_current WHERE cosmetic_id='cookie_crumb_trail'`)).toHaveLength(0);
    await sql.unsafe(`DELETE FROM ${schema}.cosmetic_selections WHERE player_id=$1`, [java]);
    expect((await sql.unsafe(`SELECT count(*)::integer AS n FROM ${schema}.cosmetic_first_activations WHERE player_id=$1`, [java]))[0]!.n).toBe(2);
  });

  it("uses persisted edition before UUID fallback and retains unknown formats", async () => {
    await sql.unsafe(`INSERT INTO ${schema}.player_link_challenges VALUES ($1,'bedrock',now())`, [java]);
    await sql.unsafe(`INSERT INTO ${schema}.cosmetic_selections (player_id,slot,cosmetic_id) VALUES ($1,'EMOTE','cookie_cheer'),($2,'HUB_TRAIL',$3)`, [java, unknown, free]);
    const rows = await sql.unsafe(`SELECT edition FROM ${schema}.cosmetic_first_activations WHERE cosmetic_id='cookie_cheer' OR player_id=$1 ORDER BY edition`, [unknown]);
    expect(rows.map((row) => row.edition)).toEqual(["bedrock", "unknown"]);
    await sql.unsafe(`DELETE FROM ${schema}.playerdata WHERE id=$1`, [unknown]);
    expect((await sql.unsafe(`SELECT count(*)::integer AS n FROM ${schema}.cosmetic_first_activations WHERE player_id=$1`, [unknown]))[0]!.n).toBe(0);
  });

  it("deduplicates simultaneous first activations via the primary key", async () => {
    const player = randomUUID();
    await sql.unsafe(`INSERT INTO ${schema}.playerdata VALUES ($1)`, [player]);
    await Promise.all([1, 2].map(() => sql.unsafe(`INSERT INTO ${schema}.cosmetic_selections (player_id,slot,cosmetic_id) VALUES ($1,'HUB_TRAIL',$2) ON CONFLICT(player_id,slot) DO UPDATE SET cosmetic_id=excluded.cosmetic_id`, [player, free])));
    expect((await sql.unsafe(`SELECT count(*)::integer AS n FROM ${schema}.cosmetic_first_activations WHERE player_id=$1`, [player]))[0]!.n).toBe(1);
  });

  it("aggregates live order/payment cohorts in Paris days without doubling renewals or refunds", async () => {
    const order = randomUUID(), testOrder = randomUUID(), unpaid = randomUUID();
    // A recent UTC 23:30 belongs to the following Paris calendar day.
    const day = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
    const paid = `${day}T23:30:00Z`;
    await sql.unsafe(`INSERT INTO ${schema}.commerce_orders VALUES ($1,$4,$4,'live','checkout'),($2,$4,$4,'test','test'),($3,$4,NULL,'live',NULL)`, [order, testOrder, unpaid, paid]);
    await sql.unsafe(`INSERT INTO ${schema}.commerce_payments VALUES ($1,$2,$7,'EUR',1000,200,'partially_refunded'),($3,$2,$7,'EUR',1000,1000,'refunded'),($4,$5,$7,'EUR',9999,0,'paid'),($6,$2,NULL,'EUR',777,0,'pending')`, [randomUUID(), order, randomUUID(), randomUUID(), testOrder, randomUUID(), paid]);
    const [orders] = await sql.unsafe(`SELECT created_orders,checkout_session_orders FROM ${metrics}.shop_orders_daily`);
    expect(orders).toEqual({ created_orders: "2", checkout_session_orders: "1" });
    expect((await sql.unsafe(`SELECT paid_orders FROM ${metrics}.shop_paid_orders_daily`))[0]!.paid_orders).toBe("1");
    const [receipts] = await sql.unsafe(`SELECT to_char(time AT TIME ZONE 'Europe/Paris','YYYY-MM-DD') AS local_day, paid_payments,gross_cents,refunded_cents,refund_adjusted_cents FROM ${metrics}.shop_receipts_daily`);
    const expectedDay = new Date(new Date(paid).getTime() + 86_400_000).toISOString().slice(0, 10);
    expect(receipts).toEqual({ local_day: expectedDay, paid_payments: "2", gross_cents: "2000", refunded_cents: "1200", refund_adjusted_cents: "800" });
    await sql.unsafe(`INSERT INTO ${schema}.commerce_subscriptions VALUES ($1,'active',true,NULL,now()+interval '1 day'),($2,'active',false,NULL,now()+interval '1 day')`, [order, testOrder]);
    expect(await sql.unsafe(`SELECT * FROM ${metrics}.shop_subscriptions_current`)).toEqual([{ status: "active", cancel_at_period_end: true, current_period: true, subscriptions: "1" }]);
  });

  it("counts valid linked accounts once, not browser sessions", async () => {
    await sql.unsafe(`INSERT INTO ${schema}.commerce_sessions VALUES ($1,NULL,now()+interval '1 day'),($1,NULL,now()+interval '1 day'),($2,NULL,now()-interval '1 day'),($2,now(),now()+interval '1 day')`, [java, bedrock]);
    expect(await sql.unsafe(`SELECT * FROM ${metrics}.shop_linked_current WHERE link_type='commerce_session'`)).toEqual([{ link_type: "commerce_session", edition: "bedrock", linked_accounts: "1" }]);
  });

  it("lets Grafana read every aggregate but no identities, base rows, helper or mutations", async () => {
    const views = ["shop_activation_daily", "shop_activation_summary", "shop_equipped_current", "shop_linked_current", "shop_orders_daily", "shop_paid_orders_daily", "shop_receipts_daily", "shop_subscriptions_current"];
    for (const view of views) {
      await sql.begin(async (tx) => {
        await tx.unsafe(`SET LOCAL ROLE ${role}`);
        const rows = await tx.unsafe(`SELECT * FROM ${metrics}.${view}`);
        for (const row of rows) expect(Object.keys(row).join(",")).not.toMatch(/player_id|uuid|name|email|token/i);
      });
    }
    for (const query of [`SELECT * FROM ${schema}.cosmetic_first_activations`, `SELECT * FROM ${schema}.cosmetic_selections`, `SELECT ${schema}.shop_account_edition('${java}')`]) {
      await expect(sql.begin(async (tx) => { await tx.unsafe(`SET LOCAL ROLE ${role}`); return tx.unsafe(query); })).rejects.toMatchObject({ code: "42501" });
    }
    const [privileges] = await sql`SELECT
      has_table_privilege(${role}, ${`${metrics}.shop_activation_summary`}, 'DELETE') AS can_delete,
      has_table_privilege(${role}, ${`${schema}.cosmetic_first_activations`}, 'SELECT') AS can_read_ledger,
      has_function_privilege(${role}, ${`${schema}.shop_account_edition(uuid)`}, 'EXECUTE') AS can_probe_account`;
    expect(privileges).toEqual({ can_delete: false, can_read_ledger: false, can_probe_account: false });
    const settings = await sql`SELECT rolconfig FROM pg_roles WHERE rolname=${role}`;
    expect(settings[0]!.rolconfig).toContain("default_transaction_read_only=on");
    expect(settings[0]!.rolconfig).toContain("statement_timeout=8s");
  });

  it("keeps aggregate query load bounded and installs time/edition lookup indexes", async () => {
    await sql.unsafe(`INSERT INTO ${schema}.playerdata SELECT md5('load-' || i)::uuid FROM generate_series(1,5000) i`);
    await sql.unsafe(`INSERT INTO ${schema}.cosmetic_first_activations
      SELECT md5('load-' || i)::uuid, '${free}', now()-interval '200 days', 'selection', 'java'
      FROM generate_series(1,5000) i`);
    const [plan] = await sql.unsafe(`EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM ${metrics}.shop_activation_daily`);
    if (!plan) throw new Error("Missing aggregate query plan");
    expect(plan["QUERY PLAN"][0]!["Execution Time"]).toBeLessThan(1000);
    const indexes = await sql`SELECT indexname FROM pg_indexes WHERE schemaname=${schema}`;
    expect(indexes.map((row) => row.indexname)).toEqual(expect.arrayContaining([
      'cosmetic_first_activations_time_idx', 'player_link_challenges_player_created_idx',
      'commerce_orders_metrics_created_idx', 'commerce_orders_metrics_purchased_idx', 'commerce_payments_metrics_paid_idx',
    ]));
    const [total] = await sql.unsafe(`SELECT sum(activated_accounts)::integer AS n FROM ${metrics}.shop_activation_daily`);
    expect(total?.n).toBeLessThan(5000); // Old history is retained but daily charts read only 180 days.
  });
});
