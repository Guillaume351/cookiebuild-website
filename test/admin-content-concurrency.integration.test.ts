import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rethrowAdminNewsWriteConflict } from "../server/utils/admin-content";

const databaseUrl = process.env.ADMIN_CONTENT_INTEGRATION_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("admin content PostgreSQL concurrency", () => {
  let sql: Sql;
  const prefix = `admin-race-${process.pid}-${Date.now()}`;

  beforeAll(() => {
    sql = postgres(databaseUrl!, { prepare: false, max: 4 });
  });

  afterAll(async () => {
    await sql`DELETE FROM mobile_news_posts WHERE slug LIKE ${`${prefix}-%`}`;
    await sql.end({ timeout: 2 });
  });

  it("maps the losing concurrent correction to HTTP 409", async () => {
    const target = `${prefix}-target`;
    await sql`
      INSERT INTO mobile_news_posts (slug, title, summary, body, content_type, status, published_at)
      VALUES (${target}, 'Original', 'Original summary', 'Original body', 'changelog', 'published', now())
    `;

    const insertCorrection = (suffix: string) => sql`
      INSERT INTO mobile_news_posts (slug, title, summary, body, content_type, status, supersedes_slug)
      VALUES (${`${prefix}-${suffix}`}, 'Correction', 'Correction summary', 'Correction body',
        'changelog', 'draft', ${target})
    `;
    const outcomes = await Promise.allSettled([insertCorrection("a"), insertCorrection("b")]);
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find(result => result.status === "rejected");
    expect(rejected).toBeDefined();

    try {
      rethrowAdminNewsWriteConflict((rejected as PromiseRejectedResult).reason);
      throw new Error("expected a conflict");
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 409 });
    }
  });
});
