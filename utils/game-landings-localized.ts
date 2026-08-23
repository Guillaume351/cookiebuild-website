import {
  COOKIE_BUILD_BEDROCK_PORT,
  COOKIE_BUILD_SERVER_IP,
  gameLandings,
  type GameLanding,
  type GameLandingFaq,
  type GameLandingStep,
} from "./game-landings";
import { localizedSitePath, type SiteLocaleCode } from "./site-locales";

interface GameTranslationSeed {
  cardDescription: string;
  heroIntro: string;
  joinIntro: string;
  gameplayEyebrow: string;
  gameplayHeading: string;
  steps: GameLandingStep[];
  highlightHeading: string;
  highlightBody: string;
  faqs: GameLandingFaq[];
}

type LocalizedSeeds = Record<Exclude<SiteLocaleCode, "en">, Record<string, GameTranslationSeed>>;

const LOCALIZED_SEEDS: LocalizedSeeds = {
  bg: {
    bedwars: {
      cardDescription: "Пази леглото си, събирай сладкарски бисквитки, подобрявай отбора и победи всички съперници.",
      heroIntro: "Играй BedWars в Cookie Colosseum — летяща арена със сладкарска тема за общи Java и Bedrock мачове. Пази леглото, събирай ресурси, подобрявай отбора и унищожи леглата на противниците.",
      joinIntro: "BedWars е бета режим. Java и Bedrock играчите участват в едни и същи четириотборни мачове с меню, пригодено за всяка версия.",
      gameplayEyebrow: "Легла, мостове и бисквитки",
      gameplayHeading: "Как се играе BedWars в Cookie Build",
      steps: [
        { title: "Пази леглото", description: "Присъедини се към отбор и защити острова си, за да могат съотборниците ти да се възраждат." },
        { title: "Събирай и подобрявай", description: "Събирай бисквитки, злато, диаманти и изумруди за екипировка, блокове и отборни подобрения." },
        { title: "Унищожи противниците", description: "Строй мостове, счупи чуждите легла и елиминирай играчите, които вече не могат да се възродят." },
      ],
      highlightHeading: "BedWars магазин за Java и Bedrock",
      highlightBody: "Java използва познат инвентарен магазин, а Bedrock — естествени форми със същите предмети, цени и правила. Cookie Colosseum има четири бази, диамантени острови и изумруди в центъра.",
      faqs: [
        { question: "Могат ли Java и Bedrock играчи да играят заедно?", answer: "Да. И двете версии споделят един мач, каталог, цени и правила." },
        { question: "За какво служат бисквитките?", answer: "Те са основният ресурс на базата и купуват начални блокове и екипировка. По-силните покупки използват злато, диаманти и изумруди." },
        { question: "Как се печели BedWars?", answer: "Пази своето легло, унищожи леглата на другите отбори и елиминирай всички останали играчи." },
      ],
    },
    skyblock: {
      cardDescription: "Развивай постоянен остров, подобрявай генератора, изпълнявай задачи, търгувай и строй с приятели.",
      heroIntro: "Започни постоянен остров Cookie Orchard. Разширявай се над бездната, подобрявай генератора, изпълнявай задачи, събирай продукцията на работниците, търгувай и кани доверени приятели от Java или Bedrock.",
      joinIntro: "Skyblock е постоянен бета режим за Bedrock и Java. Водените менюта поддържат острова, подобренията, склада, задачите, co-op и пазара и в двете версии.",
      gameplayEyebrow: "Един остров, постоянен напредък",
      gameplayHeading: "Как работи Skyblock в Cookie Build",
      steps: [
        { title: "Развивай острова", description: "Започни на защитен Cookie Orchard, събирай ресурси и строй безопасно над бездната." },
        { title: "Подобрявай и автоматизирай", description: "Подобрявай генератора, изпълнявай задачи и събирай продукцията на работниците." },
        { title: "Търгувай и работи заедно", description: "Продавай поддържани предмети, купувай ресурси и управлявай доверени co-op членове." },
      ],
      highlightHeading: "Управлявай Skyblock в играта и мобилното приложение",
      highlightBody: "Приложението показва острова и склада и позволява безопасни действия: подобряване на генератора, събиране от работници, получаване на награди, продажби, покупки и приемане на co-op покани. Сървърът проверява всяко действие.",
      faqs: [
        { question: "Запазва ли се островът между сесиите?", answer: "Да. Островът, складът, подобренията, задачите, работниците, обявите и co-op членовете се пазят постоянно." },
        { question: "Какво може да управлява приложението?", answer: "След свързване на играч приложението показва острова и извършва разрешени подобрения, събиране, награди, пазарни действия и приемане на покани." },
        { question: "Могат ли Java и Bedrock да споделят остров?", answer: "Да. И двете версии използват един постоянен свят и защитената co-op система." },
      ],
    },
    "build-battle": {
      cardDescription: "Гласувай за тема, строй пет минути в собствен парцел и оцени всяко творение.",
      heroIntro: "Влез в Build Battle от Bedrock или Java, гласувай за тема, създай постройка за пет минути и оцени всички парцели. Това е истински мултиплейър сървър, а не карта за изтегляне.",
      joinIntro: "Играчите от Windows, Android, iOS и Java споделят едни и същи Build Battle мачове.",
      gameplayEyebrow: "Една тема, безкрайни идеи",
      gameplayHeading: "Как работи Build Battle",
      steps: [
        { title: "Гласувай за тема", description: "Избери една от три предложени теми, докато мачът се запълва." },
        { title: "Строй пет минути", description: "Създай запомняща се постройка в своя парцел с общата палитра за Java и Bedrock." },
        { title: "Оцени парцелите", description: "Разгледай творенията, дай оценка от 1 до 5 и виж крайното класиране." },
      ],
      highlightHeading: "Build Battle за всички платформи",
      highlightBody: "Гласуване за тема, осем отделни парцела, избор на блокове, промяна на пода и оценяване от 1 до 5 работят еднакво в Bedrock и Java.",
      faqs: [
        { question: "Това Bedrock Build Battle сървър ли е?", answer: "Да. Bedrock играчите влизат с адреса и порта по-горе и играят заедно с Java." },
        { question: "Колко продължава строенето?", answer: "Всеки има пет минути да завърши постройката си преди оценяването." },
        { question: "Как се избира победителят?", answer: "Играчите оценяват всеки парцел от 1 до 5, а най-високият общ резултат печели." },
      ],
    },
    microbattles: {
      cardDescription: "Бий се в четири малки отбора, използвай умно комплект и блокове и остани последен.",
      heroIntro: "Играй бързи битки между четири отбора. Избери комплект, подготви се зад стените и помогни на Сините, Червените, Жълтите или Зелените да останат последни.",
      joinIntro: "Bedrock и Java споделят една опашка. В компактните арени играят до четири отбора с по трима души.",
      gameplayEyebrow: "Малки карти, бързи решения",
      gameplayHeading: "Как работи MicroBattles",
      steps: [
        { title: "Избери отбор", description: "Син, Червен, Жълт и Зелен приемат до трима играчи." },
        { title: "Подготви комплекта", description: "Започни с избрания комплект и цветна вълна, докато стените пазят отборите." },
        { title: "Оцелей в битката", description: "След 15 секунди стените падат. Елиминирай другите отбори и запази съотборник жив." },
      ],
      highlightHeading: "Четири отбора и осем класически арени",
      highlightBody: "Комплекти, ограничени блокове, близък бой, асистенции и отборна игра се събират в кратки мачове с монети и опит.",
      faqs: [
        { question: "Колко играчи има в MicroBattles?", answer: "Пълен мач има до 12 играчи в четири отбора по трима." },
        { question: "Как се печели?", answer: "Елиминирай останалите отбори. Последният отбор с жив играч печели." },
        { question: "Има ли избор на комплект?", answer: "Да. Избираш комплект преди стените да паднат, а името и описанието му са преведени и в Bedrock менюто." },
      ],
    },
    pitchout: {
      cardDescription: "Използвай силно отблъскване, за да изхвърлиш противниците, и пази петте си живота.",
      heroIntro: "Pitchout е оригинална миниигра на Cookie Build. Изхвърляй противниците от арената с лопата и лък, пази петте си живота и остани последен.",
      joinIntro: "Bedrock и Java споделят арените, гласуването за карта, таблото, наградите и прогреса.",
      gameplayEyebrow: "Пет живота, един победител",
      gameplayHeading: "Как работи Pitchout",
      steps: [
        { title: "Гласувай за арена", description: "Избери между наличните карти, докато играчите се събират." },
        { title: "Овладей отблъскването", description: "Използвай лопатата отблизо или лъка, за да удариш от разстояние." },
        { title: "Пази пет живота", description: "Всяко падане отнема живот. Продължи да се биеш, докато остане един играч." },
      ],
      highlightHeading: "Класическа оригинална игра на Cookie Build",
      highlightBody: "Три различни арени имат собствени сили на отблъскване и позиции. Мачът следи елиминации, удари и комбинации и дава монети и опит.",
      faqs: [
        { question: "Каква е екипировката в Pitchout?", answer: "Всеки получава дървена лопата със силно отблъскване, лък Punch и безкрайна стрела." },
        { question: "Как се печели Pitchout?", answer: "Всеки започва с пет живота. Изхвърляй противниците, докато останеш последен." },
        { question: "Имената на картите преведени ли са?", answer: "Да. Bedrock и Java показват локализирани имена, а вътрешните идентификатори на картите остават непроменени." },
      ],
    },
    skywars: {
      cardDescription: "Събирай плячка на острова, строй към по-силните централни сандъци и оцелей последен.",
      heroIntro: "Играй класически самостоятелен SkyWars от Bedrock или Java. Започни на летящ остров, отвори сандъците, построй мост към центъра и оцелей над бездната.",
      joinIntro: "Bedrock и Java споделят опашки, комплекти, плячка, карти и постоянен прогрес.",
      gameplayEyebrow: "Плячка, мостове, оцеляване",
      gameplayHeading: "Как работи SkyWars в Cookie Build",
      steps: [
        { title: "Избери комплект", description: "Подготви стила си и се появи на отделен летящ остров." },
        { title: "Събирай и строй", description: "Отвори сандъците, вземи блокове и стигни до центъра за по-силна плячка." },
        { title: "Остани последен", description: "Бий се, избягвай бездната и надживей всички противници." },
      ],
      highlightHeading: "Четири възстановени SkyWars арени",
      highlightBody: "Четири класически островни карти имат проверени начални позиции и по-богати централни сандъци. Участието, елиминациите и победите носят прогрес.",
      faqs: [
        { question: "Има ли комплекти в SkyWars?", answer: "Да. Избираш комплект преди мача; имената и съобщенията са преведени и в Bedrock, и в Java." },
        { question: "Колко карти има?", answer: "Cookie Build върти четири възстановени класически SkyWars арени." },
        { question: "SkyWars отборен режим ли е?", answer: "Не. Това е самостоятелна игра: всеки започва на отделен остров и последният оцелял печели." },
      ],
    },
    turfwars: {
      cardDescription: "Строй защити, уцелвай с лък и изтласкай територията на отбора си през арената.",
      heroIntro: "Влез при Сините или Червените в Turf Wars. Редувай кратки фази за строене и бой, защитавай страната си и печели територия с всеки точен изстрел.",
      joinIntro: "Turf Wars поддържа от 2 до 10 Bedrock и Java играчи в балансирани Син и Червен отбор.",
      gameplayEyebrow: "Строй, стреляй, завладявай",
      gameplayHeading: "Как работи Turf Wars",
      steps: [
        { title: "Строй 25 секунди", description: "Използвай цветна вълна в своята територия за прикритие и позиции." },
        { title: "Бий се 90 секунди", description: "Уцелвай противниците с нечупливия лък и възстановяващата се стрела." },
        { title: "Достигни 72 точки", description: "Всеки удар мести границата с две колони. Първият отбор с 72 печели." },
      ],
      highlightHeading: "Балансиран отборен бой за всички платформи",
      highlightBody: "Мачовете редуват строене и бой до 12 минути. Ударите, участието и победата носят прогрес, а 60-секундно връщане пази кратките прекъсвания.",
      faqs: [
        { question: "Колко играчи поддържа Turf Wars?", answer: "От 2 до 10 играчи се разпределят в балансирани Син и Червен отбор." },
        { question: "Как се печели Turf Wars?", answer: "Всеки точен изстрел мести границата с две колони. Първият отбор с 72 точки печели." },
        { question: "Java и Bedrock играят ли заедно?", answer: "Да. И двете версии споделят мача, фазите, отборите и прогреса." },
      ],
    },
  },
  es: {
    bedwars: {
      cardDescription: "Protege tu cama, reúne galletas, mejora tu equipo y elimina a todos los rivales.",
      heroIntro: "Juega a BedWars en Cookie Colosseum, una arena flotante con temática de pastelería para Java y Bedrock. Protege tu cama, reúne recursos, mejora al equipo y destruye las camas enemigas.",
      joinIntro: "BedWars está en beta. Los jugadores de Java y Bedrock comparten partidas de cuatro equipos con menús adaptados a cada edición.",
      gameplayEyebrow: "Camas, puentes y galletas",
      gameplayHeading: "Cómo funciona BedWars en Cookie Build",
      steps: [
        { title: "Protege tu cama", description: "Únete a un equipo y defiende tu isla para que tus compañeros puedan reaparecer." },
        { title: "Reúne y mejora", description: "Consigue galletas, oro, diamantes y esmeraldas para comprar equipo, bloques y mejoras." },
        { title: "Elimina a los rivales", description: "Construye puentes, rompe las camas enemigas y elimina a quienes ya no pueden reaparecer." },
      ],
      highlightHeading: "Una tienda BedWars para Java y Bedrock",
      highlightBody: "Java usa una tienda de inventario y Bedrock formularios nativos, siempre con los mismos objetos, precios y reglas. Cookie Colosseum tiene cuatro bases, islas de diamantes y esmeraldas en el centro.",
      faqs: [
        { question: "¿Java y Bedrock pueden jugar juntos?", answer: "Sí. Las dos ediciones comparten partida, catálogo, precios y reglas." },
        { question: "¿Para qué sirven las galletas?", answer: "Son el recurso principal de la base para bloques y equipo inicial. Las compras fuertes usan oro, diamantes y esmeraldas." },
        { question: "¿Cómo se gana BedWars?", answer: "Protege tu cama, destruye las camas rivales y elimina a todos los jugadores que ya no pueden reaparecer." },
      ],
    },
    skyblock: {
      cardDescription: "Desarrolla una isla persistente, mejora su generador, completa misiones, comercia y construye con amigos.",
      heroIntro: "Empieza una isla persistente Cookie Orchard. Amplíala sobre el vacío, mejora el generador, completa misiones, recoge la producción, comercia en el mercado e invita a personas de confianza desde Java o Bedrock.",
      joinIntro: "Skyblock es un modo beta persistente para Bedrock y Java. Los menús guiados permiten gestionar isla, mejoras, almacén, misiones, cooperativa y mercado en ambas ediciones.",
      gameplayEyebrow: "Una isla, progreso duradero",
      gameplayHeading: "Cómo funciona Skyblock en Cookie Build",
      steps: [
        { title: "Desarrolla tu isla", description: "Empieza en una Cookie Orchard protegida, reúne recursos y construye con seguridad sobre el vacío." },
        { title: "Mejora y automatiza", description: "Mejora el generador, completa misiones y recoge la producción de los trabajadores." },
        { title: "Comercia y coopera", description: "Vende objetos admitidos, compra recursos y gestiona miembros de confianza en la cooperativa." },
      ],
      highlightHeading: "Gestiona Skyblock en el juego y desde la aplicación",
      highlightBody: "La aplicación muestra tu isla y almacén y permite acciones seguras: mejorar el generador, recoger producción, reclamar misiones, vender, comprar y aceptar invitaciones. El servidor valida cada acción.",
      faqs: [
        { question: "¿La isla se conserva entre sesiones?", answer: "Sí. La isla, almacén, mejoras, misiones, trabajadores, anuncios y miembros se guardan de forma persistente." },
        { question: "¿Qué puedo gestionar desde la aplicación?", answer: "Tras vincular tu jugador, puedes consultar la isla y realizar mejoras autorizadas, recogidas, misiones, operaciones de mercado y aceptar invitaciones." },
        { question: "¿Java y Bedrock pueden compartir una isla?", answer: "Sí. Las dos ediciones usan el mismo mundo persistente y el sistema cooperativo protegido." },
      ],
    },
    "build-battle": {
      cardDescription: "Vota por un tema, construye cinco minutos en tu parcela y puntúa cada creación.",
      heroIntro: "Entra a Build Battle desde Bedrock o Java, vota por un tema, crea una construcción en cinco minutos y puntúa todas las parcelas. Es un servidor multijugador, no un mapa para descargar.",
      joinIntro: "Windows, Android, iOS y Java comparten las mismas partidas de Build Battle.",
      gameplayEyebrow: "Un tema, infinitas ideas",
      gameplayHeading: "Cómo funciona Build Battle",
      steps: [
        { title: "Vota por un tema", description: "Elige entre tres temas propuestos mientras se completa la partida." },
        { title: "Construye cinco minutos", description: "Crea algo memorable en tu parcela con una paleta compatible con Java y Bedrock." },
        { title: "Puntúa las parcelas", description: "Visita las creaciones, puntúa del 1 al 5 y descubre la clasificación final." },
      ],
      highlightHeading: "Build Battle multiplataforma",
      highlightBody: "La votación, ocho parcelas privadas, la paleta de bloques, el suelo personalizable y las puntuaciones funcionan igual en Bedrock y Java.",
      faqs: [
        { question: "¿Es un servidor Build Battle para Bedrock?", answer: "Sí. Entra con la dirección y el puerto indicados y juega con usuarios de Java." },
        { question: "¿Cuánto dura la fase de construcción?", answer: "Cada participante tiene cinco minutos antes de comenzar la votación." },
        { question: "¿Cómo se elige al ganador?", answer: "Todos puntúan cada parcela del 1 al 5 y gana la mayor puntuación total." },
      ],
    },
    microbattles: {
      cardDescription: "Lucha en cuatro equipos compactos, aprovecha tu kit y tus bloques y sé el último equipo vivo.",
      heroIntro: "Participa en combates rápidos de cuatro equipos. Elige un kit, prepárate tras los muros y consigue que Azul, Rojo, Amarillo o Verde sea el último equipo en pie.",
      joinIntro: "Bedrock y Java comparten cola. Las arenas admiten cuatro equipos de hasta tres jugadores.",
      gameplayEyebrow: "Mapas compactos, decisiones rápidas",
      gameplayHeading: "Cómo funciona MicroBattles",
      steps: [
        { title: "Elige un equipo", description: "Azul, Rojo, Amarillo y Verde admiten hasta tres jugadores cada uno." },
        { title: "Prepara tu kit", description: "Empieza con tu kit y lana de equipo mientras los muros separan la arena." },
        { title: "Sobrevive al combate", description: "Los muros caen tras 15 segundos. Elimina a los otros equipos y conserva un aliado vivo." },
      ],
      highlightHeading: "Cuatro equipos y ocho arenas clásicas",
      highlightBody: "Kits, bloques limitados, combate cercano, asistencias y juego de equipo se combinan en partidas rápidas con monedas y experiencia.",
      faqs: [
        { question: "¿Cuántos jugadores tiene una partida?", answer: "Hasta 12 jugadores repartidos en cuatro equipos de tres." },
        { question: "¿Cómo se gana MicroBattles?", answer: "Elimina a los demás equipos. Gana el último equipo con un jugador vivo." },
        { question: "¿Se puede elegir un kit?", answer: "Sí. Elige tu kit antes de que caigan los muros; su nombre y estado están traducidos también en Bedrock." },
      ],
    },
    pitchout: {
      cardDescription: "Usa armas de gran empuje para lanzar rivales al vacío mientras proteges tus cinco vidas.",
      heroIntro: "Pitchout es un minijuego original de Cookie Build. Lanza rivales fuera de la arena con una pala y un arco, protege tus cinco vidas y sé el último jugador en pie.",
      joinIntro: "Bedrock y Java comparten arenas, votación de mapas, marcador, recompensas y progreso.",
      gameplayEyebrow: "Cinco vidas, un ganador",
      gameplayHeading: "Cómo funciona Pitchout",
      steps: [
        { title: "Vota por una arena", description: "Elige entre los mapas disponibles mientras se llena la partida." },
        { title: "Domina el empuje", description: "Usa la pala a corta distancia o el arco para golpear desde lejos." },
        { title: "Protege cinco vidas", description: "Cada caída cuesta una vida. Sigue luchando hasta que quede una sola persona." },
      ],
      highlightHeading: "Un clásico original de Cookie Build",
      highlightBody: "Tres arenas tienen distintos niveles de empuje y puntos de aparición. La partida registra eliminaciones, golpes y combos, y entrega monedas y experiencia.",
      faqs: [
        { question: "¿Qué equipo recibes en Pitchout?", answer: "Una pala de madera con gran empuje, un arco con Punch y una flecha infinita." },
        { question: "¿Cómo se gana Pitchout?", answer: "Cada jugador comienza con cinco vidas. Expulsa a tus rivales hasta ser el último." },
        { question: "¿Los mapas están traducidos?", answer: "Sí. Java y Bedrock muestran nombres localizados, pero mantienen los identificadores internos estables." },
      ],
    },
    skywars: {
      cardDescription: "Saquea tu isla, construye hacia los cofres centrales y sobrevive a todos tus rivales.",
      heroIntro: "Juega partidas clásicas de SkyWars en solitario desde Bedrock o Java. Empieza en una isla flotante, saquea cofres, construye hacia el centro y evita el vacío para ganar.",
      joinIntro: "Bedrock y Java comparten colas, kits, botín, mapas y progreso permanente.",
      gameplayEyebrow: "Saquea, construye, sobrevive",
      gameplayHeading: "Cómo funciona SkyWars en Cookie Build",
      steps: [
        { title: "Elige tu kit", description: "Prepara tu estilo antes de aparecer en una isla flotante." },
        { title: "Saquea y construye", description: "Abre cofres, consigue bloques y llega al centro para encontrar mejor botín." },
        { title: "Sé el último", description: "Lucha, evita el vacío y sobrevive a todos los demás jugadores." },
      ],
      highlightHeading: "Cuatro arenas SkyWars restauradas",
      highlightBody: "Cuatro mapas clásicos tienen apariciones validadas y cofres centrales mejorados. La participación, las eliminaciones y las victorias dan progreso.",
      faqs: [
        { question: "¿SkyWars tiene kits?", answer: "Sí. Elige un kit antes de la partida; los nombres y mensajes están traducidos en Bedrock y Java." },
        { question: "¿Cuántos mapas hay?", answer: "Cookie Build rota cuatro arenas clásicas de SkyWars restauradas." },
        { question: "¿Es individual o por equipos?", answer: "Es una partida individual. Cada persona empieza en una isla y gana la última superviviente." },
      ],
    },
    turfwars: {
      cardDescription: "Construye defensas, acierta con el arco y empuja el territorio de tu equipo por la arena.",
      heroIntro: "Únete a Azul o Rojo en Turf Wars. Alterna fases cortas de construcción y combate, defiende tu zona y gana territorio con cada flecha acertada.",
      joinIntro: "Turf Wars admite de 2 a 10 jugadores de Bedrock y Java en equipos Azul y Rojo equilibrados.",
      gameplayEyebrow: "Construye, combate, conquista",
      gameplayHeading: "Cómo funciona Turf Wars",
      steps: [
        { title: "Construye 25 segundos", description: "Usa lana de tu color dentro del territorio para crear cobertura y posiciones de tiro." },
        { title: "Combate 90 segundos", description: "Acierta a los rivales con un arco irrompible y una flecha que se repone." },
        { title: "Llega a 72 puntos", description: "Cada impacto mueve dos columnas. El primer equipo que alcance 72 gana." },
      ],
      highlightHeading: "Combate equilibrado y multiplataforma",
      highlightBody: "Las partidas alternan construcción y combate durante un máximo de 12 minutos. Los impactos, la participación y la victoria dan progreso, y hay 60 segundos para reconectar.",
      faqs: [
        { question: "¿Cuántos jugadores admite Turf Wars?", answer: "De 2 a 10, repartidos en equipos Azul y Rojo equilibrados." },
        { question: "¿Cómo se gana Turf Wars?", answer: "Cada impacto mueve el límite dos columnas. Gana el primer equipo que llegue a 72 puntos." },
        { question: "¿Java y Bedrock juegan juntos?", answer: "Sí. Comparten partida, fases, equipos y progreso." },
      ],
    },
  },
  hi: {
    bedwars: {
      cardDescription: "अपना बेड बचाएँ, बेकरी कुकी जुटाएँ, टीम अपग्रेड करें और सभी विरोधियों को हराएँ।",
      heroIntro: "Cookie Colosseum में BedWars खेलें—Java और Bedrock के लिए बेकरी थीम वाली तैरती हुई एरीना। बेड बचाएँ, संसाधन जुटाएँ, टीम अपग्रेड करें और दुश्मनों के बेड तोड़ें।",
      joinIntro: "BedWars अभी बीटा में है। Java और Bedrock खिलाड़ी एक ही चार-टीम मैच खेलते हैं और हर संस्करण के लिए सही मेनू मिलता है।",
      gameplayEyebrow: "बेड, पुल और बेकरी कुकी",
      gameplayHeading: "Cookie Build BedWars कैसे खेलें",
      steps: [
        { title: "अपना बेड बचाएँ", description: "एक टीम में जाएँ और अपने द्वीप की रक्षा करें ताकि साथी फिर से जन्म ले सकें।" },
        { title: "संसाधन और अपग्रेड", description: "कुकी, सोना, डायमंड और एमराल्ड से सामान, ब्लॉक और टीम अपग्रेड खरीदें।" },
        { title: "विरोधियों को हराएँ", description: "पुल बनाएँ, दुश्मन के बेड तोड़ें और फिर से जन्म न ले सकने वाले खिलाड़ियों को बाहर करें।" },
      ],
      highlightHeading: "Java और Bedrock के लिए BedWars दुकान",
      highlightBody: "Java में इन्वेंटरी दुकान और Bedrock में नेटिव फ़ॉर्म हैं, लेकिन सामान, कीमत और नियम समान हैं। Cookie Colosseum में चार बेस, डायमंड द्वीप और बीच में एमराल्ड हैं।",
      faqs: [
        { question: "क्या Java और Bedrock साथ खेल सकते हैं?", answer: "हाँ। दोनों संस्करण एक ही मैच, कैटलॉग, कीमत और नियम साझा करते हैं।" },
        { question: "कुकी किस काम आती हैं?", answer: "यह बेस का मुख्य संसाधन है जिससे शुरुआती ब्लॉक और सामान खरीदे जाते हैं। बेहतर चीज़ों के लिए सोना, डायमंड और एमराल्ड चाहिए।" },
        { question: "BedWars कैसे जीतें?", answer: "अपना बेड बचाएँ, दूसरी टीमों के बेड तोड़ें और फिर सभी बाकी खिलाड़ियों को हराएँ।" },
      ],
    },
    skyblock: {
      cardDescription: "स्थायी द्वीप बढ़ाएँ, जनरेटर अपग्रेड करें, क्वेस्ट पूरी करें, व्यापार करें और दोस्तों के साथ बनाएँ।",
      heroIntro: "Cookie Orchard का स्थायी द्वीप शुरू करें। शून्य के ऊपर फैलाएँ, जनरेटर अपग्रेड करें, क्वेस्ट पूरी करें, वर्कर उत्पादन लें, बाज़ार में व्यापार करें और Java या Bedrock के भरोसेमंद दोस्तों को बुलाएँ।",
      joinIntro: "Skyblock, Bedrock और Java का स्थायी बीटा मोड है। गाइड वाले मेनू दोनों संस्करणों पर द्वीप, अपग्रेड, स्टोरेज, क्वेस्ट, co-op और बाज़ार चलाना आसान बनाते हैं।",
      gameplayEyebrow: "एक द्वीप, लंबे समय की प्रगति",
      gameplayHeading: "Cookie Build Skyblock कैसे चलता है",
      steps: [
        { title: "द्वीप बढ़ाएँ", description: "सुरक्षित Cookie Orchard से शुरू करें, संसाधन लें और शून्य के ऊपर सावधानी से निर्माण करें।" },
        { title: "अपग्रेड और ऑटोमेट करें", description: "जनरेटर बेहतर करें, क्वेस्ट पूरी करें और वर्कर का उत्पादन इकट्ठा करें।" },
        { title: "व्यापार और सहयोग करें", description: "समर्थित सामान बेचें, संसाधन खरीदें और भरोसेमंद co-op सदस्य सँभालें।" },
      ],
      highlightHeading: "गेम और मोबाइल ऐप से Skyblock सँभालें",
      highlightBody: "ऐप द्वीप और स्टोरेज दिखाता है और सुरक्षित काम करने देता है: जनरेटर अपग्रेड, वर्कर संग्रह, क्वेस्ट इनाम, बिक्री, खरीद और co-op निमंत्रण स्वीकार करना। हर काम सर्वर जाँचता है।",
      faqs: [
        { question: "क्या द्वीप अगली बार भी रहता है?", answer: "हाँ। द्वीप, स्टोरेज, अपग्रेड, क्वेस्ट, वर्कर, लिस्टिंग और co-op सदस्य स्थायी रूप से सहेजे जाते हैं।" },
        { question: "ऐप से क्या सँभाल सकते हैं?", answer: "खिलाड़ी लिंक करने के बाद द्वीप देखें और अनुमत अपग्रेड, संग्रह, क्वेस्ट, बाज़ार और निमंत्रण वाले काम करें।" },
        { question: "क्या Java और Bedrock एक द्वीप साझा कर सकते हैं?", answer: "हाँ। दोनों संस्करण एक ही स्थायी दुनिया और सुरक्षित co-op प्रणाली इस्तेमाल करते हैं।" },
      ],
    },
    "build-battle": {
      cardDescription: "थीम चुनें, अपने प्लॉट पर पाँच मिनट बनाएँ और हर रचना को अंक दें।",
      heroIntro: "Bedrock या Java से Build Battle खेलें, थीम के लिए वोट करें, पाँच मिनट में निर्माण बनाएँ और सभी प्लॉट को अंक दें। यह असली मल्टीप्लेयर सर्वर है, डाउनलोड वाली मैप नहीं।",
      joinIntro: "Windows, Android, iOS और Java खिलाड़ी एक ही Build Battle मैच खेलते हैं।",
      gameplayEyebrow: "एक थीम, अनगिनत विचार",
      gameplayHeading: "Build Battle कैसे चलता है",
      steps: [
        { title: "थीम चुनें", description: "मैच भरते समय तीन सुझाई गई थीम में से एक के लिए वोट करें।" },
        { title: "पाँच मिनट बनाएँ", description: "Java और Bedrock की साझा ब्लॉक सूची से अपने प्लॉट पर यादगार निर्माण बनाएँ।" },
        { title: "हर प्लॉट को अंक दें", description: "सभी रचनाएँ देखें, 1 से 5 अंक दें और अंतिम रैंकिंग देखें।" },
      ],
      highlightHeading: "क्रॉस-प्लेटफ़ॉर्म Build Battle",
      highlightBody: "थीम वोट, आठ निजी प्लॉट, ब्लॉक सूची, फ़्लोर बदलना और 1 से 5 अंक देना Bedrock और Java दोनों पर समान चलता है।",
      faqs: [
        { question: "क्या यह Bedrock Build Battle सर्वर है?", answer: "हाँ। ऊपर दिए पते और पोर्ट से जुड़ें और Java खिलाड़ियों के साथ खेलें।" },
        { question: "निर्माण के लिए कितना समय मिलता है?", answer: "अंक देने से पहले हर खिलाड़ी को पाँच मिनट मिलते हैं।" },
        { question: "विजेता कैसे चुना जाता है?", answer: "खिलाड़ी हर प्लॉट को 1 से 5 अंक देते हैं और सबसे अधिक कुल अंक वाला जीतता है।" },
      ],
    },
    microbattles: {
      cardDescription: "चार छोटी टीमों में लड़ें, किट और ब्लॉक समझदारी से इस्तेमाल करें और आखिरी टीम बनें।",
      heroIntro: "चार टीमों की तेज़ Minecraft लड़ाई खेलें। किट चुनें, दीवारों के पीछे तैयारी करें और नीली, लाल, पीली या हरी टीम को आखिरी जीवित टीम बनाएँ।",
      joinIntro: "Bedrock और Java की कतार एक है। एरीना में चार टीमों के अधिकतम तीन-तीन खिलाड़ी होते हैं।",
      gameplayEyebrow: "छोटी मैप, तेज़ फैसले",
      gameplayHeading: "MicroBattles कैसे चलता है",
      steps: [
        { title: "चार टीमों में से चुनें", description: "नीली, लाल, पीली और हरी टीम में अधिकतम तीन खिलाड़ी होते हैं।" },
        { title: "किट तैयार रखें", description: "अपनी किट और टीम के रंग की ऊन पाएँ, जबकि दीवारें टीमों को अलग रखती हैं।" },
        { title: "लड़ाई में बचें", description: "15 सेकंड बाद दीवारें गिरती हैं। दूसरी टीमों को हराएँ और कम से कम एक साथी जीवित रखें।" },
      ],
      highlightHeading: "चार टीमें और आठ क्लासिक एरीना",
      highlightBody: "किट, सीमित ब्लॉक, नज़दीकी लड़ाई, सहायता और टीमवर्क तेज़ मैच में मिलते हैं और कॉइन व अनुभव देते हैं।",
      faqs: [
        { question: "MicroBattles में कितने खिलाड़ी होते हैं?", answer: "पूरे मैच में 12 खिलाड़ी तक, चार टीमों में तीन-तीन।" },
        { question: "MicroBattles कैसे जीतें?", answer: "दूसरी टीमों को हराएँ। जीवित खिलाड़ी वाली आखिरी टीम जीतती है।" },
        { question: "क्या किट चुन सकते हैं?", answer: "हाँ। दीवारें गिरने से पहले किट चुनें; नाम और स्थिति Bedrock में भी अनुवादित हैं।" },
      ],
    },
    pitchout: {
      cardDescription: "तेज़ नॉकबैक हथियारों से विरोधियों को नीचे गिराएँ और अपनी पाँच जान बचाएँ।",
      heroIntro: "Pitchout, Cookie Build का खास नॉकबैक मिनी-गेम है। फावड़े और धनुष से विरोधियों को एरीना से बाहर करें, पाँच जान बचाएँ और आखिरी खिलाड़ी बनें।",
      joinIntro: "Bedrock और Java एक ही एरीना, मैप वोट, स्कोरबोर्ड, इनाम और प्रगति साझा करते हैं।",
      gameplayEyebrow: "पाँच जान, एक विजेता",
      gameplayHeading: "Pitchout कैसे चलता है",
      steps: [
        { title: "एरीना चुनें", description: "मैच भरते समय उपलब्ध Pitchout मैप के लिए वोट करें।" },
        { title: "नॉकबैक सीखें", description: "पास में फावड़ा या दूर से धनुष इस्तेमाल करें।" },
        { title: "पाँच जान बचाएँ", description: "हर गिरावट पर एक जान जाती है। सिर्फ़ एक खिलाड़ी बचने तक लड़ें।" },
      ],
      highlightHeading: "Cookie Build का क्लासिक खास गेम",
      highlightBody: "तीन अलग एरीना में अलग नॉकबैक और स्पॉन हैं। मैच एलिमिनेशन, नॉकबैक और कॉम्बो गिनता है और कॉइन व अनुभव देता है।",
      faqs: [
        { question: "Pitchout में कौन सा सामान मिलता है?", answer: "तेज़ नॉकबैक वाला लकड़ी का फावड़ा, Punch धनुष और अनंत तीर।" },
        { question: "Pitchout कैसे जीतें?", answer: "हर खिलाड़ी पाँच जान से शुरू करता है। विरोधियों को बाहर करते रहें और आखिरी खिलाड़ी बनें।" },
        { question: "क्या मैप के नाम अनुवादित हैं?", answer: "हाँ। Java और Bedrock स्थानीय नाम दिखाते हैं और अंदरूनी मैप ID स्थिर रहती है।" },
      ],
    },
    skywars: {
      cardDescription: "अपने द्वीप से सामान लें, बीच के बेहतर चेस्ट तक पुल बनाएँ और सबसे आखिर तक बचें।",
      heroIntro: "Bedrock या Java से क्लासिक एकल SkyWars खेलें। अपने तैरते द्वीप पर चेस्ट खोलें, बीच तक पुल बनाएँ, विरोधियों से लड़ें और शून्य में गिरने से बचें।",
      joinIntro: "Bedrock और Java एक ही कतार, किट, चेस्ट सामान, मैप और स्थायी प्रगति साझा करते हैं।",
      gameplayEyebrow: "सामान, पुल, जीत",
      gameplayHeading: "Cookie Build SkyWars कैसे चलता है",
      steps: [
        { title: "अपनी किट चुनें", description: "मैच से पहले खेलने का तरीका चुनें और अलग तैरते द्वीप पर शुरू करें।" },
        { title: "सामान लें और पुल बनाएँ", description: "चेस्ट खोलें, ब्लॉक जुटाएँ और बेहतर सामान के लिए बीच में जाएँ।" },
        { title: "आखिरी खिलाड़ी बनें", description: "विरोधियों से लड़ें, शून्य से बचें और सबसे आखिर तक जीवित रहें।" },
      ],
      highlightHeading: "चार बहाल किए गए SkyWars एरीना",
      highlightBody: "चार क्लासिक द्वीप मैप में जाँचे हुए स्पॉन और बेहतर बीच के चेस्ट हैं। खेलना, एलिमिनेशन और जीत प्रगति देते हैं।",
      faqs: [
        { question: "क्या SkyWars में किट हैं?", answer: "हाँ। मैच से पहले किट चुनें; नाम और संदेश Bedrock व Java दोनों में अनुवादित हैं।" },
        { question: "कितनी मैप उपलब्ध हैं?", answer: "Cookie Build में चार बहाल की गई क्लासिक SkyWars एरीना घूमती हैं।" },
        { question: "यह एकल है या टीम?", answer: "यह हर खिलाड़ी की अलग लड़ाई है। हर खिलाड़ी अलग द्वीप पर शुरू करता है और आखिरी जीवित खिलाड़ी जीतता है।" },
      ],
    },
    turfwars: {
      cardDescription: "सुरक्षा बनाएँ, धनुष से निशाना लगाएँ और अपनी टीम की ज़मीन आगे बढ़ाएँ।",
      heroIntro: "Turf Wars में नीली या लाल टीम से जुड़ें। छोटी निर्माण और लड़ाई की बारी-बारी वाली अवधि में अपनी ओर बचाएँ और हर सही तीर से ज़मीन जीतें।",
      joinIntro: "Turf Wars में 2 से 10 Bedrock और Java खिलाड़ी संतुलित नीली और लाल टीमों में खेलते हैं।",
      gameplayEyebrow: "बनाएँ, लड़ें, ज़मीन जीतें",
      gameplayHeading: "Turf Wars कैसे चलता है",
      steps: [
        { title: "25 सेकंड बनाएँ", description: "अपनी ज़मीन पर टीम की ऊन से सुरक्षा और निशाना लगाने की जगह बनाएँ।" },
        { title: "90 सेकंड लड़ें", description: "न टूटने वाले धनुष और वापस मिलने वाले तीर से विरोधियों को लगाएँ।" },
        { title: "72 अंक तक पहुँचें", description: "हर निशाना सीमा को दो कॉलम बढ़ाता है। 72 अंक पाने वाली पहली टीम जीतती है।" },
      ],
      highlightHeading: "संतुलित क्रॉस-प्लेटफ़ॉर्म टीम लड़ाई",
      highlightBody: "मैच अधिकतम 12 मिनट तक निर्माण और लड़ाई के बीच बदलता है। निशाने, भागीदारी और जीत प्रगति देते हैं; दोबारा जुड़ने के लिए 60 सेकंड मिलते हैं।",
      faqs: [
        { question: "Turf Wars में कितने खिलाड़ी हो सकते हैं?", answer: "2 से 10 खिलाड़ी संतुलित नीली और लाल टीमों में बँटते हैं।" },
        { question: "Turf Wars कैसे जीतें?", answer: "हर निशाना सीमा दो कॉलम बढ़ाता है। 72 अंक तक पहुँचने वाली पहली टीम जीतती है।" },
        { question: "क्या Java और Bedrock साथ खेलते हैं?", answer: "हाँ। दोनों संस्करण मैच, चरण, टीम और प्रगति साझा करते हैं।" },
      ],
    },
  },
  "pt-BR": {
    bedwars: {
      cardDescription: "Proteja sua cama, colete cookies, melhore a equipe e elimine todos os rivais.",
      heroIntro: "Jogue BedWars no Cookie Colosseum, uma arena flutuante com tema de confeitaria para Java e Bedrock. Proteja a cama, colete recursos, melhore a equipe e quebre as camas adversárias.",
      joinIntro: "BedWars está em beta. Jogadores Java e Bedrock compartilham partidas de quatro equipes com menus adaptados para cada edição.",
      gameplayEyebrow: "Camas, pontes e cookies",
      gameplayHeading: "Como funciona o BedWars do Cookie Build",
      steps: [
        { title: "Proteja sua cama", description: "Entre em uma equipe e defenda sua ilha para que os aliados possam renascer." },
        { title: "Colete e melhore", description: "Use cookies, ouro, diamantes e esmeraldas para comprar equipamentos, blocos e melhorias." },
        { title: "Elimine os rivais", description: "Construa pontes, quebre as camas adversárias e elimine quem não pode mais renascer." },
      ],
      highlightHeading: "Uma loja BedWars para Java e Bedrock",
      highlightBody: "Java usa loja de inventário e Bedrock formulários nativos, sempre com os mesmos itens, preços e regras. O Cookie Colosseum tem quatro bases, ilhas de diamante e esmeraldas no centro.",
      faqs: [
        { question: "Java e Bedrock podem jogar juntos?", answer: "Sim. As duas edições compartilham a partida, o catálogo, os preços e as regras." },
        { question: "Para que servem os cookies?", answer: "São o recurso principal da base para blocos e equipamentos iniciais. Compras fortes usam ouro, diamantes e esmeraldas." },
        { question: "Como vencer BedWars?", answer: "Proteja sua cama, destrua as camas rivais e elimine todos os jogadores que não podem mais renascer." },
      ],
    },
    skyblock: {
      cardDescription: "Desenvolva uma ilha persistente, melhore o gerador, conclua missões, negocie e construa com amigos.",
      heroIntro: "Comece uma ilha persistente Cookie Orchard. Expanda sobre o vazio, melhore o gerador, conclua missões, recolha a produção, negocie no mercado e convide pessoas de confiança do Java ou Bedrock.",
      joinIntro: "Skyblock é um modo beta persistente para Bedrock e Java. Menus guiados permitem administrar ilha, melhorias, armazenamento, missões, cooperativa e mercado nas duas edições.",
      gameplayEyebrow: "Uma ilha, progresso duradouro",
      gameplayHeading: "Como funciona o Skyblock do Cookie Build",
      steps: [
        { title: "Desenvolva sua ilha", description: "Comece em uma Cookie Orchard protegida, colete recursos e construa com segurança sobre o vazio." },
        { title: "Melhore e automatize", description: "Melhore o gerador, conclua missões e recolha a produção dos trabalhadores." },
        { title: "Negocie e coopere", description: "Venda itens aceitos, compre recursos e administre membros confiáveis da cooperativa." },
      ],
      highlightHeading: "Gerencie o Skyblock no jogo e pelo aplicativo",
      highlightBody: "O aplicativo mostra sua ilha e armazenamento e permite ações seguras: melhorar o gerador, recolher produção, resgatar missões, vender, comprar e aceitar convites. O servidor valida cada ação.",
      faqs: [
        { question: "A ilha continua entre as sessões?", answer: "Sim. Ilha, armazenamento, melhorias, missões, trabalhadores, anúncios e membros são salvos de forma persistente." },
        { question: "O que posso gerenciar pelo aplicativo?", answer: "Depois de vincular seu jogador, consulte a ilha e faça melhorias autorizadas, coletas, missões, ações de mercado e aceite convites." },
        { question: "Java e Bedrock podem compartilhar uma ilha?", answer: "Sim. As duas edições usam o mesmo mundo persistente e o sistema cooperativo protegido." },
      ],
    },
    "build-battle": {
      cardDescription: "Vote em um tema, construa por cinco minutos no seu terreno e avalie cada criação.",
      heroIntro: "Entre no Build Battle pelo Bedrock ou Java, vote em um tema, crie uma construção em cinco minutos e avalie todos os terrenos. É um servidor multiplayer real, não um mapa para download.",
      joinIntro: "Windows, Android, iOS e Java compartilham as mesmas partidas de Build Battle.",
      gameplayEyebrow: "Um tema, infinitas ideias",
      gameplayHeading: "Como funciona o Build Battle",
      steps: [
        { title: "Vote em um tema", description: "Escolha entre três temas enquanto a partida recebe jogadores." },
        { title: "Construa por cinco minutos", description: "Crie algo memorável no seu terreno com a paleta para Java e Bedrock." },
        { title: "Avalie os terrenos", description: "Visite as criações, dê notas de 1 a 5 e confira a classificação final." },
      ],
      highlightHeading: "Build Battle multiplataforma",
      highlightBody: "Votação, oito terrenos privados, paleta de blocos, personalização do piso e notas funcionam da mesma forma no Bedrock e Java.",
      faqs: [
        { question: "É um servidor Build Battle para Bedrock?", answer: "Sim. Entre com o endereço e a porta informados e jogue com pessoas no Java." },
        { question: "Quanto dura a construção?", answer: "Cada jogador tem cinco minutos antes de começar a avaliação." },
        { question: "Como o vencedor é escolhido?", answer: "Todos avaliam cada terreno de 1 a 5 e a maior pontuação total vence." },
      ],
    },
    microbattles: {
      cardDescription: "Lute em quatro equipes compactas, use bem seu kit e blocos e seja a última equipe viva.",
      heroIntro: "Jogue batalhas rápidas entre quatro equipes. Escolha um kit, prepare-se atrás das paredes e faça Azul, Vermelho, Amarelo ou Verde ser a última equipe viva.",
      joinIntro: "Bedrock e Java compartilham a fila. As arenas recebem quatro equipes de até três jogadores.",
      gameplayEyebrow: "Mapas compactos, decisões rápidas",
      gameplayHeading: "Como funciona o MicroBattles",
      steps: [
        { title: "Escolha uma equipe", description: "Azul, Vermelho, Amarelo e Verde recebem até três jogadores cada." },
        { title: "Prepare seu kit", description: "Comece com seu kit e lã da equipe enquanto as paredes dividem a arena." },
        { title: "Sobreviva à batalha", description: "As paredes caem após 15 segundos. Elimine as outras equipes e mantenha um aliado vivo." },
      ],
      highlightHeading: "Quatro equipes e oito arenas clássicas",
      highlightBody: "Kits, blocos limitados, combate próximo, assistências e trabalho em equipe se unem em partidas rápidas com moedas e experiência.",
      faqs: [
        { question: "Quantos jogadores há em uma partida?", answer: "Até 12 jogadores em quatro equipes de três." },
        { question: "Como vencer MicroBattles?", answer: "Elimine as outras equipes. A última equipe com alguém vivo vence." },
        { question: "Posso escolher um kit?", answer: "Sim. Escolha antes das paredes caírem; nome e estado estão traduzidos também no Bedrock." },
      ],
    },
    pitchout: {
      cardDescription: "Use armas de forte repulsão para jogar rivais no vazio e proteja suas cinco vidas.",
      heroIntro: "Pitchout é um minijogo original do Cookie Build. Jogue rivais para fora da arena com uma pá e um arco, proteja suas cinco vidas e seja a última pessoa viva.",
      joinIntro: "Bedrock e Java compartilham arenas, votação de mapas, placar, recompensas e progresso.",
      gameplayEyebrow: "Cinco vidas, um vencedor",
      gameplayHeading: "Como funciona o Pitchout",
      steps: [
        { title: "Vote em uma arena", description: "Escolha entre os mapas disponíveis enquanto a partida enche." },
        { title: "Domine a repulsão", description: "Use a pá de perto ou o arco para atingir de longe." },
        { title: "Proteja cinco vidas", description: "Cada queda custa uma vida. Continue lutando até sobrar uma pessoa." },
      ],
      highlightHeading: "Um clássico original do Cookie Build",
      highlightBody: "Três arenas têm forças de repulsão e pontos de início diferentes. A partida registra eliminações, golpes e combos e entrega moedas e experiência.",
      faqs: [
        { question: "Quais itens recebo no Pitchout?", answer: "Uma pá de madeira com forte repulsão, arco com Punch e uma flecha infinita." },
        { question: "Como vencer Pitchout?", answer: "Cada jogador começa com cinco vidas. Derrube os rivais até ser o último." },
        { question: "Os mapas estão traduzidos?", answer: "Sim. Java e Bedrock mostram nomes localizados e mantêm os identificadores internos estáveis." },
      ],
    },
    skywars: {
      cardDescription: "Saqueie sua ilha, construa até os baús centrais e sobreviva a todos os rivais.",
      heroIntro: "Jogue SkyWars solo pelo Bedrock ou Java. Comece em uma ilha flutuante, saqueie baús, construa até o centro, enfrente rivais e evite o vazio para vencer.",
      joinIntro: "Bedrock e Java compartilham filas, kits, saque, mapas e progresso permanente.",
      gameplayEyebrow: "Saqueie, construa, sobreviva",
      gameplayHeading: "Como funciona o SkyWars do Cookie Build",
      steps: [
        { title: "Escolha seu kit", description: "Prepare seu estilo antes de aparecer em uma ilha flutuante." },
        { title: "Saqueie e construa", description: "Abra baús, colete blocos e chegue ao centro para encontrar itens melhores." },
        { title: "Seja o último", description: "Lute, evite o vazio e sobreviva a todos os outros jogadores." },
      ],
      highlightHeading: "Quatro arenas SkyWars restauradas",
      highlightBody: "Quatro mapas clássicos têm pontos iniciais validados e baús centrais melhores. Participação, eliminações e vitórias geram progresso.",
      faqs: [
        { question: "SkyWars tem kits?", answer: "Sim. Escolha um kit antes da partida; nomes e mensagens estão traduzidos no Bedrock e Java." },
        { question: "Quantos mapas existem?", answer: "O Cookie Build alterna quatro arenas clássicas de SkyWars restauradas." },
        { question: "É solo ou em equipe?", answer: "É solo. Cada pessoa começa em uma ilha e a última sobrevivente vence." },
      ],
    },
    turfwars: {
      cardDescription: "Construa defesas, acerte flechas e empurre o território da sua equipe pela arena.",
      heroIntro: "Entre na equipe Azul ou Vermelha em Turf Wars. Alterne fases curtas de construção e combate, defenda seu lado e conquiste território a cada flecha certeira.",
      joinIntro: "Turf Wars recebe de 2 a 10 jogadores Bedrock e Java em equipes Azul e Vermelha equilibradas.",
      gameplayEyebrow: "Construa, lute, conquiste",
      gameplayHeading: "Como funciona o Turf Wars",
      steps: [
        { title: "Construa por 25 segundos", description: "Use a lã da equipe dentro do território para criar cobertura e posições de tiro." },
        { title: "Lute por 90 segundos", description: "Acerte rivais com um arco indestrutível e uma flecha que reaparece." },
        { title: "Chegue a 72 pontos", description: "Cada acerto move duas colunas. A primeira equipe com 72 vence." },
      ],
      highlightHeading: "Combate equilibrado e multiplataforma",
      highlightBody: "As partidas alternam construção e combate por até 12 minutos. Acertos, participação e vitória geram progresso, e há 60 segundos para reconectar.",
      faqs: [
        { question: "Quantos jogadores Turf Wars aceita?", answer: "De 2 a 10, divididos em equipes Azul e Vermelha equilibradas." },
        { question: "Como vencer Turf Wars?", answer: "Cada acerto move o limite duas colunas. A primeira equipe a chegar a 72 pontos vence." },
        { question: "Java e Bedrock jogam juntos?", answer: "Sim. Compartilham partida, fases, equipes e progresso." },
      ],
    },
  },
};

