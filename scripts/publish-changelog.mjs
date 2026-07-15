import { readFile } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateChangelogEntry(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Each changelog entry must be a JSON object.");
  }
  const string = (key, max) => {
    const value = typeof input[key] === "string" ? input[key].trim() : "";
    if (!value || value.length > max) throw new Error(`${key} must contain 1-${max} characters.`);
    return value;
  };
  const slug = string("slug", 120);
  if (!slugPattern.test(slug)) throw new Error("slug must use lowercase words separated by hyphens.");
  const publishedAt = string("publishedAt", 64);
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime()) || !/(Z|[+-]\d{2}:\d{2})$/.test(publishedAt)) {
    throw new Error("publishedAt must be an ISO-8601 timestamp with an explicit timezone.");
  }
  let coverImageUrl = null;
  if (input.coverImageUrl != null) {
    coverImageUrl = string("coverImageUrl", 2048);
    if (!coverImageUrl.startsWith("https://")) throw new Error("coverImageUrl must use HTTPS.");
  }
  return {
    slug,
    title: string("title", 160),
    summary: string("summary", 500),
    body: string("body", 10_000),
    coverImageUrl,
    publishedAt: date,
  };
}

export async function readChangelogFile(filePath) {
  const parsed = JSON.parse(await readFile(filePath, "utf8"));
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  if (!entries.length) throw new Error("The changelog file is empty.");
  return entries.map(validateChangelogEntry);
}

async function publish(entries) {
  const databaseUrl = process.env.NUXT_DATABASE_URL;
  if (!databaseUrl) throw new Error("NUXT_DATABASE_URL is required with --publish.");
  const { default: postgres } = await import("postgres");
  const sql = postgres(databaseUrl, { prepare: false, max: 1 });
  try {
    await sql.begin(async (transaction) => {
      for (const entry of entries) {
        await transaction`
          INSERT INTO mobile_news_posts (
            slug, title, summary, body, cover_image_url, status, published_at
          ) VALUES (
            ${entry.slug}, ${entry.title}, ${entry.summary}, ${entry.body},
            ${entry.coverImageUrl}, 'published', ${entry.publishedAt}
          )
          ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            body = EXCLUDED.body,
            cover_image_url = EXCLUDED.cover_image_url,
            status = 'published',
            published_at = CASE
              WHEN mobile_news_posts.status = 'published' THEN mobile_news_posts.published_at
              ELSE EXCLUDED.published_at
            END,
            expires_at = NULL,
            updated_at = now()
        `;
      }
    });
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function main() {
  const publishRequested = process.argv.includes("--publish");
  const filePath = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (!filePath) {
    throw new Error("Usage: npm run changelog:publish -- <file.json> [--publish]");
  }
  const entries = await readChangelogFile(filePath);
  if (publishRequested) {
    await publish(entries);
    console.log(`Published ${entries.length} changelog entr${entries.length === 1 ? "y" : "ies"}.`);
  } else {
    console.log(`Validated ${entries.length} changelog entr${entries.length === 1 ? "y" : "ies"}. Add --publish to write them.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
