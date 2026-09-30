export const COSMETIC_SLOTS = [
  "BADGE",
  "HUB_TRAIL",
  "EMOTE",
  "VICTORY_EFFECT",
  "PROFILE_FRAME",
  "LOBBY_FLIGHT",
  "JOIN_FLAIR",
] as const;

export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

type PlatformSupport = {
  mode: "native" | "text_fallback" | "web_only";
  implementation: string;
  fallback: string | null;
};

export const COSMETIC_CATALOG = [
  {
    id: "supporter_badge",
    slot: "BADGE",
    name: "Insigne Supporter",
    description: "Un titre purement visuel affiché dans la tab-list et le chat tant que ton accès le permet.",
    preview: { kind: "badge", label: "SUPPORTER" },
    platformSupport: {
      java: {
        mode: "native",
        implementation: "Tab-list Adventure ★ Supporter <player> et préfixe chat [Supporter] devant le displayName original",
        fallback: null,
      },
      bedrock: {
        mode: "native",
        implementation: "Composants Adventure de tab-list et chat transmis à Bedrock par Geyser, avec état Cumulus",
        fallback: "Aucun substitut de gameplay si le client n’affiche pas ces composants texte.",
      },
    },
  },
  {
    id: "cookie_crumb_trail",
    slot: "HUB_TRAIL",
    name: "Trace Miettes de cookie",
    description: "Une trace discrète de miettes pendant tes déplacements dans le hub.",
    preview: { kind: "trail", label: "Miettes" },
    platformSupport: {
      java: {
        mode: "native",
        implementation: "Paper FALLING_HONEY, une particule par pas significatif, hub LOBBY uniquement",
        fallback: null,
      },
      bedrock: {
        mode: "native",
        implementation: "Particule FALLING_HONEY transmise par le mapping Geyser",
        fallback: "Le paquet visuel est ignoré proprement si le client ne sait pas le rendre.",
      },
    },
  },
  {
    id: "cookie_cheer",
    slot: "EMOTE",
    name: "Célébration Cookie Cheer",
    description: "Une courte célébration visuelle à déclencher dans le hub, avec un délai de 10 secondes.",
    preview: { kind: "emote", label: "Cookie Cheer" },
    platformSupport: {
      java: {
        mode: "native",
        implementation: "Swing main hand, 8 HAPPY_VILLAGER et son ENTITY_PLAYER_LEVELUP, hub, cooldown 10 s",
        fallback: null,
      },
      bedrock: {
        mode: "native",
        implementation: "Animation, particules et son Paper transmis par Geyser",
        fallback: "Les paquets non pris en charge peuvent être omis sans modifier le gameplay.",
      },
    },
  },
  {
    id: "golden_cookie_burst",
    slot: "VICTORY_EFFECT",
    name: "Éclat Cookie doré",
    description: "Un éclat de particules non compétitif joué après une victoire confirmée.",
    preview: { kind: "burst", label: "Victoire" },
    platformSupport: {
      java: {
        mode: "native",
        implementation: "18 FIREWORK et son ENTITY_FIREWORK_ROCKET_BLAST, sans entité ni dégâts, cooldown 3 s",
        fallback: null,
      },
      bedrock: {
        mode: "native",
        implementation: "Particules et son Paper transmis par Geyser après victoire confirmée",
        fallback: "Les paquets visuels non pris en charge sont omis sans entité ni impact de jeu.",
      },
    },
  },
  {
    id: "supporter_profile_frame",
    slot: "PROFILE_FRAME",
    name: "Cadre Biscuit doré",
    description: "Un cadre chaud et sobre sur ta fiche de statistiques web lorsqu’il est sélectionné et actif.",
    preview: { kind: "frame", label: "Profil" },
    platformSupport: {
      java: {
        mode: "web_only",
        implementation: "Cadre rendu sur la fiche joueur publique du site Cookie Build",
        fallback: "Aucun effet en jeu.",
      },
      bedrock: {
        mode: "web_only",
        implementation: "Cadre rendu sur la fiche joueur publique du site Cookie Build",
        fallback: "Aucun effet en jeu.",
      },
    },
  },
  {
    id: "lobby_flight",
    slot: "LOBBY_FLIGHT",
    name: "Vol du lobby",
    description: "Active le vol uniquement dans le lobby, jamais en arène ni dans un mode compétitif.",
    preview: { kind: "flight", label: "Vol lobby" },
    platformSupport: {
      java: {
        mode: "native",
        implementation: "Paper allowFlight/flying dans le lobby uniquement, retiré avant toute arène",
        fallback: "Les modes creative et staff conservent leurs propres autorisations.",
      },
      bedrock: {
        mode: "native",
        implementation: "Autorisation de vol Paper transmise au client Bedrock par Geyser dans le lobby",
        fallback: "Le vol est désactivé si l’autorisation client ne peut pas être appliquée.",
      },
    },
  },
  {
    id: "supporter_join_flair",
    slot: "JOIN_FLAIR",
    name: "Éclat d’arrivée Supporter",
    description: "Six particules lumineuses et un carillon local, une seule fois par connexion autorisée.",
    preview: { kind: "join-flair", label: "Arrivée" },
    platformSupport: {
      java: {
        mode: "native",
        implementation: "6 END_ROD et son BLOCK_NOTE_BLOCK_CHIME local, une fois par connexion",
        fallback: null,
      },
      bedrock: {
        mode: "native",
        implementation: "END_ROD mappé minecraft:endrod et carillon Bedrock NOTE/note.chime via Geyser",
        fallback: "Les paquets non rendus sont ignorés sans message global ni effet de jeu.",
      },
    },
  },
  {
    id: "cookie_sparkle_trail",
    slot: "HUB_TRAIL",
    free: true,
    name: "Étincelles de cookie",
    nameEn: "Cookie Sparkles",
    description: "Une petite étincelle lumineuse pendant tes déplacements dans le lobby, offerte à tous les joueurs.",
    preview: { kind: "sparkle-trail", label: "Étincelles" },
    platformSupport: {
      java: { mode: "native", implementation: "Une particule END_ROD par déplacement significatif dans le lobby", fallback: null },
      bedrock: { mode: "native", implementation: "END_ROD transmis par Geyser via minecraft:endrod", fallback: "Le rendu peut varier selon le client, sans effet sur le gameplay." },
    },
  },
] as const satisfies ReadonlyArray<{
  id: string;
  free?: boolean;
  nameEn?: string;
  slot: CosmeticSlot;
  name: string;
  description: string;
  preview: { kind: string; label: string };
  platformSupport: { java: PlatformSupport; bedrock: PlatformSupport };
}>;

