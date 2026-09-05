export function commercePortalLoginUrl(value = process.env.COMMERCE_PORTAL_LOGIN_URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "billing.stripe.com" && !url.port && !url.username && !url.password
      && /^\/p\/login\/[A-Za-z0-9]+$/.test(url.pathname) && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
}
