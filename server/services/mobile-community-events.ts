import { sql } from "drizzle-orm";
import db from "../../db/client";
import {
  ENGAGEMENT_COPY,
  engagementLocaleSql,
  engagementTextSql,
  soireeEventLocalizations,
} from "./mobile-engagement-copy";
import {
  addDaysToDateKey,
  isoWeekdayOfDateKey,
  parisDateKey,
  parisWallTimeToUtc,
} from "../utils/paris-time";

/** Soirée Cookie: Wednesday and Saturday, 21:00–22:00 Europe/Paris, double coins in game. */
export const SOIREE_COOKIE = {
  slugPrefix: "soiree-cookie-",
  isoWeekdays: [3, 6] as readonly number[],
  startHour: 21,
  endHour: 22,
  horizonDays: 14,
  reminderLeadMinutes: 15,
} as const;

/** Maximum mobile user IDs per outbox row, matching the outbox audience limit. */
const AUDIENCE_CHUNK = 5_000;

export function soireeCookieEnabled(environment = process.env) {
  return environment.MOBILE_SOIREE_COOKIE_ENABLED?.trim().toLowerCase() === "true";
}

export interface SoireeOccurrence {
  slug: string;
  dateKey: string;
  isoWeekday: number;
  startsAt: Date;
  endsAt: Date;
}

/** Occurrences that have not ended yet, within the planning horizon. */
export function soireeCookieOccurrences(now: Date, horizonDays: number = SOIREE_COOKIE.horizonDays) {
  const today = parisDateKey(now);
  const occurrences: SoireeOccurrence[] = [];
  for (let offset = 0; offset < horizonDays; offset += 1) {
    const dateKey = addDaysToDateKey(today, offset);
    const isoWeekday = isoWeekdayOfDateKey(dateKey);
    if (!SOIREE_COOKIE.isoWeekdays.includes(isoWeekday)) continue;
    const startsAt = parisWallTimeToUtc(dateKey, SOIREE_COOKIE.startHour);
    const endsAt = parisWallTimeToUtc(dateKey, SOIREE_COOKIE.endHour);
    if (endsAt <= now) continue;
    occurrences.push({ slug: `${SOIREE_COOKIE.slugPrefix}${dateKey}`, dateKey, isoWeekday, startsAt, endsAt });
  }
  return occurrences;
}

/** Next occurrence that has not started yet. */
export function nextSoireeCookie(now: Date) {
  return soireeCookieOccurrences(now, 8).find((occurrence) => occurrence.startsAt > now) ?? null;
}

/**
 * Idempotently creates the upcoming occurrences so the app and site list them.
 * Existing rows are never overwritten: an operator may edit or cancel one.
 */
export async function ensureSoireeCookieEvents(now = new Date()) {
  const occurrences = soireeCookieOccurrences(now);
  if (!occurrences.length) return 0;
  const localizations = JSON.stringify(soireeEventLocalizations());
  const rows = await db.execute<{ id: string }>(sql`
    INSERT INTO mobile_events (slug, title, description, game_type, starts_at, ends_at, status, localizations)
    SELECT occurrence.slug, ${ENGAGEMENT_COPY.en.soireeEventTitle}, ${ENGAGEMENT_COPY.en.soireeEventDescription},
           'all', occurrence.starts_at, occurrence.ends_at, 'scheduled', ${localizations}::jsonb
      FROM jsonb_to_recordset(${JSON.stringify(occurrences.map((occurrence) => ({
        slug: occurrence.slug,
        starts_at: occurrence.startsAt.toISOString(),
        ends_at: occurrence.endsAt.toISOString(),
      })))}::jsonb) AS occurrence(slug text, starts_at timestamptz, ends_at timestamptz)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `);
  return rows.length;
}

/**
 * Queues one localized reminder per language (chunked to the audience limit)
 * about 15 minutes before a scheduled occurrence. The whole occurrence is
 * skipped once any reminder row exists, so every user is notified at most once.
 */
export async function enqueueSoireeCookieReminders() {
  const title = engagementTextSql(sql`candidate.locale`, "soireeReminderTitle");
  const body = engagementTextSql(sql`candidate.locale`, "soireeReminderBody");
  const language = engagementLocaleSql(sql`candidate.locale`);
  const rows = await db.execute<{ id: string }>(sql`
    WITH due AS (
      SELECT event.id, event.slug
        FROM mobile_events event
       WHERE event.slug LIKE ${`${SOIREE_COOKIE.slugPrefix}%`}
         AND event.status = 'scheduled'
         AND event.starts_at > now()
         AND event.starts_at <= now() + make_interval(mins => ${SOIREE_COOKIE.reminderLeadMinutes})
         AND NOT EXISTS (
           SELECT 1 FROM mobile_notification_outbox existing
            WHERE existing.dedupe_key LIKE 'soiree-reminder:' || event.slug || ':%'
         )
    ), candidate AS (
      SELECT user_row.id, user_row.locale
        FROM mobile_users user_row
        LEFT JOIN mobile_notification_preferences preference
          ON preference.mobile_user_id = user_row.id
       WHERE user_row.deleted_at IS NULL
         AND coalesce(preference.events_enabled, true)
         AND EXISTS (
           SELECT 1 FROM mobile_devices device
            WHERE device.mobile_user_id = user_row.id
              AND device.notifications_authorized AND device.revoked_at IS NULL
         )
    ), localized AS (
      SELECT candidate.id, ${language} AS language, ${title} AS title, ${body} AS body
        FROM candidate
    ), grouped AS (
      SELECT due.id AS event_id, due.slug, localized.language, localized.title, localized.body,
             (row_number() OVER (PARTITION BY due.id, localized.language ORDER BY localized.id) - 1)
               / ${AUDIENCE_CHUNK} AS chunk,
             localized.id AS mobile_user_id
        FROM due CROSS JOIN localized
    )
    INSERT INTO mobile_notification_outbox (kind, dedupe_key, audience, payload)
    SELECT 'event_reminder',
           'soiree-reminder:' || slug || ':' || language || ':' || chunk,
           jsonb_build_object('mobileUserIds', jsonb_agg(mobile_user_id::text ORDER BY mobile_user_id)),
           jsonb_build_object(
             'title', min(title),
             'body', min(body),
             'deepLink', 'cookiebuild://events/' || event_id,
             'data', jsonb_build_object('type', 'event', 'id', event_id::text, 'slug', slug)
           )
      FROM grouped
     GROUP BY event_id, slug, language, chunk
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
    RETURNING id
  `);
  return rows.length;
}
