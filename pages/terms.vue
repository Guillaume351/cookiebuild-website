<template>
  <article class="mx-auto max-w-3xl space-y-10 py-12 text-gray-300">
    <LanguageFallbackNotice :available-locales="['en', 'fr']" />
    <nav class="flex gap-3 text-sm" aria-label="Language">
      <a class="rounded-md bg-orange-600 px-3 py-2 font-semibold text-white" href="#english">English</a>
      <a class="rounded-md border border-gray-700 px-3 py-2 font-semibold text-white" href="#francais">Français</a>
    </nav>

    <section id="english" lang="en" class="space-y-8 scroll-mt-8">
      <header>
        <h1 class="mb-3 text-4xl font-bold text-white">Terms of Service</h1>
        <p>Effective and last updated: September 5, 2026</p>
      </header>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Operator and acceptance</h2>
        <p>
          Cookie Build is an independently operated Minecraft server, website, and companion app
          provided by {{ seller?.legalName || "Cookie Build; purchases are currently unavailable" }}<template v-if="seller?.legalAddress">, {{ seller?.legalAddress }}</template>. By using the service, you agree to these terms and the
          published server rules. Contact
          <a class="text-orange-400" href="mailto:support@cookie-build.com">support@cookie-build.com</a>
          with questions. Cookie Build is not affiliated with or endorsed by Mojang, Microsoft,
          Apple, or Google.
        </p>
        <p v-if="seller?.businessId || seller?.vatId" class="mt-3"><template v-if="seller?.businessId">Business ID: {{ seller?.businessId }}</template><template v-if="seller?.vatId"> · VAT: {{ seller?.vatId }}</template></p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Eligibility and accounts</h2>
        <p>
          The companion app is intended for people aged 13 or older. If local law requires parental
          consent for an online service, a parent or guardian must approve use. The app creates a
          pseudonymous device account and can be linked to a Minecraft player with a short-lived
          in-game code. Keep access to your device and Minecraft account secure. Never share a link code.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Acceptable use</h2>
        <p>You must not:</p>
        <ul class="mt-3 list-disc space-y-2 pl-6">
          <li>cheat, exploit bugs, automate abuse, evade moderation, or disrupt the network;</li>
          <li>harass, threaten, impersonate, discriminate against, or expose another person;</li>
          <li>attempt to access another account, link another player, or bypass security controls;</li>
          <li>submit knowingly false reports or misuse invitations, player calls, blocks, or support channels;</li>
          <li>copy, resell, or misrepresent Cookie Build services or branding.</li>
        </ul>
        <p class="mt-3">
          Friends, parties, and player calls use preset actions and Minecraft names only. Player
          calls are rate-limited and recipients can disable them. This app version has no public
          posting or free-form live chat.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Moderation, suspension, and appeal</h2>
        <p>
          Cookie Build may remove content, restrict a feature, suspend a player, or terminate access
          when reasonably necessary for safety, fair play, service integrity, legal compliance, or a
          material breach of these terms. Serious or repeated abuse may lead to immediate action.
          To challenge a decision, email support with the Minecraft name, edition, approximate date,
          and relevant context. Appeals are reviewed by a person.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Availability and changes</h2>
        <p>
          Games, maps, statistics, friends, parties, events, and notification delivery may change or
          be temporarily unavailable for maintenance, security, software compatibility, or third-party
          outages. Features that depend on missing maps are kept unavailable rather than exposed in a
          broken state. We may update these terms for legal, safety, or product changes. Material changes
          will be posted with a new effective date before they apply where required.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Purchases and ownership</h2>
        <p>
          The app includes a kit shop and a player-to-player Skyblock marketplace that use virtual
          coins earned through Cookie Build gameplay. Marketplace sales exchange only eligible
          in-game Skyblock resources for those virtual coins.
          It contains no real-money checkout, subscription, paid digital entitlement, or conversion of
          virtual coins into money. Cookie Build code, artwork, and branding remain owned by their
          respective owners. Minecraft names, marks, and game assets belong to Mojang or Microsoft and
          are used under applicable usage guidelines. You retain rights in content you own and grant
          Cookie Build only the rights needed to operate the service.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Web purchases, subscriptions, and voluntary support</h2>
        <ul class="list-disc space-y-2 pl-6">
          <li>Product content, duration, and total EUR price including tax are public on the catalog before sign-in. Payment is hosted by Stripe after the buyer links the receiving Minecraft player.</li>
          <li>Permanent products are delivered digitally after confirmed payment. Before ordering, the buyer must separately and expressly request immediate performance and acknowledge loss of the withdrawal right when access is delivered; neither box is preselected.</li>
          <li>The Supporter monthly subscription renews every month. It can be cancelled from the Stripe portal, normally at period end. Initial subscribers may exercise the 14-day withdrawal action shown in purchase history for an immediate cancellation and full refund.</li>
          <li>Refunds, disputes, failed payments, cancellation, revocation, and expiry can suspend or remove only the access funded by the affected payment. No purchase grants an advantage in competitive mini-games.</li>
          <li>“Voluntary support” is a repeatable service tip, never charitable fundraising, and grants no rank, cosmetic, item, or exclusive advantage.</li>
          <li>The companion mobile app has no real-money commerce, checkout, or external payment link. Its kit shop uses only gameplay-earned virtual coins.</li>
        </ul>
        <p class="mt-3">The buyer can download a durable order history, consent wording and timestamps from the web account. For payment, cancellation, withdrawal or refund support, email <a class="text-orange-400" :href="`mailto:${seller?.supportEmail || 'support@cookie-build.com'}`">{{ seller?.supportEmail || "support@cookie-build.com" }}</a> with the order reference, never card details.</p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Liability and governing law</h2>
        <p>
          The service is provided with reasonable care, but uninterrupted availability and perfect
          accuracy cannot be guaranteed. To the extent permitted by law, Cookie Build is not liable
          for indirect loss, lost virtual progress caused by a documented outage, or third-party
          platform failures. Nothing in these terms limits mandatory consumer rights or liability that
          cannot legally be excluded. French law applies, without depriving consumers of mandatory
          protections in their country. The parties should first try to resolve disputes through support;
          competent courts and mandatory consumer rights remain available.
        </p>
        <p v-if="seller?.mediatorName && seller?.mediatorUrl" class="mt-3">Consumer mediator: {{ seller?.mediatorName }}<template v-if="seller?.mediatorUrl"> — <a class="text-orange-400" :href="seller?.mediatorUrl">{{ seller?.mediatorUrl }}</a></template>.</p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Stopping use</h2>
        <p>
          You can stop at any time, unlink Minecraft identities, leave friendships or parties, disable
          notifications, and delete the mobile account in Settings. Data handling after deletion is
          described in the <NuxtLink class="text-orange-400" to="/privacy">Privacy Policy</NuxtLink>.
        </p>
      </section>
    </section>

    <hr class="border-gray-800" />

    <section id="francais" lang="fr" class="space-y-8 scroll-mt-8">
      <header>
        <h1 class="mb-3 text-4xl font-bold text-white">Conditions d’utilisation</h1>
        <p>Applicables et mises à jour le 5 septembre 2026</p>
      </header>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Exploitant et acceptation</h2>
        <p>
          Cookie Build est un serveur Minecraft, un site et une app compagnon indépendants exploités
          par {{ seller?.legalName || "Cookie Build ; les achats sont actuellement indisponibles" }}<template v-if="seller?.legalAddress">, {{ seller?.legalAddress }}</template>. En utilisant le service, vous acceptez ces conditions et les règles
          publiées du serveur. Contact :
          <a class="text-orange-400" href="mailto:support@cookie-build.com">support@cookie-build.com</a>.
          Cookie Build n’est ni affilié ni approuvé par Mojang, Microsoft, Apple ou Google.
        </p>
        <p v-if="seller?.businessId || seller?.vatId" class="mt-3"><template v-if="seller?.businessId">Identifiant entreprise : {{ seller?.businessId }}</template><template v-if="seller?.vatId"> · TVA : {{ seller?.vatId }}</template></p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Âge et compte</h2>
        <p>
          L’app est destinée aux personnes de 13 ans ou plus. Lorsque la loi locale exige un accord
          parental, un parent ou responsable légal doit autoriser l’utilisation. L’app crée un compte
          pseudonyme et l’associe au joueur grâce à un code temporaire généré en jeu. Protégez votre
          appareil et votre compte Minecraft et ne partagez jamais ce code.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Utilisation autorisée</h2>
        <p>Il est interdit de :</p>
        <ul class="mt-3 list-disc space-y-2 pl-6">
          <li>tricher, exploiter un bug, automatiser un abus, contourner une sanction ou perturber le réseau ;</li>
          <li>harceler, menacer, usurper, discriminer ou divulguer les données d’une personne ;</li>
          <li>accéder au compte d’autrui, associer un autre joueur ou contourner une protection ;</li>
          <li>envoyer sciemment de faux signalements ou détourner invitations, appels de joueurs, blocages et support ;</li>
          <li>revendre, copier ou présenter faussement le service ou la marque Cookie Build.</li>
        </ul>
        <p class="mt-3">Les amis, groupes et appels de joueurs utilisent uniquement des actions prédéfinies et pseudos Minecraft. Les appels sont limités et chaque destinataire peut les désactiver. Cette version ne propose ni publication publique ni chat libre.</p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Modération et recours</h2>
        <p>
          Cookie Build peut retirer un contenu, limiter une fonction, suspendre ou fermer un accès
          pour la sécurité, l’équité, l’intégrité, une obligation légale ou une violation importante.
          Un abus grave ou répété peut entraîner une mesure immédiate. Pour contester, écrivez au
          support avec le pseudo, l’édition, la date approximative et le contexte. Un humain examine le recours.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Disponibilité et modifications</h2>
        <p>
          Jeux, maps, statistiques, amis, groupes, événements et notifications peuvent évoluer ou
          être interrompus pour maintenance, sécurité, compatibilité ou panne d’un tiers. Une fonction
          dépendant d’une map manquante reste fermée plutôt que cassée. Les changements importants de
          ces conditions seront publiés avec une nouvelle date d’effet.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Achats et propriété</h2>
        <p>
          L’app contient une boutique de kits et un marché Skyblock entre joueurs utilisant uniquement
          les pièces virtuelles gagnées en jouant sur Cookie Build. Les ventes du marché échangent
          uniquement des ressources Skyblock éligibles contre ces pièces. Elle ne contient aucun
          paiement en argent réel, souscription,
          avantage numérique payant ni conversion des pièces en argent. Les codes, créations et
          marques restent la propriété de leurs titulaires. Les noms, marques et éléments Minecraft
          appartiennent à Mojang ou Microsoft et sont utilisés selon leurs règles d’usage applicables.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Achats web, abonnement et soutien libre</h2>
        <ul class="list-disc space-y-2 pl-6">
          <li>Le contenu, la durée et le prix total TTC en euros sont publics avant connexion. Après association du joueur destinataire, le paiement est hébergé par Stripe.</li>
          <li>Pour un achat numérique permanent livré après paiement, l’acheteur doit demander séparément l’exécution immédiate et reconnaître la perte du droit de rétractation dès la livraison. Aucune case n’est précochée.</li>
          <li>L’abonnement Supporter est mensuel et renouvelable. Il est résiliable depuis le portail Stripe, normalement en fin de période. L’historique propose pendant 14 jours après la souscription initiale une rétractation avec annulation immédiate et remboursement intégral.</li>
          <li>Un remboursement, litige, impayé, retrait, expiration ou révocation peut suspendre uniquement l’accès financé concerné. Aucun achat ne donne d’avantage compétitif dans les mini-jeux.</li>
          <li>Le « soutien libre » est un pourboire répétable au service Cookie Build, sans finalité caritative ; il ne donne aucun rang, cosmétique, objet ni avantage exclusif.</li>
          <li>L’app mobile actuelle n’expose aucun achat en argent réel, checkout ni lien de paiement. Sa boutique de kits utilise uniquement des pièces gagnées en jeu.</li>
        </ul>
        <p class="mt-3">L’espace web conserve l’historique de commande, le texte/version des consentements et leurs dates sur un support durable. Pour un paiement, une résiliation, une rétractation ou un remboursement, écrivez à <a class="text-orange-400" :href="`mailto:${seller?.supportEmail || 'support@cookie-build.com'}`">{{ seller?.supportEmail || "support@cookie-build.com" }}</a> avec la référence de commande, jamais les données de carte.</p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Responsabilité et droit applicable</h2>
        <p>
          Le service est fourni avec un soin raisonnable, sans garantie d’une disponibilité continue
          ou d’une exactitude parfaite. Dans les limites légales, Cookie Build n’est pas responsable
          des pertes indirectes ou pannes de plateformes tierces. Aucun droit impératif du consommateur
          ni responsabilité légalement incontournable n’est exclu. Le droit français s’applique sans
          retirer les protections impératives du pays du consommateur. Le support doit être contacté
          d’abord ; les tribunaux compétents et droits impératifs du consommateur restent accessibles.
        </p>
        <p v-if="seller?.mediatorName && seller?.mediatorUrl" class="mt-3">Médiateur de la consommation : {{ seller?.mediatorName }}<template v-if="seller?.mediatorUrl"> — <a class="text-orange-400" :href="seller?.mediatorUrl">{{ seller?.mediatorUrl }}</a></template>.</p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Arrêt du service</h2>
        <p>
          Vous pouvez arrêter à tout moment, dissocier les joueurs, quitter les amis ou groupes,
          désactiver les notifications et supprimer le compte mobile dans les réglages. Consultez la
          <NuxtLink class="text-orange-400" to="/privacy">Politique de confidentialité</NuxtLink>.
        </p>
      </section>
    </section>
  </article>
</template>

<script setup lang="ts">
const { data: commerceCatalog } = await useFetch("/api/cosmetics/catalog");
const seller = computed(() => commerceCatalog.value?.data.commerce.seller);

import { publicPageSeo } from "@/utils/public-page-seo";

definePageMeta({ alias: ["/fr/terms", "/de/terms", "/it/terms", "/bg/terms", "/es/terms", "/hi/terms", "/pt-br/terms"] });

const { locale } = useSiteLocale();
const seo = computed(() => publicPageSeo(locale.value.code, "terms"));
useLocalizedSeo("/terms", () => seo.value.title, () => seo.value.description);
</script>
