import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fixtureBuildPayloadGzip } from "./fixtures/buildbattle-fixture";

/**
 * Runs the gallery service against a throwaway schema. Set
 * BB_GALLERY_INTEGRATION_DATABASE_URL=postgres://… to enable (skipped otherwise).
 */
const databaseUrl = process.env.BB_GALLERY_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const testSchema = "bb_gallery_test_" + randomUUID().replaceAll("-", "");
const scopedUrl = databaseUrl ? new URL(databaseUrl) : null;
scopedUrl?.searchParams.set("search_path", testSchema);

const OWNER = "66000000-0000-4000-8000-000000000001";
const OTHER = "66000000-0000-4000-8000-000000000002";
const buildId = (index: number) => `66000000-0000-4000-8000-1000000000${String(index).padStart(2, "0")}`;

integration("Build Battle gallery PostgreSQL integration", () => {
  let setupSql: Sql;
  let gallery: typeof import("../server/services/buildbattle-gallery");
  let bestOf: typeof import("../server/services/buildbattle-bestof");
  let query: typeof import("../server/buildbattle/query");

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = scopedUrl!.toString();
    const bootstrap = postgres(databaseUrl!, { max: 1 });
    await bootstrap.unsafe(`CREATE SCHEMA "${testSchema}"`);
    await bootstrap.end();
    setupSql = postgres(scopedUrl!.toString(), { prepare: false, max: 4, onnotice: () => undefined });
    await setupSql.unsafe(`
      CREATE TABLE playerdata (id uuid PRIMARY KEY, name varchar(255), coins integer NOT NULL DEFAULT 0);
      CREATE TABLE player_reward_grants (
        id bigserial PRIMARY KEY,
        player_uuid uuid NOT NULL REFERENCES playerdata(id) ON DELETE CASCADE,
        source text NOT NULL, period_key text NOT NULL,
        coins integer DEFAULT 0 NOT NULL, xp integer DEFAULT 0 NOT NULL, cosmetic_id text,
        created_at timestamptz DEFAULT now() NOT NULL, delivered_at timestamptz,
        CONSTRAINT player_reward_grants_player_source_period_uq UNIQUE (player_uuid, source, period_key)
      );
      CREATE TABLE admin_audit_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_uid varchar(128) NOT NULL, actor_role varchar(16) NOT NULL,
        action varchar(96) NOT NULL, resource_type varchar(64) NOT NULL, resource_id varchar(255),
        request_id varchar(64), ip_address varchar(64), user_agent varchar(512),
        metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    const migration = (await readFile(new URL("../drizzle/0024_buildbattle_gallery.sql", import.meta.url), "utf8"))
      .replaceAll("--> statement-breakpoint", "");
    await setupSql.unsafe(migration);
    await setupSql.unsafe(migration); // idempotent
    await setupSql`INSERT INTO playerdata (id, name) VALUES (${OWNER}, 'Builder'), (${OTHER}, 'Other')`;
    const data = fixtureBuildPayloadGzip();
    // Five builds created during Paris week 2026-W40, two with equal likes and timestamps 1 µs apart.
    const rows: Array<[number, string, number, string]> = [
      [1, OWNER, 9, "2026-09-29 10:00:00.000001+00"],
      [2, OWNER, 9, "2026-09-29 10:00:00.000002+00"],
      [3, OTHER, 12, "2026-09-30 10:00:00+00"],
      [4, OTHER, 2, "2026-10-01 10:00:00+00"],
      [5, OWNER, 5, "2026-10-02 10:00:00+00"],
    ];
    for (const [index, player, likes, createdAt] of rows) {
      await setupSql`
        INSERT INTO buildbattle_builds (id, short_code, player_id, theme_key, theme_name, outcome, placement, builders,
          block_count, size_x, size_y, size_z, data, like_count, created_at)
        VALUES (${buildId(index)}, ${`Code000${index}`}, ${player}, 'summer', 'Summer', 'judged', 1, 4,
          900, 27, 23, 27, ${data}, ${likes}, ${createdAt})
      `;
    }
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    gallery = await import("../server/services/buildbattle-gallery");
    bestOf = await import("../server/services/buildbattle-bestof");
    query = await import("../server/buildbattle/query");
  });

  afterAll(async () => {
    const { postgresClient } = await import("../db/client");
    await postgresClient.end();
    await setupSql?.end();
    if (databaseUrl) {
      const cleanup = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
      await cleanup.unsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
      await cleanup.end();
    }
  });

  it("pages through ties with exact keyset cursors", async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await gallery.listGalleryBuilds(query.parseGalleryListQuery({ sort: "top", limit: "2", ...(cursor ? { cursor } : {}) }));
      seen.push(...page.items.map((item) => item.shortCode));
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen).toEqual(["Code0003", "Code0002", "Code0001", "Code0005", "Code0004"]);
    const recent = await gallery.listGalleryBuilds(query.parseGalleryListQuery({ sort: "recent", limit: "48", player: "builder", locale: "fr" }));
    expect(recent.items.map((item) => item.shortCode)).toEqual(["Code0005", "Code0002", "Code0001"]);
    expect(recent.items[0]).toMatchObject({ theme: "Été", playerName: "Builder", size: [27, 23, 27] });
  });

  it("keeps likes idempotent under concurrency", async () => {
    await Promise.all(Array.from({ length: 8 }, () => gallery.setGalleryLike("Code0004", "web:same", true)));
    await Promise.all(["web:a", "web:b", "app:c"].map((key) => gallery.setGalleryLike("Code0004", key, true)));
    await expect(gallery.getGalleryBuild("Code0004", "web:same", null)).resolves.toMatchObject({ likeCount: 6, liked: true });
    await gallery.setGalleryLike("Code0004", "web:same", false);
    await expect(gallery.setGalleryLike("Code0004", "web:same", false)).resolves.toEqual({ liked: false, likeCount: 5 });
    const blocks = await gallery.getGalleryBuildBlocks("Code0004");
    expect(blocks.data.equals(fixtureBuildPayloadGzip())).toBe(true);
  });

  it("grants the weekly best-of once per ISO week", async () => {
    const window = bestOf.dueBestOfWindow(new Date("2026-10-05T08:30:00Z"))!;
    const first = await bestOf.grantWeeklyBestOf(window);
    expect(first.map((grant) => [grant.periodKey, grant.coins]).sort()).toEqual([
      ["2026-W40-1", 150], ["2026-W40-2", 100], ["2026-W40-3", 50],
    ]);
    await setupSql`UPDATE buildbattle_builds SET like_count = 99 WHERE id = ${buildId(5)}`;
    await expect(bestOf.grantWeeklyBestOf(window)).resolves.toEqual([]);
    const grants = await setupSql`SELECT player_uuid, period_key FROM player_reward_grants WHERE source = 'bb_bestof' ORDER BY period_key`;
    expect(grants.map((grant) => grant.player_uuid)).toEqual([OTHER, OWNER, OWNER]);
  });

  it("hides at three reports, 404s publicly and restores with the owner's opt-out", async () => {
    for (const key of ["web:1", "web:2", "app:3"]) await gallery.reportGalleryBuild("Code0001", key, "offensive");
    await expect(gallery.getGalleryBuild("Code0001", null, null)).rejects.toMatchObject({ statusCode: 404 });
    await expect(gallery.getGalleryBuildBlocks("Code0001")).rejects.toMatchObject({ statusCode: 404 });
    const hidden = await gallery.listAdminBuilds("hidden", 10);
    expect(hidden.map((row) => row.shortCode)).toEqual(["Code0001"]);
    expect(hidden[0]!.reasons).toEqual({ offensive: 3 });
    const audit = { actorUid: "admin", actorRole: "moderator", action: "buildbattle_build.restored", resourceType: "buildbattle_build" };
    await setupSql`INSERT INTO buildbattle_gallery_settings (player_id, gallery_opt_out) VALUES (${OWNER}, true)`;
    await expect(gallery.moderateBuild(buildId(1), "restore", () => audit)).resolves.toEqual({ id: buildId(1), status: "private" });
    await expect(gallery.moderateBuild(buildId(1), "restore", () => audit)).rejects.toMatchObject({ statusCode: 409 });
    await expect(gallery.moderateBuild(buildId(3), "hide", () => ({ ...audit, action: "buildbattle_build.hidden" })))
      .resolves.toEqual({ id: buildId(3), status: "hidden" });
    const audits = await setupSql`SELECT count(*)::int AS count FROM admin_audit_log`;
    expect(audits[0]?.count).toBe(2);
  });
});
