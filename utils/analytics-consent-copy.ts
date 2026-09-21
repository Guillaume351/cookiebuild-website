import type { SiteLocaleCode } from "./site-locales";

export const ANALYTICS_CONSENT_COPY: Record<SiteLocaleCode, { title: string; description: string; decline: string; allow: string }> = {
  "en": {
    "title": "Optional audience measurement",
    "description": "Allow Google Analytics cookies to understand visits and clicks towards the game and shop? No advertising or player names in our events. Declining does not change access to the site.",
    "decline": "Decline",
    "allow": "Allow"
  },
  "fr": {
    "title": "Mesure d’audience facultative",
    "description": "Autoriser les cookies Google Analytics pour comprendre les visites et les clics vers le jeu et la boutique ? Sans publicité ni pseudo transmis. Refuser ne change pas l’accès au site.",
    "decline": "Refuser",
    "allow": "Autoriser"
  },
  "de": {
    "title": "Optionale Reichweitenmessung",
    "description": "Google-Analytics-Cookies zulassen, um Besuche und Klicks zum Spiel und Shop zu verstehen? Keine Werbung oder Spielernamen in unseren Ereignissen. Eine Ablehnung ändert den Zugang zur Website nicht.",
    "decline": "Ablehnen",
    "allow": "Zulassen"
  },
  "it": {
    "title": "Misurazione facoltativa delle visite",
    "description": "Consentire i cookie di Google Analytics per comprendere le visite e i clic verso il gioco e il negozio? Nessuna pubblicità né nome dei giocatori nei nostri eventi. Il rifiuto non cambia l’accesso al sito.",
    "decline": "Rifiuta",
    "allow": "Consenti"
  },
  "bg": {
    "title": "Незадължително измерване на посещенията",
    "description": "Разрешаваш ли бисквитките на Google Analytics, за да разбираме посещенията и кликванията към играта и магазина? Без реклама или имена на играчи в събитията ни. Отказът не променя достъпа до сайта.",
    "decline": "Отказ",
    "allow": "Разрешаване"
  },
  "es": {
    "title": "Medición opcional de visitas",
    "description": "¿Permitir cookies de Google Analytics para comprender las visitas y los clics hacia el juego y la tienda? Sin publicidad ni nombres de jugadores en nuestros eventos. Rechazar no cambia el acceso al sitio.",
    "decline": "Rechazar",
    "allow": "Permitir"
  },
  "hi": {
    "title": "वैकल्पिक दर्शक मापन",
    "description": "गेम और दुकान की ओर जाने वाले विज़िट और क्लिक समझने के लिए Google Analytics कुकी की अनुमति दें? हमारे इवेंट में विज्ञापन या खिलाड़ियों के नाम शामिल नहीं हैं। मना करने से साइट का उपयोग नहीं बदलता।",
    "decline": "मना करें",
    "allow": "अनुमति दें"
  },
  "pt-BR": {
    "title": "Medição opcional de visitas",
    "description": "Permitir cookies do Google Analytics para entender visitas e cliques para o jogo e a loja? Sem publicidade ou nomes de jogadores nos nossos eventos. Recusar não muda o acesso ao site.",
    "decline": "Recusar",
    "allow": "Permitir"
  }
};
