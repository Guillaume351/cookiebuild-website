import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import { getQuery } from "h3";
import db from "../../../../db/client";
import { mobileEvents } from "../../../../db/schema";
import { positiveInteger } from "../../../utils/mobile-validation";

export default defineEventHandler(async (event) => {
  const limit = positiveInteger(getQuery(event).limit, 20, 50);
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
    })
    .from(mobileEvents)
    .where(and(
      eq(mobileEvents.status, "scheduled"),
      or(isNull(mobileEvents.endsAt), gt(mobileEvents.endsAt, now)),
    ))
    .orderBy(asc(mobileEvents.startsAt))
    .limit(limit);

  setHeader(event, "Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
  return { data: events };
});
