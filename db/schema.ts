import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const chatmessageSeq = pgSequence("chatmessage_seq", {
  startWith: "1",
  increment: "50",
  minValue: "1",
  maxValue: "9223372036854775807",
  cache: "1",
  cycle: false,
});

export const chatmessage = pgTable("chatmessage", {
  id: bigint({ mode: "number" }).primaryKey().notNull(),
  message: varchar({ length: 1024 }).notNull(),
  playerworld: varchar({ length: 255 }).notNull(),
  sender: uuid(),
  sentat: timestamp({ precision: 6, mode: "string" }).notNull(),
});

export const matches = pgTable("matches", {
  id: uuid().primaryKey().notNull(),
  endtime: timestamp({ precision: 6, mode: "string" }),
  gametype: varchar({ length: 255 }).notNull(),
  starttime: timestamp({ precision: 6, mode: "string" }).notNull(),
});

export const playerdata = pgTable("playerdata", {
  id: uuid().primaryKey().notNull(),
  createdat: timestamp({ precision: 6, mode: "string" }),
  lastlogin: timestamp({ precision: 6, mode: "string" }),
  name: varchar({ length: 255 }),
  coins: integer().default(0).notNull(),
  // playtime: bigint({ mode: "number" }), // Supprimé, sera calculé à partir des sessions
});

export const minigameProgression = pgTable(
  "minigame_progression",
  {
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerdata.id),
    minigame: varchar({ length: 255 }).notNull(),
    level: integer().default(1).notNull(),
    experience: integer().default(0).notNull(),
    unlockedKits: varchar("unlocked_kits"),
    lastSelectedKitName: varchar("last_selected_kit_name", { length: 255 }),
    lastSelectedKitLevel: integer("last_selected_kit_level").default(0).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.playerId, table.minigame],
      name: "minigame_progression_pkey",
    }),
  ],
);

export const playerSessions = pgTable("player_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => playerdata.id),
  startTime: timestamp("start_time", { precision: 6, mode: "date" }).notNull(),
  endTime: timestamp("end_time", { precision: 6, mode: "date" }),
  duration: bigint("duration", { mode: "number" }), // en millisecondes
  serverCrash: boolean("server_crash").default(false),
});

export const playerMatchPerformances = pgTable(
  "player_match_performances",
  {
    id: uuid().primaryKey().notNull(),
    assistsinmatch: integer().default(0).notNull(),
    deathsinmatch: integer().default(0).notNull(),
    gameSpecificMetrics: jsonb("game_specific_metrics"),
    killsinmatch: integer().default(0).notNull(),
    matchId: uuid("match_id").notNull(),
    playerId: uuid("player_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: "fkgstiydv38ahc23sxvc0j033lr",
    }),
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [playerdata.id],
      name: "fklni8aav3fe2p6ep8fq4sc9i94",
    }),
    unique("uk26u03l3ifflmyiat5l43emltl").on(table.matchId, table.playerId),
  ]
);

export const matchPlayers = pgTable(
  "match_players",
  {
    matchId: uuid("match_id").notNull(),
    playerId: uuid("player_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [playerdata.id],
      name: "fkfpcpwl4urwk7r2i29fo8qbhv5",
    }),
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: "fkgigmeboyk2dqb71mw4fct0j7i",
    }),
    primaryKey({
      columns: [table.matchId, table.playerId],
      name: "match_players_pkey",
    }),
  ]
);

export const matchWinners = pgTable(
  "match_winners",
  {
    matchId: uuid("match_id").notNull(),
    playerId: uuid("player_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.playerId],
      foreignColumns: [playerdata.id],
      name: "fkhpb4gfu3tikc04eriw3bglc2d",
    }),
    foreignKey({
      columns: [table.matchId],
      foreignColumns: [matches.id],
      name: "fktme3mmmdfsm7up96lcdulj7gg",
    }),
    primaryKey({
      columns: [table.matchId, table.playerId],
      name: "match_winners_pkey",
    }),
  ]
);

