import { describe, expect, it } from "vitest";
import {
  classifyFcmError,
  isInQuietHours,
  parseNotificationAudience,
  parseNotificationPayload,
  parseNotificationPayloadForKind,
  PermanentOutboxError,
  preferenceKind,
  retryDelayMs,
  shouldDeadLetterOutbox,
} from "../server/utils/mobile-notification";

describe("mobile notification validation", () => {
  it("accepts one bounded audience selector", () => {
    expect(parseNotificationAudience({ all: true })).toEqual({ all: true });
    expect(parseNotificationAudience({
      deviceIds: ["0772c75e-d8a7-4e9d-98a1-f1744dde448e"],
    })).toEqual({ deviceIds: ["0772c75e-d8a7-4e9d-98a1-f1744dde448e"] });
  });

  it("rejects ambiguous or malformed audiences", () => {
    expect(() => parseNotificationAudience({ all: true, firebaseUid: "user" }))
      .toThrow(PermanentOutboxError);
    expect(() => parseNotificationAudience({ deviceIds: ["not-a-uuid"] }))
      .toThrow(PermanentOutboxError);
  });

  it("requires the global audience for player rallies", () => {
    expect(parseNotificationAudience({ all: true }, "player_rally")).toEqual({ all: true });
    expect(() => parseNotificationAudience({ firebaseUid: "user" }, "player_rally"))
      .toThrow(PermanentOutboxError);
    const retryDevice = "0772c75e-d8a7-4e9d-98a1-f1744dde448e";
    expect(() => parseNotificationAudience({ deviceIds: [retryDevice] }, "player_rally"))
      .toThrow(PermanentOutboxError);
    expect(parseNotificationAudience(
      { deviceIds: [retryDevice] },
      "player_rally",
      true,
    )).toEqual({ deviceIds: [retryDevice] });
  });

  it("normalizes a safe notification payload", () => {
    expect(parseNotificationPayload({
      notification: { title: " Event soon ", body: "Join us" },
      deepLink: "cookiebuild://events/summer",
      data: { eventId: 42, reminder: true },
    })).toEqual({
      title: "Event soon",
      body: "Join us",
      deepLink: "cookiebuild://events/summer",
      data: { eventId: "42", reminder: "true" },
      urgent: false,
    });
  });

  it("rejects untrusted links and non-scalar data", () => {
    expect(() => parseNotificationPayload({ title: "No", deepLink: "https://example.com" }))
      .toThrow(PermanentOutboxError);
    expect(() => parseNotificationPayload({ title: "No", data: { nested: {} } }))
      .toThrow(PermanentOutboxError);
    expect(() => parseNotificationPayload({ title: "No", data: { "google.message": "reserved" } }))
      .toThrow(PermanentOutboxError);
    expect(() => parseNotificationPayload({ title: "No", body: "é".repeat(2_000) }))
      .toThrow(PermanentOutboxError);
  });

  it("synthesizes player rally notifications from a strict structured payload", () => {
    expect(parseNotificationPayloadForKind({
      schemaVersion: 1,
      rallyId: "0772c75e-d8a7-4e9d-98a1-f1744dde448e",
      source: "player",
      gamemode: "microbattles",
      edition: "crossplay",
      queuedCount: 2,
      neededCount: 6,
      actorDisplayName: "Cookie_Player",
    }, "player_rally")).toEqual({
      title: "Players needed for MicroBattles",
      body: "Cookie_Player is rallying players: 2 queued, 6 more needed.",
      deepLink: "cookiebuild://play?gamemode=microbattles",
      data: {
        type: "player_rally",
        schemaVersion: "1",
        rallyId: "0772c75e-d8a7-4e9d-98a1-f1744dde448e",
        source: "player",
        gamemode: "microbattles",
        edition: "crossplay",
        queuedCount: "2",
        neededCount: "6",
        actorDisplayName: "Cookie_Player",
      },
      urgent: false,
    });
  });

  it("rejects free text and inconsistent player rally fields", () => {
    const valid = {
      schemaVersion: 1,
      rallyId: "0772c75e-d8a7-4e9d-98a1-f1744dde448e",
      source: "automatic",
      gamemode: "pitchout",
      edition: "crossplay",
      queuedCount: 1,
      neededCount: 3,
      actorDisplayName: null,
    };
    expect(() => parseNotificationPayloadForKind({ ...valid, body: "free text" }, "player_rally"))
      .toThrow(PermanentOutboxError);
    expect(() => parseNotificationPayloadForKind({
      ...valid,
      source: "player",
      actorDisplayName: "hello\nplayers",
    }, "player_rally")).toThrow(PermanentOutboxError);
    expect(() => parseNotificationPayloadForKind({
      ...valid,
      edition: "java",
    }, "player_rally")).toThrow(PermanentOutboxError);
    expect(() => parseNotificationPayloadForKind({
      ...valid,
      source: "player",
      actorDisplayName: "CookieFan",
      neededCount: 0,
    }, "player_rally")).toThrow(PermanentOutboxError);
  });

  it("synthesizes an automatic start-imminent rally without fake missing players", () => {
    expect(parseNotificationPayloadForKind({
      schemaVersion: 1,
      rallyId: "a53233cd-20d2-4d15-b093-2caaf4cd7774",
      source: "automatic",
      gamemode: "buildbattles",
      edition: "crossplay",
      queuedCount: 3,
      neededCount: 0,
      actorDisplayName: null,
    }, "player_rally")).toMatchObject({
      title: "BuildBattles is starting soon",
      body: "3 players are ready. Join now before the match starts.",
      data: { neededCount: "0", source: "automatic" },
    });
    expect(() => parseNotificationPayloadForKind({
      schemaVersion: 1,
      rallyId: "a53233cd-20d2-4d15-b093-2caaf4cd7774",
      source: "automatic",
      gamemode: "buildbattles",
      edition: "crossplay",
      queuedCount: 0,
      neededCount: 0,
      actorDisplayName: null,
    }, "player_rally")).toThrow(PermanentOutboxError);
  });

  it("accepts TurfWars as a bounded rally game", () => {
    expect(parseNotificationPayloadForKind({
      schemaVersion: 1,
      rallyId: "a63233cd-20d2-4d15-b093-2caaf4cd7774",
      source: "player",
      gamemode: "turfwars",
      edition: "crossplay",
      queuedCount: 1,
      neededCount: 1,
      actorDisplayName: "CookieArcher",
    }, "player_rally")).toMatchObject({
      title: "Players needed for TurfWars",
      deepLink: "cookiebuild://play?gamemode=turfwars",
      data: { gamemode: "turfwars" },
    });
  });
});

