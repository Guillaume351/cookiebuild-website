-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SEQUENCE "public"."chatmessage_seq" INCREMENT BY 50 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "chatmessage" (
	"id" bigint PRIMARY KEY NOT NULL,
	"message" varchar(1024) NOT NULL,
	"playerworld" varchar(255) NOT NULL,
	"sender" uuid,
	"sentat" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"endtime" timestamp(6),
	"gametype" varchar(255) NOT NULL,
	"starttime" timestamp(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playerdata" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdat" timestamp(6),
	"lastlogin" timestamp(6),
	"name" varchar(255),
	"playtime" bigint
);
--> statement-breakpoint
CREATE TABLE "player_match_performances" (
	"id" uuid PRIMARY KEY NOT NULL,
	"assistsinmatch" integer DEFAULT 0 NOT NULL,
	"deathsinmatch" integer DEFAULT 0 NOT NULL,
	"game_specific_metrics" jsonb,
	"killsinmatch" integer DEFAULT 0 NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	CONSTRAINT "uk26u03l3ifflmyiat5l43emltl" UNIQUE("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	CONSTRAINT "match_players_pkey" PRIMARY KEY("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "match_winners" (
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	CONSTRAINT "match_winners_pkey" PRIMARY KEY("match_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "player_match_performances" ADD CONSTRAINT "fkgstiydv38ahc23sxvc0j033lr" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_match_performances" ADD CONSTRAINT "fklni8aav3fe2p6ep8fq4sc9i94" FOREIGN KEY ("player_id") REFERENCES "public"."playerdata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "fkfpcpwl4urwk7r2i29fo8qbhv5" FOREIGN KEY ("player_id") REFERENCES "public"."playerdata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "fkgigmeboyk2dqb71mw4fct0j7i" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_winners" ADD CONSTRAINT "fkhpb4gfu3tikc04eriw3bglc2d" FOREIGN KEY ("player_id") REFERENCES "public"."playerdata"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_winners" ADD CONSTRAINT "fktme3mmmdfsm7up96lcdulj7gg" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;
*/