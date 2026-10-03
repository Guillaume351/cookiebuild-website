import { sql, type SQL } from "drizzle-orm";
import { createError } from "h3";
import db from "../../db/client";
import { adminAuditLog } from "../../db/schema";
import {
  buildOgImageUrl,
  buildPageUrl,
  localizedThemeName,
  type BuildDetail,
  type BuildReportReason,
  type BuildSummary,
  type GalleryLocale,
} from "../../shared/buildbattle-gallery";
import { encodeGalleryCursor, galleryPeriodStart, type GalleryListQuery } from "../buildbattle/query";

/** A build is hidden from every public API once this many distinct reporters flagged it. */
export const AUTO_HIDE_REPORTS = 3;

export interface BuildRow extends Record<string, unknown> {
  id: string;
  shortCode: string;
  playerName: string | null;
  themeKey: string;
  themeName: string;
  outcome: string;
  placement: number | null;
  builders: number;
  blockCount: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  likeCount: number;
  createdAt: Date | string;
  /** created_at in microseconds since the epoch (exact keyset position). */
  createdUs: string;
}

const SUMMARY_COLUMNS = sql`
  build.id,
  build.short_code AS "shortCode",
  player.name AS "playerName",
  build.theme_key AS "themeKey",
  build.theme_name AS "themeName",
  build.outcome,
  build.placement,
  build.builders,
  build.block_count AS "blockCount",
  build.size_x AS "sizeX",
  build.size_y AS "sizeY",
  build.size_z AS "sizeZ",
  build.like_count AS "likeCount",
  build.created_at AS "createdAt",
  (extract(epoch from date_trunc('second', build.created_at))::bigint * 1000000
    + extract(microseconds from build.created_at)::bigint % 1000000)::text AS "createdUs"
`;

const microsToTimestamp = (micros: string) => sql`(TIMESTAMPTZ 'epoch' + ${micros}::bigint * INTERVAL '1 microsecond')`;

export function toBuildSummary(row: BuildRow, locale: GalleryLocale | null): BuildSummary {
  const likeCount = Number(row.likeCount);
  return {
    id: row.id,
    shortCode: row.shortCode,
    playerName: row.playerName ?? null,
    theme: localizedThemeName(row.themeKey, row.themeName, locale),
    themeKey: row.themeKey,
    outcome: row.outcome,
    placement: row.placement === null || row.placement === undefined ? null : Number(row.placement),
    builders: Number(row.builders),
    blockCount: Number(row.blockCount),
    size: [Number(row.sizeX), Number(row.sizeY), Number(row.sizeZ)],
    likeCount,
    createdAt: new Date(row.createdAt).toISOString(),
    url: buildPageUrl(row.shortCode, locale),
    ogImageUrl: buildOgImageUrl(row.shortCode, likeCount, locale),
  };
}

/** Builds the keyset-paginated listing statement (exported for static tests). */
export function galleryListStatement(query: GalleryListQuery, now = new Date()): SQL {
  const conditions: SQL[] = [sql`build.status = 'published'`];
  const periodStart = galleryPeriodStart(query.period, now);
  if (periodStart) conditions.push(sql`build.created_at >= ${periodStart.toISOString()}::timestamptz`);
  if (query.player) conditions.push(sql`lower(player.name) = lower(${query.player})`);
  const cursor = query.cursor;
  if (cursor && query.sort === "top") {
    conditions.push(sql`(build.like_count, build.created_at, build.id) < (${cursor.likeCount}::integer, ${microsToTimestamp(cursor.createdUs)}, ${cursor.id}::uuid)`);
  } else if (cursor) {
    conditions.push(sql`(build.created_at, build.id) < (${microsToTimestamp(cursor.createdUs)}, ${cursor.id}::uuid)`);
  }
  const order = query.sort === "top"
    ? sql`build.like_count DESC, build.created_at DESC, build.id DESC`
    : sql`build.created_at DESC, build.id DESC`;
  return sql`
    SELECT ${SUMMARY_COLUMNS}
      FROM buildbattle_builds build
      JOIN playerdata player ON player.id = build.player_id
     WHERE ${sql.join(conditions, sql` AND `)}
     ORDER BY ${order}
     LIMIT ${query.limit + 1}
  `;
}

/** Splits limit+1 rows into a page and the opaque cursor of the next one. */
export function galleryPage(rows: BuildRow[], query: GalleryListQuery) {
  const items = rows.slice(0, query.limit);
  const last = items[items.length - 1];
  const nextCursor = rows.length > query.limit && last
    ? encodeGalleryCursor({ sort: query.sort, likeCount: Number(last.likeCount), createdUs: String(last.createdUs), id: last.id })
    : null;
  return { items: items.map((row) => toBuildSummary(row, query.locale)), nextCursor };
}

