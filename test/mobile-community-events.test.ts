import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ENGAGEMENT_COPY, ENGAGEMENT_COPY_LOCALES, engagementCopyLocale } from "../server/services/mobile-engagement-copy";
import { localizedEventCopy, requestedEventLanguage } from "../server/utils/mobile-events";
import { aggregateModeCounts } from "../server/services/mobile-status";
import { APP_STORE_URL, GOOGLE_PLAY_URL, appLinkFallback } from "../server/utils/app-links";

describe("Soirée Cookie schedule", () => {
  let events: typeof import("../server/services/mobile-community-events");
  let notifications: typeof import("../server/services/mobile-engagement-notifications");

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL ??= "postgres://unused:unused@127.0.0.1:1/unused";
    events = await import("../server/services/mobile-community-events");
    notifications = await import("../server/services/mobile-engagement-notifications");
  });

  afterAll(async () => {
    const { postgresClient } = await import("../db/client");
    await postgresClient.end({ timeout: 0 });
  });

  it("lists every Wednesday and Saturday 21:00–22:00 Paris within 14 days", () => {
    const occurrences = events.soireeCookieOccurrences(new Date("2026-09-30T08:00:00Z"));
    expect(occurrences.map((occurrence) => occurrence.slug)).toEqual([
      "soiree-cookie-2026-09-30",
      "soiree-cookie-2026-10-03",
      "soiree-cookie-2026-10-07",
      "soiree-cookie-2026-10-10",
    ]);
    expect(occurrences[0]!.startsAt.toISOString()).toBe("2026-09-30T19:00:00.000Z");
    expect(occurrences[0]!.endsAt.toISOString()).toBe("2026-09-30T20:00:00.000Z");
  });

  it("follows Paris time after the October DST change and drops ended evenings", () => {
    const occurrences = events.soireeCookieOccurrences(new Date("2026-10-28T21:05:00Z"));
    expect(occurrences[0]!.slug).toBe("soiree-cookie-2026-10-31");
    expect(occurrences[0]!.startsAt.toISOString()).toBe("2026-10-31T20:00:00.000Z");
    // During an evening the current occurrence stays listed until 22:00.
    expect(events.soireeCookieOccurrences(new Date("2026-09-30T19:30:00Z"))[0]!.slug)
      .toBe("soiree-cookie-2026-09-30");
    expect(events.nextSoireeCookie(new Date("2026-09-30T19:30:00Z"))!.slug)
      .toBe("soiree-cookie-2026-10-03");
  });

  it("is disabled unless explicitly enabled", () => {
    expect(events.soireeCookieEnabled({})).toBe(false);
    expect(events.soireeCookieEnabled({ MOBILE_SOIREE_COOKIE_ENABLED: "TRUE" })).toBe(true);
  });

  it("sends the weekly digest only during Monday 10:00–10:59 Paris about the previous week", () => {
    expect(notifications.weeklyDigestWindow(new Date("2026-10-05T08:30:00Z"))).toEqual({
      weekKey: "2026-W40",
      startsAt: new Date("2026-09-27T22:00:00.000Z"),
      endsAt: new Date("2026-10-04T22:00:00.000Z"),
    });
    expect(notifications.weeklyDigestWindow(new Date("2026-10-05T07:59:00Z"))).toBeNull();
    expect(notifications.weeklyDigestWindow(new Date("2026-10-05T09:00:00Z"))).toBeNull();
    expect(notifications.weeklyDigestWindow(new Date("2026-10-06T08:30:00Z"))).toBeNull();
    // Winter time: 10:00 Paris is 09:00 UTC.
    expect(notifications.weeklyDigestWindow(new Date("2026-11-02T09:15:00Z"))?.weekKey).toBe("2026-W44");
  });
});

describe("engagement copy", () => {
  it("covers every key in every supported language with placeholders intact", () => {
    const keys = Object.keys(ENGAGEMENT_COPY.en).sort();
    for (const locale of ENGAGEMENT_COPY_LOCALES) {
      const copy = ENGAGEMENT_COPY[locale] as Record<string, string>;
      expect(Object.keys(copy).sort()).toEqual(keys);
      expect(copy.digestPlayed).toContain("{matches}");
      expect(copy.digestPlayed).toContain("{wins}");
      for (const value of Object.values(copy)) expect(value.trim().length).toBeGreaterThan(5);
    }
    expect(ENGAGEMENT_COPY.fr.soireeReminderBody).toContain("Rejoins");
    expect(engagementCopyLocale("pt-BR")).toBe("pt");
    expect(engagementCopyLocale("fr_FR")).toBe("fr");
    expect(engagementCopyLocale("hi")).toBe("en");
  });
});

describe("localized event listing", () => {
  it("prefers ?locale, then Accept-Language, then the stored base copy", () => {
    expect(requestedEventLanguage("fr-FR", "de-DE,de;q=0.9")).toBe("fr");
    expect(requestedEventLanguage(undefined, "de-DE,de;q=0.9")).toBe("de");
    expect(requestedEventLanguage(undefined, undefined)).toBeNull();
    const base = { title: "Base", description: "Base description" };
    expect(localizedEventCopy(base, { fr: { title: "Titre", description: "Description" } }, "fr"))
      .toEqual({ title: "Titre", description: "Description" });
    expect(localizedEventCopy(base, { fr: { title: "Titre" } }, "fr"))
      .toEqual({ title: "Titre", description: "Base description" });
    expect(localizedEventCopy(base, {}, "it")).toEqual(base);
  });
});

describe("per-mode live counts", () => {
  it("sums fresh runtime snapshots by normalized gameplay mode id", () => {
    expect(aggregateModeCounts([
      { games: [
        { name: "MicroBattles", players: 6 },
        { name: "MicroBattles", players: 2 },
        { name: "SkyWars", players: 0 },
        { name: "Bad Name!!!", players: -4 },
        { name: 12, players: 3 },
      ] },
      { games: [{ name: "Build Battles", players: 4 }] },
      { games: "corrupt" },
    ])).toEqual([
      { id: "microbattles", playing: 8 },
      { id: "buildbattles", playing: 4 },
      { id: "badname", playing: 0 },
      { id: "skywars", playing: 0 },
    ]);
  });
});

describe("app link fallback", () => {
  it("sends phones to their store and browsers to the homepage download section", () => {
    expect(appLinkFallback("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "fr-FR")).toBe(APP_STORE_URL);
    expect(appLinkFallback("Mozilla/5.0 (Linux; Android 15; Pixel 9)", "fr-FR")).toBe(GOOGLE_PLAY_URL);
    expect(appLinkFallback("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)", "fr-FR,fr;q=0.9")).toBe("/fr#mobile-app");
    expect(appLinkFallback("Mozilla/5.0 (Windows NT 10.0)", "en-US")).toBe("/#mobile-app");
    expect(appLinkFallback(undefined, undefined)).toBe("/#mobile-app");
  });
});
