import { isValidLinkPepper } from "../../../utils/mobile-validation";

export default defineCachedEventHandler(
  () => ({
    data: {
      apiVersion: 1,
      server: {
        java: { host: "play.cookie-build.com", port: 25565 },
        bedrock: { host: "play.cookie-build.com", port: 19132 },
      },
      features: {
        playerStats: true,
        playerLinking: isValidLinkPepper(process.env.MOBILE_LINK_PEPPER),
        pushNotifications: Boolean(process.env.NUXT_FIREBASE_PROJECT_ID),
        events: true,
        news: true,
        friends: false,
        parties: false,
        liveChat: false,
        shop: false,
      },
      gamemodes: [
        { id: "microbattles", name: "MicroBattles", icon: "/microbattles-icon.svg" },
        { id: "pitchout", name: "Pitchout", icon: "/pitchout-icon.svg" },
        { id: "skywars", name: "SkyWars", icon: "/skywars-icon.svg" },
        { id: "buildbattles", name: "BuildBattles", icon: "/buildbattle-icon.svg" },
      ],
      accountDeletionUrl: "https://www.cookie-build.com/account/delete",
      privacyUrl: "https://www.cookie-build.com/privacy",
      termsUrl: "https://www.cookie-build.com/terms",
      supportEmail: "support@cookie-build.com",
    },
  }),
  { maxAge: 300, name: "cookie-build-mobile-bootstrap-v1" },
);
