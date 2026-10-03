import { getHeader, getRouterParam, sendRedirect, setHeader } from "h3";
import { BUILD_SHORT_CODE_PATTERN } from "../../../shared/buildbattle-gallery";
import { shortLinkTarget } from "../../buildbattle/short-link";

/** /b/<shortCode> (printed in game chat) → localized build page. */
export default defineEventHandler((event) => {
  const code = getRouterParam(event, "code") ?? "";
  setHeader(event, "Cache-Control", "no-store");
  setHeader(event, "Vary", "Accept-Language");
  setHeader(event, "X-Robots-Tag", "noindex");
  if (!BUILD_SHORT_CODE_PATTERN.test(code)) return sendRedirect(event, "/builds", 302);
  return sendRedirect(event, shortLinkTarget(code, getHeader(event, "accept-language")), 302);
});
