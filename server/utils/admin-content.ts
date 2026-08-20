import { createError } from "h3";
import { adminDate, adminHttpsUrl, adminSlug, adminText } from "./admin-validation";

function postgresCode(error: unknown): string | undefined {
  let current: unknown = error;
  const visited = new Set<object>();
  while (typeof current === "object" && current !== null && !visited.has(current)) {
    visited.add(current);
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

export function rethrowAdminNewsWriteConflict(error: unknown): never {
  if (postgresCode(error) === "23505") {
    throw createError({
      statusCode: 409,
      statusMessage: "This slug or correction target is already in use",
    });
  }
  throw error;
}

export function assertMutableAdminNews(existing: { status: string } | null | undefined) {
  if (existing?.status !== "draft") {
    throw createError({
      statusCode: 409,
      statusMessage: existing?.status === "published"
        ? "Published updates are immutable; create a new correction instead"
        : "Only draft updates can be edited",
    });
  }
}

export function assertAdminCorrectionTarget(
  input: { supersedesSlug: string | null; contentType: string },
  target: { status: string; contentType: string } | null | undefined,
  existingReplacement: { id: string } | null | undefined,
  currentId?: string,
) {
  if (!input.supersedesSlug) return;
  if (!target || target.status !== "published") {
    throw createError({ statusCode: 409, statusMessage: "A correction must reference a published update" });
  }
  if (target.contentType !== input.contentType) {
    throw createError({ statusCode: 409, statusMessage: "A correction must keep the original content type" });
  }
  if (existingReplacement && existingReplacement.id !== currentId) {
    throw createError({ statusCode: 409, statusMessage: "This update already has a correction" });
  }
}

export function parseAdminNews(value: Record<string, unknown>) {
  const status = value.status;
  const contentType = value.contentType;
  if (status !== "draft") {
    throw createError({
      statusCode: 400,
      statusMessage: "Admin updates must remain drafts; publish a versioned changelog JSON file",
    });
  }
  if (!["news", "changelog"].includes(String(contentType))) {
    throw createError({ statusCode: 400, statusMessage: "Invalid content type" });
  }
  const slug = adminSlug(value.slug);
  const supersedesSlug = value.supersedesSlug == null || value.supersedesSlug === ""
    ? null
    : adminSlug(value.supersedesSlug);
  if (supersedesSlug === slug) {
    throw createError({ statusCode: 400, statusMessage: "An update cannot correct itself" });
  }
  return {
    slug,
    title: adminText(value.title, "title", 160)!,
    summary: adminText(value.summary, "summary", 500)!,
    body: adminText(value.body, "body", 20_000)!,
    contentType: contentType as "news" | "changelog",
    coverImageUrl: adminHttpsUrl(value.coverImageUrl, "coverImageUrl"),
    supersedesSlug,
    status: "draft" as const,
    publishedAt: null,
    expiresAt: null,
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
