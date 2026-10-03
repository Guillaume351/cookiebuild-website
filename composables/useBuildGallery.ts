import {
  buildApiPath,
  type BuildDetail,
  type BuildPage,
  type BuildReportReason,
} from "@/utils/build-gallery";
import { BUILD_GALLERY_COPY } from "@/utils/build-gallery-copy";

export interface BuildListQuery {
  sort: "top" | "recent";
  period?: "week" | "month" | "all";
  limit?: number;
  cursor?: string | null;
  player?: string;
  locale?: string;
}

/**
 * Local front-end mock (no DB / backend needed): start the server with
 * COOKIEBUILD_BUILD_GALLERY_MOCK=1. The flag is read on the server and
 * hydrated to the client through the payload, so every call of a page
 * consistently uses either the mock or the real API.
 */
export function useBuildGalleryMock() {
  return useState<boolean>("build-gallery-mock", () => import.meta.server && process.env.COOKIEBUILD_BUILD_GALLERY_MOCK === "1");
}

function statusOf(error: unknown): number | undefined {
  const candidate = error as { statusCode?: number; status?: number; response?: { status?: number } } | null;
  return candidate?.statusCode ?? candidate?.status ?? candidate?.response?.status;
}

/** Thin client for the public gallery API (contract §3). */
export function useBuildApi() {
  const mock = useBuildGalleryMock();
  // Forwards the visitor's cookies during SSR so `liked` reflects the anonymous web cookie.
  const requestFetch = useRequestFetch() as <T>(url: string, options?: Record<string, unknown>) => Promise<T>;
  const loadMock = () => import("@/utils/build-gallery-mock");

  const cleanQuery = (query: BuildListQuery) => Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );

  return {
    mock,
    async list(query: BuildListQuery): Promise<BuildPage> {
      if (mock.value) return (await loadMock()).mockBuildPage(query);
      const response = await requestFetch<{ data: BuildPage }>("/api/builds", { query: cleanQuery(query) });
      return { items: response?.data?.items ?? [], nextCursor: response?.data?.nextCursor ?? null };
    },
    /** Returns null when the build does not exist (or is hidden/private). */
    async get(shortCode: string, locale: string): Promise<BuildDetail | null> {
      if (mock.value) return (await loadMock()).mockBuildDetail(shortCode);
      try {
        const response = await requestFetch<{ data: BuildDetail }>(buildApiPath(shortCode), { query: { locale } });
        return response?.data ?? null;
      } catch (error) {
        if (statusOf(error) === 404) return null;
        throw error;
      }
    },
    async blocks(shortCode: string): Promise<unknown> {
      if (mock.value) {
        const seed = Number.parseInt(shortCode.replace(/\D/g, ""), 10) || 0;
        return (await loadMock()).createMockBuildPayload(seed);
      }
      // gzip is decoded transparently by the browser (Content-Encoding: gzip).
      return $fetch(buildApiPath(shortCode, "/blocks"), { responseType: "json" });
    },
    async setLiked(shortCode: string, liked: boolean, currentCount: number): Promise<{ liked: boolean; likeCount: number }> {
      if (mock.value) return { liked, likeCount: Math.max(0, currentCount + (liked ? 1 : -1)) };
      const response = await $fetch<{ data: { liked: boolean; likeCount: number } }>(buildApiPath(shortCode, "/like"), {
        method: liked ? "POST" : "DELETE",
      });
      return response.data;
    },
    async report(shortCode: string, reason: BuildReportReason): Promise<void> {
      if (mock.value) return;
      await $fetch(buildApiPath(shortCode, "/report"), { method: "POST", body: { reason } });
    },
  };
}

/** Localized gallery copy for the current route. */
export function useBuildGalleryCopy() {
  const { locale } = useSiteLocale();
  const copy = computed(() => BUILD_GALLERY_COPY[locale.value.code]);
  const numberFormat = computed(() => new Intl.NumberFormat(locale.value.htmlLang));
  const formatLikes = (count: number) => copy.value.likes(count, numberFormat.value.format(count));
  const formatNumber = (value: number) => numberFormat.value.format(value);
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat(locale.value.htmlLang, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(date);
  };
  return { copy, formatLikes, formatNumber, formatDate };
}
