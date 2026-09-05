import { describe, expect, it } from "vitest";
import { createMemoryRateLimitStore } from "../server/utils/mobile-memory-rate-limit";

describe("fallback rate-limit capacity", () => {
  it("rejects new keys at capacity without resetting existing windows", async () => {
    const store = createMemoryRateLimitStore(2);
    const consume = (keyHash: string, now = 1) => store.consume({ keyHash, limit: 1, windowMs: 60_000, now: new Date(now) });
    expect((await consume("a")).allowed).toBe(true);
    expect((await consume("b")).allowed).toBe(true);
    for (let key = 0; key < 100; key += 1) expect((await consume(`overflow-${key}`)).allowed).toBe(false);
    expect((await consume("a")).allowed).toBe(false);
    expect((await consume("b")).allowed).toBe(false);
    expect((await consume("new", 60_001)).allowed).toBe(true);
  });

  it("incrementally reclaims expired keys while preserving active keys", async () => {
    const store = createMemoryRateLimitStore(40);
    const consume = (keyHash: string, now: number, windowMs: number) => store.consume({ keyHash, limit: 1, windowMs, now: new Date(now) });
    for (let key = 0; key < 40; key += 1) await consume(String(key), 0, key % 2 ? 60_000 : 100);
    for (let key = 0; key < 20; key += 1) expect((await consume(`new-${key}`, 200, 60_000)).allowed).toBe(true);
    expect((await consume("overflow", 200, 60_000)).allowed).toBe(false);
    expect((await consume("1", 200, 60_000)).allowed).toBe(false);
  });
});
