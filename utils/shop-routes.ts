/** Retain legacy bookmarks, including checkout queries and client-side fragments. */
export function legacyShopRedirect(fullPath: string): string | null {
  return /^\/(?:fr\/|de\/|it\/|bg\/|es\/|hi\/|pt-br\/)?cosmetics(?:[/?#]|$)/.test(fullPath)
    ? fullPath.replace(/\/cosmetics(?=[/?#]|$)/, "/shop")
    : null;
}
