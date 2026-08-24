import { sql, type SQL } from "drizzle-orm";

export const SKYBLOCK_NOTIFICATION_LOCALES = [
  "en",
  "bg",
  "es",
  "hi",
  "pt",
  "fr",
  "de",
  "it",
] as const;

export type SkyblockNotificationLocale =
  (typeof SKYBLOCK_NOTIFICATION_LOCALES)[number];

export function skyblockActionNotificationsEnabled(capabilities: {
  skyblockCompanion: boolean;
  skyblockManagementWrites: boolean;
}) {
  return (
    capabilities.skyblockCompanion && capabilities.skyblockManagementWrites
  );
}

type NotificationCopy = {
  workerTitle: string;
  workerBody: string;
  objectiveTitle: string;
  objectiveBody: string;
  marketTitle: string;
  marketBody: string;
};

const COPY = {
  en: {
    workerTitle: "A Skyblock worker is full",
    workerBody: "Collect its production from Skyblock management.",
    objectiveTitle: "Skyblock reward ready",
    objectiveBody: "Your objective is complete. Claim the reward in the app.",
    marketTitle: "Item sold on the Skyblock Market",
    marketBody: "{item} sold for {coins} net coins.",
  },
  bg: {
    workerTitle: "Skyblock работник е пълен",
    workerBody: "Събери продукцията му от управлението на Skyblock.",
    objectiveTitle: "Наградата за Skyblock е готова",
    objectiveBody: "Целта ти е завършена. Вземи наградата в приложението.",
    marketTitle: "Предметът е продаден на пазара на Skyblock",
    marketBody: "{item} е продаден за {coins} нетни монети.",
  },
  es: {
    workerTitle: "Un trabajador de Skyblock está lleno",
    workerBody: "Recoge su producción desde la gestión de Skyblock.",
    objectiveTitle: "Recompensa de Skyblock lista",
    objectiveBody: "Completaste tu objetivo. Reclama la recompensa en la app.",
    marketTitle: "Objeto vendido en el Mercado de Skyblock",
    marketBody: "Vendiste {item} por {coins} monedas netas.",
  },
  hi: {
    workerTitle: "एक Skyblock वर्कर भर गया है",
    workerBody: "Skyblock प्रबंधन से उसका उत्पादन इकट्ठा करें।",
    objectiveTitle: "Skyblock इनाम तैयार है",
    objectiveBody:
      "आपका उद्देश्य पूरा हो गया है। ऐप में अपना इनाम प्राप्त करें।",
    marketTitle: "Skyblock बाज़ार में आइटम बिक गया",
    marketBody: "{item} {coins} शुद्ध सिक्कों में बिका।",
  },
  pt: {
    workerTitle: "Um trabalhador de Skyblock está cheio",
    workerBody: "Colete a produção dele na gestão do Skyblock.",
    objectiveTitle: "Recompensa do Skyblock pronta",
    objectiveBody: "Seu objetivo foi concluído. Resgate a recompensa no app.",
    marketTitle: "Item vendido no Mercado Skyblock",
    marketBody: "{item} foi vendido por {coins} moedas líquidas.",
  },
  fr: {
    workerTitle: "Un worker Skyblock est plein",
    workerBody: "Récupère sa production depuis la gestion Skyblock.",
    objectiveTitle: "Récompense Skyblock prête",
    objectiveBody:
      "Ton objectif est terminé. Récupère ta récompense dans l’appli.",
    marketTitle: "Objet vendu sur le Marché Skyblock",
    marketBody: "{item} vendu pour {coins} pièces nettes.",
  },
  de: {
    workerTitle: "Ein Skyblock-Arbeiter ist voll",
    workerBody: "Hole seine Produktion in der Skyblock-Verwaltung ab.",
    objectiveTitle: "Skyblock-Belohnung bereit",
    objectiveBody:
      "Dein Ziel ist abgeschlossen. Hole die Belohnung in der App ab.",
    marketTitle: "Gegenstand auf dem Skyblock-Markt verkauft",
    marketBody: "{item} für netto {coins} Münzen verkauft.",
  },
  it: {
    workerTitle: "Un lavoratore Skyblock è pieno",
    workerBody: "Raccogli la sua produzione dalla gestione Skyblock.",
    objectiveTitle: "Ricompensa Skyblock pronta",
    objectiveBody: "Hai completato l’obiettivo. Ritira la ricompensa nell’app.",
    marketTitle: "Oggetto venduto nel Mercato Skyblock",
    marketBody: "{item} venduto per {coins} monete nette.",
  },
} as const satisfies Record<SkyblockNotificationLocale, NotificationCopy>;

