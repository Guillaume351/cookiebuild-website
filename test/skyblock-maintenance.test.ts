import { describe, expect, it, vi } from "vitest";
import {
  runSkyblockMaintenance,
  type SkyblockMaintenanceExecutor,
} from "../server/services/skyblock-maintenance";

describe("Skyblock economic maintenance", () => {
  it("runs expiry and every bounded retention purge independently", async () => {
    const executor: SkyblockMaintenanceExecutor = {
      expireListings: vi.fn(async () => 2),
      purgeQuotes: vi.fn(async () => 3),
      purgeIdempotencyRequests: vi.fn(async () => 5),
      purgeRateLimits: vi.fn(async () => 7),
    };

    await expect(runSkyblockMaintenance(executor)).resolves.toEqual({
      expiredListings: 2,
      purgedQuotes: 3,
      purgedIdempotencyRequests: 5,
      purgedRateLimits: 7,
    });
    for (const operation of Object.values(executor)) expect(operation).toHaveBeenCalledOnce();
  });

  it("is safe to invoke repeatedly when no work remains", async () => {
    const executor: SkyblockMaintenanceExecutor = {
      expireListings: vi.fn(async () => 0),
      purgeQuotes: vi.fn(async () => 0),
      purgeIdempotencyRequests: vi.fn(async () => 0),
      purgeRateLimits: vi.fn(async () => 0),
    };

    await runSkyblockMaintenance(executor);
    await expect(runSkyblockMaintenance(executor)).resolves.toEqual({
      expiredListings: 0,
      purgedQuotes: 0,
      purgedIdempotencyRequests: 0,
      purgedRateLimits: 0,
    });
  });
});
