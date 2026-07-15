CREATE TABLE IF NOT EXISTS "player_changelog_state" (
  "player_id" uuid PRIMARY KEY REFERENCES "playerdata"("id") ON DELETE CASCADE,
  "last_seen_published_at" timestamptz,
  "last_seen_post_id" uuid,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "player_changelog_state_cursor_ck" CHECK (
    ("last_seen_published_at" IS NULL) = ("last_seen_post_id" IS NULL)
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_changelog_state_cursor_idx"
  ON "player_changelog_state" ("last_seen_published_at", "last_seen_post_id");
--> statement-breakpoint

UPDATE "mobile_news_posts"
SET
  "title" = 'The 2026 update',
  "summary" = 'One year after the Java and Bedrock relaunch, Cookie Build receives new games, progression, social tools, and reliability improvements.',
  "body" = E'- Java and Bedrock players continue to share the network introduced with the 2025 relaunch.\n- Quick Play sends you to the match closest to starting, while persistent Parties keep friends together.\n- MicroBattles has been expanded with eight arenas, balanced tiered kits, a weekly free-kit rotation, map voting, assists, and clearer Bedrock menus.\n- Pitchout has been upgraded with map voting, instant replay, a live scoreboard, personal match summaries, and progression rewards.\n- Weekly goals, achievements, coins, solo practice, feedback, mute, block, and report tools are now available.\n- NPC reconciliation and Bedrock interaction fixes make the lobby more reliable.',
  "published_at" = '2026-07-13T17:00:00Z',
  "expires_at" = NULL,
  "updated_at" = now()
WHERE "slug" = 'cookie-build-returns-2026'
  AND "title" = 'Cookie Build is back';
--> statement-breakpoint

INSERT INTO "mobile_news_posts" (
  "slug", "title", "summary", "body", "status", "published_at"
) VALUES
(
  'cookie-build-returns-2026',
  'The 2026 update',
  'One year after the Java and Bedrock relaunch, Cookie Build receives new games, progression, social tools, and reliability improvements.',
  E'- Java and Bedrock players continue to share the network introduced with the 2025 relaunch.\n- Quick Play sends you to the match closest to starting, while persistent Parties keep friends together.\n- MicroBattles has been expanded with eight arenas, balanced tiered kits, a weekly free-kit rotation, map voting, assists, and clearer Bedrock menus.\n- Pitchout has been upgraded with map voting, instant replay, a live scoreboard, personal match summaries, and progression rewards.\n- Weekly goals, achievements, coins, solo practice, feedback, mute, block, and report tools are now available.\n- NPC reconciliation and Bedrock interaction fixes make the lobby more reliable.',
  'published',
  '2026-07-13T17:00:00Z'
),
(
  'cookie-build-mobile-2',
  'Cookie Build Mobile 2.0',
  'The companion app is back on iOS and Android with live server information and structured social features.',
  E'- See live Java and Bedrock status, connection instructions, gamemodes, events, news, and player leaderboards.\n- Securely link your in-game identity with /app link.\n- Manage structured Friends and Parties without adding open chat or custom messages.\n- Opt in to a player call when someone starts a game or an underfilled queue needs teammates.\n- Choose notification categories and manage privacy, account export, and deletion controls directly.',
  'published',
  '2026-07-14T10:00:00Z'
),
(
  'skywars-buildbattles-return',
  'SkyWars and BuildBattles are back',
  'Two classic Cookie Build modes return with recovered maps, modern progression, and safer match lifecycles.',
  E'- SkyWars launches across four recovered arenas with randomized island and middle loot.\n- Four balanced SkyWars kits can be unlocked through play, with coins, XP, wins, kills, and stats recorded.\n- BuildBattles restores its eight-plot arena, three-choice theme voting, a five-minute build phase, and peer judging from one to five.\n- Builders get a floor tool, replay support, rewards and stats, plus a 60-second reconnect grace period.',
  'published',
  '2026-07-15T09:00:00Z'
),
(
  'reliability-monitoring-2026',
  'Reliability and monitoring',
  'The network now detects failures earlier and gives the team enough context to fix them quickly.',
  E'- Health probes continuously cover the Minecraft server, website, PostgreSQL, and RabbitMQ.\n- Prometheus, Grafana, Loki, and Alertmanager track usage, performance, logs, and fatal conditions.\n- Critical failures notify the Cookie Build team through Discord without interrupting gameplay services.\n- Session cleanup and match accounting now guard against stale or duplicated player state.',
  'published',
  '2026-07-15T08:00:00Z'
)
ON CONFLICT ("slug") DO NOTHING;
