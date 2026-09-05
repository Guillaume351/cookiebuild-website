// https://nuxt.com/docs/api/configuration/nuxt-config
const publicSecurityHeaders = process.env.NODE_ENV === "production"
  ? {
      "Content-Security-Policy": "default-src 'self'; base-uri 'self'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https:; object-src 'none'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    }
  : {};

export default defineNuxtConfig({
  compatibilityDate: "2026-07-13",
  devtools: { enabled: process.env.NODE_ENV !== "production" },
  modules: ["@nuxtjs/tailwindcss", "shadcn-nuxt"],
  runtimeConfig: { public: { gaMeasurementId: "" } },
  routeRules: {
    "/**": { headers: publicSecurityHeaders },
    "/news": { redirect: { to: "/updates", statusCode: 301 } },
    "/changelog": { redirect: { to: "/updates", statusCode: 301 } },
    "/lobby.webp": { redirect: { to: "/lobby-hero-clean-1600.webp", statusCode: 301 } },
  },
  app: {
    layoutTransition: { name: "layout", mode: "out-in" },
    head: {
      htmlAttrs: {
        lang: "en",
        class: "dark",
      },
      title: "Cookie Build | Classic Minecraft Mini-Games Server (Java & Bedrock)",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Join Cookie Build, an independent Minecraft mini-games server for Java and Bedrock. Check live edition status, read the rules, and play free.",
        },
        { name: "theme-color", content: "#f97316" }, // Orange-500
        // Open Graph
        { property: "og:title", content: "Cookie Build | Classic Minecraft Mini-Games Server" },
        { property: "og:description", content: "Play free Minecraft mini-games across Java and Bedrock, with live status, clear rules, and player safety tools." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://www.cookie-build.com/" },
        { property: "og:image", content: "https://www.cookie-build.com/cookie-build-social.webp" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "Cookie Build Minecraft lobby" },
        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Cookie Build Minecraft Server" },
        { name: "twitter:description", content: "The classic Minecraft mini-games experience for Java & Bedrock." },
        { name: "twitter:image", content: "https://www.cookie-build.com/cookie-build-social.webp" },
        { name: "twitter:image:alt", content: "Cookie Build Minecraft lobby" },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      ],
    },
  },
});
