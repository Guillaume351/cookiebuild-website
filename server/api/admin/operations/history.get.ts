import { desc } from "drizzle-orm";
import db from "../../../../db/client";
import { adminRuntimeEvents, opsActions } from "../../../../db/schema";
import { requireAdminAuth } from "../../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "operations:read");

  const [actions, runtimeEvents] = await Promise.all([
    db.select().from(opsActions).orderBy(desc(opsActions.requestedAt)).limit(100),
    db.select().from(adminRuntimeEvents).orderBy(desc(adminRuntimeEvents.observedAt)).limit(100),
  ]);

  setHeader(event, "Cache-Control", "no-store");
  return { data: { actions, runtimeEvents } };
});
