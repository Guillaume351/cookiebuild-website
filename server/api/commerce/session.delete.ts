import { deleteCookie } from "h3";
import { revokeCommerceSession } from "../../services/commerce-session";
import { commerceCsrfCookieName, commerceSessionCookieName } from "../../utils/commerce-security";

export default defineEventHandler(async (event) => {
  await revokeCommerceSession(event);
  deleteCookie(event, commerceSessionCookieName(), { path: "/" });
  deleteCookie(event, commerceCsrfCookieName(), { path: "/" });
  setResponseStatus(event, 204);
  return null;
});
