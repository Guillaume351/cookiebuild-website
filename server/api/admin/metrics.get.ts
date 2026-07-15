import { getQuery } from "h3";
import { requireAdminAuth } from "../../utils/admin-auth";
import { telemetryServiceUrl } from "../../utils/admin-internal";
import { ADMIN_METRIC_QUERIES, queryAdminMetric } from "../../services/admin-telemetry";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "dashboard:read");
  const requested = getQuery(event).key;
  const keys = typeof requested === "string" && requested
    ? [requested]
    : Object.keys(ADMIN_METRIC_QUERIES);
  if (keys.some((key) => !(key in ADMIN_METRIC_QUERIES))) {
    throw createError({ statusCode: 400, statusMessage: "Unsupported metric key" });
  }
  const baseUrl = telemetryServiceUrl("prometheus");
  const values = await Promise.all(keys.map(async (key) => {
    try {
      return [key, { ok: true, response: await queryAdminMetric({ baseUrl, key }) }] as const;
    } catch {
      return [key, { ok: false, response: null }] as const;
    }
  }));
  setHeader(event, "Cache-Control", "no-store");
  return { data: Object.fromEntries(values), generatedAt: new Date().toISOString() };
});
