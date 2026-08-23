import type { SiteLocaleCode } from "./site-locales";

interface HomeFeatureCopy {
  title: string;
  description: string;
}

interface HomeGameCopy {
  description: string;
  status?: string;
}

interface HomeFaqCopy {
  question: string;
  answer: string;
}

export interface SiteCopy {
  navigation: {
    home: string;
    games: string;
    playerStats: string;
    updates: string;
    status: string;
    language: string;
    toggle: string;
  };
  footer: {
    description: string;
    quickLinks: string;
    serverStatus: string;
    rules: string;
    support: string;
    deleteAccount: string;
    privacy: string;
    terms: string;
    help: string;
    helpText: string;
    contact: string;
    legal: string;
  };
  common: {
    copy: string;
    copied: string;
    available: string;
    comingSoon: string;
    beta: string;
    serverAddress: string;
    bedrockPort: string;
    viewStats: string;
    socialImageAlt: string;
  };
  home: {
    title: string;
    description: string;
    hero: string;
    copyIp: string;
    playNow: string;
    joinDiscord: string;
    joinTitle: string;
    joinIntro: string;
    closeGuide: string;
    editionLabel: string;
    consoleEdition: string;
    javaSteps: string[];
    bedrockSteps: string[];
    addBedrock: string;
    bedrockFallback: string;
    consoleText: string;
    consoleGuide: string;
    consoleNotice: string;
    mobileBadge: string;
    mobileTitle: string;
    mobileBody: string;
    actionTitle: string;
    actionBody: string;
    allUpdates: string;
    history: string;
    historyBody: string;
    launched: string;
    peakScale: string;
    players: string;
    projectStatus: string;
    active: string;
    features: HomeFeatureCopy[];
    minigamesTitle: string;
    games: Record<string, HomeGameCopy>;
    gameLink: (name: string) => string;
    faqTitle: string;
    faqs: HomeFaqCopy[];
    aboutTitle: string;
    aboutBody: string[];
    followX: string;
    viewGithub: string;
  };
  catalog: {
    badge: string;
    title: string;
    intro: string;
    allModes: string;
    viewGuide: (name: string) => string;
    seoTitle: string;
    seoDescription: string;
  };
  gameUi: {
    allGames: string;
    available: string;
    bedrockIp: string;
    javaIp: string;
    addBedrock: string;
    copyIp: string;
    serverAddress: string;
    connectionAddress: string;
    bedrockPort: string;
    steps: string[];
    consoleNotice: string;
    stats: string;
    faqTitle: (name: string) => string;
  };
  status: {
    checking: string;
    onePlayer: string;
    players: string;
    onlineZero: string;
    offline: string;
    partial: string;
    unavailable: string;
    availability: string;
    checkUnavailable: string;
    online: string;
  };
}

