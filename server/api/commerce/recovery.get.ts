import { commercePortalLoginUrl } from "../../utils/commerce-recovery";
export default defineEventHandler(() => ({ data: { portalLoginUrl: commercePortalLoginUrl() } }));
