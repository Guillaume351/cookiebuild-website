import { COOKIE_BUILD_BEDROCK_PORT, COOKIE_BUILD_SERVER_IP } from "./game-landings";
import type { SiteLocaleCode } from "./site-locales";

export type JoinPlatformId = "playstation" | "xbox" | "switch" | "mobile" | "java";
export type JoinConsoleId = Extract<JoinPlatformId, "playstation" | "xbox" | "switch">;

export const JOIN_PLATFORMS: JoinPlatformId[] = ["playstation", "xbox", "switch", "mobile", "java"];
export const JOIN_CONSOLES: JoinConsoleId[] = ["playstation", "xbox", "switch"];

/** Canonical (English) base paths of the join guides, for the header, footer, modal and sitemap. */
export const JOIN_GUIDE_PATHS = ["/join", "/join/playstation", "/join/xbox", "/join/switch", "/join/mobile", "/join/java"] as const;

export const BEDROCK_CONNECT_URL = "https://github.com/Pugmatt/BedrockConnect";

/**
 * Public BedrockConnect DNS servers, copied verbatim from the BedrockConnect README
 * (https://github.com/Pugmatt/BedrockConnect, raw file:
 * https://raw.githubusercontent.com/Pugmatt/BedrockConnect/master/README.md), checked 2026-09-30.
 *
 * - `primary`: "Main instance" (US, maintained by Pugmatt). The README's Quick setup uses it
 *   for Nintendo Switch and Xbox.
 * - `playstationPrimary`: the README's Quick setup tells PlayStation players to use it
 *   ("If issues occur on PS4/PS5 with DNS method, replace primary DNS address with 45.55.68.52").
 * - `secondary`: the secondary DNS the README recommends for every console.
 * - `alternatives`: community-hosted instances from the README's "List of Instances" table that
 *   have "DNS-Method Enabled" (instances without DNS support are deliberately left out).
 *
 * Never add an address that is not listed in that README.
 */
export const BEDROCK_CONNECT_DNS = {
  source: "https://github.com/Pugmatt/BedrockConnect",
  checkedAt: "2026-09-30",
  primary: "104.238.130.180",
  playstationPrimary: "45.55.68.52",
  secondary: "8.8.8.8",
  alternatives: [
    { ip: "134.255.231.119", region: "DE" },
    { ip: "185.169.180.190", region: "TR" },
    { ip: "57.128.153.204", region: "GB" },
    { ip: "82.22.36.200", region: "CH" },
    { ip: "87.106.68.173", region: "GB" },
  ],
} as const;

/** Every BedrockConnect DNS address we publish (primary instances first). */
export const BEDROCK_CONNECT_DNS_IPS: readonly string[] = [
  BEDROCK_CONNECT_DNS.primary,
  BEDROCK_CONNECT_DNS.playstationPrimary,
  ...BEDROCK_CONNECT_DNS.alternatives.map((instance) => instance.ip),
];

/** Featured servers the BedrockConnect README lists as "redirect-compatible" (checked 2026-09-30). */
export const BEDROCK_CONNECT_REDIRECT_SERVERS = ["Mineville", "Lifeboat", "Enchanted", "Galaxite", "The Hive"] as const;

/** Third-party LAN broadcast tools, verified on 2026-09-30. Neither supports the Nintendo Switch. */
export const JOIN_LAN_TOOLS = [
  { name: "BedrockTogether", href: "https://bedrocktogether.net/" },
  { name: "Phantom", href: "https://github.com/jhead/phantom" },
] as const;

export function bedrockConnectPrimaryDns(platform: JoinConsoleId): string {
  return platform === "playstation" ? BEDROCK_CONNECT_DNS.playstationPrimary : BEDROCK_CONNECT_DNS.primary;
}

export function isJoinPlatform(value: unknown): value is JoinPlatformId {
  return typeof value === "string" && (JOIN_PLATFORMS as string[]).includes(value);
}

export function isJoinConsole(value: JoinPlatformId): value is JoinConsoleId {
  return (JOIN_CONSOLES as string[]).includes(value);
}

export interface JoinGuideStep {
  /** Short label (HowToStep name). */
  name: string;
  /** Full instruction (HowToStep text). */
  text: string;
}

export interface JoinGuideFaq {
  question: string;
  answer: string;
}

export interface JoinGuideLink {
  label: string;
  href: string;
}

export interface JoinGuideMethod {
  id: "dns" | "lan" | "one-tap" | "add-server" | "direct-connect";
  name: string;
  intro: string;
  steps: JoinGuideStep[];
  recommended?: boolean;
  /** Short third-party / caveat note shown under the steps. */
  note?: string;
  /** How to revert the change (DNS method only). */
  undo?: string;
  links?: JoinGuideLink[];
}

export interface JoinPlatformGuide {
  id: JoinPlatformId;
  /** Short device name used on cards, breadcrumbs and "other devices" links. */
  cardTitle: string;
  cardDescription: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  methods: JoinGuideMethod[];
  tips: string[];
  faqs: JoinGuideFaq[];
}

export interface JoinGuideHubCopy {
  seoTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  platformsHeading: string;
  cardCta: string;
  addressHeading: string;
  addressBody: string;
}

export interface JoinGuideUiCopy {
  breadcrumbLabel: string;
  home: string;
  join: string;
  addressHeading: string;
  bedrockAddressBody: string;
  javaAddressBody: string;
  methodsHeading: string;
  recommended: string;
  linksLabel: string;
  undoHeading: string;
  dnsServersHeading: string;
  primaryDnsLabel: string;
  secondaryDnsLabel: string;
  alternativeDnsLabel: string;
  dnsSource: string;
  tipsHeading: string;
  faqHeading: string;
  otherGuidesHeading: string;
  helpHeading: string;
  helpBody: string;
  discordCta: string;
  backToHub: string;
  addToMinecraft: string;
  addToMinecraftNote: string;
}

export interface JoinGuideCopy {
  hub: JoinGuideHubCopy;
  ui: JoinGuideUiCopy;
  platforms: Record<JoinPlatformId, JoinPlatformGuide>;
}

/*
 * Translation sources. Text may use the placeholders {address}, {port}, {primary},
 * {secondary}, {featured} and {date}; they are filled in by buildJoinGuideCopy().
 */
interface JoinPlatformSource {
  cardTitle: string;
  cardDescription: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  tips: string[];
  faqs: JoinGuideFaq[];
}

interface JoinGuideSource {
  hub: JoinGuideHubCopy;
  ui: JoinGuideUiCopy;
  dns: {
    name: string;
    intro: string;
    configure: Record<JoinConsoleId, JoinGuideStep[]>;
    play: JoinGuideStep[];
    note: string;
    undo: Record<JoinConsoleId, string>;
  };
  lan: {
    name: string;
    intro: string;
    steps: JoinGuideStep[];
    note: string;
  };
  mobile: {
    oneTap: { name: string; intro: string; steps: JoinGuideStep[] };
    addServer: { name: string; intro: string; steps: JoinGuideStep[] };
  };
  java: {
    addServer: { name: string; intro: string; steps: JoinGuideStep[] };
    directConnect: { name: string; intro: string; steps: JoinGuideStep[] };
  };
  platforms: Record<JoinPlatformId, JoinPlatformSource>;
}

