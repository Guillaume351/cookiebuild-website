import {
  bigint,
  boolean,
  foreignKey,
  integer,
  jsonb,
  pgSequence,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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
