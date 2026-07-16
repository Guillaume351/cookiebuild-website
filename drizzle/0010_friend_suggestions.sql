CREATE INDEX IF NOT EXISTS "idx_match_players_player_match"
  ON "match_players" ("player_id", "match_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_friendships_requester_pending_idx"
  ON "player_friendships" ("requested_by_player_id")
  WHERE "status" = 'pending';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "player_friend_request_cooldowns" (
  "requester_player_id" uuid NOT NULL,
  "target_player_id" uuid NOT NULL,
  "last_requested_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("requester_player_id", "target_player_id"),
  CONSTRAINT "player_friend_request_cooldowns_self_ck"
    CHECK ("requester_player_id" <> "target_player_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_friend_request_cooldowns"
 ADD CONSTRAINT "player_friend_request_cooldowns_requester_fk"
 FOREIGN KEY ("requester_player_id") REFERENCES "public"."playerdata"("id")
 ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_friend_request_cooldowns"
 ADD CONSTRAINT "player_friend_request_cooldowns_target_fk"
 FOREIGN KEY ("target_player_id") REFERENCES "public"."playerdata"("id")
 ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_friend_request_cooldowns_target_idx"
  ON "player_friend_request_cooldowns" ("target_player_id", "last_requested_at");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.friend_suggestions_for(
  p_actor_player_id uuid,
  p_limit integer DEFAULT 6
)
RETURNS TABLE (
  player_id uuid,
  player_name varchar(255),
  reason varchar(32)
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $friend_suggestions$
  WITH actor_matches AS MATERIALIZED (
    SELECT own_match.match_id,
           recorded_match.starttime AS encountered_at,
           recorded_match.gametype
      FROM match_players own_match
      JOIN matches recorded_match ON recorded_match.id = own_match.match_id
     WHERE own_match.player_id = p_actor_player_id
       AND recorded_match.endtime IS NOT NULL
       AND recorded_match.starttime >= timezone('UTC', now()) - interval '30 days'
  ),
  encounters AS (
    SELECT other_match.player_id,
           count(*)::integer AS shared_match_count,
           count(DISTINCT actor_match.gametype)::integer AS shared_gamemode_count,
           max(actor_match.encountered_at) AS encountered_at
      FROM actor_matches actor_match
      JOIN match_players other_match ON other_match.match_id = actor_match.match_id
     WHERE other_match.player_id <> p_actor_player_id
     GROUP BY other_match.player_id
  )
  SELECT candidate.id,
         candidate.name,
         'played_together'::varchar(32)
    FROM encounters encounter
    JOIN playerdata candidate ON candidate.id = encounter.player_id
   WHERE candidate.name IS NOT NULL
     AND btrim(candidate.name) <> ''
     AND NOT EXISTS (
       SELECT 1
         FROM player_friendships friendship
        WHERE p_actor_player_id IN (friendship.player_low_id, friendship.player_high_id)
          AND encounter.player_id IN (friendship.player_low_id, friendship.player_high_id)
     )
     AND NOT EXISTS (
       SELECT 1
         FROM player_blocks block
        WHERE (block.blocker_player_id = p_actor_player_id AND block.blocked_player_id = encounter.player_id)
           OR (block.blocker_player_id = encounter.player_id AND block.blocked_player_id = p_actor_player_id)
     )
     AND NOT EXISTS (
       SELECT 1
         FROM player_reports report
        WHERE (report.reporter_player_id = p_actor_player_id AND report.reported_player_id = encounter.player_id)
           OR (report.reporter_player_id = encounter.player_id AND report.reported_player_id = p_actor_player_id)
     )
     AND NOT EXISTS (
       SELECT 1
         FROM player_friend_request_cooldowns cooldown
        WHERE cooldown.last_requested_at >= now() - interval '30 days'
          AND (
            (cooldown.requester_player_id = p_actor_player_id AND cooldown.target_player_id = encounter.player_id)
            OR (cooldown.requester_player_id = encounter.player_id AND cooldown.target_player_id = p_actor_player_id)
          )
     )
   ORDER BY LEAST(encounter.shared_match_count, 8) DESC,
            LEAST(encounter.shared_gamemode_count, 3) DESC,
            encounter.encountered_at DESC,
            lower(candidate.name),
            candidate.id
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 12)
$friend_suggestions$;
