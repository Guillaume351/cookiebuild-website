import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NUXT_DATABASE_URL ??= "postgres://unused:unused@127.0.0.1:1/unused";
});
const h3Mocks = vi.hoisted(() => ({
  readBody: vi.fn(async (): Promise<unknown> => ({})),
  getRequestIP: vi.fn(() => "203.0.113.9"),
  sendNoContent: vi.fn(),
}));
const rateLimitMocks = vi.hoisted(() => ({
  enforceMobileRequestRateLimit: vi.fn(async () => undefined),
}));
const counterMocks = vi.hoisted(() => ({
  incrementEngagementCounter: vi.fn(async () => undefined),
}));

vi.mock("h3", async (importOriginal) => ({
  ...await importOriginal<typeof import("h3")>(),
  ...h3Mocks,
}));
vi.mock("../server/utils/mobile-rate-limit", () => rateLimitMocks);
vi.mock("../server/services/mobile-engagement-counters", async (importOriginal) => ({
  ...await importOriginal<typeof import("../server/services/mobile-engagement-counters")>(),
  ...counterMocks,
}));

import { parseClientErrorReport, scrubClientText } from "../server/utils/mobile-client-errors";
import { renderMobileMetrics, resetMobileMetricsForTests } from "../server/utils/mobile-observability";
import { countedNotificationKind } from "../server/services/mobile-engagement-counters";

describe("client error reports", () => {
  it("scrubs identifying values and access tokens", () => {
    const scrubbed = scrubClientText(
      "Failed for player@example.com at https://www.cookie-build.com/api/x?token=abc "
      + "id 0772c75e-d8a7-4e9d-98a1-f1744dde448e from 192.168.1.20 Bearer abc.def.ghi "
      + "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2lnbmF0dXJl "
      + "key AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
    expect(scrubbed).not.toContain("player@example.com");
    expect(scrubbed).not.toContain("token=abc");
    expect(scrubbed).not.toContain("0772c75e");
    expect(scrubbed).not.toContain("192.168.1.20");
    expect(scrubbed).not.toContain("abc.def.ghi");
    expect(scrubbed).not.toContain("eyJhbGci");
    expect(scrubbed).not.toContain("AAAAAAAAAAAAAAAA");
    expect(scrubbed).toContain("https://www.cookie-build.com/api/x");
  });

  it("validates the contract and truncates every free-text field", () => {
    const report = parseClientErrorReport({
      message: "x".repeat(5_000),
      stack: Array.from({ length: 200 }, (_, index) => `#${index} frame`).join("\n"),
      appVersion: "2.2.0+30",
      platform: "Android",
      route: "/skyblock/listings?secret=1",
    });
    expect(report.platform).toBe("android");
    expect(report.message.length).toBeLessThanOrEqual(500);
    expect(report.stack!.split("\n")).toHaveLength(40);
    expect(report.route).toBe("/skyblock/listings");
    expect(() => parseClientErrorReport({ message: "boom", appVersion: "2.2.0", platform: "web" }))
      .toThrow();
    expect(() => parseClientErrorReport({ message: "", appVersion: "2.2.0", platform: "ios" })).toThrow();
    expect(() => parseClientErrorReport({ message: "boom", appVersion: "2 2", platform: "ios" })).toThrow();
    expect(parseClientErrorReport({ message: "boom", appVersion: "2.2.0", platform: "ios" }))
      .toMatchObject({ stack: null, route: null });
  });

  it("exports a bounded aggregate counter", () => {
    resetMobileMetricsForTests();
    // Import lazily through the route test below; here the pure helper is enough.
    expect(renderMobileMetrics()).toContain("cookiebuild_mobile_client_errors_total");
  });
});

describe("client error and notification-opened routes", () => {
  let clientErrors: (event: unknown) => Promise<unknown>;
  let notificationOpened: (event: unknown) => Promise<unknown>;

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL ??= "postgres://unused:unused@127.0.0.1:1/unused";
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    clientErrors = (await import("../server/api/mobile/v1/client-errors.post")).default as typeof clientErrors;
    notificationOpened = (await import("../server/api/mobile/v1/notifications/opened.post")).default as typeof notificationOpened;
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    const { postgresClient } = await import("../db/client");
    await postgresClient.end({ timeout: 0 });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetMobileMetricsForTests();
  });

  it("logs a scrubbed report without identity and answers 204", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    h3Mocks.readBody.mockResolvedValue({
      message: "Crash for player@example.com",
      appVersion: "2.2.0+30",
      platform: "ios",
    });
    await clientErrors({ context: { mobileAuth: { uid: "firebase-user" } } });
    expect(h3Mocks.sendNoContent).toHaveBeenCalledWith(expect.anything(), 204);
    expect(rateLimitMocks.enforceMobileRequestRateLimit).toHaveBeenCalledWith(
      "client-errors:uid:firebase-user", 30, 600_000, expect.anything(),
    );
    const logged = warn.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logged).toContain("[mobile-client-error]");
    expect(logged).not.toContain("player@example.com");
    expect(logged).not.toContain("firebase-user");
    expect(logged).not.toContain("203.0.113.9");
    expect(renderMobileMetrics()).toContain('cookiebuild_mobile_client_errors_total{platform="ios",app_version="2.2.0+30"} 1');
    warn.mockRestore();
  });

  it("counts notification opens by bounded kind", async () => {
    h3Mocks.readBody.mockResolvedValue({ kind: "weekly_digest", notificationId: "abc" });
    await notificationOpened({ context: {} });
    expect(counterMocks.incrementEngagementCounter).toHaveBeenCalledWith("notification_opened", "weekly_digest");
    expect(rateLimitMocks.enforceMobileRequestRateLimit).toHaveBeenCalledWith(
      "notification-opened:ip:203.0.113.9", 60, 600_000, expect.anything(),
    );
    expect(h3Mocks.sendNoContent).toHaveBeenCalledWith(expect.anything(), 204);

    h3Mocks.readBody.mockResolvedValue({ kind: 42 });
    await expect(notificationOpened({ context: {} })).rejects.toMatchObject({ statusCode: 400 });
  });

  it("folds unknown notification kinds into a single bucket", () => {
    expect(countedNotificationKind("event_reminder")).toBe("event_reminder");
    expect(countedNotificationKind("Player_Rally")).toBe("player_rally");
    expect(countedNotificationKind("made-up-kind-123")).toBe("other");
    expect(countedNotificationKind(undefined)).toBe("other");
  });
});
