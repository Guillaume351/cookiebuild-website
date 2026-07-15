import { createError } from "h3";

export function internalServiceConfig(kind: "operator" | "updates") {
  const prefix = kind === "operator" ? "OPERATOR" : "UPDATE_MONITOR";
  const baseUrl = process.env[`NUXT_${prefix}_URL`]?.trim();
  const secret = process.env[`NUXT_${prefix}_HMAC_SECRET`]?.trim();
  if (!baseUrl || !secret || secret.length < 32) {
    throw createError({ statusCode: 503, statusMessage: `${kind} service is not configured` });
  }
  return { baseUrl, secret };
}

export function telemetryServiceUrl(kind: "prometheus" | "loki") {
  const variable = kind === "prometheus" ? "NUXT_PROMETHEUS_URL" : "NUXT_LOKI_URL";
  const url = process.env[variable]?.trim();
  if (!url) throw createError({ statusCode: 503, statusMessage: `${kind} service is not configured` });
  return url;
}

export function safeAdminServiceError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/HTTP \d{3}$/.test(message)) return message;
  return fallback;
}
