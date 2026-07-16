import {
  bigint,
  boolean,
  check,
  date,
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
  rallyEnabled: boolean("rally_enabled").default(false).notNull(),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(true).notNull(),
  dailyReminderEnabled: boolean("daily_reminder_enabled").default(false).notNull(),
  weeklyReminderEnabled: boolean("weekly_reminder_enabled").default(false).notNull(),
  friendOnlineEnabled: boolean("friend_online_enabled").default(false).notNull(),
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false).notNull(),
  timezoneOffsetMinutes: integer("timezone_offset_minutes").default(0).notNull(),
  onlineVisibility: varchar("online_visibility", { length: 24 }).default("friends_and_party").notNull(),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const mobileNotificationOutbox = pgTable(
  "mobile_notification_outbox",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: varchar({ length: 64 }).notNull(),
    dedupeKey: varchar("dedupe_key", { length: 255 }),
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
    uniqueIndex("mobile_notification_outbox_player_rally_id_uq")
      .on(sql`(${table.payload} ->> 'rallyId')`)
      .where(sql`${table.kind} = 'player_rally'`),
    uniqueIndex("mobile_notification_outbox_dedupe_key_uq")
      .on(table.dedupeKey)
      .where(sql`${table.dedupeKey} IS NOT NULL`),
    check("mobile_notification_outbox_status_ck", sql`${table.status} IN ('pending', 'processing', 'delivered', 'dead')`),
  ],
);

