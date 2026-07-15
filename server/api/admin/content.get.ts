import { desc } from "drizzle-orm";
import db from "../../../db/client";
import { mobileEvents, mobileNewsPosts } from "../../../db/schema";
import { requireAdminAuth } from "../../utils/admin-auth";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "content:read");
  const [posts, events] = await Promise.all([
    db.select().from(mobileNewsPosts).orderBy(desc(mobileNewsPosts.updatedAt)).limit(200),
    db.select().from(mobileEvents).orderBy(desc(mobileEvents.updatedAt)).limit(200),
  ]);
  return { data: { posts, events } };
});
