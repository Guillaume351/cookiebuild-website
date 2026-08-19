ALTER TABLE "mobile_devices"
  ADD COLUMN IF NOT EXISTS "timezone_offset_minutes" integer,
  ADD COLUMN IF NOT EXISTS "timezone_observed_at" timestamptz;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'mobile_devices_timezone_offset_ck'
       AND conrelid = 'mobile_devices'::regclass
  ) THEN
    ALTER TABLE "mobile_devices"
      ADD CONSTRAINT "mobile_devices_timezone_offset_ck"
      CHECK (
        "timezone_offset_minutes" IS NULL
        OR "timezone_offset_minutes" BETWEEN -840 AND 840
      );
  END IF;
END $$;