const localeTemplates = {
  bg: {
    seoTitle: (name: string) => `${name} Minecraft Bedrock сървър | Cookie Build`,
    meta: (name: string) => `Играй ${name} безплатно на Minecraft Bedrock и Java в ${COOKIE_BUILD_SERVER_IP}, Bedrock порт ${COOKIE_BUILD_BEDROCK_PORT}.`,
    h1: (name: string) => `${name} Minecraft сървър за Bedrock и Java`,
    joinHeading: (name: string) => `Играй ${name} с Minecraft Bedrock`,
    joinQuestion: (name: string) => `Как да вляза в ${name} от Minecraft Bedrock?`,
    joinAnswer: (name: string) => `Добави ${COOKIE_BUILD_SERVER_IP} с порт ${COOKIE_BUILD_BEDROCK_PORT}, влез в Cookie Build и избери ${name} в лобито.`,
    badge: "Достъпно · Безплатно",
    imageAlt: (name: string) => `${name} Minecraft карта в Cookie Build`,
  },
  es: {
    seoTitle: (name: string) => `Servidor ${name} Minecraft Bedrock | Cookie Build`,
    meta: (name: string) => `Juega gratis a ${name} en Minecraft Bedrock y Java. Entra en ${COOKIE_BUILD_SERVER_IP}, puerto Bedrock ${COOKIE_BUILD_BEDROCK_PORT}.`,
    h1: (name: string) => `Servidor ${name} de Minecraft para Bedrock y Java`,
    joinHeading: (name: string) => `Juega a ${name} en Minecraft Bedrock`,
    joinQuestion: (name: string) => `¿Cómo entro a ${name} desde Minecraft Bedrock?`,
    joinAnswer: (name: string) => `Añade ${COOKIE_BUILD_SERVER_IP} con el puerto ${COOKIE_BUILD_BEDROCK_PORT}, entra en Cookie Build y elige ${name} en el lobby.`,
    badge: "Disponible · Gratis",
    imageAlt: (name: string) => `Mapa de Minecraft ${name} en Cookie Build`,
  },
  hi: {
    seoTitle: (name: string) => `${name} Minecraft Bedrock सर्वर | Cookie Build`,
    meta: (name: string) => `${name} को Minecraft Bedrock और Java पर मुफ्त खेलें। ${COOKIE_BUILD_SERVER_IP}, Bedrock पोर्ट ${COOKIE_BUILD_BEDROCK_PORT} से जुड़ें।`,
    h1: (name: string) => `Bedrock और Java के लिए ${name} Minecraft सर्वर`,
    joinHeading: (name: string) => `Minecraft Bedrock पर ${name} खेलें`,
    joinQuestion: (name: string) => `Minecraft Bedrock से ${name} कैसे खेलें?`,
    joinAnswer: (name: string) => `${COOKIE_BUILD_SERVER_IP} को पोर्ट ${COOKIE_BUILD_BEDROCK_PORT} के साथ जोड़ें, Cookie Build से जुड़ें और लॉबी में ${name} चुनें।`,
    badge: "अभी उपलब्ध · मुफ्त",
    imageAlt: (name: string) => `Cookie Build में ${name} Minecraft मैप`,
  },
  "pt-BR": {
    seoTitle: (name: string) => `Servidor ${name} Minecraft Bedrock | Cookie Build`,
    meta: (name: string) => `Jogue ${name} grátis no Minecraft Bedrock e Java. Entre em ${COOKIE_BUILD_SERVER_IP}, porta Bedrock ${COOKIE_BUILD_BEDROCK_PORT}.`,
    h1: (name: string) => `Servidor ${name} de Minecraft para Bedrock e Java`,
    joinHeading: (name: string) => `Jogue ${name} no Minecraft Bedrock`,
    joinQuestion: (name: string) => `Como entrar em ${name} pelo Minecraft Bedrock?`,
    joinAnswer: (name: string) => `Adicione ${COOKIE_BUILD_SERVER_IP} com a porta ${COOKIE_BUILD_BEDROCK_PORT}, entre no Cookie Build e escolha ${name} no lobby.`,
    badge: "Disponível · Grátis",
    imageAlt: (name: string) => `Mapa Minecraft de ${name} no Cookie Build`,
  },
} as const;

