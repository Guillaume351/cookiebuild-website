import { describe, expect, it } from "vitest";
import { exactPlayerRallyResponseBody } from "../server/utils/mobile-rallies";

describe("mobile player rally response validation", () => {
  it("accepts only the two predefined response values", () => {
    expect(exactPlayerRallyResponseBody({ response: "joining" })).toBe("joining");
    expect(exactPlayerRallyResponseBody({ response: "unavailable" })).toBe("unavailable");
    expect(() => exactPlayerRallyResponseBody({ response: "maybe" })).toThrowError();
  });

  it("rejects text, missing fields, arrays, and extra fields", () => {
    expect(() => exactPlayerRallyResponseBody("joining")).toThrowError();
    expect(() => exactPlayerRallyResponseBody({})).toThrowError();
    expect(() => exactPlayerRallyResponseBody({ response: "joining", message: "custom" }))
      .toThrowError();
    expect(() => exactPlayerRallyResponseBody(["joining"])).toThrowError();
  });
});
