import { afterEach, describe, expect, it, vi } from "vitest";
import {
  logExpression,
  metricExpression,
  queryAdminLogs,
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

  it.each(["constructor", "toString", "__proto__"])("rejects inherited property %s", (key) => {
    expect(() => metricExpression(key)).toThrow("Unsupported metric key");
    expect(() => logExpression(key)).toThrow("Unsupported log key");
  });
});

describe("admin telemetry redaction", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves credential labels when masking values", () => {
    expect(redactAdminTelemetry("password=hunter2 api_key: abc123"))
      .toBe("password=[REDACTED] api_key=[REDACTED]");
  });

  it("redacts log service results before returning them to the dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      data: { result: [{ values: [["123", "password=hunter2 from 192.0.2.4"]] }] },
    })));
    const result = await queryAdminLogs({ baseUrl: "http://loki.test", key: "recent" });
    expect(result).toEqual({
      data: { result: [{ values: [["123", "password=[REDACTED] from [REDACTED_IP]"]] }] },
    });
  });
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
