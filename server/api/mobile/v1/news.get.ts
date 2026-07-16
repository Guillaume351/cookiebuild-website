import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { getQuery } from "h3";
import db from "../../../../db/client";
import { mobileNewsPosts } from "../../../../db/schema";
import { positiveInteger } from "../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  const limit = positiveInteger(getQuery(event).limit, 20, 50);
  const contentType = getQuery(event).contentType;
  if (contentType !== undefined && contentType !== "news" && contentType !== "changelog") {
    throw createError({ statusCode: 400, statusMessage: "Invalid content type" });
  }
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
      publishedAt: mobileNewsPosts.publishedAt,
    })
    .from(mobileNewsPosts)
    .where(and(
      eq(mobileNewsPosts.status, "published"),
      ...(contentType ? [eq(mobileNewsPosts.contentType, contentType)] : []),
      lte(mobileNewsPosts.publishedAt, now),
      or(isNull(mobileNewsPosts.expiresAt), gt(mobileNewsPosts.expiresAt, now)),
    ))
    .orderBy(desc(mobileNewsPosts.publishedAt))
    .limit(limit);

  setHeader(event, "Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
  return { data: posts };
});
