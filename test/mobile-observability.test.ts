import { beforeEach, describe, expect, it } from "vitest";
import {
  mobileEventForRequest,
  recordMobileProductEvent,
  renderMobileMetrics,
  resetMobileMetricsForTests,
} from "../server/utils/mobile-observability";

describe("private aggregated mobile observability", () => {
  beforeEach(resetMobileMetricsForTests);

  it("maps dynamic Skyblock routes to bounded shared event names", () => {
    expect(mobileEventForRequest("/api/mobile/v1/skyblock/listings/any-uuid/purchase", "POST"))
      .toBe("skyblock_listing_purchased");
    expect(mobileEventForRequest("/api/mobile/v1/skyblock/listings", "POST"))
      .toBe("skyblock_listing_created");
    expect(mobileEventForRequest("/api/mobile/v1/private/player-123", "GET")).toBeNull();
  });

  it("exports only aggregate labels and no request identity", () => {
    recordMobileProductEvent("skyblock_generator_upgraded", "success", 0.125);
    const output = renderMobileMetrics();
    expect(output).toContain('event="skyblock_generator_upgraded",source="mobile_api",result="success"');
    expect(output).toContain("cookiebuild_mobile_request_duration_seconds_sum");
    expect(output).not.toContain("player");
    expect(output).not.toContain("firebase");
  });
});
