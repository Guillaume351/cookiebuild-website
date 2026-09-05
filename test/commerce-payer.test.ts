import { describe, expect, it, vi } from "vitest";
vi.mock("../db/client", () => ({ default: {} }));
import { payerOwnsOrder } from "../server/services/commerce-payer";
import { normalizeRecipientQuery } from "../server/services/commerce-recipients";
import { commercePortalLoginUrl } from "../server/utils/commerce-recovery";
describe("payer boundary", () => {
  const linked = { playerId: "recipient", playerName: null, sessionId: "session", expiresAt: new Date() };
  const guest = { guestId: "payer", expiresAt: new Date() };
  it("keeps legacy purchases accessible but never treats gift receipt as billing authority", () => {
    expect(payerOwnsOrder(linked, { playerId: "recipient", payerPlayerId: null, payerGuestId: null })).toBe(true);
    expect(payerOwnsOrder(linked, { playerId: "recipient", payerPlayerId: "buyer", payerGuestId: null })).toBe(false);
    expect(payerOwnsOrder(linked, { playerId: "recipient", payerPlayerId: null, payerGuestId: "payer" })).toBe(false);
    expect(payerOwnsOrder(guest, { playerId: "recipient", payerPlayerId: null, payerGuestId: "payer" })).toBe(true);
    expect(payerOwnsOrder({ guestId: "intruder", expiresAt: new Date() }, { playerId: "recipient", payerPlayerId: null, payerGuestId: "payer" })).toBe(false);
  });
  it("normalizes Bedrock names without SQL wildcards or arbitrary enumeration", () => {
    expect(normalizeRecipientQuery(" .Gift Player ")).toBe("gift_player");
    expect(normalizeRecipientQuery("Gift_Player")).toBe("gift_player");
    for (const input of ["x", "%", "foo%", "foo'", [], "a".repeat(17)]) expect(normalizeRecipientQuery(input)).toBe("");
  });
  it("only exposes a genuine Stripe portal recovery URL", () => {
    expect(commercePortalLoginUrl("https://billing.stripe.com/p/login/abc123")).toBe("https://billing.stripe.com/p/login/abc123");
    for (const url of ["http://billing.stripe.com/p/login/abc", "https://evil.test/p/login/abc", "https://user@billing.stripe.com/p/login/abc", "https://billing.stripe.com/p/login/abc?email=private", "javascript:alert(1)"]) expect(commercePortalLoginUrl(url)).toBeNull();
  });
});
