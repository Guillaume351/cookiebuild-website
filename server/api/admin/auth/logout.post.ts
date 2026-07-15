import { deleteCookie } from "h3";
import { requireAdminAuth, writeAdminAudit } from "../../../utils/admin-auth";
import { adminCsrfCookieName, adminSessionCookieName } from "../../../utils/admin-security";

export default defineEventHandler(async (event) => {
  const auth = requireAdminAuth(event);
  await writeAdminAudit(event, "auth.logout", "admin_session", auth.uid);
  deleteCookie(event, adminSessionCookieName(), { path: "/" });
  deleteCookie(event, adminCsrfCookieName(), { path: "/" });
  setResponseStatus(event, 204);
  return null;
});
