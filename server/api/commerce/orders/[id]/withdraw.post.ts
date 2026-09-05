import { getRouterParam } from "h3";
import { requestSubscriptionWithdrawal } from "../../../../services/commerce";
import { resolveCommercePayer } from "../../../../services/commerce-payer";
import { requiredUuid } from "../../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  const id = requiredUuid(getRouterParam(event, "id"), "order id");
  const data = await requestSubscriptionWithdrawal(await resolveCommercePayer(event), id);
  return { data };
});
