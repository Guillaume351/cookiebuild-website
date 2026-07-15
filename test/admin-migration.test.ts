import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../drizzle/0007_admin_control_center.sql", import.meta.url), "utf8");

describe("admin control center migration", () => {
  it("defines the security and phase 1 tables additively", () => {
    for (const table of ["admin_users", "admin_audit_log", "admin_report_cases", "admin_notification_campaigns"]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS \"${table}\"`);
    }
    expect(migration).toContain("admin_audit_log is append-only");
    expect(migration).toContain("ADD COLUMN \"content_type\"");
    expect(migration).toContain("SET \"content_type\" = 'changelog'");
  });

  it("locks the AdminBridge, operations and update-monitor contracts", () => {
    for (const table of ["admin_commands", "moderation_actions", "admin_runtime_snapshots", "admin_runtime_events", "ops_actions", "update_check_runs"]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS \"${table}\"`);
    }
    expect(migration).toContain("\"idempotency_key\" varchar(255) NOT NULL UNIQUE");
    expect(migration).toContain("\"event_id\" uuid NOT NULL UNIQUE");
  });
});
