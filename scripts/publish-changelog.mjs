import { readFile } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const legacyEditorialSlugs = new Set([
  "lobby-and-game-quality-improvements",
  "clearer-lobby-player-activity",
  "skywars-kit-menu-reliability",
  "bedwars-beta-cookie-colosseum",
  "bedwars-beta-lobby-hotfix",
  "bedwars-cookie-colosseum",
  "bedwars-server-guide",
  "build-battle-creative-update",
  "game-guides-for-every-mode",
  "minecraft-26-2-and-bedrock-compatibility",
  "mobile-play-hub-kits-stats-alerts",
  "new-player-experience-polish",
  "cookie-build-returns-2026",
  "cookie-build-mobile-2",
  "skywars-buildbattles-return",
  "reliability-monitoring-2026",
  "turfwars-return",
]);
const internalTerms = [
  /\bMOTD\b/i,
  /\bNPCs?\b/i,
  /server tick/i,
  /environment flag/i,
  /\bseriali[sz]ed\b/i,
  /\bconcurrently\b/i,
  /\breconciliation\b/i,
  /\b(?:Prometheus|Grafana|Loki|Alertmanager|PostgreSQL|RabbitMQ)\b/i,
];

export function assertPlayerFacingEditorialStyle(entry) {
  if (legacyEditorialSlugs.has(entry.slug)) return;
  const copy = `${entry.title}\n${entry.summary}\n${entry.body}`;
  const blocked = internalTerms.find((term) => term.test(copy));
  if (blocked) {
    throw new Error(`Player-facing copy contains internal terminology (${blocked.source}).`);
  }
}

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
  const contentType = string("contentType", 16);
  if (contentType !== "news" && contentType !== "changelog") {
    throw new Error("contentType must be news or changelog.");
  }
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
  let supersedesSlug = null;
  if (input.supersedesSlug != null) {
    supersedesSlug = string("supersedesSlug", 120);
    if (!slugPattern.test(supersedesSlug)) {
      throw new Error("supersedesSlug must use lowercase words separated by hyphens.");
    }
    if (supersedesSlug === slug) throw new Error("A changelog entry cannot supersede itself.");
  }
  const entry = {
    slug,
    contentType,
    title: string("title", 160),
    summary: string("summary", 500),
    body: string("body", 10_000),
    coverImageUrl,
    supersedesSlug,
    publishedAt: date,
  };
  assertPlayerFacingEditorialStyle(entry);
  return entry;
}

export async function readChangelogFile(filePath) {
  const parsed = JSON.parse(await readFile(filePath, "utf8"));
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  if (!entries.length) throw new Error("The changelog file is empty.");
  const validated = entries.map(validateChangelogEntry);
  assertPublishableBatch(validated);
  return validated;
}

export function assertPublishableBatch(entries, now = new Date()) {
  const slugs = new Set();
  const supersededSlugs = new Set();
  for (const entry of entries) {
    if (entry.publishedAt.getTime() > now.getTime()) {
      throw new Error(`publishedAt cannot be in the future for slug ${entry.slug}.`);
    }
    if (slugs.has(entry.slug)) {
      throw new Error(`Duplicate changelog slug ${entry.slug} in the same release file.`);
    }
    slugs.add(entry.slug);
    if (entry.supersedesSlug) {
      if (supersededSlugs.has(entry.supersedesSlug)) {
        throw new Error(`Changelog slug ${entry.supersedesSlug} is superseded more than once in the same release file.`);
      }
      supersededSlugs.add(entry.supersedesSlug);
    }
  }
}

function timestamp(value) {
  if (value == null) return Number.NaN;
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime();
}

/** A published slug is immutable; an identical retry is the only accepted conflict. */
export function assertImmutablePublishedEntry(entry, published) {
  const equal = published
    && published.contentType === entry.contentType
    && published.title === entry.title
    && published.summary === entry.summary
    && published.body === entry.body
    && (published.coverImageUrl ?? null) === entry.coverImageUrl
    && (published.supersedesSlug ?? null) === entry.supersedesSlug
    && published.status === "published"
    && timestamp(published.publishedAt) === entry.publishedAt.getTime();
  if (!equal) {
    throw new Error(`Immutable changelog conflict for slug ${entry.slug}. Publish a new slug instead.`);
  }
}

