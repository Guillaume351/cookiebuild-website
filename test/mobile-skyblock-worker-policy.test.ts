import { describe, expect, it } from "vitest";
import {
  SKYBLOCK_WORKER_POLICY,
  skyblockWorkerBufferCapacity,
} from "../server/services/mobile-skyblock-management-policy";

describe("Skyblock worker policy", () => {
  it("derives the TypeScript buffer ceiling from the shared policy contract", () => {
    for (let tier = 1; tier <= 5; tier += 1) {
      expect(skyblockWorkerBufferCapacity(tier)).toBe(
        tier * SKYBLOCK_WORKER_POLICY.tierBufferCapacityMultiplier,
      );
    }
  });

  it("rejects tiers outside the gameplay contract", () => {
    expect(() => skyblockWorkerBufferCapacity(0)).toThrowError();
    expect(() => skyblockWorkerBufferCapacity(6)).toThrowError();
  });
});
