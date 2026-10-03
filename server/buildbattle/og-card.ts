import { normalizeGalleryLocale, localizedThemeName, type GalleryLocale } from "../../shared/buildbattle-gallery";
import { getGalleryBuildCard, getGalleryBuildData } from "../services/buildbattle-gallery";
import { ByteLru } from "./lru";
import { renderBuildCard } from "./og-render";
import { decodeBuildPayload } from "./payload";

/** Rendered cards (~100–200 KiB each): at most 200 entries and 32 MiB per process. */
const cache = new ByteLru<Buffer>(200, 32 * 1024 * 1024);
const inFlight = new Map<string, Promise<Buffer>>();

export interface BuildCard {
  png: Buffer;
  etag: string;
  likeCount: number;
}

/** Loads (or reuses) the PNG share card of a published build. Hidden/private builds 404 before the cache. */
export async function buildShareCard(shortCode: string, localeInput: unknown): Promise<BuildCard> {
  const locale: GalleryLocale | null = normalizeGalleryLocale(localeInput);
  const row = await getGalleryBuildCard(shortCode);
  const likeCount = Number(row.likeCount);
  const key = `${row.id}:${likeCount}:${locale ?? "-"}`;
  const etag = `"og-${row.id}-${likeCount}-${locale ?? "x"}"`;
  const cached = cache.get(key);
  if (cached) return { png: cached, etag, likeCount };
  let pending = inFlight.get(key);
  if (!pending) {
    pending = (async () => {
      const payload = decodeBuildPayload(await getGalleryBuildData(row.id));
      const png = renderBuildCard({
        payload,
        theme: localizedThemeName(row.themeKey, row.themeName, locale),
        fallbackTheme: row.themeName,
        playerName: row.playerName ?? null,
        likeCount,
        locale,
      });
      cache.set(key, png);
      return png;
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return { png: await pending, etag, likeCount };
}
