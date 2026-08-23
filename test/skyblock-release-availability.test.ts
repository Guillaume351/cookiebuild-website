import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateChangelogEntry } from "../scripts/publish-changelog.mjs";

describe("Skyblock immutable availability clarification", () => {
  it("supersedes the broad launch claim with a platform capability matrix", async () => {
    const raw = JSON.parse(await readFile(
      new URL("../content/changelog/2026-08-23-skyblock-availability-clarification.json", import.meta.url),
      "utf8",
    ));
    const note = validateChangelogEntry(raw);
    expect(note.supersedesSlug).toBe("skyblock-cookie-orchard");
    expect(note.body).toContain("Minecraft — Java and Bedrock");
    expect(note.body).toContain("Public iOS and Android app");
    expect(note.body).toContain("Mobile player market");
    expect(note.body).toContain("Australian English, French, German, Italian");
  });
});
