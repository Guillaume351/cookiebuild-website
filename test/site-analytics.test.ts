import { describe, expect, it, vi } from "vitest";
import { analyticsPage, dispatchSiteAnalytics, trafficSourceGroup } from "../utils/site-analytics";

describe("minimal public site analytics", () => {
  it("never exports dynamic paths, queries, hashes, title content, or raw referrers", () => {
    const tag = vi.fn();
    expect(dispatchSiteAnalytics({ id: "G-TEST123456", consent: "granted", event: "page_view", path: "/fr/updates/private-player?code=secret#token", source: "private.example" as any, initialize: () => tag })).toBe(true);
    expect(tag).toHaveBeenNthCalledWith(1, "config", "G-TEST123456", { send_page_view: false, page_location: "https://www.cookie-build.com/updates/article", page_title: "Cookie Build · Update article", page_referrer: "" });
    expect(tag).toHaveBeenCalledWith("event", "page_view", {
      send_to: "G-TEST123456", page_location: "https://www.cookie-build.com/updates/article",
      page_title: "Cookie Build · Update article", page_referrer: "", page_group: "/updates/article", site_language: "fr", traffic_source_group: "other",
    });
    for (const path of ["/admin", "/admin/commerce", "/fr/account/delete", "/shop/checkout?player=private", "/player/private", "/%2Fprivate", "https://private.example"]) expect(analyticsPage(path)).toBeNull();
    expect(analyticsPage("/pt-br/skyblock/?q=private")).toMatchObject({ path: "/skyblock", locale: "pt-BR" });
  });
  it("does not initialize before consent, on a private page, or for arbitrary event names", () => {
    const initialize = vi.fn();
    const input = { id: "G-TEST123456", consent: "granted" as const, event: "page_view" as const, path: "/", source: "direct" as const, initialize };
    expect(dispatchSiteAnalytics({ ...input, consent: null })).toBe(false);
    expect(dispatchSiteAnalytics({ ...input, consent: "denied" })).toBe(false);
    expect(dispatchSiteAnalytics({ ...input, id: "invalid" })).toBe(false);
    expect(dispatchSiteAnalytics({ ...input, path: "/admin/commerce" })).toBe(false);
    expect(dispatchSiteAnalytics({ ...input, event: "private-name" as any })).toBe(false);
    expect(initialize).not.toHaveBeenCalled();
  });
  it("classifies acquisition locally using fixed groups and exact domain boundaries", () => {
    expect(trafficSourceGroup("")).toBe("direct");
    expect(trafficSourceGroup("https://www.google.fr/search?q=private")).toBe("google");
    expect(trafficSourceGroup("https://google.fr.evil.example/private")).toBe("other");
    expect(trafficSourceGroup("https://metrics.cookie-build.com/private")).toBe("internal");
    expect(trafficSourceGroup("https://discord.com/channels/private")).toBe("discord");
    expect(trafficSourceGroup("https://t.co/private")).toBe("social");
    expect(trafficSourceGroup("not a URL")).toBe("other");
    expect(trafficSourceGroup("javascript:private")).toBe("other");
  });
});
