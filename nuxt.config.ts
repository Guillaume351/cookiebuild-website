// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss", "shadcn-nuxt"],
  app: {
    head: {
      title: "Cookie Build : Minecraft Mini-Games Server",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          hid: "description",
          name: "description",
          content:
            "The Classic Minecraft Mini-Games Server, for Java & Bedrock Editions 🎮 Pitchout and MicroBattles available now!",
        },
      ],
    },
  },
});
