import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { boundedResponseText } from "../utils/bounded-response";

const MAX_INTERNAL_RESPONSE_BYTES = 1_048_576;

export interface InternalRequestSignature {
  timestamp: string;
  nonce: string;
  signature: string;
  bodyHash: string;
}

export interface InternalServiceRequest {
  baseUrl: string;
  path: string;
  secret: string;
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
  accept?: string;
  idempotencyKey?: string;
}

function bodyText(body: unknown) {
  return body === undefined ? "" : JSON.stringify(body);
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function canonicalInternalRequest(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyHash: string,
) {
  return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join("\n");
}

export function signInternalRequest(input: {
  method: string;
  path: string;
  secret: string;
  body?: unknown;
  timestamp?: string;
  nonce?: string;
}): InternalRequestSignature {
  if (input.secret.length < 32) throw new Error("Internal service secret is not configured safely");
  if (!input.path.startsWith("/") || input.path.startsWith("//")) {
    throw new Error("Internal service path must be relative to the configured origin");
  }
  const timestamp = input.timestamp ?? String(Date.now());
  const nonce = input.nonce ?? randomUUID();
  const bodyHash = sha256Hex(bodyText(input.body));
  const canonical = canonicalInternalRequest(
    input.method,
    input.path,
    timestamp,
    nonce,
    bodyHash,
  );
  return {
    timestamp,
    nonce,
    bodyHash,
    signature: createHmac("sha256", input.secret).update(canonical, "utf8").digest("hex"),
  };
}

export function verifyInternalSignature(
  expectedHex: string,
  suppliedHex: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(expectedHex) || !/^[a-f0-9]{64}$/i.test(suppliedHex)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(suppliedHex, "hex"));
}

export async function internalTextRequest(input: InternalServiceRequest): Promise<string> {
  const method = input.method ?? "GET";
  const base = new URL(input.baseUrl);
  if (!/^https?:$/.test(base.protocol) || base.username || base.password) {
    throw new Error("Internal service URL is invalid");
  }
  if (!input.path.startsWith("/") || input.path.startsWith("//")) {
    throw new Error("Internal service path must be relative to the configured origin");
  }
  const url = new URL(input.path, base);
  if (url.origin !== base.origin) throw new Error("Internal service origin mismatch");
  const path = `${url.pathname}${url.search}`;
  const body = bodyText(input.body);
  const signed = signInternalRequest({
    method,
    path,
    secret: input.secret,
    body: input.body,
  });

  const response = await fetch(url, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(Math.min(Math.max(input.timeoutMs ?? 5_000, 500), 300_000)),
    headers: {
      "Accept": input.accept ?? "text/plain",
      "Content-Type": "application/json",
      "X-CookieBuild-Timestamp": signed.timestamp,
      "X-CookieBuild-Nonce": signed.nonce,
      "X-CookieBuild-Signature": signed.signature,
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    ...(method === "POST" ? { body } : {}),
  });

  const text = await boundedResponseText(
    response,
    MAX_INTERNAL_RESPONSE_BYTES,
    "Internal service response exceeded the size limit",
  );
  if (!response.ok) {
    throw new Error(`Internal service request failed with HTTP ${response.status}`);
  }
  return text;
}

export async function internalJsonRequest<T>(input: InternalServiceRequest): Promise<T> {
  const text = await internalTextRequest({ ...input, accept: "application/json" });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Internal service returned invalid JSON");
  }
}
