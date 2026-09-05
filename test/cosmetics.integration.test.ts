import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const databaseUrl = process.env.COSMETICS_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const testSchema = "commerce_test_" + randomUUID().replaceAll("-", "");
const scopedUrl = databaseUrl ? new URL(databaseUrl) : null;
scopedUrl?.searchParams.set("search_path", testSchema);
const PLAYER_ID = "65000000-0000-4000-8000-000000000001";

integration("cosmetic entitlement expiry on public player stats", () => {
  let setupSql: Sql;
  let databaseModule: typeof import("../db/client");
  let loadPlayerStats: typeof import("../server/api/player-stats.get")["loadPlayerStats"];

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = scopedUrl!.toString();
    const bootstrap = postgres(databaseUrl!, { max: 1 });
    await bootstrap.unsafe(`CREATE SCHEMA "${testSchema}"`);
    await bootstrap.end();
    setupSql = postgres(scopedUrl!.toString(), { prepare: false, max: 4 });
    await setupSql.unsafe(`
      CREATE TABLE playerdata (
        id uuid PRIMARY KEY,
        createdat timestamp,
        lastlogin timestamp,
        name varchar(255),
        coins integer NOT NULL DEFAULT 0
      );
      CREATE TABLE matches (
        id uuid PRIMARY KEY,
        endtime timestamp,
        gametype varchar(255) NOT NULL,
        starttime timestamp NOT NULL
      );
      CREATE TABLE match_players (match_id uuid NOT NULL, player_id uuid NOT NULL);
      CREATE TABLE match_winners (match_id uuid NOT NULL, player_id uuid NOT NULL);
      CREATE TABLE player_match_performances (
        id uuid PRIMARY KEY,
        assistsinmatch integer NOT NULL DEFAULT 0,
        deathsinmatch integer NOT NULL DEFAULT 0,
        game_specific_metrics jsonb,
        killsinmatch integer NOT NULL DEFAULT 0,
        match_id uuid NOT NULL,
        player_id uuid NOT NULL
      );
      CREATE TABLE player_sessions (
        id uuid PRIMARY KEY,
        player_id uuid NOT NULL,
        start_time timestamp NOT NULL,
        end_time timestamp,
        duration bigint,
        server_crash boolean DEFAULT false
      );
      CREATE TABLE minigame_progression (
        player_id uuid NOT NULL,
        minigame varchar(255) NOT NULL,
        level integer NOT NULL DEFAULT 1,
        experience integer NOT NULL DEFAULT 0,
        unlocked_kits varchar,
        last_selected_kit_name varchar(255),
        last_selected_kit_level integer NOT NULL DEFAULT 0,
        PRIMARY KEY (player_id, minigame)
      );
    `);
    const migration = await readFile(
      new URL("../drizzle/0015_cosmetic_entitlements.sql", import.meta.url),
      "utf8",
    );
    await setupSql.unsafe(migration.replaceAll("--> statement-breakpoint", ""));
    await setupSql`
      INSERT INTO playerdata (id, name, coins)
      VALUES (${PLAYER_ID}, 'SupporterDemo', 42)
    `;
    await setupSql`
      INSERT INTO cosmetic_entitlements (
        player_id, cosmetic_id, source, granted_at, expires_at
      ) VALUES (
        ${PLAYER_ID}, 'supporter_profile_frame', 'integration-test', now() - interval '2 days', now() + interval '1 day'
      )
    `;
    await setupSql`
      INSERT INTO cosmetic_selections (player_id, slot, cosmetic_id)
      VALUES (${PLAYER_ID}, 'PROFILE_FRAME', 'supporter_profile_frame')
    `;
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    databaseModule = await import("../db/client");
    ({ loadPlayerStats } = await import("../server/api/player-stats.get"));
  }, 30_000);

  afterAll(async () => {
    await databaseModule?.postgresClient.end({ timeout: 2 });
    await setupSql?.end({ timeout: 2 });
    vi.unstubAllGlobals();
  });

  async function frameVisible() {
    const result = await loadPlayerStats({ search: "SupporterDemo", page: 1, pageSize: 10 });
    return result.data[0]?.supporterProfileFrame;
  }

  it("shows only a selected, non-revoked, non-expired profile frame", async () => {
    expect(await frameVisible()).toBe(true);

    await setupSql`
      UPDATE cosmetic_entitlements
         SET expires_at = now() - interval '1 day'
       WHERE player_id = ${PLAYER_ID} AND cosmetic_id = 'supporter_profile_frame'
    `;
    expect(await frameVisible()).toBe(false);

    await setupSql`
      UPDATE cosmetic_entitlements
         SET expires_at = now() + interval '1 day', revoked_at = now()
       WHERE player_id = ${PLAYER_ID} AND cosmetic_id = 'supporter_profile_frame'
    `;
    expect(await frameVisible()).toBe(false);

    await setupSql`
      UPDATE cosmetic_entitlements
         SET expires_at = NULL, revoked_at = NULL
       WHERE player_id = ${PLAYER_ID} AND cosmetic_id = 'supporter_profile_frame'
    `;
    expect(await frameVisible()).toBe(true);
  });
});
