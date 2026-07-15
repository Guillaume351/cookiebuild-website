import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalInternalRequest,
  sha256Hex,
  signInternalRequest,
  verifyInternalSignature,
} from "../server/services/admin-control-plane";

describe("admin control-plane request signing", () => {
  const secret = "a".repeat(64);

  it("signs the fixed method, path, time, nonce, and body digest contract", () => {
    const body = { action: "restart-minecraft", reason: "scheduled maintenance" };
    const signed = signInternalRequest({
      method: "POST",
      path: "/v1/actions",
      secret,
      body,
      timestamp: "1721030400000",
      nonce: "6dc7b2db-9ed9-4b78-a315-d507c9ac9f52",
    });
    const canonical = canonicalInternalRequest(
      "POST",
      "/v1/actions",
      signed.timestamp,
      signed.nonce,
      sha256Hex(JSON.stringify(body)),
    );
    const expected = createHmac("sha256", secret).update(canonical).digest("hex");

    expect(signed.signature).toBe(expected);
    expect(verifyInternalSignature(expected, signed.signature)).toBe(true);
  });

  it("rejects malformed or different signatures without throwing", () => {
    expect(verifyInternalSignature("a".repeat(64), "bad")).toBe(false);
    expect(verifyInternalSignature("a".repeat(64), "b".repeat(64))).toBe(false);
  });

  it("rejects unsafe paths and weak shared secrets", () => {
    expect(() => signInternalRequest({
      method: "GET",
      path: "//attacker.example/v1/status",
      secret,
    })).toThrow(/relative/);
    expect(() => signInternalRequest({
      method: "GET",
      path: "/v1/status",
      secret: "weak",
    })).toThrow(/safely/);
  });
});
