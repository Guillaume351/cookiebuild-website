import { describe, expect, it } from "vitest";
import { appendVaryAcceptEncoding, negotiateHtmlEncoding } from "../utils/http-compression";

describe("SSR HTML compression negotiation", () => {
  it("prefers brotli, falls back to gzip and honours exclusions", () => {
    expect(negotiateHtmlEncoding("gzip, deflate, br, zstd")).toBe("br");
    expect(negotiateHtmlEncoding("gzip, deflate")).toBe("gzip");
    expect(negotiateHtmlEncoding("br;q=0, gzip")).toBe("gzip");
    expect(negotiateHtmlEncoding("gzip;q=0.5, br;q=0.4")).toBe("gzip");
    expect(negotiateHtmlEncoding("*")).toBe("br");
    expect(negotiateHtmlEncoding("identity")).toBeNull();
    expect(negotiateHtmlEncoding(undefined)).toBeNull();
  });

  it("adds Accept-Encoding to Vary exactly once", () => {
    expect(appendVaryAcceptEncoding(undefined)).toBe("Accept-Encoding");
    expect(appendVaryAcceptEncoding("Cookie")).toBe("Cookie, Accept-Encoding");
    expect(appendVaryAcceptEncoding("accept-encoding")).toBe("accept-encoding");
  });
});
