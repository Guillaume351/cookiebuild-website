import translations from "./locales/maps.json";
import { fatKingPreviewCopy } from "./fat-king-preview";
import type { MapPreview } from "./map-catalog";
import type { SiteLocaleCode } from "./site-locales";

export const mapCopy = translations satisfies Record<SiteLocaleCode, typeof translations.en>;
const featuredSlugs = ["fat-king-crown", "nomad-oasis", "nomad-ruins", "nomad-canyon"];

export function localizedMap(map: MapPreview, locale: SiteLocaleCode): MapPreview {
  if (locale === "en") return map;
  const copy = mapCopy[locale];
  const featuredIndex = featuredSlugs.indexOf(map.slug);
  return {
    ...map,
    description: featuredIndex >= 0
      ? copy.descriptions[featuredIndex]!
      : copy.descriptionTemplate.replace("{name}", map.name).replace("{game}", map.game),
    districts: map.districts.map((district, index) => {
      const nameIndex = mapCopy.en.districtNames.indexOf(district.name);
      const roleIndex = mapCopy.en.roles.indexOf(district.role);
      return {
        name: map.game === "Fat King"
          ? fatKingPreviewCopy[locale].districts[index]!.title
          : copy.districtNames[nameIndex] ?? district.name,
        role: copy.roles[roleIndex] ?? district.role,
      };
    }),
  };
}
