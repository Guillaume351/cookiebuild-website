/**
 * One URL per page: "/fr/" and "/games/" permanently redirect to the
 * slash-less canonical form used by canonicals, hreflang and the sitemap.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path.length <= 1 || !to.path.endsWith("/")) return;
  const path = to.path.replace(/\/+$/, "") || "/";
  return navigateTo({ path, query: to.query, hash: to.hash }, { redirectCode: 301, replace: true });
});