export function localizedGameLandings(locale: SiteLocaleCode): GameLanding[] {
  if (locale === "en") return gameLandings.map((game) => ({ ...game }));
  const template = localeTemplates[locale];
  return gameLandings.map((game) => {
    const seed = LOCALIZED_SEEDS[locale][game.slug];
    if (!seed) throw new Error(`Missing ${locale} game landing translation for ${game.slug}`);
    return {
      ...game,
      path: localizedSitePath(game.path, locale),
      badgeLabel: template.badge,
      heroImageAlt: template.imageAlt(game.name),
      heroImageCaption: game.heroImage ? template.imageAlt(game.name) : undefined,
      cardDescription: seed.cardDescription,
      seoTitle: template.seoTitle(game.name),
      metaDescription: template.meta(game.name),
      h1: template.h1(game.name),
      heroIntro: seed.heroIntro,
      joinHeading: template.joinHeading(game.name),
      joinIntro: seed.joinIntro,
      gameplayEyebrow: seed.gameplayEyebrow,
      gameplayHeading: seed.gameplayHeading,
      steps: seed.steps,
      highlightHeading: seed.highlightHeading,
      highlightBody: seed.highlightBody,
      socialDescription: seed.cardDescription,
      faqs: [
        { question: template.joinQuestion(game.name), answer: template.joinAnswer(game.name) },
        ...seed.faqs,
      ],
    };
  });
}

export function localizedGameLandingBySlug(locale: SiteLocaleCode, slug: string): GameLanding {
  const landing = localizedGameLandings(locale).find((game) => game.slug === slug);
  if (!landing) throw new Error(`Unknown game landing: ${slug}`);
  return landing;
}
