import { describe, expect, it } from "vitest";
import { databaseErrorCode } from "../server/utils/database-error";

describe("databaseErrorCode", () => {
  it("extracts a direct PostgreSQL SQLSTATE", () => {
    expect(databaseErrorCode({ code: "42P01" })).toBe("42P01");
  });

  it("extracts a SQLSTATE from a wrapped database error", () => {
    expect(databaseErrorCode({ cause: { cause: { code: "42883" } } })).toBe("42883");
  });

  it("handles malformed and cyclic causes without looping", () => {
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    expect(databaseErrorCode(cyclic)).toBeNull();
    expect(databaseErrorCode(new Error("network failure"))).toBeNull();
  });
});
