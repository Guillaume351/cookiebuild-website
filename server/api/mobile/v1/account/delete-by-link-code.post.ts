import { getRequestIP, readBody } from "h3";
import { completeFirebaseIdentityDeletion } from "../../../../services/mobile-account";
import { beginMobileAccountDeletionByLinkCode } from "../../../../services/mobile-player-link";
import { firebaseAuth } from "../../../../utils/mobile-auth";
import { enforceLinkClaimRateLimit } from "../../../../utils/mobile-rate-limit";
import { normalizeLinkCode } from "../../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  const requestIp = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  await enforceLinkClaimRateLimit(`delete-ip:${requestIp}`, { event });
  const body = await readBody<{ code?: unknown }>(event);
  const link = await beginMobileAccountDeletionByLinkCode(normalizeLinkCode(body?.code));
  const { outboxId } = link;

  let identityDeletionPending = false;
  try {
    await firebaseAuth().deleteUser(link.firebaseUid);
    await completeFirebaseIdentityDeletion(outboxId, link.firebaseUid);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : undefined;
    if (code === "auth/user-not-found") {
      await completeFirebaseIdentityDeletion(outboxId, link.firebaseUid);
    } else {
      identityDeletionPending = true;
      console.error("Public mobile account deletion queued for retry", {
        reason: error instanceof Error ? error.name : "unknown",
        outboxId,
      });
    }
  }

  setResponseStatus(event, identityDeletionPending ? 202 : 200);
  return { data: { deleted: true, identityDeletionPending } };
});
