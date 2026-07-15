import { eq } from "drizzle-orm";
import { getRouterParam, readBody } from "h3";
import db from "../../../../../db/client";
import { adminAuditLog, mobileEvents } from "../../../../../db/schema";
import { adminAuditValues, requireAdminAuth } from "../../../../utils/admin-auth";
import { parseAdminEvent } from "../../../../utils/admin-content";
import { adminUuid } from "../../../../utils/admin-validation";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "content:write");
  const id = adminUuid(getRouterParam(event, "id"));
  const input = parseAdminEvent(await readBody<Record<string, unknown>>(event));
  const [duplicate] = await db.select({ id: mobileEvents.id }).from(mobileEvents)
    .where(eq(mobileEvents.slug, input.slug)).limit(1);
  if (duplicate && duplicate.id !== id) throw createError({ statusCode: 409, statusMessage: "This slug already exists" });
  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.update(mobileEvents).set({ ...input, updatedAt: new Date() })
      .where(eq(mobileEvents.id, id)).returning();
    if (!rows[0]) throw createError({ statusCode: 404, statusMessage: "Event not found" });
    await tx.insert(adminAuditLog).values(adminAuditValues(
      event,
      "content.event.updated",
      "mobile_event",
      id,
      { status: input.status, slug: input.slug },
    ));
    return rows;
  });
  return { data: updated };
});
