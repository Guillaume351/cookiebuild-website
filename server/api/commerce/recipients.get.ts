import { getQuery, getRequestIP } from "h3";
import { lookupCommerceRecipients } from "../../services/commerce-recipients";
import { enforceCommerceRateLimit } from "../../utils/commerce-security";
export default defineEventHandler(async event => {
  enforceCommerceRateLimit(`recipient:${getRequestIP(event, { xForwardedFor: true }) || "unknown"}`, 30, 60_000);
  setHeader(event, "Cache-Control", "no-store");
  return { data: await lookupCommerceRecipients(getQuery(event).q) };
});
