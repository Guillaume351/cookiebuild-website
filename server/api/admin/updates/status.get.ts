import { internalJsonRequest } from "../../../services/admin-control-plane";
import { requireAdminAuth } from "../../../utils/admin-auth";
import { internalServiceConfig } from "../../../utils/admin-internal";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "updates:read");
  try {
    const data = await internalJsonRequest<Record<string, unknown>>({
      ...internalServiceConfig("updates"),
      path: "/v1/status",
    });
    setHeader(event, "Cache-Control", "no-store");
    return { data };
  } catch {
    throw createError({ statusCode: 502, statusMessage: "Update monitor is temporarily unavailable" });
  }
});
