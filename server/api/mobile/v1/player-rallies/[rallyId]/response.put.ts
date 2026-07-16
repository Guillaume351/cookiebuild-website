import { getRouterParam, readBody, setHeader, setResponseStatus } from "h3";
import { respondToPlayerRally } from "../../../../../services/mobile-rallies";
import { requireMobileUser } from "../../../../../services/mobile-user";
import { exactPlayerRallyResponseBody } from "../../../../../utils/mobile-rallies";
import { playerId } from "../../../../../utils/mobile-social";

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const rallyId = playerId(getRouterParam(event, "rallyId"), "rallyId");
  const response = exactPlayerRallyResponseBody(await readBody(event));
  const result = await respondToPlayerRally(auth.uid, rallyId, response);
  setHeader(event, "Cache-Control", "no-store");
  setResponseStatus(event, result.created ? 201 : 200);
  return { data: result.data };
});