describe("mobile notification policy", () => {
  it("maps supported producer kinds to preference categories", () => {
    expect(preferenceKind("news_published")).toBe("announcement");
    expect(preferenceKind("event_reminder")).toBe("event");
    expect(preferenceKind("server_offline")).toBe("server_status");
    expect(preferenceKind("player_rally")).toBe("rally");
    expect(preferenceKind("daily_goal_reminder")).toBe("daily_reminder");
    expect(preferenceKind("weekly_goal_reminder")).toBe("weekly_reminder");
    expect(preferenceKind("friend_online")).toBe("friend_online");
    expect(preferenceKind("unknown")).toBeUndefined();
  });

  it("handles quiet hours across midnight in the recipient timezone", () => {
    const at2300Paris = new Date("2026-07-14T21:00:00.000Z");
    const at0900Paris = new Date("2026-07-14T07:00:00.000Z");
    expect(isInQuietHours(at2300Paris, "Europe/Paris", "22:00", "08:00")).toBe(true);
    expect(isInQuietHours(at0900Paris, "Europe/Paris", "22:00", "08:00")).toBe(false);
    expect(isInQuietHours(at2300Paris, "invalid/timezone", "22:00", "08:00")).toBe(false);
    expect(isInQuietHours(at2300Paris, null, "22:00", "08:00", 120)).toBe(true);
    expect(isInQuietHours(at0900Paris, null, "22:00", "08:00", 120)).toBe(false);
    expect(isInQuietHours(at2300Paris, "invalid/timezone", "22:00", "08:00", 120)).toBe(true);
  });

  it("uses capped exponential backoff with bounded jitter", () => {
    expect(retryDelayMs(1, 0)).toBe(24_000);
    expect(retryDelayMs(2, 0.5)).toBe(60_000);
    expect(retryDelayMs(20, 1)).toBe(4_320_000);
  });

  it("never dead-letters Firebase account deletion", () => {
    expect(shouldDeadLetterOutbox("firebase_auth_delete", 100, 6, false)).toBe(false);
    expect(shouldDeadLetterOutbox("firebase_auth_delete", 100, 6, true)).toBe(false);
    expect(shouldDeadLetterOutbox("announcement", 6, 6, false)).toBe(true);
    expect(shouldDeadLetterOutbox("announcement", 1, 6, true)).toBe(true);
  });

  it("only disables tokens for permanent registration failures", () => {
    expect(classifyFcmError("messaging/registration-token-not-registered")).toBe("disable");
    expect(classifyFcmError("messaging/sender-id-mismatch")).toBe("disable");
    expect(classifyFcmError("messaging/invalid-argument")).toBe("retry");
    expect(classifyFcmError("messaging/server-unavailable")).toBe("retry");
  });
});
