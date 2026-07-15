export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/admin/login") return;
  const user = useAdminUser();
  if (user.value) return;
  try {
    await loadAdminSession();
  } catch {
    return navigateTo({ path: "/admin/login", query: { next: to.fullPath } });
  }
});
