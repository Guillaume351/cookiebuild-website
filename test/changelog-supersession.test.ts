import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

describe("changelog supersession contract", () => {
  it("registers an additive migration with integrity constraints", async () => {
    const [journal, migration, schema] = await Promise.all([
      read("../drizzle/meta/_journal.json"),
      read("../drizzle/0012_changelog_supersession.sql"),
      read("../db/schema.ts"),
    ]);

    expect(JSON.parse(journal).entries.at(-1)).toMatchObject({
      idx: 12,
      tag: "0012_changelog_supersession",
    });
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "supersedes_slug"');
    expect(migration).toContain('REFERENCES "mobile_news_posts" ("slug")');
    expect(migration).toContain('"supersedes_slug" <> "slug"');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "mobile_news_posts_supersedes_slug_uq"');
    expect(schema).toContain('name: "mobile_news_posts_supersedes_slug_fk"');
    expect(schema).toContain("foreignColumns: [table.slug]");
  });

  it("adds nullable relation fields without changing the existing mobile news fields", async () => {
    const [api, type] = await Promise.all([
      read("../server/api/mobile/v1/news.get.ts"),
      read("../utils/updates.ts"),
    ]);

    for (const existingField of ["id", "slug", "contentType", "title", "summary", "body", "coverImageUrl", "publishedAt"]) {
      expect(api).toContain(`${existingField}: mobileNewsPosts.${existingField}`);
    }
    expect(api).toContain("supersedesSlug: mobileNewsPosts.supersedesSlug");
    expect(api).toContain("supersededBySlug: sql<string | null>");
    expect(api).toContain("replacement.status = 'published'");
    expect(api).toContain("replacement.expires_at IS NULL OR replacement.expires_at >");
    expect(api).toContain("...(!includeSuperseded ? [sql`NOT EXISTS");
    expect(type).toContain("supersedesSlug?: string | null;");
    expect(type).toContain("supersededBySlug?: string | null;");
  });

  it("links corrections in the public UI and guards immutable admin updates atomically", async () => {
    const [card, adminRoute, adminPage, publisher] = await Promise.all([
      read("../components/UpdatePostCard.vue"),
      read("../server/api/admin/content/news/[id].patch.ts"),
      read("../pages/admin/content.vue"),
      read("../scripts/publish-changelog.mjs"),
    ]);

    expect(card).toContain("post.supersededBySlug");
    expect(card).toContain("post.supersedesSlug");
    expect(card).toContain('`/updates/${post.supersededBySlug}`');
    expect(card).toContain('`/updates/${post.supersedesSlug}`');
    expect(adminRoute).toContain('ne(mobileNewsPosts.status, "published")');
    expect(adminRoute).toContain("assertMutableAdminNews(current)");
    expect(adminPage).not.toContain('<option value="published">');
    expect(adminPage).toContain("Créer une correction");
    expect(adminPage).toContain("supersedesSlug: post.slug");
    expect(publisher).toContain("mobile_news_posts.status = 'draft'");
    expect(publisher).toContain("mobile_news_posts.supersedes_slug IS NOT DISTINCT FROM EXCLUDED.supersedes_slug");
  });

  it("keeps web history explicit and provides reliable per-slug pages", async () => {
    const [updatesPage, permalinkPage] = await Promise.all([
      read("../pages/updates.vue"),
      read("../pages/updates/[slug].vue"),
    ]);
    expect(updatesPage).toContain('includeSuperseded: "true"');
    expect(updatesPage).toContain("updateSlugFromHash");
    expect(permalinkPage).toContain('query: { slug, includeSuperseded: "true", limit: 1 }');
  });
});
