// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "shadcn-nuxt"],
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
          hid: "description",
          name: "description",
          content:
            "Join Cookie Build, the classic Minecraft mini-games server for Java & Bedrock Editions. Play Pitchout, MicroBattles, and more with a global community since 2014.",
        },
        { name: "theme-color", content: "#f97316" }, // Orange-500
        // Open Graph
        { property: "og:title", content: "Cookie Build | Classic Minecraft Mini-Games Server" },
        { property: "og:description", content: "Play Pitchout, MicroBattles, and unique mini-games on Cookie Build. Supports Minecraft Java & Bedrock Editions." },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://cookie-build.com/" },
        { property: "og:image", content: "https://cookie-build.com/lobby.webp" },
        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Cookie Build Minecraft Server" },
        { name: "twitter:description", content: "The classic Minecraft mini-games experience for Java & Bedrock." },
        { name: "twitter:image", content: "https://cookie-build.com/lobby.webp" },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      ],
    },
  },
});
