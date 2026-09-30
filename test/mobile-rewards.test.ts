import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const capabilityMocks = vi.hoisted(() => ({
  requireMobileCapability: vi.fn(async () => undefined),
}));
const userMocks = vi.hoisted(() => ({
  requireMobileUser: vi.fn(async () => ({ auth: { uid: "firebase-user" } })),
  lockActiveMobileUser: vi.fn(),
}));
const rateLimitMocks = vi.hoisted(() => ({
  enforceMobileRequestRateLimit: vi.fn(async () => undefined),
}));
const counterMocks = vi.hoisted(() => ({
  recordEngagementCounter: vi.fn(async () => undefined),
}));

vi.mock("../server/services/mobile-capabilities", () => capabilityMocks);
vi.mock("../server/services/mobile-user", () => userMocks);
vi.mock("../server/utils/mobile-rate-limit", () => rateLimitMocks);
vi.mock("../server/services/mobile-engagement-counters", () => counterMocks);

const serviceMocks = vi.hoisted(() => ({
  dailyChestStatus: vi.fn(),
  claimDailyChest: vi.fn(),
}));
// Pure rules stay real; only the database-backed operations are replaced.
vi.mock("../server/services/mobile-rewards", async (importOriginal) => ({
  ...await importOriginal<typeof import("../server/services/mobile-rewards")>(),
  ...serviceMocks,
}));

describe("app daily chest rules", () => {
  let rewards: typeof import("../server/services/mobile-rewards");

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL ??= "postgres://unused:unused@127.0.0.1:1/unused";
    rewards = await import("../server/services/mobile-rewards");
  });

  afterAll(async () => {
    const { postgresClient } = await import("../db/client");
    await postgresClient.end({ timeout: 0 });
  });

  it("publishes the seven-day reward table", () => {
    expect(rewards.dailyChestRewardTable()).toEqual([
      { day: 1, coins: 25 },
      { day: 2, coins: 30 },
      { day: 3, coins: 40 },
      { day: 4, coins: 50 },
      { day: 5, coins: 60 },
      { day: 6, coins: 75 },
      { day: 7, coins: 150 },
    ]);
  });

  it("restarts the cycle at day 1 after day 7", () => {
    expect([1, 6, 7, 8, 14, 15].map(rewards.dailyChestCycleDay)).toEqual([1, 6, 7, 1, 7, 1]);
    expect(rewards.dailyChestCoins(8)).toBe(25);
  });

  it("keeps a streak alive only through yesterday and resets it after a missed day", () => {
    expect(rewards.dailyChestProgress("2026-10-01", null)).toEqual({
      claimedToday: false,
      streak: 0,
      currentDay: 1,
    });
    expect(rewards.dailyChestProgress("2026-10-01", { claimDate: "2026-09-30", streak: 3 })).toEqual({
      claimedToday: false,
      streak: 3,
      currentDay: 4,
    });
    expect(rewards.dailyChestProgress("2026-10-01", { claimDate: "2026-10-01", streak: 7 })).toEqual({
      claimedToday: true,
      streak: 7,
      currentDay: 7,
    });
    expect(rewards.dailyChestProgress("2026-10-01", { claimDate: "2026-09-29", streak: 6 })).toEqual({
      claimedToday: false,
      streak: 0,
      currentDay: 1,
    });
    expect(rewards.dailyChestProgress("2026-10-01", { claimDate: "2026-09-30", streak: 7 }).currentDay).toBe(1);
  });

  it("grants the link reward once per Minecraft player with the companion badge", () => {
    expect(rewards.APP_LINK_REWARD).toEqual({
      source: "app_link",
      periodKey: "once",
      coins: 150,
      cosmeticId: "app_companion_badge",
    });
  });
});

