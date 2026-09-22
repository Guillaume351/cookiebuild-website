import type { SiteLocaleCode } from "./site-locales";
import de from "./locales/minigames-de.json";
import it from "./locales/minigames-it.json";
import bg from "./locales/minigames-bg.json";
import es from "./locales/minigames-es.json";
import hi from "./locales/minigames-hi.json";
import ptBR from "./locales/minigames-pt-BR.json";
const existingCopy = {
  en: {
    badge: "Public beta · Play now", headline: "Keep moving. Choose your moment.",
    intro: "A moving safe zone, four districts to explore and one final showdown. Nomad Wars is a survival mini-game now playable in beta on Cookie Build.",
    status: "Public beta for 2–8 players. Join deliberately through the game menu or /nomadwars play; automatic Quick Play does not include this beta. Matches award no server currency. Rules, timings and balance may change.",
    rulesTitle: "One match. Two passes. One survivor.",
    steps: [
      {"title": "Prepare, then follow a refuge", "text": "You have 30 seconds to prepare at your starting camp before four safe circles begin moving. Each has a 50-block radius and protects every player. Follow the compass and on-screen direction; a particle trail helps you return if you leave."},
      {"title": "Gather and craft over two passes", "text": "Each pass lasts 240 seconds. The first is peaceful; player combat begins on the second. Starting camps provide wood, food, stone, coal and iron resources. Use normal Minecraft recipes to craft equipment up to iron. Common supplies refill once when the second pass starts."},
      {"title": "Meet in the middle", "text": "After two passes, refuges converge toward the centre. Change routes where they cross. The last survivor wins; after the 90-second final, remaining survivors draw."}
    ],
    workshopTitle: "Public forge, shared rewards", workshop: "At a public forge, 4 raw iron and 1 coal become 4 iron ingots after 20 seconds. The result belongs to whoever collects it first. Craft your equipment from the ingots using normal recipes. Barrels are shared caches: everyone can deposit or take items, and their contents remain until someone takes them.",
    fairnessTitle: "A stocked camp, protected scenery", fairness: "Every starting camp has the basic gathering resources you need. Mine the marked resources; decorative blocks remain protected. Shared caches and forges are not private storage. The one common-supply refill does not refill caches.",
    editionTitle: "Guidance for Java and Bedrock", edition: "Vertical particle markers and ground outlines show nearby refuge edges. The compass, direction and distance help you find safety, with a return trail when outside. Map previews show terrain only; particle visibility varies with device and settings.",
    mapsTitle: "Three worlds to discover", mapsIntro: "Explore the actual builds in 3D or as a tiny map. These are world renders, not concept art.",
    feedbackTitle: "Help improve the beta", feedback: "Which map would you choose? Are the moving zones easy to understand? Would you risk leaving an upgrade behind? Play with a friend and compare your experiences.",
    share: "Copy game link", copied: "Game link copied.", article: "Read the game guide", atlas: "Open the map catalogue", discord: "Discuss on Discord",
  },
  fr: {
    badge: "Bêta publique · Jouable maintenant", headline: "Reste en mouvement. Choisis ton moment.",
    intro: "Une zone sûre en mouvement, quatre quartiers à explorer et un affrontement final. Nomad Wars est un mini-jeu de survie maintenant jouable en bêta sur Cookie Build.",
    status: "Bêta publique pour 2 à 8 joueurs. Rejoins le mode dans le menu des jeux ou avec /nomadwars play ; le Quick Play automatique ne propose pas cette bêta. Les parties ne donnent pas de monnaie du serveur. Les règles, les durées et l’équilibrage peuvent évoluer.",
    rulesTitle: "Une manche. Deux passages. Un survivant.",
    steps: [
      {"title": "Prépare-toi, puis suis un refuge", "text": "Tu disposes de 30 secondes au camp de départ avant le déplacement des quatre cercles sûrs. Chacun a un rayon de 50 blocs et protège tous les joueurs. Suis la boussole et la direction à l’écran ; une piste de particules t’aide à revenir si tu sors."},
      {"title": "Récolte et fabrique en deux passages", "text": "Chaque passage dure 240 secondes. Le premier est paisible ; les combats entre joueurs commencent au second. Les camps de départ fournissent bois, nourriture, pierre, charbon et ressources en fer. Fabrique ton équipement avec les recettes Minecraft habituelles, jusqu’au fer. Les stocks courants reviennent une fois au début du second passage."},
      {"title": "Rendez-vous au centre", "text": "Après deux passages, les refuges convergent vers le centre. Change de trajet à leurs croisements. Le dernier survivant gagne ; après les 90 secondes de finale, les survivants restants sont à égalité."}
    ],
    workshopTitle: "Forge publique, récompenses partagées", workshop: "Dans une forge publique, 4 fers bruts et 1 charbon donnent 4 lingots de fer après 20 secondes. Le premier joueur qui revient peut les récupérer. Fabrique ensuite ton équipement avec les recettes habituelles. Les tonneaux sont des caches partagées : chacun peut y déposer ou prendre des objets, qui restent jusqu’à leur récupération.",
    fairnessTitle: "Un camp approvisionné, un décor protégé", fairness: "Chaque camp de départ contient les ressources essentielles à récolter. Mine les ressources indiquées ; les blocs du décor restent protégés. Les caches et les forges sont publiques. Le réapprovisionnement unique des stocks courants ne remplit pas les caches.",
    editionTitle: "Des repères sur Java et Bedrock", edition: "Des marqueurs verticaux et des contours au sol matérialisent les limites proches des refuges. Boussole, direction et distance aident à retrouver la sécurité, avec une piste de retour hors zone. Les aperçus des maps montrent seulement le terrain ; la visibilité des particules varie selon l’appareil et les réglages.",
    mapsTitle: "Trois mondes à découvrir", mapsIntro: "Explore les vraies constructions en 3D ou en tiny map. Ce sont des rendus des mondes, pas des illustrations de concept.",
    feedbackTitle: "Améliore la bêta avec nous", feedback: "Quelle map choisirais-tu ? Les zones mouvantes sont-elles faciles à comprendre ? Prendrais-tu le risque de laisser une amélioration derrière toi ? Joue avec un ami pour comparer vos expériences.",
    share: "Copier le lien du jeu", copied: "Lien du jeu copié.", article: "Lire les règles du jeu", atlas: "Ouvrir le catalogue de maps", discord: "En discuter sur Discord",
  },
};

export const nomadPreviewCopy = {
  ...existingCopy,
  "de": de.nomad,
  "it": it.nomad,
  "bg": bg.nomad,
  "es": es.nomad,
  "hi": hi.nomad,
  "pt-BR": ptBR.nomad,
} satisfies Record<SiteLocaleCode, typeof existingCopy.en>;
