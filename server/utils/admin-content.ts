import { createError } from "h3";
import { adminDate, adminHttpsUrl, adminSlug, adminText } from "./admin-validation";

export function parseAdminNews(value: Record<string, unknown>) {
  const status = value.status;
  const contentType = value.contentType;
  if (!["draft", "published", "archived"].includes(String(status))) {
    throw createError({ statusCode: 400, statusMessage: "Invalid news status" });
  }
  if (!["news", "changelog"].includes(String(contentType))) {
    throw createError({ statusCode: 400, statusMessage: "Invalid content type" });
  }
  const publishedAt = adminDate(value.publishedAt, "publishedAt")
    || (status === "published" ? new Date() : null);
  const expiresAt = adminDate(value.expiresAt, "expiresAt");
  if (expiresAt && publishedAt && expiresAt <= publishedAt) {
    throw createError({ statusCode: 400, statusMessage: "expiresAt must be after publishedAt" });
  }
  return {
    slug: adminSlug(value.slug),
    title: adminText(value.title, "title", 160)!,
    summary: adminText(value.summary, "summary", 500)!,
    body: adminText(value.body, "body", 20_000)!,
    contentType: contentType as "news" | "changelog",
    coverImageUrl: adminHttpsUrl(value.coverImageUrl, "coverImageUrl"),
    status: status as "draft" | "published" | "archived",
    publishedAt,
    expiresAt,
  };
}

export function parseAdminEvent(value: Record<string, unknown>) {
  const status = value.status;
  if (!["draft", "scheduled", "cancelled", "completed"].includes(String(status))) {
    throw createError({ statusCode: 400, statusMessage: "Invalid event status" });
  }
  const startsAt = adminDate(value.startsAt, "startsAt", true)!;
  const endsAt = adminDate(value.endsAt, "endsAt");
  if (endsAt && endsAt <= startsAt) {
    throw createError({ statusCode: 400, statusMessage: "endsAt must be after startsAt" });
  }
  return {
    slug: adminSlug(value.slug),
    title: adminText(value.title, "title", 160)!,
    description: adminText(value.description, "description", 20_000)!,
    gameType: adminText(value.gameType, "gameType", 64, false),
    imageUrl: adminHttpsUrl(value.imageUrl, "imageUrl"),
    startsAt,
    endsAt,
    status: status as "draft" | "scheduled" | "cancelled" | "completed",
  };
}
