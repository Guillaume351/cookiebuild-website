import { legacyShopRedirect } from "../utils/shop-routes";

export default defineNuxtRouteMiddleware((to) => {
  const target = legacyShopRedirect(to.fullPath);
  if (target) return navigateTo(target, { redirectCode: 301, replace: true });
});
