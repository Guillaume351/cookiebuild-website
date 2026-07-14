import { describe, expect, it } from "vitest";
import {
  anonymizedFirebaseUid,
  firebaseUidHash,
} from "../server/utils/mobile-identity";

describe("deleted Firebase identity anonymization", () => {
  it("stores a deterministic one-way UID tombstone", () => {
    expect(firebaseUidHash("firebase-user-123")).toBe(
      "4ab08c5d68eeb18c08df44084fd659b3945ca897720de9a8bce5301bd7d2360d",
    );
    expect(firebaseUidHash("firebase-user-123")).not.toContain("firebase-user-123");
  });

  it("replaces the external UID with the internal deletion marker", () => {
    expect(anonymizedFirebaseUid("14a281bb-82b5-4f75-aa37-a42ec54dfd41"))
      .toBe("deleted:14a281bb-82b5-4f75-aa37-a42ec54dfd41");
  });
});
