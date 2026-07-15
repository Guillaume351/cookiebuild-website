import { describe, expect, it } from "vitest";
import { parseAdminEvent, parseAdminNews } from "../server/utils/admin-content";

describe("admin content validation", () => {
  it("normalizes a published changelog entry", () => {
    const value = parseAdminNews({
      slug: "summer-release",
      title: "Summer release",
      summary: "Everything new",
      body: "SkyWars is back",
      contentType: "changelog",
      status: "published",
    });
    expect(value.contentType).toBe("changelog");
    expect(value.publishedAt).toBeInstanceOf(Date);
  });

  it("rejects unsafe slugs and inverted event dates", () => {
    expect(() => parseAdminNews({
      slug: "Not Safe",
      title: "Title",
      summary: "Summary",
      body: "Body",
      contentType: "news",
      status: "draft",
    })).toThrow(/slug/);
    expect(() => parseAdminEvent({
      slug: "event",
      title: "Event",
      description: "Description",
      status: "scheduled",
      startsAt: "2026-08-02T12:00:00Z",
      endsAt: "2026-08-02T11:00:00Z",
    })).toThrow(/endsAt/);
  });
});
