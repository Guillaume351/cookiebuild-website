import { eq } from "drizzle-orm";
import db from "../../../../db/client";
import { mobileNotificationPreferences } from "../../../../db/schema";
import { requireMobileUser } from "../../../services/mobile-user";

export default defineEventHandler(async (event) => {
  const { user } = await requireMobileUser(event);
  const preferences = await db.query.mobileNotificationPreferences.findFirst({
    where: eq(mobileNotificationPreferences.mobileUserId, user.id),
  });
  setHeader(event, "Cache-Control", "no-store");
  return { data: preferences };
});
