import { buildPagePath } from "../../shared/buildbattle-gallery";

/** True when the browser's most preferred language (highest q) is French. */
export function prefersFrench(acceptLanguage: string | undefined) {
  let best: { language: string; quality: number } | null = null;
  for (const entry of (acceptLanguage ?? "").split(",").slice(0, 16)) {
    const [tag, ...parameters] = entry.trim().split(";");
    const language = tag?.trim().toLowerCase().split("-", 1)[0];
    if (!language || language === "*") continue;
    const qualityParameter = parameters.map((value) => value.trim()).find((value) => value.startsWith("q="));
    const quality = qualityParameter ? Number(qualityParameter.slice(2)) : 1;
    if (!Number.isFinite(quality) || quality <= 0) continue;
    // Earlier entries win ties.
    if (!best || quality > best.quality) best = { language, quality };
  }
  return best?.language === "fr";
}

/** French browsers → /fr/galerie/<code>, everyone else → /builds/<code>. */
export function shortLinkTarget(shortCode: string, acceptLanguage: string | undefined) {
  return buildPagePath(shortCode, prefersFrench(acceptLanguage) ? "fr" : null);
}