// JOIN_GUIDE_SOURCES_START
const en: JoinGuideSource = {
  hub: {
    seoTitle: "How to Join Cookie Build on Any Device | Cookie Build",
    metaDescription: "Step-by-step guides to join Cookie Build on PS4/PS5, Xbox, Switch, mobile and Java. Address: play.cookie-build.com, Bedrock port 19132.",
    eyebrow: "Join guides",
    h1: "How to join Cookie Build",
    intro: "Cookie Build is a free Minecraft mini-games server for Java and Bedrock. Pick your device for a step-by-step guide.",
    platformsHeading: "Choose your device",
    cardCta: "Open the guide",
    addressHeading: "Server details",
    addressBody: "Java players only need the address. Bedrock players enter the address and the port in two separate fields.",
  },
  ui: {
    breadcrumbLabel: "Breadcrumb",
    home: "Home",
    join: "Join",
    addressHeading: "Server details",
    bedrockAddressBody: "Enter the address and the port in two separate fields: Minecraft Bedrock does not accept “address:port” in a single field.",
    javaAddressBody: "Java Edition uses the default port, so the address is all you need.",
    methodsHeading: "Step by step",
    recommended: "Recommended",
    linksLabel: "Links",
    undoHeading: "How to undo it",
    dnsServersHeading: "BedrockConnect DNS addresses",
    primaryDnsLabel: "Primary DNS",
    secondaryDnsLabel: "Secondary DNS",
    alternativeDnsLabel: "Other community DNS servers to try if the primary one doesn’t work",
    dnsSource: "Source: BedrockConnect README, checked on {date}.",
    tipsHeading: "Tips",
    faqHeading: "Frequently asked questions",
    otherGuidesHeading: "Playing on another device?",
    helpHeading: "Need help?",
    helpBody: "Join our Discord server: players and staff can help you get connected.",
    discordCta: "Join the Discord",
    backToHub: "All join guides",
    addToMinecraft: "Add to Minecraft",
    addToMinecraftNote: "Open this page on the device where Minecraft is installed. If nothing happens, follow the manual steps below.",
  },
  dns: {
    name: "BedrockConnect DNS method",
    intro: "BedrockConnect is a free, open-source community service that turns a featured server into a menu where you can type any server address. It is not operated by Cookie Build.",
    configure: {
      playstation: [
        {
          name: "Open your network settings",
          text: "PS5: Settings → Network → Settings → Set Up Internet Connection, highlight your current connection and open Advanced Settings. PS4: Settings → Network → Set Up Internet Connection → Wi‑Fi or LAN cable → Custom → your network, then choose Automatic for IP Address Settings and Do Not Specify for DHCP Host Name.",
        },
        {
          name: "Set a manual DNS",
          text: "Set DNS Settings to Manual. Enter {primary} as the primary DNS and {secondary} as the secondary DNS.",
        },
        {
          name: "Save and test",
          text: "PS5: select OK and wait for the connection test. PS4: choose Automatic for MTU Settings and Do Not Use for Proxy Server, then test the connection.",
        },
      ],
      xbox: [
        {
          name: "Open your network settings",
          text: "Go to Settings → General → Network settings → Advanced settings → DNS settings and choose Manual.",
        },
        {
          name: "Enter the DNS addresses",
          text: "Enter {primary} as the primary IPv4 DNS and {secondary} as the secondary IPv4 DNS.",
        },
        {
          name: "Save",
          text: "Confirm the addresses and go back to the network settings screen.",
        },
      ],
      switch: [
        {
          name: "Open your network settings",
          text: "Go to System Settings → Internet → Internet Settings, select your network, then choose Change Settings.",
        },
        {
          name: "Set a manual DNS",
          text: "Set DNS Settings to Manual. Enter {primary} as the primary DNS and {secondary} as the secondary DNS.",
        },
        {
          name: "Save and test",
          text: "Select Save, then test the connection.",
        },
      ],
    },
    play: [
      {
        name: "Open the Servers tab",
        text: "Launch Minecraft, select Play, then open the Servers tab.",
      },
      {
        name: "Join a featured server",
        text: "Join one of the featured servers that BedrockConnect can redirect ({featured}). The BedrockConnect server list opens instead of that server.",
      },
      {
        name: "Choose “Connect to a Server”",
        text: "In the BedrockConnect menu (always in English), select “Connect to a Server”.",
      },
      {
        name: "Enter Cookie Build’s details",
        text: "Type {address} in “Server Address” and {port} in “Server Port”. Turn on “Add to server list” to find Cookie Build in the list next time.",
      },
      {
        name: "Join Cookie Build",
        text: "Submit the form: BedrockConnect transfers you straight to Cookie Build.",
      },
    ],
    note: "While the custom DNS is active, the redirected featured servers open BedrockConnect instead. If {primary} doesn’t work, try one of the other community DNS servers listed below.",
    undo: {
      playstation: "Open the same network menu and set DNS Settings back to Automatic. On PS4, you can also run Set Up Internet Connection again and choose Easy.",
      xbox: "Go to Settings → General → Network settings → Advanced settings → DNS settings and choose Automatic.",
      switch: "Go to System Settings → Internet → Internet Settings → your network → Change Settings and set DNS Settings back to Automatic.",
    },
  },
  lan: {
    name: "LAN helper app (same Wi‑Fi)",
    intro: "A phone or computer on the same network as your console can make Cookie Build appear as a local (LAN) game.",
    steps: [
      {
        name: "Use the same network",
        text: "Connect your phone or computer to the same Wi‑Fi or home network as your console.",
      },
      {
        name: "On a phone: BedrockTogether",
        text: "On Android or iOS, install BedrockTogether, enter {address} and port {port}, then tap “Run”.",
      },
      {
        name: "Or on a computer: Phantom",
        text: "On Windows, macOS or Linux, download Phantom and start it with -server {address}:{port}. Allow it through your firewall if asked.",
      },
      {
        name: "Join from your console",
        text: "Open Minecraft on your console: Cookie Build shows up as a LAN game in the Worlds tab (the Friends tab in some versions). Select it to join.",
      },
      {
        name: "Keep the helper open",
        text: "Keep the app or program open while you connect. Phantom relays your connection, so leave it running while you play.",
      },
    ],
    note: "BedrockTogether and Phantom are third-party tools. They are not operated by Cookie Build.",
  },
  mobile: {
    oneTap: {
      name: "One-tap button",
      intro: "The quickest way on a phone, tablet or Windows PC that has Minecraft installed.",
      steps: [
        {
          name: "Tap “Add to Minecraft”",
          text: "Open this page on your device and tap the “Add to Minecraft” button above.",
        },
        {
          name: "Let Minecraft open",
          text: "If your device supports Minecraft links, Minecraft opens and adds Cookie Build to your servers.",
        },
        {
          name: "Join from the Servers tab",
          text: "Select Play → Servers, then choose Cookie Build to join.",
        },
      ],
    },
    addServer: {
      name: "Add the server manually",
      intro: "Works on every Bedrock device with a server list: Android, iPhone, iPad and Windows.",
      steps: [
        {
          name: "Open the Servers tab",
          text: "Launch Minecraft, select Play, then open the Servers tab.",
        },
        {
          name: "Select “Add Server”",
          text: "Scroll to the bottom of the server list and select “Add Server”.",
        },
        {
          name: "Enter the details",
          text: "Server Name: Cookie Build. Server Address: {address}. Port: {port}.",
        },
        {
          name: "Save and join",
          text: "Select Save, then choose Cookie Build in the list to join.",
        },
      ],
    },
  },
  java: {
    addServer: {
      name: "Add Server",
      intro: "Saves Cookie Build in your server list so you can join it in one click next time.",
      steps: [
        {
          name: "Open Multiplayer",
          text: "Launch Minecraft Java Edition (1.8 or newer) and select Multiplayer.",
        },
        {
          name: "Select Add Server",
          text: "Select Add Server, type Cookie Build as the server name and {address} as the server address.",
        },
        {
          name: "Join Cookie Build",
          text: "Select Done, then double-click Cookie Build in your server list (or select it and click Join Server).",
        },
      ],
    },
    directConnect: {
      name: "Direct Connection",
      intro: "For a quick one-off connection without saving the server.",
      steps: [
        {
          name: "Open Direct Connection",
          text: "In the Multiplayer menu, select Direct Connection.",
        },
        {
          name: "Join the server",
          text: "Type {address} and select Join Server.",
        },
      ],
    },
  },
  platforms: {
    playstation: {
      cardTitle: "PlayStation 4 & 5",
      cardDescription: "Join with the free BedrockConnect DNS method or a LAN helper app.",
      seoTitle: "Play Minecraft on PS4/PS5: Join Cookie Build | Cookie Build",
      metaDescription: "Join Cookie Build on PS4 and PS5: set the BedrockConnect DNS, then connect to play.cookie-build.com on port 19132. Free step-by-step guide.",
      h1: "How to join Cookie Build on PS4 and PS5",
      intro: "Minecraft on PlayStation has no “Add Server” button, only featured servers. You can still join Cookie Build in a few minutes with a DNS change, or with a helper app on the same Wi‑Fi.",
      tips: [
        "Take a photo of your current network settings before changing them, so you can restore them easily.",
        "In BedrockConnect, turn on “Add to server list”: next time, Cookie Build is waiting in the list.",
        "If the BedrockConnect menu closes, crouch or punch to open it again.",
        "No PC? The DNS method only needs your console.",
      ],
      faqs: [
        {
          question: "Can I play Cookie Build on PS5?",
          answer: "Yes. PS4 and PS5 players join with the BedrockConnect DNS method or a LAN helper app, then play on the same server as Java, mobile and PC players.",
        },
        {
          question: "Why is there no “Add Server” button on PlayStation?",
          answer: "Minecraft on consoles only shows featured servers. BedrockConnect turns one of them into a menu where you can type any address, such as play.cookie-build.com with port 19132.",
        },
        {
          question: "Is BedrockConnect run by Cookie Build?",
          answer: "No. BedrockConnect is a free, open-source community project that Cookie Build doesn’t operate. This guide only explains how to use it to reach our server.",
        },
        {
          question: "Can I undo the DNS change?",
          answer: "Yes. Open the same network menu and set DNS Settings back to Automatic. While the custom DNS is active, the redirected featured servers open BedrockConnect instead.",
        },
        {
          question: "Is it free?",
          answer: "Yes. Cookie Build is free to play, and BedrockConnect is free too.",
        },
      ],
    },
    xbox: {
      cardTitle: "Xbox One & Series X|S",
      cardDescription: "Join with the free BedrockConnect DNS method or a LAN helper app.",
      seoTitle: "Play Minecraft on Xbox: Join Cookie Build | Cookie Build",
      metaDescription: "Join Cookie Build on Xbox One and Series X|S: set the BedrockConnect DNS, then connect to play.cookie-build.com on port 19132. Free guide.",
      h1: "How to join Cookie Build on Xbox",
      intro: "Minecraft on Xbox has no “Add Server” button, only featured servers. You can still join Cookie Build in a few minutes with a DNS change, or with a helper app on the same Wi‑Fi.",
      tips: [
        "Write down your current DNS settings before changing them, so you can restore them easily.",
        "In BedrockConnect, turn on “Add to server list”: next time, Cookie Build is waiting in the list.",
        "If the BedrockConnect menu closes, crouch or punch to open it again.",
        "No PC? The DNS method only needs your console.",
      ],
      faqs: [
        {
          question: "Does it work on Xbox Series X and Series S?",
          answer: "Yes. The steps are the same on Xbox One, Series X and Series S.",
        },
        {
          question: "Why is there no “Add Server” button on Xbox?",
          answer: "Minecraft on consoles only shows featured servers. BedrockConnect turns one of them into a menu where you can type any address, such as play.cookie-build.com with port 19132.",
        },
        {
          question: "Is BedrockConnect run by Cookie Build?",
          answer: "No. BedrockConnect is a free, open-source community project that Cookie Build doesn’t operate. This guide only explains how to use it to reach our server.",
        },
        {
          question: "Can I undo the DNS change?",
          answer: "Yes. Go back to Settings → General → Network settings → Advanced settings → DNS settings and choose Automatic.",
        },
      ],
    },
    switch: {
      cardTitle: "Nintendo Switch",
      cardDescription: "Join with the free BedrockConnect DNS method.",
      seoTitle: "Play Minecraft on Switch: Join Cookie Build | Cookie Build",
      metaDescription: "Join Cookie Build on Nintendo Switch: set the BedrockConnect DNS, then connect to play.cookie-build.com on port 19132. Free step-by-step guide.",
      h1: "How to join Cookie Build on Nintendo Switch",
      intro: "Minecraft on Nintendo Switch has no “Add Server” button, only featured servers. A quick DNS change lets you join Cookie Build anyway.",
      tips: [
        "Take a photo of your current network settings before changing them, so you can restore them easily.",
        "In BedrockConnect, turn on “Add to server list”: next time, Cookie Build is waiting in the list.",
        "If the BedrockConnect menu closes, crouch or punch to open it again.",
      ],
      faqs: [
        {
          question: "Can I play Cookie Build on Nintendo Switch?",
          answer: "Yes. Switch players join with the BedrockConnect DNS method, then play on the same server as Java, mobile and PC players.",
        },
        {
          question: "Can I use a LAN app like BedrockTogether or Phantom?",
          answer: "Not on Switch: the Switch can’t see this kind of LAN game. Use the DNS method instead.",
        },
        {
          question: "Is BedrockConnect run by Cookie Build?",
          answer: "No. BedrockConnect is a free, open-source community project that Cookie Build doesn’t operate. This guide only explains how to use it to reach our server.",
        },
        {
          question: "Can I undo the DNS change?",
          answer: "Yes. Go back to System Settings → Internet → Internet Settings → your network → Change Settings and set DNS Settings to Automatic.",
        },
      ],
    },
    mobile: {
      cardTitle: "Mobile & Windows (Bedrock)",
      cardDescription: "Android, iPhone, iPad and Windows: add the server in a few taps.",
      seoTitle: "Join Cookie Build on Minecraft PE (Android/iOS) | Cookie Build",
      metaDescription: "Add Cookie Build to Minecraft Bedrock on Android, iOS or Windows: address play.cookie-build.com, port 19132. One-tap button and manual steps.",
      h1: "How to join Cookie Build on mobile and Windows",
      intro: "On Android, iPhone, iPad and Windows, Minecraft Bedrock lets you add any server. Use the one-tap button or add Cookie Build manually.",
      tips: [
        "The address and the port go in two separate fields.",
        "Once added, Cookie Build stays in your Servers tab.",
        "Friends on console? Send them the PlayStation, Xbox or Switch guide.",
      ],
      faqs: [
        {
          question: "Which port should I use?",
          answer: "Use port 19132, the default Minecraft Bedrock port, with the address play.cookie-build.com.",
        },
        {
          question: "The “Add to Minecraft” button doesn’t work. What can I do?",
          answer: "Some devices or browsers don’t open Minecraft links. Add the server manually: Play → Servers → Add Server.",
        },
        {
          question: "Does it work on Windows 10 and 11?",
          answer: "Yes. Minecraft for Windows (Bedrock Edition) uses the same steps as Android and iOS.",
        },
        {
          question: "Is this the same as Minecraft PE?",
          answer: "Yes. Minecraft Pocket Edition is now part of Minecraft Bedrock Edition. Cookie Build started in 2014 for the Minecraft PE community.",
        },
        {
          question: "Can I play with Java players?",
          answer: "Yes. Cookie Build is a cross-play server: Java and Bedrock players share the same games.",
        },
      ],
    },
    java: {
      cardTitle: "Java Edition (PC, Mac, Linux)",
      cardDescription: "Multiplayer → Add Server → play.cookie-build.com.",
      seoTitle: "Join Cookie Build on Minecraft Java Edition | Cookie Build",
      metaDescription: "Join Cookie Build on Minecraft Java Edition, from 1.8 to the latest release: Multiplayer → Add Server → play.cookie-build.com. No port needed.",
      h1: "How to join Cookie Build on Java Edition",
      intro: "Cookie Build supports Minecraft Java Edition from 1.8 to the latest release on Windows, macOS and Linux. All you need is the address.",
      tips: [
        "No port needed: Java Edition uses the default port.",
        "Any supported version from 1.8 to the latest release works.",
        "You share the same games with Bedrock players.",
      ],
      faqs: [
        {
          question: "Which Minecraft versions are supported?",
          answer: "Supported versions range from 1.8 to the latest release.",
        },
        {
          question: "Do I need to enter a port?",
          answer: "No. On Java Edition, play.cookie-build.com is enough. Port 19132 is only for Bedrock players.",
        },
        {
          question: "Can I play with friends on Bedrock?",
          answer: "Yes. Cookie Build is a cross-play server: Java and Bedrock players share the same games.",
        },
        {
          question: "Is the server free?",
          answer: "Yes. Every mini-game on Cookie Build is free to play.",
        },
      ],
    },
  },
};
const fr: JoinGuideSource = {
  hub: {
    seoTitle: "Rejoindre Cookie Build sur tous les appareils | Cookie Build",
    metaDescription: "Guides pas à pas pour rejoindre Cookie Build sur PS4/PS5, Xbox, Switch, mobile et Java. Adresse : play.cookie-build.com, port Bedrock 19132.",
    eyebrow: "Guides de connexion",
    h1: "Comment rejoindre Cookie Build",
    intro: "Cookie Build est un serveur Minecraft de mini-jeux gratuit pour Java et Bedrock. Choisis ton appareil pour suivre le guide pas à pas.",
    platformsHeading: "Choisis ton appareil",
    cardCta: "Ouvrir le guide",
    addressHeading: "Infos du serveur",
    addressBody: "Sur Java, l’adresse suffit. Sur Bedrock, saisis l’adresse et le port dans deux champs séparés.",
  },
  ui: {
    breadcrumbLabel: "Fil d’Ariane",
    home: "Accueil",
    join: "Rejoindre",
    addressHeading: "Infos du serveur",
    bedrockAddressBody: "Saisis l’adresse et le port dans deux champs séparés : Minecraft Bedrock n’accepte pas « adresse:port » dans un seul champ.",
    javaAddressBody: "Java Edition utilise le port par défaut : l’adresse suffit.",
    methodsHeading: "Pas à pas",
    recommended: "Recommandé",
    linksLabel: "Liens",
    undoHeading: "Comment revenir en arrière",
    dnsServersHeading: "Adresses DNS BedrockConnect",
    primaryDnsLabel: "DNS principal",
    secondaryDnsLabel: "DNS secondaire",
    alternativeDnsLabel: "Autres serveurs DNS communautaires à essayer si le principal ne fonctionne pas",
    dnsSource: "Source : README de BedrockConnect, vérifié le {date}.",
    tipsHeading: "Astuces",
    faqHeading: "Questions fréquentes",
    otherGuidesHeading: "Tu joues sur un autre appareil ?",
    helpHeading: "Besoin d’aide ?",
    helpBody: "Rejoins notre serveur Discord : les joueurs et l’équipe peuvent t’aider à te connecter.",
    discordCta: "Rejoindre le Discord",
    backToHub: "Tous les guides de connexion",
    addToMinecraft: "Ajouter à Minecraft",
    addToMinecraftNote: "Ouvre cette page sur l’appareil où Minecraft est installé. S’il ne se passe rien, suis les étapes manuelles ci-dessous.",
  },
  dns: {
    name: "Méthode DNS BedrockConnect",
    intro: "BedrockConnect est un service communautaire gratuit et open source qui transforme un serveur partenaire en menu où tu peux saisir n’importe quelle adresse de serveur. Il n’est pas exploité par Cookie Build.",
    configure: {
      playstation: [
        {
          name: "Ouvre tes paramètres réseau",
          text: "PS5 : Paramètres → Réseau → Paramètres → Configurer la connexion Internet, sélectionne ta connexion actuelle et ouvre Paramètres avancés. PS4 : Paramètres → Réseau → Configurer la connexion Internet → Wi‑Fi ou câble LAN → Personnalisée → ton réseau, puis choisis Automatique pour Paramètres d’adresse IP et Ne pas spécifier pour Nom d’hôte DHCP.",
        },
        {
          name: "Règle un DNS manuel",
          text: "Règle Paramètres DNS sur Manuel. Saisis {primary} comme DNS principal et {secondary} comme DNS secondaire.",
        },
        {
          name: "Enregistre et teste",
          text: "PS5 : sélectionne OK et attends le test de connexion. PS4 : choisis Automatique pour Paramètres MTU et Ne pas utiliser pour Serveur proxy, puis teste la connexion.",
        },
      ],
      xbox: [
        {
          name: "Ouvre tes paramètres réseau",
          text: "Va dans Paramètres → Général → Paramètres réseau → Paramètres avancés → Paramètres DNS et choisis Manuel.",
        },
        {
          name: "Saisis les adresses DNS",
          text: "Saisis {primary} comme DNS IPv4 principal et {secondary} comme DNS IPv4 secondaire.",
        },
        {
          name: "Enregistre",
          text: "Valide les adresses et reviens à l’écran des paramètres réseau.",
        },
      ],
      switch: [
        {
          name: "Ouvre tes paramètres réseau",
          text: "Va dans Paramètres de la console → Internet → Paramètres Internet, sélectionne ton réseau, puis choisis Modifier les paramètres.",
        },
        {
          name: "Règle un DNS manuel",
          text: "Règle Paramètres DNS sur Manuel. Saisis {primary} comme DNS principal et {secondary} comme DNS secondaire.",
        },
        {
          name: "Enregistre et teste",
          text: "Sélectionne Enregistrer, puis teste la connexion.",
        },
      ],
    },
    play: [
      {
        name: "Ouvre l’onglet Serveurs",
        text: "Lance Minecraft, sélectionne Jouer, puis ouvre l’onglet Serveurs.",
      },
      {
        name: "Rejoins un serveur partenaire",
        text: "Rejoins l’un des serveurs partenaires que BedrockConnect peut rediriger ({featured}). La liste de serveurs BedrockConnect s’ouvre à la place de ce serveur.",
      },
      {
        name: "Choisis “Connect to a Server”",
        text: "Dans le menu BedrockConnect (toujours en anglais), sélectionne “Connect to a Server”.",
      },
      {
        name: "Saisis les infos de Cookie Build",
        text: "Tape {address} dans “Server Address” et {port} dans “Server Port”. Active “Add to server list” pour retrouver Cookie Build dans la liste la prochaine fois.",
      },
      {
        name: "Rejoins Cookie Build",
        text: "Valide le formulaire : BedrockConnect te transfère directement sur Cookie Build.",
      },
    ],
    note: "Tant que le DNS personnalisé est actif, les serveurs partenaires redirigés ouvrent BedrockConnect à la place. Si {primary} ne fonctionne pas, essaie l’un des autres serveurs DNS communautaires listés ci-dessous.",
    undo: {
      playstation: "Ouvre le même menu réseau et remets Paramètres DNS sur Automatique. Sur PS4, tu peux aussi relancer Configurer la connexion Internet et choisir Facile.",
      xbox: "Va dans Paramètres → Général → Paramètres réseau → Paramètres avancés → Paramètres DNS et choisis Automatique.",
      switch: "Va dans Paramètres de la console → Internet → Paramètres Internet → ton réseau → Modifier les paramètres et remets Paramètres DNS sur Automatique.",
    },
  },
  lan: {
    name: "Appli relais LAN (même Wi‑Fi)",
    intro: "Un téléphone ou un ordinateur sur le même réseau que ta console peut faire apparaître Cookie Build comme une partie locale (LAN).",
    steps: [
      {
        name: "Utilise le même réseau",
        text: "Connecte ton téléphone ou ton ordinateur au même Wi‑Fi ou réseau domestique que ta console.",
      },
      {
        name: "Sur téléphone : BedrockTogether",
        text: "Sur Android ou iOS, installe BedrockTogether, saisis {address} et le port {port}, puis appuie sur “Run”.",
      },
      {
        name: "Ou sur ordinateur : Phantom",
        text: "Sur Windows, macOS ou Linux, télécharge Phantom et lance-le avec -server {address}:{port}. Autorise-le dans ton pare-feu si c’est demandé.",
      },
      {
        name: "Rejoins depuis ta console",
        text: "Ouvre Minecraft sur ta console : Cookie Build apparaît comme partie LAN dans l’onglet Mondes (l’onglet Amis dans certaines versions). Sélectionne-le pour le rejoindre.",
      },
      {
        name: "Garde le relais ouvert",
        text: "Garde l’appli ou le programme ouvert pendant la connexion. Phantom relaie ta connexion : laisse-le tourner pendant que tu joues.",
      },
    ],
    note: "BedrockTogether et Phantom sont des outils tiers. Ils ne sont pas exploités par Cookie Build.",
  },
  mobile: {
    oneTap: {
      name: "Bouton en un geste",
      intro: "Le plus rapide sur un téléphone, une tablette ou un PC Windows où Minecraft est installé.",
      steps: [
        {
          name: "Appuie sur « Ajouter à Minecraft »",
          text: "Ouvre cette page sur ton appareil et appuie sur le bouton « Ajouter à Minecraft » ci-dessus.",
        },
        {
          name: "Laisse Minecraft s’ouvrir",
          text: "Si ton appareil prend en charge les liens Minecraft, Minecraft s’ouvre et ajoute Cookie Build à tes serveurs.",
        },
        {
          name: "Rejoins depuis l’onglet Serveurs",
          text: "Sélectionne Jouer → Serveurs, puis choisis Cookie Build pour le rejoindre.",
        },
      ],
    },
    addServer: {
      name: "Ajouter le serveur manuellement",
      intro: "Fonctionne sur tous les appareils Bedrock avec une liste de serveurs : Android, iPhone, iPad et Windows.",
      steps: [
        {
          name: "Ouvre l’onglet Serveurs",
          text: "Lance Minecraft, sélectionne Jouer, puis ouvre l’onglet Serveurs.",
        },
        {
          name: "Sélectionne « Ajouter un serveur »",
          text: "Fais défiler la liste des serveurs jusqu’en bas et sélectionne « Ajouter un serveur ».",
        },
        {
          name: "Saisis les infos",
          text: "Nom du serveur : Cookie Build. Adresse du serveur : {address}. Port : {port}.",
        },
        {
          name: "Enregistre et rejoins",
          text: "Sélectionne Enregistrer, puis choisis Cookie Build dans la liste pour le rejoindre.",
        },
      ],
    },
  },
  java: {
    addServer: {
      name: "Ajouter un serveur",
      intro: "Enregistre Cookie Build dans ta liste de serveurs pour le rejoindre en un clic la prochaine fois.",
      steps: [
        {
          name: "Ouvre Multijoueur",
          text: "Lance Minecraft Java Edition (1.8 ou plus récent) et sélectionne Multijoueur.",
        },
        {
          name: "Sélectionne Ajouter un serveur",
          text: "Sélectionne Ajouter un serveur, saisis Cookie Build comme nom du serveur et {address} comme adresse du serveur.",
        },
        {
          name: "Rejoins Cookie Build",
          text: "Sélectionne Terminé, puis double-clique sur Cookie Build dans ta liste de serveurs (ou sélectionne-le et clique sur Rejoindre le serveur).",
        },
      ],
    },
    directConnect: {
      name: "Connexion directe",
      intro: "Pour une connexion rapide et ponctuelle, sans enregistrer le serveur.",
      steps: [
        {
          name: "Ouvre Connexion directe",
          text: "Dans le menu Multijoueur, sélectionne Connexion directe.",
        },
        {
          name: "Rejoins le serveur",
          text: "Saisis {address} et sélectionne Rejoindre le serveur.",
        },
      ],
    },
  },
  platforms: {
    playstation: {
      cardTitle: "PlayStation 4 et 5",
      cardDescription: "Rejoins avec la méthode DNS gratuite BedrockConnect ou une appli relais LAN.",
      seoTitle: "Jouer à Minecraft sur PS4/PS5 : rejoindre Cookie Build | Cookie Build",
      metaDescription: "Rejoins Cookie Build sur PS4 et PS5 : règle le DNS BedrockConnect, puis connecte-toi à play.cookie-build.com, port 19132. Guide gratuit pas à pas.",
      h1: "Comment rejoindre Cookie Build sur PS4 et PS5",
      intro: "Sur PlayStation, Minecraft n’a pas de bouton « Ajouter un serveur », seulement des serveurs partenaires. Tu peux quand même rejoindre Cookie Build en quelques minutes grâce à un changement de DNS ou à une appli relais sur le même Wi‑Fi.",
      tips: [
        "Prends une photo de tes paramètres réseau actuels avant de les modifier, pour les rétablir facilement.",
        "Dans BedrockConnect, active “Add to server list” : la prochaine fois, Cookie Build t’attend dans la liste.",
        "Si le menu BedrockConnect se ferme, accroupis-toi ou frappe pour le rouvrir.",
        "Pas de PC ? La méthode DNS ne demande que ta console.",
      ],
      faqs: [
        {
          question: "Puis-je jouer à Cookie Build sur PS5 ?",
          answer: "Oui. Sur PS4 et PS5, tu rejoins avec la méthode DNS BedrockConnect ou une appli relais LAN, puis tu joues sur le même serveur que les joueurs Java, mobile et PC.",
        },
        {
          question: "Pourquoi n’y a-t-il pas de bouton « Ajouter un serveur » sur PlayStation ?",
          answer: "Sur console, Minecraft n’affiche que les serveurs partenaires. BedrockConnect transforme l’un d’eux en menu où tu peux saisir n’importe quelle adresse, comme play.cookie-build.com avec le port 19132.",
        },
        {
          question: "BedrockConnect est-il géré par Cookie Build ?",
          answer: "Non. BedrockConnect est un projet communautaire gratuit et open source que Cookie Build n’exploite pas. Ce guide explique seulement comment l’utiliser pour accéder à notre serveur.",
        },
        {
          question: "Puis-je annuler le changement de DNS ?",
          answer: "Oui. Ouvre le même menu réseau et remets Paramètres DNS sur Automatique. Tant que le DNS personnalisé est actif, les serveurs partenaires redirigés ouvrent BedrockConnect à la place.",
        },
        {
          question: "C’est gratuit ?",
          answer: "Oui. Cookie Build est gratuit, et BedrockConnect aussi.",
        },
      ],
    },
    xbox: {
      cardTitle: "Xbox One et Series X|S",
      cardDescription: "Rejoins avec la méthode DNS gratuite BedrockConnect ou une appli relais LAN.",
      seoTitle: "Jouer à Minecraft sur Xbox : rejoindre Cookie Build | Cookie Build",
      metaDescription: "Rejoins Cookie Build sur Xbox One et Series X|S : règle le DNS BedrockConnect, puis connecte-toi à play.cookie-build.com, port 19132. Guide gratuit.",
      h1: "Comment rejoindre Cookie Build sur Xbox",
      intro: "Sur Xbox, Minecraft n’a pas de bouton « Ajouter un serveur », seulement des serveurs partenaires. Tu peux quand même rejoindre Cookie Build en quelques minutes grâce à un changement de DNS ou à une appli relais sur le même Wi‑Fi.",
      tips: [
        "Note tes paramètres DNS actuels avant de les modifier, pour les rétablir facilement.",
        "Dans BedrockConnect, active “Add to server list” : la prochaine fois, Cookie Build t’attend dans la liste.",
        "Si le menu BedrockConnect se ferme, accroupis-toi ou frappe pour le rouvrir.",
        "Pas de PC ? La méthode DNS ne demande que ta console.",
      ],
      faqs: [
        {
          question: "Ça fonctionne sur Xbox Series X et Series S ?",
          answer: "Oui. Les étapes sont les mêmes sur Xbox One, Series X et Series S.",
        },
        {
          question: "Pourquoi n’y a-t-il pas de bouton « Ajouter un serveur » sur Xbox ?",
          answer: "Sur console, Minecraft n’affiche que les serveurs partenaires. BedrockConnect transforme l’un d’eux en menu où tu peux saisir n’importe quelle adresse, comme play.cookie-build.com avec le port 19132.",
        },
        {
          question: "BedrockConnect est-il géré par Cookie Build ?",
          answer: "Non. BedrockConnect est un projet communautaire gratuit et open source que Cookie Build n’exploite pas. Ce guide explique seulement comment l’utiliser pour accéder à notre serveur.",
        },
        {
          question: "Puis-je annuler le changement de DNS ?",
          answer: "Oui. Retourne dans Paramètres → Général → Paramètres réseau → Paramètres avancés → Paramètres DNS et choisis Automatique.",
        },
      ],
    },
    switch: {
      cardTitle: "Nintendo Switch",
      cardDescription: "Rejoins avec la méthode DNS gratuite BedrockConnect.",
      seoTitle: "Jouer à Minecraft sur Switch : rejoindre Cookie Build | Cookie Build",
      metaDescription: "Rejoins Cookie Build sur Nintendo Switch : règle le DNS BedrockConnect, puis connecte-toi à play.cookie-build.com, port 19132. Guide gratuit pas à pas.",
      h1: "Comment rejoindre Cookie Build sur Nintendo Switch",
      intro: "Sur Nintendo Switch, Minecraft n’a pas de bouton « Ajouter un serveur », seulement des serveurs partenaires. Un simple changement de DNS te permet quand même de rejoindre Cookie Build.",
      tips: [
        "Prends une photo de tes paramètres réseau actuels avant de les modifier, pour les rétablir facilement.",
        "Dans BedrockConnect, active “Add to server list” : la prochaine fois, Cookie Build t’attend dans la liste.",
        "Si le menu BedrockConnect se ferme, accroupis-toi ou frappe pour le rouvrir.",
      ],
      faqs: [
        {
          question: "Puis-je jouer à Cookie Build sur Nintendo Switch ?",
          answer: "Oui. Sur Switch, tu rejoins avec la méthode DNS BedrockConnect, puis tu joues sur le même serveur que les joueurs Java, mobile et PC.",
        },
        {
          question: "Puis-je utiliser une appli LAN comme BedrockTogether ou Phantom ?",
          answer: "Pas sur Switch : la console ne détecte pas ce type de partie LAN. Utilise plutôt la méthode DNS.",
        },
        {
          question: "BedrockConnect est-il géré par Cookie Build ?",
          answer: "Non. BedrockConnect est un projet communautaire gratuit et open source que Cookie Build n’exploite pas. Ce guide explique seulement comment l’utiliser pour accéder à notre serveur.",
        },
        {
          question: "Puis-je annuler le changement de DNS ?",
          answer: "Oui. Retourne dans Paramètres de la console → Internet → Paramètres Internet → ton réseau → Modifier les paramètres et remets Paramètres DNS sur Automatique.",
        },
      ],
    },
    mobile: {
      cardTitle: "Mobile et Windows (Bedrock)",
      cardDescription: "Android, iPhone, iPad et Windows : ajoute le serveur en quelques gestes.",
      seoTitle: "Jouer à Minecraft PE (Android/iOS) : rejoindre Cookie Build | Cookie Build",
      metaDescription: "Ajoute Cookie Build à Minecraft Bedrock sur Android, iOS ou Windows : adresse play.cookie-build.com, port 19132. Bouton en un geste et étapes manuelles.",
      h1: "Comment rejoindre Cookie Build sur mobile et Windows",
      intro: "Sur Android, iPhone, iPad et Windows, Minecraft Bedrock permet d’ajouter n’importe quel serveur. Utilise le bouton en un geste ou ajoute Cookie Build manuellement.",
      tips: [
        "L’adresse et le port se saisissent dans deux champs séparés.",
        "Une fois ajouté, Cookie Build reste dans ton onglet Serveurs.",
        "Des amis sur console ? Envoie-leur le guide PlayStation, Xbox ou Switch.",
      ],
      faqs: [
        {
          question: "Quel port dois-je utiliser ?",
          answer: "Utilise le port 19132, le port par défaut de Minecraft Bedrock, avec l’adresse play.cookie-build.com.",
        },
        {
          question: "Le bouton « Ajouter à Minecraft » ne fonctionne pas. Que faire ?",
          answer: "Certains appareils ou navigateurs n’ouvrent pas les liens Minecraft. Ajoute le serveur manuellement : Jouer → Serveurs → Ajouter un serveur.",
        },
        {
          question: "Ça fonctionne sur Windows 10 et 11 ?",
          answer: "Oui. Minecraft pour Windows (Bedrock Edition) suit les mêmes étapes qu’Android et iOS.",
        },
        {
          question: "Est-ce la même chose que Minecraft PE ?",
          answer: "Oui. Minecraft Pocket Edition fait désormais partie de Minecraft Bedrock Edition. Cookie Build est né en 2014 pour la communauté Minecraft PE.",
        },
        {
          question: "Puis-je jouer avec des joueurs Java ?",
          answer: "Oui. Cookie Build est un serveur cross-play : les joueurs Java et Bedrock partagent les mêmes parties.",
        },
      ],
    },
    java: {
      cardTitle: "Java Edition (PC, Mac, Linux)",
      cardDescription: "Multijoueur → Ajouter un serveur → play.cookie-build.com.",
      seoTitle: "Jouer à Minecraft Java Edition : rejoindre Cookie Build | Cookie Build",
      metaDescription: "Rejoins Cookie Build sur Minecraft Java Edition, de la 1.8 à la dernière version : Multijoueur → Ajouter un serveur → play.cookie-build.com. Aucun port requis.",
      h1: "Comment rejoindre Cookie Build sur Java Edition",
      intro: "Cookie Build prend en charge Minecraft Java Edition de la 1.8 à la dernière version, sur Windows, macOS et Linux. L’adresse suffit.",
      tips: [
        "Aucun port requis : Java Edition utilise le port par défaut.",
        "Toutes les versions prises en charge, de la 1.8 à la dernière, fonctionnent.",
        "Tu partages les mêmes parties que les joueurs Bedrock.",
      ],
      faqs: [
        {
          question: "Quelles versions de Minecraft sont prises en charge ?",
          answer: "Les versions prises en charge vont de la 1.8 à la dernière version.",
        },
        {
          question: "Dois-je saisir un port ?",
          answer: "Non. Sur Java Edition, play.cookie-build.com suffit. Le port 19132 ne concerne que les joueurs Bedrock.",
        },
        {
          question: "Puis-je jouer avec des amis sur Bedrock ?",
          answer: "Oui. Cookie Build est un serveur cross-play : les joueurs Java et Bedrock partagent les mêmes parties.",
        },
        {
          question: "Le serveur est-il gratuit ?",
          answer: "Oui. Tous les mini-jeux de Cookie Build sont gratuits.",
        },
      ],
    },
  },
};

