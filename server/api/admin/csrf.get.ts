import { getCookie, setCookie } from "h3";
import {
  adminCsrfCookieName,
  createAdminCsrfToken,
  validAdminCsrfToken,
} from "../../utils/admin-security";

export default defineEventHandler((event) => {
  const cookieName = adminCsrfCookieName();
  const existing = getCookie(event, cookieName);
  const token = validAdminCsrfToken(existing, existing) ? existing! : createAdminCsrfToken();
  setCookie(event, cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  });
  setHeader(event, "Cache-Control", "no-store");
  return { data: { csrfToken: token } };
});
