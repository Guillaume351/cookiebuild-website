import { getQuery } from "h3";
import { requireAdminAuth } from "../../utils/admin-auth";
import { telemetryServiceUrl } from "../../utils/admin-internal";
import { queryAdminLogs } from "../../services/admin-telemetry";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "dashboard:read");
  const query = getQuery(event);
  const key = typeof query.key === "string" ? query.key : "recent";
  const sinceMinutes = Number(query.sinceMinutes ?? 30);
  const limit = Number(query.limit ?? 200);
  let data: Record<string, unknown>;
  try {
    data = await queryAdminLogs({
      baseUrl: telemetryServiceUrl("loki"),
      key,
      sinceMinutes,
      limit,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unsupported log key") {
      throw createError({ statusCode: 400, statusMessage: error.message });
    }
    throw createError({ statusCode: 502, statusMessage: "Logs are temporarily unavailable" });
  }
  setHeader(event, "Cache-Control", "no-store");
  return { data };
});