const de: JoinGuideSource = {
  hub: {
    seoTitle: "So trittst du Cookie Build auf jedem Gerät bei | Cookie Build",
    metaDescription: "Schritt-für-Schritt-Anleitungen für Cookie Build auf PS4/PS5, Xbox, Switch, Handy und Java. Adresse: play.cookie-build.com, Bedrock-Port 19132.",
    eyebrow: "Beitrittsanleitungen",
    h1: "So trittst du Cookie Build bei",
    intro: "Cookie Build ist ein kostenloser Minecraft-Minispiele-Server für Java und Bedrock. Wähle dein Gerät für eine Schritt-für-Schritt-Anleitung.",
    platformsHeading: "Wähle dein Gerät",
    cardCta: "Anleitung öffnen",
    addressHeading: "Serverdaten",
    addressBody: "Java-Spieler brauchen nur die Adresse. Bedrock-Spieler geben Adresse und Port in zwei getrennte Felder ein.",
  },
  ui: {
    breadcrumbLabel: "Brotkrümelnavigation",
    home: "Startseite",
    join: "Beitreten",
    addressHeading: "Serverdaten",
    bedrockAddressBody: "Gib Adresse und Port in zwei getrennte Felder ein: Minecraft Bedrock akzeptiert „Adresse:Port“ nicht in einem einzigen Feld.",
    javaAddressBody: "Die Java Edition nutzt den Standardport, du brauchst also nur die Adresse.",
    methodsHeading: "Schritt für Schritt",
    recommended: "Empfohlen",
    linksLabel: "Links",
    undoHeading: "So machst du es rückgängig",
    dnsServersHeading: "BedrockConnect-DNS-Adressen",
    primaryDnsLabel: "Primärer DNS",
    secondaryDnsLabel: "Sekundärer DNS",
    alternativeDnsLabel: "Weitere Community-DNS-Server, falls der primäre nicht funktioniert",
    dnsSource: "Quelle: BedrockConnect-README, geprüft am {date}.",
    tipsHeading: "Tipps",
    faqHeading: "Häufig gestellte Fragen",
    otherGuidesHeading: "Spielst du auf einem anderen Gerät?",
    helpHeading: "Brauchst du Hilfe?",
    helpBody: "Komm auf unseren Discord-Server: Spieler und Team helfen dir beim Verbinden.",
    discordCta: "Discord beitreten",
    backToHub: "Alle Beitrittsanleitungen",
    addToMinecraft: "Zu Minecraft hinzufügen",
    addToMinecraftNote: "Öffne diese Seite auf dem Gerät, auf dem Minecraft installiert ist. Falls nichts passiert, folge den manuellen Schritten unten.",
  },
  dns: {
    name: "BedrockConnect-DNS-Methode",
    intro: "BedrockConnect ist ein kostenloser Open-Source-Community-Dienst, der einen vorgestellten Server in ein Menü verwandelt, in das du eine beliebige Serveradresse eingeben kannst. Er wird nicht von Cookie Build betrieben.",
    configure: {
      playstation: [
        {
          name: "Netzwerkeinstellungen öffnen",
          text: "PS5: Einstellungen → Netzwerk → Einstellungen → Internetverbindung einrichten, markiere deine aktuelle Verbindung und öffne „Erweiterte Einstellungen“. PS4: Einstellungen → Netzwerk → Internetverbindung einrichten → WLAN oder LAN-Kabel → Benutzerdefiniert → dein Netzwerk, dann wähle bei „IP-Adresseinstellungen“ „Automatisch“ und bei „DHCP-Hostname“ „Nicht angeben“.",
        },
        {
          name: "DNS manuell einstellen",
          text: "Stelle „DNS-Einstellungen“ auf „Manuell“. Gib {primary} als primären DNS und {secondary} als sekundären DNS ein.",
        },
        {
          name: "Speichern und testen",
          text: "PS5: Wähle „OK“ und warte auf den Verbindungstest. PS4: Wähle bei „MTU-Einstellungen“ „Automatisch“ und bei „Proxy-Server“ „Nicht verwenden“, dann teste die Verbindung.",
        },
      ],
      xbox: [
        {
          name: "Netzwerkeinstellungen öffnen",
          text: "Geh zu Einstellungen → Allgemein → Netzwerkeinstellungen → Erweiterte Einstellungen → DNS-Einstellungen und wähle „Manuell“.",
        },
        {
          name: "DNS-Adressen eingeben",
          text: "Gib {primary} als primären IPv4-DNS und {secondary} als sekundären IPv4-DNS ein.",
        },
        {
          name: "Speichern",
          text: "Bestätige die Adressen und kehre zum Bildschirm mit den Netzwerkeinstellungen zurück.",
        },
      ],
      switch: [
        {
          name: "Netzwerkeinstellungen öffnen",
          text: "Geh zu Systemeinstellungen → Internet → Interneteinstellungen, wähle dein Netzwerk und dann „Einstellungen ändern“.",
        },
        {
          name: "DNS manuell einstellen",
          text: "Stelle „DNS-Einstellungen“ auf „Manuell“. Gib {primary} als primären DNS und {secondary} als sekundären DNS ein.",
        },
        {
          name: "Speichern und testen",
          text: "Wähle „Speichern“ und teste dann die Verbindung.",
        },
      ],
    },
    play: [
      {
        name: "Server-Tab öffnen",
        text: "Starte Minecraft, wähle „Spielen“ und öffne den Tab „Server“.",
      },
      {
        name: "Einem vorgestellten Server beitreten",
        text: "Tritt einem der vorgestellten Server bei, die BedrockConnect umleiten kann ({featured}). Statt dieses Servers öffnet sich die Serverliste von BedrockConnect.",
      },
      {
        name: "„Connect to a Server“ wählen",
        text: "Wähle im BedrockConnect-Menü (immer auf Englisch) „Connect to a Server“.",
      },
      {
        name: "Daten von Cookie Build eingeben",
        text: "Gib {address} bei „Server Address“ und {port} bei „Server Port“ ein. Aktiviere „Add to server list“, damit du Cookie Build beim nächsten Mal in der Liste findest.",
      },
      {
        name: "Cookie Build beitreten",
        text: "Sende das Formular ab: BedrockConnect leitet dich direkt zu Cookie Build weiter.",
      },
    ],
    note: "Solange der eigene DNS aktiv ist, öffnen die umgeleiteten vorgestellten Server stattdessen BedrockConnect. Falls {primary} nicht funktioniert, probiere einen der anderen Community-DNS-Server unten.",
    undo: {
      playstation: "Öffne dasselbe Netzwerkmenü und stelle „DNS-Einstellungen“ wieder auf „Automatisch“. Auf der PS4 kannst du auch „Internetverbindung einrichten“ erneut ausführen und „Einfach“ wählen.",
      xbox: "Geh zu Einstellungen → Allgemein → Netzwerkeinstellungen → Erweiterte Einstellungen → DNS-Einstellungen und wähle „Automatisch“.",
      switch: "Geh zu Systemeinstellungen → Internet → Interneteinstellungen → dein Netzwerk → Einstellungen ändern und stelle „DNS-Einstellungen“ wieder auf „Automatisch“.",
    },
  },
  lan: {
    name: "LAN-Hilfs-App (gleiches WLAN)",
    intro: "Ein Handy oder Computer im selben Netzwerk wie deine Konsole kann Cookie Build als lokales Spiel (LAN) erscheinen lassen.",
    steps: [
      {
        name: "Dasselbe Netzwerk nutzen",
        text: "Verbinde dein Handy oder deinen Computer mit demselben WLAN bzw. Heimnetzwerk wie deine Konsole.",
      },
      {
        name: "Auf dem Handy: BedrockTogether",
        text: "Installiere BedrockTogether auf Android oder iOS, gib {address} und Port {port} ein und tippe auf „Run“.",
      },
      {
        name: "Oder am Computer: Phantom",
        text: "Lade Phantom unter Windows, macOS oder Linux herunter und starte es mit -server {address}:{port}. Erlaube den Zugriff in deiner Firewall, falls du gefragt wirst.",
      },
      {
        name: "Über die Konsole beitreten",
        text: "Öffne Minecraft auf deiner Konsole: Cookie Build erscheint als LAN-Spiel im Tab „Welten“ (in manchen Versionen im Tab „Freunde“). Wähle es aus, um beizutreten.",
      },
      {
        name: "Hilfsprogramm geöffnet lassen",
        text: "Lass die App oder das Programm geöffnet, während du dich verbindest. Phantom leitet deine Verbindung weiter, lass es also laufen, solange du spielst.",
      },
    ],
    note: "BedrockTogether und Phantom sind Tools von Drittanbietern. Sie werden nicht von Cookie Build betrieben.",
  },
  mobile: {
    oneTap: {
      name: "Ein-Tipp-Button",
      intro: "Der schnellste Weg auf Handy, Tablet oder Windows-PC mit installiertem Minecraft.",
      steps: [
        {
          name: "Auf „Zu Minecraft hinzufügen“ tippen",
          text: "Öffne diese Seite auf deinem Gerät und tippe oben auf den Button „Zu Minecraft hinzufügen“.",
        },
        {
          name: "Minecraft öffnen lassen",
          text: "Wenn dein Gerät Minecraft-Links unterstützt, öffnet sich Minecraft und fügt Cookie Build zu deinen Servern hinzu.",
        },
        {
          name: "Über den Server-Tab beitreten",
          text: "Wähle Spielen → Server und dann Cookie Build, um beizutreten.",
        },
      ],
    },
    addServer: {
      name: "Server manuell hinzufügen",
      intro: "Funktioniert auf jedem Bedrock-Gerät mit Serverliste: Android, iPhone, iPad und Windows.",
      steps: [
        {
          name: "Server-Tab öffnen",
          text: "Starte Minecraft, wähle „Spielen“ und öffne den Tab „Server“.",
        },
        {
          name: "„Server hinzufügen“ wählen",
          text: "Scrolle ans Ende der Serverliste und wähle „Server hinzufügen“.",
        },
        {
          name: "Daten eingeben",
          text: "Servername: Cookie Build. Serveradresse: {address}. Port: {port}.",
        },
        {
          name: "Speichern und beitreten",
          text: "Wähle „Speichern“ und dann Cookie Build in der Liste, um beizutreten.",
        },
      ],
    },
  },
  java: {
    addServer: {
      name: "Server hinzufügen",
      intro: "Speichert Cookie Build in deiner Serverliste, damit du beim nächsten Mal mit einem Klick beitreten kannst.",
      steps: [
        {
          name: "Mehrspieler öffnen",
          text: "Starte Minecraft Java Edition (1.8 oder neuer) und wähle „Mehrspieler“.",
        },
        {
          name: "„Server hinzufügen“ wählen",
          text: "Wähle „Server hinzufügen“, gib Cookie Build als Servernamen und {address} als Serveradresse ein.",
        },
        {
          name: "Cookie Build beitreten",
          text: "Wähle „Fertig“ und doppelklicke dann in deiner Serverliste auf Cookie Build (oder wähle es aus und klicke auf „Server beitreten“).",
        },
      ],
    },
    directConnect: {
      name: "Direktverbindung",
      intro: "Für eine schnelle, einmalige Verbindung, ohne den Server zu speichern.",
      steps: [
        {
          name: "Direktverbindung öffnen",
          text: "Wähle im Mehrspieler-Menü „Direktverbindung“.",
        },
        {
          name: "Dem Server beitreten",
          text: "Gib {address} ein und wähle „Server beitreten“.",
        },
      ],
    },
  },
  platforms: {
    playstation: {
      cardTitle: "PlayStation 4 & 5",
      cardDescription: "Tritt mit der kostenlosen BedrockConnect-DNS-Methode oder einer LAN-Hilfs-App bei.",
      seoTitle: "Minecraft auf PS4/PS5: Cookie Build beitreten | Cookie Build",
      metaDescription: "Cookie Build auf PS4 und PS5: Stelle den BedrockConnect-DNS ein und verbinde dich mit play.cookie-build.com, Port 19132. Kostenlose Anleitung.",
      h1: "So trittst du Cookie Build auf PS4 und PS5 bei",
      intro: "Minecraft auf der PlayStation hat keinen „Server hinzufügen“-Button, nur vorgestellte Server. Trotzdem kannst du Cookie Build in wenigen Minuten beitreten – per DNS-Änderung oder mit einer Hilfs-App im selben WLAN.",
      tips: [
        "Mach vor der Änderung ein Foto deiner aktuellen Netzwerkeinstellungen, damit du sie leicht wiederherstellen kannst.",
        "Aktiviere in BedrockConnect „Add to server list“: Beim nächsten Mal wartet Cookie Build schon in der Liste.",
        "Wenn sich das BedrockConnect-Menü schließt, schleiche oder schlage, um es wieder zu öffnen.",
        "Kein PC? Für die DNS-Methode brauchst du nur deine Konsole.",
      ],
      faqs: [
        {
          question: "Kann ich Cookie Build auf der PS5 spielen?",
          answer: "Ja. Spieler auf PS4 und PS5 treten mit der BedrockConnect-DNS-Methode oder einer LAN-Hilfs-App bei und spielen dann auf demselben Server wie Java-, Handy- und PC-Spieler.",
        },
        {
          question: "Warum gibt es auf der PlayStation keinen „Server hinzufügen“-Button?",
          answer: "Minecraft zeigt auf Konsolen nur vorgestellte Server an. BedrockConnect verwandelt einen davon in ein Menü, in das du eine beliebige Adresse eingeben kannst, zum Beispiel play.cookie-build.com mit Port 19132.",
        },
        {
          question: "Wird BedrockConnect von Cookie Build betrieben?",
          answer: "Nein. BedrockConnect ist ein kostenloses Open-Source-Community-Projekt, das Cookie Build nicht betreibt. Diese Anleitung erklärt nur, wie du damit unseren Server erreichst.",
        },
        {
          question: "Kann ich die DNS-Änderung rückgängig machen?",
          answer: "Ja. Öffne dasselbe Netzwerkmenü und stelle „DNS-Einstellungen“ wieder auf „Automatisch“. Solange der eigene DNS aktiv ist, öffnen die umgeleiteten vorgestellten Server stattdessen BedrockConnect.",
        },
        {
          question: "Ist das kostenlos?",
          answer: "Ja. Cookie Build ist kostenlos spielbar, und BedrockConnect ist ebenfalls kostenlos.",
        },
      ],
    },
    xbox: {
      cardTitle: "Xbox One & Series X|S",
      cardDescription: "Tritt mit der kostenlosen BedrockConnect-DNS-Methode oder einer LAN-Hilfs-App bei.",
      seoTitle: "Minecraft auf Xbox: Cookie Build beitreten | Cookie Build",
      metaDescription: "Cookie Build auf Xbox One und Series X|S: Stelle den BedrockConnect-DNS ein und verbinde dich mit play.cookie-build.com, Port 19132. Kostenlos.",
      h1: "So trittst du Cookie Build auf der Xbox bei",
      intro: "Minecraft auf der Xbox hat keinen „Server hinzufügen“-Button, nur vorgestellte Server. Trotzdem kannst du Cookie Build in wenigen Minuten beitreten – per DNS-Änderung oder mit einer Hilfs-App im selben WLAN.",
      tips: [
        "Notiere dir vor der Änderung deine aktuellen DNS-Einstellungen, damit du sie leicht wiederherstellen kannst.",
        "Aktiviere in BedrockConnect „Add to server list“: Beim nächsten Mal wartet Cookie Build schon in der Liste.",
        "Wenn sich das BedrockConnect-Menü schließt, schleiche oder schlage, um es wieder zu öffnen.",
        "Kein PC? Für die DNS-Methode brauchst du nur deine Konsole.",
      ],
      faqs: [
        {
          question: "Funktioniert das auf Xbox Series X und Series S?",
          answer: "Ja. Die Schritte sind auf Xbox One, Series X und Series S identisch.",
        },
        {
          question: "Warum gibt es auf der Xbox keinen „Server hinzufügen“-Button?",
          answer: "Minecraft zeigt auf Konsolen nur vorgestellte Server an. BedrockConnect verwandelt einen davon in ein Menü, in das du eine beliebige Adresse eingeben kannst, zum Beispiel play.cookie-build.com mit Port 19132.",
        },
        {
          question: "Wird BedrockConnect von Cookie Build betrieben?",
          answer: "Nein. BedrockConnect ist ein kostenloses Open-Source-Community-Projekt, das Cookie Build nicht betreibt. Diese Anleitung erklärt nur, wie du damit unseren Server erreichst.",
        },
        {
          question: "Kann ich die DNS-Änderung rückgängig machen?",
          answer: "Ja. Geh zurück zu Einstellungen → Allgemein → Netzwerkeinstellungen → Erweiterte Einstellungen → DNS-Einstellungen und wähle „Automatisch“.",
        },
      ],
    },
    switch: {
      cardTitle: "Nintendo Switch",
      cardDescription: "Tritt mit der kostenlosen BedrockConnect-DNS-Methode bei.",
      seoTitle: "Minecraft auf der Switch: Cookie Build beitreten | Cookie Build",
      metaDescription: "Cookie Build auf der Nintendo Switch: Stelle den BedrockConnect-DNS ein und verbinde dich mit play.cookie-build.com, Port 19132. Kostenlos.",
      h1: "So trittst du Cookie Build auf der Nintendo Switch bei",
      intro: "Minecraft auf der Nintendo Switch hat keinen „Server hinzufügen“-Button, nur vorgestellte Server. Mit einer schnellen DNS-Änderung kannst du Cookie Build trotzdem beitreten.",
      tips: [
        "Mach vor der Änderung ein Foto deiner aktuellen Netzwerkeinstellungen, damit du sie leicht wiederherstellen kannst.",
        "Aktiviere in BedrockConnect „Add to server list“: Beim nächsten Mal wartet Cookie Build schon in der Liste.",
        "Wenn sich das BedrockConnect-Menü schließt, schleiche oder schlage, um es wieder zu öffnen.",
      ],
      faqs: [
        {
          question: "Kann ich Cookie Build auf der Nintendo Switch spielen?",
          answer: "Ja. Switch-Spieler treten mit der BedrockConnect-DNS-Methode bei und spielen dann auf demselben Server wie Java-, Handy- und PC-Spieler.",
        },
        {
          question: "Kann ich eine LAN-App wie BedrockTogether oder Phantom nutzen?",
          answer: "Nicht auf der Switch: Sie erkennt diese Art von LAN-Spiel nicht. Nutze stattdessen die DNS-Methode.",
        },
        {
          question: "Wird BedrockConnect von Cookie Build betrieben?",
          answer: "Nein. BedrockConnect ist ein kostenloses Open-Source-Community-Projekt, das Cookie Build nicht betreibt. Diese Anleitung erklärt nur, wie du damit unseren Server erreichst.",
        },
        {
          question: "Kann ich die DNS-Änderung rückgängig machen?",
          answer: "Ja. Geh zurück zu Systemeinstellungen → Internet → Interneteinstellungen → dein Netzwerk → Einstellungen ändern und stelle „DNS-Einstellungen“ auf „Automatisch“.",
        },
      ],
    },
    mobile: {
      cardTitle: "Handy & Windows (Bedrock)",
      cardDescription: "Android, iPhone, iPad und Windows: Füge den Server mit wenigen Tipps hinzu.",
      seoTitle: "Cookie Build in Minecraft PE (Android/iOS) beitreten | Cookie Build",
      metaDescription: "Füge Cookie Build in Minecraft Bedrock auf Android, iOS oder Windows hinzu: Adresse play.cookie-build.com, Port 19132. Ein-Tipp-Button und Anleitung.",
      h1: "So trittst du Cookie Build auf Handy und Windows bei",
      intro: "Auf Android, iPhone, iPad und Windows kannst du in Minecraft Bedrock jeden beliebigen Server hinzufügen. Nutze den Ein-Tipp-Button oder füge Cookie Build manuell hinzu.",
      tips: [
        "Adresse und Port gehören in zwei getrennte Felder.",
        "Einmal hinzugefügt, bleibt Cookie Build in deinem Server-Tab.",
        "Freunde auf Konsole? Schick ihnen die Anleitung für PlayStation, Xbox oder Switch.",
      ],
      faqs: [
        {
          question: "Welchen Port soll ich verwenden?",
          answer: "Verwende Port 19132, den Standardport von Minecraft Bedrock, mit der Adresse play.cookie-build.com.",
        },
        {
          question: "Der Button „Zu Minecraft hinzufügen“ funktioniert nicht. Was kann ich tun?",
          answer: "Manche Geräte oder Browser öffnen keine Minecraft-Links. Füge den Server manuell hinzu: Spielen → Server → Server hinzufügen.",
        },
        {
          question: "Funktioniert das unter Windows 10 und 11?",
          answer: "Ja. Minecraft für Windows (Bedrock Edition) nutzt dieselben Schritte wie Android und iOS.",
        },
        {
          question: "Ist das dasselbe wie Minecraft PE?",
          answer: "Ja. Minecraft Pocket Edition ist heute Teil von Minecraft Bedrock Edition. Cookie Build begann 2014 für die Minecraft-PE-Community.",
        },
        {
          question: "Kann ich mit Java-Spielern spielen?",
          answer: "Ja. Cookie Build ist ein Crossplay-Server: Java- und Bedrock-Spieler spielen dieselben Spiele zusammen.",
        },
      ],
    },
    java: {
      cardTitle: "Java Edition (PC, Mac, Linux)",
      cardDescription: "Mehrspieler → Server hinzufügen → play.cookie-build.com.",
      seoTitle: "Cookie Build in Minecraft Java Edition beitreten | Cookie Build",
      metaDescription: "Tritt Cookie Build in Minecraft Java Edition bei, von 1.8 bis zur neuesten Version: Mehrspieler → Server hinzufügen → play.cookie-build.com. Ohne Port.",
      h1: "So trittst du Cookie Build mit der Java Edition bei",
      intro: "Cookie Build unterstützt Minecraft Java Edition von 1.8 bis zur neuesten Version unter Windows, macOS und Linux. Du brauchst nur die Adresse.",
      tips: [
        "Kein Port nötig: Die Java Edition nutzt den Standardport.",
        "Jede unterstützte Version von 1.8 bis zur neuesten funktioniert.",
        "Du spielst dieselben Spiele wie Bedrock-Spieler.",
      ],
      faqs: [
        {
          question: "Welche Minecraft-Versionen werden unterstützt?",
          answer: "Unterstützt werden Versionen von 1.8 bis zur neuesten Version.",
        },
        {
          question: "Muss ich einen Port eingeben?",
          answer: "Nein. In der Java Edition reicht play.cookie-build.com. Port 19132 ist nur für Bedrock-Spieler.",
        },
        {
          question: "Kann ich mit Freunden auf Bedrock spielen?",
          answer: "Ja. Cookie Build ist ein Crossplay-Server: Java- und Bedrock-Spieler spielen dieselben Spiele zusammen.",
        },
        {
          question: "Ist der Server kostenlos?",
          answer: "Ja. Alle Minispiele auf Cookie Build sind kostenlos spielbar.",
        },
      ],
    },
  },
};

