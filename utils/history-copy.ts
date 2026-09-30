import type { SiteLocaleCode } from "./site-locales";

/**
 * Copy for the localized "Our history" page (/history, /fr/notre-histoire, ...).
 *
 * Every fact comes from content already published on the site:
 * - 2014 start as a small project that grew into a Minecraft PE mini-games
 *   server: utils/site-copy.ts `home.historyBody`.
 * - More than 2,000 simultaneous players (no year stated): utils/site-copy.ts
 *   `home.faqs` ("When did Cookie Build start?").
 * - Passion project maintained by Guillaume351, players on phones, tablets,
 *   consoles and computers share one server: utils/site-copy.ts `home.aboutBody`.
 * - 2025 Java and Bedrock relaunch, then the July 2026 update (SkyWars, Build
 *   Battle and TurfWars return, MicroBattles and Pitchout expanded, Cookie Build
 *   Mobile back on iOS and Android): content/changelog/2026-relaunch.json.
 * - August 2026 BedWars beta at the Cookie Colosseum and Cookie Skyblock with a
 *   persistent Cookie Orchard island: content/changelog/2026-08-bedwars-beta-announcement.json,
 *   2026-08-skyblock-cookie-orchard.json, 2026-08-23-skyblock-availability-clarification.json.
 * - September 2026 Nomad Wars and Fat King public beta:
 *   content/changelog/2026-09-minigames-public-beta.json, 2026-09-fat-king-preview.json.
 * - Discord use (teammates, sessions, bug reports, suggestions): utils/site-copy.ts
 *   `home.faqs` ("Is there a Discord community?").
 *
 * The peak player count is passed in already formatted for the locale, so no
 * number is hard-coded in these strings.
 */

export const HISTORY_PEAK_PLAYERS = 2000;

export type HistoryMilestoneId = "origins" | "peak" | "relaunch" | "update" | "betas" | "newModes" | "today";

export interface HistoryMilestone {
  id: HistoryMilestoneId;
  /** ISO 8601 year or year-month for `<time datetime>`; omitted when no date is published. */
  datetime?: string;
}

/** Timeline order. Dates only where site content states them. */
export const HISTORY_MILESTONES: readonly HistoryMilestone[] = [
  { id: "origins", datetime: "2014" },
  { id: "peak" },
  { id: "relaunch", datetime: "2025" },
  { id: "update", datetime: "2026-07" },
  { id: "betas", datetime: "2026-08" },
  { id: "newModes", datetime: "2026-09" },
  { id: "today" },
] as const;

export type HistoryLinkId = "games" | "skyblock" | "bedwars" | "fatKing" | "nomadWars" | "join";

interface MilestoneCopy {
  title: string;
  body: string;
}

export interface HistoryCopy {
  seoTitle: string;
  metaDescription: (players: string) => string;
  breadcrumbLabel: string;
  breadcrumbHome: string;
  breadcrumbCurrent: string;
  eyebrow: string;
  h1: string;
  intro: string;
  heroAlt: string;
  timelineTitle: string;
  peakLabel: string;
  todayLabel: string;
  milestones: Record<Exclude<HistoryMilestoneId, "peak">, MilestoneCopy> & {
    peak: { title: (players: string) => string; body: string };
  };
  playTitle: string;
  playIntro: string;
  links: Record<HistoryLinkId, { label: string; description: string }>;
  communityTitle: string;
  communityBody: string;
  discordCta: string;
  followX: string;
  newTab: string;
}

