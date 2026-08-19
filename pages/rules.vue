<template>
  <main class="mx-auto max-w-4xl space-y-10 py-12 text-zinc-300">
    <header class="space-y-4">
      <Badge class="bg-orange-600 hover:bg-orange-600">{{ selectedCopy.badge }}</Badge>
      <h1 class="text-4xl font-black tracking-tight text-white md:text-5xl">{{ selectedCopy.title }}</h1>
      <p class="max-w-3xl text-lg text-zinc-400">
        {{ selectedCopy.intro }}
      </p>
    </header>

    <nav class="flex flex-wrap gap-3" :aria-label="selectedCopy.languageLabel">
      <button
        v-for="language in languages"
        :key="language.id"
        type="button"
        class="min-h-11 rounded-lg border px-4 py-2 font-bold transition-colors"
        :class="selectedLanguage === language.id ? 'border-orange-400 bg-orange-600 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'"
        :aria-pressed="selectedLanguage === language.id"
        @click="selectedLanguage = language.id"
      >
        {{ language.label }}
      </button>
    </nav>

    <article :lang="selectedCopy.lang" class="space-y-8">
      <div class="rounded-2xl border border-orange-500/25 bg-orange-500/10 p-6">
        <p class="text-lg font-bold text-orange-100">{{ selectedCopy.summary }}</p>
      </div>

      <section v-for="(rule, index) in selectedCopy.rules" :key="rule.title" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div class="flex gap-4">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600 font-black text-white">{{ index + 1 }}</span>
          <div>
            <h2 class="text-xl font-bold text-white">{{ rule.title }}</h2>
            <p class="mt-2 leading-relaxed text-zinc-400">{{ rule.description }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 class="text-2xl font-black text-white">{{ selectedCopy.safetyTitle }}</h2>
        <p class="mt-3 text-zinc-400">{{ selectedCopy.safetyIntro }}</p>
        <dl class="mt-6 grid gap-4 md:grid-cols-3">
          <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <dt><code class="text-orange-300">/mute &lt;player&gt;</code></dt>
            <dd class="mt-2 text-sm text-zinc-400">{{ selectedCopy.mute }}</dd>
          </div>
          <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <dt><code class="text-orange-300">/block &lt;player&gt;</code></dt>
            <dd class="mt-2 text-sm text-zinc-400">{{ selectedCopy.block }}</dd>
          </div>
          <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <dt><code class="text-orange-300">/report &lt;player&gt; &lt;reason&gt;</code></dt>
            <dd class="mt-2 text-sm text-zinc-400">{{ selectedCopy.report }}</dd>
          </div>
        </dl>
        <p class="mt-5 text-sm text-zinc-400">
          {{ selectedCopy.support }}
          <a class="font-bold text-orange-300 hover:text-orange-200" href="mailto:support@cookie-build.com">support@cookie-build.com</a>.
        </p>
      </section>

      <p class="text-sm text-zinc-500">{{ selectedCopy.moderation }}</p>
    </article>
  </main>
</template>

<script setup lang="ts">
import Badge from "@/components/ui/badge/Badge.vue";

type LanguageId = "en" | "fr" | "es" | "pt-BR";

const languages: Array<{ id: LanguageId; label: string }> = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
  { id: "pt-BR", label: "Português (Brasil)" },
];

