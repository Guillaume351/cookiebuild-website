import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";
import { getRequestHeader } from "h3";
import { appendVaryAcceptEncoding, negotiateHtmlEncoding } from "../../utils/http-compression";

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const MIN_COMPRESSIBLE_BYTES = 1024;

/**
 * Compresses server-rendered HTML (static assets are precompressed at build time
 * by nitro.compressPublicAssets). SSR responses are buffered strings, so this
 * never interferes with streaming; Vary keeps shared caches correct.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:response", async (response, { event }) => {
    const headers = (response.headers ??= {}) as Record<string, string | string[] | number | undefined>;
    const contentType = String(headers["content-type"] ?? headers["Content-Type"] ?? "");
    if (!contentType.startsWith("text/html")) return;
    if (headers["content-encoding"] || typeof response.body !== "string") return;
    const size = Buffer.byteLength(response.body);
    if (size < MIN_COMPRESSIBLE_BYTES) return;

    headers.vary = appendVaryAcceptEncoding(headers.vary);
    const encoding = negotiateHtmlEncoding(getRequestHeader(event, "accept-encoding"));
    if (!encoding) return;

    try {
      response.body = encoding === "br"
        ? await brotli(response.body, {
          params: {
            [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
            [constants.BROTLI_PARAM_QUALITY]: 5,
            [constants.BROTLI_PARAM_SIZE_HINT]: size,
          },
        })
        : await gzipAsync(response.body, { level: 6 });
      headers["content-encoding"] = encoding;
      delete headers["content-length"];
    } catch (error) {
      console.error("[html-compression] falling back to identity", error);
    }
  });
});