export const HISTORY_COPY: Record<SiteLocaleCode, HistoryCopy> = {
  en: {
    seoTitle: "Our history: Cookie Build, a Minecraft PE server since 2014",
    metaDescription: (players) => `Started in 2014 as a small project, Cookie Build grew into a Minecraft PE mini-games server with more than ${players} simultaneous players. Now on Java and Bedrock.`,
    breadcrumbLabel: "Breadcrumb",
    breadcrumbHome: "Home",
    breadcrumbCurrent: "Our history",
    eyebrow: "Since 2014",
    h1: "Our history",
    intro: "From a small project to a server shared by Java and Bedrock players: this is the story of Cookie Build, a Minecraft mini-games server since 2014.",
    heroAlt: "View of the Cookie Build lobby in Minecraft, with a wooden amphitheatre, trees and a small river",
    timelineTitle: "Key moments",
    peakLabel: "At its peak",
    todayLabel: "Today",
    milestones: {
      origins: { title: "A small project", body: "Cookie Build started in 2014 as a small project and grew into a mini-games server for the Minecraft PE community." },
      peak: { title: (players) => `More than ${players} simultaneous players`, body: "That is how many people once played at the same time on the Minecraft PE mini-games server." },
      relaunch: { title: "Relaunch on Java and Bedrock", body: "Cookie Build returns with a single network shared by Minecraft Java and Bedrock players." },
      update: { title: "The 2026 update", body: "SkyWars, Build Battle and TurfWars return with their recovered maps, MicroBattles and Pitchout are expanded, and the Cookie Build Mobile companion app is back on iOS and Android." },
      betas: { title: "BedWars and Skyblock in beta", body: "BedWars opens in beta at the Cookie Colosseum, and Cookie Skyblock arrives with a persistent Cookie Orchard island, on Java and Bedrock." },
      newModes: { title: "Nomad Wars and Fat King", body: "Two new mini-games open their public beta: Nomad Wars and its moving safe zones, and Fat King, where each team protects a king carrying gold." },
      today: { title: "A passion project", body: "Cookie Build is a passion project maintained by Guillaume351. Players on phones, tablets, consoles and computers share the same server." },
    },
    playTitle: "Play today",
    playIntro: "Join from Minecraft Java or Bedrock and pick your next game.",
    links: {
      games: { label: "All game modes", description: "Every mode, its rules and how to join" },
      skyblock: { label: "Skyblock", description: "Grow your Cookie Orchard island" },
      bedwars: { label: "BedWars", description: "Defend your bed at the Cookie Colosseum" },
      fatKing: { label: "Fat King", description: "Protect your king and his gold" },
      nomadWars: { label: "Nomad Wars", description: "Follow the moving safe zones" },
      join: { label: "How to join", description: "Guides for Java, mobile and consoles" },
    },
    communityTitle: "Join the community",
    communityBody: "Find teammates, coordinate sessions, report bugs and share suggestions on Discord, and follow Cookie Build news on X.",
    discordCta: "Join the Discord",
    followX: "Follow on X",
    newTab: "(opens in a new tab)",
  },
  fr: {
    seoTitle: "Notre histoire : Cookie Build, serveur Minecraft PE depuis 2014",
    metaDescription: (players) => `Né en 2014, Cookie Build est devenu un serveur de mini-jeux Minecraft PE avec plus de ${players} joueurs simultanés. Il réunit aujourd’hui Java et Bedrock.`,
    breadcrumbLabel: "Fil d’Ariane",
    breadcrumbHome: "Accueil",
    breadcrumbCurrent: "Notre histoire",
    eyebrow: "Depuis 2014",
    h1: "Notre histoire",
    intro: "D’un petit projet à un serveur partagé par les joueurs Java et Bedrock : voici l’histoire de Cookie Build, serveur de mini-jeux Minecraft depuis 2014.",
    heroAlt: "Vue du lobby de Cookie Build dans Minecraft, avec un amphithéâtre en bois, des arbres et une petite rivière",
    timelineTitle: "Les grandes étapes",
    peakLabel: "À son apogée",
    todayLabel: "Aujourd’hui",
    milestones: {
      origins: { title: "Un petit projet", body: "Cookie Build est né en 2014 comme un petit projet avant de devenir un serveur de mini-jeux pour la communauté Minecraft PE." },
      peak: { title: (players) => `Plus de ${players} joueurs simultanés`, body: "C’est le nombre de joueurs que le serveur de mini-jeux Minecraft PE a déjà accueillis en même temps." },
      relaunch: { title: "Relance sur Java et Bedrock", body: "Cookie Build revient avec un réseau unique, partagé par les joueurs Minecraft Java et Bedrock." },
      update: { title: "La mise à jour 2026", body: "SkyWars, Build Battle et TurfWars reviennent avec leurs maps récupérées, MicroBattles et Pitchout s’enrichissent, et l’application compagnon Cookie Build Mobile revient sur iOS et Android." },
      betas: { title: "BedWars et Skyblock en bêta", body: "BedWars ouvre sa bêta au Cookie Colosseum et Cookie Skyblock arrive avec une île Cookie Orchard persistante, sur Java et Bedrock." },
      newModes: { title: "Nomad Wars et Fat King", body: "Deux nouveaux mini-jeux ouvrent leur bêta publique : Nomad Wars et ses zones sûres mobiles, et Fat King, où chaque équipe protège un roi chargé d’or." },
      today: { title: "Un projet passion", body: "Cookie Build est un projet passion maintenu par Guillaume351. Les joueurs sur téléphone, tablette, console et ordinateur partagent le même serveur." },
    },
    playTitle: "Joue dès aujourd’hui",
    playIntro: "Rejoins-nous depuis Minecraft Java ou Bedrock et choisis ta prochaine partie.",
    links: {
      games: { label: "Tous les modes de jeu", description: "Chaque mode, ses règles et comment le rejoindre" },
      skyblock: { label: "Skyblock", description: "Fais grandir ton île Cookie Orchard" },
      bedwars: { label: "BedWars", description: "Défends ton lit au Cookie Colosseum" },
      fatKing: { label: "Fat King", description: "Protège ton roi et son or" },
      nomadWars: { label: "Nomad Wars", description: "Suis les zones sûres mobiles" },
      join: { label: "Comment rejoindre", description: "Guides pour Java, mobile et consoles" },
    },
    communityTitle: "Rejoins la communauté",
    communityBody: "Trouve des équipiers, organise des parties, signale des bugs et partage tes idées sur Discord, et suis l’actualité de Cookie Build sur X.",
    discordCta: "Rejoindre le Discord",
    followX: "Suivre sur X",
    newTab: "(s’ouvre dans un nouvel onglet)",
  },
  de: {
    seoTitle: "Unsere Geschichte: Cookie Build, Minecraft-PE-Server seit 2014",
    metaDescription: (players) => `2014 als kleines Projekt gestartet, wurde Cookie Build ein Minecraft-PE-Minispiele-Server mit über ${players} gleichzeitigen Spielern. Heute auf Java und Bedrock.`,
    breadcrumbLabel: "Brotkrümelnavigation",
    breadcrumbHome: "Startseite",
    breadcrumbCurrent: "Unsere Geschichte",
    eyebrow: "Seit 2014",
    h1: "Unsere Geschichte",
    intro: "Vom kleinen Projekt zum Server, den sich Java- und Bedrock-Spieler teilen: Das ist die Geschichte von Cookie Build, einem Minecraft-Minispiele-Server seit 2014.",
    heroAlt: "Blick auf die Cookie-Build-Lobby in Minecraft mit einem Amphitheater aus Holz, Bäumen und einem kleinen Fluss",
    timelineTitle: "Wichtige Etappen",
    peakLabel: "Zu Spitzenzeiten",
    todayLabel: "Heute",
    milestones: {
      origins: { title: "Ein kleines Projekt", body: "Cookie Build begann 2014 als kleines Projekt und wurde zu einem Minispiele-Server für die Minecraft-PE-Community." },
      peak: { title: (players) => `Mehr als ${players} gleichzeitige Spieler`, body: "So viele Spieler waren zeitweise gleichzeitig auf dem Minecraft-PE-Minispiele-Server." },
      relaunch: { title: "Neustart für Java und Bedrock", body: "Cookie Build kehrt mit einem gemeinsamen Netzwerk für Minecraft-Java- und Bedrock-Spieler zurück." },
      update: { title: "Das Update 2026", body: "SkyWars, Build Battle und TurfWars kehren mit ihren wiederhergestellten Karten zurück, MicroBattles und Pitchout werden erweitert und die Begleit-App Cookie Build Mobile ist wieder für iOS und Android da." },
      betas: { title: "BedWars und Skyblock in der Beta", body: "BedWars startet die Beta im Cookie Colosseum und Cookie Skyblock kommt mit einer dauerhaften Cookie-Orchard-Insel – auf Java und Bedrock." },
      newModes: { title: "Nomad Wars und Fat King", body: "Zwei neue Minispiele starten ihre öffentliche Beta: Nomad Wars mit seinen wandernden Schutzzonen und Fat King, in dem jedes Team einen mit Gold beladenen König beschützt." },
      today: { title: "Ein Herzensprojekt", body: "Cookie Build ist ein Herzensprojekt von Guillaume351. Spieler auf Handys, Tablets, Konsolen und Computern teilen sich denselben Server." },
    },
    playTitle: "Spiel noch heute",
    playIntro: "Tritt mit Minecraft Java oder Bedrock bei und wähle dein nächstes Spiel.",
    links: {
      games: { label: "Alle Spielmodi", description: "Jeder Modus, seine Regeln und wie du beitrittst" },
      skyblock: { label: "Skyblock", description: "Lass deine Cookie-Orchard-Insel wachsen" },
      bedwars: { label: "BedWars", description: "Verteidige dein Bett im Cookie Colosseum" },
      fatKing: { label: "Fat King", description: "Beschütze deinen König und sein Gold" },
      nomadWars: { label: "Nomad Wars", description: "Folge den wandernden Schutzzonen" },
      join: { label: "So trittst du bei", description: "Anleitungen für Java, Mobilgeräte und Konsolen" },
    },
    communityTitle: "Werde Teil der Community",
    communityBody: "Finde Mitspieler, plane Runden, melde Fehler und teile Vorschläge auf Discord – und folge den Neuigkeiten von Cookie Build auf X.",
    discordCta: "Discord beitreten",
    followX: "Auf X folgen",
    newTab: "(öffnet in einem neuen Tab)",
  },
  it: {
    seoTitle: "La nostra storia: Cookie Build, server Minecraft PE dal 2014",
    metaDescription: (players) => `Nato nel 2014, Cookie Build è diventato un server di minigiochi Minecraft PE con oltre ${players} giocatori contemporanei. Oggi riunisce Java e Bedrock.`,
    breadcrumbLabel: "Percorso di navigazione",
    breadcrumbHome: "Home",
    breadcrumbCurrent: "La nostra storia",
    eyebrow: "Dal 2014",
    h1: "La nostra storia",
    intro: "Da piccolo progetto a server condiviso dai giocatori Java e Bedrock: ecco la storia di Cookie Build, server di minigiochi Minecraft dal 2014.",
    heroAlt: "Veduta della lobby di Cookie Build in Minecraft, con un anfiteatro di legno, alberi e un piccolo fiume",
    timelineTitle: "Le tappe principali",
    peakLabel: "Al suo apice",
    todayLabel: "Oggi",
    milestones: {
      origins: { title: "Un piccolo progetto", body: "Cookie Build è nato nel 2014 come piccolo progetto ed è diventato un server di minigiochi per la community di Minecraft PE." },
      peak: { title: (players) => `Oltre ${players} giocatori contemporanei`, body: "È il numero di giocatori che il server di minigiochi Minecraft PE ha ospitato contemporaneamente." },
      relaunch: { title: "Rilancio su Java e Bedrock", body: "Cookie Build torna con un’unica rete condivisa dai giocatori Minecraft Java e Bedrock." },
      update: { title: "L’aggiornamento 2026", body: "SkyWars, Build Battle e TurfWars tornano con le loro mappe recuperate, MicroBattles e Pitchout si ampliano e l’app companion Cookie Build Mobile torna su iOS e Android." },
      betas: { title: "BedWars e Skyblock in beta", body: "BedWars apre la beta al Cookie Colosseum e Cookie Skyblock arriva con un’isola Cookie Orchard persistente, su Java e Bedrock." },
      newModes: { title: "Nomad Wars e Fat King", body: "Due nuovi minigiochi aprono la beta pubblica: Nomad Wars, con le sue zone sicure mobili, e Fat King, dove ogni squadra protegge un re carico d’oro." },
      today: { title: "Un progetto personale", body: "Cookie Build è un progetto personale mantenuto da Guillaume351. I giocatori su telefoni, tablet, console e computer condividono lo stesso server." },
    },
    playTitle: "Gioca oggi",
    playIntro: "Entra da Minecraft Java o Bedrock e scegli la tua prossima partita.",
    links: {
      games: { label: "Tutte le modalità", description: "Ogni modalità, le sue regole e come entrare" },
      skyblock: { label: "Skyblock", description: "Fai crescere la tua isola Cookie Orchard" },
      bedwars: { label: "BedWars", description: "Difendi il tuo letto al Cookie Colosseum" },
      fatKing: { label: "Fat King", description: "Proteggi il tuo re e il suo oro" },
      nomadWars: { label: "Nomad Wars", description: "Segui le zone sicure mobili" },
      join: { label: "Come entrare", description: "Guide per Java, mobile e console" },
    },
    communityTitle: "Unisciti alla community",
    communityBody: "Trova compagni di squadra, organizza partite, segnala bug e condividi suggerimenti su Discord, e segui le novità di Cookie Build su X.",
    discordCta: "Entra nel Discord",
    followX: "Segui su X",
    newTab: "(si apre in una nuova scheda)",
  },
  bg: {
    seoTitle: "Нашата история: Cookie Build, Minecraft PE сървър от 2014 г.",
    metaDescription: (players) => `Започнал през 2014 г. като малък проект, Cookie Build става сървър с миниигри за Minecraft PE с над ${players} едновременни играчи. Днес за Java и Bedrock.`,
    breadcrumbLabel: "Навигационна пътека",
    breadcrumbHome: "Начало",
    breadcrumbCurrent: "Нашата история",
    eyebrow: "От 2014 г.",
    h1: "Нашата история",
    intro: "От малък проект до сървър, споделен от играчи на Java и Bedrock: това е историята на Cookie Build, Minecraft сървър с миниигри от 2014 г.",
    heroAlt: "Изглед към лобито на Cookie Build в Minecraft с дървен амфитеатър, дървета и малка река",
    timelineTitle: "Основни етапи",
    peakLabel: "В разцвета си",
    todayLabel: "Днес",
    milestones: {
      origins: { title: "Малък проект", body: "Cookie Build започва през 2014 г. като малък проект и се превръща в сървър с миниигри за общността на Minecraft PE." },
      peak: { title: (players) => `Над ${players} едновременни играчи`, body: "Толкова играчи е събирал едновременно сървърът с миниигри за Minecraft PE." },
      relaunch: { title: "Рестарт за Java и Bedrock", body: "Cookie Build се завръща с обща мрежа за играчите на Minecraft Java и Bedrock." },
      update: { title: "Обновлението от 2026 г.", body: "SkyWars, Build Battle и TurfWars се завръщат с възстановените си карти, MicroBattles и Pitchout са разширени, а придружаващото приложение Cookie Build Mobile отново е в iOS и Android." },
      betas: { title: "BedWars и Skyblock в бета", body: "BedWars стартира бета в Cookie Colosseum, а Cookie Skyblock пристига с постоянен остров Cookie Orchard – за Java и Bedrock." },
      newModes: { title: "Nomad Wars и Fat King", body: "Две нови миниигри откриват публична бета: Nomad Wars с подвижните безопасни зони и Fat King, в която всеки отбор пази крал, натоварен със злато." },
      today: { title: "Любим проект", body: "Cookie Build е любим проект, поддържан от Guillaume351. Играчи на телефони, таблети, конзоли и компютри споделят един и същ сървър." },
    },
    playTitle: "Играй още днес",
    playIntro: "Влез от Minecraft Java или Bedrock и избери следващата си игра.",
    links: {
      games: { label: "Всички игрови режими", description: "Всеки режим, правилата му и как да влезеш" },
      skyblock: { label: "Skyblock", description: "Развий своя остров Cookie Orchard" },
      bedwars: { label: "BedWars", description: "Защити леглото си в Cookie Colosseum" },
      fatKing: { label: "Fat King", description: "Пази своя крал и златото му" },
      nomadWars: { label: "Nomad Wars", description: "Следвай подвижните безопасни зони" },
      join: { label: "Как да влезеш", description: "Ръководства за Java, мобилни устройства и конзоли" },
    },
    communityTitle: "Присъедини се към общността",
    communityBody: "Намери съотборници, организирай игри, докладвай бъгове и споделяй предложения в Discord, а новините на Cookie Build следи в X.",
    discordCta: "Влез в Discord",
    followX: "Последвай ни в X",
    newTab: "(отваря се в нов раздел)",
  },
  es: {
    seoTitle: "Nuestra historia: Cookie Build, servidor de Minecraft PE desde 2014",
    metaDescription: (players) => `Nacido en 2014, Cookie Build creció como servidor de minijuegos de Minecraft PE con más de ${players} jugadores simultáneos. Hoy reúne Java y Bedrock.`,
    breadcrumbLabel: "Ruta de navegación",
    breadcrumbHome: "Inicio",
    breadcrumbCurrent: "Nuestra historia",
    eyebrow: "Desde 2014",
    h1: "Nuestra historia",
    intro: "De un pequeño proyecto a un servidor compartido por jugadores de Java y Bedrock: esta es la historia de Cookie Build, servidor de minijuegos de Minecraft desde 2014.",
    heroAlt: "Vista del lobby de Cookie Build en Minecraft, con un anfiteatro de madera, árboles y un pequeño río",
    timelineTitle: "Momentos clave",
    peakLabel: "En su mejor momento",
    todayLabel: "Hoy",
    milestones: {
      origins: { title: "Un pequeño proyecto", body: "Cookie Build nació en 2014 como un pequeño proyecto y creció como servidor de minijuegos para la comunidad de Minecraft PE." },
      peak: { title: (players) => `Más de ${players} jugadores simultáneos`, body: "Es la cantidad de jugadores que el servidor de minijuegos de Minecraft PE llegó a reunir al mismo tiempo." },
      relaunch: { title: "Relanzamiento en Java y Bedrock", body: "Cookie Build regresa con una única red compartida por jugadores de Minecraft Java y Bedrock." },
      update: { title: "La actualización de 2026", body: "SkyWars, Build Battle y TurfWars vuelven con sus mapas recuperados, MicroBattles y Pitchout se amplían y la app complementaria Cookie Build Mobile regresa a iOS y Android." },
      betas: { title: "BedWars y Skyblock en beta", body: "BedWars abre su beta en el Cookie Colosseum y Cookie Skyblock llega con una isla Cookie Orchard persistente, en Java y Bedrock." },
      newModes: { title: "Nomad Wars y Fat King", body: "Dos nuevos minijuegos abren su beta pública: Nomad Wars, con sus zonas seguras móviles, y Fat King, donde cada equipo protege a un rey cargado de oro." },
      today: { title: "Un proyecto personal", body: "Cookie Build es un proyecto personal mantenido por Guillaume351. Quienes juegan en móviles, tabletas, consolas y computadoras comparten el mismo servidor." },
    },
    playTitle: "Juega hoy",
    playIntro: "Entra desde Minecraft Java o Bedrock y elige tu próxima partida.",
    links: {
      games: { label: "Todos los modos de juego", description: "Cada modo, sus reglas y cómo entrar" },
      skyblock: { label: "Skyblock", description: "Haz crecer tu isla Cookie Orchard" },
      bedwars: { label: "BedWars", description: "Defiende tu cama en el Cookie Colosseum" },
      fatKing: { label: "Fat King", description: "Protege a tu rey y su oro" },
      nomadWars: { label: "Nomad Wars", description: "Sigue las zonas seguras móviles" },
      join: { label: "Cómo entrar", description: "Guías para Java, móvil y consolas" },
    },
    communityTitle: "Únete a la comunidad",
    communityBody: "Encuentra compañeros de equipo, organiza partidas, reporta errores y comparte sugerencias en Discord, y sigue las novedades de Cookie Build en X.",
    discordCta: "Únete al Discord",
    followX: "Seguir en X",
    newTab: "(se abre en una pestaña nueva)",
  },
  hi: {
    seoTitle: "हमारा इतिहास: Cookie Build, 2014 से Minecraft PE सर्वर",
    metaDescription: (players) => `2014 में शुरू हुआ Cookie Build, ${players} से अधिक एक साथ खेलने वाले खिलाड़ियों वाला Minecraft PE मिनी-गेम सर्वर बना। अब Java और Bedrock पर।`,
    breadcrumbLabel: "ब्रेडक्रम्ब",
    breadcrumbHome: "होम",
    breadcrumbCurrent: "हमारा इतिहास",
    eyebrow: "2014 से",
    h1: "हमारा इतिहास",
    intro: "एक छोटे प्रोजेक्ट से Java और Bedrock खिलाड़ियों के साझा सर्वर तक: यह है Cookie Build की कहानी, जो 2014 से Minecraft मिनी-गेम सर्वर है।",
    heroAlt: "Minecraft में Cookie Build लॉबी का दृश्य, जिसमें लकड़ी का एम्फीथिएटर, पेड़ और एक छोटी नदी है",
    timelineTitle: "मुख्य पड़ाव",
    peakLabel: "अपने चरम पर",
    todayLabel: "आज",
    milestones: {
      origins: { title: "एक छोटा प्रोजेक्ट", body: "Cookie Build 2014 में एक छोटे प्रोजेक्ट के रूप में शुरू हुआ और Minecraft PE समुदाय का मिनी-गेम सर्वर बना।" },
      peak: { title: (players) => `${players} से अधिक खिलाड़ी एक साथ`, body: "Minecraft PE मिनी-गेम सर्वर पर एक समय इतने खिलाड़ी एक साथ जुड़े थे।" },
      relaunch: { title: "Java और Bedrock पर नई शुरुआत", body: "Cookie Build, Minecraft Java और Bedrock खिलाड़ियों के साझा नेटवर्क के साथ लौटा।" },
      update: { title: "2026 अपडेट", body: "SkyWars, Build Battle और TurfWars अपने वापस लाए गए मैप्स के साथ लौटे, MicroBattles और Pitchout का विस्तार हुआ, और Cookie Build Mobile साथी ऐप iOS और Android पर वापस आया।" },
      betas: { title: "BedWars और Skyblock बीटा में", body: "BedWars का बीटा Cookie Colosseum में शुरू हुआ, और Cookie Skyblock एक स्थायी Cookie Orchard द्वीप के साथ Java और Bedrock पर आया।" },
      newModes: { title: "Nomad Wars और Fat King", body: "दो नए मिनी-गेम का पब्लिक बीटा शुरू हुआ: चलते सुरक्षित क्षेत्रों वाला Nomad Wars, और Fat King, जिसमें हर टीम सोने से लदे अपने राजा की रक्षा करती है।" },
      today: { title: "दिल से बना प्रोजेक्ट", body: "Cookie Build, Guillaume351 द्वारा सँभाला जाने वाला पैशन प्रोजेक्ट है। फ़ोन, टैबलेट, कंसोल और कंप्यूटर पर खेलने वाले खिलाड़ी एक ही सर्वर साझा करते हैं।" },
    },
    playTitle: "आज ही खेलें",
    playIntro: "Minecraft Java या Bedrock से जुड़ें और अपना अगला गेम चुनें।",
    links: {
      games: { label: "सभी गेम मोड", description: "हर मोड, उसके नियम और जुड़ने का तरीका" },
      skyblock: { label: "Skyblock", description: "अपना Cookie Orchard द्वीप बढ़ाएँ" },
      bedwars: { label: "BedWars", description: "Cookie Colosseum में अपने बेड की रक्षा करें" },
      fatKing: { label: "Fat King", description: "अपने राजा और उसके सोने की रक्षा करें" },
      nomadWars: { label: "Nomad Wars", description: "चलते सुरक्षित क्षेत्रों के साथ आगे बढ़ें" },
      join: { label: "कैसे जुड़ें", description: "Java, मोबाइल और कंसोल के लिए गाइड" },
    },
    communityTitle: "समुदाय से जुड़ें",
    communityBody: "Discord पर टीम के साथी खोजें, सत्र तय करें, बग रिपोर्ट करें और सुझाव साझा करें, और X पर Cookie Build की खबरें फ़ॉलो करें।",
    discordCta: "Discord से जुड़ें",
    followX: "X पर फ़ॉलो करें",
    newTab: "(नए टैब में खुलता है)",
  },
  "pt-BR": {
    seoTitle: "Nossa história: Cookie Build, servidor de Minecraft PE desde 2014",
    metaDescription: (players) => `Nascido em 2014, o Cookie Build virou um servidor de minijogos de Minecraft PE com mais de ${players} jogadores simultâneos. Hoje reúne Java e Bedrock.`,
    breadcrumbLabel: "Trilha de navegação",
    breadcrumbHome: "Início",
    breadcrumbCurrent: "Nossa história",
    eyebrow: "Desde 2014",
    h1: "Nossa história",
    intro: "De um pequeno projeto a um servidor compartilhado por jogadores de Java e Bedrock: esta é a história do Cookie Build, servidor de minijogos de Minecraft desde 2014.",
    heroAlt: "Vista do lobby do Cookie Build no Minecraft, com um anfiteatro de madeira, árvores e um pequeno rio",
    timelineTitle: "Momentos marcantes",
    peakLabel: "No auge",
    todayLabel: "Hoje",
    milestones: {
      origins: { title: "Um pequeno projeto", body: "O Cookie Build começou em 2014 como um pequeno projeto e virou um servidor de minijogos para a comunidade Minecraft PE." },
      peak: { title: (players) => `Mais de ${players} jogadores simultâneos`, body: "Foi quantos jogadores o servidor de minijogos de Minecraft PE já recebeu ao mesmo tempo." },
      relaunch: { title: "Relançamento no Java e Bedrock", body: "O Cookie Build volta com uma única rede compartilhada por jogadores de Minecraft Java e Bedrock." },
      update: { title: "A atualização de 2026", body: "SkyWars, Build Battle e TurfWars voltam com seus mapas recuperados, MicroBattles e Pitchout são ampliados e o app complementar Cookie Build Mobile volta ao iOS e Android." },
      betas: { title: "BedWars e Skyblock em beta", body: "O BedWars abre seu beta no Cookie Colosseum e o Cookie Skyblock chega com uma ilha Cookie Orchard persistente, no Java e Bedrock." },
      newModes: { title: "Nomad Wars e Fat King", body: "Dois novos minijogos abrem seu beta público: Nomad Wars, com suas zonas seguras móveis, e Fat King, onde cada equipe protege um rei carregado de ouro." },
      today: { title: "Um projeto pessoal", body: "Cookie Build é um projeto pessoal mantido por Guillaume351. Jogadores em celulares, tablets, consoles e computadores compartilham o mesmo servidor." },
    },
    playTitle: "Jogue hoje",
    playIntro: "Entre pelo Minecraft Java ou Bedrock e escolha sua próxima partida.",
    links: {
      games: { label: "Todos os modos de jogo", description: "Cada modo, suas regras e como entrar" },
      skyblock: { label: "Skyblock", description: "Faça crescer sua ilha Cookie Orchard" },
      bedwars: { label: "BedWars", description: "Defenda sua cama no Cookie Colosseum" },
      fatKing: { label: "Fat King", description: "Proteja seu rei e o ouro dele" },
      nomadWars: { label: "Nomad Wars", description: "Siga as zonas seguras móveis" },
      join: { label: "Como entrar", description: "Guias para Java, celular e consoles" },
    },
    communityTitle: "Participe da comunidade",
    communityBody: "Encontre colegas de equipe, organize sessões, relate bugs e compartilhe sugestões no Discord, e acompanhe as novidades do Cookie Build no X.",
    discordCta: "Entrar no Discord",
    followX: "Seguir no X",
    newTab: "(abre em uma nova aba)",
  },
};