export function assertValidSupersession(entry, target, existingReplacement) {
  if (!entry.supersedesSlug) return;
  if (!target || target.status !== "published") {
    throw new Error(`Superseded changelog slug ${entry.supersedesSlug} is not published.`);
  }
  if (target.contentType !== entry.contentType) {
    throw new Error("A correction must use the same content type as the note it supersedes.");
  }
  const targetPublishedAt = timestamp(target.publishedAt);
  if (!Number.isFinite(targetPublishedAt)) {
    throw new Error(`Superseded changelog slug ${entry.supersedesSlug} has no valid publication date.`);
  }
  if (targetPublishedAt >= entry.publishedAt.getTime()) {
    throw new Error("A correction must be published after the note it supersedes.");
  }
  if (existingReplacement && existingReplacement.slug !== entry.slug) {
    throw new Error(`Changelog slug ${entry.supersedesSlug} has already been superseded.`);
  }
}

export async function publish(entries) {
  // Validate the complete release before opening a database connection. The SQL
  // transaction remains the second, independent guard against partial batches.
  assertPublishableBatch(entries);
  const databaseUrl = process.env.NUXT_DATABASE_URL;
  if (!databaseUrl) throw new Error("NUXT_DATABASE_URL is required with --publish.");
  const { default: postgres } = await import("postgres");
  const sql = postgres(databaseUrl, { prepare: false, max: 1 });
  try {
    await sql.begin(async (transaction) => {
      for (const entry of entries) {
        if (entry.supersedesSlug) {
          const [target] = await transaction`
            SELECT content_type AS "contentType", status, published_at AS "publishedAt"
              FROM mobile_news_posts
             WHERE slug = ${entry.supersedesSlug}
             FOR SHARE
          `;
          const [existingReplacement] = await transaction`
            SELECT slug
              FROM mobile_news_posts
             WHERE supersedes_slug = ${entry.supersedesSlug}
             LIMIT 1
             FOR SHARE
          `;
          assertValidSupersession(entry, target, existingReplacement);
        }
        await transaction`
          INSERT INTO mobile_news_posts (
            slug, content_type, title, summary, body, cover_image_url, supersedes_slug, status, published_at
          ) VALUES (
            ${entry.slug}, ${entry.contentType}, ${entry.title}, ${entry.summary}, ${entry.body},
            ${entry.coverImageUrl}, ${entry.supersedesSlug}, 'published', ${entry.publishedAt}
          )
          ON CONFLICT (slug) DO UPDATE
             SET status = 'published',
                 published_at = EXCLUDED.published_at,
                 updated_at = NOW()
           WHERE mobile_news_posts.status = 'draft'
             AND mobile_news_posts.content_type = EXCLUDED.content_type
             AND mobile_news_posts.title = EXCLUDED.title
             AND mobile_news_posts.summary = EXCLUDED.summary
             AND mobile_news_posts.body = EXCLUDED.body
             AND mobile_news_posts.cover_image_url IS NOT DISTINCT FROM EXCLUDED.cover_image_url
             AND mobile_news_posts.supersedes_slug IS NOT DISTINCT FROM EXCLUDED.supersedes_slug
             AND mobile_news_posts.expires_at IS NULL
        `;
        const [published] = await transaction`
          SELECT content_type AS "contentType",
                 title,
                 summary,
                 body,
                 cover_image_url AS "coverImageUrl",
                 supersedes_slug AS "supersedesSlug",
                 status,
                 published_at AS "publishedAt"
            FROM mobile_news_posts
           WHERE slug = ${entry.slug}
           FOR SHARE
        `;
        assertImmutablePublishedEntry(entry, published);
      }
    });
    for (const entry of entries) {
      const [published] = await sql`
        SELECT content_type AS "contentType", status, published_at AS "publishedAt"
        FROM mobile_news_posts
        WHERE slug = ${entry.slug}
      `;
      if (!published
          || published.contentType !== entry.contentType
          || published.status !== "published"
          || !(published.publishedAt instanceof Date)
          || published.publishedAt > new Date()) {
        throw new Error(`Published changelog verification failed for ${entry.slug}.`);
      }
    }
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
