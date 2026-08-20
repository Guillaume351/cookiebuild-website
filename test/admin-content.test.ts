import { describe, expect, it } from "vitest";
import {
  assertAdminCorrectionTarget,
  assertMutableAdminNews,
  parseAdminEvent,
  parseAdminNews,
  rethrowAdminNewsWriteConflict,
} from "../server/utils/admin-content";

describe("admin content validation", () => {
  it("prevents published updates from being rewritten through the admin API", () => {
    expect(() => assertMutableAdminNews({ status: "published" })).toThrow(/immutable/);
    expect(() => assertMutableAdminNews({ status: "draft" })).not.toThrow();
    expect(() => assertMutableAdminNews({ status: "archived" })).toThrow(/Only draft/);
  });
  it("keeps admin content as a draft and preserves a correction link", () => {
    const value = parseAdminNews({
      slug: "summer-release",
      title: "Summer release",
      summary: "Everything new",
      body: "SkyWars is back",
      contentType: "changelog",
      status: "draft",
      supersedesSlug: "earlier-release",
    });
    expect(value.contentType).toBe("changelog");
    expect(value.status).toBe("draft");
    expect(value.publishedAt).toBeNull();
    expect(value.supersedesSlug).toBe("earlier-release");
    expect(() => parseAdminNews({ ...value, status: "published" })).toThrow(/versioned changelog JSON/);
  });

  it("only allows one draft correction of a published update with the same type", () => {
    const input = { supersedesSlug: "earlier-release", contentType: "changelog" };
    expect(() => assertAdminCorrectionTarget(input, {
      status: "published",
      contentType: "changelog",
    }, null)).not.toThrow();
    expect(() => assertAdminCorrectionTarget(input, {
      status: "draft",
      contentType: "changelog",
    }, null)).toThrow(/published/);
    expect(() => assertAdminCorrectionTarget(input, {
      status: "published",
      contentType: "news",
    }, null)).toThrow(/content type/);
    expect(() => assertAdminCorrectionTarget(input, {
      status: "published",
      contentType: "changelog",
    }, { id: "another" })).toThrow(/already has/);
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

  it("returns a conflict when PostgreSQL wins a concurrent slug or correction race", () => {
    for (const error of [
      { code: "23505" },
      { cause: { code: "23505" } },
    ]) {
      try {
        rethrowAdminNewsWriteConflict(error);
        throw new Error("expected a conflict");
      } catch (caught) {
        expect(caught).toMatchObject({ statusCode: 409 });
      }
    }
    const other = { code: "08006" };
    expect(() => rethrowAdminNewsWriteConflict(other)).toThrow(other);
  });
});