export const SITE_COPY: Record<SiteLocaleCode, SiteCopy> = {
  en: {
    navigation: { home: "Home", games: "Games", playerStats: "Player Stats", updates: "Updates", status: "Status", language: "Language", toggle: "Toggle navigation" },
    footer: { description: "The classic Minecraft mini-games server, bringing players together since 2014.", quickLinks: "Quick Links", serverStatus: "Server Status", rules: "Server Rules", support: "Support", deleteAccount: "Delete App Account", privacy: "Privacy", terms: "Terms", help: "Support", helpText: "Need help? Contact our support team.", contact: "Contact Support", legal: "Not affiliated with Mojang or Microsoft." },
    common: { copy: "Copy", copied: "copied", available: "Available Now", comingSoon: "Coming Soon", beta: "BETA", serverAddress: "Server address", bedrockPort: "Bedrock port", viewStats: "View player stats", socialImageAlt: "Cookie Build Minecraft server lobby" },
    home: {
      title: "Cookie Build | Minecraft Mini-Games for Java & Bedrock",
      description: "Join Cookie Build, a free cross-play Minecraft mini-games server for Java and Bedrock with BedWars, SkyWars, Build Battle and more.",
      hero: "The classic Minecraft mini-games experience. Java and Bedrock editions supported.", copyIp: "Copy", playNow: "Play Now", joinDiscord: "Join Discord", joinTitle: "Join Cookie Build", joinIntro: "Choose your edition for the correct setup.", closeGuide: "Close join guide", editionLabel: "Minecraft edition", consoleEdition: "Console",
      javaSteps: ["Open Minecraft Java Edition and select Multiplayer.", "Select Add Server.", "Paste the address below and join."],
      bedrockSteps: ["On Windows, Android, or iOS, open Play → Servers → Add Server.", "Use the address below with port 19132.", "The button can add it automatically when your device supports Minecraft links."],
      addBedrock: "Add to Bedrock", bedrockFallback: "If Minecraft does not open, add the address and port manually.", consoleText: "Xbox, PlayStation, and Nintendo Switch do not normally expose an editable custom-server list. Joining Cookie Build requires a LAN proxy or a BedrockConnect-style workaround.", consoleGuide: "Open the console setup guide", consoleNotice: "These community workarounds are not operated by Cookie Build.",
      mobileBadge: "Mobile 2.1", mobileTitle: "Cookie Build in your pocket", mobileBody: "Check Java and Bedrock status, see your rank and goals, find online friends and party members, and manage player calls and progress reminders.", actionTitle: "Stay close to the action", actionBody: "Updates, events and app alerts help you find the next active play session.", allUpdates: "See all updates",
      history: "History", historyBody: "Cookie Build started in 2014 as a small project and grew into a mini-games server for the Minecraft PE community. It is still maintained today with Java and Bedrock support.", launched: "Launched", peakScale: "Peak Scale", players: "players", projectStatus: "Project Status", active: "Active",
      features: [
        { title: "Unique Games", description: "Play homemade mini-games built from scratch and found nowhere else." },
        { title: "Global Community", description: "Meet a friendly cross-platform community and find teammates on Discord." },
        { title: "Cross-Platform", description: "Full Java and Bedrock support lets friends play together on any device." },
      ],
      minigamesTitle: "Our Mini-Games",
      games: {
        microbattles: { description: "Fast four-team battles. Gather resources, build defenses and be the last team standing." },
        pitchout: { description: "A chaotic sumo game with knockback weapons and five lives to protect." },
        "build-battle": { description: "Build an amazing creation from a voted theme before time runs out." },
        skywars: { description: "Battle on floating islands, loot chests, bridge to the middle and survive." },
        turfwars: { description: "Build defenses and land bow hits to capture the opposing team's territory." },
        bedwars: { description: "Protect your bed, collect bakery cookies, upgrade your team and eliminate every rival.", status: "Open Beta" },
        skyblock: { description: "Grow a persistent island, upgrade, automate, trade resources and cooperate with friends.", status: "Open Beta" },
      },
      gameLink: (name) => `Play ${name} on Bedrock & Java`,
      faqTitle: "Frequently Asked Questions",
      faqs: [
        { question: "Can I join from Minecraft Bedrock Edition?", answer: "Yes. Windows, Android and iOS players can add play.cookie-build.com with port 19132. Consoles require a community workaround." },
        { question: "Is the server free to play?", answer: "Yes. Every mini-game is free, with a classic and fair experience for everyone." },
        { question: "How do I play on Java Edition?", answer: "Open Multiplayer, choose Add Server and enter play.cookie-build.com. Supported versions range from 1.8 to the latest release." },
        { question: "Is there a Discord community?", answer: "Yes. Use Discord to find teammates, coordinate sessions, report bugs and share suggestions." },
        { question: "When did Cookie Build start?", answer: "The project started in 2014 and once supported more than 2,000 simultaneous players." },
        { question: "Are there rankings?", answer: "Yes. Player Stats shows leaderboards, wins, matches, playtime, coins, levels and recent progress." },
      ],
      aboutTitle: "About the Project", aboutBody: ["Cookie Build is a passion project maintained by Guillaume351. It preserves classic Minecraft mini-games with modern technology.", "Players on phones, tablets, consoles and computers share the same server."], followX: "Follow on X", viewGithub: "View on GitHub",
    },
    catalog: { badge: "Java & Bedrock cross-play", title: "Minecraft mini-games on Cookie Build", intro: "Explore every mode, learn the rules and join from Minecraft Bedrock or Java at play.cookie-build.com.", allModes: "All Cookie Build game modes", viewGuide: (name) => `View ${name} server guide →`, seoTitle: "Minecraft Mini-Games for Bedrock & Java | Cookie Build", seoDescription: "Explore Skyblock, BedWars, Build Battle, MicroBattles, Pitchout, SkyWars and Turf Wars on Cookie Build's free Minecraft Bedrock and Java server." },
    gameUi: { allGames: "← All Cookie Build games", available: "Available now · Free to play", bedrockIp: "Bedrock IP", javaIp: "Java IP", addBedrock: "Add Bedrock server", copyIp: "Copy server IP", serverAddress: "Server address", connectionAddress: "Bedrock and Java address", bedrockPort: "Bedrock port", steps: ["Open Minecraft Bedrock and choose Play → Servers → Add Server.", "Enter the address and port shown above.", "Join Cookie Build, then choose this game in the lobby."], consoleNotice: "On Xbox, PlayStation and Nintendo Switch, custom servers require a LAN proxy or BedrockConnect-style workaround.", stats: "View player stats", faqTitle: (name) => `${name} server FAQ` },
    status: { checking: "Checking server…", onePlayer: "player", players: "players", onlineZero: "Online · 0 players right now", offline: "Server offline", partial: "Status check partially unavailable", unavailable: "Status check unavailable", availability: "Edition availability", checkUnavailable: "check unavailable", online: "online" },
  },
  bg: {
    navigation: { home: "Начало", games: "Игри", playerStats: "Статистика", updates: "Новини", status: "Статус", language: "Език", toggle: "Отвори навигацията" },
    footer: { description: "Класически Minecraft сървър с миниигри, който събира играчи от 2014 г.", quickLinks: "Бързи връзки", serverStatus: "Статус на сървъра", rules: "Правила", support: "Поддръжка", deleteAccount: "Изтриване на профил", privacy: "Поверителност", terms: "Условия", help: "Поддръжка", helpText: "Имате нужда от помощ? Свържете се с екипа ни.", contact: "Свържете се с нас", legal: "Няма връзка с Mojang или Microsoft." },
    common: { copy: "Копирай", copied: "е копирано", available: "Достъпно сега", comingSoon: "Очаквайте скоро", beta: "БЕТА", serverAddress: "Адрес на сървъра", bedrockPort: "Bedrock порт", viewStats: "Статистика на играчите", socialImageAlt: "Minecraft лобито на сървъра Cookie Build" },
    home: {
      title: "Cookie Build | Minecraft миниигри за Java и Bedrock",
      description: "Играйте безплатни Minecraft миниигри в Cookie Build с общ сървър за Java и Bedrock: BedWars, SkyWars, Build Battle и още.",
      hero: "Класическото изживяване с Minecraft миниигри. Поддържаме Java и Bedrock.", copyIp: "Копирай", playNow: "Играй сега", joinDiscord: "Влез в Discord", joinTitle: "Влез в Cookie Build", joinIntro: "Избери своята версия за правилните стъпки.", closeGuide: "Затвори ръководството", editionLabel: "Minecraft версия", consoleEdition: "Конзола",
      javaSteps: ["Отвори Minecraft Java Edition и избери Мрежова игра.", "Избери Добавяне на сървър.", "Постави адреса отдолу и се свържи."],
      bedrockSteps: ["В Windows, Android или iOS отвори Игра → Сървъри → Добавяне на сървър.", "Използвай адреса отдолу и порт 19132.", "Бутонът може да добави сървъра автоматично, ако устройството поддържа Minecraft връзки."],
      addBedrock: "Добави в Bedrock", bedrockFallback: "Ако Minecraft не се отвори, добави адреса и порта ръчно.", consoleText: "Xbox, PlayStation и Nintendo Switch обикновено нямат редактируем списък с външни сървъри. Необходим е посредник в локалната мрежа или решение като BedrockConnect.", consoleGuide: "Ръководство за конзоли", consoleNotice: "Тези общностни решения не се управляват от Cookie Build.",
      mobileBadge: "Мобилно приложение 2.1", mobileTitle: "Cookie Build в джоба ти", mobileBody: "Проверявай Java и Bedrock, следи ранга и целите си, намирай приятели онлайн и управлявай известията.", actionTitle: "Бъди близо до играта", actionBody: "Новините, събитията и известията ти помагат да намериш следващата активна сесия.", allUpdates: "Всички новини",
      history: "История", historyBody: "Cookie Build започва през 2014 г. като малък проект и се превръща в сървър с миниигри за Minecraft PE. Днес продължава да се развива с поддръжка за Java и Bedrock.", launched: "Стартира", peakScale: "Рекорден мащаб", players: "играчи", projectStatus: "Статус на проекта", active: "Активен",
      features: [
        { title: "Уникални игри", description: "Играй авторски миниигри, създадени от нулата." },
        { title: "Световна общност", description: "Срещни приятелски настроени играчи и намери съотборници в Discord." },
        { title: "Всички платформи", description: "Java и Bedrock играчите се събират на един сървър от всяко устройство." },
      ],
      minigamesTitle: "Нашите миниигри",
      games: {
        microbattles: { description: "Бързи битки между четири отбора. Събирай ресурси, строй защити и остани последен." },
        pitchout: { description: "Хаотично сумо с оръжия за отблъскване и пет живота." },
        "build-battle": { description: "Построй невероятно творение по избрана тема, преди времето да изтече." },
        skywars: { description: "Бий се на летящи острови, събирай плячка, строй мостове и оцелей." },
        turfwars: { description: "Строй защити и уцелвай с лък, за да завладееш територията на противника." },
        bedwars: { description: "Пази леглото си, събирай сладкарски бисквитки, подобрявай отбора и победи всички съперници.", status: "Отворена бета" },
        skyblock: { description: "Развивай постоянен остров, подобрявай, автоматизирай, търгувай и строй с приятели.", status: "Отворена бета" },
      },
      gameLink: (name) => `Играй ${name} на Bedrock и Java`,
      faqTitle: "Често задавани въпроси",
      faqs: [
        { question: "Мога ли да играя с Minecraft Bedrock?", answer: "Да. В Windows, Android и iOS добави play.cookie-build.com с порт 19132. За конзолите е нужно общностно решение." },
        { question: "Сървърът безплатен ли е?", answer: "Да. Всички миниигри са безплатни и предлагат честно класическо изживяване." },
        { question: "Как да играя с Java Edition?", answer: "Отвори Мрежова игра, избери Добавяне на сървър и въведи play.cookie-build.com. Поддържаме версии от 1.8 до най-новата." },
        { question: "Има ли Discord общност?", answer: "Да. Намери съотборници, организирай игри, докладвай проблеми и споделяй идеи." },
        { question: "Кога е създаден Cookie Build?", answer: "Проектът стартира през 2014 г. и е поддържал над 2000 едновременни играчи." },
        { question: "Има ли класации?", answer: "Да. Страницата със статистика показва победи, мачове, време, монети, нива и напредък." },
      ],
      aboutTitle: "За проекта", aboutBody: ["Cookie Build е любим проект, поддържан от Guillaume351. Той запазва духа на класическите Minecraft миниигри с модерни технологии.", "Играчите от телефони, таблети, конзоли и компютри са заедно на един сървър."], followX: "Последвай ни в X", viewGithub: "Виж в GitHub",
    },
    catalog: { badge: "Обща игра за Java и Bedrock", title: "Minecraft миниигри в Cookie Build", intro: "Разгледай всички режими, научи правилата и влез от Bedrock или Java на play.cookie-build.com.", allModes: "Всички игрови режими", viewGuide: (name) => `Ръководство за ${name} →`, seoTitle: "Minecraft миниигри за Bedrock и Java | Cookie Build", seoDescription: "Играй Skyblock, BedWars, Build Battle, MicroBattles, Pitchout, SkyWars и Turf Wars безплатно в Minecraft сървъра Cookie Build за Bedrock и Java." },
    gameUi: { allGames: "← Всички игри на Cookie Build", available: "Достъпно · Безплатно", bedrockIp: "Bedrock IP", javaIp: "Java IP", addBedrock: "Добави Bedrock сървър", copyIp: "Копирай IP адреса", serverAddress: "Адрес на сървъра", connectionAddress: "Адрес за Bedrock и Java", bedrockPort: "Bedrock порт", steps: ["В Minecraft Bedrock избери Игра → Сървъри → Добавяне на сървър.", "Въведи показаните адрес и порт.", "Влез в Cookie Build и избери тази игра в лобито."], consoleNotice: "На Xbox, PlayStation и Nintendo Switch външните сървъри изискват посредник в локалната мрежа или решение като BedrockConnect.", stats: "Статистика на играчите", faqTitle: (name) => `Често задавани въпроси за ${name}` },
    status: { checking: "Проверка на сървъра…", onePlayer: "играч", players: "играчи", onlineZero: "Онлайн · в момента няма играчи", offline: "Сървърът е офлайн", partial: "Част от проверките не са достъпни", unavailable: "Проверката не е достъпна", availability: "Достъпност на версиите", checkUnavailable: "проверката не е достъпна", online: "онлайн" },
  },
  es: {
    navigation: { home: "Inicio", games: "Juegos", playerStats: "Estadísticas", updates: "Novedades", status: "Estado", language: "Idioma", toggle: "Abrir navegación" },
    footer: { description: "El servidor clásico de minijuegos de Minecraft que reúne jugadores desde 2014.", quickLinks: "Enlaces rápidos", serverStatus: "Estado del servidor", rules: "Reglas", support: "Soporte", deleteAccount: "Eliminar cuenta", privacy: "Privacidad", terms: "Términos", help: "Soporte", helpText: "¿Necesitas ayuda? Contacta con nuestro equipo.", contact: "Contactar con soporte", legal: "Sin afiliación con Mojang ni Microsoft." },
    common: { copy: "Copiar", copied: "copiado", available: "Disponible ahora", comingSoon: "Próximamente", beta: "BETA", serverAddress: "Dirección del servidor", bedrockPort: "Puerto de Bedrock", viewStats: "Ver estadísticas", socialImageAlt: "Lobby del servidor de Minecraft Cookie Build" },
    home: {
      title: "Cookie Build | Minijuegos de Minecraft para Java y Bedrock",
      description: "Juega gratis a minijuegos de Minecraft en Cookie Build, con servidor conjunto para Java y Bedrock: BedWars, SkyWars, Build Battle y más.",
      hero: "La experiencia clásica de minijuegos de Minecraft. Compatible con Java y Bedrock.", copyIp: "Copiar", playNow: "Jugar ahora", joinDiscord: "Entrar en Discord", joinTitle: "Entrar en Cookie Build", joinIntro: "Elige tu edición para ver la configuración correcta.", closeGuide: "Cerrar la guía", editionLabel: "Edición de Minecraft", consoleEdition: "Consola",
      javaSteps: ["Abre Minecraft Java Edition y selecciona Multijugador.", "Selecciona Añadir servidor.", "Pega la dirección de abajo y entra."],
      bedrockSteps: ["En Windows, Android o iOS, abre Jugar → Servidores → Añadir servidor.", "Usa la dirección de abajo con el puerto 19132.", "El botón puede añadirlo automáticamente si tu dispositivo admite enlaces de Minecraft."],
      addBedrock: "Añadir a Bedrock", bedrockFallback: "Si Minecraft no se abre, añade manualmente la dirección y el puerto.", consoleText: "Xbox, PlayStation y Nintendo Switch no suelen mostrar una lista editable de servidores externos. Necesitas un proxy LAN o una solución como BedrockConnect.", consoleGuide: "Abrir guía para consolas", consoleNotice: "Estas soluciones de la comunidad no están gestionadas por Cookie Build.",
      mobileBadge: "Aplicación móvil 2.1", mobileTitle: "Cookie Build en tu bolsillo", mobileBody: "Comprueba Java y Bedrock, consulta tu rango y objetivos, encuentra amigos conectados y controla los avisos.", actionTitle: "No te pierdas la acción", actionBody: "Las novedades, eventos y alertas te ayudan a encontrar la próxima sesión activa.", allUpdates: "Ver todas las novedades",
      history: "Historia", historyBody: "Cookie Build nació en 2014 como un pequeño proyecto y creció como servidor de minijuegos para Minecraft PE. Hoy sigue activo con soporte para Java y Bedrock.", launched: "Lanzamiento", peakScale: "Máximo alcanzado", players: "jugadores", projectStatus: "Estado del proyecto", active: "Activo",
      features: [
        { title: "Juegos únicos", description: "Disfruta de minijuegos propios creados desde cero." },
        { title: "Comunidad mundial", description: "Conoce a una comunidad multiplataforma y encuentra compañeros en Discord." },
        { title: "Multiplataforma", description: "Java y Bedrock comparten servidor para jugar juntos desde cualquier dispositivo." },
      ],
      minigamesTitle: "Nuestros minijuegos",
      games: {
        microbattles: { description: "Batallas rápidas de cuatro equipos. Reúne recursos, construye defensas y sé el último equipo en pie." },
        pitchout: { description: "Un caótico juego de sumo con armas de empuje y cinco vidas que proteger." },
        "build-battle": { description: "Construye una creación increíble según el tema votado antes de que se acabe el tiempo." },
        skywars: { description: "Lucha en islas flotantes, saquea cofres, construye puentes y sobrevive." },
        turfwars: { description: "Construye defensas y acierta con el arco para conquistar el territorio rival." },
        bedwars: { description: "Protege tu cama, reúne galletas, mejora tu equipo y elimina a todos los rivales.", status: "Beta abierta" },
        skyblock: { description: "Desarrolla una isla persistente, mejora, automatiza, comercia y construye con amigos.", status: "Beta abierta" },
      },
      gameLink: (name) => `Juega a ${name} en Bedrock y Java`,
      faqTitle: "Preguntas frecuentes",
      faqs: [
        { question: "¿Puedo entrar desde Minecraft Bedrock?", answer: "Sí. En Windows, Android o iOS añade play.cookie-build.com con el puerto 19132. Las consolas necesitan una solución de la comunidad." },
        { question: "¿El servidor es gratuito?", answer: "Sí. Todos los minijuegos son gratis y ofrecen una experiencia clásica y justa." },
        { question: "¿Cómo juego en Java Edition?", answer: "Abre Multijugador, elige Añadir servidor e introduce play.cookie-build.com. Admitimos desde la versión 1.8 hasta la más reciente." },
        { question: "¿Hay una comunidad en Discord?", answer: "Sí. Encuentra compañeros, organiza partidas, informa de errores y comparte sugerencias." },
        { question: "¿Cuándo empezó Cookie Build?", answer: "El proyecto comenzó en 2014 y llegó a reunir a más de 2000 jugadores simultáneos." },
        { question: "¿Hay clasificaciones?", answer: "Sí. Estadísticas muestra victorias, partidas, tiempo de juego, monedas, niveles y progreso reciente." },
      ],
      aboutTitle: "Sobre el proyecto", aboutBody: ["Cookie Build es un proyecto personal mantenido por Guillaume351 que conserva el espíritu de los minijuegos clásicos con tecnología moderna.", "Quienes juegan en móviles, tabletas, consolas y computadoras comparten el mismo servidor."], followX: "Seguir en X", viewGithub: "Ver en GitHub",
    },
    catalog: { badge: "Juego conjunto Java y Bedrock", title: "Minijuegos de Minecraft en Cookie Build", intro: "Explora todos los modos, aprende las reglas y entra desde Bedrock o Java en play.cookie-build.com.", allModes: "Todos los modos de Cookie Build", viewGuide: (name) => `Ver la guía de ${name} →`, seoTitle: "Minijuegos de Minecraft para Bedrock y Java | Cookie Build", seoDescription: "Juega gratis a Skyblock, BedWars, Build Battle, MicroBattles, Pitchout, SkyWars y Turf Wars en el servidor de Minecraft Cookie Build para Bedrock y Java." },
    gameUi: { allGames: "← Todos los juegos de Cookie Build", available: "Disponible · Gratis", bedrockIp: "IP de Bedrock", javaIp: "IP de Java", addBedrock: "Añadir servidor Bedrock", copyIp: "Copiar IP del servidor", serverAddress: "Dirección del servidor", connectionAddress: "Dirección de Bedrock y Java", bedrockPort: "Puerto de Bedrock", steps: ["En Minecraft Bedrock, elige Jugar → Servidores → Añadir servidor.", "Introduce la dirección y el puerto mostrados.", "Entra en Cookie Build y elige este juego en el lobby."], consoleNotice: "En Xbox, PlayStation y Nintendo Switch, los servidores externos requieren un proxy LAN o una solución como BedrockConnect.", stats: "Ver estadísticas", faqTitle: (name) => `Preguntas frecuentes de ${name}` },
    status: { checking: "Comprobando servidor…", onePlayer: "jugador", players: "jugadores", onlineZero: "En línea · 0 jugadores ahora", offline: "Servidor fuera de línea", partial: "Comprobación parcialmente no disponible", unavailable: "Comprobación no disponible", availability: "Disponibilidad por edición", checkUnavailable: "comprobación no disponible", online: "en línea" },
  },
  hi: {
    navigation: { home: "होम", games: "गेम", playerStats: "खिलाड़ी आँकड़े", updates: "अपडेट", status: "स्थिति", language: "भाषा", toggle: "नेविगेशन खोलें" },
    footer: { description: "2014 से खिलाड़ियों को जोड़ने वाला क्लासिक Minecraft मिनी-गेम सर्वर।", quickLinks: "ज़रूरी लिंक", serverStatus: "सर्वर स्थिति", rules: "सर्वर नियम", support: "सहायता", deleteAccount: "ऐप खाता हटाएँ", privacy: "गोपनीयता", terms: "शर्तें", help: "सहायता", helpText: "मदद चाहिए? हमारी सहायता टीम से संपर्क करें।", contact: "सहायता से संपर्क", legal: "Mojang या Microsoft से संबद्ध नहीं है।" },
    common: { copy: "कॉपी करें", copied: "कॉपी हो गया", available: "अभी उपलब्ध", comingSoon: "जल्द आ रहा है", beta: "बीटा", serverAddress: "सर्वर पता", bedrockPort: "Bedrock पोर्ट", viewStats: "खिलाड़ी आँकड़े देखें", socialImageAlt: "Cookie Build Minecraft सर्वर की लॉबी" },
    home: {
      title: "Cookie Build | Java और Bedrock के लिए Minecraft मिनी-गेम",
      description: "Cookie Build पर मुफ्त Minecraft मिनी-गेम खेलें। Java और Bedrock के साझा सर्वर पर BedWars, SkyWars, Build Battle और बहुत कुछ।",
      hero: "क्लासिक Minecraft मिनी-गेम अनुभव। Java और Bedrock दोनों समर्थित हैं।", copyIp: "कॉपी करें", playNow: "अभी खेलें", joinDiscord: "Discord से जुड़ें", joinTitle: "Cookie Build से जुड़ें", joinIntro: "सही सेटअप के लिए अपना संस्करण चुनें।", closeGuide: "जुड़ने की गाइड बंद करें", editionLabel: "Minecraft संस्करण", consoleEdition: "कंसोल",
      javaSteps: ["Minecraft Java Edition खोलें और मल्टीप्लेयर चुनें।", "सर्वर जोड़ें चुनें।", "नीचे दिया पता पेस्ट करें और जुड़ें।"],
      bedrockSteps: ["Windows, Android या iOS पर खेलें → सर्वर → सर्वर जोड़ें खोलें।", "नीचे दिया पता और पोर्ट 19132 इस्तेमाल करें।", "यदि डिवाइस Minecraft लिंक समर्थित करता है, तो बटन सर्वर अपने आप जोड़ सकता है।"],
      addBedrock: "Bedrock में जोड़ें", bedrockFallback: "Minecraft न खुले तो पता और पोर्ट हाथ से जोड़ें।", consoleText: "Xbox, PlayStation और Nintendo Switch में आमतौर पर बाहरी सर्वर सूची बदलने का विकल्प नहीं होता। स्थानीय नेटवर्क माध्यम या BedrockConnect जैसे सामुदायिक उपाय की आवश्यकता है।", consoleGuide: "कंसोल सेटअप गाइड खोलें", consoleNotice: "इन सामुदायिक उपायों का संचालन Cookie Build नहीं करता।",
      mobileBadge: "मोबाइल ऐप 2.1", mobileTitle: "Cookie Build आपकी जेब में", mobileBody: "Java और Bedrock की स्थिति, अपना रैंक और लक्ष्य देखें, ऑनलाइन दोस्तों को खोजें और सूचनाएँ नियंत्रित करें।", actionTitle: "खेल से जुड़े रहें", actionBody: "अपडेट, इवेंट और ऐप अलर्ट अगला सक्रिय खेल सत्र खोजने में मदद करते हैं।", allUpdates: "सभी अपडेट देखें",
      history: "इतिहास", historyBody: "Cookie Build 2014 में एक छोटे प्रोजेक्ट के रूप में शुरू हुआ और Minecraft PE समुदाय का मिनी-गेम सर्वर बना। आज Java और Bedrock समर्थन के साथ इसे लगातार बेहतर किया जा रहा है।", launched: "शुरुआत", peakScale: "सबसे बड़ा स्तर", players: "खिलाड़ी", projectStatus: "प्रोजेक्ट स्थिति", active: "सक्रिय",
      features: [
        { title: "अनोखे गेम", description: "शुरू से बनाए गए खास मिनी-गेम खेलें।" },
        { title: "वैश्विक समुदाय", description: "दोस्ताना क्रॉस-प्लेटफ़ॉर्म समुदाय से मिलें और Discord पर साथी पाएँ।" },
        { title: "क्रॉस-प्लेटफ़ॉर्म", description: "Java और Bedrock खिलाड़ी किसी भी डिवाइस से एक साथ खेल सकते हैं।" },
      ],
      minigamesTitle: "हमारे मिनी-गेम",
      games: {
        microbattles: { description: "चार टीमों की तेज़ लड़ाई। संसाधन जुटाएँ, सुरक्षा बनाएँ और आखिरी टीम बनें।" },
        pitchout: { description: "नॉकबैक हथियारों और बचाने के लिए पाँच जानों वाला मज़ेदार सूमो गेम।" },
        "build-battle": { description: "समय खत्म होने से पहले चुनी गई थीम पर शानदार निर्माण बनाएँ।" },
        skywars: { description: "हवा में तैरते द्वीपों पर लड़ें, चेस्ट लूटें, पुल बनाएँ और जीवित रहें।" },
        turfwars: { description: "सुरक्षा बनाएँ और धनुष से निशाना लगाकर दूसरी टीम की ज़मीन जीतें।" },
        bedwars: { description: "अपना बेड बचाएँ, बेकरी कुकी जुटाएँ, टीम अपग्रेड करें और सभी विरोधियों को हराएँ।", status: "ओपन बीटा" },
        skyblock: { description: "स्थायी द्वीप बढ़ाएँ, अपग्रेड और ऑटोमेट करें, व्यापार करें और दोस्तों के साथ बनाएँ।", status: "ओपन बीटा" },
      },
      gameLink: (name) => `${name} को Bedrock और Java पर खेलें`,
      faqTitle: "अक्सर पूछे जाने वाले सवाल",
      faqs: [
        { question: "क्या मैं Minecraft Bedrock से जुड़ सकता हूँ?", answer: "हाँ। Windows, Android और iOS पर play.cookie-build.com को पोर्ट 19132 के साथ जोड़ें। कंसोल के लिए सामुदायिक उपाय चाहिए।" },
        { question: "क्या सर्वर मुफ्त है?", answer: "हाँ। सभी मिनी-गेम मुफ्त हैं और हर खिलाड़ी को निष्पक्ष क्लासिक अनुभव देते हैं।" },
        { question: "Java Edition पर कैसे खेलें?", answer: "मल्टीप्लेयर खोलें, सर्वर जोड़ें चुनें और play.cookie-build.com दर्ज करें। संस्करण 1.8 से नवीनतम तक समर्थित हैं।" },
        { question: "क्या Discord समुदाय है?", answer: "हाँ। साथी खोजें, खेल सत्र तय करें, बग रिपोर्ट करें और सुझाव दें।" },
        { question: "Cookie Build कब शुरू हुआ?", answer: "यह प्रोजेक्ट 2014 में शुरू हुआ और एक समय 2,000 से अधिक खिलाड़ी एक साथ जुड़े थे।" },
        { question: "क्या रैंकिंग उपलब्ध है?", answer: "हाँ। खिलाड़ी आँकड़ों में जीत, मैच, खेलने का समय, कॉइन, स्तर और हाल की प्रगति दिखती है।" },
      ],
      aboutTitle: "प्रोजेक्ट के बारे में", aboutBody: ["Cookie Build, Guillaume351 का बनाया और सँभाला हुआ प्रोजेक्ट है। यह आधुनिक तकनीक के साथ क्लासिक Minecraft मिनी-गेम की भावना बचाता है।", "फोन, टैबलेट, कंसोल और कंप्यूटर के खिलाड़ी एक ही सर्वर पर खेलते हैं।"], followX: "X पर फ़ॉलो करें", viewGithub: "GitHub पर देखें",
    },
    catalog: { badge: "Java और Bedrock साथ खेलें", title: "Cookie Build के Minecraft मिनी-गेम", intro: "हर मोड देखें, नियम सीखें और play.cookie-build.com पर Bedrock या Java से जुड़ें।", allModes: "Cookie Build के सभी गेम मोड", viewGuide: (name) => `${name} सर्वर गाइड देखें →`, seoTitle: "Bedrock और Java के Minecraft मिनी-गेम | Cookie Build", seoDescription: "Cookie Build के मुफ्त Bedrock और Java Minecraft सर्वर पर Skyblock, BedWars, Build Battle, MicroBattles, Pitchout, SkyWars और Turf Wars खेलें।" },
    gameUi: { allGames: "← Cookie Build के सभी गेम", available: "अभी उपलब्ध · मुफ्त", bedrockIp: "Bedrock IP", javaIp: "Java IP", addBedrock: "Bedrock सर्वर जोड़ें", copyIp: "सर्वर IP कॉपी करें", serverAddress: "सर्वर पता", connectionAddress: "Bedrock और Java का पता", bedrockPort: "Bedrock पोर्ट", steps: ["Minecraft Bedrock खोलें और खेलें → सर्वर → सर्वर जोड़ें चुनें।", "ऊपर दिखाया पता और पोर्ट दर्ज करें।", "Cookie Build से जुड़ें और लॉबी में यह गेम चुनें।"], consoleNotice: "Xbox, PlayStation और Nintendo Switch पर बाहरी सर्वर के लिए स्थानीय नेटवर्क माध्यम या BedrockConnect जैसे उपाय की जरूरत होती है।", stats: "खिलाड़ी आँकड़े देखें", faqTitle: (name) => `${name} सर्वर के सवाल` },
    status: { checking: "सर्वर जाँचा जा रहा है…", onePlayer: "खिलाड़ी", players: "खिलाड़ी", onlineZero: "ऑनलाइन · अभी 0 खिलाड़ी", offline: "सर्वर ऑफलाइन है", partial: "स्थिति की कुछ जाँच उपलब्ध नहीं", unavailable: "स्थिति जाँच उपलब्ध नहीं", availability: "संस्करण की उपलब्धता", checkUnavailable: "जाँच उपलब्ध नहीं", online: "ऑनलाइन" },
  },
  "pt-BR": {
    navigation: { home: "Início", games: "Jogos", playerStats: "Estatísticas", updates: "Novidades", status: "Status", language: "Idioma", toggle: "Abrir navegação" },
    footer: { description: "O servidor clássico de minijogos do Minecraft que reúne jogadores desde 2014.", quickLinks: "Links rápidos", serverStatus: "Status do servidor", rules: "Regras", support: "Suporte", deleteAccount: "Excluir conta do app", privacy: "Privacidade", terms: "Termos", help: "Suporte", helpText: "Precisa de ajuda? Fale com nossa equipe.", contact: "Falar com o suporte", legal: "Sem vínculo com a Mojang ou a Microsoft." },
    common: { copy: "Copiar", copied: "copiado", available: "Disponível agora", comingSoon: "Em breve", beta: "BETA", serverAddress: "Endereço do servidor", bedrockPort: "Porta Bedrock", viewStats: "Ver estatísticas", socialImageAlt: "Lobby do servidor de Minecraft Cookie Build" },
    home: {
      title: "Cookie Build | Minijogos de Minecraft para Java e Bedrock",
      description: "Jogue minijogos grátis no Cookie Build, um servidor de Minecraft para Java e Bedrock com BedWars, SkyWars, Build Battle e mais.",
      hero: "A experiência clássica de minijogos do Minecraft. Compatível com Java e Bedrock.", copyIp: "Copiar", playNow: "Jogar agora", joinDiscord: "Entrar no Discord", joinTitle: "Entrar no Cookie Build", joinIntro: "Escolha sua edição para ver a configuração certa.", closeGuide: "Fechar guia", editionLabel: "Edição do Minecraft", consoleEdition: "Console",
      javaSteps: ["Abra o Minecraft Java Edition e escolha Multijogador.", "Escolha Adicionar servidor.", "Cole o endereço abaixo e entre."],
      bedrockSteps: ["No Windows, Android ou iOS, abra Jogar → Servidores → Adicionar servidor.", "Use o endereço abaixo com a porta 19132.", "O botão pode adicionar o servidor automaticamente quando o aparelho aceita links do Minecraft."],
      addBedrock: "Adicionar ao Bedrock", bedrockFallback: "Se o Minecraft não abrir, adicione o endereço e a porta manualmente.", consoleText: "Xbox, PlayStation e Nintendo Switch normalmente não mostram uma lista editável de servidores externos. É necessário um proxy LAN ou uma solução como BedrockConnect.", consoleGuide: "Abrir guia para consoles", consoleNotice: "Essas soluções da comunidade não são operadas pelo Cookie Build.",
      mobileBadge: "App móvel 2.1", mobileTitle: "Cookie Build no seu bolso", mobileBody: "Confira Java e Bedrock, veja seu rank e objetivos, encontre amigos online e controle os avisos.", actionTitle: "Fique perto da ação", actionBody: "Novidades, eventos e alertas ajudam você a encontrar a próxima sessão ativa.", allUpdates: "Ver todas as novidades",
      history: "História", historyBody: "O Cookie Build começou em 2014 como um pequeno projeto e virou um servidor de minijogos para a comunidade Minecraft PE. Hoje continua ativo com suporte para Java e Bedrock.", launched: "Lançamento", peakScale: "Maior escala", players: "jogadores", projectStatus: "Status do projeto", active: "Ativo",
      features: [
        { title: "Jogos únicos", description: "Jogue minijogos próprios, criados do zero." },
        { title: "Comunidade global", description: "Conheça uma comunidade multiplataforma e encontre equipes no Discord." },
        { title: "Multiplataforma", description: "Java e Bedrock compartilham o mesmo servidor em qualquer aparelho." },
      ],
      minigamesTitle: "Nossos minijogos",
      games: {
        microbattles: { description: "Batalhas rápidas entre quatro equipes. Colete recursos, construa defesas e seja a última equipe viva." },
        pitchout: { description: "Um jogo caótico de sumô com armas de repulsão e cinco vidas para proteger." },
        "build-battle": { description: "Crie uma construção incrível a partir do tema votado antes que o tempo acabe." },
        skywars: { description: "Lute em ilhas flutuantes, saqueie baús, construa pontes e sobreviva." },
        turfwars: { description: "Construa defesas e acerte flechas para conquistar o território adversário." },
        bedwars: { description: "Proteja sua cama, colete cookies, melhore a equipe e elimine todos os rivais.", status: "Beta aberto" },
        skyblock: { description: "Desenvolva uma ilha persistente, melhore, automatize, negocie e construa com amigos.", status: "Beta aberto" },
      },
      gameLink: (name) => `Jogue ${name} no Bedrock e Java`,
      faqTitle: "Perguntas frequentes",
      faqs: [
        { question: "Posso entrar pelo Minecraft Bedrock?", answer: "Sim. No Windows, Android ou iOS, adicione play.cookie-build.com com a porta 19132. Consoles precisam de uma solução da comunidade." },
        { question: "O servidor é gratuito?", answer: "Sim. Todos os minijogos são grátis e oferecem uma experiência clássica e justa." },
        { question: "Como jogar na Java Edition?", answer: "Abra Multijogador, escolha Adicionar servidor e digite play.cookie-build.com. Aceitamos da versão 1.8 até a mais recente." },
        { question: "Existe uma comunidade no Discord?", answer: "Sim. Encontre equipes, combine partidas, relate bugs e envie sugestões." },
        { question: "Quando o Cookie Build começou?", answer: "O projeto começou em 2014 e já recebeu mais de 2.000 jogadores simultâneos." },
        { question: "Existem rankings?", answer: "Sim. Estatísticas mostra vitórias, partidas, tempo de jogo, moedas, níveis e progresso recente." },
      ],
      aboutTitle: "Sobre o projeto", aboutBody: ["Cookie Build é um projeto pessoal mantido por Guillaume351 que preserva os minijogos clássicos com tecnologia moderna.", "Jogadores em celulares, tablets, consoles e computadores compartilham o mesmo servidor."], followX: "Seguir no X", viewGithub: "Ver no GitHub",
    },
    catalog: { badge: "Java e Bedrock juntos", title: "Minijogos de Minecraft no Cookie Build", intro: "Explore todos os modos, aprenda as regras e entre pelo Bedrock ou Java em play.cookie-build.com.", allModes: "Todos os modos do Cookie Build", viewGuide: (name) => `Ver guia de ${name} →`, seoTitle: "Minijogos de Minecraft para Bedrock e Java | Cookie Build", seoDescription: "Jogue Skyblock, BedWars, Build Battle, MicroBattles, Pitchout, SkyWars e Turf Wars grátis no servidor Minecraft Bedrock e Java do Cookie Build." },
    gameUi: { allGames: "← Todos os jogos do Cookie Build", available: "Disponível · Grátis", bedrockIp: "IP Bedrock", javaIp: "IP Java", addBedrock: "Adicionar servidor Bedrock", copyIp: "Copiar IP do servidor", serverAddress: "Endereço do servidor", connectionAddress: "Endereço Bedrock e Java", bedrockPort: "Porta Bedrock", steps: ["No Minecraft Bedrock, escolha Jogar → Servidores → Adicionar servidor.", "Digite o endereço e a porta mostrados.", "Entre no Cookie Build e escolha este jogo no lobby."], consoleNotice: "No Xbox, PlayStation e Nintendo Switch, servidores externos exigem um proxy LAN ou solução como BedrockConnect.", stats: "Ver estatísticas", faqTitle: (name) => `Perguntas frequentes sobre ${name}` },
    status: { checking: "Verificando servidor…", onePlayer: "jogador", players: "jogadores", onlineZero: "Online · 0 jogadores agora", offline: "Servidor offline", partial: "Parte da verificação está indisponível", unavailable: "Verificação indisponível", availability: "Disponibilidade por edição", checkUnavailable: "verificação indisponível", online: "online" },
  },
};
