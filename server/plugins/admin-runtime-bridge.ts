import { eq, lt, lte, sql } from "drizzle-orm";
import db from "../../db/client";
import { adminCommands, adminRuntimeEvents, adminRuntimeSnapshots } from "../../db/schema";
import { adminRuntimeBus } from "../services/admin-runtime-bus";

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SERVER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

function requiredText(value: unknown, name: string, pattern?: RegExp) {
  if (typeof value !== "string" || !value || (pattern && !pattern.test(value))) {
    throw new Error(`Invalid runtime event ${name}`);
  }
  return value;
}

async function persistRuntimeEvent(_routingKey: string, envelope: Record<string, unknown>) {
  const eventId = requiredText(envelope.event_id, "event_id", ID_PATTERN);
  const type = requiredText(envelope.type, "type", /^[a-z][a-z0-9_]{0,63}$/);
  const serverId = requiredText(envelope.server_id, "server_id", SERVER_PATTERN);
  const observedAt = new Date(requiredText(envelope.occurred_at, "occurred_at"));
  const payload = envelope.data;
  if (Number.isNaN(observedAt.getTime()) || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid runtime event payload");
  }
  const data = payload as Record<string, unknown>;

  if (type === "snapshot") {
    await db.insert(adminRuntimeSnapshots).values({
      serverId,
      sequence: 1,
      payload: data,
      observedAt,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: adminRuntimeSnapshots.serverId,
      set: {
        sequence: sql`${adminRuntimeSnapshots.sequence} + 1`,
        payload: data,
        observedAt,
        updatedAt: new Date(),
      },
      setWhere: lte(adminRuntimeSnapshots.observedAt, observedAt),
    });
    return;
  }

  const inserted = await db.insert(adminRuntimeEvents).values({
    eventId,
    serverId,
    kind: type,
    payload: data,
    observedAt,
  }).onConflictDoNothing({ target: adminRuntimeEvents.eventId }).returning({ id: adminRuntimeEvents.id });
  if (!inserted.length || type !== "command_result") return;

  const commandId = requiredText(data.command_id, "data.command_id", ID_PATTERN);
  const status = data.status === "completed" ? "succeeded"
    : data.status === "expired" ? "expired"
      : "failed";
  const result = data.result && typeof data.result === "object" && !Array.isArray(data.result)
    ? data.result as Record<string, unknown>
    : null;
  const error = typeof data.error === "string" ? data.error.slice(0, 2_000) : null;
  await db.update(adminCommands).set({
    status,
    completedAt: observedAt,
    result,
    error,
  }).where(eq(adminCommands.id, commandId));
}

export default defineNitroPlugin((nitroApp) => {
  const bus = adminRuntimeBus();
  bus.start(persistRuntimeEvent);
  const retention = setInterval(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    void db.delete(adminRuntimeEvents).where(lt(adminRuntimeEvents.createdAt, cutoff)).catch(() => undefined);
  }, 60 * 60_000);
  retention.unref();
  nitroApp.hooks.hook("close", () => {
    clearInterval(retention);
    return bus.stop();
  });
});
