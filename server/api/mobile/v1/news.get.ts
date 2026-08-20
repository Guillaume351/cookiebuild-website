import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { getQuery } from "h3";
import db from "../../../../db/client";
import { mobileNewsPosts } from "../../../../db/schema";
import { parseMobileNewsQuery } from "../../../utils/mobile-news";

export default defineEventHandler(async (event) => {
  const { contentType, includeSuperseded, limit, slug } = parseMobileNewsQuery(getQuery(event));
  const now = new Date();
  const posts = await db
    .select({
      id: mobileNewsPosts.id,
      slug: mobileNewsPosts.slug,
      contentType: mobileNewsPosts.contentType,
      title: mobileNewsPosts.title,
      summary: mobileNewsPosts.summary,
      body: mobileNewsPosts.body,
      coverImageUrl: mobileNewsPosts.coverImageUrl,
      supersedesSlug: mobileNewsPosts.supersedesSlug,
      supersededBySlug: sql<string | null>`(
        SELECT replacement.slug
          FROM mobile_news_posts AS replacement
         WHERE replacement.supersedes_slug = ${mobileNewsPosts.slug}
           AND replacement.status = 'published'
           AND replacement.published_at <= ${now}
           AND (replacement.expires_at IS NULL OR replacement.expires_at > ${now})
         LIMIT 1
      )`,
      publishedAt: mobileNewsPosts.publishedAt,
    })
    .from(mobileNewsPosts)
    .where(and(
      eq(mobileNewsPosts.status, "published"),
      ...(contentType ? [eq(mobileNewsPosts.contentType, contentType)] : []),
      ...(slug ? [eq(mobileNewsPosts.slug, slug)] : []),
      ...(!includeSuperseded ? [sql`NOT EXISTS (
        SELECT 1
          FROM mobile_news_posts AS active_replacement
         WHERE active_replacement.supersedes_slug = ${mobileNewsPosts.slug}
           AND active_replacement.status = 'published'
           AND active_replacement.published_at <= ${now}
           AND (active_replacement.expires_at IS NULL OR active_replacement.expires_at > ${now})
      )`] : []),
      lte(mobileNewsPosts.publishedAt, now),
      or(isNull(mobileNewsPosts.expiresAt), gt(mobileNewsPosts.expiresAt, now)),
    ))
    .orderBy(desc(mobileNewsPosts.publishedAt))
    .limit(limit);

  setHeader(event, "Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
  return { data: posts };
});
