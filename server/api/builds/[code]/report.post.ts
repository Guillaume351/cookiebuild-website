import { sendNoContent } from "h3";
import { handleGalleryReport } from "../../../buildbattle/handlers";

/** POST /api/builds/<code>/report { reason } → 204 */
export default defineEventHandler(async (event) => {
  await handleGalleryReport(event);
  return sendNoContent(event, 204);
});
