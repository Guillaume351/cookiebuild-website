import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import { getHeader, getQuery } from "h3";
import db from "../../../../db/client";
import { mobileEvents } from "../../../../db/schema";
import { positiveInteger } from "../../../utils/mobile-validation";
import { localizedEventCopy, requestedEventLanguage } from "../../../utils/mobile-events";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const limit = positiveInteger(query.limit, 20, 50);
  const language = requestedEventLanguage(query.locale, getHeader(event, "accept-language"));
  const now = new Date();
  const events = await db
    .select({
      id: mobileEvents.id,
      slug: mobileEvents.slug,
      title: mobileEvents.title,
      description: mobileEvents.description,
      gameType: mobileEvents.gameType,
      imageUrl: mobileEvents.imageUrl,
      startsAt: mobileEvents.startsAt,
      endsAt: mobileEvents.endsAt,
      localizations: mobileEvents.localizations,
    })
    .from(mobileEvents)
    .where(and(
      eq(mobileEvents.status, "scheduled"),
      or(isNull(mobileEvents.endsAt), gt(mobileEvents.endsAt, now)),
    ))
    .orderBy(asc(mobileEvents.startsAt))
    .limit(limit);

  setHeader(event, "Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
  setHeader(event, "Vary", "Accept-Language");
  return {
    data: events.map(({ localizations, ...row }) => ({
      ...row,
      ...localizedEventCopy(row, localizations, language),
    })),
  };
});
