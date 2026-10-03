import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * In-memory stand-in for the statements issued by the like/report service. It
 * mimics PostgreSQL's ON CONFLICT DO NOTHING / DELETE … RETURNING semantics.
 */
const state = vi.hoisted(() => ({
  builds: new Map<string, { id: string; shortCode: string; status: string; likeCount: number; reportCount: number }>(),
  likes: new Set<string>(),
  reports: new Set<string>(),
}));

vi.mock("../db/client", async () => {
  const { PgDialect: Dialect } = await import("drizzle-orm/pg-core");
  const dialect = new Dialect();
  const execute = async (query: SQL) => {
    const { sql: text, params } = dialect.sqlToQuery(query);
    const statement = text.replace(/\s+/g, " ").trim();
    const byCode = (code: unknown) => [...state.builds.values()].find((build) => build.shortCode === code && build.status === "published");
    const byId = (id: unknown) => [...state.builds.values()].find((build) => build.id === id);
    if (statement.startsWith('SELECT id, like_count AS "likeCount" FROM buildbattle_builds WHERE short_code')) {
      const build = byCode(params[0]);
      return build ? [{ id: build.id, likeCount: build.likeCount }] : [];
    }
    if (statement.startsWith("SELECT id FROM buildbattle_builds WHERE short_code")) {
      const build = byCode(params[0]);
      return build ? [{ id: build.id }] : [];
    }
    if (statement.startsWith("INSERT INTO buildbattle_build_likes")) {
      const key = `${params[0]}|${params[1]}`;
      if (state.likes.has(key)) return [];
      state.likes.add(key);
      return [{ build_id: params[0] }];
    }
    if (statement.startsWith("DELETE FROM buildbattle_build_likes")) {
      const key = `${params[0]}|${params[1]}`;
      return state.likes.delete(key) ? [{ build_id: params[0] }] : [];
    }
    if (statement.startsWith('SELECT like_count AS "likeCount" FROM buildbattle_builds WHERE id')) {
      return [{ likeCount: byId(params[0])!.likeCount }];
    }
    if (statement.startsWith("UPDATE buildbattle_builds SET like_count = like_count + 1")) {
      const build = byId(params[0])!;
      build.likeCount += 1;
      return [{ likeCount: build.likeCount }];
    }
    if (statement.startsWith("UPDATE buildbattle_builds SET like_count = GREATEST(like_count - 1, 0)")) {
      const build = byId(params[0])!;
      build.likeCount = Math.max(0, build.likeCount - 1);
      return [{ likeCount: build.likeCount }];
    }
    if (statement.startsWith("INSERT INTO buildbattle_build_reports")) {
      const key = `${params[0]}|${params[1]}`;
      if (state.reports.has(key)) return [];
      state.reports.add(key);
      return [{ build_id: params[0] }];
    }
    if (statement.startsWith("UPDATE buildbattle_builds SET report_count = report_count + 1")) {
      const build = byId(params[params.length - 1])!;
      build.reportCount += 1;
      if (build.status === "published" && build.reportCount >= Number(params[0])) build.status = "hidden";
      return [{ status: build.status }];
    }
    throw new Error(`Unexpected statement: ${statement}`);
  };
  return { default: { execute, transaction: async <T>(work: (tx: { execute: typeof execute }) => Promise<T>) => work({ execute }) } };
});

import { AUTO_HIDE_REPORTS, reportGalleryBuild, setGalleryLike } from "../server/services/buildbattle-gallery";

const BUILD_ID = "0b7c6f1e-3c1a-4c7e-9d65-1f1a2b3c4d5e";

beforeEach(() => {
  state.builds.clear();
  state.likes.clear();
  state.reports.clear();
  state.builds.set(BUILD_ID, { id: BUILD_ID, shortCode: "Ab12Cd34", status: "published", likeCount: 4, reportCount: 0 });
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("gallery likes", () => {
  it("is idempotent per liker key and moves the counter only on real changes", async () => {
    await expect(setGalleryLike("Ab12Cd34", "web:a", true)).resolves.toEqual({ liked: true, likeCount: 5 });
    await expect(setGalleryLike("Ab12Cd34", "web:a", true)).resolves.toEqual({ liked: true, likeCount: 5 });
    await expect(setGalleryLike("Ab12Cd34", "app:b", true)).resolves.toEqual({ liked: true, likeCount: 6 });
    await expect(setGalleryLike("Ab12Cd34", "web:a", false)).resolves.toEqual({ liked: false, likeCount: 5 });
    await expect(setGalleryLike("Ab12Cd34", "web:a", false)).resolves.toEqual({ liked: false, likeCount: 5 });
    expect(state.likes).toEqual(new Set([`${BUILD_ID}|app:b`]));
  });

  it("404s for unknown, hidden and private builds", async () => {
    await expect(setGalleryLike("Zz99Zz99", "web:a", true)).rejects.toMatchObject({ statusCode: 404 });
    state.builds.get(BUILD_ID)!.status = "private";
    await expect(setGalleryLike("Ab12Cd34", "web:a", true)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("gallery reports", () => {
  it("counts one report per reporter and hides the build at the third", async () => {
    expect(AUTO_HIDE_REPORTS).toBe(3);
    await expect(reportGalleryBuild("Ab12Cd34", "web:a", "offensive")).resolves.toEqual({ recorded: true, hidden: false });
    await expect(reportGalleryBuild("Ab12Cd34", "web:a", "other")).resolves.toEqual({ recorded: false, hidden: false });
    await expect(reportGalleryBuild("Ab12Cd34", "web:b", "other")).resolves.toEqual({ recorded: true, hidden: false });
    await expect(reportGalleryBuild("Ab12Cd34", "app:c", "inappropriate")).resolves.toEqual({ recorded: true, hidden: true });
    expect(state.builds.get(BUILD_ID)).toMatchObject({ status: "hidden", reportCount: 3 });
    await expect(reportGalleryBuild("Ab12Cd34", "web:d", "other")).rejects.toMatchObject({ statusCode: 404 });
  });

});