describe("daily chest routes", () => {
  let getRoute: (event: unknown) => Promise<{ data: unknown }>;
  let claimRoute: (event: unknown) => Promise<{ data: { granted: { coins: number; day: number } } }>;

  beforeAll(async () => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("setHeader", vi.fn());
    getRoute = (await import("../server/api/mobile/v1/rewards/daily.get")).default as typeof getRoute;
    claimRoute = (await import("../server/api/mobile/v1/rewards/daily/claim.post")).default as typeof claimRoute;
  });

  afterAll(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.clearAllMocks();
    capabilityMocks.requireMobileCapability.mockResolvedValue(undefined);
  });

  it("is hidden before authentication while the dailyRewards capability is off", async () => {
    capabilityMocks.requireMobileCapability.mockRejectedValue(
      Object.assign(new Error("Feature unavailable"), { statusCode: 404 }),
    );
    await expect(getRoute({ context: {} })).rejects.toMatchObject({ statusCode: 404 });
    expect(capabilityMocks.requireMobileCapability).toHaveBeenCalledWith("dailyRewards");
    expect(userMocks.requireMobileUser).not.toHaveBeenCalled();
  });

  it("returns the chest state for the authenticated user under a rate limit", async () => {
    const status = { linked: true, available: true, claimedToday: false, streak: 2, currentDay: 3 };
    serviceMocks.dailyChestStatus.mockResolvedValue(status);
    await expect(getRoute({ context: {} })).resolves.toEqual({ data: status });
    expect(serviceMocks.dailyChestStatus).toHaveBeenCalledWith("firebase-user");
    expect(rateLimitMocks.enforceMobileRequestRateLimit).toHaveBeenCalledWith(
      "daily-chest:firebase-user", 60, 60_000, expect.anything(),
    );
  });

  it("counts successful claims by reward day and propagates conflicts", async () => {
    serviceMocks.claimDailyChest.mockResolvedValue({ granted: { coins: 40, day: 3 }, streak: 3 });
    await expect(claimRoute({ context: {} })).resolves.toMatchObject({ data: { granted: { coins: 40, day: 3 } } });
    expect(counterMocks.recordEngagementCounter).toHaveBeenCalledWith("daily_chest_claimed", "day_3");

    serviceMocks.claimDailyChest.mockRejectedValue(Object.assign(new Error("claimed"), { statusCode: 409 }));
    await expect(claimRoute({ context: {} })).rejects.toMatchObject({ statusCode: 409 });
    expect(counterMocks.recordEngagementCounter).toHaveBeenCalledTimes(1);
  });
});

describe("reward schema contract", () => {
  it("creates the shared grant table exactly as the gameplay poller expects", async () => {
    const migration = await readFile(new URL("../drizzle/0020_app_rewards_engagement.sql", import.meta.url), "utf8");
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "player_reward_grants"');
    expect(migration).toContain('"player_uuid" uuid NOT NULL');
    expect(migration).toContain('UNIQUE ("player_uuid", "source", "period_key")');
    expect(migration).toContain('ON "player_reward_grants" ("delivered_at") WHERE "delivered_at" IS NULL');
    expect(migration).toContain('PRIMARY KEY ("player_id", "claim_date")');
  });

  it("only moves never-saved notification preferences to the new defaults", async () => {
    const migration = await readFile(new URL("../drizzle/0020_app_rewards_engagement.sql", import.meta.url), "utf8");
    expect(migration).toContain('preference."updated_at" <> user_row."created_at"');
    expect(migration).toContain('WHERE "explicitly_saved_at" IS NULL');
    expect(migration).toContain('ALTER COLUMN "rally_enabled" SET DEFAULT true');
    const put = await readFile(new URL("../server/api/mobile/v1/notification-preferences.put.ts", import.meta.url), "utf8");
    expect(put).toContain("explicitlySavedAt: new Date()");
    const outbox = await readFile(new URL("../server/services/mobile-notification-outbox.ts", import.meta.url), "utf8");
    expect(outbox).toContain("coalesce(${mobileNotificationPreferences.rallyEnabled}, true)");
    expect(outbox).toContain("coalesce(${mobileNotificationPreferences.friendOnlineEnabled}, true)");
    expect(outbox).toContain("coalesce(${mobileNotificationPreferences.dailyReminderEnabled}, true)");
  });
});

describe("goal calendar", () => {
  it("resets daily and weekly goals at midnight Europe/Paris, like CookieDough", async () => {
    const { goalCalendar, ACHIEVEMENT_TOTAL, GOAL_RESET_TIMEZONE } = await import("../server/services/mobile-engagement");
    expect(GOAL_RESET_TIMEZONE).toBe("Europe/Paris");
    expect(ACHIEVEMENT_TOTAL).toBe(7);
    // Sunday 23:30 Paris (summer time) is still the old ISO week.
    expect(goalCalendar(new Date("2026-10-04T21:30:00Z"))).toEqual({
      day: "2026-10-04",
      week: "2026-W40",
      dailyReset: new Date("2026-10-04T22:00:00.000Z"),
      weeklyReset: new Date("2026-10-04T22:00:00.000Z"),
    });
    // 00:30 Paris on Monday already belongs to the new week even though UTC is still Sunday.
    expect(goalCalendar(new Date("2026-10-04T22:30:00Z"))).toMatchObject({
      day: "2026-10-05",
      week: "2026-W41",
      weeklyReset: new Date("2026-10-11T22:00:00.000Z"),
    });
  });

  it("replaces the elimination goal with a mode-neutral five-match goal", async () => {
    const source = await readFile(new URL("../server/services/mobile-engagement.ts", import.meta.url), "utf8");
    expect(source).toContain('objective("weekly-finish5", "Finish 5 matches"');
    expect(source).not.toContain("weekly-kills");
    const producer = await readFile(new URL("../server/services/mobile-engagement-notifications.ts", import.meta.url), "utf8");
    expect(producer).not.toContain("éliminations");
    expect(producer).toContain("(now() AT TIME ZONE 'Europe/Paris')::date");
  });
});
