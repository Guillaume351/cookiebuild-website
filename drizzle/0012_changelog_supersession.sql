ALTER TABLE "mobile_news_posts"
  ADD COLUMN IF NOT EXISTS "supersedes_slug" varchar(120);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'mobile_news_posts_supersedes_slug_fk'
       AND conrelid = 'mobile_news_posts'::regclass
  ) THEN
    ALTER TABLE "mobile_news_posts"
      ADD CONSTRAINT "mobile_news_posts_supersedes_slug_fk"
      FOREIGN KEY ("supersedes_slug") REFERENCES "mobile_news_posts" ("slug")
      ON UPDATE RESTRICT ON DELETE RESTRICT;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'mobile_news_posts_not_self_superseding_ck'
       AND conrelid = 'mobile_news_posts'::regclass
  ) THEN
    ALTER TABLE "mobile_news_posts"
      ADD CONSTRAINT "mobile_news_posts_not_self_superseding_ck"
      CHECK ("supersedes_slug" IS NULL OR "supersedes_slug" <> "slug");
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_news_posts_supersedes_slug_uq"
  ON "mobile_news_posts" ("supersedes_slug")
  WHERE "supersedes_slug" IS NOT NULL;
