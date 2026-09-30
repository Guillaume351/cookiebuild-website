export type HtmlEncoding = "br" | "gzip";

/** Picks the best encoding the client accepts, honouring q=0 exclusions. */
export function negotiateHtmlEncoding(acceptEncoding: string | undefined | null): HtmlEncoding | null {
  if (!acceptEncoding) return null;
  const accepted = new Map<string, number>();
  for (const part of acceptEncoding.split(",")) {
    const [rawName, ...params] = part.trim().toLowerCase().split(";");
    const name = rawName?.trim();
    if (!name) continue;
    const q = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
    const quality = q ? Number.parseFloat(q.slice(2)) : 1;
    accepted.set(name, Number.isFinite(quality) ? quality : 0);
  }
  const quality = (name: HtmlEncoding) => accepted.get(name) ?? (accepted.has("*") ? accepted.get("*")! : 0);
  const br = quality("br");
  const gzip = quality("gzip");
  if (br > 0 && br >= gzip) return "br";
  if (gzip > 0) return "gzip";
  return null;
}

export function appendVaryAcceptEncoding(vary: string | string[] | number | undefined): string {
  const values = (Array.isArray(vary) ? vary.join(",") : String(vary ?? ""))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.includes("*") || values.some((value) => value.toLowerCase() === "accept-encoding")) return values.join(", ");
  return [...values, "Accept-Encoding"].join(", ");
}
