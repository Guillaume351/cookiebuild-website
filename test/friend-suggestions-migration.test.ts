import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../drizzle/0010_friend_suggestions.sql", import.meta.url),
  "utf8",
);

describe("friend suggestions migration", () => {
  it("ranks bounded completed matches without exposing encounter details", () => {
    expect(migration).toContain("friend_suggestions_for");
    expect(migration).toContain("interval '30 days'");
    expect(migration).toContain("recorded_match.endtime IS NOT NULL");
    expect(migration).toContain("player_friendships_requester_pending_idx");
    expect(migration).toContain("player_friend_request_cooldowns");
    expect(migration).toContain("LEAST(GREATEST(COALESCE(p_limit, 6), 1), 12)");
    expect(migration).not.toContain("RETURNS TABLE (\n  encountered_at");
    expect(migration).not.toContain("player_sessions");
  });

  it("excludes existing relationships and every safety signal", () => {
    for (const table of [
      "player_friendships",
      "player_blocks",
      "player_reports",
      "player_friend_request_cooldowns",
    ]) {
      expect(migration).toContain(table);
    }
    expect(migration).toContain("cooldown.last_requested_at >= now() - interval '30 days'");
  });
});
