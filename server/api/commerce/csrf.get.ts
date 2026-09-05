import { getCookie, setCookie } from "h3";
import { commerceCsrfCookieName, createCommerceToken, validCommerceToken } from "../../utils/commerce-security";

export default defineEventHandler((event) => {
  const cookieName = commerceCsrfCookieName();
  const existing = getCookie(event, cookieName);
  const token = validCommerceToken(existing) ? existing : createCommerceToken();
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
