import { mobilePlayerDashboard } from "../../../../services/mobile-player-dashboard";
import { requireMobileUser } from "../../../../services/mobile-user";

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const dashboard = await mobilePlayerDashboard(auth.uid);
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: dashboard };
});
