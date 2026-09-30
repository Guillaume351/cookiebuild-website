/** Public Cookie Build profiles, shared by links and structured data. */
export const DISCORD_INVITE_URL = "https://discord.gg/ajmPnwh9g8";
export const X_PROFILE_URL = "https://x.com/CookieBuild";
export const APP_STORE_URL = "https://apps.apple.com/app/id1223020091";
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=cookiebuild.com.cookiebuildstatus";
export const GITHUB_PROFILE_URL = "https://github.com/Guillaume351";

export const SERVER_ADDRESS = "play.cookie-build.com";
export const BEDROCK_PORT = "19132";
export const BEDROCK_ADD_SERVER_URL = `minecraft://?addExternalServer=CookieBuild|${SERVER_ADDRESS}:${BEDROCK_PORT}`;

export const SOCIAL_PROFILE_URLS = [DISCORD_INVITE_URL, X_PROFILE_URL, APP_STORE_URL, GOOGLE_PLAY_URL] as const;
