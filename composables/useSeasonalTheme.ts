import { computed } from "vue";
import { activeSeasonalTheme } from "@/utils/seasonal-theme";

/**
 * Seasonal state for a page render. The clock is read once on the server and
 * carried in the Nuxt payload, so hydration renders exactly the server markup
 * even if a season starts or ends in between.
 */
export function useSeasonalTheme() {
  const nowMs = useState<number>("seasonal-theme-now", () => Date.now());
  const now = computed(() => new Date(nowMs.value));
  const theme = computed(() => activeSeasonalTheme(now.value));
  return { now, theme };
}
