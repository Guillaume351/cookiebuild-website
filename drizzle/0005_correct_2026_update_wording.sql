UPDATE "mobile_news_posts"
SET
  "title" = 'The 2026 update',
  "summary" = 'One year after the Java and Bedrock relaunch, Cookie Build receives new games, progression, social tools, and reliability improvements.',
  "body" = E'- Java and Bedrock players continue to share the network introduced with the 2025 relaunch.\n- Quick Play sends you to the match closest to starting, while persistent Parties keep friends together.\n- MicroBattles has been expanded with eight arenas, balanced tiered kits, a weekly free-kit rotation, map voting, assists, and clearer Bedrock menus.\n- Pitchout has been upgraded with map voting, instant replay, a live scoreboard, personal match summaries, and progression rewards.\n- Weekly goals, achievements, coins, solo practice, feedback, mute, block, and report tools are now available.\n- NPC reconciliation and Bedrock interaction fixes make the lobby more reliable.',
  "updated_at" = now()
WHERE "slug" = 'cookie-build-returns-2026'
  AND "title" = 'The server refresh'
  AND "summary" = 'Cookie Build returns on a modern Java and Bedrock stack, with its classic games rebuilt around a smoother player experience.';
