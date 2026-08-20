import type { NewsPost } from "./news";

export type UpdateContentType = "news" | "changelog";

export interface UpdatePost extends NewsPost {
  contentType: UpdateContentType;
  supersedesSlug?: string | null;
  supersededBySlug?: string | null;
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
