import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("mobile device timezone persistence", () => {
  it("ships an additive bounded migration and rejects stale observation overwrites", async () => {
    const [migration, route, outbox] = await Promise.all([
      readFile(new URL("../drizzle/0011_mobile_device_timezone.sql", import.meta.url), "utf8"),
      readFile(new URL("../server/api/mobile/v1/devices.post.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/services/mobile-notification-outbox.ts", import.meta.url), "utf8"),
    ]);

    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "timezone_offset_minutes"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "timezone_observed_at"');
    expect(migration).toContain("BETWEEN -840 AND 840");
    expect(route).toContain("excluded.timezone_observed_at >= COALESCE");
    expect(route).toContain("Invalid timezone snapshot");
    expect(outbox).toContain("${mobileDevices.timezoneOffsetMinutes}");
  });
});
