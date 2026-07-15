import { createError } from "h3";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function adminText(value: unknown, field: string, maximum: number, required = true) {
  if (value === undefined || value === null) {
    if (required) throw createError({ statusCode: 400, statusMessage: `${field} is required` });
    return null;
  }
  if (typeof value !== "string") throw createError({ statusCode: 400, statusMessage: `${field} must be text` });
  const text = value.trim();
  if (required && !text) throw createError({ statusCode: 400, statusMessage: `${field} is required` });
  if (text.length > maximum) throw createError({ statusCode: 400, statusMessage: `${field} is too long` });
  return text || null;
}

export function adminSlug(value: unknown) {
  const slug = adminText(value, "slug", 120);
  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: "slug must contain lowercase letters, numbers and hyphens" });
  }
  return slug;
}

export function adminUuid(value: unknown, field = "id") {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `${field} must be a UUID` });
  }
  return value;
}

export function adminDate(value: unknown, field: string, required = false) {
  if (value === undefined || value === null || value === "") {
    if (required) throw createError({ statusCode: 400, statusMessage: `${field} is required` });
    return null;
  }
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw createError({ statusCode: 400, statusMessage: `${field} must be an ISO date` });
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw createError({ statusCode: 400, statusMessage: `${field} must be an ISO date` });
  return date;
}

export function adminHttpsUrl(value: unknown, field: string) {
  const text = adminText(value, field, 2048, false);
  if (!text) return null;
  try {
    if (new URL(text).protocol !== "https:") throw new Error("not https");
  } catch {
    throw createError({ statusCode: 400, statusMessage: `${field} must be an HTTPS URL` });
  }
  return text;
}

export function adminLimit(value: unknown, fallback = 50, maximum = 200) {
  const number = Number(value ?? fallback);
  return Number.isInteger(number) && number >= 1 ? Math.min(number, maximum) : fallback;
}
