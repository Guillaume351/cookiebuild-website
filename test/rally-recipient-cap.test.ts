import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../drizzle/0023_rally_recipient_cap.sql", import.meta.url), "utf8");
const outbox = readFileSync(new URL("../server/services/mobile-notification-outbox.ts", import.meta.url), "utf8");

describe("rally recipient cap", () => {
  it("adds the per-device rally timestamp idempotently", () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "last_rally_sent_at" timestamptz');
  });

  it("reserves each device atomically before sending a rally", () => {
    expect(outbox).toContain('preference === "rally" ? await claimRallyRecipients(quietEligible)');
    expect(outbox).toContain("RALLY_DEVICE_COOLDOWN_HOURS = 3");
    expect(outbox).toMatch(/\.update\(mobileDevices\)[\s\S]*lastRallySentAt: sql`now\(\)`[\s\S]*\.returning/);
  });
});
