import { createError } from "h3";
import { positiveInteger } from "./mobile-validation";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface MobileNewsQuery {
  limit: number;
  contentType: "news" | "changelog" | undefined;
  includeSuperseded: boolean;
  slug: string | undefined;
}

export function parseMobileNewsQuery(query: Record<string, unknown>): MobileNewsQuery {
  const contentType = query.contentType;
  if (contentType !== undefined && contentType !== "news" && contentType !== "changelog") {
    throw createError({ statusCode: 400, statusMessage: "Invalid content type" });
  }

  const includeSuperseded = query.includeSuperseded;
  if (includeSuperseded !== undefined && includeSuperseded !== "true" && includeSuperseded !== "false") {
    throw createError({ statusCode: 400, statusMessage: "Invalid includeSuperseded value" });
  }

  const slug = query.slug;
  if (slug !== undefined && (typeof slug !== "string" || !slugPattern.test(slug))) {
    throw createError({ statusCode: 400, statusMessage: "Invalid news slug" });
  }

  return {
    limit: positiveInteger(query.limit, 20, 50),
    contentType,
    includeSuperseded: includeSuperseded === "true",
    slug,
  };
}
