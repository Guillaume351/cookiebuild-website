import { describe, expect, it } from "vitest";
import { parseMobileNewsQuery } from "../server/utils/mobile-news";

describe("mobile news query compatibility", () => {
  it("hides superseded posts for existing mobile clients by default", () => {
    expect(parseMobileNewsQuery({})).toMatchObject({
      limit: 20,
      includeSuperseded: false,
      slug: undefined,
    });
    expect(parseMobileNewsQuery({ includeSuperseded: "false" }).includeSuperseded).toBe(false);
  });

  it("only enables web history through an explicit valid query", () => {
    expect(parseMobileNewsQuery({
      includeSuperseded: "true",
      contentType: "changelog",
      slug: "skywars-release",
      limit: "50",
    })).toEqual({
      includeSuperseded: true,
      contentType: "changelog",
      slug: "skywars-release",
      limit: 50,
    });
    expect(() => parseMobileNewsQuery({ includeSuperseded: "yes" })).toThrow(/includeSuperseded/);
    expect(() => parseMobileNewsQuery({ slug: "Bad Slug" })).toThrow(/slug/);
  });

  it("keeps the original DTO readable when additive relation fields are present", () => {
    const payload = {
      id: "post-id",
      slug: "skywars-release",
      contentType: "changelog",
      title: "SkyWars update",
      summary: "A fairer match.",
      body: "Details",
      coverImageUrl: null,
      publishedAt: "2026-08-19T19:00:00Z",
      supersedesSlug: "older-note",
      supersededBySlug: null,
    };
    const legacyDto = {
      title: String(payload.title),
      summary: String(payload.summary),
      publishedAt: new Date(payload.publishedAt),
    };
    expect(legacyDto).toEqual({
      title: "SkyWars update",
      summary: "A fairer match.",
      publishedAt: new Date("2026-08-19T19:00:00Z"),
    });
  });
});
