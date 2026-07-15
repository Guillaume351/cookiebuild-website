import { and, desc, gt, isNull, or } from "drizzle-orm";
import db from "../../../../db/client";
import {
  adminCommands,
  adminRuntimeEvents,
  adminRuntimeSnapshots,
  moderationActions,
} from "../../../../db/schema";
import { adminRuntimeBus } from "../../../services/admin-runtime-bus";
import { requireAdminAuth } from "../../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "runtime:read");
  const now = new Date();
  const [snapshots, commands, events, sanctions] = await Promise.all([
    db.select().from(adminRuntimeSnapshots).orderBy(desc(adminRuntimeSnapshots.observedAt)),
    db.select().from(adminCommands).orderBy(desc(adminCommands.createdAt)).limit(100),
    db.select().from(adminRuntimeEvents).orderBy(desc(adminRuntimeEvents.observedAt)).limit(100),
    db.select().from(moderationActions).where(and(
      isNull(moderationActions.revokedAt),
      or(isNull(moderationActions.expiresAt), gt(moderationActions.expiresAt, now)),
    )).orderBy(desc(moderationActions.createdAt)).limit(200),
  ]);
  setHeader(event, "Cache-Control", "no-store");
  return { data: {
    generatedAt: now.toISOString(),
    bridge: { configured: adminRuntimeBus().configured, connected: adminRuntimeBus().connected },
    snapshots,
    commands,
    events,
    sanctions,
  } };
});
