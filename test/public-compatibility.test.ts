import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("legacy public links", () => {
  it("keeps the old news fragment target on canonical update cards", async () => {
    const source = await readFile(new URL("../components/UpdatePostCard.vue", import.meta.url), "utf8");

    expect(source).toContain(':id="`news-${post.slug}`"');
    expect(source).toContain(':id="`update-${post.slug}`"');
  });

  it("redirects the former social image to the optimized replacement", async () => {
    const config = await readFile(new URL("../nuxt.config.ts", import.meta.url), "utf8");

    expect(config).toContain('"/lobby.webp": { redirect: { to: "/lobby-hero-1600.webp", statusCode: 301 } }');
  });
});
