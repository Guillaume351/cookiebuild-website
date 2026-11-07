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
  christmas: {
    en: {
      limitedEdition: "Limited Christmas edition · until January 4",
      bannerEyebrow: "Christmas · until January 4",
      bannerTitle: "Christmas has come to Cookie Build",
      bannerText: "The lobby is covered in snow: find the 13 hidden presents to win an exclusive trail, listen to the snowman play carols, open your advent calendar until December 24 and pick up limited-edition cosmetics.",
      bannerCta: "Read the Christmas update",
    },
    fr: {
      limitedEdition: "Édition limitée Noël · jusqu’au 4 janvier",
      bannerEyebrow: "Noël · jusqu’au 4 janvier",
      bannerTitle: "Noël s’installe sur Cookie Build",
      bannerText: "Le lobby se couvre de neige : trouve les 13 cadeaux cachés pour gagner une traînée exclusive, écoute le bonhomme de neige jouer des chants de Noël, ouvre ton calendrier de l’Avent jusqu’au 24 décembre et récupère des cosmétiques en édition limitée.",
      bannerCta: "Tout savoir sur Noël",
    },
    de: {
      limitedEdition: "Limitierte Weihnachts-Edition · bis 4. Januar",
      bannerEyebrow: "Weihnachten · bis 4. Januar",
      bannerTitle: "Weihnachten ist bei Cookie Build eingezogen",
      bannerText: "Die Lobby ist verschneit: Finde die 13 versteckten Geschenke und gewinne eine exklusive Spur, hör dem Schneemann bei seinen Weihnachtsliedern zu, öffne bis zum 24. Dezember deinen Adventskalender und hol dir Kosmetik in limitierter Edition.",
      bannerCta: "Alles über Weihnachten",
    },
    it: {
      limitedEdition: "Edizione limitata Natale · fino al 4 gennaio",
      bannerEyebrow: "Natale · fino al 4 gennaio",
      bannerTitle: "Il Natale è arrivato su Cookie Build",
      bannerText: "La lobby si copre di neve: trova i 13 regali nascosti per vincere una scia esclusiva, ascolta il pupazzo di neve suonare i canti di Natale, apri il tuo calendario dell’Avvento fino al 24 dicembre e prendi i cosmetici in edizione limitata.",
      bannerCta: "Scopri le novità di Natale",
    },
    bg: {
      limitedEdition: "Ограничено коледно издание · до 4 януари",
      bannerEyebrow: "Коледа · до 4 януари",
      bannerTitle: "Коледа дойде в Cookie Build",
      bannerText: "Лобито е покрито със сняг: намери 13-те скрити подаръка, за да спечелиш ексклузивна следа, послушай снежния човек, който свири коледни песни, отваряй адвентния си календар до 24 декември и вземи козметика с ограничено издание.",
      bannerCta: "Всичко за Коледа",
    },
    es: {
      limitedEdition: "Edición limitada de Navidad · hasta el 4 de enero",
      bannerEyebrow: "Navidad · hasta el 4 de enero",
      bannerTitle: "La Navidad llega a Cookie Build",
      bannerText: "El lobby se cubre de nieve: encuentra los 13 regalos escondidos para ganar una estela exclusiva, escucha al muñeco de nieve tocar villancicos, abre tu calendario de Adviento hasta el 24 de diciembre y consigue cosméticos de edición limitada.",
      bannerCta: "Todo sobre la Navidad",
    },
    hi: {
      limitedEdition: "सीमित क्रिसमस संस्करण · 4 जनवरी तक",
      bannerEyebrow: "क्रिसमस · 4 जनवरी तक",
      bannerTitle: "Cookie Build पर क्रिसमस आ गया है",
      bannerText: "लॉबी बर्फ़ से ढक गई है: एक खास ट्रेल जीतने के लिए छिपे हुए 13 उपहार ढूँढें, स्नोमैन को क्रिसमस कैरल बजाते सुनें, 24 दिसंबर तक अपना एडवेंट कैलेंडर खोलें और सीमित संस्करण वाले कॉस्मेटिक्स पाएँ।",
      bannerCta: "क्रिसमस के बारे में सब कुछ",
    },
    "pt-BR": {
      limitedEdition: "Edição limitada de Natal · até 4 de janeiro",
      bannerEyebrow: "Natal · até 4 de janeiro",
      bannerTitle: "O Natal chegou ao Cookie Build",
      bannerText: "O lobby está coberto de neve: encontre os 13 presentes escondidos para ganhar um rastro exclusivo, ouça o boneco de neve tocar canções de Natal, abra seu calendário do Advento até 24 de dezembro e pegue cosméticos de edição limitada.",
      bannerCta: "Tudo sobre o Natal",
    },
  },
} satisfies Record<SeasonalThemeId, Record<SiteLocaleCode, SeasonalCopy>>;

export function seasonalCopy(theme: SeasonalThemeId, locale: SiteLocaleCode): SeasonalCopy {
  return SEASONAL_COPY[theme][locale];
}
