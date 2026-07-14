import { and, eq } from "drizzle-orm";
import db from "../../../../../db/client";
import { mobileDevices } from "../../../../../db/schema";
import {
  lockActiveMobileUser,
  requireMobileUser,
} from "../../../../services/mobile-user";
import { requiredString } from "../../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const installationId = requiredString(getRouterParam(event, "installationId"), "installationId", {
    minimum: 8,
    maximum: 128,
  });
  const revoked = await db.transaction(async (tx) => {
    const user = await lockActiveMobileUser(tx, auth.uid);
    return tx
      .update(mobileDevices)
      .set({ revokedAt: new Date(), notificationsAuthorized: false, lastSeenAt: new Date() })
      .where(and(
        eq(mobileDevices.mobileUserId, user.id),
        eq(mobileDevices.installationId, installationId),
      ))
      .returning({ id: mobileDevices.id });
  });

  if (!revoked.length) throw createError({ statusCode: 404, statusMessage: "Device not found" });
  setResponseStatus(event, 204);
  return null;
});
