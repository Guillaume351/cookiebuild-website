import { eq } from "drizzle-orm";
import { readBody } from "h3";
import db from "../../../../../db/client";
import { adminAuditLog, mobileNewsPosts } from "../../../../../db/schema";
import { adminAuditValues, requireAdminAuth } from "../../../../utils/admin-auth";
import {
  assertAdminCorrectionTarget,
  parseAdminNews,
  rethrowAdminNewsWriteConflict,
} from "../../../../utils/admin-content";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "content:write");
  const input = parseAdminNews(await readBody<Record<string, unknown>>(event));
  if (input.supersedesSlug) {
    const [[target], [existingReplacement]] = await Promise.all([
      db.select({ status: mobileNewsPosts.status, contentType: mobileNewsPosts.contentType })
        .from(mobileNewsPosts).where(eq(mobileNewsPosts.slug, input.supersedesSlug)).limit(1),
      db.select({ id: mobileNewsPosts.id }).from(mobileNewsPosts)
        .where(eq(mobileNewsPosts.supersedesSlug, input.supersedesSlug)).limit(1),
    ]);
    assertAdminCorrectionTarget(input, target, existingReplacement);
  }
  const [duplicate] = await db.select({ id: mobileNewsPosts.id }).from(mobileNewsPosts)
    .where(eq(mobileNewsPosts.slug, input.slug)).limit(1);
  if (duplicate) throw createError({ statusCode: 409, statusMessage: "This slug already exists" });
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(mobileNewsPosts).values(input).returning();
    await tx.insert(adminAuditLog).values(adminAuditValues(
      event,
      "content.news.created",
      "mobile_news_post",
      rows[0]!.id,
      { status: input.status, contentType: input.contentType, slug: input.slug },
    ));
    return rows;
  }).catch(rethrowAdminNewsWriteConflict);
  setResponseStatus(event, 201);
  return { data: created };
});
