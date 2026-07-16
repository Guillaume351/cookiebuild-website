DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'playerdata'
      AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE playerdata ADD COLUMN onboarding_completed_at timestamp;

    -- Existing players must keep their returning-player experience. Only
    -- profiles created after this migration enter the first-visit onboarding.
    UPDATE playerdata
    SET onboarding_completed_at = COALESCE(lastlogin, createdat, CURRENT_TIMESTAMP)
    WHERE onboarding_completed_at IS NULL;
  END IF;
END $$;
