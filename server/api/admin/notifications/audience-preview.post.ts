import { readBody } from "h3";
import { requireAdminAuth } from "../../../utils/admin-auth";
import {
  parseAdminAudience,
  parseAdminNotificationKind,
  resolveAdminNotificationAudience,
} from "../../../services/admin-notifications";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "notifications:read");
  const body = await readBody<{ kind?: unknown; audience?: unknown }>(event);
  const kind = parseAdminNotificationKind(body.kind);
  const audience = parseAdminAudience(body.audience);
  const resolved = await resolveAdminNotificationAudience(kind, audience);
  return { data: { kind, audience, recipientEstimate: resolved.estimate } };
});
