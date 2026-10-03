import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { renderMarketingSitemap } from "../utils/marketing-sitemap";
import {
  buildbattleBuildLikes,
  buildbattleBuildReports,
  buildbattleBuilds,
  buildbattleGallerySettings,
  discordEventAnnouncements,
} from "../db/schema";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = read("../drizzle/0024_buildbattle_gallery.sql");
const journal = JSON.parse(read("../drizzle/meta/_journal.json")) as {
  entries: Array<{ idx: number; tag: string; when: number }>;
};
const sitemap = read("../utils/marketing-sitemap.ts");

describe("Build Battle gallery migration 0024", () => {
  it("creates every contract table idempotently", () => {
    for (const table of ["buildbattle_builds", "buildbattle_build_likes", "buildbattle_build_reports", "buildbattle_gallery_settings"]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`);
    }
    expect(migration).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
    expect(migration).not.toMatch(/CREATE INDEX (?!IF NOT EXISTS)/);
    expect(migration).not.toMatch(/ADD COLUMN (?!IF NOT EXISTS)/);
    expect(migration).not.toMatch(/\bDROP\b/);
  });

  it("matches the contract columns, keys and cascades", () => {
    for (const fragment of [
      '"short_code" varchar(10) NOT NULL UNIQUE',
      '"player_id" uuid NOT NULL REFERENCES "playerdata"("id") ON DELETE CASCADE',
      '"theme_key" varchar(64) NOT NULL',
      '"theme_name" varchar(80) NOT NULL',
      '"outcome" varchar(24) NOT NULL',
      '"placement" smallint,',
      '"data" bytea NOT NULL',
      '"like_count" integer NOT NULL DEFAULT 0',
      '"report_count" integer NOT NULL DEFAULT 0',
      `"status" varchar(16) NOT NULL DEFAULT 'published'`,
      '"liker_key" varchar(80) NOT NULL',
      '"reporter_key" varchar(80) NOT NULL',
      '"reason" varchar(32) NOT NULL',
      'PRIMARY KEY ("build_id", "liker_key")',
      'PRIMARY KEY ("build_id", "reporter_key")',
      '"gallery_opt_out" boolean NOT NULL DEFAULT false',
      'REFERENCES "buildbattle_builds"("id") ON DELETE CASCADE',
    ]) {
      expect(migration).toContain(fragment);
    }
    expect(migration).toContain('ON "buildbattle_builds" ("status", "created_at" DESC)');
    expect(migration).toContain('ON "buildbattle_builds" ("status", "like_count" DESC, "created_at" DESC)');
    expect(migration).toContain('ON "buildbattle_builds" ("player_id", "created_at" DESC)');
  });

  it("is registered after 0023 in the drizzle journal, followed by 0025", () => {
    const tags = journal.entries.map((entry) => entry.tag);
    expect(tags.slice(-3)).toEqual(["0023_rally_recipient_cap", "0024_buildbattle_gallery", "0025_starter_coin_cosmetic"]);
    const [previous, gallery, cosmetic] = journal.entries.slice(-3);
    expect([gallery!.idx, cosmetic!.idx]).toEqual([24, 25]);
    expect(gallery!.when).toBeGreaterThan(previous!.when);
    expect(cosmetic!.when).toBeGreaterThan(gallery!.when);
  });

  it("declares the same tables in the drizzle schema", () => {
    expect(getTableConfig(buildbattleBuilds).name).toBe("buildbattle_builds");
    expect(getTableConfig(buildbattleBuilds).columns.map((column) => column.name)).toEqual([
      "id", "short_code", "player_id", "match_id", "theme_key", "theme_name", "outcome", "placement", "builders",
      "block_count", "size_x", "size_y", "size_z", "data", "like_count", "report_count", "status", "created_at",
    ]);
    expect(getTableConfig(buildbattleBuilds).columns.find((column) => column.name === "data")?.getSQLType()).toBe("bytea");
    expect(getTableConfig(buildbattleBuildLikes).primaryKeys).toHaveLength(1);
    expect(getTableConfig(buildbattleBuildReports).primaryKeys).toHaveLength(1);
    expect(getTableConfig(buildbattleGallerySettings).name).toBe("buildbattle_gallery_settings");
    expect(getTableConfig(discordEventAnnouncements).name).toBe("discord_event_announcements");
  });

  it("lists only the gallery listing in the sitemap, never individual builds", () => {
    expect(sitemap).toContain('GALLERY_SITEMAP_PATHS = ["/builds"]');
    expect(sitemap).not.toMatch(/\/builds\/\$\{/);
    const rendered = renderMarketingSitemap();
    expect(rendered).toContain("<loc>https://www.cookie-build.com/builds</loc>");
    expect(rendered).toContain("<loc>https://www.cookie-build.com/fr/galerie</loc>");
    expect(rendered).toContain("<loc>https://www.cookie-build.com/de/builds</loc>");
    expect(rendered).not.toMatch(/\/(builds|galerie)\/[A-Za-z0-9]+<\/loc>/);
  });
});