const it: JoinGuideSource = {
  hub: {
    seoTitle: "Come entrare su Cookie Build da qualsiasi dispositivo | Cookie Build",
    metaDescription: "Guide passo passo per entrare su Cookie Build da PS4/PS5, Xbox, Switch, mobile e Java. Indirizzo: play.cookie-build.com, porta Bedrock 19132.",
    eyebrow: "Guide per entrare",
    h1: "Come entrare su Cookie Build",
    intro: "Cookie Build è un server Minecraft di minigiochi gratuito per Java e Bedrock. Scegli il tuo dispositivo per la guida passo passo.",
    platformsHeading: "Scegli il tuo dispositivo",
    cardCta: "Apri la guida",
    addressHeading: "Dati del server",
    addressBody: "Su Java ti basta l’indirizzo. Su Bedrock inserisci l’indirizzo e la porta in due campi separati.",
  },
  ui: {
    breadcrumbLabel: "Percorso di navigazione",
    home: "Home",
    join: "Come entrare",
    addressHeading: "Dati del server",
    bedrockAddressBody: "Inserisci l’indirizzo e la porta in due campi separati: Minecraft Bedrock non accetta “indirizzo:porta” in un unico campo.",
    javaAddressBody: "La Java Edition usa la porta predefinita, quindi ti basta l’indirizzo.",
    methodsHeading: "Passo passo",
    recommended: "Consigliato",
    linksLabel: "Link",
    undoHeading: "Come annullare la modifica",
    dnsServersHeading: "Indirizzi DNS di BedrockConnect",
    primaryDnsLabel: "DNS primario",
    secondaryDnsLabel: "DNS secondario",
    alternativeDnsLabel: "Altri server DNS della community da provare se quello primario non funziona",
    dnsSource: "Fonte: README di BedrockConnect, verificato il {date}.",
    tipsHeading: "Consigli",
    faqHeading: "Domande frequenti",
    otherGuidesHeading: "Giochi da un altro dispositivo?",
    helpHeading: "Hai bisogno di aiuto?",
    helpBody: "Entra nel nostro server Discord: giocatori e staff possono aiutarti a connetterti.",
    discordCta: "Entra su Discord",
    backToHub: "Tutte le guide per entrare",
    addToMinecraft: "Aggiungi a Minecraft",
    addToMinecraftNote: "Apri questa pagina sul dispositivo su cui è installato Minecraft. Se non succede nulla, segui i passaggi manuali qui sotto.",
  },
  dns: {
    name: "Metodo DNS BedrockConnect",
    intro: "BedrockConnect è un servizio della community gratuito e open source che trasforma un server in evidenza in un menu dove puoi digitare l’indirizzo di qualsiasi server. Non è gestito da Cookie Build.",
    configure: {
      playstation: [
        {
          name: "Apri le impostazioni di rete",
          text: "PS5: Impostazioni → Rete → Impostazioni → Configura connessione Internet, evidenzia la connessione attuale e apri Impostazioni avanzate. PS4: Impostazioni → Rete → Configura connessione Internet → Wi‑Fi o cavo LAN → Personalizzata → la tua rete, poi scegli Automatiche per le Impostazioni indirizzo IP e Non specificare per il Nome host DHCP.",
        },
        {
          name: "Imposta un DNS manuale",
          text: "Imposta le Impostazioni DNS su Manuale. Inserisci {primary} come DNS primario e {secondary} come DNS secondario.",
        },
        {
          name: "Salva e prova",
          text: "PS5: seleziona OK e attendi il test della connessione. PS4: scegli Automatiche per le Impostazioni MTU e Non usare per il Server proxy, poi prova la connessione.",
        },
      ],
      xbox: [
        {
          name: "Apri le impostazioni di rete",
          text: "Vai in Impostazioni → Generale → Impostazioni di rete → Impostazioni avanzate → Impostazioni DNS e scegli Manuale.",
        },
        {
          name: "Inserisci gli indirizzi DNS",
          text: "Inserisci {primary} come DNS IPv4 primario e {secondary} come DNS IPv4 secondario.",
        },
        {
          name: "Salva",
          text: "Conferma gli indirizzi e torna alla schermata delle impostazioni di rete.",
        },
      ],
      switch: [
        {
          name: "Apri le impostazioni di rete",
          text: "Vai in Impostazioni della console → Internet → Impostazioni Internet, seleziona la tua rete, poi scegli Modifica impostazioni.",
        },
        {
          name: "Imposta un DNS manuale",
          text: "Imposta le Impostazioni DNS su Manuale. Inserisci {primary} come DNS primario e {secondary} come DNS secondario.",
        },
        {
          name: "Salva e prova",
          text: "Seleziona Salva, poi prova la connessione.",
        },
      ],
    },
    play: [
      {
        name: "Apri la scheda Server",
        text: "Avvia Minecraft, seleziona Gioca, poi apri la scheda Server.",
      },
      {
        name: "Entra in un server in evidenza",
        text: "Entra in uno dei server in evidenza che BedrockConnect può reindirizzare ({featured}). Al posto di quel server si apre l’elenco dei server di BedrockConnect.",
      },
      {
        name: "Scegli “Connect to a Server”",
        text: "Nel menu di BedrockConnect (sempre in inglese), seleziona “Connect to a Server”.",
      },
      {
        name: "Inserisci i dati di Cookie Build",
        text: "Digita {address} in “Server Address” e {port} in “Server Port”. Attiva “Add to server list” per ritrovare Cookie Build nell’elenco la prossima volta.",
      },
      {
        name: "Entra in Cookie Build",
        text: "Invia il modulo: BedrockConnect ti trasferisce direttamente su Cookie Build.",
      },
    ],
    note: "Finché il DNS personalizzato è attivo, i server in evidenza reindirizzati aprono BedrockConnect. Se {primary} non funziona, prova uno degli altri server DNS della community elencati qui sotto.",
    undo: {
      playstation: "Apri lo stesso menu di rete e reimposta le Impostazioni DNS su Automatiche. Su PS4 puoi anche rifare Configura connessione Internet e scegliere Facile.",
      xbox: "Vai in Impostazioni → Generale → Impostazioni di rete → Impostazioni avanzate → Impostazioni DNS e scegli Automatico.",
      switch: "Vai in Impostazioni della console → Internet → Impostazioni Internet → la tua rete → Modifica impostazioni e reimposta le Impostazioni DNS su Automatiche.",
    },
  },
  lan: {
    name: "App di supporto LAN (stesso Wi‑Fi)",
    intro: "Un telefono o un computer sulla stessa rete della tua console può far comparire Cookie Build come partita locale (LAN).",
    steps: [
      {
        name: "Usa la stessa rete",
        text: "Collega il telefono o il computer allo stesso Wi‑Fi o alla stessa rete di casa della console.",
      },
      {
        name: "Su telefono: BedrockTogether",
        text: "Su Android o iOS, installa BedrockTogether, inserisci {address} e la porta {port}, poi tocca “Run”.",
      },
      {
        name: "Oppure su computer: Phantom",
        text: "Su Windows, macOS o Linux, scarica Phantom e avvialo con -server {address}:{port}. Se richiesto, consentilo nel firewall.",
      },
      {
        name: "Entra dalla console",
        text: "Apri Minecraft sulla console: Cookie Build compare come partita LAN nella scheda Mondi (la scheda Amici in alcune versioni). Selezionalo per entrare.",
      },
      {
        name: "Tieni aperta l’app di supporto",
        text: "Tieni aperta l’app o il programma mentre ti connetti. Phantom fa da ponte per la tua connessione, quindi lascialo attivo mentre giochi.",
      },
    ],
    note: "BedrockTogether e Phantom sono strumenti di terze parti. Non sono gestiti da Cookie Build.",
  },
  mobile: {
    oneTap: {
      name: "Pulsante con un tocco",
      intro: "Il modo più rapido su telefono, tablet o PC Windows con Minecraft installato.",
      steps: [
        {
          name: "Tocca “Aggiungi a Minecraft”",
          text: "Apri questa pagina sul tuo dispositivo e tocca il pulsante “Aggiungi a Minecraft” qui sopra.",
        },
        {
          name: "Lascia che Minecraft si apra",
          text: "Se il tuo dispositivo supporta i link Minecraft, Minecraft si apre e aggiunge Cookie Build ai tuoi server.",
        },
        {
          name: "Entra dalla scheda Server",
          text: "Seleziona Gioca → Server, poi scegli Cookie Build per entrare.",
        },
      ],
    },
    addServer: {
      name: "Aggiungi il server manualmente",
      intro: "Funziona su ogni dispositivo Bedrock con un elenco di server: Android, iPhone, iPad e Windows.",
      steps: [
        {
          name: "Apri la scheda Server",
          text: "Avvia Minecraft, seleziona Gioca, poi apri la scheda Server.",
        },
        {
          name: "Seleziona “Aggiungi server”",
          text: "Scorri fino in fondo all’elenco dei server e seleziona “Aggiungi server”.",
        },
        {
          name: "Inserisci i dati",
          text: "Nome server: Cookie Build. Indirizzo server: {address}. Porta: {port}.",
        },
        {
          name: "Salva ed entra",
          text: "Seleziona Salva, poi scegli Cookie Build nell’elenco per entrare.",
        },
      ],
    },
  },
  java: {
    addServer: {
      name: "Aggiungi server",
      intro: "Salva Cookie Build nel tuo elenco di server, così la prossima volta entri con un clic.",
      steps: [
        {
          name: "Apri Multigiocatore",
          text: "Avvia Minecraft Java Edition (1.8 o successiva) e seleziona Multigiocatore.",
        },
        {
          name: "Seleziona Aggiungi server",
          text: "Seleziona Aggiungi server, scrivi Cookie Build come nome del server e {address} come indirizzo del server.",
        },
        {
          name: "Entra in Cookie Build",
          text: "Seleziona Fatto, poi fai doppio clic su Cookie Build nell’elenco dei server (oppure selezionalo e clicca su Entra nel server).",
        },
      ],
    },
    directConnect: {
      name: "Connessione diretta",
      intro: "Per connetterti al volo una sola volta, senza salvare il server.",
      steps: [
        {
          name: "Apri Connessione diretta",
          text: "Nel menu Multigiocatore, seleziona Connessione diretta.",
        },
        {
          name: "Entra nel server",
          text: "Digita {address} e seleziona Entra nel server.",
        },
      ],
    },
  },
  platforms: {
    playstation: {
      cardTitle: "PlayStation 4 e 5",
      cardDescription: "Entra con il metodo DNS gratuito BedrockConnect o con un’app di supporto LAN.",
      seoTitle: "Minecraft su PS4/PS5: entra su Cookie Build | Cookie Build",
      metaDescription: "Entra su Cookie Build da PS4 e PS5: imposta il DNS BedrockConnect, poi connettiti a play.cookie-build.com sulla porta 19132. Guida gratuita.",
      h1: "Come entrare su Cookie Build da PS4 e PS5",
      intro: "Minecraft su PlayStation non ha il pulsante “Aggiungi server”, solo i server in evidenza. Puoi comunque entrare su Cookie Build in pochi minuti cambiando il DNS o con un’app di supporto sullo stesso Wi‑Fi.",
      tips: [
        "Fai una foto delle impostazioni di rete attuali prima di cambiarle, così potrai ripristinarle facilmente.",
        "In BedrockConnect, attiva “Add to server list”: la prossima volta troverai Cookie Build nell’elenco.",
        "Se il menu di BedrockConnect si chiude, accovacciati o dai un pugno per riaprirlo.",
        "Non hai un PC? Per il metodo DNS ti basta la console.",
      ],
      faqs: [
        {
          question: "Posso giocare su Cookie Build da PS5?",
          answer: "Sì. Su PS4 e PS5 entri con il metodo DNS BedrockConnect o con un’app di supporto LAN, e giochi sullo stesso server dei giocatori Java, mobile e PC.",
        },
        {
          question: "Perché su PlayStation non c’è il pulsante “Aggiungi server”?",
          answer: "Su console Minecraft mostra solo i server in evidenza. BedrockConnect ne trasforma uno in un menu dove puoi digitare qualsiasi indirizzo, come play.cookie-build.com con la porta 19132.",
        },
        {
          question: "BedrockConnect è gestito da Cookie Build?",
          answer: "No. BedrockConnect è un progetto della community gratuito e open source, non gestito da Cookie Build. Questa guida spiega solo come usarlo per raggiungere il nostro server.",
        },
        {
          question: "Posso annullare la modifica del DNS?",
          answer: "Sì. Apri lo stesso menu di rete e reimposta le Impostazioni DNS su Automatiche. Finché il DNS personalizzato è attivo, i server in evidenza reindirizzati aprono BedrockConnect.",
        },
        {
          question: "È gratis?",
          answer: "Sì. Cookie Build è gratuito, e anche BedrockConnect lo è.",
        },
      ],
    },
    xbox: {
      cardTitle: "Xbox One e Series X|S",
      cardDescription: "Entra con il metodo DNS gratuito BedrockConnect o con un’app di supporto LAN.",
      seoTitle: "Minecraft su Xbox: entra su Cookie Build | Cookie Build",
      metaDescription: "Entra su Cookie Build da Xbox One e Series X|S: imposta il DNS BedrockConnect, poi connettiti a play.cookie-build.com sulla porta 19132. Guida gratuita.",
      h1: "Come entrare su Cookie Build da Xbox",
      intro: "Minecraft su Xbox non ha il pulsante “Aggiungi server”, solo i server in evidenza. Puoi comunque entrare su Cookie Build in pochi minuti cambiando il DNS o con un’app di supporto sullo stesso Wi‑Fi.",
      tips: [
        "Annota le impostazioni DNS attuali prima di cambiarle, così potrai ripristinarle facilmente.",
        "In BedrockConnect, attiva “Add to server list”: la prossima volta troverai Cookie Build nell’elenco.",
        "Se il menu di BedrockConnect si chiude, accovacciati o dai un pugno per riaprirlo.",
        "Non hai un PC? Per il metodo DNS ti basta la console.",
      ],
      faqs: [
        {
          question: "Funziona su Xbox Series X e Series S?",
          answer: "Sì. I passaggi sono gli stessi su Xbox One, Series X e Series S.",
        },
        {
          question: "Perché su Xbox non c’è il pulsante “Aggiungi server”?",
          answer: "Su console Minecraft mostra solo i server in evidenza. BedrockConnect ne trasforma uno in un menu dove puoi digitare qualsiasi indirizzo, come play.cookie-build.com con la porta 19132.",
        },
        {
          question: "BedrockConnect è gestito da Cookie Build?",
          answer: "No. BedrockConnect è un progetto della community gratuito e open source, non gestito da Cookie Build. Questa guida spiega solo come usarlo per raggiungere il nostro server.",
        },
        {
          question: "Posso annullare la modifica del DNS?",
          answer: "Sì. Torna in Impostazioni → Generale → Impostazioni di rete → Impostazioni avanzate → Impostazioni DNS e scegli Automatico.",
        },
      ],
    },
    switch: {
      cardTitle: "Nintendo Switch",
      cardDescription: "Entra con il metodo DNS gratuito BedrockConnect.",
      seoTitle: "Minecraft su Switch: entra su Cookie Build | Cookie Build",
      metaDescription: "Entra su Cookie Build da Nintendo Switch: imposta il DNS BedrockConnect, poi connettiti a play.cookie-build.com sulla porta 19132. Guida gratuita.",
      h1: "Come entrare su Cookie Build da Nintendo Switch",
      intro: "Minecraft su Nintendo Switch non ha il pulsante “Aggiungi server”, solo i server in evidenza. Con una rapida modifica del DNS puoi comunque entrare su Cookie Build.",
      tips: [
        "Fai una foto delle impostazioni di rete attuali prima di cambiarle, così potrai ripristinarle facilmente.",
        "In BedrockConnect, attiva “Add to server list”: la prossima volta troverai Cookie Build nell’elenco.",
        "Se il menu di BedrockConnect si chiude, accovacciati o dai un pugno per riaprirlo.",
      ],
      faqs: [
        {
          question: "Posso giocare su Cookie Build da Nintendo Switch?",
          answer: "Sì. Su Switch entri con il metodo DNS BedrockConnect e giochi sullo stesso server dei giocatori Java, mobile e PC.",
        },
        {
          question: "Posso usare un’app LAN come BedrockTogether o Phantom?",
          answer: "Non su Switch: la Switch non vede questo tipo di partita LAN. Usa invece il metodo DNS.",
        },
        {
          question: "BedrockConnect è gestito da Cookie Build?",
          answer: "No. BedrockConnect è un progetto della community gratuito e open source, non gestito da Cookie Build. Questa guida spiega solo come usarlo per raggiungere il nostro server.",
        },
        {
          question: "Posso annullare la modifica del DNS?",
          answer: "Sì. Torna in Impostazioni della console → Internet → Impostazioni Internet → la tua rete → Modifica impostazioni e reimposta le Impostazioni DNS su Automatiche.",
        },
      ],
    },
    mobile: {
      cardTitle: "Mobile e Windows (Bedrock)",
      cardDescription: "Android, iPhone, iPad e Windows: aggiungi il server in pochi tocchi.",
      seoTitle: "Entra su Cookie Build da Minecraft PE (Android/iOS) | Cookie Build",
      metaDescription: "Aggiungi Cookie Build a Minecraft Bedrock su Android, iOS o Windows: indirizzo play.cookie-build.com, porta 19132. Pulsante rapido e passaggi manuali.",
      h1: "Come entrare su Cookie Build da mobile e Windows",
      intro: "Su Android, iPhone, iPad e Windows, Minecraft Bedrock ti permette di aggiungere qualsiasi server. Usa il pulsante con un tocco o aggiungi Cookie Build manualmente.",
      tips: [
        "L’indirizzo e la porta vanno in due campi separati.",
        "Una volta aggiunto, Cookie Build resta nella scheda Server.",
        "Hai amici su console? Mandagli la guida per PlayStation, Xbox o Switch.",
      ],
      faqs: [
        {
          question: "Quale porta devo usare?",
          answer: "Usa la porta 19132, quella predefinita di Minecraft Bedrock, con l’indirizzo play.cookie-build.com.",
        },
        {
          question: "Il pulsante “Aggiungi a Minecraft” non funziona. Cosa posso fare?",
          answer: "Alcuni dispositivi o browser non aprono i link Minecraft. Aggiungi il server manualmente: Gioca → Server → Aggiungi server.",
        },
        {
          question: "Funziona su Windows 10 e 11?",
          answer: "Sì. Minecraft per Windows (Bedrock Edition) segue gli stessi passaggi di Android e iOS.",
        },
        {
          question: "È lo stesso di Minecraft PE?",
          answer: "Sì. Minecraft Pocket Edition ora fa parte di Minecraft Bedrock Edition. Cookie Build è nato nel 2014 per la community di Minecraft PE.",
        },
        {
          question: "Posso giocare con chi usa Java?",
          answer: "Sì. Cookie Build è un server multipiattaforma: i giocatori Java e Bedrock condividono gli stessi giochi.",
        },
      ],
    },
    java: {
      cardTitle: "Java Edition (PC, Mac, Linux)",
      cardDescription: "Multigiocatore → Aggiungi server → play.cookie-build.com.",
      seoTitle: "Entra su Cookie Build da Minecraft Java Edition | Cookie Build",
      metaDescription: "Entra su Cookie Build da Minecraft Java Edition, dalla 1.8 all’ultima versione: Multigiocatore → Aggiungi server → play.cookie-build.com. Nessuna porta.",
      h1: "Come entrare su Cookie Build dalla Java Edition",
      intro: "Cookie Build supporta Minecraft Java Edition dalla 1.8 all’ultima versione su Windows, macOS e Linux. Ti basta l’indirizzo.",
      tips: [
        "Nessuna porta necessaria: la Java Edition usa la porta predefinita.",
        "Funziona qualsiasi versione supportata, dalla 1.8 all’ultima.",
        "Condividi gli stessi giochi con i giocatori Bedrock.",
      ],
      faqs: [
        {
          question: "Quali versioni di Minecraft sono supportate?",
          answer: "Le versioni supportate vanno dalla 1.8 all’ultima uscita.",
        },
        {
          question: "Devo inserire una porta?",
          answer: "No. Sulla Java Edition basta play.cookie-build.com. La porta 19132 serve solo ai giocatori Bedrock.",
        },
        {
          question: "Posso giocare con amici su Bedrock?",
          answer: "Sì. Cookie Build è un server multipiattaforma: i giocatori Java e Bedrock condividono gli stessi giochi.",
        },
        {
          question: "Il server è gratuito?",
          answer: "Sì. Tutti i minigiochi di Cookie Build sono gratuiti.",
        },
      ],
    },
  },
};