const copies = {
  en: {
    lang: "en",
    badge: "Fair play & safety",
    title: "Cookie Build server rules",
    intro: "These rules apply on the Minecraft server and connected Cookie Build services. They keep games fair and the community welcoming on Java and Bedrock.",
    languageLabel: "Rules language",
    summary: "Be fair, be respectful, and help others feel safe. If an action harms the game or another player, do not do it.",
    rules: [
      { title: "Play fairly", description: "Do not cheat, use unauthorized clients or macros, exploit bugs, team across opposing sides, or deliberately manipulate a match." },
      { title: "Respect everyone", description: "No harassment, threats, hate, discrimination, sexual content, impersonation, doxxing, or targeted intimidation." },
      { title: "Keep communication appropriate", description: "Do not spam, advertise, evade filters, pressure players for personal information, or use an inappropriate name or skin." },
      { title: "Protect accounts and services", description: "Never request passwords or link codes. Do not attempt to access another account, evade moderation, or disrupt the server, website, or app." },
      { title: "Use community tools responsibly", description: "Do not submit false reports, abuse invitations or player calls, or repeatedly contact someone who has asked you to stop." },
    ],
    safetyTitle: "Protect yourself and report problems",
    safetyIntro: "You do not need to argue with another player. Use the tool that matches the situation:",
    mute: "Hide or restore that player’s chat messages for your current session.",
    block: "Persistently block or unblock that player across the game and companion app.",
    report: "Send a concise report to the moderation team. Reports are rate-limited to prevent abuse.",
    support: "For an urgent or detailed case, save useful evidence and contact",
    moderation: "Moderation may include a warning, feature restriction, mute, suspension, or ban depending on severity and repetition. Appeals can be sent to support and are reviewed by a person.",
  },
  fr: {
    lang: "fr",
    badge: "Jeu équitable et sécurité",
    title: "Règles du serveur Cookie Build",
    intro: "Ces règles s’appliquent au serveur Minecraft et aux services Cookie Build associés. Elles protègent l’équité des parties et un accueil respectueux sur Java comme sur Bedrock.",
    languageLabel: "Langue des règles",
    summary: "Joue équitablement, respecte les autres et contribue à leur sécurité. Si une action nuit au jeu ou à une personne, ne la fais pas.",
    rules: [
      { title: "Joue équitablement", description: "Pas de triche, de client ou macro non autorisé, d’exploitation de bug, d’alliance entre équipes adverses ni de manipulation volontaire d’une partie." },
      { title: "Respecte tout le monde", description: "Le harcèlement, les menaces, la haine, les discriminations, le contenu sexuel, l’usurpation, la divulgation d’informations personnelles et l’intimidation ciblée sont interdits." },
      { title: "Communique correctement", description: "Pas de spam, de publicité, de contournement des filtres, de pression pour obtenir des données personnelles, ni de pseudo ou skin inapproprié." },
      { title: "Protège les comptes et les services", description: "Ne demande jamais de mot de passe ni de code d’association. N’essaie pas d’accéder au compte d’une autre personne, de contourner la modération ou de perturber le serveur, le site ou l’app." },
      { title: "Utilise les outils communautaires avec sérieux", description: "Pas de faux signalement, d’abus d’invitations ou d’appels de joueurs, ni de contacts répétés envers une personne qui t’a demandé d’arrêter." },
    ],
    safetyTitle: "Protège-toi et signale les problèmes",
    safetyIntro: "Tu n’as pas besoin de répondre ou de te disputer. Utilise l’outil adapté :",
    mute: "Masque ou rétablit les messages de cette personne pour la session en cours.",
    block: "Bloque ou débloque durablement cette personne dans le jeu et l’app compagnon.",
    report: "Envoie un signalement concis à la modération. Les signalements sont limités pour éviter les abus.",
    support: "Pour un cas urgent ou détaillé, conserve les preuves utiles et contacte",
    moderation: "Selon la gravité et la répétition, la modération peut appliquer un avertissement, une restriction, un mute, une suspension ou un bannissement. Les recours envoyés au support sont examinés par une personne.",
  },
  es: {
    lang: "es",
    badge: "Juego limpio y seguridad",
    title: "Reglas del servidor Cookie Build",
    intro: "Estas reglas se aplican al servidor de Minecraft y a los servicios conectados de Cookie Build. Mantienen las partidas justas y una comunidad acogedora en Java y Bedrock.",
    languageLabel: "Idioma de las reglas",
    summary: "Juega de forma justa, respeta a los demás y ayuda a que todos se sientan seguros. Si una acción perjudica al juego o a otra persona, no la hagas.",
    rules: [
      { title: "Juega limpio", description: "No uses trampas, clientes o macros no autorizados, fallos del juego, alianzas entre equipos rivales ni manipules una partida de forma intencionada." },
      { title: "Respeta a todas las personas", description: "No se permiten el acoso, las amenazas, el odio, la discriminación, el contenido sexual, la suplantación, la divulgación de datos personales ni la intimidación dirigida." },
      { title: "Mantén una comunicación apropiada", description: "No envíes spam o publicidad, no eludas los filtros, no presiones a nadie para obtener datos personales y no uses un nombre o una skin inapropiados." },
      { title: "Protege las cuentas y los servicios", description: "Nunca pidas contraseñas ni códigos de vinculación. No intentes acceder a otra cuenta, eludir la moderación ni interrumpir el servidor, el sitio web o la aplicación." },
      { title: "Usa las herramientas de la comunidad con responsabilidad", description: "No envíes denuncias falsas, no abuses de las invitaciones o llamadas de jugadores y no insistas en contactar con alguien que te haya pedido que pares." },
    ],
    safetyTitle: "Protégete y denuncia los problemas",
    safetyIntro: "No necesitas discutir con otra persona. Usa la herramienta adecuada:",
    mute: "Oculta o restaura los mensajes de esa persona durante la sesión actual.",
    block: "Bloquea o desbloquea a esa persona de forma persistente en el juego y en la aplicación.",
    report: "Envía una denuncia breve al equipo de moderación. Las denuncias están limitadas para evitar abusos.",
    support: "Para un caso urgente o detallado, guarda las pruebas útiles y contacta con",
    moderation: "Según la gravedad y la repetición, la moderación puede aplicar una advertencia, una restricción, un silencio, una suspensión o un bloqueo. Los recursos enviados a soporte son revisados por una persona.",
  },
  "pt-BR": {
    lang: "pt-BR",
    badge: "Jogo justo e segurança",
    title: "Regras do servidor Cookie Build",
    intro: "Estas regras valem no servidor de Minecraft e nos serviços conectados do Cookie Build. Elas mantêm as partidas justas e a comunidade acolhedora no Java e no Bedrock.",
    languageLabel: "Idioma das regras",
    summary: "Jogue de forma justa, respeite as pessoas e ajude todos a se sentirem seguros. Se uma ação prejudica o jogo ou alguém, não faça isso.",
    rules: [
      { title: "Jogue limpo", description: "Não use trapaças, clientes ou macros não autorizados, falhas do jogo, alianças entre equipes adversárias ou manipulação intencional de partidas." },
      { title: "Respeite todas as pessoas", description: "Não são permitidos assédio, ameaças, ódio, discriminação, conteúdo sexual, falsidade de identidade, divulgação de dados pessoais ou intimidação direcionada." },
      { title: "Mantenha uma comunicação apropriada", description: "Não envie spam ou publicidade, não contorne filtros, não pressione ninguém por dados pessoais e não use nome ou skin inadequados." },
      { title: "Proteja contas e serviços", description: "Nunca peça senhas ou códigos de vinculação. Não tente acessar outra conta, evitar a moderação ou interromper o servidor, o site ou o aplicativo." },
      { title: "Use as ferramentas da comunidade com responsabilidade", description: "Não envie denúncias falsas, não abuse de convites ou chamadas de jogadores e não insista em contato com alguém que pediu para você parar." },
    ],
    safetyTitle: "Proteja-se e denuncie problemas",
    safetyIntro: "Você não precisa discutir com outra pessoa. Use a ferramenta adequada:",
    mute: "Oculta ou restaura as mensagens dessa pessoa durante a sessão atual.",
    block: "Bloqueia ou desbloqueia essa pessoa de forma persistente no jogo e no aplicativo.",
    report: "Envia uma denúncia objetiva à equipe de moderação. Há limites para evitar abuso de denúncias.",
    support: "Para um caso urgente ou detalhado, guarde as evidências úteis e entre em contato com",
    moderation: "Dependendo da gravidade e da repetição, a moderação pode aplicar aviso, restrição, silenciamento, suspensão ou banimento. Recursos enviados ao suporte são analisados por uma pessoa.",
  },
} as const;

const selectedLanguage = ref<LanguageId>("en");
const selectedCopy = computed(() => copies[selectedLanguage.value]);

useSeoMeta({
  title: "Server Rules | Cookie Build",
  description: "Cookie Build fair-play and player-safety rules in English, French, Spanish, and Brazilian Portuguese.",
});

useHead({ link: [{ rel: "canonical", href: "https://www.cookie-build.com/rules" }] });
</script>
