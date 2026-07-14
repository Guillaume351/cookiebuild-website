import { createHmac } from "node:crypto";
import { createError } from "h3";

const LINK_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
const QUIET_HOUR_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function bearerToken(authorization: string | undefined) {
  if (!authorization) return undefined;
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());
  return match?.[1];
}

export function normalizeLinkCode(value: unknown) {
  const code = String(value ?? "").trim().toUpperCase();
  if (!LINK_CODE_PATTERN.test(code)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid link code" });
  }
  return code;
}

export function linkCodeHmac(code: string, pepper: string) {
  if (!isValidLinkPepper(pepper)) {
    throw new Error("MOBILE_LINK_PEPPER must be configured with at least 32 characters");
  }
  return createHmac("sha256", pepper).update(code, "utf8").digest("hex");
}

export function isValidLinkPepper(pepper: string | undefined) {
  if (!pepper || pepper.length < 32) return false;
  const normalized = pepper.toLowerCase();
  return !normalized.includes("replace-with")
    && !normalized.includes("change-me")
    && !normalized.includes("your-secret")
    && !normalized.includes("example");
}

export function requiredString(
  value: unknown,
  field: string,
  { minimum = 1, maximum }: { minimum?: number; maximum: number },
) {
  const result = String(value ?? "").trim();
  if (result.length < minimum || result.length > maximum) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${field}` });
  }
  return result;
}

export function optionalString(value: unknown, field: string, maximum: number) {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value, field, { maximum });
}

export function optionalQuietHour(value: unknown, field: string) {
  const result = optionalString(value, field, 5);
  if (result !== null && !QUIET_HOUR_PATTERN.test(result)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${field}` });
  }
  return result;
}

export function positiveInteger(value: unknown, fallback: number, maximum: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export function optionalBoolean(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${field}` });
  }
  return value;
}
