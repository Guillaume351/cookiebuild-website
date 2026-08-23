import { isValidLinkPepper } from "../../../utils/mobile-validation";
import { mobileCapabilities } from "../../../services/mobile-capabilities";
import localeContract from "../../../../contracts/locales-v1.json";

export default defineCachedEventHandler(
  async () => {
    const bedWarsEnabled = process.env.COOKIEBUILD_BEDWARS_ENABLED?.trim().toLowerCase() === "true";
    const friends = process.env.MOBILE_FRIENDS_ENABLED?.trim().toLowerCase() === "true";
    const parties = process.env.MOBILE_PARTIES_ENABLED?.trim().toLowerCase() === "true";
    const capabilities = await mobileCapabilities();
    return {
      data: {
        apiVersion: 1,
        localeContract,
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
          friends,
          parties,
          engagement: true,
          presence: friends || parties,
          friendOnlineAlerts: friends,
          liveChat: false,
          shop: capabilities.kitShop,
          playerDashboard: capabilities.playerDashboard,
          skyblockCompanion: capabilities.skyblockCompanion,
          skyblockManagementWrites: capabilities.skyblockManagementWrites,
          skyblockMarketWrites: capabilities.skyblockMarketWrites,
        },
        gamemodes: [
          { id: "microbattles", name: "MicroBattles", icon: "/microbattles-icon.svg", available: true },
          { id: "pitchout", name: "Pitchout", icon: "/pitchout-icon.svg", available: true },
          { id: "skywars", name: "SkyWars", icon: "/skywars-icon.svg", available: true },
          { id: "buildbattles", name: "BuildBattles", icon: "/buildbattle-icon.svg", available: true },
          { id: "turfwars", name: "TurfWars", icon: "/turfwars-icon.svg", available: true },
          {
            id: "bedwars",
            name: "BedWars",
            icon: "/bedwars-icon.svg",
            available: bedWarsEnabled,
            releaseStage: "beta",
          },
          {
            id: "skyblock",
            name: "Skyblock",
            icon: "/skyblock-icon.svg",
            available: capabilities.skyblockCompanion,
            releaseStage: "beta",
          },
        ],
        accountDeletionUrl: "https://www.cookie-build.com/account/delete",
        privacyUrl: "https://www.cookie-build.com/privacy",
        termsUrl: "https://www.cookie-build.com/terms",
        supportEmail: "support@cookie-build.com",
      },
    };
  },
  { maxAge: 300, name: "cookie-build-mobile-bootstrap-v1" },
);
