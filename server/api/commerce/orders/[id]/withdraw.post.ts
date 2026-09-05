import { getRouterParam } from "h3";
import { requestSubscriptionWithdrawal } from "../../../../services/commerce";
import { requireCommerceAuth } from "../../../../services/commerce-session";
import { requiredUuid } from "../../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  const id = requiredUuid(getRouterParam(event, "id"), "order id");
  const data = await requestSubscriptionWithdrawal(requireCommerceAuth(event), id);
  return { data };
});
