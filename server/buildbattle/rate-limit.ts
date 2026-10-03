import type { H3Event } from "h3";
import { enforceMobileRequestRateLimit } from "../utils/mobile-rate-limit";
import type { GalleryIdentity } from "./identity";

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

/**
 * Gallery write limits (PostgreSQL-backed, in-memory fallback). Per-IP limits stay
 * generous enough for a school or family network sharing one address.
 */
export const GALLERY_RATE_LIMITS = {
  likePerIp: { limit: 120, windowMs: HOUR },
  likePerIdentity: { limit: 60, windowMs: HOUR },
  reportPerIp: { limit: 20, windowMs: HOUR },
  reportPerIdentity: { limit: 10, windowMs: HOUR },
  /** One web report per address and build: three reports must come from three networks or app accounts. */
  reportPerIpAndBuild: { limit: 1, windowMs: DAY },
} as const;

type Enforce = typeof enforceMobileRequestRateLimit;

export async function enforceGalleryLikeLimits(
  event: H3Event,
  ip: string,
  identity: GalleryIdentity,
  enforce: Enforce = enforceMobileRequestRateLimit,
) {
  const { likePerIp, likePerIdentity } = GALLERY_RATE_LIMITS;
  if (identity.kind === "web") await enforce(`bb-like:ip:${ip}`, likePerIp.limit, likePerIp.windowMs, { event });
  await enforce(`bb-like:key:${identity.key}`, likePerIdentity.limit, likePerIdentity.windowMs, { event });
}

export async function enforceGalleryReportLimits(
  event: H3Event,
  ip: string,
  identity: GalleryIdentity,
  shortCode: string,
  enforce: Enforce = enforceMobileRequestRateLimit,
) {
  const { reportPerIp, reportPerIdentity, reportPerIpAndBuild } = GALLERY_RATE_LIMITS;
  await enforce(`bb-report:ip:${ip}`, reportPerIp.limit, reportPerIp.windowMs, { event });
  await enforce(`bb-report:key:${identity.key}`, reportPerIdentity.limit, reportPerIdentity.windowMs, { event });
  if (identity.kind === "web") {
    await enforce(`bb-report:ip-build:${ip}:${shortCode}`, reportPerIpAndBuild.limit, reportPerIpAndBuild.windowMs, { event });
  }
}