const ITEM_NAMES = {
  en: {
    cobblestone: "Cobblestone",
    coal: "Coal",
    iron_ingot: "Iron Ingot",
    gold_ingot: "Gold Ingot",
    diamond: "Diamond",
    wheat: "Wheat",
    wheat_seeds: "Wheat Seeds",
    carrot: "Carrot",
    potato: "Potato",
    oak_log: "Oak Log",
    oak_sapling: "Oak Sapling",
    apple: "Apple",
    rotten_flesh: "Rotten Flesh",
    bone: "Bone",
  },
  bg: {
    cobblestone: "Калдъръм",
    coal: "Въглища",
    iron_ingot: "Железен кюлче",
    gold_ingot: "Златен кюлче",
    diamond: "Диамант",
    wheat: "Пшеница",
    wheat_seeds: "Пшенични семена",
    carrot: "Морков",
    potato: "Картоф",
    oak_log: "Дъбов труп",
    oak_sapling: "Дъбова фиданка",
    apple: "Ябълка",
    rotten_flesh: "Гнил плът",
    bone: "Кост",
  },
  es: {
    cobblestone: "Adoquín",
    coal: "Carbón",
    iron_ingot: "Lingote de hierro",
    gold_ingot: "Lingote de oro",
    diamond: "Diamante",
    wheat: "Trigo",
    wheat_seeds: "Semillas de trigo",
    carrot: "Zanahoria",
    potato: "Patata",
    oak_log: "Tronco de roble",
    oak_sapling: "Retoño de roble",
    apple: "Manzana",
    rotten_flesh: "Carne podrida",
    bone: "Hueso",
  },
  hi: {
    cobblestone: "कॉब्लस्टोन",
    coal: "कोयला",
    iron_ingot: "लोहा इनगॉट",
    gold_ingot: "सोने का इनगॉट",
    diamond: "हीरा",
    wheat: "गेहूँ",
    wheat_seeds: "गेहूँ के बीज",
    carrot: "गाजर",
    potato: "आलू",
    oak_log: "ओक लकड़ी",
    oak_sapling: "ओक पौधा",
    apple: "सेब",
    rotten_flesh: "सड़ा हुआ मांस",
    bone: "हड्डी",
  },
  pt: {
    cobblestone: "Paralelepípedo",
    coal: "Carvão",
    iron_ingot: "Lingote de Ferro",
    gold_ingot: "Lingote de Ouro",
    diamond: "Diamante",
    wheat: "Trigo",
    wheat_seeds: "Sementes de trigo",
    carrot: "Cenoura",
    potato: "Batata",
    oak_log: "Tronco de Carvalho",
    oak_sapling: "Muda de carvalho",
    apple: "Maçã",
    rotten_flesh: "Carne Podre",
    bone: "Osso",
  },
  fr: {
    cobblestone: "Pierres",
    coal: "Charbon",
    iron_ingot: "Lingot de fer",
    gold_ingot: "Lingot d’or",
    diamond: "Diamant",
    wheat: "Blé",
    wheat_seeds: "Graines de blé",
    carrot: "Carotte",
    potato: "Pomme de terre",
    oak_log: "Bûche de chêne",
    oak_sapling: "Pousse de chêne",
    apple: "Pomme",
    rotten_flesh: "Chair putréfiée",
    bone: "Os",
  },
  de: {
    cobblestone: "Bruchstein",
    coal: "Kohle",
    iron_ingot: "Eisenbarren",
    gold_ingot: "Goldbarren",
    diamond: "Diamant",
    wheat: "Weizen",
    wheat_seeds: "Weizensamen",
    carrot: "Karotte",
    potato: "Kartoffel",
    oak_log: "Eichenstamm",
    oak_sapling: "Eichensetzling",
    apple: "Apfel",
    rotten_flesh: "Verrottetes Fleisch",
    bone: "Knochen",
  },
  it: {
    cobblestone: "Pietrisco",
    coal: "Carbone",
    iron_ingot: "Lingotto di ferro",
    gold_ingot: "Lingotto d’oro",
    diamond: "Diamante",
    wheat: "Grano",
    wheat_seeds: "Semi di grano",
    carrot: "Carota",
    potato: "Patata",
    oak_log: "Tronco di quercia",
    oak_sapling: "Arboscello di quercia",
    apple: "Mela",
    rotten_flesh: "Carne marcia",
    bone: "Osso",
  },
} as const satisfies Record<SkyblockNotificationLocale, Record<string, string>>;

export function skyblockNotificationLocale(
  value: string | null | undefined,
): SkyblockNotificationLocale {
  const language = value?.trim().toLowerCase().replace("_", "-").split("-")[0];
  return SKYBLOCK_NOTIFICATION_LOCALES.includes(
    language as SkyblockNotificationLocale,
  )
    ? (language as SkyblockNotificationLocale)
    : "en";
}

export function skyblockNotificationCopy(
  locale: string | null | undefined,
): NotificationCopy {
  return COPY[skyblockNotificationLocale(locale)];
}

export function skyblockNotificationItemName(
  locale: string | null | undefined,
  itemId: string,
  fallback: string,
) {
  const names: Readonly<Record<string, string>> =
    ITEM_NAMES[skyblockNotificationLocale(locale)];
  return names[itemId] ?? fallback;
}

function skyblockNotificationLocaleSql(locale: SQL) {
  return sql`CASE split_part(replace(lower(coalesce(${locale}, '')), '_', '-'), '-', 1)
    WHEN 'bg' THEN 'bg'
    WHEN 'es' THEN 'es'
    WHEN 'hi' THEN 'hi'
    WHEN 'pt' THEN 'pt'
    WHEN 'fr' THEN 'fr'
    WHEN 'de' THEN 'de'
    WHEN 'it' THEN 'it'
    ELSE 'en'
  END`;
}

export function skyblockNotificationTextSql(
  locale: SQL,
  key: keyof NotificationCopy,
) {
  const language = skyblockNotificationLocaleSql(locale);
  const serialized = JSON.stringify(COPY);
  return sql`coalesce(
    ${serialized}::jsonb -> ${language} ->> ${key},
    ${serialized}::jsonb -> 'en' ->> ${key}
  )`;
}

export function skyblockNotificationMarketBodySql(
  locale: SQL,
  itemId: string,
  fallbackItemName: string,
  netCoins: number,
) {
  const language = skyblockNotificationLocaleSql(locale);
  const names = JSON.stringify(ITEM_NAMES);
  const itemName = sql`coalesce(
    ${names}::jsonb -> ${language} ->> ${itemId},
    ${names}::jsonb -> 'en' ->> ${itemId},
    ${fallbackItemName}
  )`;
  return sql`replace(
    replace(${skyblockNotificationTextSql(locale, "marketBody")}, '{item}', ${itemName}),
    '{coins}', ${String(netCoins)}
  )`;
}
