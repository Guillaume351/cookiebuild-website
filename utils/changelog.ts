export interface ChangelogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverImageUrl: string | null;
  publishedAt: string | Date | null;
}

export function changelogBodyLines(body: string): string[] {
  return body
    .split(/\r?\n|\\n/)
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

export function changelogDate(value: string | Date | null, locale = "en-US"): string {
  if (!value) return "Coming soon";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Coming soon";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
