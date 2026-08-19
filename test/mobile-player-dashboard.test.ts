import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("mobile player dashboard query shape", () => {
  it("aggregates only the linked player's matches before expanding the chart", async () => {
    const source = await readFile(
      new URL("../server/services/mobile-player-dashboard.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("player_matches AS MATERIALIZED");
    expect(source).toContain("player_activity AS MATERIALIZED");
    expect(source).toContain("WHERE participant.player_id = ${actor.playerId}");
    expect(source).not.toContain("AND EXISTS (\n           SELECT 1 FROM match_players");
  });
});
