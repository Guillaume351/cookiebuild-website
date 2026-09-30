import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { COOKIE_BUILD_BEDROCK_PORT, COOKIE_BUILD_SERVER_IP } from "../utils/game-landings";
import {
  BEDROCK_CONNECT_DNS,
  BEDROCK_CONNECT_DNS_IPS,
  JOIN_GUIDE_COPY,
  JOIN_GUIDE_PATHS,
  JOIN_PLATFORMS,
  type JoinGuideCopy,
} from "../utils/join-guide-copy";
import { LOCALIZED_MARKETING_PATHS, SITE_LOCALES, localizedSitePath } from "../utils/site-locales";

const readSource = (path: string) => readFile(new URL(path, import.meta.url), "utf8");

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}

describe("join guides", () => {
  it("covers every site locale and every platform with complete copy", () => {
    expect(Object.keys(JOIN_GUIDE_COPY).sort()).toEqual(SITE_LOCALES.map((locale) => locale.code).sort());
    expect(JOIN_PLATFORMS).toEqual(["playstation", "xbox", "switch", "mobile", "java"]);

    for (const locale of SITE_LOCALES) {
      const copy = JOIN_GUIDE_COPY[locale.code];
      expect(copy.hub.seoTitle.trim(), locale.code).not.toBe("");
      expect(copy.hub.metaDescription, locale.code).toContain(COOKIE_BUILD_SERVER_IP);

      for (const platformId of JOIN_PLATFORMS) {
        const platform = copy.platforms[platformId];
        const context = `${locale.code}/${platformId}`;
        expect(platform.id).toBe(platformId);
        expect(platform.seoTitle.trim(), context).not.toBe("");
        expect(platform.seoTitle, context).toMatch(/\| Cookie Build$/);
        expect(platform.metaDescription.trim(), context).not.toBe("");
        expect(platform.metaDescription, context).toContain(COOKIE_BUILD_SERVER_IP);
        if (platformId !== "java") expect(platform.metaDescription, context).toContain(COOKIE_BUILD_BEDROCK_PORT);
        expect(platform.h1.trim(), context).not.toBe("");
        expect(platform.intro.trim(), context).not.toBe("");
        expect(platform.methods.length, context).toBeGreaterThan(0);
        for (const method of platform.methods) {
          expect(method.name.trim(), context).not.toBe("");
          expect(method.steps.length, context).toBeGreaterThan(0);
          for (const step of method.steps) {
            expect(step.name.trim(), context).not.toBe("");
            expect(step.text.trim(), context).not.toBe("");
          }
        }
        expect(platform.faqs.length, context).toBeGreaterThanOrEqual(3);
        expect(platform.faqs.length, context).toBeLessThanOrEqual(5);
        for (const faq of platform.faqs) {
          expect(faq.question.trim(), context).not.toBe("");
          expect(faq.answer.trim(), context).not.toBe("");
        }
      }
    }
  });

  it("keeps the same structure as the English source in every locale", () => {
    const shape = (copy: JoinGuideCopy) =>
      JOIN_PLATFORMS.map((id) => ({
        methods: copy.platforms[id].methods.map((method) => [method.id, method.steps.length]),
        tips: copy.platforms[id].tips.length,
        faqs: copy.platforms[id].faqs.length,
      }));
    for (const locale of SITE_LOCALES) {
      expect(shape(JOIN_GUIDE_COPY[locale.code]), locale.code).toEqual(shape(JOIN_GUIDE_COPY.en));
    }
  });

  it("fills every placeholder and translates away from English", () => {
    for (const locale of SITE_LOCALES) {
      const strings = collectStrings(JOIN_GUIDE_COPY[locale.code]);
      for (const text of strings) expect(text, locale.code).not.toMatch(/\{(address|port|primary|secondary|featured|date)\}/);
      if (locale.code !== "en") {
        expect(JOIN_GUIDE_COPY[locale.code].platforms.xbox.h1, locale.code).not.toBe(JOIN_GUIDE_COPY.en.platforms.xbox.h1);
        expect(JOIN_GUIDE_COPY[locale.code].ui.faqHeading, locale.code).not.toBe(JOIN_GUIDE_COPY.en.ui.faqHeading);
      }
    }
  });

  it("addresses French players with tu", () => {
    const french = collectStrings(JOIN_GUIDE_COPY.fr).join("\n");
    expect(french).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(JOIN_GUIDE_COPY.fr.platforms.playstation.seoTitle).toBe("Jouer à Minecraft sur PS4/PS5 : rejoindre Cookie Build | Cookie Build");
  });

  it("only publishes BedrockConnect DNS addresses from the project README", () => {
    expect(BEDROCK_CONNECT_DNS_IPS.length).toBeGreaterThan(0);
    for (const ip of BEDROCK_CONNECT_DNS_IPS) expect(ip).toMatch(IPV4);
    expect(BEDROCK_CONNECT_DNS.secondary).toMatch(IPV4);
    expect(new Set(BEDROCK_CONNECT_DNS_IPS).size).toBe(BEDROCK_CONNECT_DNS_IPS.length);
    expect(JOIN_GUIDE_COPY.en.platforms.playstation.methods[0]!.steps.map((step) => step.text).join(" ")).toContain(
      BEDROCK_CONNECT_DNS.playstationPrimary,
    );
    expect(JOIN_GUIDE_COPY.en.platforms.xbox.methods[0]!.steps.map((step) => step.text).join(" ")).toContain(BEDROCK_CONNECT_DNS.primary);
  });

  it("offers the LAN method on PlayStation and Xbox only, and no Xbox friend method", () => {
    const methodIds = (id: (typeof JOIN_PLATFORMS)[number]) => JOIN_GUIDE_COPY.en.platforms[id].methods.map((method) => method.id);
    expect(methodIds("playstation")).toEqual(["dns", "lan"]);
    expect(methodIds("xbox")).toEqual(["dns", "lan"]);
    expect(methodIds("switch")).toEqual(["dns"]);
    expect(methodIds("mobile")).toEqual(["one-tap", "add-server"]);
    expect(methodIds("java")).toEqual(["add-server", "direct-connect"]);
  });

  it("registers localized routes for the hub and every platform guide", async () => {
    const [hub, platform] = await Promise.all([readSource("../pages/join/index.vue"), readSource("../pages/join/[platform].vue")]);
    expect(hub).toContain('definePageMeta({ alias: ["/fr/rejoindre", "/de/join", "/it/join", "/bg/join", "/es/join", "/hi/join", "/pt-br/join"] })');
    expect(platform).toContain(
      'definePageMeta({ alias: ["/fr/rejoindre/:platform", "/de/join/:platform", "/it/join/:platform", "/bg/join/:platform", "/es/join/:platform", "/hi/join/:platform", "/pt-br/join/:platform"] })',
    );
    expect(platform).toContain('statusMessage: "Guide not found"');
    expect(platform).toContain("minecraft://?addExternalServer=CookieBuild|play.cookie-build.com:19132");
    expect(platform).toContain('href="https://discord.gg/ajmPnwh9g8"');
    expect(platform).toContain("innerHTML: JSON.stringify");

    for (const path of JOIN_GUIDE_PATHS) expect(LOCALIZED_MARKETING_PATHS).toContain(path);
    expect(localizedSitePath("/join/xbox", "fr")).toBe("/fr/rejoindre/xbox");
    expect(localizedSitePath("/join/xbox", "pt-BR")).toBe("/pt-br/join/xbox");
  });
});
