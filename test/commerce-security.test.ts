import { describe, expect, it } from "vitest";
import { readCommerceWebhookBody, MAX_COMMERCE_WEBHOOK_BYTES } from "../server/utils/commerce-webhook-body";
import { enforceCommerceRateLimit, resetCommerceRateLimitsForTests } from "../server/utils/commerce-security";

describe("bounded Stripe webhook transport", () => {
  it("accepts chunked bodies with their exact signed bytes", async () => {
    const payload = Buffer.from('{"id":"evt_fixture","name":"é🍪"}');
    async function* chunks() { yield payload.subarray(0, 17); yield payload.subarray(17); }
    expect(await readCommerceWebhookBody(chunks())).toEqual(payload);
  });
  it("stops an oversized streaming body without consuming the remainder", async () => {
    let read = 0; let closed = false;
    async function* chunks() {
      try { for (let index = 0; index < 20; index++) { read++; yield Buffer.alloc(MAX_COMMERCE_WEBHOOK_BYTES / 2); } }
      finally { closed = true; }
    }
    await expect(readCommerceWebhookBody(chunks())).rejects.toMatchObject({ statusCode: 413 });
    expect(read).toBe(3); expect(closed).toBe(true);
  });
  it("rejects an oversized declaration before reading bytes", async () => {
    let read = false;
    async function* chunks() { read = true; yield Buffer.from("x"); }
    await expect(readCommerceWebhookBody(chunks(), String(MAX_COMMERCE_WEBHOOK_BYTES + 1))).rejects.toMatchObject({ statusCode: 413 });
    expect(read).toBe(false);
  });
});

describe("bounded commerce limiter", () => {
  it("rejects new keys at capacity without evicting an active limit, then reclaims expired capacity", () => {
    resetCommerceRateLimitsForTests();
    enforceCommerceRateLimit("protected", 1, 10_000, 0);
    for (let index = 0; index < 9_999; index++) enforceCommerceRateLimit(`key:${index}`, 1, 100, 0);
    expect(() => enforceCommerceRateLimit("overflow", 1, 100, 0)).toThrow(/Too many/);
    expect(() => enforceCommerceRateLimit("protected", 1, 10_000, 1)).toThrow(/Too many/);
    expect(() => enforceCommerceRateLimit("new-after-expiry", 1, 100, 101)).not.toThrow();
    expect(() => enforceCommerceRateLimit("protected", 1, 10_000, 101)).toThrow(/Too many/);
    resetCommerceRateLimitsForTests();
  });
});
