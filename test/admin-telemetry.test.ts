import { describe, expect, it } from "vitest";
import {
  logExpression,
  metricExpression,
  redactAdminTelemetry,
} from "../server/services/admin-telemetry";

describe("admin telemetry allow lists", () => {
  it("resolves known metrics without accepting raw PromQL", () => {
    expect(metricExpression("minecraft_mspt")).toBe("cookiebuild_minecraft_mspt");
    expect(() => metricExpression("up or vector(1)")).toThrow(/Unsupported/);
  });

  it("resolves known log views without accepting raw LogQL", () => {
    expect(logExpression("errors")).toContain("component=\"minecraft\"");
    expect(() => logExpression('{job=~".+"}')).toThrow(/Unsupported/);
  });
});

describe("admin telemetry redaction", () => {
  it("redacts credentials, tokens and IP addresses recursively", () => {
    const value = redactAdminTelemetry({
      stream: ["connected to 192.0.2.4 with password=hunter2", "Authorization: Bearer abc.def.ghi"],
      database: "postgresql://admin:secret@example.test/cookiebuild",
    });
    expect(JSON.stringify(value)).not.toContain("hunter2");
    expect(JSON.stringify(value)).not.toContain("192.0.2.4");
    expect(JSON.stringify(value)).not.toContain("admin:secret");
  });
});
