import { describe, expect, it } from "vitest";
import { mobileAuthFailure } from "../server/utils/mobile-auth";

describe("mobile auth middleware failure mapping", () => {
  it.each([
    "auth/argument-error",
    "auth/id-token-expired",
    "auth/id-token-revoked",
    "auth/invalid-id-token",
    "auth/user-disabled",
    "auth/user-not-found",
  ])("maps %s to an unauthorized response", (code) => {
    expect(mobileAuthFailure({ code })).toMatchObject({
      statusCode: 401,
      statusMessage: "Invalid or expired token",
      logLevel: "warn",
    });
  });

  it.each([
    "app/invalid-credential",
    "auth/insufficient-permission",
    "auth/internal-error",
    "auth/network-request-failed",
  ])("maps %s to service unavailable", (code) => {
    expect(mobileAuthFailure({ code })).toMatchObject({
      statusCode: 503,
      statusMessage: "Authentication service unavailable",
      logLevel: "error",
    });
  });

  it("fails closed as unavailable for an unclassified Admin outage", () => {
    expect(mobileAuthFailure(new Error("socket closed"))).toMatchObject({
      statusCode: 503,
      reason: "Error",
    });
  });
});
