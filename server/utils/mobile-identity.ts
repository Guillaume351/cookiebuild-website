import { createHash } from "node:crypto";

export function firebaseUidHash(firebaseUid: string) {
  return createHash("sha256").update(firebaseUid, "utf8").digest("hex");
}

export function anonymizedFirebaseUid(userId: string) {
  return `deleted:${userId}`;
}
