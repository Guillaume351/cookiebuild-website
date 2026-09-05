import { publicCosmeticCatalog } from "../../services/cosmetics";

export default defineEventHandler((event) => {
  setHeader(event, "Cache-Control", "public, max-age=300, stale-while-revalidate=900");
  return { data: publicCosmeticCatalog() };
});