export async function listGalleryBuilds(query: GalleryListQuery, now = new Date()) {
  const rows = await db.execute<BuildRow>(galleryListStatement(query, now));
  return galleryPage([...rows], query);
}

function notFound(): never {
  throw createError({ statusCode: 404, statusMessage: "Build not found" });
}

export async function getGalleryBuild(shortCode: string, likerKey: string | null, locale: GalleryLocale | null): Promise<BuildDetail> {
  const rows = await db.execute<BuildRow & { liked: boolean }>(sql`
    SELECT ${SUMMARY_COLUMNS},
           ${likerKey
             ? sql`EXISTS (SELECT 1 FROM buildbattle_build_likes vote WHERE vote.build_id = build.id AND vote.liker_key = ${likerKey})`
             : sql`false`} AS liked
      FROM buildbattle_builds build
      JOIN playerdata player ON player.id = build.player_id
     WHERE build.short_code = ${shortCode} AND build.status = 'published'
     LIMIT 1
  `);
  const row = rows[0];
  if (!row) notFound();
  return { ...toBuildSummary(row, locale), liked: Boolean(row.liked) };
}

/** Stored gzip payload of a published build (never decompressed here). */
export async function getGalleryBuildBlocks(shortCode: string) {
  const rows = await db.execute<{ id: string; data: Buffer | Uint8Array }>(sql`
    SELECT id, data FROM buildbattle_builds
     WHERE short_code = ${shortCode} AND status = 'published'
     LIMIT 1
  `);
  const row = rows[0];
  if (!row) notFound();
  return { id: row.id, data: Buffer.from(row.data) };
}

export async function getGalleryBuildCard(shortCode: string) {
  const rows = await db.execute<BuildRow>(sql`
    SELECT ${SUMMARY_COLUMNS}
      FROM buildbattle_builds build
      JOIN playerdata player ON player.id = build.player_id
     WHERE build.short_code = ${shortCode} AND build.status = 'published'
     LIMIT 1
  `);
  return rows[0] ?? notFound();
}

export async function getGalleryBuildData(id: string) {
  const rows = await db.execute<{ data: Buffer | Uint8Array }>(sql`
    SELECT data FROM buildbattle_builds WHERE id = ${id}::uuid AND status = 'published' LIMIT 1
  `);
  const row = rows[0];
  if (!row) notFound();
  return Buffer.from(row.data);
}

/**
 * Idempotent like/unlike. The vote row and like_count change in one transaction,
 * and only an actual insert/delete moves the counter.
 */
export async function setGalleryLike(shortCode: string, likerKey: string, liked: boolean) {
  return db.transaction(async (tx) => {
    const builds = await tx.execute<{ id: string; likeCount: number }>(sql`
      SELECT id, like_count AS "likeCount" FROM buildbattle_builds
       WHERE short_code = ${shortCode} AND status = 'published'
       LIMIT 1
    `);
    const build = builds[0];
    if (!build) notFound();
    const changed = liked
      ? await tx.execute(sql`
          INSERT INTO buildbattle_build_likes (build_id, liker_key)
          VALUES (${build.id}::uuid, ${likerKey})
          ON CONFLICT (build_id, liker_key) DO NOTHING
          RETURNING build_id
        `)
      : await tx.execute(sql`
          DELETE FROM buildbattle_build_likes
           WHERE build_id = ${build.id}::uuid AND liker_key = ${likerKey}
          RETURNING build_id
        `);
    if (!changed.length) {
      const current = await tx.execute<{ likeCount: number }>(sql`
        SELECT like_count AS "likeCount" FROM buildbattle_builds WHERE id = ${build.id}::uuid
      `);
      return { liked, likeCount: Number(current[0]?.likeCount ?? build.likeCount) };
    }
    const updated = await tx.execute<{ likeCount: number }>(liked
      ? sql`UPDATE buildbattle_builds SET like_count = like_count + 1 WHERE id = ${build.id}::uuid RETURNING like_count AS "likeCount"`
      : sql`UPDATE buildbattle_builds SET like_count = GREATEST(like_count - 1, 0) WHERE id = ${build.id}::uuid RETURNING like_count AS "likeCount"`);
    return { liked, likeCount: Number(updated[0]?.likeCount ?? 0) };
  });
}

