import { handleGalleryLike } from "../../../buildbattle/handlers";

/** POST /api/builds/<code>/like → { data: { liked: true, likeCount } } (idempotent) */
export default defineEventHandler((event) => handleGalleryLike(event, true));
