-- Rallies are on by default: cap them at one push per device every three hours
-- so automatic queue rallies never turn into notification spam. Safe to re-run.
ALTER TABLE "mobile_devices"
  ADD COLUMN IF NOT EXISTS "last_rally_sent_at" timestamptz;
