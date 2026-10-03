import { readFileSync } from "node:fs";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const markers = vi.hoisted(() => ({ keys: new Set<string>(), cancelled: new Set<string>() }));

vi.mock("../db/client", async () => {
  const { PgDialect } = await import("drizzle-orm/pg-core");
  const dialect = new PgDialect();
  return {
    default: {
      execute: async (query: SQL) => {
        const { sql: text, params } = dialect.sqlToQuery(query);
        const statement = text.replace(/\s+/g, " ").trim();
        if (statement.startsWith("SELECT status FROM mobile_events")) {
          return markers.cancelled.has(String(params[0])) ? [{ status: "cancelled" }] : [];
        }
        if (statement.startsWith("INSERT INTO discord_event_announcements")) {
          const key = String(params[0]);
          if (markers.keys.has(key)) return [];
          markers.keys.add(key);
          return [{ dedupe_key: key }];
        }
        if (statement.startsWith("DELETE FROM discord_event_announcements")) {
          markers.keys.delete(String(params[0]));
          return [];
        }
        throw new Error(`Unexpected statement: ${statement}`);
      },
    },
  };
});

import {
  announceSoireeOnDiscord,
  discordEventsWebhook,
  dueSoireePhase,
  soireeDiscordMessage,
} from "../server/services/discord-soiree-announcer";
import { soireeCookieOccurrences } from "../server/services/mobile-community-events";

const WEBHOOK = "https://discord.com/api/webhooks/123456/secret-token_value";
const plugin = readFileSync(new URL("../server/plugins/discord-soiree-announcer.ts", import.meta.url), "utf8");

beforeEach(() => {
  markers.keys.clear();
  markers.cancelled.clear();
});

describe("Discord Soirée Cookie announcer", () => {
  it("is disabled unless a Discord webhook URL is configured", () => {
    expect(discordEventsWebhook({})).toBeNull();
    expect(discordEventsWebhook({ DISCORD_EVENTS_WEBHOOK_URL: "https://example.com/hook" })).toBeNull();
    expect(discordEventsWebhook({ DISCORD_EVENTS_WEBHOOK_URL: ` ${WEBHOOK} ` })).toBe(WEBHOOK);
  });

  it("posts the T-60 reminder then the start message once per occurrence", async () => {
    const post = vi.fn(async () => undefined);
    // Saturday 3 October 2026: Soirée at 21:00 Paris = 19:00 UTC.
    await expect(announceSoireeOnDiscord(new Date("2026-10-03T17:30:00Z"), WEBHOOK, post)).resolves.toEqual([]);
    await expect(announceSoireeOnDiscord(new Date("2026-10-03T18:05:00Z"), WEBHOOK, post))
      .resolves.toEqual(["discord:soiree:2026-10-03:reminder"]);
    await expect(announceSoireeOnDiscord(new Date("2026-10-03T18:30:00Z"), WEBHOOK, post)).resolves.toEqual([]);
    await expect(announceSoireeOnDiscord(new Date("2026-10-03T19:00:30Z"), WEBHOOK, post))
      .resolves.toEqual(["discord:soiree:2026-10-03:start"]);
    await expect(announceSoireeOnDiscord(new Date("2026-10-03T19:05:00Z"), WEBHOOK, post)).resolves.toEqual([]);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0]).toEqual([WEBHOOK, soireeDiscordMessage("reminder")]);
  });

  it("retries after a failed post and skips cancelled occurrences", async () => {
    const failing = vi.fn(async () => { throw new Error("HTTP 500"); });
    await expect(announceSoireeOnDiscord(new Date("2026-10-03T18:05:00Z"), WEBHOOK, failing)).rejects.toThrow("HTTP 500");
    expect(markers.keys.size).toBe(0);
    const post = vi.fn(async () => undefined);
    await expect(announceSoireeOnDiscord(new Date("2026-10-03T18:06:00Z"), WEBHOOK, post)).resolves.toHaveLength(1);
    markers.cancelled.add("soiree-cookie-2026-10-07");
    await expect(announceSoireeOnDiscord(new Date("2026-10-07T18:30:00Z"), WEBHOOK, post)).resolves.toEqual([]);
  });

  it("writes French copy with the site link and never logs the webhook", () => {
    expect(soireeDiscordMessage("reminder")).toContain("Soirée Cookie ce soir à 21h");
    expect(soireeDiscordMessage("reminder")).toContain("https://www.cookie-build.com/fr/rejoindre");
    expect(soireeDiscordMessage("start")).toContain("commence maintenant");
    expect(soireeDiscordMessage("start")).toContain("https://www.cookie-build.com/fr");
    expect(plugin).not.toMatch(/console\.\w+\([^;]*(process\.env|discordEventsWebhook\(\))/);
    const [occurrence] = soireeCookieOccurrences(new Date("2026-10-03T12:00:00Z"), 2);
    expect(dueSoireePhase(occurrence!, new Date("2026-10-03T19:25:00Z"))).toBeNull();
  });
});