const bg: JoinGuideSource = {
  hub: {
    seoTitle: "Как да влезеш в Cookie Build от всяко устройство | Cookie Build",
    metaDescription: "Ръководства стъпка по стъпка за Cookie Build на PS4/PS5, Xbox, Switch, телефон и Java. Адрес: play.cookie-build.com, Bedrock порт 19132.",
    eyebrow: "Ръководства за влизане",
    h1: "Как да се присъединиш към Cookie Build",
    intro: "Cookie Build е безплатен Minecraft сървър с миниигри за Java и Bedrock. Избери устройството си за ръководство стъпка по стъпка.",
    platformsHeading: "Избери устройството си",
    cardCta: "Отвори ръководството",
    addressHeading: "Данни за сървъра",
    addressBody: "На Java играчите им трябва само адресът. На Bedrock въвеждаш адреса и порта в две отделни полета.",
  },
  ui: {
    breadcrumbLabel: "Навигационна пътека",
    home: "Начало",
    join: "Присъединяване",
    addressHeading: "Данни за сървъра",
    bedrockAddressBody: "Въведи адреса и порта в две отделни полета: Minecraft Bedrock не приема „адрес:порт“ в едно поле.",
    javaAddressBody: "Java Edition използва порта по подразбиране, така че ти трябва само адресът.",
    methodsHeading: "Стъпка по стъпка",
    recommended: "Препоръчително",
    linksLabel: "Връзки",
    undoHeading: "Как да го върнеш",
    dnsServersHeading: "DNS адреси на BedrockConnect",
    primaryDnsLabel: "Основен DNS",
    secondaryDnsLabel: "Вторичен DNS",
    alternativeDnsLabel: "Други DNS сървъри на общността, ако основният не работи",
    dnsSource: "Източник: README на BedrockConnect, проверено на {date}.",
    tipsHeading: "Съвети",
    faqHeading: "Често задавани въпроси",
    otherGuidesHeading: "Играеш на друго устройство?",
    helpHeading: "Нужна ти е помощ?",
    helpBody: "Влез в нашия Discord сървър: играчите и екипът ще ти помогнат да се свържеш.",
    discordCta: "Влез в Discord",
    backToHub: "Всички ръководства за присъединяване",
    addToMinecraft: "Добави в Minecraft",
    addToMinecraftNote: "Отвори тази страница на устройството, на което е инсталиран Minecraft. Ако нищо не се случи, следвай ръчните стъпки по-долу.",
  },
  dns: {
    name: "DNS метод с BedrockConnect",
    intro: "BedrockConnect е безплатна услуга на общността с отворен код, която превръща един от препоръчаните сървъри в меню, където можеш да въведеш адреса на всеки сървър. Не се управлява от Cookie Build.",
    configure: {
      playstation: [
        {
          name: "Отвори мрежовите настройки",
          text: "PS5: „Settings → Network → Settings → Set Up Internet Connection“, маркирай текущата си връзка и отвори „Advanced Settings“. PS4: „Settings → Network → Set Up Internet Connection“ → Wi‑Fi или LAN кабел → „Custom“ → твоята мрежа, после избери „Automatic“ за „IP Address Settings“ и „Do Not Specify“ за „DHCP Host Name“.",
        },
        {
          name: "Задай DNS ръчно",
          text: "Задай „DNS Settings“ на „Manual“. Въведи {primary} като основен DNS и {secondary} като вторичен DNS.",
        },
        {
          name: "Запази и тествай",
          text: "PS5: избери „OK“ и изчакай теста на връзката. PS4: избери „Automatic“ за „MTU Settings“ и „Do Not Use“ за „Proxy Server“, след това тествай връзката.",
        },
      ],
      xbox: [
        {
          name: "Отвори мрежовите настройки",
          text: "Отиди в „Settings → General → Network settings → Advanced settings → DNS settings“ и избери „Manual“.",
        },
        {
          name: "Въведи DNS адресите",
          text: "Въведи {primary} като основен IPv4 DNS и {secondary} като вторичен IPv4 DNS.",
        },
        {
          name: "Запази",
          text: "Потвърди адресите и се върни към екрана с мрежовите настройки.",
        },
      ],
      switch: [
        {
          name: "Отвори мрежовите настройки",
          text: "Отиди в „System Settings → Internet → Internet Settings“, избери мрежата си и после „Change Settings“.",
        },
        {
          name: "Задай DNS ръчно",
          text: "Задай „DNS Settings“ на „Manual“. Въведи {primary} като основен DNS и {secondary} като вторичен DNS.",
        },
        {
          name: "Запази и тествай",
          text: "Избери „Save“, след това тествай връзката.",
        },
      ],
    },
    play: [
      {
        name: "Отвори раздела „Сървъри“",
        text: "Стартирай Minecraft, избери „Игра“ и отвори раздела „Сървъри“.",
      },
      {
        name: "Влез в препоръчан сървър",
        text: "Влез в един от препоръчаните сървъри, които BedrockConnect може да пренасочи ({featured}). Вместо този сървър ще се отвори списъкът със сървъри на BedrockConnect.",
      },
      {
        name: "Избери „Connect to a Server“",
        text: "В менюто на BedrockConnect (винаги на английски) избери „Connect to a Server“.",
      },
      {
        name: "Въведи данните на Cookie Build",
        text: "Напиши {address} в „Server Address“ и {port} в „Server Port“. Включи „Add to server list“, за да намериш Cookie Build в списъка следващия път.",
      },
      {
        name: "Влез в Cookie Build",
        text: "Изпрати формуляра: BedrockConnect те прехвърля директно в Cookie Build.",
      },
    ],
    note: "Докато персонализираният DNS е активен, пренасочените препоръчани сървъри отварят BedrockConnect вместо самия сървър. Ако {primary} не работи, опитай някой от другите DNS сървъри на общността по-долу.",
    undo: {
      playstation: "Отвори същото мрежово меню и върни „DNS Settings“ на „Automatic“. На PS4 можеш също да пуснеш отново „Set Up Internet Connection“ и да избереш „Easy“.",
      xbox: "Отиди в „Settings → General → Network settings → Advanced settings → DNS settings“ и избери „Automatic“.",
      switch: "Отиди в „System Settings → Internet → Internet Settings“ → твоята мрежа → „Change Settings“ и върни „DNS Settings“ на „Automatic“.",
    },
  },
  lan: {
    name: "Помощно приложение за LAN (същата Wi‑Fi мрежа)",
    intro: "Телефон или компютър в същата мрежа като конзолата ти може да накара Cookie Build да се показва като локална (LAN) игра.",
    steps: [
      {
        name: "Използвай същата мрежа",
        text: "Свържи телефона или компютъра си към същата Wi‑Fi или домашна мрежа като конзолата.",
      },
      {
        name: "На телефон: BedrockTogether",
        text: "На Android или iOS инсталирай BedrockTogether, въведи {address} и порт {port}, после докосни „Run“.",
      },
      {
        name: "Или на компютър: Phantom",
        text: "На Windows, macOS или Linux изтегли Phantom и го стартирай с -server {address}:{port}. Ако защитната стена попита, разреши достъпа.",
      },
      {
        name: "Влез от конзолата",
        text: "Отвори Minecraft на конзолата: Cookie Build се появява като LAN игра в раздела „Светове“ (в някои версии – „Приятели“). Избери я, за да влезеш.",
      },
      {
        name: "Остави помощника отворен",
        text: "Дръж приложението или програмата отворени, докато се свързваш. Phantom препраща връзката ти, затова го остави да работи, докато играеш.",
      },
    ],
    note: "BedrockTogether и Phantom са инструменти на трети страни. Не се управляват от Cookie Build.",
  },
  mobile: {
    oneTap: {
      name: "Бутон с едно докосване",
      intro: "Най-бързият начин на телефон, таблет или компютър с Windows, на който е инсталиран Minecraft.",
      steps: [
        {
          name: "Докосни „Добави в Minecraft“",
          text: "Отвори тази страница на устройството си и докосни бутона „Добави в Minecraft“ по-горе.",
        },
        {
          name: "Остави Minecraft да се отвори",
          text: "Ако устройството ти поддържа Minecraft връзки, Minecraft ще се отвори и ще добави Cookie Build към сървърите ти.",
        },
        {
          name: "Влез от раздела „Сървъри“",
          text: "Избери „Игра → Сървъри“, после избери Cookie Build, за да влезеш.",
        },
      ],
    },
    addServer: {
      name: "Добави сървъра ръчно",
      intro: "Работи на всяко Bedrock устройство със списък със сървъри: Android, iPhone, iPad и Windows.",
      steps: [
        {
          name: "Отвори раздела „Сървъри“",
          text: "Стартирай Minecraft, избери „Игра“ и отвори раздела „Сървъри“.",
        },
        {
          name: "Избери „Добавяне на сървър“",
          text: "Превърти до края на списъка със сървъри и избери „Добавяне на сървър“.",
        },
        {
          name: "Въведи данните",
          text: "Име на сървъра: Cookie Build. Адрес на сървъра: {address}. Порт: {port}.",
        },
        {
          name: "Запази и влез",
          text: "Избери „Запазване“, после избери Cookie Build в списъка, за да влезеш.",
        },
      ],
    },
  },
  java: {
    addServer: {
      name: "Добавяне на сървър",
      intro: "Запазва Cookie Build в списъка ти със сървъри, за да влизаш с едно щракване следващия път.",
      steps: [
        {
          name: "Отвори „Мрежова игра“",
          text: "Стартирай Minecraft Java Edition (1.8 или по-нова) и избери „Мрежова игра“.",
        },
        {
          name: "Избери „Добавяне на сървър“",
          text: "Избери „Добавяне на сървър“, въведи Cookie Build като име на сървъра и {address} като адрес на сървъра.",
        },
        {
          name: "Влез в Cookie Build",
          text: "Избери „Готово“, после щракни два пъти върху Cookie Build в списъка със сървъри (или го избери и натисни „Присъединяване към сървъра“).",
        },
      ],
    },
    directConnect: {
      name: "Директна връзка",
      intro: "За бърза еднократна връзка, без да запазваш сървъра.",
      steps: [
        {
          name: "Отвори „Директна връзка“",
          text: "В менюто „Мрежова игра“ избери „Директна връзка“.",
        },
        {
          name: "Влез в сървъра",
          text: "Напиши {address} и избери „Присъединяване към сървъра“.",
        },
      ],
    },
  },
  platforms: {
    playstation: {
      cardTitle: "PlayStation 4 и 5",
      cardDescription: "Влез с безплатния DNS метод BedrockConnect или с помощно приложение за LAN.",
      seoTitle: "Minecraft на PS4/PS5: влез в Cookie Build | Cookie Build",
      metaDescription: "Влез в Cookie Build на PS4 и PS5: задай DNS на BedrockConnect и се свържи с play.cookie-build.com на порт 19132. Безплатно ръководство.",
      h1: "Как да се присъединиш към Cookie Build на PS4 и PS5",
      intro: "Minecraft на PlayStation няма бутон „Добавяне на сървър“, а само препоръчани сървъри. Въпреки това можеш да влезеш в Cookie Build за няколко минути с промяна на DNS или с помощно приложение в същата Wi‑Fi мрежа.",
      tips: [
        "Снимай текущите си мрежови настройки, преди да ги промениш, за да ги възстановиш лесно.",
        "В BedrockConnect включи „Add to server list“: следващия път Cookie Build ще те чака в списъка.",
        "Ако менюто на BedrockConnect се затвори, приклекни или удари, за да го отвориш отново.",
        "Нямаш компютър? За DNS метода ти трябва само конзолата.",
      ],
      faqs: [
        {
          question: "Мога ли да играя Cookie Build на PS5?",
          answer: "Да. Играчите на PS4 и PS5 влизат с DNS метода BedrockConnect или с помощно приложение за LAN и играят на същия сървър като играчите на Java, телефони и компютри.",
        },
        {
          question: "Защо на PlayStation няма бутон „Добавяне на сървър“?",
          answer: "Minecraft на конзоли показва само препоръчани сървъри. BedrockConnect превръща един от тях в меню, където можеш да въведеш всеки адрес, например play.cookie-build.com с порт 19132.",
        },
        {
          question: "Cookie Build ли управлява BedrockConnect?",
          answer: "Не. BedrockConnect е безплатен проект на общността с отворен код, който Cookie Build не управлява. Това ръководство само обяснява как да го използваш, за да стигнеш до нашия сървър.",
        },
        {
          question: "Мога ли да отменя промяната на DNS?",
          answer: "Да. Отвори същото мрежово меню и върни „DNS Settings“ на „Automatic“. Докато персонализираният DNS е активен, пренасочените препоръчани сървъри отварят BedrockConnect вместо самия сървър.",
        },
        {
          question: "Безплатно ли е?",
          answer: "Да. Cookie Build е безплатен за игра, а BedrockConnect също е безплатен.",
        },
      ],
    },
    xbox: {
      cardTitle: "Xbox One и Series X|S",
      cardDescription: "Влез с безплатния DNS метод BedrockConnect или с помощно приложение за LAN.",
      seoTitle: "Minecraft на Xbox: влез в Cookie Build | Cookie Build",
      metaDescription: "Влез в Cookie Build на Xbox One и Series X|S: задай DNS на BedrockConnect и се свържи с play.cookie-build.com на порт 19132. Безплатно ръководство.",
      h1: "Как да се присъединиш към Cookie Build на Xbox",
      intro: "Minecraft на Xbox няма бутон „Добавяне на сървър“, а само препоръчани сървъри. Въпреки това можеш да влезеш в Cookie Build за няколко минути с промяна на DNS или с помощно приложение в същата Wi‑Fi мрежа.",
      tips: [
        "Запиши текущите си DNS настройки, преди да ги промениш, за да ги възстановиш лесно.",
        "В BedrockConnect включи „Add to server list“: следващия път Cookie Build ще те чака в списъка.",
        "Ако менюто на BedrockConnect се затвори, приклекни или удари, за да го отвориш отново.",
        "Нямаш компютър? За DNS метода ти трябва само конзолата.",
      ],
      faqs: [
        {
          question: "Работи ли на Xbox Series X и Series S?",
          answer: "Да. Стъпките са едни и същи на Xbox One, Series X и Series S.",
        },
        {
          question: "Защо на Xbox няма бутон „Добавяне на сървър“?",
          answer: "Minecraft на конзоли показва само препоръчани сървъри. BedrockConnect превръща един от тях в меню, където можеш да въведеш всеки адрес, например play.cookie-build.com с порт 19132.",
        },
        {
          question: "Cookie Build ли управлява BedrockConnect?",
          answer: "Не. BedrockConnect е безплатен проект на общността с отворен код, който Cookie Build не управлява. Това ръководство само обяснява как да го използваш, за да стигнеш до нашия сървър.",
        },
        {
          question: "Мога ли да отменя промяната на DNS?",
          answer: "Да. Върни се в „Settings → General → Network settings → Advanced settings → DNS settings“ и избери „Automatic“.",
        },
      ],
    },
    switch: {
      cardTitle: "Nintendo Switch",
      cardDescription: "Влез с безплатния DNS метод BedrockConnect.",
      seoTitle: "Minecraft на Switch: влез в Cookie Build | Cookie Build",
      metaDescription: "Влез в Cookie Build на Nintendo Switch: задай DNS на BedrockConnect и се свържи с play.cookie-build.com на порт 19132. Безплатно ръководство.",
      h1: "Как да се присъединиш към Cookie Build на Nintendo Switch",
      intro: "Minecraft на Nintendo Switch няма бутон „Добавяне на сървър“, а само препоръчани сървъри. С бърза промяна на DNS пак можеш да влезеш в Cookie Build.",
      tips: [
        "Снимай текущите си мрежови настройки, преди да ги промениш, за да ги възстановиш лесно.",
        "В BedrockConnect включи „Add to server list“: следващия път Cookie Build ще те чака в списъка.",
        "Ако менюто на BedrockConnect се затвори, приклекни или удари, за да го отвориш отново.",
      ],
      faqs: [
        {
          question: "Мога ли да играя Cookie Build на Nintendo Switch?",
          answer: "Да. Играчите на Switch влизат с DNS метода BedrockConnect и играят на същия сървър като играчите на Java, телефони и компютри.",
        },
        {
          question: "Мога ли да използвам LAN приложение като BedrockTogether или Phantom?",
          answer: "Не и на Switch: конзолата не вижда такъв вид LAN игри. Използвай DNS метода.",
        },
        {
          question: "Cookie Build ли управлява BedrockConnect?",
          answer: "Не. BedrockConnect е безплатен проект на общността с отворен код, който Cookie Build не управлява. Това ръководство само обяснява как да го използваш, за да стигнеш до нашия сървър.",
        },
        {
          question: "Мога ли да отменя промяната на DNS?",
          answer: "Да. Върни се в „System Settings → Internet → Internet Settings“ → твоята мрежа → „Change Settings“ и върни „DNS Settings“ на „Automatic“.",
        },
      ],
    },
    mobile: {
      cardTitle: "Телефон и Windows (Bedrock)",
      cardDescription: "Android, iPhone, iPad и Windows: добави сървъра с няколко докосвания.",
      seoTitle: "Влез в Cookie Build в Minecraft PE (Android/iOS) | Cookie Build",
      metaDescription: "Добави Cookie Build в Minecraft Bedrock на Android, iOS или Windows: адрес play.cookie-build.com, порт 19132. Бутон с едно докосване и ръчни стъпки.",
      h1: "Как да се присъединиш към Cookie Build от телефон и Windows",
      intro: "На Android, iPhone, iPad и Windows Minecraft Bedrock ти позволява да добавиш всеки сървър. Използвай бутона с едно докосване или добави Cookie Build ръчно.",
      tips: [
        "Адресът и портът се въвеждат в две отделни полета.",
        "След като го добавиш, Cookie Build остава в раздела „Сървъри“.",
        "Приятелите ти играят на конзола? Изпрати им ръководството за PlayStation, Xbox или Switch.",
      ],
      faqs: [
        {
          question: "Кой порт да използвам?",
          answer: "Използвай порт 19132, стандартния порт на Minecraft Bedrock, с адреса play.cookie-build.com.",
        },
        {
          question: "Бутонът „Добави в Minecraft“ не работи. Какво да направя?",
          answer: "Някои устройства или браузъри не отварят Minecraft връзки. Добави сървъра ръчно: „Игра → Сървъри → Добавяне на сървър“.",
        },
        {
          question: "Работи ли на Windows 10 и 11?",
          answer: "Да. Minecraft за Windows (Bedrock Edition) използва същите стъпки като Android и iOS.",
        },
        {
          question: "Това същото ли е като Minecraft PE?",
          answer: "Да. Minecraft Pocket Edition вече е част от Minecraft Bedrock Edition. Cookie Build започна през 2014 г. за общността на Minecraft PE.",
        },
        {
          question: "Мога ли да играя с Java играчи?",
          answer: "Да. Cookie Build е сървър с крос-плей: Java и Bedrock играчите споделят едни и същи игри.",
        },
      ],
    },
    java: {
      cardTitle: "Java Edition (компютър, Mac, Linux)",
      cardDescription: "Мрежова игра → Добавяне на сървър → play.cookie-build.com.",
      seoTitle: "Влез в Cookie Build в Minecraft Java Edition | Cookie Build",
      metaDescription: "Влез в Cookie Build с Minecraft Java Edition от 1.8 до най-новата версия: Мрежова игра → Добавяне на сървър → play.cookie-build.com. Без порт.",
      h1: "Как да се присъединиш към Cookie Build в Java Edition",
      intro: "Cookie Build поддържа Minecraft Java Edition от 1.8 до най-новата версия на Windows, macOS и Linux. Трябва ти само адресът.",
      tips: [
        "Не ти трябва порт: Java Edition използва порта по подразбиране.",
        "Работи всяка поддържана версия от 1.8 до най-новата.",
        "Играеш в същите игри като Bedrock играчите.",
      ],
      faqs: [
        {
          question: "Кои версии на Minecraft се поддържат?",
          answer: "Поддържат се версиите от 1.8 до най-новата.",
        },
        {
          question: "Трябва ли да въвеждам порт?",
          answer: "Не. В Java Edition play.cookie-build.com е достатъчен. Порт 19132 е само за Bedrock играчите.",
        },
        {
          question: "Мога ли да играя с приятели на Bedrock?",
          answer: "Да. Cookie Build е сървър с крос-плей: Java и Bedrock играчите споделят едни и същи игри.",
        },
        {
          question: "Сървърът безплатен ли е?",
          answer: "Да. Всички миниигри в Cookie Build са безплатни.",
        },
      ],
    },
  },
};

