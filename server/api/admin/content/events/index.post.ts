import { eq } from "drizzle-orm";
import { readBody } from "h3";
import db from "../../../../../db/client";
import { adminAuditLog, mobileEvents } from "../../../../../db/schema";
import { adminAuditValues, requireAdminAuth } from "../../../../utils/admin-auth";
import { parseAdminEvent } from "../../../../utils/admin-content";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "content:write");
  const input = parseAdminEvent(await readBody<Record<string, unknown>>(event));
  const [duplicate] = await db.select({ id: mobileEvents.id }).from(mobileEvents)
    .where(eq(mobileEvents.slug, input.slug)).limit(1);
  if (duplicate) throw createError({ statusCode: 409, statusMessage: "This slug already exists" });
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(mobileEvents).values(input).returning();
    await tx.insert(adminAuditLog).values(adminAuditValues(
      event,
      "content.event.created",
      "mobile_event",
      rows[0]!.id,
      { status: input.status, slug: input.slug },
    ));
    return rows;
  });
  setResponseStatus(event, 201);
  return { data: created };
});