export const playerRallies = pgTable(
  "player_rallies",
  {
    id: uuid().primaryKey().notNull(),
    outboxId: uuid("outbox_id")
      .notNull()
      .references(() => mobileNotificationOutbox.id, { onDelete: "cascade" }),
    serverId: varchar("server_id", { length: 64 }).notNull(),
    targetPlayerId: uuid("target_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    gameId: uuid("game_id"),
    source: varchar({ length: 16 }).notNull(),
    gamemode: varchar({ length: 32 }).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true, mode: "date" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique("player_rallies_outbox_id_uq").on(table.outboxId),
    index("player_rallies_target_expiry_idx").on(table.targetPlayerId, table.expiresAt),
    check(
      "player_rallies_server_id_ck",
      sql`${table.serverId} ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'`,
    ),
    check("player_rallies_source_ck", sql`${table.source} IN ('login', 'player', 'automatic')`),
    check(
      "player_rallies_context_ck",
      sql`(${table.source} = 'login' AND ${table.gamemode} = 'network' AND ${table.gameId} IS NULL)
        OR (${table.source} IN ('player', 'automatic') AND ${table.gamemode} <> 'network' AND ${table.gameId} IS NOT NULL)`,
    ),
    check("player_rallies_expiry_ck", sql`${table.expiresAt} > ${table.availableAt}`),
  ],
);

export const playerRallyResponses = pgTable(
  "player_rally_responses",
  {
    id: uuid().primaryKey().defaultRandom().notNull(),
    rallyId: uuid("rally_id")
      .notNull()
      .references(() => playerRallies.id, { onDelete: "cascade" }),
    responderPlayerId: uuid("responder_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    response: varchar({ length: 16 }).notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    unique("player_rally_responses_rally_responder_uq")
      .on(table.rallyId, table.responderPlayerId),
    index("player_rally_responses_delivery_idx")
      .on(table.respondedAt)
      .where(sql`${table.deliveredAt} IS NULL`),
    check(
      "player_rally_responses_response_ck",
      sql`${table.response} IN ('joining', 'unavailable')`,
    ),
  ],
);

export const playerGoalProgress = pgTable("player_goal_progress", {
  playerId: uuid("player_id").primaryKey().references(() => playerdata.id, { onDelete: "cascade" }),
  day: date({ mode: "string" }).notNull(),
  dailyMatches: integer("daily_matches").default(0).notNull(),
  dailyWins: integer("daily_wins").default(0).notNull(),
  firstWinDate: date("first_win_date", { mode: "string" }),
  week: varchar({ length: 8 }).notNull(),
  weeklyMatches: integer("weekly_matches").default(0).notNull(),
  weeklyWins: integer("weekly_wins").default(0).notNull(),
  weeklyKills: integer("weekly_kills").default(0).notNull(),
  achievements: jsonb().$type<string[]>().default([]).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const playerAppPromotionState = pgTable("player_app_promotion_state", {
  playerId: uuid("player_id").primaryKey().references(() => playerdata.id, { onDelete: "cascade" }),
  lastShownAt: timestamp("last_shown_at", { withTimezone: true, mode: "date" }).notNull(),
  showCount: integer("show_count").default(1).notNull(),
});

export const mobileFriendOnlineAlerts = pgTable(
  "mobile_friend_online_alerts",
  {
    ownerPlayerId: uuid("owner_player_id").notNull().references(() => playerdata.id, { onDelete: "cascade" }),
    targetPlayerId: uuid("target_player_id").notNull().references(() => playerdata.id, { onDelete: "cascade" }),
    enabled: boolean().default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerPlayerId, table.targetPlayerId] }),
    index("mobile_friend_online_alerts_target_idx")
      .on(table.targetPlayerId)
      .where(sql`${table.enabled}`),
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
    contentType: varchar("content_type", { length: 16 }).default("news").notNull(),
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

export const adminUsers = pgTable(
  "admin_users",
  {
    firebaseUid: varchar("firebase_uid", { length: 128 }).primaryKey(),
    email: varchar({ length: 320 }).notNull(),
    displayName: varchar("display_name", { length: 80 }),
    role: varchar({ length: 16 }).notNull(),
    enabled: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("admin_users_email_uq").on(sql`lower(${table.email})`),
    index("admin_users_enabled_role_idx").on(table.enabled, table.role),
    check("admin_users_role_ck", sql`${table.role} IN ('viewer', 'moderator', 'editor', 'operator', 'owner')`),
  ],
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid().primaryKey().defaultRandom(),
    actorUid: varchar("actor_uid", { length: 128 }).notNull().references(() => adminUsers.firebaseUid),
    actorRole: varchar("actor_role", { length: 16 }).notNull(),
    action: varchar({ length: 96 }).notNull(),
    resourceType: varchar("resource_type", { length: 64 }).notNull(),
    resourceId: varchar("resource_id", { length: 255 }),
    requestId: varchar("request_id", { length: 64 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    metadata: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("admin_audit_log_created_idx").on(table.createdAt),
    index("admin_audit_log_actor_created_idx").on(table.actorUid, table.createdAt),
    index("admin_audit_log_resource_created_idx").on(table.resourceType, table.resourceId, table.createdAt),
  ],
);

export const adminReportCases = pgTable(
  "admin_report_cases",
  {
    reportId: uuid("report_id").primaryKey().references(() => playerReports.id, { onDelete: "cascade" }),
    status: varchar({ length: 16 }).default("open").notNull(),
    assignedTo: varchar("assigned_to", { length: 128 }).references(() => adminUsers.firebaseUid),
    resolutionNote: text("resolution_note"),
    updatedBy: varchar("updated_by", { length: 128 }).notNull().references(() => adminUsers.firebaseUid),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("admin_report_cases_status_updated_idx").on(table.status, table.updatedAt),
    check("admin_report_cases_status_ck", sql`${table.status} IN ('open', 'reviewing', 'resolved', 'dismissed')`),
  ],
);

export const adminNotificationCampaigns = pgTable(
  "admin_notification_campaigns",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdBy: varchar("created_by", { length: 128 }).notNull().references(() => adminUsers.firebaseUid),
    kind: varchar({ length: 32 }).notNull(),
    title: varchar({ length: 120 }).notNull(),
    body: varchar({ length: 500 }),
    imageUrl: varchar("image_url", { length: 2048 }),
    deepLink: varchar("deep_link", { length: 2048 }),
    audience: jsonb().$type<Record<string, unknown>>().notNull(),
    recipientEstimate: integer("recipient_estimate").default(0).notNull(),
    status: varchar({ length: 16 }).default("queued").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" }).notNull(),
    outboxId: uuid("outbox_id").unique().references(() => mobileNotificationOutbox.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "date" }),
    cancelledBy: varchar("cancelled_by", { length: 128 }).references(() => adminUsers.firebaseUid),
  },
  (table) => [
    index("admin_notification_campaigns_created_idx").on(table.createdAt),
    index("admin_notification_campaigns_schedule_idx").on(table.status, table.scheduledAt),
  ],
);

export const adminCommands = pgTable(
  "admin_commands",
  {
    id: uuid().primaryKey().defaultRandom(),
    type: varchar({ length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: varchar("target_id", { length: 255 }),
    payload: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    status: varchar({ length: 16 }).default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    availableAt: timestamp("available_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    result: jsonb().$type<Record<string, unknown>>(),
    error: text(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(),
  },
  (table) => [
    index("admin_commands_target_idx").on(table.targetType, table.targetId, table.createdAt),
    check("admin_commands_status_ck", sql`${table.status} IN ('pending', 'running', 'succeeded', 'failed', 'expired', 'cancelled')`),
  ],
);

export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid().primaryKey().defaultRandom(),
    playerId: uuid("player_id").notNull().references(() => playerdata.id, { onDelete: "cascade" }),
    playerName: varchar("player_name", { length: 255 }).notNull(),
    actionType: varchar("action_type", { length: 16 }).notNull(),
    reason: varchar({ length: 500 }).notNull(),
    actorId: varchar("actor_id", { length: 128 }).notNull().references(() => adminUsers.firebaseUid),
    actorDisplayName: varchar("actor_display_name", { length: 80 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    revokedBy: varchar("revoked_by", { length: 128 }).references(() => adminUsers.firebaseUid),
    sourceCommandId: uuid("source_command_id").unique().references(() => adminCommands.id, { onDelete: "set null" }),
    metadata: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("moderation_actions_player_created_idx").on(table.playerId, table.createdAt),
    check("moderation_actions_type_ck", sql`${table.actionType} IN ('ban', 'mute')`),
  ],
);

export const adminRuntimeSnapshots = pgTable("admin_runtime_snapshots", {
  serverId: varchar("server_id", { length: 64 }).primaryKey(),
  sequence: bigint({ mode: "number" }).default(0).notNull(),
  payload: jsonb().$type<Record<string, unknown>>().notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const adminRuntimeEvents = pgTable(
  "admin_runtime_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().unique(),
    serverId: varchar("server_id", { length: 64 }).notNull(),
    kind: varchar({ length: 64 }).notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("admin_runtime_events_created_idx").on(table.createdAt),
    index("admin_runtime_events_server_observed_idx").on(table.serverId, table.observedAt),
  ],
);

export const opsActions = pgTable(
  "ops_actions",
  {
    id: uuid().primaryKey().defaultRandom(),
    action: varchar({ length: 64 }).notNull(),
    requestedBy: varchar("requested_by", { length: 128 }).notNull().references(() => adminUsers.firebaseUid),
    reason: varchar({ length: 500 }).notNull(),
    payload: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    status: varchar({ length: 16 }).default("pending").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    result: jsonb().$type<Record<string, unknown>>(),
    error: text(),
  },
  (table) => [
    index("ops_actions_requested_idx").on(table.requestedAt),
    check("ops_actions_status_ck", sql`${table.status} IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')`),
  ],
);

export const updateCheckRuns = pgTable(
  "update_check_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    status: varchar({ length: 16 }).notNull(),
    summary: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    reportMarkdown: text("report_markdown"),
    promptMarkdown: text("prompt_markdown"),
    checkedAt: timestamp("checked_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    error: text(),
  },
  (table) => [
    index("update_check_runs_checked_idx").on(table.checkedAt),
    check("update_check_runs_status_ck", sql`${table.status} IN ('running', 'current', 'updates_available', 'failed')`),
  ],
);

export const playerChangelogState = pgTable(
  "player_changelog_state",
  {
    playerId: uuid("player_id")
      .primaryKey()
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    lastSeenPublishedAt: timestamp("last_seen_published_at", { withTimezone: true, mode: "date" }),
    lastSeenPostId: uuid("last_seen_post_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("player_changelog_state_cursor_idx").on(table.lastSeenPublishedAt, table.lastSeenPostId),
    check(
      "player_changelog_state_cursor_ck",
      sql`(${table.lastSeenPublishedAt} IS NULL) = (${table.lastSeenPostId} IS NULL)`,
    ),
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

export const playerFriendships = pgTable(
  "player_friendships",
  {
    playerLowId: uuid("player_low_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    playerHighId: uuid("player_high_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    requestedByPlayerId: uuid("requested_by_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    status: varchar({ length: 16 }).default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    primaryKey({ columns: [table.playerLowId, table.playerHighId] }),
    index("player_friendships_low_status_idx").on(table.playerLowId, table.status),
    index("player_friendships_high_status_idx").on(table.playerHighId, table.status),
    check("player_friendships_order_ck", sql`${table.playerLowId} < ${table.playerHighId}`),
    check(
      "player_friendships_requester_ck",
      sql`${table.requestedByPlayerId} IN (${table.playerLowId}, ${table.playerHighId})`,
    ),
    check("player_friendships_status_ck", sql`${table.status} IN ('pending', 'accepted')`),
    check(
      "player_friendships_accepted_at_ck",
      sql`(${table.status} = 'pending' AND ${table.acceptedAt} IS NULL)
        OR (${table.status} = 'accepted' AND ${table.acceptedAt} IS NOT NULL)`,
    ),
  ],
);

export const playerBlocks = pgTable(
  "player_blocks",
  {
    blockerPlayerId: uuid("blocker_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    blockedPlayerId: uuid("blocked_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerPlayerId, table.blockedPlayerId] }),
    index("player_blocks_blocked_idx").on(table.blockedPlayerId),
    check("player_blocks_self_ck", sql`${table.blockerPlayerId} <> ${table.blockedPlayerId}`),
  ],
);

export const playerReports = pgTable(
  "player_reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    reporterPlayerId: uuid("reporter_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    reportedPlayerId: uuid("reported_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    reason: varchar({ length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("player_reports_reporter_created_idx").on(table.reporterPlayerId, table.createdAt),
    index("player_reports_reported_created_idx").on(table.reportedPlayerId, table.createdAt),
    check("player_reports_self_ck", sql`${table.reporterPlayerId} <> ${table.reportedPlayerId}`),
    check(
      "player_reports_reason_ck",
      sql`${table.reason} IN ('spam', 'harassment', 'hate_or_discrimination', 'sexual_content', 'threats', 'impersonation', 'cheating', 'inappropriate_name')`,
    ),
  ],
);

export const playerParties = pgTable(
  "player_parties",
  {
    id: uuid().primaryKey().defaultRandom(),
    leaderPlayerId: uuid("leader_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    state: varchar({ length: 16 }).default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    disbandedAt: timestamp("disbanded_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("player_parties_active_leader_uq")
      .on(table.leaderPlayerId)
      .where(sql`${table.state} = 'active'`),
    check("player_parties_state_ck", sql`${table.state} IN ('active', 'disbanded')`),
    check(
      "player_parties_disbanded_at_ck",
      sql`(${table.state} = 'active' AND ${table.disbandedAt} IS NULL)
        OR (${table.state} = 'disbanded' AND ${table.disbandedAt} IS NOT NULL)`,
    ),
  ],
);

export const playerPartyMembers = pgTable(
  "player_party_members",
  {
    partyId: uuid("party_id")
      .notNull()
      .references(() => playerParties.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    role: varchar({ length: 16 }).default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    leftAt: timestamp("left_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    primaryKey({ columns: [table.partyId, table.playerId] }),
    uniqueIndex("player_party_members_active_player_uq")
      .on(table.playerId)
      .where(sql`${table.leftAt} IS NULL`),
    index("player_party_members_active_party_idx")
      .on(table.partyId)
      .where(sql`${table.leftAt} IS NULL`),
    check("player_party_members_role_ck", sql`${table.role} IN ('leader', 'member')`),
  ],
);

export const playerPartyInvites = pgTable(
  "player_party_invites",
  {
    id: uuid().primaryKey().defaultRandom(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => playerParties.id, { onDelete: "cascade" }),
    inviterPlayerId: uuid("inviter_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    inviteePlayerId: uuid("invitee_player_id")
      .notNull()
      .references(() => playerdata.id, { onDelete: "cascade" }),
    status: varchar({ length: 16 }).default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("player_party_invites_pending_party_invitee_uq")
      .on(table.partyId, table.inviteePlayerId)
      .where(sql`${table.status} = 'pending'`),
    index("player_party_invites_invitee_status_idx")
      .on(table.inviteePlayerId, table.status, table.expiresAt),
    index("player_party_invites_party_status_idx")
      .on(table.partyId, table.status, table.expiresAt),
    check("player_party_invites_self_ck", sql`${table.inviterPlayerId} <> ${table.inviteePlayerId}`),
    check(
      "player_party_invites_status_ck",
      sql`${table.status} IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')`,
    ),
    check(
      "player_party_invites_response_ck",
      sql`(${table.status} = 'pending' AND ${table.respondedAt} IS NULL)
        OR (${table.status} <> 'pending' AND ${table.respondedAt} IS NOT NULL)`,
    ),
    check("player_party_invites_expiry_ck", sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);