const es: JoinGuideSource = {
  hub: {
    seoTitle: "Cómo entrar a Cookie Build desde cualquier dispositivo | Cookie Build",
    metaDescription: "Guías paso a paso para entrar a Cookie Build en PS4/PS5, Xbox, Switch, móvil y Java. Dirección: play.cookie-build.com, puerto Bedrock 19132.",
    eyebrow: "Guías para entrar",
    h1: "Cómo entrar a Cookie Build",
    intro: "Cookie Build es un servidor gratuito de minijuegos de Minecraft para Java y Bedrock. Elige tu dispositivo para ver la guía paso a paso.",
    platformsHeading: "Elige tu dispositivo",
    cardCta: "Abrir la guía",
    addressHeading: "Datos del servidor",
    addressBody: "En Java solo necesitas la dirección. En Bedrock, escribe la dirección y el puerto en dos campos separados.",
  },
  ui: {
    breadcrumbLabel: "Ruta de navegación",
    home: "Inicio",
    join: "Cómo entrar",
    addressHeading: "Datos del servidor",
    bedrockAddressBody: "Escribe la dirección y el puerto en dos campos separados: Minecraft Bedrock no acepta “dirección:puerto” en un solo campo.",
    javaAddressBody: "Java Edition usa el puerto predeterminado, así que solo necesitas la dirección.",
    methodsHeading: "Paso a paso",
    recommended: "Recomendado",
    linksLabel: "Enlaces",
    undoHeading: "Cómo deshacerlo",
    dnsServersHeading: "Direcciones DNS de BedrockConnect",
    primaryDnsLabel: "DNS principal",
    secondaryDnsLabel: "DNS secundario",
    alternativeDnsLabel: "Otros servidores DNS de la comunidad para probar si el principal no funciona",
    dnsSource: "Fuente: README de BedrockConnect, consultado el {date}.",
    tipsHeading: "Consejos",
    faqHeading: "Preguntas frecuentes",
    otherGuidesHeading: "¿Juegas en otro dispositivo?",
    helpHeading: "¿Necesitas ayuda?",
    helpBody: "Únete a nuestro servidor de Discord: jugadores y staff te ayudarán a conectarte.",
    discordCta: "Unirme al Discord",
    backToHub: "Todas las guías para entrar",
    addToMinecraft: "Añadir a Minecraft",
    addToMinecraftNote: "Abre esta página en el dispositivo donde tienes instalado Minecraft. Si no pasa nada, sigue los pasos manuales de abajo.",
  },
  dns: {
    name: "Método DNS de BedrockConnect",
    intro: "BedrockConnect es un servicio comunitario gratuito y de código abierto que convierte un servidor destacado en un menú donde puedes escribir la dirección de cualquier servidor. No lo gestiona Cookie Build.",
    configure: {
      playstation: [
        {
          name: "Abre la configuración de red",
          text: "PS5: Configuración → Red → Configuración → Configurar conexión a Internet, selecciona tu conexión actual y abre Configuración avanzada. PS4: Configuración → Red → Configurar conexión a Internet → Usar Wi‑Fi o Usar un cable LAN → Personalizada → tu red; luego elige Automático en Configuración de dirección IP y No especificar en Nombre de host DHCP.",
        },
        {
          name: "Configura un DNS manual",
          text: "Pon Configuración de DNS en Manual. Escribe {primary} como DNS principal y {secondary} como DNS secundario.",
        },
        {
          name: "Guarda y prueba",
          text: "PS5: selecciona Aceptar y espera la prueba de conexión. PS4: elige Automático en Configuración de MTU y No usar en Servidor proxy, y luego prueba la conexión.",
        },
      ],
      xbox: [
        {
          name: "Abre la configuración de red",
          text: "Ve a Configuración → General → Configuración de red → Configuración avanzada → Configuración de DNS y elige Manual.",
        },
        {
          name: "Escribe las direcciones DNS",
          text: "Escribe {primary} como DNS IPv4 principal y {secondary} como DNS IPv4 secundario.",
        },
        {
          name: "Guarda",
          text: "Confirma las direcciones y vuelve a la pantalla de configuración de red.",
        },
      ],
      switch: [
        {
          name: "Abre la configuración de red",
          text: "Ve a Configuración de la consola → Internet → Configuración de Internet, selecciona tu red y elige Cambiar configuración.",
        },
        {
          name: "Configura un DNS manual",
          text: "Pon Configuración de DNS en Manual. Escribe {primary} como DNS principal y {secondary} como DNS secundario.",
        },
        {
          name: "Guarda y prueba",
          text: "Selecciona Guardar y luego prueba la conexión.",
        },
      ],
    },
    play: [
      {
        name: "Abre la pestaña Servidores",
        text: "Abre Minecraft, selecciona Jugar y luego abre la pestaña Servidores.",
      },
      {
        name: "Entra a un servidor destacado",
        text: "Entra a uno de los servidores destacados que BedrockConnect puede redirigir ({featured}). En lugar de ese servidor, se abrirá la lista de servidores de BedrockConnect.",
      },
      {
        name: "Elige “Connect to a Server”",
        text: "En el menú de BedrockConnect (siempre en inglés), selecciona “Connect to a Server”.",
      },
      {
        name: "Escribe los datos de Cookie Build",
        text: "Escribe {address} en “Server Address” y {port} en “Server Port”. Activa “Add to server list” para encontrar Cookie Build en la lista la próxima vez.",
      },
      {
        name: "Entra a Cookie Build",
        text: "Envía el formulario: BedrockConnect te lleva directo a Cookie Build.",
      },
    ],
    note: "Mientras el DNS personalizado esté activo, los servidores destacados redirigidos abrirán BedrockConnect en su lugar. Si {primary} no funciona, prueba uno de los otros servidores DNS de la comunidad que aparecen abajo.",
    undo: {
      playstation: "Abre el mismo menú de red y vuelve a poner Configuración de DNS en Automático. En PS4 también puedes volver a usar Configurar conexión a Internet y elegir Fácil.",
      xbox: "Ve a Configuración → General → Configuración de red → Configuración avanzada → Configuración de DNS y elige Automático.",
      switch: "Ve a Configuración de la consola → Internet → Configuración de Internet → tu red → Cambiar configuración y vuelve a poner Configuración de DNS en Automático.",
    },
  },
  lan: {
    name: "App auxiliar LAN (mismo Wi‑Fi)",
    intro: "Un teléfono o una computadora conectados a la misma red que tu consola pueden hacer que Cookie Build aparezca como una partida local (LAN).",
    steps: [
      {
        name: "Usa la misma red",
        text: "Conecta tu teléfono o computadora al mismo Wi‑Fi o red doméstica que tu consola.",
      },
      {
        name: "En un teléfono: BedrockTogether",
        text: "En Android o iOS, instala BedrockTogether, escribe {address} y el puerto {port}, y luego toca “Run”.",
      },
      {
        name: "O en una computadora: Phantom",
        text: "En Windows, macOS o Linux, descarga Phantom e inícialo con -server {address}:{port}. Si te lo pide, permítelo en tu firewall.",
      },
      {
        name: "Entra desde tu consola",
        text: "Abre Minecraft en tu consola: Cookie Build aparece como partida LAN en la pestaña Mundos (la pestaña Amigos en algunas versiones). Selecciónalo para entrar.",
      },
      {
        name: "Deja la app abierta",
        text: "Mantén la app o el programa abierto mientras te conectas. Phantom retransmite tu conexión, así que déjalo funcionando mientras juegas.",
      },
    ],
    note: "BedrockTogether y Phantom son herramientas de terceros. No las gestiona Cookie Build.",
  },
  mobile: {
    oneTap: {
      name: "Botón de un toque",
      intro: "La forma más rápida en un teléfono, tableta o PC con Windows que tenga Minecraft instalado.",
      steps: [
        {
          name: "Toca “Añadir a Minecraft”",
          text: "Abre esta página en tu dispositivo y toca el botón “Añadir a Minecraft” de arriba.",
        },
        {
          name: "Deja que se abra Minecraft",
          text: "Si tu dispositivo admite enlaces de Minecraft, Minecraft se abre y añade Cookie Build a tus servidores.",
        },
        {
          name: "Entra desde la pestaña Servidores",
          text: "Selecciona Jugar → Servidores y elige Cookie Build para entrar.",
        },
      ],
    },
    addServer: {
      name: "Añadir el servidor manualmente",
      intro: "Funciona en todos los dispositivos Bedrock con lista de servidores: Android, iPhone, iPad y Windows.",
      steps: [
        {
          name: "Abre la pestaña Servidores",
          text: "Abre Minecraft, selecciona Jugar y luego abre la pestaña Servidores.",
        },
        {
          name: "Selecciona “Añadir servidor”",
          text: "Baja hasta el final de la lista de servidores y selecciona “Añadir servidor”.",
        },
        {
          name: "Escribe los datos",
          text: "Nombre del servidor: Cookie Build. Dirección del servidor: {address}. Puerto: {port}.",
        },
        {
          name: "Guarda y entra",
          text: "Selecciona Guardar y luego elige Cookie Build en la lista para entrar.",
        },
      ],
    },
  },
  java: {
    addServer: {
      name: "Añadir servidor",
      intro: "Guarda Cookie Build en tu lista de servidores para entrar con un solo clic la próxima vez.",
      steps: [
        {
          name: "Abre Multijugador",
          text: "Abre Minecraft Java Edition (1.8 o superior) y selecciona Multijugador.",
        },
        {
          name: "Selecciona Añadir servidor",
          text: "Selecciona Añadir servidor, escribe Cookie Build como nombre del servidor y {address} como dirección del servidor.",
        },
        {
          name: "Entra a Cookie Build",
          text: "Selecciona Listo y haz doble clic en Cookie Build en tu lista de servidores (o selecciónalo y haz clic en Entrar al servidor).",
        },
      ],
    },
    directConnect: {
      name: "Conexión directa",
      intro: "Para conectarte rápido una sola vez sin guardar el servidor.",
      steps: [
        {
          name: "Abre Conexión directa",
          text: "En el menú Multijugador, selecciona Conexión directa.",
        },
        {
          name: "Entra al servidor",
          text: "Escribe {address} y selecciona Entrar al servidor.",
        },
      ],
    },
  },
  platforms: {
    playstation: {
      cardTitle: "PlayStation 4 y 5",
      cardDescription: "Entra con el método DNS gratuito de BedrockConnect o con una app auxiliar LAN.",
      seoTitle: "Minecraft en PS4/PS5: cómo entrar a Cookie Build | Cookie Build",
      metaDescription: "Entra a Cookie Build en PS4 y PS5: configura el DNS de BedrockConnect y conéctate a play.cookie-build.com en el puerto 19132. Guía gratis paso a paso.",
      h1: "Cómo entrar a Cookie Build en PS4 y PS5",
      intro: "Minecraft en PlayStation no tiene el botón “Añadir servidor”, solo servidores destacados. Aun así, puedes entrar a Cookie Build en pocos minutos cambiando el DNS o con una app auxiliar en el mismo Wi‑Fi.",
      tips: [
        "Toma una foto de tu configuración de red actual antes de cambiarla para poder restaurarla fácilmente.",
        "En BedrockConnect, activa “Add to server list”: la próxima vez, Cookie Build te estará esperando en la lista.",
        "Si el menú de BedrockConnect se cierra, agáchate o da un golpe para volver a abrirlo.",
        "¿No tienes PC? El método DNS solo necesita tu consola.",
      ],
      faqs: [
        {
          question: "¿Puedo jugar Cookie Build en PS5?",
          answer: "Sí. Los jugadores de PS4 y PS5 entran con el método DNS de BedrockConnect o con una app auxiliar LAN, y juegan en el mismo servidor que los jugadores de Java, móvil y PC.",
        },
        {
          question: "¿Por qué no hay botón “Añadir servidor” en PlayStation?",
          answer: "Minecraft en consolas solo muestra servidores destacados. BedrockConnect convierte uno de ellos en un menú donde puedes escribir cualquier dirección, como play.cookie-build.com con el puerto 19132.",
        },
        {
          question: "¿BedrockConnect es de Cookie Build?",
          answer: "No. BedrockConnect es un proyecto comunitario gratuito y de código abierto que Cookie Build no gestiona. Esta guía solo explica cómo usarlo para llegar a nuestro servidor.",
        },
        {
          question: "¿Puedo deshacer el cambio de DNS?",
          answer: "Sí. Abre el mismo menú de red y vuelve a poner Configuración de DNS en Automático. Mientras el DNS personalizado esté activo, los servidores destacados redirigidos abrirán BedrockConnect en su lugar.",
        },
        {
          question: "¿Es gratis?",
          answer: "Sí. Cookie Build es gratis, y BedrockConnect también.",
        },
      ],
    },
    xbox: {
      cardTitle: "Xbox One y Series X|S",
      cardDescription: "Entra con el método DNS gratuito de BedrockConnect o con una app auxiliar LAN.",
      seoTitle: "Minecraft en Xbox: cómo entrar a Cookie Build | Cookie Build",
      metaDescription: "Entra a Cookie Build en Xbox One y Series X|S: configura el DNS de BedrockConnect y conéctate a play.cookie-build.com en el puerto 19132. Guía gratis.",
      h1: "Cómo entrar a Cookie Build en Xbox",
      intro: "Minecraft en Xbox no tiene el botón “Añadir servidor”, solo servidores destacados. Aun así, puedes entrar a Cookie Build en pocos minutos cambiando el DNS o con una app auxiliar en el mismo Wi‑Fi.",
      tips: [
        "Anota tu configuración de DNS actual antes de cambiarla para poder restaurarla fácilmente.",
        "En BedrockConnect, activa “Add to server list”: la próxima vez, Cookie Build te estará esperando en la lista.",
        "Si el menú de BedrockConnect se cierra, agáchate o da un golpe para volver a abrirlo.",
        "¿No tienes PC? El método DNS solo necesita tu consola.",
      ],
      faqs: [
        {
          question: "¿Funciona en Xbox Series X y Series S?",
          answer: "Sí. Los pasos son los mismos en Xbox One, Series X y Series S.",
        },
        {
          question: "¿Por qué no hay botón “Añadir servidor” en Xbox?",
          answer: "Minecraft en consolas solo muestra servidores destacados. BedrockConnect convierte uno de ellos en un menú donde puedes escribir cualquier dirección, como play.cookie-build.com con el puerto 19132.",
        },
        {
          question: "¿BedrockConnect es de Cookie Build?",
          answer: "No. BedrockConnect es un proyecto comunitario gratuito y de código abierto que Cookie Build no gestiona. Esta guía solo explica cómo usarlo para llegar a nuestro servidor.",
        },
        {
          question: "¿Puedo deshacer el cambio de DNS?",
          answer: "Sí. Vuelve a Configuración → General → Configuración de red → Configuración avanzada → Configuración de DNS y elige Automático.",
        },
      ],
    },
    switch: {
      cardTitle: "Nintendo Switch",
      cardDescription: "Entra con el método DNS gratuito de BedrockConnect.",
      seoTitle: "Minecraft en Switch: cómo entrar a Cookie Build | Cookie Build",
      metaDescription: "Entra a Cookie Build en Nintendo Switch: configura el DNS de BedrockConnect y conéctate a play.cookie-build.com en el puerto 19132. Guía gratis paso a paso.",
      h1: "Cómo entrar a Cookie Build en Nintendo Switch",
      intro: "Minecraft en Nintendo Switch no tiene el botón “Añadir servidor”, solo servidores destacados. Con un cambio rápido de DNS puedes entrar a Cookie Build igual.",
      tips: [
        "Toma una foto de tu configuración de red actual antes de cambiarla para poder restaurarla fácilmente.",
        "En BedrockConnect, activa “Add to server list”: la próxima vez, Cookie Build te estará esperando en la lista.",
        "Si el menú de BedrockConnect se cierra, agáchate o da un golpe para volver a abrirlo.",
      ],
      faqs: [
        {
          question: "¿Puedo jugar Cookie Build en Nintendo Switch?",
          answer: "Sí. Los jugadores de Switch entran con el método DNS de BedrockConnect y juegan en el mismo servidor que los jugadores de Java, móvil y PC.",
        },
        {
          question: "¿Puedo usar una app LAN como BedrockTogether o Phantom?",
          answer: "En Switch no: la Switch no puede ver este tipo de partidas LAN. Usa el método DNS.",
        },
        {
          question: "¿BedrockConnect es de Cookie Build?",
          answer: "No. BedrockConnect es un proyecto comunitario gratuito y de código abierto que Cookie Build no gestiona. Esta guía solo explica cómo usarlo para llegar a nuestro servidor.",
        },
        {
          question: "¿Puedo deshacer el cambio de DNS?",
          answer: "Sí. Vuelve a Configuración de la consola → Internet → Configuración de Internet → tu red → Cambiar configuración y pon Configuración de DNS en Automático.",
        },
      ],
    },
    mobile: {
      cardTitle: "Móvil y Windows (Bedrock)",
      cardDescription: "Android, iPhone, iPad y Windows: añade el servidor en pocos toques.",
      seoTitle: "Entra a Cookie Build en Minecraft PE (Android/iOS) | Cookie Build",
      metaDescription: "Añade Cookie Build a Minecraft Bedrock en Android, iOS o Windows: dirección play.cookie-build.com, puerto 19132. Botón de un toque y pasos manuales.",
      h1: "Cómo entrar a Cookie Build en móvil y Windows",
      intro: "En Android, iPhone, iPad y Windows, Minecraft Bedrock te permite añadir cualquier servidor. Usa el botón de un toque o añade Cookie Build manualmente.",
      tips: [
        "La dirección y el puerto van en dos campos separados.",
        "Una vez añadido, Cookie Build se queda en tu pestaña Servidores.",
        "¿Tienes amigos en consola? Pásales la guía de PlayStation, Xbox o Switch.",
      ],
      faqs: [
        {
          question: "¿Qué puerto debo usar?",
          answer: "Usa el puerto 19132, el predeterminado de Minecraft Bedrock, con la dirección play.cookie-build.com.",
        },
        {
          question: "El botón “Añadir a Minecraft” no funciona. ¿Qué hago?",
          answer: "Algunos dispositivos o navegadores no abren los enlaces de Minecraft. Añade el servidor manualmente: Jugar → Servidores → Añadir servidor.",
        },
        {
          question: "¿Funciona en Windows 10 y 11?",
          answer: "Sí. Minecraft para Windows (Bedrock Edition) sigue los mismos pasos que Android e iOS.",
        },
        {
          question: "¿Es lo mismo que Minecraft PE?",
          answer: "Sí. Minecraft Pocket Edition ahora forma parte de Minecraft Bedrock Edition. Cookie Build nació en 2014 para la comunidad de Minecraft PE.",
        },
        {
          question: "¿Puedo jugar con jugadores de Java?",
          answer: "Sí. Cookie Build es un servidor multiplataforma: los jugadores de Java y Bedrock comparten las mismas partidas.",
        },
      ],
    },
    java: {
      cardTitle: "Java Edition (PC, Mac, Linux)",
      cardDescription: "Multijugador → Añadir servidor → play.cookie-build.com.",
      seoTitle: "Entra a Cookie Build en Minecraft Java Edition | Cookie Build",
      metaDescription: "Entra a Cookie Build en Minecraft Java Edition, de la 1.8 a la última versión: Multijugador → Añadir servidor → play.cookie-build.com. Sin puerto.",
      h1: "Cómo entrar a Cookie Build en Java Edition",
      intro: "Cookie Build es compatible con Minecraft Java Edition desde la 1.8 hasta la última versión en Windows, macOS y Linux. Solo necesitas la dirección.",
      tips: [
        "No necesitas puerto: Java Edition usa el puerto predeterminado.",
        "Funciona cualquier versión compatible, desde la 1.8 hasta la más reciente.",
        "Compartes las mismas partidas con los jugadores de Bedrock.",
      ],
      faqs: [
        {
          question: "¿Qué versiones de Minecraft son compatibles?",
          answer: "Las versiones compatibles van desde la 1.8 hasta la más reciente.",
        },
        {
          question: "¿Tengo que escribir un puerto?",
          answer: "No. En Java Edition basta con play.cookie-build.com. El puerto 19132 es solo para jugadores de Bedrock.",
        },
        {
          question: "¿Puedo jugar con amigos de Bedrock?",
          answer: "Sí. Cookie Build es un servidor multiplataforma: los jugadores de Java y Bedrock comparten las mismas partidas.",
        },
        {
          question: "¿El servidor es gratis?",
          answer: "Sí. Todos los minijuegos de Cookie Build son gratis.",
        },
      ],
    },
  },
};

