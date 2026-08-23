import type { SiteLocaleCode } from "./site-locales";

export type PublicPageId = "updates" | "playerStats" | "support" | "status" | "rules" | "privacy" | "terms";

type PageSeo = Record<PublicPageId, { title: string; description: string }>;

export const PUBLIC_PAGE_SEO: Record<SiteLocaleCode, PageSeo> = {
  en: {
    updates: { title: "Updates & Events | Cookie Build", description: "Cookie Build news, community sessions and release notes for Java and Bedrock." },
    playerStats: { title: "Player Leaderboards | Cookie Build", description: "Browse completed-match rankings and Minecraft player progression on Cookie Build." },
    support: { title: "Support | Cookie Build", description: "Help for the Cookie Build Minecraft server and companion app." },
    status: { title: "Server Status | Cookie Build", description: "Live Java and Bedrock availability for the Cookie Build network." },
    rules: { title: "Server Rules | Cookie Build", description: "Fair-play and player-safety rules for Cookie Build." },
    privacy: { title: "Privacy Policy | Cookie Build", description: "Cookie Build privacy, retention and account controls." },
    terms: { title: "Terms of Service | Cookie Build", description: "Terms for the Cookie Build server, website and companion app." },
  },
  fr: {
    updates: { title: "Actualités et événements | Cookie Build", description: "Actualités, sessions communautaires et notes de version Cookie Build sur Java et Bedrock." },
    playerStats: { title: "Classement des joueurs | Cookie Build", description: "Consulte les classements des parties terminées et la progression Minecraft." },
    support: { title: "Assistance | Cookie Build", description: "Aide pour le serveur Minecraft et l’application Cookie Build." },
    status: { title: "État du serveur | Cookie Build", description: "Disponibilité en direct du réseau Cookie Build sur Java et Bedrock." },
    rules: { title: "Règles du serveur | Cookie Build", description: "Règles de fair-play et de sécurité des joueurs Cookie Build." },
    privacy: { title: "Politique de confidentialité | Cookie Build", description: "Confidentialité, conservation et contrôles du compte Cookie Build." },
    terms: { title: "Conditions d’utilisation | Cookie Build", description: "Conditions du serveur, du site et de l’application Cookie Build." },
  },
  de: {
    updates: { title: "Updates und Events | Cookie Build", description: "Cookie-Build-News, Community-Sessions und Versionshinweise für Java und Bedrock." },
    playerStats: { title: "Spieler-Ranglisten | Cookie Build", description: "Ranglisten abgeschlossener Spiele und Minecraft-Fortschritt ansehen." },
    support: { title: "Hilfe | Cookie Build", description: "Hilfe für den Cookie-Build-Minecraft-Server und die Begleit-App." },
    status: { title: "Serverstatus | Cookie Build", description: "Live-Verfügbarkeit des Cookie-Build-Netzwerks für Java und Bedrock." },
    rules: { title: "Serverregeln | Cookie Build", description: "Fair-Play- und Spielerschutzregeln von Cookie Build." },
    privacy: { title: "Datenschutz | Cookie Build", description: "Datenschutz, Aufbewahrung und Kontoeinstellungen bei Cookie Build." },
    terms: { title: "Nutzungsbedingungen | Cookie Build", description: "Bedingungen für Server, Website und Begleit-App von Cookie Build." },
  },
  it: {
    updates: { title: "Novità ed eventi | Cookie Build", description: "Notizie, sessioni della community e note di versione per Java e Bedrock." },
    playerStats: { title: "Classifiche giocatori | Cookie Build", description: "Consulta classifiche delle partite concluse e progressi Minecraft." },
    support: { title: "Assistenza | Cookie Build", description: "Aiuto per il server Minecraft e l’app Cookie Build." },
    status: { title: "Stato del server | Cookie Build", description: "Disponibilità live del network Cookie Build su Java e Bedrock." },
    rules: { title: "Regole del server | Cookie Build", description: "Regole di fair play e sicurezza dei giocatori Cookie Build." },
    privacy: { title: "Informativa sulla privacy | Cookie Build", description: "Privacy, conservazione e controlli dell’account Cookie Build." },
    terms: { title: "Termini di servizio | Cookie Build", description: "Termini del server, sito e app Cookie Build." },
  },
  bg: {
    updates: { title: "Новини и събития | Cookie Build", description: "Новини, общностни сесии и бележки за версиите на Java и Bedrock." },
    playerStats: { title: "Класации на играчите | Cookie Build", description: "Класации от завършени мачове и Minecraft прогрес." },
    support: { title: "Поддръжка | Cookie Build", description: "Помощ за Minecraft сървъра и приложението Cookie Build." },
    status: { title: "Състояние на сървъра | Cookie Build", description: "Състояние на Cookie Build за Java и Bedrock в реално време." },
    rules: { title: "Правила на сървъра | Cookie Build", description: "Правила за честна игра и безопасност в Cookie Build." },
    privacy: { title: "Поверителност | Cookie Build", description: "Поверителност, срокове и управление на акаунта Cookie Build." },
    terms: { title: "Условия за ползване | Cookie Build", description: "Условия за сървъра, сайта и приложението Cookie Build." },
  },
  es: {
    updates: { title: "Noticias y eventos | Cookie Build", description: "Noticias, sesiones de la comunidad y notas de versión para Java y Bedrock." },
    playerStats: { title: "Clasificación de jugadores | Cookie Build", description: "Consulta clasificaciones de partidas terminadas y progreso de Minecraft." },
    support: { title: "Soporte | Cookie Build", description: "Ayuda para el servidor de Minecraft y la app Cookie Build." },
    status: { title: "Estado del servidor | Cookie Build", description: "Disponibilidad en directo de Cookie Build para Java y Bedrock." },
    rules: { title: "Reglas del servidor | Cookie Build", description: "Reglas de juego limpio y seguridad de Cookie Build." },
    privacy: { title: "Política de privacidad | Cookie Build", description: "Privacidad, conservación y controles de cuenta de Cookie Build." },
    terms: { title: "Términos del servicio | Cookie Build", description: "Términos del servidor, sitio y app Cookie Build." },
  },
  hi: {
    updates: { title: "समाचार और इवेंट | Cookie Build", description: "Java और Bedrock के लिए समाचार, सामुदायिक सत्र और रिलीज़ नोट्स।" },
    playerStats: { title: "खिलाड़ी रैंकिंग | Cookie Build", description: "पूरे हुए मैचों की रैंकिंग और Minecraft प्रगति देखें।" },
    support: { title: "सहायता | Cookie Build", description: "Cookie Build Minecraft सर्वर और ऐप के लिए सहायता।" },
    status: { title: "सर्वर स्थिति | Cookie Build", description: "Java और Bedrock पर Cookie Build की लाइव उपलब्धता।" },
    rules: { title: "सर्वर नियम | Cookie Build", description: "Cookie Build के निष्पक्ष खेल और खिलाड़ी सुरक्षा नियम।" },
    privacy: { title: "गोपनीयता नीति | Cookie Build", description: "Cookie Build की गोपनीयता, डेटा अवधि और खाता नियंत्रण।" },
    terms: { title: "सेवा की शर्तें | Cookie Build", description: "Cookie Build सर्वर, वेबसाइट और ऐप की शर्तें।" },
  },
  "pt-BR": {
    updates: { title: "Novidades e eventos | Cookie Build", description: "Notícias, sessões da comunidade e notas de versão para Java e Bedrock." },
    playerStats: { title: "Ranking de jogadores | Cookie Build", description: "Veja rankings de partidas concluídas e progresso no Minecraft." },
    support: { title: "Suporte | Cookie Build", description: "Ajuda para o servidor Minecraft e o aplicativo Cookie Build." },
    status: { title: "Status do servidor | Cookie Build", description: "Disponibilidade ao vivo do Cookie Build no Java e Bedrock." },
    rules: { title: "Regras do servidor | Cookie Build", description: "Regras de jogo justo e segurança dos jogadores no Cookie Build." },
    privacy: { title: "Política de privacidade | Cookie Build", description: "Privacidade, retenção e controles da conta Cookie Build." },
    terms: { title: "Termos de serviço | Cookie Build", description: "Termos do servidor, site e aplicativo Cookie Build." },
  },
};

export function publicPageSeo(locale: SiteLocaleCode, page: PublicPageId) {
  return PUBLIC_PAGE_SEO[locale]?.[page] ?? PUBLIC_PAGE_SEO.en[page];
}
