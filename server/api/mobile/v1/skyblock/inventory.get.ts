import { getQuery } from "h3";
import { requireMobileCapability } from "../../../../services/mobile-capabilities";
import { skyblockInventory } from "../../../../services/mobile-skyblock";
import { requireMobileUser } from "../../../../services/mobile-user";
import { enforceMobileRequestRateLimit } from "../../../../utils/mobile-rate-limit";
import { skyblockInventoryQuery } from "../../../../utils/mobile-skyblock";

export default defineEventHandler(async (event) => {
  await requireMobileCapability("skyblockCompanion");
  const { auth } = await requireMobileUser(event);
  enforceMobileRequestRateLimit(`skyblock-inventory:${auth.uid}`, 60, 60_000);
  const inventory = await skyblockInventory(auth.uid, skyblockInventoryQuery(getQuery(event)));
  setHeader(event, "Cache-Control", "private, no-store");
  return { data: inventory };
});
