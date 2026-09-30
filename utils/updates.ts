import type { NewsPost } from "./news";

export type UpdateContentType = "news" | "changelog";

export interface UpdatePost extends NewsPost {
  contentType: UpdateContentType;
  supersedesSlug?: string | null;
  supersededBySlug?: string | null;
}

/** Fields the updates list needs; full bodies stay on each article page. */
export type UpdateListItem = Omit<UpdatePost, "body"> & { body: "" };

export const UPDATES_PAGE_SIZE = 10;

export function toUpdateListItem(post: UpdatePost): UpdateListItem {
  return {
    id: post.id,
    slug: post.slug,
    contentType: post.contentType,
    title: post.title,
    summary: post.summary,
    body: "",
    coverImageUrl: post.coverImageUrl,
    publishedAt: post.publishedAt,
    supersedesSlug: post.supersedesSlug ?? null,
    supersededBySlug: post.supersededBySlug ?? null,
  };
}

export function paginateUpdates<T>(items: readonly T[], requestedPage: number, pageSize = UPDATES_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), pageCount);
  return {
    page,
    pageCount,
    items: items.slice((page - 1) * pageSize, page * pageSize),
  };
}

export interface NetworkEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  gameType: string | null;
  imageUrl: string | null;
  startsAt: string | Date;
  endsAt: string | Date | null;
}

function validDate(value: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function updateTypeLabel(contentType: UpdateContentType): string {
  return contentType === "news" ? "News" : "Release note";
}

export function updateSlugFromHash(hash: string): string | null {
  const match = /^#(?:update|news)-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(hash);
  return match?.[1] ?? null;
}

export function isEventLive(event: NetworkEvent, now = new Date()): boolean {
  const startsAt = validDate(event.startsAt);
  if (!startsAt || startsAt > now) return false;

  const endsAt = validDate(event.endsAt);
  if (endsAt) return endsAt > now;

  // Events without an explicit end remain current for a normal play-session window.
  return now.getTime() - startsAt.getTime() < 3 * 60 * 60 * 1_000;
}

export function featuredEvent(
  events: NetworkEvent[],
  now = new Date(),
): NetworkEvent | null {
  const live = events.find((event) => isEventLive(event, now));
  if (live) return live;

  return events
    .filter((event) => {
      const startsAt = validDate(event.startsAt);
      return startsAt !== null && startsAt > now;
    })
    .sort((left, right) => {
      const leftDate = validDate(left.startsAt);
      const rightDate = validDate(right.startsAt);
      return (leftDate?.getTime() ?? 0) - (rightDate?.getTime() ?? 0);
    })[0] ?? null;
}

export function eventDate(
  value: string | Date,
  locale = "en-US",
  timeZone = "Europe/Paris",
): string {
  const date = validDate(value);
  if (!date) return "Date to be announced";

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

export function eventDateTime(value: string | Date): string | undefined {
  return validDate(value)?.toISOString();
}

/**
 * Update posts are written once, in English or French, without a language
 * field. French is recognised from accents and frequent function words so each
 * article gets one canonical URL in its own language and a correct `lang`.
 */
const FRENCH_MARKERS = /[àâçéèêëîïôœùûü]|\b(?:le|la|les|des|du|de la|et|pour|dans|avec|sur|ton|ta|tes|votre|vos|nos|notre|une|plus|est|sont|au|aux)\b/giu;
const ENGLISH_MARKERS = /\b(?:the|and|for|with|your|our|is|are|of|to|in|on|now|more|new)\b/giu;

export function updateLanguage(post: Pick<UpdatePost, "title" | "summary">): "fr" | "en" {
  const text = `${post.title} ${post.summary}`;
  const french = text.match(FRENCH_MARKERS)?.length ?? 0;
  const english = text.match(ENGLISH_MARKERS)?.length ?? 0;
  return french > english ? "fr" : "en";
}

export const COOKIE_BUILD_ORGANIZATION_ID = "https://www.cookie-build.com/#organization";

/** schema.org BlogPosting/NewsArticle for one update permalink. */
export function updateArticleJsonLd(post: UpdatePost, url: string) {
  const published = validDate(post.publishedAt);
  return {
    "@type": post.contentType === "news" ? "NewsArticle" : "BlogPosting",
    "@id": `${url}#article`,
    inLanguage: updateLanguage(post),
    headline: post.title.slice(0, 110),
    description: post.summary,
    url,
    mainEntityOfPage: url,
    image: post.coverImageUrl || "https://www.cookie-build.com/cookie-build-social.webp",
    ...(published ? { datePublished: published.toISOString(), dateModified: published.toISOString() } : {}),
    author: { "@id": COOKIE_BUILD_ORGANIZATION_ID, "@type": "Organization", name: "Cookie Build", url: "https://www.cookie-build.com/" },
    publisher: {
      "@id": COOKIE_BUILD_ORGANIZATION_ID,
      "@type": "Organization",
      name: "Cookie Build",
      logo: { "@type": "ImageObject", url: "https://www.cookie-build.com/android-chrome-512x512.png", width: 512, height: 512 },
    },
  };
}
