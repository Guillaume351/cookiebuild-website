import { afterEach, describe, expect, it } from "vitest";
import {
  canonicalPlayerPair,
  exactPlayerName,
  mobileFeatureEnabled,
  playerId,
  reportReason,
  requireMobileSocialFeature,
} from "../server/utils/mobile-social";

const FIRST = "11111111-1111-4111-8111-111111111111";
const SECOND = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  delete process.env.MOBILE_FRIENDS_ENABLED;
  delete process.env.MOBILE_PARTIES_ENABLED;
});

describe("mobile social validation", () => {
  it("keeps feature flags fail-closed unless explicitly true", () => {
    expect(mobileFeatureEnabled(undefined)).toBe(false);
    expect(mobileFeatureEnabled("1")).toBe(false);
    expect(mobileFeatureEnabled(" true ")).toBe(true);
    expect(() => requireMobileSocialFeature("friends")).toThrowError();

    process.env.MOBILE_FRIENDS_ENABLED = "true";
    expect(() => requireMobileSocialFeature("friends")).not.toThrow();
    expect(() => requireMobileSocialFeature("social")).not.toThrow();
    expect(() => requireMobileSocialFeature("parties")).toThrowError();
  });

  it("canonicalizes friend pairs independently of request direction", () => {
    expect(canonicalPlayerPair(FIRST, SECOND)).toEqual({
      playerLowId: FIRST,
      playerHighId: SECOND,
    });
    expect(canonicalPlayerPair(SECOND, FIRST)).toEqual({
      playerLowId: FIRST,
      playerHighId: SECOND,
    });
    expect(() => canonicalPlayerPair(FIRST, FIRST)).toThrowError();
  });

  it("accepts only exact structured player identifiers and report reasons", () => {
    expect(exactPlayerName("  CookiePlayer  ")).toBe("CookiePlayer");
    expect(() => exactPlayerName("Cookie*")).toThrowError();
    expect(playerId(FIRST.toUpperCase())).toBe(FIRST);
    expect(() => playerId("not-a-uuid")).toThrowError();
    expect(reportReason("harassment")).toBe("harassment");
    expect(() => reportReason("custom free text")).toThrowError();
  });
});