export const mobileUsers = pgTable(
  "mobile_users",
  {
    id: uuid().primaryKey().defaultRandom(),
    firebaseUid: varchar("firebase_uid", { length: 128 }).notNull(),
    deletedFirebaseUidHash: varchar("deleted_firebase_uid_hash", { length: 64 }),
    email: varchar({ length: 320 }),
    displayName: varchar("display_name", { length: 80 }),
    avatarUrl: varchar("avatar_url", { length: 2048 }),
    locale: varchar({ length: 16 }),
    timezone: varchar({ length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("mobile_users_firebase_uid_uq").on(table.firebaseUid),
    uniqueIndex("mobile_users_deleted_firebase_uid_hash_uq").on(table.deletedFirebaseUidHash),
  ],
);

export const mobilePlayerLinks = pgTable(
  "mobile_player_links",
  {
    firebaseUid: text("firebase_uid").notNull(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    edition: varchar({ length: 16 }).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    primaryKey({ columns: [table.firebaseUid, table.playerId, table.edition] }),
    index("mobile_player_links_firebase_uid_idx").on(table.firebaseUid),
    uniqueIndex("mobile_player_links_active_player_uq")
      .on(table.playerId, table.edition)
      .where(sql`${table.revokedAt} IS NULL`),
    uniqueIndex("mobile_player_links_active_primary_uq")
      .on(table.firebaseUid)
      .where(sql`${table.isPrimary} AND ${table.revokedAt} IS NULL`),
    check("mobile_player_links_edition_ck", sql`${table.edition} IN ('java', 'bedrock')`),
  ],
);

export const playerLinkChallenges = pgTable(
  "player_link_challenges",
  {
    id: uuid().primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    edition: varchar({ length: 16 }).notNull(),
    codeHmac: varchar("code_hmac", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("player_link_challenges_code_hmac_uq").on(table.codeHmac),
    uniqueIndex("player_link_challenges_active_player_uq")
      .on(table.playerId)
      .where(sql`${table.consumedAt} is null`),
    index("player_link_challenges_expiry_idx").on(table.expiresAt),
    check("player_link_challenges_edition_ck", sql`${table.edition} IN ('java', 'bedrock')`),
  ],
);

export const mobileDevices = pgTable(
  "mobile_devices",
  {
    id: uuid().primaryKey().defaultRandom(),
    mobileUserId: uuid("mobile_user_id")
      .notNull()
      .references(() => mobileUsers.id, { onDelete: "cascade" }),
    installationId: varchar("installation_id", { length: 128 }).notNull(),
    platform: varchar({ length: 16 }).notNull(),
    fcmToken: varchar("fcm_token", { length: 4096 }).notNull(),
    appVersion: varchar("app_version", { length: 32 }),
    locale: varchar({ length: 16 }),
    timezone: varchar({ length: 64 }),
    notificationsAuthorized: boolean("notifications_authorized").default(false).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("mobile_devices_installation_id_uq").on(table.installationId),
    uniqueIndex("mobile_devices_fcm_token_uq").on(table.fcmToken),
    index("mobile_devices_user_idx").on(table.mobileUserId),
    check("mobile_devices_platform_ck", sql`${table.platform} IN ('ios', 'android')`),
  ],
);

export const mobileNotificationPreferences = pgTable("mobile_notification_preferences", {
  mobileUserId: uuid("mobile_user_id")
    .primaryKey()
    .references(() => mobileUsers.id, { onDelete: "cascade" }),
  announcementsEnabled: boolean("announcements_enabled").default(true).notNull(),
  eventsEnabled: boolean("events_enabled").default(true).notNull(),
  serverStatusEnabled: boolean("server_status_enabled").default(true).notNull(),
  socialEnabled: boolean("social_enabled").default(true).notNull(),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(true).notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const mobileNotificationOutbox = pgTable(
  "mobile_notification_outbox",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: varchar({ length: 64 }).notNull(),
    audience: jsonb().notNull(),
    payload: jsonb().notNull(),
    status: varchar({ length: 16 }).default("pending").notNull(),
    attempts: integer().default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true, mode: "date" }),
    lockToken: uuid("lock_token"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("mobile_notification_outbox_pending_idx").on(table.status, table.availableAt),
    check("mobile_notification_outbox_status_ck", sql`${table.status} IN ('pending', 'processing', 'delivered', 'dead')`),
  ],
);

export const mobileNewsPosts = pgTable(
  "mobile_news_posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 120 }).notNull(),
    title: varchar({ length: 160 }).notNull(),
    summary: varchar({ length: 500 }).notNull(),
    body: text().notNull(),
    coverImageUrl: varchar("cover_image_url", { length: 2048 }),
    status: varchar({ length: 16 }).default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("mobile_news_posts_slug_uq").on(table.slug),
    index("mobile_news_posts_published_idx").on(table.status, table.publishedAt),
    check("mobile_news_posts_status_ck", sql`${table.status} IN ('draft', 'published', 'archived')`),
  ],
);

export const mobileEvents = pgTable(
  "mobile_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: varchar({ length: 120 }).notNull(),
    title: varchar({ length: 160 }).notNull(),
    description: text().notNull(),
    gameType: varchar("game_type", { length: 64 }),
    imageUrl: varchar("image_url", { length: 2048 }),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
    status: varchar({ length: 16 }).default("scheduled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("mobile_events_slug_uq").on(table.slug),
    index("mobile_events_schedule_idx").on(table.status, table.startsAt),
    check("mobile_events_status_ck", sql`${table.status} IN ('draft', 'scheduled', 'cancelled', 'completed')`),
  ],
);
