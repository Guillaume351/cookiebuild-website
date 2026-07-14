import {
  beginMobileAccountDeletion,
  completeFirebaseIdentityDeletion,
} from "../../../services/mobile-account";
import { requireMobileUser } from "../../../services/mobile-user";
import { firebaseAuth } from "../../../utils/mobile-auth";

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const { outboxId } = await beginMobileAccountDeletion(auth.uid);

  let identityDeletionPending = false;
  try {
    await firebaseAuth().deleteUser(auth.uid);
    await completeFirebaseIdentityDeletion(outboxId, auth.uid);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : undefined;
    if (code === "auth/user-not-found") {
      await completeFirebaseIdentityDeletion(outboxId, auth.uid);
    } else {
      identityDeletionPending = true;
      console.error("Firebase account deletion queued for retry", {
        reason: error instanceof Error ? error.name : "unknown",
        outboxId,
      });
    }
  }

  setResponseStatus(event, identityDeletionPending ? 202 : 200);
  return { data: { deleted: true, identityDeletionPending } };
});
