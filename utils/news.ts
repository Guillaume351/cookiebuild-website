export interface NewsPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverImageUrl: string | null;
  publishedAt: string | Date | null;
}

export function newsBodyText(body: string): string {
  return body.replace(/\\n/g, "\n").trim();
}

export function newsBulletLines(body: string): string[] | null {
  const lines = newsBodyText(body).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2 || lines.some((line) => !/^[-•]\s+/.test(line))) return null;
  return lines.map((line) => line.replace(/^[-•]\s+/, ""));
}

export function newsDate(value: string | Date | null, locale = "en-US"): string {
  if (!value) return "Published recently";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Published recently";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