const hi: JoinGuideSource = {
  hub: {
    seoTitle: "किसी भी डिवाइस पर Cookie Build से कैसे जुड़ें | Cookie Build",
    metaDescription: "PS4/PS5, Xbox, Switch, मोबाइल और Java पर Cookie Build से जुड़ने की चरण-दर-चरण गाइड। पता: play.cookie-build.com, Bedrock पोर्ट 19132।",
    eyebrow: "जुड़ने की गाइड",
    h1: "Cookie Build से कैसे जुड़ें",
    intro: "Cookie Build, Java और Bedrock के लिए एक मुफ़्त Minecraft मिनी-गेम्स सर्वर है। चरण-दर-चरण गाइड के लिए अपना डिवाइस चुनें।",
    platformsHeading: "अपना डिवाइस चुनें",
    cardCta: "गाइड खोलें",
    addressHeading: "सर्वर विवरण",
    addressBody: "Java खिलाड़ियों को सिर्फ़ पता चाहिए। Bedrock खिलाड़ी पता और पोर्ट दो अलग-अलग फ़ील्ड में डालते हैं।",
  },
  ui: {
    breadcrumbLabel: "ब्रेडक्रंब",
    home: "होम",
    join: "जुड़ें",
    addressHeading: "सर्वर विवरण",
    bedrockAddressBody: "पता और पोर्ट दो अलग-अलग फ़ील्ड में डालें: Minecraft Bedrock एक ही फ़ील्ड में “पता:पोर्ट” स्वीकार नहीं करता।",
    javaAddressBody: "Java Edition डिफ़ॉल्ट पोर्ट इस्तेमाल करता है, इसलिए सिर्फ़ पता ही काफ़ी है।",
    methodsHeading: "चरण-दर-चरण",
    recommended: "सुझाया गया",
    linksLabel: "लिंक",
    undoHeading: "इसे वापस कैसे बदलें",
    dnsServersHeading: "BedrockConnect DNS पते",
    primaryDnsLabel: "प्राइमरी DNS",
    secondaryDnsLabel: "सेकेंडरी DNS",
    alternativeDnsLabel: "प्राइमरी DNS काम न करे, तो आज़माने के लिए अन्य सामुदायिक DNS सर्वर",
    dnsSource: "स्रोत: BedrockConnect README, {date} को जाँचा गया।",
    tipsHeading: "सुझाव",
    faqHeading: "अक्सर पूछे जाने वाले सवाल",
    otherGuidesHeading: "किसी दूसरे डिवाइस पर खेल रहे हैं?",
    helpHeading: "मदद चाहिए?",
    helpBody: "हमारे Discord सर्वर से जुड़ें: खिलाड़ी और स्टाफ़ कनेक्ट होने में आपकी मदद कर सकते हैं।",
    discordCta: "Discord से जुड़ें",
    backToHub: "जुड़ने की सभी गाइड",
    addToMinecraft: "Minecraft में जोड़ें",
    addToMinecraftNote: "यह पेज उसी डिवाइस पर खोलें जिस पर Minecraft इंस्टॉल है। अगर कुछ न हो, तो नीचे दिए मैन्युअल चरणों का पालन करें।",
  },
  dns: {
    name: "BedrockConnect DNS तरीका",
    intro: "BedrockConnect एक मुफ़्त, ओपन-सोर्स सामुदायिक सेवा है, जो किसी फ़ीचर्ड सर्वर को ऐसे मेनू में बदल देती है जहाँ आप कोई भी सर्वर पता टाइप कर सकते हैं। इसे Cookie Build संचालित नहीं करता।",
    configure: {
      playstation: [
        {
          name: "अपनी नेटवर्क सेटिंग्स खोलें",
          text: "PS5: “Settings → Network → Settings → Set Up Internet Connection” पर जाएँ, अपना मौजूदा कनेक्शन हाइलाइट करें और “Advanced Settings” खोलें। PS4: “Settings → Network → Set Up Internet Connection” → Wi‑Fi या LAN केबल → “Custom” → अपना नेटवर्क चुनें, फिर “IP Address Settings” में “Automatic” और “DHCP Host Name” में “Do Not Specify” चुनें।",
        },
        {
          name: "मैन्युअल DNS सेट करें",
          text: "“DNS Settings” को “Manual” पर सेट करें। प्राइमरी DNS में {primary} और सेकेंडरी DNS में {secondary} डालें।",
        },
        {
          name: "सेव करें और टेस्ट करें",
          text: "PS5: “OK” चुनें और कनेक्शन टेस्ट पूरा होने का इंतज़ार करें। PS4: “MTU Settings” में “Automatic” और “Proxy Server” में “Do Not Use” चुनें, फिर कनेक्शन टेस्ट करें।",
        },
      ],
      xbox: [
        {
          name: "अपनी नेटवर्क सेटिंग्स खोलें",
          text: "“Settings → General → Network settings → Advanced settings → DNS settings” पर जाएँ और “Manual” चुनें।",
        },
        {
          name: "DNS पते डालें",
          text: "प्राइमरी IPv4 DNS में {primary} और सेकेंडरी IPv4 DNS में {secondary} डालें।",
        },
        {
          name: "सेव करें",
          text: "पतों की पुष्टि करें और नेटवर्क सेटिंग्स स्क्रीन पर वापस जाएँ।",
        },
      ],
      switch: [
        {
          name: "अपनी नेटवर्क सेटिंग्स खोलें",
          text: "“System Settings → Internet → Internet Settings” पर जाएँ, अपना नेटवर्क चुनें, फिर “Change Settings” चुनें।",
        },
        {
          name: "मैन्युअल DNS सेट करें",
          text: "“DNS Settings” को “Manual” पर सेट करें। प्राइमरी DNS में {primary} और सेकेंडरी DNS में {secondary} डालें।",
        },
        {
          name: "सेव करें और टेस्ट करें",
          text: "“Save” चुनें, फिर कनेक्शन टेस्ट करें।",
        },
      ],
    },
    play: [
      {
        name: "सर्वर टैब खोलें",
        text: "Minecraft खोलें, खेलें चुनें, फिर सर्वर टैब खोलें।",
      },
      {
        name: "किसी फ़ीचर्ड सर्वर से जुड़ें",
        text: "उन फ़ीचर्ड सर्वरों में से किसी एक से जुड़ें जिन्हें BedrockConnect रीडायरेक्ट कर सकता है ({featured})। उस सर्वर की जगह BedrockConnect की सर्वर सूची खुलेगी।",
      },
      {
        name: "“Connect to a Server” चुनें",
        text: "BedrockConnect मेनू (जो हमेशा अंग्रेज़ी में होता है) में “Connect to a Server” चुनें।",
      },
      {
        name: "Cookie Build का विवरण डालें",
        text: "“Server Address” में {address} और “Server Port” में {port} टाइप करें। “Add to server list” चालू करें, ताकि अगली बार Cookie Build सूची में मिल जाए।",
      },
      {
        name: "Cookie Build से जुड़ें",
        text: "फ़ॉर्म सबमिट करें: BedrockConnect आपको सीधे Cookie Build पर भेज देगा।",
      },
    ],
    note: "जब तक कस्टम DNS चालू है, रीडायरेक्ट होने वाले फ़ीचर्ड सर्वरों की जगह BedrockConnect खुलेगा। अगर {primary} काम न करे, तो नीचे दिए अन्य सामुदायिक DNS सर्वरों में से कोई एक आज़माएँ।",
    undo: {
      playstation: "वही नेटवर्क मेनू खोलें और “DNS Settings” को वापस “Automatic” पर सेट करें। PS4 पर आप “Set Up Internet Connection” फिर से चलाकर “Easy” भी चुन सकते हैं।",
      xbox: "“Settings → General → Network settings → Advanced settings → DNS settings” पर जाएँ और “Automatic” चुनें।",
      switch: "“System Settings → Internet → Internet Settings” → अपना नेटवर्क → “Change Settings” पर जाएँ और “DNS Settings” को वापस “Automatic” पर सेट करें।",
    },
  },
  lan: {
    name: "LAN हेल्पर ऐप (एक ही Wi‑Fi)",
    intro: "आपके कंसोल वाले नेटवर्क से जुड़ा फ़ोन या कंप्यूटर Cookie Build को लोकल (LAN) गेम के रूप में दिखा सकता है।",
    steps: [
      {
        name: "एक ही नेटवर्क इस्तेमाल करें",
        text: "अपने फ़ोन या कंप्यूटर को उसी Wi‑Fi या होम नेटवर्क से जोड़ें, जिससे आपका कंसोल जुड़ा है।",
      },
      {
        name: "फ़ोन पर: BedrockTogether",
        text: "Android या iOS पर BedrockTogether इंस्टॉल करें, {address} और पोर्ट {port} डालें, फिर “Run” पर टैप करें।",
      },
      {
        name: "या कंप्यूटर पर: Phantom",
        text: "Windows, macOS या Linux पर Phantom डाउनलोड करें और उसे -server {address}:{port} के साथ चलाएँ। पूछे जाने पर इसे अपने फ़ायरवॉल में अनुमति दें।",
      },
      {
        name: "अपने कंसोल से जुड़ें",
        text: "अपने कंसोल पर Minecraft खोलें: Cookie Build “Worlds” टैब में (कुछ संस्करणों में “Friends” टैब में) LAN गेम के रूप में दिखेगा। जुड़ने के लिए उसे चुनें।",
      },
      {
        name: "हेल्पर खुला रखें",
        text: "कनेक्ट होते समय ऐप या प्रोग्राम खुला रखें। Phantom आपका कनेक्शन रिले करता है, इसलिए खेलते समय उसे चालू रहने दें।",
      },
    ],
    note: "BedrockTogether और Phantom थर्ड-पार्टी टूल हैं। इन्हें Cookie Build संचालित नहीं करता।",
  },
  mobile: {
    oneTap: {
      name: "एक टैप वाला बटन",
      intro: "जिस फ़ोन, टैबलेट या Windows PC पर Minecraft इंस्टॉल है, उस पर सबसे तेज़ तरीका।",
      steps: [
        {
          name: "“Minecraft में जोड़ें” पर टैप करें",
          text: "यह पेज अपने डिवाइस पर खोलें और ऊपर दिए “Minecraft में जोड़ें” बटन पर टैप करें।",
        },
        {
          name: "Minecraft को खुलने दें",
          text: "अगर आपका डिवाइस Minecraft लिंक सपोर्ट करता है, तो Minecraft खुलेगा और Cookie Build को आपके सर्वरों में जोड़ देगा।",
        },
        {
          name: "सर्वर टैब से जुड़ें",
          text: "खेलें → सर्वर चुनें, फिर जुड़ने के लिए Cookie Build चुनें।",
        },
      ],
    },
    addServer: {
      name: "सर्वर मैन्युअल रूप से जोड़ें",
      intro: "सर्वर सूची वाले हर Bedrock डिवाइस पर काम करता है: Android, iPhone, iPad और Windows।",
      steps: [
        {
          name: "सर्वर टैब खोलें",
          text: "Minecraft खोलें, खेलें चुनें, फिर सर्वर टैब खोलें।",
        },
        {
          name: "“सर्वर जोड़ें” चुनें",
          text: "सर्वर सूची में सबसे नीचे तक स्क्रॉल करें और “सर्वर जोड़ें” चुनें।",
        },
        {
          name: "विवरण डालें",
          text: "सर्वर का नाम: Cookie Build। सर्वर पता: {address}। पोर्ट: {port}।",
        },
        {
          name: "सेव करें और जुड़ें",
          text: "सेव करें, फिर जुड़ने के लिए सूची में Cookie Build चुनें।",
        },
      ],
    },
  },
  java: {
    addServer: {
      name: "सर्वर जोड़ें",
      intro: "Cookie Build को आपकी सर्वर सूची में सेव कर देता है, ताकि अगली बार आप एक क्लिक में जुड़ सकें।",
      steps: [
        {
          name: "मल्टीप्लेयर खोलें",
          text: "Minecraft Java Edition (1.8 या नया संस्करण) खोलें और मल्टीप्लेयर चुनें।",
        },
        {
          name: "सर्वर जोड़ें चुनें",
          text: "सर्वर जोड़ें चुनें, सर्वर के नाम में Cookie Build और सर्वर पते में {address} टाइप करें।",
        },
        {
          name: "Cookie Build से जुड़ें",
          text: "“Done” चुनें, फिर अपनी सर्वर सूची में Cookie Build पर डबल-क्लिक करें (या उसे चुनकर “Join Server” पर क्लिक करें)।",
        },
      ],
    },
    directConnect: {
      name: "डायरेक्ट कनेक्शन",
      intro: "सर्वर सेव किए बिना, एक बार के तेज़ कनेक्शन के लिए।",
      steps: [
        {
          name: "“Direct Connection” खोलें",
          text: "मल्टीप्लेयर मेनू में “Direct Connection” चुनें।",
        },
        {
          name: "सर्वर से जुड़ें",
          text: "{address} टाइप करें और “Join Server” चुनें।",
        },
      ],
    },
  },
  platforms: {
    playstation: {
      cardTitle: "PlayStation 4 और 5",
      cardDescription: "मुफ़्त BedrockConnect DNS तरीके या LAN हेल्पर ऐप से जुड़ें।",
      seoTitle: "PS4/PS5 पर Minecraft खेलें: Cookie Build से जुड़ें | Cookie Build",
      metaDescription: "PS4 और PS5 पर Cookie Build से जुड़ें: BedrockConnect DNS सेट करें, फिर पोर्ट 19132 पर play.cookie-build.com से कनेक्ट करें। मुफ़्त चरण-दर-चरण गाइड।",
      h1: "PS4 और PS5 पर Cookie Build से कैसे जुड़ें",
      intro: "PlayStation पर Minecraft में “Add Server” बटन नहीं होता, सिर्फ़ फ़ीचर्ड सर्वर होते हैं। फिर भी आप DNS बदलकर, या उसी Wi‑Fi पर हेल्पर ऐप से, कुछ ही मिनटों में Cookie Build से जुड़ सकते हैं।",
      tips: [
        "अपनी मौजूदा नेटवर्क सेटिंग्स बदलने से पहले उनकी फ़ोटो ले लें, ताकि उन्हें आसानी से वापस ला सकें।",
        "BedrockConnect में “Add to server list” चालू करें: अगली बार Cookie Build सूची में आपका इंतज़ार करेगा।",
        "अगर BedrockConnect मेनू बंद हो जाए, तो उसे फिर से खोलने के लिए क्राउच या पंच करें।",
        "PC नहीं है? DNS तरीके के लिए सिर्फ़ आपका कंसोल काफ़ी है।",
      ],
      faqs: [
        {
          question: "क्या मैं PS5 पर Cookie Build खेल सकता हूँ?",
          answer: "हाँ। PS4 और PS5 खिलाड़ी BedrockConnect DNS तरीके या LAN हेल्पर ऐप से जुड़ते हैं, फिर Java, मोबाइल और PC खिलाड़ियों वाले उसी सर्वर पर खेलते हैं।",
        },
        {
          question: "PlayStation पर “Add Server” बटन क्यों नहीं है?",
          answer: "कंसोल पर Minecraft सिर्फ़ फ़ीचर्ड सर्वर दिखाता है। BedrockConnect उनमें से एक को ऐसे मेनू में बदल देता है जहाँ आप कोई भी पता टाइप कर सकते हैं, जैसे पोर्ट 19132 के साथ play.cookie-build.com।",
        },
        {
          question: "क्या BedrockConnect को Cookie Build चलाता है?",
          answer: "नहीं। BedrockConnect एक मुफ़्त, ओपन-सोर्स सामुदायिक प्रोजेक्ट है, जिसे Cookie Build संचालित नहीं करता। यह गाइड सिर्फ़ बताती है कि हमारे सर्वर तक पहुँचने के लिए इसका इस्तेमाल कैसे करें।",
        },
        {
          question: "क्या मैं DNS का बदलाव वापस ले सकता हूँ?",
          answer: "हाँ। वही नेटवर्क मेनू खोलें और “DNS Settings” को वापस “Automatic” पर सेट करें। जब तक कस्टम DNS चालू है, रीडायरेक्ट होने वाले फ़ीचर्ड सर्वरों की जगह BedrockConnect खुलता है।",
        },
        {
          question: "क्या यह मुफ़्त है?",
          answer: "हाँ। Cookie Build खेलना मुफ़्त है, और BedrockConnect भी मुफ़्त है।",
        },
      ],
    },
    xbox: {
      cardTitle: "Xbox One और Series X|S",
      cardDescription: "मुफ़्त BedrockConnect DNS तरीके या LAN हेल्पर ऐप से जुड़ें।",
      seoTitle: "Xbox पर Minecraft खेलें: Cookie Build से जुड़ें | Cookie Build",
      metaDescription: "Xbox One और Series X|S पर Cookie Build से जुड़ें: BedrockConnect DNS सेट करें, फिर पोर्ट 19132 पर play.cookie-build.com से कनेक्ट करें। मुफ़्त गाइड।",
      h1: "Xbox पर Cookie Build से कैसे जुड़ें",
      intro: "Xbox पर Minecraft में “Add Server” बटन नहीं होता, सिर्फ़ फ़ीचर्ड सर्वर होते हैं। फिर भी आप DNS बदलकर, या उसी Wi‑Fi पर हेल्पर ऐप से, कुछ ही मिनटों में Cookie Build से जुड़ सकते हैं।",
      tips: [
        "अपनी मौजूदा DNS सेटिंग्स बदलने से पहले उन्हें लिख लें, ताकि उन्हें आसानी से वापस ला सकें।",
        "BedrockConnect में “Add to server list” चालू करें: अगली बार Cookie Build सूची में आपका इंतज़ार करेगा।",
        "अगर BedrockConnect मेनू बंद हो जाए, तो उसे फिर से खोलने के लिए क्राउच या पंच करें।",
        "PC नहीं है? DNS तरीके के लिए सिर्फ़ आपका कंसोल काफ़ी है।",
      ],
      faqs: [
        {
          question: "क्या यह Xbox Series X और Series S पर काम करता है?",
          answer: "हाँ। Xbox One, Series X और Series S पर चरण एक जैसे हैं।",
        },
        {
          question: "Xbox पर “Add Server” बटन क्यों नहीं है?",
          answer: "कंसोल पर Minecraft सिर्फ़ फ़ीचर्ड सर्वर दिखाता है। BedrockConnect उनमें से एक को ऐसे मेनू में बदल देता है जहाँ आप कोई भी पता टाइप कर सकते हैं, जैसे पोर्ट 19132 के साथ play.cookie-build.com।",
        },
        {
          question: "क्या BedrockConnect को Cookie Build चलाता है?",
          answer: "नहीं। BedrockConnect एक मुफ़्त, ओपन-सोर्स सामुदायिक प्रोजेक्ट है, जिसे Cookie Build संचालित नहीं करता। यह गाइड सिर्फ़ बताती है कि हमारे सर्वर तक पहुँचने के लिए इसका इस्तेमाल कैसे करें।",
        },
        {
          question: "क्या मैं DNS का बदलाव वापस ले सकता हूँ?",
          answer: "हाँ। फिर से “Settings → General → Network settings → Advanced settings → DNS settings” पर जाएँ और “Automatic” चुनें।",
        },
      ],
    },
    switch: {
      cardTitle: "Nintendo Switch",
      cardDescription: "मुफ़्त BedrockConnect DNS तरीके से जुड़ें।",
      seoTitle: "Switch पर Minecraft खेलें: Cookie Build से जुड़ें | Cookie Build",
      metaDescription: "Nintendo Switch पर Cookie Build से जुड़ें: BedrockConnect DNS सेट करें, फिर पोर्ट 19132 पर play.cookie-build.com से कनेक्ट करें। मुफ़्त चरण-दर-चरण गाइड।",
      h1: "Nintendo Switch पर Cookie Build से कैसे जुड़ें",
      intro: "Nintendo Switch पर Minecraft में “Add Server” बटन नहीं होता, सिर्फ़ फ़ीचर्ड सर्वर होते हैं। DNS में एक छोटा-सा बदलाव करके आप फिर भी Cookie Build से जुड़ सकते हैं।",
      tips: [
        "अपनी मौजूदा नेटवर्क सेटिंग्स बदलने से पहले उनकी फ़ोटो ले लें, ताकि उन्हें आसानी से वापस ला सकें।",
        "BedrockConnect में “Add to server list” चालू करें: अगली बार Cookie Build सूची में आपका इंतज़ार करेगा।",
        "अगर BedrockConnect मेनू बंद हो जाए, तो उसे फिर से खोलने के लिए क्राउच या पंच करें।",
      ],
      faqs: [
        {
          question: "क्या मैं Nintendo Switch पर Cookie Build खेल सकता हूँ?",
          answer: "हाँ। Switch खिलाड़ी BedrockConnect DNS तरीके से जुड़ते हैं, फिर Java, मोबाइल और PC खिलाड़ियों वाले उसी सर्वर पर खेलते हैं।",
        },
        {
          question: "क्या मैं BedrockTogether या Phantom जैसा LAN ऐप इस्तेमाल कर सकता हूँ?",
          answer: "Switch पर नहीं: Switch इस तरह के LAN गेम नहीं देख पाता। इसकी जगह DNS तरीका इस्तेमाल करें।",
        },
        {
          question: "क्या BedrockConnect को Cookie Build चलाता है?",
          answer: "नहीं। BedrockConnect एक मुफ़्त, ओपन-सोर्स सामुदायिक प्रोजेक्ट है, जिसे Cookie Build संचालित नहीं करता। यह गाइड सिर्फ़ बताती है कि हमारे सर्वर तक पहुँचने के लिए इसका इस्तेमाल कैसे करें।",
        },
        {
          question: "क्या मैं DNS का बदलाव वापस ले सकता हूँ?",
          answer: "हाँ। फिर से “System Settings → Internet → Internet Settings” → अपना नेटवर्क → “Change Settings” पर जाएँ और “DNS Settings” को “Automatic” पर सेट करें।",
        },
      ],
    },
    mobile: {
      cardTitle: "मोबाइल और Windows (Bedrock)",
      cardDescription: "Android, iPhone, iPad और Windows: कुछ ही टैप में सर्वर जोड़ें।",
      seoTitle: "Minecraft PE (Android/iOS) पर Cookie Build से जुड़ें | Cookie Build",
      metaDescription: "Android, iOS या Windows पर Minecraft Bedrock में Cookie Build जोड़ें: पता play.cookie-build.com, पोर्ट 19132। एक टैप वाला बटन और मैन्युअल चरण।",
      h1: "मोबाइल और Windows पर Cookie Build से कैसे जुड़ें",
      intro: "Android, iPhone, iPad और Windows पर Minecraft Bedrock में आप कोई भी सर्वर जोड़ सकते हैं। एक टैप वाला बटन इस्तेमाल करें या Cookie Build को मैन्युअल रूप से जोड़ें।",
      tips: [
        "पता और पोर्ट दो अलग-अलग फ़ील्ड में डाले जाते हैं।",
        "एक बार जोड़ने के बाद, Cookie Build आपके सर्वर टैब में बना रहता है।",
        "दोस्त कंसोल पर खेलते हैं? उन्हें PlayStation, Xbox या Switch गाइड भेजें।",
      ],
      faqs: [
        {
          question: "मुझे कौन-सा पोर्ट इस्तेमाल करना चाहिए?",
          answer: "play.cookie-build.com पते के साथ पोर्ट 19132 इस्तेमाल करें, जो Minecraft Bedrock का डिफ़ॉल्ट पोर्ट है।",
        },
        {
          question: "“Minecraft में जोड़ें” बटन काम नहीं कर रहा। मैं क्या करूँ?",
          answer: "कुछ डिवाइस या ब्राउज़र Minecraft लिंक नहीं खोलते। सर्वर मैन्युअल रूप से जोड़ें: खेलें → सर्वर → सर्वर जोड़ें।",
        },
        {
          question: "क्या यह Windows 10 और 11 पर काम करता है?",
          answer: "हाँ। Windows के लिए Minecraft (Bedrock Edition) में भी Android और iOS वाले ही चरण हैं।",
        },
        {
          question: "क्या यह Minecraft PE ही है?",
          answer: "हाँ। Minecraft Pocket Edition अब Minecraft Bedrock Edition का हिस्सा है। Cookie Build 2014 में Minecraft PE समुदाय के लिए शुरू हुआ था।",
        },
        {
          question: "क्या मैं Java खिलाड़ियों के साथ खेल सकता हूँ?",
          answer: "हाँ। Cookie Build एक क्रॉस-प्ले सर्वर है: Java और Bedrock खिलाड़ी एक ही गेम साथ खेलते हैं।",
        },
      ],
    },
    java: {
      cardTitle: "Java Edition (PC, Mac, Linux)",
      cardDescription: "मल्टीप्लेयर → सर्वर जोड़ें → play.cookie-build.com।",
      seoTitle: "Minecraft Java Edition पर Cookie Build से जुड़ें | Cookie Build",
      metaDescription: "Minecraft Java Edition पर Cookie Build से जुड़ें, 1.8 से नवीनतम रिलीज़ तक: मल्टीप्लेयर → सर्वर जोड़ें → play.cookie-build.com। पोर्ट की ज़रूरत नहीं।",
      h1: "Java Edition पर Cookie Build से कैसे जुड़ें",
      intro: "Cookie Build, Windows, macOS और Linux पर Minecraft Java Edition के 1.8 से नवीनतम रिलीज़ तक के संस्करण सपोर्ट करता है। आपको सिर्फ़ पता चाहिए।",
      tips: [
        "पोर्ट की ज़रूरत नहीं: Java Edition डिफ़ॉल्ट पोर्ट इस्तेमाल करता है।",
        "1.8 से नवीनतम रिलीज़ तक कोई भी समर्थित संस्करण चलेगा।",
        "आप Bedrock खिलाड़ियों के साथ एक ही गेम खेलते हैं।",
      ],
      faqs: [
        {
          question: "Minecraft के कौन-से संस्करण समर्थित हैं?",
          answer: "1.8 से नवीनतम रिलीज़ तक के संस्करण समर्थित हैं।",
        },
        {
          question: "क्या मुझे पोर्ट डालना होगा?",
          answer: "नहीं। Java Edition पर play.cookie-build.com काफ़ी है। पोर्ट 19132 सिर्फ़ Bedrock खिलाड़ियों के लिए है।",
        },
        {
          question: "क्या मैं Bedrock पर खेलने वाले दोस्तों के साथ खेल सकता हूँ?",
          answer: "हाँ। Cookie Build एक क्रॉस-प्ले सर्वर है: Java और Bedrock खिलाड़ी एक ही गेम साथ खेलते हैं।",
        },
        {
          question: "क्या सर्वर मुफ़्त है?",
          answer: "हाँ। Cookie Build का हर मिनी-गेम खेलना मुफ़्त है।",
        },
      ],
    },
  },
};