export type CosmeticId = (typeof COSMETIC_CATALOG)[number]["id"];

type GameplayCosmetic = {
  id: string;
  nameEn: string;
  slot: CosmeticSlot;
  name: string;
  description: string;
  preview: { kind: string; label: string };
  platformSupport: { java: PlatformSupport; bedrock: PlatformSupport };
};

const LOBBY_TRAIL_SUPPORT = (particle: string) => ({
  java: { mode: "native", implementation: `Particule ${particle} par déplacement significatif, lobby uniquement`, fallback: null },
  bedrock: { mode: "native", implementation: `${particle} transmis par Geyser`, fallback: "Le rendu peut varier selon le client, sans effet sur le gameplay." },
}) as const;

/**
 * Coin-shop cosmetics: bought in game with earned coins only (prices are
 * server-side constants in CookieDough), never sold for money on the website.
 */
export const COIN_COSMETICS = [
  {
    id: "note_trail",
    slot: "HUB_TRAIL",
    acquisition: "coins",
    coinPrice: 1_000,
    name: "Trace musicale",
    nameEn: "Music trail",
    description: "De petites notes de musique suivent tes pas dans le lobby. À acheter en jeu avec tes pièces.",
    preview: { kind: "trail", label: "Notes" },
    platformSupport: LOBBY_TRAIL_SUPPORT("NOTE"),
  },
  {
    id: "heart_trail",
    slot: "HUB_TRAIL",
    acquisition: "coins",
    coinPrice: 2_500,
    name: "Trace de cœurs",
    nameEn: "Heart trail",
    description: "Des cœurs flottent derrière toi dans le lobby. À acheter en jeu avec tes pièces.",
    preview: { kind: "trail", label: "Cœurs" },
    platformSupport: LOBBY_TRAIL_SUPPORT("HEART"),
  },
] as const satisfies ReadonlyArray<GameplayCosmetic & { acquisition: "coins"; coinPrice: number }>;

/**
 * Reward-only cosmetics: never sold and never listed by the shop, but owned
 * through an entitlement and shown/selectable in the player's inventory.
 * IDs must match the gameplay plugin catalog and the database constraints.
 */
export const REWARD_COSMETICS = [
  {
    id: "app_companion_badge",
    slot: "BADGE",
    acquisition: "reward",
    rewardOnly: true,
    name: "Badge Appli 📱",
    nameEn: "App badge 📱",
    description: "Tag [App] dans le chat et la liste des joueurs, offert une seule fois quand tu relies ton compte à l’application Cookie Build.",
    preview: { kind: "badge", label: "[App]" },
    platformSupport: {
      java: {
        mode: "native",
        implementation: "Tag [App] dans la tab-list et le chat, comme l’insigne Supporter",
        fallback: null,
      },
      bedrock: {
        mode: "native",
        implementation: "Composants texte de tab-list et chat transmis à Bedrock par Geyser",
        fallback: "Le texte s’affiche avec la police du client.",
      },
    },
  },
  {
    id: "streak_star_trail",
    slot: "HUB_TRAIL",
    acquisition: "reward",
    rewardOnly: true,
    name: "Trace d’étoiles filantes",
    nameEn: "Shooting star trail",
    description: "Réservée aux joueurs fidèles : débloquée au 7e jour du calendrier de connexion en jeu.",
    preview: { kind: "trail", label: "Étoiles" },
    platformSupport: LOBBY_TRAIL_SUPPORT("FIREWORK"),
  },
] as const satisfies ReadonlyArray<GameplayCosmetic & { acquisition: "reward"; rewardOnly: true }>;

