import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { readBody } from "h3";
import db from "../../../../db/client";
import { opsActions } from "../../../../db/schema";
import { internalJsonRequest } from "../../../services/admin-control-plane";
import {
  enqueueSystemRuntimeCommand,
  setPaperMaintenance,
  waitForSystemRuntimeCommand,
} from "../../../services/admin-runtime-commands";
import { requireAdminAuth, requireRecentAdminAuth, writeAdminAudit } from "../../../utils/admin-auth";
import { internalServiceConfig } from "../../../utils/admin-internal";
import { adminText } from "../../../utils/admin-validation";

const ACTION_PATHS = {
  simulate: "/v1/actions/simulate",
  restart_minecraft: "/v1/actions/restart-minecraft",
  maintenance: "/v1/actions/maintenance",
} as const;

export default defineEventHandler(async (event) => {
  const auth = requireAdminAuth(event, "operations:write");
  const body = await readBody<Record<string, unknown>>(event);
  const action = adminText(body?.action, "action", 64) as keyof typeof ACTION_PATHS;
  if (!(action in ACTION_PATHS)) {
    throw createError({ statusCode: 400, statusMessage: "Unsupported operation" });
  }
  const reason = adminText(body?.reason, "reason", 500);
  if (!reason || reason.length < 8) {
    throw createError({ statusCode: 400, statusMessage: "A meaningful reason is required" });
  }
  const emergencyOverride = body?.emergencyOverride === true;
  if (emergencyOverride && auth.role !== "owner") {
    throw createError({ statusCode: 403, statusMessage: "Emergency override requires the owner role" });
  }
  if (action !== "simulate") requireRecentAdminAuth(event);
  const payload: Record<string, unknown> = { reason, force: emergencyOverride };
  const serverId = adminText(
    body?.serverId ?? process.env.NUXT_ADMIN_DEFAULT_SERVER_ID ?? "minecraft-1",
    "serverId",
    64,
  ) || "";
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(serverId)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid runtime server ID" });
  }
  payload.server_id = serverId;
  if (action === "maintenance") {
    if (typeof body?.enabled !== "boolean") {
      throw createError({ statusCode: 400, statusMessage: "enabled must be a boolean" });
    }
    payload.enabled = body.enabled;
  }
  if (action === "simulate") {
    const simulationAction = adminText(body?.simulationAction, "simulationAction", 32);
    if (simulationAction !== "restart-minecraft" && simulationAction !== "maintenance") {
      throw createError({ statusCode: 400, statusMessage: "Unsupported simulation action" });
    }
    payload.action = simulationAction;
    if (simulationAction === "maintenance") {
      if (typeof body?.enabled !== "boolean") {
        throw createError({ statusCode: 400, statusMessage: "enabled must be a boolean" });
      }
      payload.enabled = body.enabled;
    }
  }

  const id = randomUUID();
  const idempotencyKey = `admin-ops:${id}`;
  await db.insert(opsActions).values({ id, action, requestedBy: auth.uid, reason, payload });
  try {
    await db.update(opsActions).set({ status: "running", startedAt: new Date() }).where(eq(opsActions.id, id));
    if (action === "maintenance") {
      await setPaperMaintenance(serverId, payload.enabled === true, reason);
    }
    if (action === "restart_minecraft") {
      await setPaperMaintenance(serverId, true, `Redémarrage planifié : ${reason}`);
      const readinessId = await enqueueSystemRuntimeCommand({
        serverId,
        type: "restart_ready",
        payload: {},
      });
      const readiness = await waitForSystemRuntimeCommand(readinessId);
      if (readiness.ready !== true && !emergencyOverride) {
        await setPaperMaintenance(serverId, false, "Redémarrage annulé après préflight");
        throw new Error("Minecraft is not ready to restart");
      }
    }
    const result = await internalJsonRequest<Record<string, unknown>>({
      ...internalServiceConfig("operator"),
      path: ACTION_PATHS[action],
      method: "POST",
      body: payload,
      timeoutMs: action === "restart_minecraft" ? 300_000 : 30_000,
      idempotencyKey,
    });
    if (action === "maintenance") {
      result.paper = { serverId, maintenance: payload.enabled === true };
    }
    await db.update(opsActions).set({ status: "succeeded", completedAt: new Date(), result })
      .where(eq(opsActions.id, id));
    await writeAdminAudit(event, `operations.${action}`, "ops_action", id, { reason, emergencyOverride });
    return { data: { id, status: "succeeded", result } };
  } catch (error) {
    if (action === "maintenance") {
      await setPaperMaintenance(serverId, payload.enabled !== true, "Rollback après échec du runner")
        .catch(() => undefined);
    }
    if (action === "restart_minecraft") {
      await setPaperMaintenance(serverId, false, "Redémarrage interrompu").catch(() => undefined);
    }
    const rawMessage = error instanceof Error ? error.message : "";
    const failure = /^(Minecraft is not ready to restart|Runtime command timed out|Admin runtime bridge is disconnected|No AdminBridge queue accepted)/.test(rawMessage)
      ? rawMessage
      : "Operator request failed";
    await db.update(opsActions).set({
      status: "failed",
      completedAt: new Date(),
      error: failure,
    }).where(eq(opsActions.id, id));
    await writeAdminAudit(event, `operations.${action}.failed`, "ops_action", id, { reason, emergencyOverride });
    throw createError({
      statusCode: failure === "Minecraft is not ready to restart" ? 409 : failure === "Operator request failed" ? 502 : 503,
      statusMessage: failure,
    });
  }
});
