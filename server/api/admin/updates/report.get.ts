import { internalTextRequest } from "../../../services/admin-control-plane";
import { requireAdminAuth } from "../../../utils/admin-auth";
import { internalServiceConfig } from "../../../utils/admin-internal";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "updates:read");
  try {
    const content = await internalTextRequest({
      ...internalServiceConfig("updates"),
      path: "/v1/report.md",
      accept: "text/markdown",
    });
    setHeader(event, "Cache-Control", "no-store");
    return { data: { content } };
  } catch {
    throw createError({ statusCode: 502, statusMessage: "Update report is temporarily unavailable" });
  }
});
