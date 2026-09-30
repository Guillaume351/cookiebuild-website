import { SITE_COPY } from "@/utils/site-copy";
import { siteLocaleFromPath } from "@/utils/site-locales";

/**
 * Copies a value to the clipboard and announces the result in the shared,
 * accessible toast region rendered by the default layout (no blocking alert()).
 */
export function useCopyToast() {
  const message = useState<string | null>("copy-toast-message", () => null);
  const route = useRoute();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const show = (text: string) => {
    message.value = text;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      message.value = null;
    }, 3_000);
  };

  const copyToClipboard = async (value: string, label: string) => {
    const common = SITE_COPY[siteLocaleFromPath(route.path).code].common;
    try {
      await navigator.clipboard.writeText(value);
      show(`${label} ${common.copied}`);
      return true;
    } catch {
      show(`${label}: ${value}`);
      return false;
    }
  };

  return { message, show, copyToClipboard };
}
