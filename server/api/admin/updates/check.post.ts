import { desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import db from "../../../../db/client";
import { updateCheckRuns } from "../../../../db/schema";
import { internalJsonRequest, internalTextRequest } from "../../../services/admin-control-plane";
import { requireAdminAuth, writeAdminAudit } from "../../../utils/admin-auth";
import { internalServiceConfig } from "../../../utils/admin-internal";

export default defineEventHandler(async (event) => {
  requireAdminAuth(event, "updates:write");
  const service = internalServiceConfig("updates");
  const idempotencyKey = `admin-update-check:${randomUUID()}`;
  try {
    const summary = await internalJsonRequest<Record<string, unknown>>({
      ...service,
      path: "/v1/check",
      method: "POST",
      body: {},
      timeoutMs: 30_000,
      idempotencyKey,
    });
    const [reportMarkdown, promptMarkdown] = await Promise.all([
      internalTextRequest({ ...service, path: "/v1/report.md", accept: "text/markdown" }),
      internalTextRequest({ ...service, path: "/v1/ai-prompt.txt" }),
    ]);
    const results = Array.isArray(summary.results) ? summary.results as Array<Record<string, unknown>> : [];
    const updatesAvailableCount = results.filter((result) => result.updateAvailable === true).length;
    const updatesAvailable = updatesAvailableCount > 0;
    await db.insert(updateCheckRuns).values({
      status: updatesAvailable ? "updates_available" : "current",
      summary,
      reportMarkdown,
      promptMarkdown,
    });
    await writeAdminAudit(event, "updates.check", "update_check", null, { updatesAvailable, updatesAvailableCount });
    return { data: summary };
  } catch {
    const previous = await db.select({ id: updateCheckRuns.id }).from(updateCheckRuns)
      .orderBy(desc(updateCheckRuns.checkedAt)).limit(1);
    await db.insert(updateCheckRuns).values({
      status: "failed",
      summary: { previousRunId: previous[0]?.id ?? null },
      error: "Update check failed",
    });
    await writeAdminAudit(event, "updates.check.failed", "update_check", null);
    throw createError({ statusCode: 502, statusMessage: "Update check failed" });
  }
});
