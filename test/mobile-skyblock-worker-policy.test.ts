import { describe, expect, it } from "vitest";
import {
  SKYBLOCK_WORKER_POLICY,
  skyblockWorkerBufferCapacity,
  skyblockWorkerUpgradeCapacity,
} from "../server/services/mobile-skyblock-management-policy";

describe("Skyblock worker policy", () => {
  it("uses the durable V3 capacity progression from the shared policy contract", () => {
    expect(SKYBLOCK_WORKER_POLICY.clockSkewToleranceSeconds).toBe(5);
    for (let tier = 1; tier <= 5; tier += 1) {
      expect(skyblockWorkerBufferCapacity(tier)).toBe(
        SKYBLOCK_WORKER_POLICY.tiers.find(
          (candidate) => candidate.tier === tier,
        )?.bufferCapacity,
      );
    }
    expect([1, 2, 3, 4, 5].map(skyblockWorkerBufferCapacity)).toEqual([
      64, 128, 256, 512, 1_024,
    ]);
  });

  it("rejects tiers outside the gameplay contract", () => {
    expect(() => skyblockWorkerBufferCapacity(0)).toThrowError();
    expect(() => skyblockWorkerBufferCapacity(6)).toThrowError();
  });

  it("keeps grandfathered V2 workers on the gameplay capacity curve", () => {
    expect(skyblockWorkerUpgradeCapacity(2, "legacy_v2")).toBe(512);
    expect(skyblockWorkerUpgradeCapacity(5, "legacy_v2")).toBe(1_280);
    expect(skyblockWorkerUpgradeCapacity(2, "collection:cobblestone:100")).toBe(
      128,
    );
  });
});
