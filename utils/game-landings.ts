export const COOKIE_BUILD_SERVER_IP = "play.cookie-build.com";
export const COOKIE_BUILD_BEDROCK_PORT = "19132";
export const COOKIE_BUILD_SITE_URL = "https://www.cookie-build.com";

export interface GameLandingStep {
  title: string;
  description: string;
}

export interface GameLandingFaq {
  question: string;
  answer: string;
}

export interface GameLanding {
  slug: string;
  path: string;
  name: string;
  icon: string;
  cardDescription: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  heroIntro: string;
  joinHeading: string;
  joinIntro: string;
  lobbyLabel: string;
  gameplayEyebrow: string;
  gameplayHeading: string;
  steps: GameLandingStep[];
  highlightHeading: string;
  highlightBody: string;
  socialDescription: string;
  faqs: GameLandingFaq[];
}

const joinFaq = (gameName: string) => ({
  question: `How do I join ${gameName} on Minecraft Bedrock?`,
  answer: `Open Play, choose Servers and Add Server, then enter ${COOKIE_BUILD_SERVER_IP} with port ${COOKIE_BUILD_BEDROCK_PORT}. Join Cookie Build and select ${gameName} in the lobby.`,
});

export const gameLandings: GameLanding[] = [
  {
    slug: "build-battle",
    path: "/build-battle",
    name: "Build Battle",
    icon: "/buildbattle-icon.svg",
    cardDescription: "Vote for a theme, build on your own plot for five minutes, then judge every creation.",
    seoTitle: "Build Battle Minecraft Bedrock Server | Cookie Build",
    metaDescription: `Play Build Battle on a free Minecraft Bedrock and Java server. Join ${COOKIE_BUILD_SERVER_IP} on Bedrock port ${COOKIE_BUILD_BEDROCK_PORT} and start building.`,
    h1: "Build Battle Minecraft Server for Bedrock & Java",
    heroIntro: "Looking for a Build Battle Minecraft Bedrock server? Join Cookie Build to vote for a theme, create your build in five minutes, and score every plot with Java and Bedrock players in the same game. This is a live multiplayer server, not a Marketplace map or download.",
    joinHeading: "Play Build Battle on Minecraft Bedrock",
    joinIntro: "Cookie Build supports Minecraft Bedrock on Windows, Android, and iOS, as well as Minecraft Java. Both editions join the same Build Battle games.",
    lobbyLabel: "Build Battles",
    gameplayEyebrow: "One theme, endless ideas",
    gameplayHeading: "How Cookie Build's Build Battle works",
    steps: [
      { title: "Vote for a theme", description: "Choose from three proposed themes while players join the game." },
      { title: "Build for five minutes", description: "Create something memorable on your own plot with the cross-play building palette." },
      { title: "Judge every plot", description: "Visit the other creations, rate them from 1 to 5, and see the final ranking." },
    ],
    highlightHeading: "A cross-play Build Battle server",
    highlightBody: "Theme voting, eight private building plots, a cross-play item palette, floor customization, and 1-to-5 judging are designed to work across Bedrock and Java. Match rewards contribute to your Cookie Build progression.",
    socialDescription: "Vote for a theme, build for five minutes, and judge every plot on Cookie Build's free cross-play server.",
    faqs: [
      { question: "Is Cookie Build a Build Battle Minecraft Bedrock server?", answer: `Yes. Bedrock players can join ${COOKIE_BUILD_SERVER_IP} on port ${COOKIE_BUILD_BEDROCK_PORT} and play Build Battles with Java players.` },
      joinFaq("Build Battles"),
      { question: "Can Minecraft Java and Bedrock players build together?", answer: "Yes. Cookie Build is a cross-play server, so supported Java and Bedrock players share the same Build Battle games." },
      { question: "How long is the building phase?", answer: "Players get five minutes to complete their themed build before judging begins." },
    ],
  },
  {
    slug: "microbattles",
    path: "/microbattles",
    name: "MicroBattles",
    icon: "/microbattles-icon.svg",
    cardDescription: "Fight in four compact teams, use your kit and blocks wisely, and be the last team alive.",
    seoTitle: "MicroBattles Minecraft Bedrock Server | Cookie Build",
    metaDescription: `Play MicroBattles on a free Minecraft Bedrock and Java server. Join ${COOKIE_BUILD_SERVER_IP}:${COOKIE_BUILD_BEDROCK_PORT} for fast four-team battles.`,
    h1: "MicroBattles Minecraft Server for Bedrock & Java",
    heroIntro: "Play fast four-team Minecraft battles on Cookie Build. Choose a kit, prepare behind the arena walls, then fight to make Blue, Red, Yellow, or Green the last team standing on Bedrock and Java.",
    joinHeading: "Play MicroBattles on Minecraft Bedrock",
    joinIntro: "Join the same MicroBattles queues from Minecraft Bedrock or Java. The game supports four teams of up to three players on compact, purpose-built arenas.",
    lobbyLabel: "MicroBattles",
    gameplayEyebrow: "Compact maps, quick decisions",
    gameplayHeading: "How MicroBattles works",
    steps: [
      { title: "Join one of four teams", description: "Blue, Red, Yellow, and Green each have room for up to three players." },
      { title: "Prepare your kit", description: "Start with your selected kit and team-colored wool while the arena walls protect each team." },
      { title: "Survive the battle", description: "The walls fall after 15 seconds. Eliminate the other teams and keep at least one teammate alive." },
    ],
    highlightHeading: "Four teams, eight classic arenas",
    highlightBody: "MicroBattles combines kit choices, limited building blocks, close combat, team play, kills and assists. Victories and contributions award coins and experience for your persistent progression.",
    socialDescription: "Join fast four-team MicroBattles games with Minecraft Bedrock and Java players on Cookie Build.",
    faqs: [
      { question: "Can I play MicroBattles on Minecraft Bedrock?", answer: `Yes. Add ${COOKIE_BUILD_SERVER_IP} with port ${COOKIE_BUILD_BEDROCK_PORT}, then choose MicroBattles in the lobby.` },
      joinFaq("MicroBattles"),
      { question: "How many players are in a MicroBattles game?", answer: "A full match has up to 12 players split across four teams of three." },
      { question: "How do you win MicroBattles?", answer: "Eliminate the other teams. The last team with a surviving player wins." },
    ],
  },
  {
    slug: "pitchout",
    path: "/pitchout",
    name: "Pitchout",
    icon: "/pitchout-icon.svg",
    cardDescription: "Use high-knockback weapons to send rivals into the void while protecting your five lives.",
    seoTitle: "Pitchout Minecraft Bedrock Server | Cookie Build",
    metaDescription: `Play Pitchout on Cookie Build's free Minecraft Bedrock and Java server. Join ${COOKIE_BUILD_SERVER_IP}:${COOKIE_BUILD_BEDROCK_PORT} and protect your five lives.`,
    h1: "Pitchout Minecraft Server for Bedrock & Java",
    heroIntro: "Pitchout is Cookie Build's high-knockback survival mini-game. Use a knockback shovel and a punch bow to launch opponents from the arena, protect your five lives, and become the last player standing.",
    joinHeading: "Play Pitchout on Minecraft Bedrock",
    joinIntro: "Minecraft Bedrock and Java players share the same Pitchout arenas, map vote, live scoreboard, match rewards and progression.",
    lobbyLabel: "Pitchout",
    gameplayEyebrow: "Five lives, one winner",
    gameplayHeading: "How Pitchout works",
    steps: [
      { title: "Vote for the next arena", description: "Choose between the available Pitchout maps while the match fills." },
      { title: "Master the knockback", description: "Use your knockback shovel at close range or the punch bow to strike from a distance." },
      { title: "Protect five lives", description: "A fall costs one life. Return to the arena and keep fighting until only one player remains." },
    ],
    highlightHeading: "A classic Cookie Build original",
    highlightBody: "Three distinct arenas use different knockback strengths and spawn layouts. The match tracks eliminations, knockbacks and combos, then awards coins and experience to every participant.",
    socialDescription: "Knock rivals from the arena and protect five lives in Cookie Build's cross-play Pitchout mini-game.",
    faqs: [
      { question: "Can I play Pitchout on Minecraft Bedrock?", answer: `Yes. Join ${COOKIE_BUILD_SERVER_IP} on Bedrock port ${COOKIE_BUILD_BEDROCK_PORT} and choose Pitchout in the lobby.` },
      joinFaq("Pitchout"),
      { question: "What equipment do you get in Pitchout?", answer: "Every player receives a high-knockback wooden shovel, a punch bow and an infinity arrow." },
      { question: "How do you win Pitchout?", answer: "Each player starts with five lives. Keep knocking opponents out until you are the last player remaining." },
    ],
  },
  {
    slug: "skywars",
    path: "/skywars",
    name: "SkyWars",
    icon: "/skywars-icon.svg",
    cardDescription: "Loot your island, bridge toward stronger center chests, and outlast every opponent in the sky.",
    seoTitle: "SkyWars Minecraft Bedrock Server | Cookie Build",
    metaDescription: `Play SkyWars on a free Minecraft Bedrock and Java server. Join ${COOKIE_BUILD_SERVER_IP}:${COOKIE_BUILD_BEDROCK_PORT}, loot your island and fight to survive.`,
    h1: "SkyWars Minecraft Server for Bedrock & Java",
    heroIntro: "Join classic solo SkyWars matches from Minecraft Bedrock or Java. Start on your own floating island, loot chests, build toward the center, fight other players, and survive the void to claim victory.",
    joinHeading: "Play SkyWars on Minecraft Bedrock",
    joinIntro: "Cookie Build's SkyWars queues, kits, chest loot, maps and progression are shared by supported Bedrock and Java players.",
    lobbyLabel: "SkyWars",
    gameplayEyebrow: "Loot, bridge, survive",
    gameplayHeading: "How Cookie Build SkyWars works",
    steps: [
      { title: "Choose your kit", description: "Prepare a play style before the match and spawn on one of the arena's floating islands." },
      { title: "Loot and bridge", description: "Open island chests, gather blocks and move toward the center for additional loot." },
      { title: "Be the last survivor", description: "Fight opponents, avoid the void and outlast every other player to win the match." },
    ],
    highlightHeading: "Four restored SkyWars arenas",
    highlightBody: "Cookie Build preserves four classic island layouts with validated spawns and richer middle chests. Kills, participation and victories award coins and experience for SkyWars progression.",
    socialDescription: "Loot, bridge and survive classic SkyWars arenas with Minecraft Bedrock and Java players.",
    faqs: [
      { question: "Can I play SkyWars on Minecraft Bedrock?", answer: `Yes. Add ${COOKIE_BUILD_SERVER_IP} with port ${COOKIE_BUILD_BEDROCK_PORT}, join Cookie Build and choose SkyWars.` },
      joinFaq("SkyWars"),
      { question: "Does Cookie Build SkyWars have kits?", answer: "Yes. Players can choose a SkyWars kit before the match to prepare their preferred play style." },
      { question: "How many SkyWars maps are available?", answer: "Cookie Build currently rotates four restored classic SkyWars arenas." },
      { question: "Is Cookie Build SkyWars solo or team-based?", answer: "It is a solo free-for-all. Every player starts on a separate island, and the last surviving player wins." },
    ],
  },
  {
    slug: "turfwars",
    path: "/turfwars",
    name: "TurfWars",
    icon: "/turfwars-icon.svg",
    cardDescription: "Build defenses, land bow hits and push your team's territory across the arena.",
    seoTitle: "Turf Wars Minecraft Bedrock Server | Cookie Build",
    metaDescription: `Play Turf Wars on a free Minecraft Bedrock and Java server. Join ${COOKIE_BUILD_SERVER_IP}:${COOKIE_BUILD_BEDROCK_PORT}, build defenses and capture territory.`,
    h1: "Turf Wars Minecraft Server for Bedrock & Java",
    heroIntro: "Join Blue or Red in Cookie Build's cross-play Turf Wars. Alternate between short building rounds and bow combat, defend your side, and land hits to push your team's territory across the arena.",
    joinHeading: "Play Turf Wars on Minecraft Bedrock",
    joinIntro: "Turf Wars supports 2 to 10 Bedrock and Java players, shuffled into balanced Blue and Red teams on the same server.",
    lobbyLabel: "TurfWars",
    gameplayEyebrow: "Build, battle, capture",
    gameplayHeading: "How Turf Wars works",
    steps: [
      { title: "Build for 25 seconds", description: "Use team wool inside your current territory to create cover and firing positions." },
      { title: "Fight for 90 seconds", description: "Use the unbreakable bow and replenishing arrow to tag opponents during combat." },
      { title: "Push the turf to 72", description: "Each enemy hit moves two turf columns. Reach 72 points before the other team to win." },
    ],
    highlightHeading: "Balanced cross-play team combat",
    highlightBody: "Matches alternate BUILD and COMBAT phases for up to 12 minutes. Hits, participation and victory feed Cookie Build progression, while a 60-second reconnect window protects short disconnects.",
    socialDescription: "Build defenses and capture territory in cross-play Turf Wars for Minecraft Bedrock and Java.",
    faqs: [
      { question: "Can I play Turf Wars on Minecraft Bedrock?", answer: `Yes. Join ${COOKIE_BUILD_SERVER_IP} on port ${COOKIE_BUILD_BEDROCK_PORT} and select TurfWars in the lobby.` },
      joinFaq("TurfWars"),
      { question: "How many players can join Turf Wars?", answer: "Turf Wars supports 2 to 10 players, divided into balanced Blue and Red teams." },
      { question: "How do you win Turf Wars?", answer: "Land bow hits to move the boundary by two columns. The first team to 72 points wins; after 12 minutes, the higher score wins." },
    ],
  },
];

export const gameLandingBySlug = Object.fromEntries(
  gameLandings.map((game) => [game.slug, game]),
) as Record<string, GameLanding>;
