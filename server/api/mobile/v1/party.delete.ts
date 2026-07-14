import { disbandParty } from "../../../services/mobile-social";
import { requireMobileUser } from "../../../services/mobile-user";
import { requireMobileSocialFeature } from "../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("parties");
  const { auth } = await requireMobileUser(event);
  return { data: await disbandParty(auth.uid) };
});
