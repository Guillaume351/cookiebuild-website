import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { readBody } from "h3";
import db from "../../../../db/client";
import { adminCommands } from "../../../../db/schema";
import { adminRuntimeBus } from "../../../services/admin-runtime-bus";
import { requireAdminAuth, requireRecentAdminAuth, writeAdminAudit } from "../../../utils/admin-auth";
import { type AdminPermission } from "../../../utils/admin-rbac";
import { adminText, adminUuid } from "../../../utils/admin-validation";

type CommandDefinition = {
  permission: AdminPermission;
  target: "none" | "server" | "game" | "player";
  payload: (input: Record<string, unknown>, auth: ReturnType<typeof requireAdminAuth>) => Record<string, unknown>;
};

const optionalMessage = (input: Record<string, unknown>) => ({
  message: adminText(input.message, "message", 500, false),
});
const requiredMessage = (input: Record<string, unknown>) => ({
  message: adminText(input.message, "message", 500),
});
const reasonPayload = (input: Record<string, unknown>) => ({
  reason: adminText(input.reason, "reason", 500),
});
const moderationPayload = (
  input: Record<string, unknown>,
  auth: ReturnType<typeof requireAdminAuth>,
) => ({
  ...reasonPayload(input),
  player_name: adminText(input.player_name, "player_name", 64, false),
  duration_seconds: input.duration_seconds === undefined ? undefined : boundedDuration(input.duration_seconds),
  actor_id: auth.uid,
  actor_display_name: auth.displayName || auth.email,
});

function boundedDuration(value: unknown) {
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 365 * 24 * 60 * 60) {
    throw createError({ statusCode: 400, statusMessage: "duration_seconds is outside the allowed range" });
  }
  return seconds;
}

const COMMANDS: Record<string, CommandDefinition> = {
  message_all: { permission: "runtime:write", target: "server", payload: requiredMessage },
  message_lobby: { permission: "runtime:write", target: "server", payload: requiredMessage },
  message_game: { permission: "runtime:write", target: "game", payload: requiredMessage },
  message_player: { permission: "moderation:write", target: "player", payload: requiredMessage },
  kick: { permission: "moderation:write", target: "player", payload: reasonPayload },
  return_lobby: { permission: "moderation:write", target: "player", payload: () => ({}) },
  ban_temp: { permission: "moderation:write", target: "player", payload: moderationPayload },
  ban_permanent: { permission: "moderation:write", target: "player", payload: moderationPayload },
  mute: { permission: "moderation:write", target: "player", payload: moderationPayload },
  unmute: { permission: "moderation:write", target: "player", payload: (_input, auth) => ({ actor_id: auth.uid }) },
  unban: { permission: "moderation:write", target: "player", payload: (_input, auth) => ({ actor_id: auth.uid }) },
  rally: { permission: "runtime:write", target: "server", payload: (input) => ({
    gamemode: adminText(input.gamemode, "gamemode", 64),
  }) },
  close_admissions: { permission: "moderation:write", target: "game", payload: () => ({}) },
  reopen_admissions: { permission: "moderation:write", target: "game", payload: () => ({}) },
  safe_cancel: { permission: "moderation:write", target: "game", payload: reasonPayload },
  maintenance: { permission: "operations:write", target: "server", payload: (input) => ({
    enabled: input.enabled === true,
    ...optionalMessage(input),
  }) },
  drain: { permission: "operations:write", target: "server", payload: optionalMessage },
  restart_ready: { permission: "operations:read", target: "server", payload: () => ({}) },
};

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event);
  const type = adminText(body?.type, "type", 64)?.toLowerCase() || "";
  const definition = COMMANDS[type];
  if (!definition) throw createError({ statusCode: 400, statusMessage: "Unsupported admin command" });
  const auth = requireAdminAuth(event, definition.permission);
  if (["ban_permanent", "safe_cancel", "maintenance", "drain"].includes(type)) {
    requireRecentAdminAuth(event);
  }
  const serverId = adminText(body?.serverId, "serverId", 64) || "";
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(serverId)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid runtime server ID" });
  }
  const targetId = definition.target === "player" || definition.target === "game"
    ? adminUuid(body?.targetId, "targetId")
    : definition.target === "server" ? serverId : null;
  if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    throw createError({ statusCode: 400, statusMessage: "payload must be an object" });
  }
  const payload = definition.payload(body.payload as Record<string, unknown>, auth);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60_000);
  const id = randomUUID();
  const idempotencyKey = `admin-command:${id}`;
  const envelope = {
    id,
    type,
    target_type: definition.target,
    target_id: targetId,
    payload,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    idempotency_key: idempotencyKey,
  };
  await db.insert(adminCommands).values({
    id,
    type,
    targetType: definition.target,
    targetId,
    payload,
    expiresAt,
    idempotencyKey,
  });
  try {
    await adminRuntimeBus().publish(serverId, envelope, expiresAt.getTime() - now.getTime());
    await writeAdminAudit(event, `runtime.${type}`, definition.target, targetId, {
      commandId: id,
      serverId,
    });
    return { data: { id, status: "pending", expiresAt: expiresAt.toISOString() } };
  } catch {
    await db.update(adminCommands).set({
      status: "failed",
      completedAt: new Date(),
      error: "Runtime bridge is unavailable",
    }).where(eq(adminCommands.id, id));
    await writeAdminAudit(event, `runtime.${type}.failed`, definition.target, targetId, {
      commandId: id,
      serverId,
    });
    throw createError({ statusCode: 503, statusMessage: "Runtime bridge is unavailable" });
  }
});
