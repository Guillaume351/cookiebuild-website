import { sql } from "drizzle-orm";
import db from "../../db/client";
import { SOIREE_COOKIE, soireeCookieOccurrences, type SoireeOccurrence } from "./mobile-community-events";

/**
 * Optional Discord announcer for Soirée Cookie (Wed/Sat 21:00–22:00 Paris, coins x2):
 * one post one hour before and one at the start of every occurrence. Enabled only
 * when DISCORD_EVENTS_WEBHOOK_URL is set; a marker row per (occurrence, phase) keeps
 * it idempotent across restarts and replicas. The webhook URL is a secret and is
 * never logged.
 */
export const DISCORD_SOIREE = {
  reminderLeadMinutes: 60,
  /** A start message is still worth posting this long after 21:00 (e.g. after a deploy). */
  startGraceMinutes: 20,
  siteUrl: "https://www.cookie-build.com/fr",
  joinUrl: "https://www.cookie-build.com/fr/rejoindre",
  timeoutMs: 10_000,
} as const;

export type SoireePhase = "reminder" | "start";

const WEBHOOK_PATTERN = /^https:\/\/(?:canary\.|ptb\.)?(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

/** The configured webhook, or null when unset or not a Discord webhook URL. */
export function discordEventsWebhook(environment: Record<string, string | undefined> = process.env) {
  const value = environment.DISCORD_EVENTS_WEBHOOK_URL?.trim();
  if (!value) return null;
  return WEBHOOK_PATTERN.test(value) ? value : null;
}

/** Phase due at `now` for an occurrence, if any. */
export function dueSoireePhase(occurrence: SoireeOccurrence, now: Date): SoireePhase | null {
  const startsAt = occurrence.startsAt.getTime();
  const time = now.getTime();
  if (time >= startsAt && time < startsAt + DISCORD_SOIREE.startGraceMinutes * 60_000) return "start";
  if (time >= startsAt - DISCORD_SOIREE.reminderLeadMinutes * 60_000 && time < startsAt) return "reminder";
  return null;
}

export function soireeDiscordMessage(phase: SoireePhase) {
  const startHour = SOIREE_COOKIE.startHour;
  const endHour = SOIREE_COOKIE.endHour;
  if (phase === "reminder") {
    return `🍪 **Soirée Cookie ce soir à ${startHour}h !** Pièces x2 dans tous les mini-jeux de ${startHour}h à ${endHour}h. `
      + `Prépare-toi et rejoins-nous sur play.cookie-build.com : ${DISCORD_SOIREE.joinUrl}`;
  }
  return `🎉 **La Soirée Cookie commence maintenant !** Pièces x2 jusqu'à ${endHour}h sur play.cookie-build.com. `
    + `Viens jouer : ${DISCORD_SOIREE.siteUrl}`;
}

export function soireeAnnouncementKey(occurrence: SoireeOccurrence, phase: SoireePhase) {
  return `discord:soiree:${occurrence.dateKey}:${phase}`;
}

type Poster = (webhook: string, content: string) => Promise<void>;

export async function postDiscordWebhook(webhook: string, content: string) {
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(DISCORD_SOIREE.timeoutMs),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Discord webhook answered HTTP ${response.status}`);
}

export async function announceSoireeOnDiscord(now = new Date(), webhook = discordEventsWebhook(), post: Poster = postDiscordWebhook) {
  if (!webhook) return [];
  const posted: string[] = [];
  for (const occurrence of soireeCookieOccurrences(now, 2)) {
    const phase = dueSoireePhase(occurrence, now);
    if (!phase) continue;
    // An operator can cancel an occurrence in the admin events list.
    const cancelled = await db.execute<{ status: string }>(sql`
      SELECT status FROM mobile_events WHERE slug = ${occurrence.slug} AND status = 'cancelled' LIMIT 1
    `);
    if (cancelled.length) continue;
    const key = soireeAnnouncementKey(occurrence, phase);
    const claimed = await db.execute(sql`
      INSERT INTO discord_event_announcements (dedupe_key) VALUES (${key})
      ON CONFLICT (dedupe_key) DO NOTHING
      RETURNING dedupe_key
    `);
    if (!claimed.length) continue;
    try {
      await post(webhook, soireeDiscordMessage(phase));
      posted.push(key);
    } catch (error) {
      // Release the marker so the next sweep retries within the same window.
      await db.execute(sql`DELETE FROM discord_event_announcements WHERE dedupe_key = ${key}`);
      throw error;
    }
  }
  return posted;
}
