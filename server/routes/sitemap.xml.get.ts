import { buildMarketingSitemap } from "@/utils/marketing-sitemap";

export default defineEventHandler((event) => {
  setHeader(event, "content-type", "application/xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600, stale-while-revalidate=86400");
  return buildMarketingSitemap();
});
