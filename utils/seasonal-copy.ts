import type { SeasonalThemeId } from "#shared/seasonal-themes";
import type { SiteLocaleCode } from "./site-locales";

export interface SeasonalCopy {
  /** Shop label of a limited coin item, with the last day of the season. */
  limitedEdition: string;
  /** Homepage banner linking to the season's release note. */
  bannerEyebrow: string;
  bannerTitle: string;
  bannerText: string;
  bannerCta: string;
}

/**
 * Visible seasonal copy in every header language (French speaks to the player
 * with "tu"). The dates are the last day of the window in Europe/Paris.
 */
export const SEASONAL_COPY = {
  halloween: {
    en: {
      limitedEdition: "Limited Halloween edition · until November 2",
      bannerEyebrow: "Halloween · until November 2",
      bannerTitle: "Halloween has taken over Cookie Build",
      bannerText: "Find the 13 pumpkins hidden in the lobby to win an exclusive trail, listen to the witch’s music box and pick up limited-edition cosmetics.",
      bannerCta: "Read the Halloween update",
    },
    fr: {
      limitedEdition: "Édition limitée Halloween · jusqu’au 2 novembre",
      bannerEyebrow: "Halloween · jusqu’au 2 novembre",
      bannerTitle: "Halloween envahit Cookie Build",
      bannerText: "Trouve les 13 citrouilles cachées dans le lobby pour gagner une traînée exclusive, écoute la boîte à musique de la sorcière et récupère des cosmétiques en édition limitée.",
      bannerCta: "Tout savoir sur Halloween",
    },
    de: {
      limitedEdition: "Limitierte Halloween-Edition · bis 2. November",
      bannerEyebrow: "Halloween · bis 2. November",
      bannerTitle: "Halloween hat Cookie Build übernommen",
      bannerText: "Finde die 13 in der Lobby versteckten Kürbisse und gewinne eine exklusive Spur, hör dir die Spieluhr der Hexe an und hol dir Kosmetik in limitierter Edition.",
      bannerCta: "Alles über Halloween",
    },
    it: {
      limitedEdition: "Edizione limitata Halloween · fino al 2 novembre",
      bannerEyebrow: "Halloween · fino al 2 novembre",
      bannerTitle: "Halloween ha conquistato Cookie Build",
      bannerText: "Trova le 13 zucche nascoste nella lobby per vincere una scia esclusiva, ascolta il carillon della strega e prendi i cosmetici in edizione limitata.",
      bannerCta: "Scopri le novità di Halloween",
    },
    bg: {
      limitedEdition: "Ограничено издание за Хелоуин · до 2 ноември",
      bannerEyebrow: "Хелоуин · до 2 ноември",
      bannerTitle: "Хелоуин превзе Cookie Build",
      bannerText: "Намери 13-те тикви, скрити в лобито, за да спечелиш ексклузивна следа, послушай музикалната кутия на вещицата и вземи козметика с ограничено издание.",
      bannerCta: "Всичко за Хелоуин",
    },
    es: {
      limitedEdition: "Edición limitada de Halloween · hasta el 2 de noviembre",
      bannerEyebrow: "Halloween · hasta el 2 de noviembre",
      bannerTitle: "Halloween se apodera de Cookie Build",
      bannerText: "Encuentra las 13 calabazas escondidas en el lobby para ganar una estela exclusiva, escucha la caja de música de la bruja y consigue cosméticos de edición limitada.",
      bannerCta: "Todo sobre Halloween",
    },
    hi: {
      limitedEdition: "सीमित हैलोवीन संस्करण · 2 नवंबर तक",
      bannerEyebrow: "हैलोवीन · 2 नवंबर तक",
      bannerTitle: "Cookie Build पर हैलोवीन आ गया है",
      bannerText: "लॉबी में छिपे 13 कद्दू ढूँढें और एक खास ट्रेल जीतें, चुड़ैल का म्यूज़िक बॉक्स सुनें और सीमित संस्करण वाले कॉस्मेटिक्स पाएँ।",
      bannerCta: "हैलोवीन के बारे में सब कुछ",
    },
    "pt-BR": {
      limitedEdition: "Edição limitada de Halloween · até 2 de novembro",
      bannerEyebrow: "Halloween · até 2 de novembro",
      bannerTitle: "O Halloween tomou conta do Cookie Build",
      bannerText: "Encontre as 13 abóboras escondidas no lobby para ganhar um rastro exclusivo, ouça a caixinha de música da bruxa e pegue cosméticos de edição limitada.",
      bannerCta: "Tudo sobre o Halloween",
    },
  },
} satisfies Record<SeasonalThemeId, Record<SiteLocaleCode, SeasonalCopy>>;

export function seasonalCopy(theme: SeasonalThemeId, locale: SiteLocaleCode): SeasonalCopy {
  return SEASONAL_COPY[theme][locale];
}