export type RewardCosmeticId = (typeof REWARD_COSMETICS)[number]["id"];
export type CoinCosmeticId = (typeof COIN_COSMETICS)[number]["id"];

/** Every cosmetic a player can own: shop items, in-game coin items and reward-only items. */
export const OWNABLE_COSMETICS = [...COSMETIC_CATALOG, ...COIN_COSMETICS, ...REWARD_COSMETICS] as const;

const COLLECTION_COSMETICS = [
  "cookie_crumb_trail",
  "cookie_cheer",
  "golden_cookie_burst",
  "supporter_profile_frame",
] as const satisfies ReadonlyArray<CosmeticId>;

const SUBSCRIPTION_COSMETICS = [
  "supporter_badge",
  "lobby_flight",
  "supporter_join_flair",
  "supporter_profile_frame",
] as const satisfies ReadonlyArray<CosmeticId>;

export const COSMETIC_PRODUCTS = [
  {
    id: "supporter_monthly",
    productVersion: 1,
    kind: "supporter_subscription",
    name: "Supporter mensuel",
    description: "Insigne, vol du lobby, éclat d’arrivée et cadre web pendant l’abonnement actif.",
    priceTtcCents: 100,
    access: "subscription",
    recurrence: { unit: "month", interval: 1, isoPeriod: "P1M" },
    grants: [...SUBSCRIPTION_COSMETICS],
  },
  {
    // v2: the one-time purchase now includes everything the monthly plan
    // includes, permanently (v1 granted only the badge, less than 1 €/month).
    id: "supporter_permanent",
    productVersion: 2,
    kind: "supporter_rank",
    name: "Supporter permanent",
    description: "Achat unique : insigne, vol du lobby, éclat d’arrivée et cadre web, pour toujours. Aucun avantage de jeu.",
    priceTtcCents: 499,
    access: "permanent",
    recurrence: null,
    grants: [...SUBSCRIPTION_COSMETICS],
  },
  ...COLLECTION_COSMETICS.map((cosmeticId) => {
    const cosmetic = COSMETIC_CATALOG.find((item) => item.id === cosmeticId)!;
    return {
      id: `individual_${cosmeticId}`,
      productVersion: 1,
      kind: "individual_cosmetic" as const,
      name: cosmetic.name,
      description: "Achat unique avec accès permanent. Aucun avantage compétitif.",
      priceTtcCents: 199,
      access: "permanent" as const,
      recurrence: null,
      grants: [cosmeticId],
    };
  }),
  {
    id: "first_collection_pack",
    productVersion: 1,
    kind: "collection_pack",
    name: "Pack Première collection",
    description: "Trace, célébration, effet de victoire et cadre avec accès permanent. L’insigne est exclu.",
    priceTtcCents: 399,
    access: "permanent",
    recurrence: null,
    grants: [...COLLECTION_COSMETICS],
  },
  ...([249, 499, 999] as const).map((priceTtcCents) => ({
    id: `voluntary_support_${priceTtcCents}`,
    productVersion: 1,
    kind: "voluntary_support" as const,
    name: `Soutien libre ${(priceTtcCents / 100).toFixed(2).replace(".", ",")} €`,
    description: "Soutien sans objet, rang ni avantage exclusif en contrepartie.",
    priceTtcCents,
    access: "none" as const,
    recurrence: null,
    grants: [] as CosmeticId[],
  })),
] as const;

export const COSMETIC_CATALOG_RESPONSE = {
  availability: "coming_soon" as const,
  purchaseEnabled: false,
  checkoutUrl: null,
  currency: "EUR" as const,
  items: COSMETIC_CATALOG,
  products: COSMETIC_PRODUCTS,
  /** Earned-coin items bought in game only; informational, never purchasable here. */
  coinItems: COIN_COSMETICS,
};

export function cosmeticById(value: string) {
  return OWNABLE_COSMETICS.find((item) => item.id === value);
}

export function isRewardOnlyCosmetic(value: string) {
  return REWARD_COSMETICS.some((item) => item.id === value);
}

export function isCosmeticSlot(value: string): value is CosmeticSlot {
  return COSMETIC_SLOTS.includes(value as CosmeticSlot);
}

export function isFreeCosmetic(value: string) {
  const item = cosmeticById(value);
  return !!item && "free" in item && item.free === true;
}
