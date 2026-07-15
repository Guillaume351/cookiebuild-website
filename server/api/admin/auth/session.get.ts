import { requireAdminAuth } from "../../../utils/admin-auth";

export default defineEventHandler((event) => {
  setHeader(event, "Cache-Control", "no-store");
  return { data: { user: requireAdminAuth(event) } };
});
