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
        friends: process.env.MOBILE_FRIENDS_ENABLED?.trim().toLowerCase() === "true",
        parties: process.env.MOBILE_PARTIES_ENABLED?.trim().toLowerCase() === "true",
        engagement: true,
        presence: true,
        friendOnlineAlerts: true,
        liveChat: false,
        shop: false,
      },
      gamemodes: [
        { id: "microbattles", name: "MicroBattles", icon: "/microbattles-icon.svg", available: true },
        { id: "pitchout", name: "Pitchout", icon: "/pitchout-icon.svg", available: true },
        { id: "skywars", name: "SkyWars", icon: "/skywars-icon.svg", available: true },
        { id: "buildbattles", name: "BuildBattles", icon: "/buildbattle-icon.svg", available: true },
        { id: "turfwars", name: "TurfWars", icon: "/turfwars-icon.svg", available: false },
      ],
      accountDeletionUrl: "https://www.cookie-build.com/account/delete",
      privacyUrl: "https://www.cookie-build.com/privacy",
      termsUrl: "https://www.cookie-build.com/terms",
      supportEmail: "support@cookie-build.com",
    },
  }),
  { maxAge: 300, name: "cookie-build-mobile-bootstrap-v1" },
);
