import { internalJsonRequest } from "../../../services/admin-control-plane";
import { requireAdminAuth } from "../../../utils/admin-auth";
import { internalServiceConfig } from "../../../utils/admin-internal";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "operations:read");
  const service = internalServiceConfig("operator");
  try {
    const data = await internalJsonRequest<Record<string, unknown>>({
      ...service,
      path: "/v1/status",
    });
    setHeader(event, "Cache-Control", "no-store");
    return { data };
  } catch {
    throw createError({ statusCode: 502, statusMessage: "Operator is temporarily unavailable" });
  }
});
