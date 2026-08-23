CREATE TABLE IF NOT EXISTS "mobile_rate_limits" (
	"key_hash" varchar(64) PRIMARY KEY NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"resets_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mobile_rate_limits_count_ck" CHECK ("mobile_rate_limits"."request_count" > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_rate_limits_expiry_idx" ON "mobile_rate_limits" USING btree ("resets_at");
