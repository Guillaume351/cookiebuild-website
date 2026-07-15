import { eq } from "drizzle-orm";
import { getRouterParam, readBody } from "h3";
import db from "../../../../../db/client";
import { adminAuditLog, mobileNewsPosts } from "../../../../../db/schema";
import { adminAuditValues, requireAdminAuth } from "../../../../utils/admin-auth";
import { parseAdminNews } from "../../../../utils/admin-content";
import { adminUuid } from "../../../../utils/admin-validation";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "content:write");
  const id = adminUuid(getRouterParam(event, "id"));
  const input = parseAdminNews(await readBody<Record<string, unknown>>(event));
  const [duplicate] = await db.select({ id: mobileNewsPosts.id }).from(mobileNewsPosts)
    .where(eq(mobileNewsPosts.slug, input.slug)).limit(1);
  if (duplicate && duplicate.id !== id) throw createError({ statusCode: 409, statusMessage: "This slug already exists" });
  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.update(mobileNewsPosts).set({ ...input, updatedAt: new Date() })
      .where(eq(mobileNewsPosts.id, id)).returning();
    if (!rows[0]) throw createError({ statusCode: 404, statusMessage: "Content not found" });
    await tx.insert(adminAuditLog).values(adminAuditValues(
      event,
      "content.news.updated",
      "mobile_news_post",
      id,
      { status: input.status, contentType: input.contentType, slug: input.slug },
    ));
    return rows;
  });
  return { data: updated };
});
