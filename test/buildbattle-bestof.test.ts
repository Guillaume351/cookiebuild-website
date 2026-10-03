import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("../db/client", () => ({ default: {} }));

import {
  BB_BESTOF,
  bestOfRewardsEnabled,
  dueBestOfWindow,
  previousParisWeek,
  rankBestOf,
} from "../server/services/buildbattle-bestof";

const service = readFileSync(new URL("../server/services/buildbattle-bestof.ts", import.meta.url), "utf8");
const plugin = readFileSync(new URL("../server/plugins/buildbattle-bestof-rewards.ts", import.meta.url), "utf8");
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

const candidate = (id: string, likeCount: number, createdAt: string, playerId = `player-${id}`) =>
  ({ id, playerId, likeCount, createdAt: new Date(createdAt) });

describe("weekly Build Battle best-of", () => {
  it("ranks by likes, then earlier creation, with at least 3 likes and 150/100/50 coins", () => {
    const ranked = rankBestOf([
      candidate("a", 10, "2026-09-29T10:00:00Z"),
      candidate("b", 12, "2026-09-30T10:00:00Z"),
      candidate("c", 10, "2026-09-28T10:00:00Z"),
      candidate("d", 2, "2026-09-28T09:00:00Z"),
      candidate("e", 9, "2026-10-01T10:00:00Z"),
    ]);
    expect(ranked.map(({ id, rank, coins }) => ({ id, rank, coins }))).toEqual([
      { id: "b", rank: 1, coins: 150 },
      { id: "c", rank: 2, coins: 100 },
      { id: "a", rank: 3, coins: 50 },
    ]);
    expect(rankBestOf([candidate("x", 2, "2026-09-29T10:00:00Z")])).toEqual([]);
  });

  it("runs only on Monday between 10:00 and 10:59 Paris time and rewards the previous week", () => {
    // Monday 5 October 2026, 10:30 Paris (UTC+2).
    expect(dueBestOfWindow(new Date("2026-10-05T08:30:00Z"))).toEqual({
      weekKey: "2026-W40",
      startsAt: new Date("2026-09-27T22:00:00Z"),
      endsAt: new Date("2026-10-04T22:00:00Z"),
    });
    expect(dueBestOfWindow(new Date("2026-10-05T07:59:00Z"))).toBeNull(); // 09:59 Paris
    expect(dueBestOfWindow(new Date("2026-10-05T09:00:00Z"))).toBeNull(); // 11:00 Paris
    expect(dueBestOfWindow(new Date("2026-10-06T08:30:00Z"))).toBeNull(); // Tuesday
    // Monday 2 November 2026, 10:15 Paris (UTC+1): the week spans the DST change.
    expect(dueBestOfWindow(new Date("2026-11-02T09:15:00Z"))).toEqual({
      weekKey: "2026-W44",
      startsAt: new Date("2026-10-25T23:00:00Z"),
      endsAt: new Date("2026-11-01T23:00:00Z"),
    });
    expect(previousParisWeek(new Date("2026-10-03T12:00:00Z")).weekKey).toBe("2026-W39");
  });

  it("grants idempotently per ISO week with the contract's source and period key", () => {
    expect(BB_BESTOF).toMatchObject({ source: "bb_bestof", rewards: [150, 100, 50], minimumLikes: 3 });
    expect(service).toContain("pg_advisory_xact_lock");
    expect(service).toContain("ORDER BY build.like_count DESC, build.created_at ASC, build.id ASC");
    expect(service).toContain("build.status = 'published'");
    expect(service).toContain("${window.weekKey} || '-' || ranked.rank");
    expect(service).toMatch(/NOT EXISTS \([\s\S]*existing\.source = \$\{BB_BESTOF\.source\}[\s\S]*existing\.period_key LIKE/);
    expect(service).toContain("ON CONFLICT (player_uuid, source, period_key) DO NOTHING");
  });

  it("is disabled by default and documented", () => {
    expect(bestOfRewardsEnabled({})).toBe(false);
    expect(bestOfRewardsEnabled({ BB_GALLERY_BESTOF_REWARDS_ENABLED: "true" })).toBe(true);
    expect(plugin).toContain("if (!bestOfRewardsEnabled()) return;");
    expect(envExample).toContain("BB_GALLERY_BESTOF_REWARDS_ENABLED=false");
  });
});
