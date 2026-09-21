import { SITE_LOCALES } from "./site-locales";

interface PreviewPageRoute {
  path: string;
  alias?: string | string[];
  children?: PreviewPageRoute[];
}

const previewRoutes = new Set([
  "/nomad-wars",
  "/fat-king",
  "/updates/nomad-wars-preview",
  "/updates/fat-king-preview",
  "/maps",
  "/maps/:slug",
]);

/** Apply aliases after Nuxt has read custom article paths from definePageMeta. */
export function addLocalizedPreviewAliases(pages: PreviewPageRoute[], parentPath = "") {
  for (const page of pages) {
    const path = page.path.startsWith("/")
      ? page.path
      : `${parentPath}/${page.path}`.replace(/\/$/, "");
    // Nuxt represents a required dynamic segment as :slug().
    if (previewRoutes.has(path.replace(/\(\)/g, ""))) {
      const existing = typeof page.alias === "string" ? [page.alias] : page.alias || [];
      page.alias = [...new Set([
        ...existing,
        ...SITE_LOCALES.filter((locale) => locale.pathSegment)
          .map((locale) => `/${locale.pathSegment}${path}`),
      ])];
    }
    if (page.children) addLocalizedPreviewAliases(page.children, path);
  }
}
