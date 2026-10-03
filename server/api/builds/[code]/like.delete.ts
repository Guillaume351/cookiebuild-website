import { handleGalleryLike } from "../../../buildbattle/handlers";

/** DELETE /api/builds/<code>/like → { data: { liked: false, likeCount } } (idempotent) */
export default defineEventHandler((event) => handleGalleryLike(event, false));
