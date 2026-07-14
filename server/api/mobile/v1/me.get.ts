import { mobileMe, requireMobileUser } from "../../../services/mobile-user";

export default defineEventHandler(async (event) => {
  const { auth } = await requireMobileUser(event);
  const me = await mobileMe(auth.uid);
  if (!me) throw createError({ statusCode: 404, statusMessage: "Account not found" });
  setHeader(event, "Cache-Control", "no-store");
  return { data: me };
});
