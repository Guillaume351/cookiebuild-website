import { getHeader, sendRedirect, setHeader, type H3Event } from "h3";
import { appLinkFallback } from "./app-links";

/** Browser fallback for https://www.cookie-build.com/app/* universal/app links. */
export function redirectAppLinkFallback(event: H3Event) {
  setHeader(event, "Cache-Control", "no-store");
  setHeader(event, "Vary", "User-Agent, Accept-Language");
  setHeader(event, "X-Robots-Tag", "noindex");
  return sendRedirect(
    event,
    appLinkFallback(getHeader(event, "user-agent"), getHeader(event, "accept-language")),
    302,
  );
}
