import { createParty } from "../../../services/mobile-social";
import { requireMobileUser } from "../../../services/mobile-user";
import { requireMobileSocialFeature } from "../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  requireMobileSocialFeature("parties");
  const { auth } = await requireMobileUser(event);
  const party = await createParty(auth.uid);
  setResponseStatus(event, 201);
  return { data: party };
});
