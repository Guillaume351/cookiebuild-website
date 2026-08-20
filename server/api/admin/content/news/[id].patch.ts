import { and, eq, ne } from "drizzle-orm";
import { getRouterParam, readBody } from "h3";
import db from "../../../../../db/client";
import { adminAuditLog, mobileNewsPosts } from "../../../../../db/schema";
import { adminAuditValues, requireAdminAuth } from "../../../../utils/admin-auth";
import {
  assertAdminCorrectionTarget,
  assertMutableAdminNews,
  parseAdminNews,
  rethrowAdminNewsWriteConflict,
} from "../../../../utils/admin-content";
import { adminUuid } from "../../../../utils/admin-validation";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "content:write");
  const id = adminUuid(getRouterParam(event, "id"));
  const input = parseAdminNews(await readBody<Record<string, unknown>>(event));
  const [existing] = await db.select({ status: mobileNewsPosts.status }).from(mobileNewsPosts)
    .where(eq(mobileNewsPosts.id, id)).limit(1);
  if (!existing) throw createError({ statusCode: 404, statusMessage: "Content not found" });
  assertMutableAdminNews(existing);
  if (input.supersedesSlug) {
    const [[target], [existingReplacement]] = await Promise.all([
      db.select({ status: mobileNewsPosts.status, contentType: mobileNewsPosts.contentType })
        .from(mobileNewsPosts).where(eq(mobileNewsPosts.slug, input.supersedesSlug)).limit(1),
      db.select({ id: mobileNewsPosts.id }).from(mobileNewsPosts)
        .where(and(eq(mobileNewsPosts.supersedesSlug, input.supersedesSlug), ne(mobileNewsPosts.id, id))).limit(1),
    ]);
    assertAdminCorrectionTarget(input, target, existingReplacement, id);
  }
  const [duplicate] = await db.select({ id: mobileNewsPosts.id }).from(mobileNewsPosts)
    .where(eq(mobileNewsPosts.slug, input.slug)).limit(1);
  if (duplicate && duplicate.id !== id) throw createError({ statusCode: 409, statusMessage: "This slug already exists" });
  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.update(mobileNewsPosts).set({ ...input, updatedAt: new Date() })
      .where(and(eq(mobileNewsPosts.id, id), ne(mobileNewsPosts.status, "published")))
      .returning();
    if (!rows[0]) {
      const [current] = await tx.select({ status: mobileNewsPosts.status })
        .from(mobileNewsPosts).where(eq(mobileNewsPosts.id, id)).limit(1);
      if (!current) throw createError({ statusCode: 404, statusMessage: "Content not found" });
      assertMutableAdminNews(current);
      throw createError({ statusCode: 409, statusMessage: "Content changed while it was being updated" });
    }
    await tx.insert(adminAuditLog).values(adminAuditValues(
      event,
      "content.news.updated",
      "mobile_news_post",
      id,
      { status: input.status, contentType: input.contentType, slug: input.slug },
    ));
    return rows;
  }).catch(rethrowAdminNewsWriteConflict);
  return { data: updated };
});
