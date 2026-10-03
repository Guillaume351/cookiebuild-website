import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createError, getCookie, getHeader, getRequestIP, setCookie, type H3Event } from "h3";
import { mobileAuthFailure, verifyMobileIdToken } from "../utils/mobile-auth";
import { bearerToken } from "../utils/mobile-validation";

/**
 * Gallery identities (contract section 3):
 * - app: Firebase bearer token, liker_key "app:<sha256(uid)>";
 * - web: anonymous signed HttpOnly cookie cb_gid (random id, 1 year), liker_key "web:<sha256(id)>".
 */
export const GALLERY_COOKIE = "cb_gid";
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const ID_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;

export interface GalleryIdentity {
  kind: "app" | "web";
  /** Value stored in liker_key / reporter_key. */
  key: string;
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function appLikerKey(uid: string) {
  return `app:${sha256Hex(uid)}`;
}

export function webLikerKey(anonymousId: string) {
  return `web:${sha256Hex(anonymousId)}`;
}

let processSecret: string | null = null;
let warnedEphemeral = false;

/**
 * HMAC key of the cb_gid cookie: BB_GALLERY_COOKIE_SECRET, else a sub-key derived
 * from MOBILE_LINK_PEPPER, else a per-process random key (cookies then reset on
 * restart, which only lets a visitor like again).
 */
export function galleryCookieSecret(environment: Record<string, string | undefined> = process.env) {
  const explicit = environment.BB_GALLERY_COOKIE_SECRET?.trim();
  if (explicit && explicit.length >= 32) return explicit;
  const pepper = environment.MOBILE_LINK_PEPPER?.trim();
  if (pepper && pepper.length >= 32) {
    return createHmac("sha256", pepper).update("cookie-build:bb-gallery-cookie:v1").digest("hex");
  }
  if (!warnedEphemeral) {
    warnedEphemeral = true;
    console.warn("[bb-gallery]", JSON.stringify({ event: "cookie_secret_ephemeral" }));
  }
  processSecret ??= randomBytes(32).toString("hex");
  return processSecret;
}

function signature(id: string, secret: string) {
  return createHmac("sha256", secret).update(`cb_gid:${id}`).digest("base64url").slice(0, 32);
}

export function signGalleryCookie(id: string, secret: string) {
  return `${id}.${signature(id, secret)}`;
}

/** Returns the anonymous id of a well-formed, correctly signed cookie, otherwise null. */
export function verifyGalleryCookie(value: string | undefined, secret: string) {
  if (!value || value.length > 120) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const id = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(signature(id, secret));
  if (!ID_PATTERN.test(id) || provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  return id;
}

export function requestIp(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) || "unknown";
}

async function appIdentity(event: H3Event, strict: boolean): Promise<GalleryIdentity | null | undefined> {
  const authorization = getHeader(event, "authorization");
  if (!authorization) return undefined;
  const token = bearerToken(authorization);
  try {
    if (!token) throw Object.assign(new Error("Malformed bearer token"), { code: "auth/argument-error" });
    const claims = await verifyMobileIdToken(token);
    return { kind: "app", key: appLikerKey(claims.uid) };
  } catch (error) {
    const failure = mobileAuthFailure(error);
    if (!strict) return null;
    console[failure.logLevel]("[bb-gallery]", JSON.stringify({ event: "app_auth_failed", reason: failure.reason }));
    throw createError({ statusCode: failure.statusCode, statusMessage: failure.statusMessage });
  }
}

/** Identity for read-only requests (`liked`): never sets a cookie, ignores invalid tokens. */
export async function optionalGalleryIdentity(event: H3Event): Promise<GalleryIdentity | null> {
  const app = await appIdentity(event, false);
  if (app !== undefined) return app;
  const id = verifyGalleryCookie(getCookie(event, GALLERY_COOKIE), galleryCookieSecret());
  return id ? { kind: "web", key: webLikerKey(id) } : null;
}

/**
 * Identity for writes (like, unlike, report). An app request must carry a valid
 * Firebase token; a browser gets a new signed cb_gid cookie when it has none.
 */
export async function requireGalleryIdentity(event: H3Event): Promise<GalleryIdentity> {
  const app = await appIdentity(event, true);
  if (app) return app;
  const secret = galleryCookieSecret();
  let id = verifyGalleryCookie(getCookie(event, GALLERY_COOKIE), secret);
  if (!id) {
    id = randomBytes(24).toString("base64url");
    setCookie(event, GALLERY_COOKIE, signGalleryCookie(id, secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  }
  return { kind: "web", key: webLikerKey(id) };
}

/**
 * Browser writes must come from the site itself (cookie-authenticated, so a
 * cross-site form must not like or report on a visitor's behalf). Native app
 * requests carry no Origin header.
 */
export function enforceGallerySameOrigin(event: H3Event) {
  const origin = getHeader(event, "origin");
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw createError({ statusCode: 403, statusMessage: "Invalid request origin" });
  }
  const forwardedHost = getHeader(event, "x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = (forwardedHost || getHeader(event, "host") || "").toLowerCase();
  if (!requestHost || originHost !== requestHost) {
    throw createError({ statusCode: 403, statusMessage: "Invalid request origin" });
  }
}
