import { commerceHistory } from "../../services/commerce";
import { resolveCommercePayer } from "../../services/commerce-payer";

export default defineEventHandler(async (event) => {
  const data = await commerceHistory(await resolveCommercePayer(event));
  setHeader(event, "Cache-Control", "no-store");
  return { data };
});
