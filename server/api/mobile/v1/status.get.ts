import { fetchMobileServerStatus } from "../../../services/mobile-status";

export default defineCachedEventHandler(
  async () => ({ data: await fetchMobileServerStatus() }),
  { maxAge: 30, name: "cookie-build-mobile-status-v1" },
);