const ptBR: JoinGuideSource = {
  hub: {
    seoTitle: "Como entrar no Cookie Build em qualquer aparelho | Cookie Build",
    metaDescription: "Guias passo a passo para entrar no Cookie Build no PS4/PS5, Xbox, Switch, celular e Java. Endereço: play.cookie-build.com, porta Bedrock 19132.",
    eyebrow: "Guias de conexão",
    h1: "Como entrar no Cookie Build",
    intro: "Cookie Build é um servidor gratuito de minijogos de Minecraft para Java e Bedrock. Escolha seu aparelho para ver o guia passo a passo.",
    platformsHeading: "Escolha seu aparelho",
    cardCta: "Abrir o guia",
    addressHeading: "Dados do servidor",
    addressBody: "Na Java, você só precisa do endereço. No Bedrock, você digita o endereço e a porta em dois campos separados.",
  },
  ui: {
    breadcrumbLabel: "Trilha de navegação",
    home: "Início",
    join: "Como entrar",
    addressHeading: "Dados do servidor",
    bedrockAddressBody: "Digite o endereço e a porta em dois campos separados: o Minecraft Bedrock não aceita “endereço:porta” em um único campo.",
    javaAddressBody: "A Java Edition usa a porta padrão, então basta o endereço.",
    methodsHeading: "Passo a passo",
    recommended: "Recomendado",
    linksLabel: "Links",
    undoHeading: "Como desfazer",
    dnsServersHeading: "Endereços DNS do BedrockConnect",
    primaryDnsLabel: "DNS primário",
    secondaryDnsLabel: "DNS secundário",
    alternativeDnsLabel: "Outros servidores DNS da comunidade para tentar se o primário não funcionar",
    dnsSource: "Fonte: README do BedrockConnect, verificado em {date}.",
    tipsHeading: "Dicas",
    faqHeading: "Perguntas frequentes",
    otherGuidesHeading: "Joga em outro aparelho?",
    helpHeading: "Precisa de ajuda?",
    helpBody: "Entre no nosso servidor do Discord: jogadores e equipe podem ajudar você a se conectar.",
    discordCta: "Entrar no Discord",
    backToHub: "Todos os guias de conexão",
    addToMinecraft: "Adicionar ao Minecraft",
    addToMinecraftNote: "Abra esta página no aparelho em que o Minecraft está instalado. Se nada acontecer, siga os passos manuais abaixo.",
  },
  dns: {
    name: "Método DNS do BedrockConnect",
    intro: "BedrockConnect é um serviço gratuito e de código aberto da comunidade que transforma um servidor em destaque em um menu onde você pode digitar o endereço de qualquer servidor. Ele não é operado pelo Cookie Build.",
    configure: {
      playstation: [
        {
          name: "Abra as configurações de rede",
          text: "PS5: Configurações → Rede → Configurações → Configurar conexão com a Internet, destaque sua conexão atual e abra Configurações avançadas. PS4: Configurações → Rede → Configurar conexão com a Internet → Wi‑Fi ou cabo LAN → Personalizado → sua rede, depois escolha Automático em Configurações de endereço IP e Não especificar em Nome de host DHCP.",
        },
        {
          name: "Defina um DNS manual",
          text: "Defina Configurações de DNS como Manual. Digite {primary} como DNS primário e {secondary} como DNS secundário.",
        },
        {
          name: "Salve e teste",
          text: "PS5: selecione OK e aguarde o teste de conexão. PS4: escolha Automático em Configurações de MTU e Não usar em Servidor proxy, depois teste a conexão.",
        },
      ],
      xbox: [
        {
          name: "Abra as configurações de rede",
          text: "Vá em Configurações → Geral → Configurações de rede → Configurações avançadas → Configurações de DNS e escolha Manual.",
        },
        {
          name: "Digite os endereços DNS",
          text: "Digite {primary} como DNS IPv4 primário e {secondary} como DNS IPv4 secundário.",
        },
        {
          name: "Salve",
          text: "Confirme os endereços e volte para a tela de configurações de rede.",
        },
      ],
      switch: [
        {
          name: "Abra as configurações de rede",
          text: "Vá em Configurações do console → Internet → Configurações de internet, selecione sua rede e escolha Alterar configurações.",
        },
        {
          name: "Defina um DNS manual",
          text: "Defina Configurações de DNS como Manual. Digite {primary} como DNS primário e {secondary} como DNS secundário.",
        },
        {
          name: "Salve e teste",
          text: "Selecione Salvar e depois teste a conexão.",
        },
      ],
    },
    play: [
      {
        name: "Abra a aba Servidores",
        text: "Abra o Minecraft, selecione Jogar e depois abra a aba Servidores.",
      },
      {
        name: "Entre em um servidor em destaque",
        text: "Entre em um dos servidores em destaque que o BedrockConnect consegue redirecionar ({featured}). Em vez desse servidor, abre a lista de servidores do BedrockConnect.",
      },
      {
        name: "Escolha “Connect to a Server”",
        text: "No menu do BedrockConnect (sempre em inglês), selecione “Connect to a Server”.",
      },
      {
        name: "Digite os dados do Cookie Build",
        text: "Digite {address} em “Server Address” e {port} em “Server Port”. Ative “Add to server list” para encontrar o Cookie Build na lista da próxima vez.",
      },
      {
        name: "Entre no Cookie Build",
        text: "Envie o formulário: o BedrockConnect leva você direto para o Cookie Build.",
      },
    ],
    note: "Enquanto o DNS personalizado estiver ativo, os servidores em destaque redirecionados abrem o BedrockConnect no lugar deles. Se {primary} não funcionar, tente um dos outros servidores DNS da comunidade listados abaixo.",
    undo: {
      playstation: "Abra o mesmo menu de rede e volte Configurações de DNS para Automático. No PS4, você também pode executar Configurar conexão com a Internet de novo e escolher Fácil.",
      xbox: "Vá em Configurações → Geral → Configurações de rede → Configurações avançadas → Configurações de DNS e escolha Automático.",
      switch: "Vá em Configurações do console → Internet → Configurações de internet → sua rede → Alterar configurações e volte Configurações de DNS para Automático.",
    },
  },
  lan: {
    name: "App auxiliar LAN (mesmo Wi‑Fi)",
    intro: "Um celular ou computador na mesma rede do seu console pode fazer o Cookie Build aparecer como um jogo local (LAN).",
    steps: [
      {
        name: "Use a mesma rede",
        text: "Conecte seu celular ou computador ao mesmo Wi‑Fi ou rede doméstica do seu console.",
      },
      {
        name: "No celular: BedrockTogether",
        text: "No Android ou iOS, instale o BedrockTogether, digite {address} e a porta {port} e toque em “Run”.",
      },
      {
        name: "Ou no computador: Phantom",
        text: "No Windows, macOS ou Linux, baixe o Phantom e inicie-o com -server {address}:{port}. Se for solicitado, libere-o no firewall.",
      },
      {
        name: "Entre pelo console",
        text: "Abra o Minecraft no console: o Cookie Build aparece como um jogo LAN na aba Mundos (a aba Amigos em algumas versões). Selecione-o para entrar.",
      },
      {
        name: "Mantenha o app auxiliar aberto",
        text: "Deixe o app ou programa aberto enquanto você se conecta. O Phantom retransmite sua conexão, então deixe-o rodando enquanto você joga.",
      },
    ],
    note: "BedrockTogether e Phantom são ferramentas de terceiros. Eles não são operados pelo Cookie Build.",
  },
  mobile: {
    oneTap: {
      name: "Botão de um toque",
      intro: "O jeito mais rápido em um celular, tablet ou PC com Windows que tenha o Minecraft instalado.",
      steps: [
        {
          name: "Toque em “Adicionar ao Minecraft”",
          text: "Abra esta página no seu aparelho e toque no botão “Adicionar ao Minecraft” acima.",
        },
        {
          name: "Deixe o Minecraft abrir",
          text: "Se o seu aparelho aceitar links do Minecraft, o Minecraft abre e adiciona o Cookie Build aos seus servidores.",
        },
        {
          name: "Entre pela aba Servidores",
          text: "Selecione Jogar → Servidores e escolha Cookie Build para entrar.",
        },
      ],
    },
    addServer: {
      name: "Adicionar o servidor manualmente",
      intro: "Funciona em todo aparelho Bedrock com lista de servidores: Android, iPhone, iPad e Windows.",
      steps: [
        {
          name: "Abra a aba Servidores",
          text: "Abra o Minecraft, selecione Jogar e depois abra a aba Servidores.",
        },
        {
          name: "Selecione “Adicionar servidor”",
          text: "Role até o fim da lista de servidores e selecione “Adicionar servidor”.",
        },
        {
          name: "Digite os dados",
          text: "Nome do servidor: Cookie Build. Endereço do servidor: {address}. Porta: {port}.",
        },
        {
          name: "Salve e entre",
          text: "Selecione Salvar e escolha Cookie Build na lista para entrar.",
        },
      ],
    },
  },
  java: {
    addServer: {
      name: "Adicionar servidor",
      intro: "Salva o Cookie Build na sua lista de servidores para você entrar com um clique da próxima vez.",
      steps: [
        {
          name: "Abra Multijogador",
          text: "Abra o Minecraft Java Edition (1.8 ou mais recente) e selecione Multijogador.",
        },
        {
          name: "Selecione Adicionar servidor",
          text: "Selecione Adicionar servidor, digite Cookie Build como nome do servidor e {address} como endereço do servidor.",
        },
        {
          name: "Entre no Cookie Build",
          text: "Selecione Concluído e clique duas vezes em Cookie Build na sua lista de servidores (ou selecione-o e clique em Entrar no servidor).",
        },
      ],
    },
    directConnect: {
      name: "Conexão direta",
      intro: "Para uma conexão rápida e avulsa, sem salvar o servidor.",
      steps: [
        {
          name: "Abra Conexão direta",
          text: "No menu Multijogador, selecione Conexão direta.",
        },
        {
          name: "Entre no servidor",
          text: "Digite {address} e selecione Entrar no servidor.",
        },
      ],
    },
  },
  platforms: {
    playstation: {
      cardTitle: "PlayStation 4 e 5",
      cardDescription: "Entre com o método DNS gratuito do BedrockConnect ou um app auxiliar LAN.",
      seoTitle: "Minecraft no PS4/PS5: entre no Cookie Build | Cookie Build",
      metaDescription: "Entre no Cookie Build no PS4 e PS5: configure o DNS do BedrockConnect e conecte-se a play.cookie-build.com na porta 19132. Guia gratuito passo a passo.",
      h1: "Como entrar no Cookie Build no PS4 e PS5",
      intro: "O Minecraft no PlayStation não tem o botão “Adicionar servidor”, só servidores em destaque. Mesmo assim, você entra no Cookie Build em poucos minutos com uma mudança de DNS ou com um app auxiliar no mesmo Wi‑Fi.",
      tips: [
        "Tire uma foto das suas configurações de rede atuais antes de mudá-las, para restaurá-las com facilidade.",
        "No BedrockConnect, ative “Add to server list”: da próxima vez, o Cookie Build já estará na lista.",
        "Se o menu do BedrockConnect fechar, agache ou dê um soco para abri-lo de novo.",
        "Sem PC? O método DNS só precisa do seu console.",
      ],
      faqs: [
        {
          question: "Posso jogar Cookie Build no PS5?",
          answer: "Sim. Quem joga no PS4 e PS5 entra com o método DNS do BedrockConnect ou um app auxiliar LAN e joga no mesmo servidor que os jogadores de Java, celular e PC.",
        },
        {
          question: "Por que não existe o botão “Adicionar servidor” no PlayStation?",
          answer: "O Minecraft nos consoles só mostra servidores em destaque. O BedrockConnect transforma um deles em um menu onde você pode digitar qualquer endereço, como play.cookie-build.com com a porta 19132.",
        },
        {
          question: "O BedrockConnect é do Cookie Build?",
          answer: "Não. O BedrockConnect é um projeto gratuito e de código aberto da comunidade, que o Cookie Build não opera. Este guia só explica como usá-lo para chegar ao nosso servidor.",
        },
        {
          question: "Posso desfazer a mudança de DNS?",
          answer: "Sim. Abra o mesmo menu de rede e volte Configurações de DNS para Automático. Enquanto o DNS personalizado estiver ativo, os servidores em destaque redirecionados abrem o BedrockConnect no lugar deles.",
        },
        {
          question: "É grátis?",
          answer: "Sim. O Cookie Build é gratuito, e o BedrockConnect também.",
        },
      ],
    },
    xbox: {
      cardTitle: "Xbox One e Series X|S",
      cardDescription: "Entre com o método DNS gratuito do BedrockConnect ou um app auxiliar LAN.",
      seoTitle: "Minecraft no Xbox: entre no Cookie Build | Cookie Build",
      metaDescription: "Entre no Cookie Build no Xbox One e Series X|S: configure o DNS do BedrockConnect e conecte-se a play.cookie-build.com na porta 19132. Guia gratuito.",
      h1: "Como entrar no Cookie Build no Xbox",
      intro: "O Minecraft no Xbox não tem o botão “Adicionar servidor”, só servidores em destaque. Mesmo assim, você entra no Cookie Build em poucos minutos com uma mudança de DNS ou com um app auxiliar no mesmo Wi‑Fi.",
      tips: [
        "Anote suas configurações de DNS atuais antes de mudá-las, para restaurá-las com facilidade.",
        "No BedrockConnect, ative “Add to server list”: da próxima vez, o Cookie Build já estará na lista.",
        "Se o menu do BedrockConnect fechar, agache ou dê um soco para abri-lo de novo.",
        "Sem PC? O método DNS só precisa do seu console.",
      ],
      faqs: [
        {
          question: "Funciona no Xbox Series X e Series S?",
          answer: "Sim. Os passos são os mesmos no Xbox One, Series X e Series S.",
        },
        {
          question: "Por que não existe o botão “Adicionar servidor” no Xbox?",
          answer: "O Minecraft nos consoles só mostra servidores em destaque. O BedrockConnect transforma um deles em um menu onde você pode digitar qualquer endereço, como play.cookie-build.com com a porta 19132.",
        },
        {
          question: "O BedrockConnect é do Cookie Build?",
          answer: "Não. O BedrockConnect é um projeto gratuito e de código aberto da comunidade, que o Cookie Build não opera. Este guia só explica como usá-lo para chegar ao nosso servidor.",
        },
        {
          question: "Posso desfazer a mudança de DNS?",
          answer: "Sim. Volte em Configurações → Geral → Configurações de rede → Configurações avançadas → Configurações de DNS e escolha Automático.",
        },
      ],
    },
    switch: {
      cardTitle: "Nintendo Switch",
      cardDescription: "Entre com o método DNS gratuito do BedrockConnect.",
      seoTitle: "Minecraft no Switch: entre no Cookie Build | Cookie Build",
      metaDescription: "Entre no Cookie Build no Nintendo Switch: configure o DNS do BedrockConnect e conecte-se a play.cookie-build.com na porta 19132. Guia passo a passo.",
      h1: "Como entrar no Cookie Build no Nintendo Switch",
      intro: "O Minecraft no Nintendo Switch não tem o botão “Adicionar servidor”, só servidores em destaque. Uma mudança rápida de DNS permite que você entre no Cookie Build mesmo assim.",
      tips: [
        "Tire uma foto das suas configurações de rede atuais antes de mudá-las, para restaurá-las com facilidade.",
        "No BedrockConnect, ative “Add to server list”: da próxima vez, o Cookie Build já estará na lista.",
        "Se o menu do BedrockConnect fechar, agache ou dê um soco para abri-lo de novo.",
      ],
      faqs: [
        {
          question: "Posso jogar Cookie Build no Nintendo Switch?",
          answer: "Sim. Quem joga no Switch entra com o método DNS do BedrockConnect e joga no mesmo servidor que os jogadores de Java, celular e PC.",
        },
        {
          question: "Posso usar um app LAN como BedrockTogether ou Phantom?",
          answer: "Não no Switch: o Switch não enxerga esse tipo de jogo LAN. Use o método DNS.",
        },
        {
          question: "O BedrockConnect é do Cookie Build?",
          answer: "Não. O BedrockConnect é um projeto gratuito e de código aberto da comunidade, que o Cookie Build não opera. Este guia só explica como usá-lo para chegar ao nosso servidor.",
        },
        {
          question: "Posso desfazer a mudança de DNS?",
          answer: "Sim. Volte em Configurações do console → Internet → Configurações de internet → sua rede → Alterar configurações e defina Configurações de DNS como Automático.",
        },
      ],
    },
    mobile: {
      cardTitle: "Celular e Windows (Bedrock)",
      cardDescription: "Android, iPhone, iPad e Windows: adicione o servidor em poucos toques.",
      seoTitle: "Entre no Cookie Build no Minecraft PE (Android/iOS) | Cookie Build",
      metaDescription: "Adicione o Cookie Build ao Minecraft Bedrock no Android, iOS ou Windows: endereço play.cookie-build.com, porta 19132. Botão de um toque e passos manuais.",
      h1: "Como entrar no Cookie Build no celular e no Windows",
      intro: "No Android, iPhone, iPad e Windows, o Minecraft Bedrock permite adicionar qualquer servidor. Use o botão de um toque ou adicione o Cookie Build manualmente.",
      tips: [
        "O endereço e a porta vão em dois campos separados.",
        "Depois de adicionado, o Cookie Build fica na sua aba Servidores.",
        "Tem amigos no console? Mande para eles o guia de PlayStation, Xbox ou Switch.",
      ],
      faqs: [
        {
          question: "Qual porta devo usar?",
          answer: "Use a porta 19132, a porta padrão do Minecraft Bedrock, com o endereço play.cookie-build.com.",
        },
        {
          question: "O botão “Adicionar ao Minecraft” não funciona. O que eu faço?",
          answer: "Alguns aparelhos ou navegadores não abrem links do Minecraft. Adicione o servidor manualmente: Jogar → Servidores → Adicionar servidor.",
        },
        {
          question: "Funciona no Windows 10 e 11?",
          answer: "Sim. O Minecraft para Windows (Bedrock Edition) segue os mesmos passos do Android e iOS.",
        },
        {
          question: "É o mesmo que o Minecraft PE?",
          answer: "Sim. O Minecraft Pocket Edition agora faz parte do Minecraft Bedrock Edition. O Cookie Build começou em 2014 para a comunidade Minecraft PE.",
        },
        {
          question: "Posso jogar com quem está na Java?",
          answer: "Sim. O Cookie Build é um servidor multiplataforma: jogadores de Java e Bedrock compartilham os mesmos jogos.",
        },
      ],
    },
    java: {
      cardTitle: "Java Edition (PC, Mac, Linux)",
      cardDescription: "Multijogador → Adicionar servidor → play.cookie-build.com.",
      seoTitle: "Entre no Cookie Build no Minecraft Java Edition | Cookie Build",
      metaDescription: "Entre no Cookie Build no Minecraft Java Edition, da 1.8 à versão mais recente: Multijogador → Adicionar servidor → play.cookie-build.com. Sem porta.",
      h1: "Como entrar no Cookie Build na Java Edition",
      intro: "O Cookie Build aceita o Minecraft Java Edition da 1.8 até a versão mais recente, no Windows, macOS e Linux. Você só precisa do endereço.",
      tips: [
        "Não precisa de porta: a Java Edition usa a porta padrão.",
        "Qualquer versão compatível, da 1.8 até a mais recente, funciona.",
        "Você joga os mesmos jogos que os jogadores de Bedrock.",
      ],
      faqs: [
        {
          question: "Quais versões do Minecraft são compatíveis?",
          answer: "As versões compatíveis vão da 1.8 até a mais recente.",
        },
        {
          question: "Preciso digitar uma porta?",
          answer: "Não. Na Java Edition, basta play.cookie-build.com. A porta 19132 é só para jogadores de Bedrock.",
        },
        {
          question: "Posso jogar com amigos no Bedrock?",
          answer: "Sim. O Cookie Build é um servidor multiplataforma: jogadores de Java e Bedrock compartilham os mesmos jogos.",
        },
        {
          question: "O servidor é gratuito?",
          answer: "Sim. Todos os minijogos do Cookie Build são gratuitos.",
        },
      ],
    },
  },
};
// JOIN_GUIDE_SOURCES_END

const JOIN_GUIDE_SOURCES: Record<SiteLocaleCode, JoinGuideSource> = {
  en,
  fr,
  de,
  it,
  bg,
  es,
  hi,
  "pt-BR": ptBR,
};

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function fillSteps(steps: JoinGuideStep[], values: Record<string, string>): JoinGuideStep[] {
  return steps.map((step) => ({ name: fill(step.name, values), text: fill(step.text, values) }));
}

function placeholderValues(platform: JoinPlatformId): Record<string, string> {
  return {
    address: COOKIE_BUILD_SERVER_IP,
    port: COOKIE_BUILD_BEDROCK_PORT,
    primary: isJoinConsole(platform) ? bedrockConnectPrimaryDns(platform) : BEDROCK_CONNECT_DNS.primary,
    secondary: BEDROCK_CONNECT_DNS.secondary,
    featured: BEDROCK_CONNECT_REDIRECT_SERVERS.join(", "),
    date: BEDROCK_CONNECT_DNS.checkedAt,
  };
}

function buildMethods(source: JoinGuideSource, platform: JoinPlatformId): JoinGuideMethod[] {
  const values = placeholderValues(platform);
  if (platform === "mobile") {
    return [
      { id: "one-tap", recommended: true, name: source.mobile.oneTap.name, intro: source.mobile.oneTap.intro, steps: fillSteps(source.mobile.oneTap.steps, values) },
      { id: "add-server", name: source.mobile.addServer.name, intro: source.mobile.addServer.intro, steps: fillSteps(source.mobile.addServer.steps, values) },
    ];
  }
  if (platform === "java") {
    return [
      { id: "add-server", recommended: true, name: source.java.addServer.name, intro: source.java.addServer.intro, steps: fillSteps(source.java.addServer.steps, values) },
      { id: "direct-connect", name: source.java.directConnect.name, intro: source.java.directConnect.intro, steps: fillSteps(source.java.directConnect.steps, values) },
    ];
  }

  const methods: JoinGuideMethod[] = [
    {
      id: "dns",
      recommended: true,
      name: source.dns.name,
      intro: source.dns.intro,
      steps: fillSteps([...source.dns.configure[platform], ...source.dns.play], values),
      note: fill(source.dns.note, values),
      undo: fill(source.dns.undo[platform], values),
      links: [{ label: "BedrockConnect", href: BEDROCK_CONNECT_URL }],
    },
  ];
  // The Switch cannot see LAN games, and neither LAN tool supports it.
  if (platform !== "switch") {
    methods.push({
      id: "lan",
      name: source.lan.name,
      intro: source.lan.intro,
      steps: fillSteps(source.lan.steps, values),
      note: fill(source.lan.note, values),
      links: JOIN_LAN_TOOLS.map((tool) => ({ label: tool.name, href: tool.href })),
    });
  }
  return methods;
}

function buildJoinGuideCopy(source: JoinGuideSource): JoinGuideCopy {
  const values = placeholderValues("mobile");
  const platforms = Object.fromEntries(
    JOIN_PLATFORMS.map((platform) => {
      const platformSource = source.platforms[platform];
      const platformValues = placeholderValues(platform);
      const guide: JoinPlatformGuide = {
        id: platform,
        cardTitle: platformSource.cardTitle,
        cardDescription: fill(platformSource.cardDescription, platformValues),
        seoTitle: platformSource.seoTitle,
        metaDescription: fill(platformSource.metaDescription, platformValues),
        h1: platformSource.h1,
        intro: fill(platformSource.intro, platformValues),
        methods: buildMethods(source, platform),
        tips: platformSource.tips.map((tip) => fill(tip, platformValues)),
        faqs: platformSource.faqs.map((faq) => ({ question: fill(faq.question, platformValues), answer: fill(faq.answer, platformValues) })),
      };
      return [platform, guide];
    }),
  ) as Record<JoinPlatformId, JoinPlatformGuide>;

  return {
    hub: source.hub,
    ui: { ...source.ui, dnsSource: fill(source.ui.dnsSource, values) },
    platforms,
  };
}

export const JOIN_GUIDE_COPY: Record<SiteLocaleCode, JoinGuideCopy> = Object.fromEntries(
  Object.entries(JOIN_GUIDE_SOURCES).map(([code, source]) => [code, buildJoinGuideCopy(source)]),
) as Record<SiteLocaleCode, JoinGuideCopy>;
