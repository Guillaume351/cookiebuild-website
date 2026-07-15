import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import db from "../../db/client";
import { adminCommands } from "../../db/schema";
import { adminRuntimeBus } from "./admin-runtime-bus";

export async function enqueueSystemRuntimeCommand(input: {
  serverId: string;
  type: "maintenance" | "restart_ready";
  payload: Record<string, unknown>;
  ttlMs?: number;
}) {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(input.serverId)) throw new Error("Invalid runtime server ID");
  const now = new Date();
  const ttlMs = Math.min(Math.max(input.ttlMs ?? 30_000, 10_000), 300_000);
  const expiresAt = new Date(now.getTime() + ttlMs);
  const id = randomUUID();
  const envelope = {
    id,
    type: input.type,
    target_type: "server",
    target_id: input.serverId,
    payload: input.payload,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    idempotency_key: `admin-system:${id}`,
  };
  await db.insert(adminCommands).values({
    id,
    type: input.type,
    targetType: "server",
    targetId: input.serverId,
    payload: input.payload,
    expiresAt,
    idempotencyKey: envelope.idempotency_key,
  });
  try {
    await adminRuntimeBus().publish(input.serverId, envelope, ttlMs);
    return id;
  } catch (error) {
    await db.update(adminCommands).set({ status: "failed", completedAt: new Date(), error: "Runtime bridge is unavailable" })
      .where(eq(adminCommands.id, id));
    throw error;
  }
}

export async function waitForSystemRuntimeCommand(id: string, timeoutMs = 15_000) {
  const deadline = Date.now() + Math.min(Math.max(timeoutMs, 1_000), 30_000);
  while (Date.now() < deadline) {
    const [command] = await db.select({
      status: adminCommands.status,
      result: adminCommands.result,
      error: adminCommands.error,
    }).from(adminCommands).where(eq(adminCommands.id, id)).limit(1);
    if (command?.status === "succeeded") return command.result || {};
    if (command && ["failed", "expired", "cancelled"].includes(command.status)) {
      throw new Error(command.error || `Runtime command ${command.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Runtime command timed out");
}

export async function setPaperMaintenance(serverId: string, enabled: boolean, reason: string) {
  const id = await enqueueSystemRuntimeCommand({
    serverId,
    type: "maintenance",
    payload: { enabled, message: reason },
  });
  return waitForSystemRuntimeCommand(id);
}