/** Records one report per reporter; the third distinct report hides the build. */
export async function reportGalleryBuild(shortCode: string, reporterKey: string, reason: BuildReportReason) {
  return db.transaction(async (tx) => {
    const builds = await tx.execute<{ id: string }>(sql`
      SELECT id FROM buildbattle_builds WHERE short_code = ${shortCode} AND status = 'published' LIMIT 1
    `);
    const build = builds[0];
    if (!build) notFound();
    const inserted = await tx.execute(sql`
      INSERT INTO buildbattle_build_reports (build_id, reporter_key, reason)
      VALUES (${build.id}::uuid, ${reporterKey}, ${reason})
      ON CONFLICT (build_id, reporter_key) DO NOTHING
      RETURNING build_id
    `);
    if (!inserted.length) return { recorded: false, hidden: false };
    const updated = await tx.execute<{ status: string }>(sql`
      UPDATE buildbattle_builds
         SET report_count = report_count + 1,
             status = CASE WHEN status = 'published' AND report_count + 1 >= ${AUTO_HIDE_REPORTS} THEN 'hidden' ELSE status END
       WHERE id = ${build.id}::uuid
      RETURNING status
    `);
    const hidden = updated[0]?.status === "hidden";
    if (hidden) console.info("[bb-gallery]", JSON.stringify({ event: "build_auto_hidden", buildId: build.id }));
    return { recorded: true, hidden };
  });
}

export const ADMIN_BUILD_FILTERS = ["reported", "hidden", "all"] as const;
export type AdminBuildFilter = (typeof ADMIN_BUILD_FILTERS)[number];

export interface AdminBuildRow extends Record<string, unknown> {
  id: string;
  shortCode: string;
  playerId: string;
  playerName: string | null;
  themeKey: string;
  themeName: string;
  status: string;
  likeCount: number;
  reportCount: number;
  createdAt: Date;
  lastReportAt: Date | null;
  reasons: Record<string, number> | null;
}

export async function listAdminBuilds(filter: AdminBuildFilter, limit: number) {
  const where = filter === "reported"
    ? sql`build.status = 'published' AND build.report_count > 0`
    : filter === "hidden"
      ? sql`build.status = 'hidden'`
      : sql`true`;
  const rows = await db.execute<AdminBuildRow>(sql`
    SELECT build.id,
           build.short_code AS "shortCode",
           build.player_id AS "playerId",
           player.name AS "playerName",
           build.theme_key AS "themeKey",
           build.theme_name AS "themeName",
           build.status,
           build.like_count AS "likeCount",
           build.report_count AS "reportCount",
           build.created_at AS "createdAt",
           reports.last_report_at AS "lastReportAt",
           reports.reasons
      FROM buildbattle_builds build
      LEFT JOIN playerdata player ON player.id = build.player_id
      LEFT JOIN LATERAL (
        SELECT max(report.created_at) AS last_report_at,
               jsonb_object_agg(report.reason, report.total) AS reasons
          FROM (
            SELECT reason, count(*)::int AS total, max(created_at) AS created_at
              FROM buildbattle_build_reports
             WHERE build_id = build.id
             GROUP BY reason
          ) report
      ) reports ON true
     WHERE ${where}
     ORDER BY reports.last_report_at DESC NULLS LAST, build.created_at DESC
     LIMIT ${limit}
  `);
  return [...rows].map((row) => ({ ...row, url: buildPageUrl(row.shortCode, "fr") }));
}

type AdminAudit = Omit<typeof adminAuditLog.$inferInsert, "id" | "createdAt">;

/**
 * Admin hide/restore with an audit entry in the same transaction. Restoring
 * clears the report counter (existing reporters cannot report again) and keeps
 * the owner's opt-out: an opted-out player's build goes back to private.
 */
export async function moderateBuild(id: string, action: "hide" | "restore", audit: (status: string) => AdminAudit) {
  return db.transaction(async (tx) => {
    const updated = await tx.execute<{ id: string; status: string }>(action === "hide"
      ? sql`
          UPDATE buildbattle_builds SET status = 'hidden'
           WHERE id = ${id}::uuid AND status = 'published'
          RETURNING id, status
        `
      : sql`
          UPDATE buildbattle_builds build
             SET status = CASE WHEN EXISTS (
                   SELECT 1 FROM buildbattle_gallery_settings settings
                    WHERE settings.player_id = build.player_id AND settings.gallery_opt_out
                 ) THEN 'private' ELSE 'published' END,
                 report_count = 0
           WHERE build.id = ${id}::uuid AND build.status = 'hidden'
          RETURNING build.id, build.status
        `);
    const row = updated[0];
    if (!row) {
      const existing = await tx.execute<{ status: string }>(sql`SELECT status FROM buildbattle_builds WHERE id = ${id}::uuid`);
      if (!existing[0]) throw createError({ statusCode: 404, statusMessage: "Build not found" });
      throw createError({ statusCode: 409, statusMessage: `Build is ${existing[0].status}` });
    }
    await tx.insert(adminAuditLog).values(audit(row.status));
    return { id: row.id, status: row.status };
  });
}
