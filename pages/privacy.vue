<template>
  <article class="mx-auto max-w-3xl space-y-10 py-12 text-gray-300">
    <nav class="flex gap-3 text-sm" aria-label="Language">
      <a class="rounded-md bg-orange-600 px-3 py-2 font-semibold text-white" href="#english">English</a>
      <a class="rounded-md border border-gray-700 px-3 py-2 font-semibold text-white" href="#francais">Français</a>
    </nav>

    <section id="english" lang="en" class="space-y-8 scroll-mt-8">
      <header>
        <h1 class="mb-3 text-4xl font-bold text-white">Privacy Policy</h1>
        <p>Effective and last updated: August 22, 2026</p>
      </header>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Controller and scope</h2>
        <p>
          Cookie Build is operated by Guillaume Claverie, who is the controller for personal data
          processed by the Cookie Build Minecraft server, website, and companion app. Contact
          <a class="text-orange-400" href="mailto:support@cookie-build.com">support@cookie-build.com</a>
          for privacy questions or requests. This policy covers the app, website, and game services.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Data we process</h2>
        <ul class="list-disc space-y-2 pl-6">
          <li>A pseudonymous Firebase identifier created by anonymous authentication.</li>
          <li>Technical authentication diagnostics automatically processed by Firebase, such as IP address, operating system, device model, brand, form factor, installer, SDK versions, and Firebase app identifier.</li>
          <li>Minecraft UUID, display name, Java or Bedrock edition, link status, and gameplay statistics.</li>
          <li>Personal seasonal rank, per-game match history and activity, aggregate minigame XP, achievements, earned coin balance, unlocked and selected kits, and daily and weekly goal progress. Goal resets use UTC.</li>
          <li>Skyblock island membership and role, progression, quests, workers, virtual storage quantities, marketplace quotes/listings/sales, and the state and timestamps of crash-safe inventory deposits.</li>
          <li>Structured friend requests, accepted friendships, blocks, report reason, parties, members, invitations, and fixed-format player calls. The app has no free-form chat.</li>
          <li>Friend suggestions calculated on demand from completed matches shared in the last 30 days. Suggestions do not expose the match, time, score, online state, or last-seen time, and exclude existing relationships, blocks, and reports.</li>
          <li>Presence derived from active game sessions. It is available only to accepted friends and current party members, subject to the player’s friends-and-party, friends-only, or hidden setting and all blocks.</li>
          <li>For opted-in notifications: installation ID, FCM token, platform, app version, locale, authorization state, quiet hours, daily/weekly reminder choices, and an optional online alert selected for an accepted friend. Cookie Build does not support silently following arbitrary players.</li>
          <li>A limited in-game app-reminder counter and last-display date, used to avoid repeatedly promoting the app to an unlinked player.</li>
          <li>While legacy version 1.2.3 remains available to older Android devices: Minecraft nickname, Google Play product and purchase history, purchase token and signature, and app-view interactions used by the former shop and Google App Indexing integration.</li>
          <li>Short-lived security information such as IP-based rate-limit counters and operational logs.</li>
        </ul>
        <p class="mt-3">
          The current app does not use advertising identifiers, cross-app tracking, Firebase Analytics,
          Crashlytics, precise location, contacts, microphone, camera, or payment data. Legacy
          version 1.2.3 transmitted its shop requests over an unencrypted connection; the update
          replaces that implementation on compatible devices.
          Public Minecraft names and gameplay statistics can appear in leaderboards.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Purposes and legal bases</h2>
        <ul class="list-disc space-y-2 pl-6">
          <li><strong>Contract:</strong> authenticate the app, link the correct player, provide stats, history, rank, goal progression, Skyblock island/storage and earned-coin marketplace management, earned-coin kit unlocks and selections, privacy-scoped presence, friends and recent-player suggestions, parties, events, and requested account controls.</li>
          <li><strong>Consent:</strong> send push notifications, including separately configurable player calls, goal reminders, and selected accepted-friend online alerts, only after the corresponding in-app opt-in. Consent can be withdrawn in Settings. Quiet hours suppress these notifications.</li>
          <li><strong>Legitimate interests:</strong> secure accounts, prevent abuse, moderate reports, keep games fair, diagnose incidents, and protect service availability.</li>
          <li><strong>Legal obligations:</strong> respond to lawful requests and preserve evidence when required.</li>
        </ul>
        <p class="mt-3">Cookie Build does not sell personal data or use it for targeted advertising.</p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Recipients and international transfers</h2>
        <p>
          Google Firebase provides anonymous authentication and push delivery. The legacy app also
          shared app-view interactions with Google App Indexing. Apple and Google distribute the
          app. Player avatars are loaded from mc-heads.net, which receives the public Minecraft
          display name and the requesting device's IP address. EU-based infrastructure providers host the website, API, database,
          monitoring, and Minecraft server. These providers process only the data needed for their
          services under their own terms and data-processing safeguards. Firebase or store services
          may process data outside the EEA using applicable transfer mechanisms such as adequacy
          decisions or standard contractual clauses.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Retention</h2>
        <ul class="list-disc space-y-2 pl-6">
          <li>One-time link codes expire after 10 minutes; challenge audit rows are removed after 7 days.</li>
          <li>Active mobile profile, player links, and notification data are kept while needed to provide the app or until mobile-account deletion.</li>
          <li>Friendships, blocks, and active parties are server records keyed to the Minecraft UUID. They remain until removed in the app or game, the party ends, or the published cleanup period applies.</li>
          <li>A friend-request timestamp prevents repeat contact for 30 days after a request is cancelled or declined; the timestamp is removed after 90 days.</li>
          <li>Revoked devices are removed after 30 days; revoked player links after 12 months.</li>
          <li>Declined/expired requests, invitations, and ended-party records are removed after 90 days.</li>
          <li>Reports are kept for up to 24 months, or longer while a safety case or legal obligation remains open.</li>
          <li>Delivered notification jobs and deleted-account tombstones are removed after 90 days and 30 days respectively.</li>
          <li>Match results and aggregate gameplay statistics remain for the life of the server for public leaderboards, fair-play, and match integrity, unless law requires earlier deletion.</li>
          <li>Daily/weekly goal progress, achievements, XP, coins, and the app-promotion limiter are Minecraft gameplay records and follow the game-statistics retention period.</li>
          <li>Skyblock island progress, storage, market transactions, and crash-recovery deposit records are Minecraft gameplay and integrity records and follow the game-statistics retention period.</li>
        </ul>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Your choices and rights</h2>
        <p>
          The app works for status, news, events, and leaderboards without linking a player. You can
          disable notifications, unlink a player, copy your app-account data, and delete the mobile
          account from Settings. Deletion removes the pseudonymous mobile profile, devices,
          preferences, per-friend online-alert selections, and mobile player links. It does not erase the Minecraft name, friendships,
          blocks, party or safety records keyed to that player, or integrity records from public
          gameplay history. It also does not erase rank inputs, XP, coins, achievements, or
          daily/weekly goal progress, Skyblock island/storage, market, or deposit records, which are
          gameplay records rather than mobile-account data;
          those use their own controls and retention periods above.
        </p>
        <p class="mt-3">
          Depending on your location, you may request access, correction, deletion, restriction,
          portability, or objection, and may withdraw consent. Contact the address above. You may
          also complain to your local data-protection authority; in France, this is the CNIL.
          The no-app deletion flow is available on the
          <NuxtLink class="text-orange-400" to="/account/delete">account-deletion page</NuxtLink>.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Age and changes</h2>
        <p>
          The companion app is intended for players aged 13 or older. A player below the age at
          which they can consent to online services in their country must use Cookie Build only with
          a parent or guardian. We will post material policy changes here and update the effective date.
        </p>
      </section>
    </section>

    <hr class="border-gray-800" />

    <section id="francais" lang="fr" class="space-y-8 scroll-mt-8">
      <header>
        <h1 class="mb-3 text-4xl font-bold text-white">Politique de confidentialité</h1>
        <p>Applicable et mise à jour le 22 août 2026</p>
      </header>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Responsable et périmètre</h2>
        <p>
          Cookie Build est exploité par Guillaume Claverie, responsable des données traitées par le
          serveur Minecraft, le site et l’application. Pour toute demande, écrivez à
          <a class="text-orange-400" href="mailto:support@cookie-build.com">support@cookie-build.com</a>.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Données traitées</h2>
        <ul class="list-disc space-y-2 pl-6">
          <li>Identifiant Firebase pseudonyme créé par l’authentification anonyme.</li>
          <li>Diagnostics techniques d’authentification traités automatiquement par Firebase, notamment adresse IP, système, modèle, marque, format de l’appareil, installateur, versions des SDK et identifiant d’app Firebase.</li>
          <li>UUID, pseudo, édition Java ou Bedrock, association et statistiques Minecraft.</li>
          <li>Rang saisonnier personnel, historique et activité par jeu, XP agrégée des mini-jeux, succès, solde de pièces gagnées, kits débloqués et sélectionnés, et progression des objectifs quotidiens et hebdomadaires. Les remises à zéro utilisent UTC.</li>
          <li>Île Skyblock, appartenance et rôle, progression, quêtes, ouvriers, quantités du stockage virtuel, cotations/annonces/ventes du marché, ainsi que l’état et les dates des dépôts d’inventaire résistants aux interruptions.</li>
          <li>Demandes et listes d’amis, blocages, motif de signalement, groupes, membres, invitations et appels de joueurs structurés. L’app ne contient aucun chat libre.</li>
          <li>Suggestions d’amis calculées à la demande depuis les parties terminées jouées ensemble pendant les 30 derniers jours. Ni partie, heure, score, présence ou dernière connexion n’est affiché, et les relations, blocages et signalements sont exclus.</li>
          <li>Présence déduite des sessions actives, visible uniquement par les amis acceptés et membres du groupe actuel, selon le réglage amis et groupe, amis uniquement ou masqué, et dans le respect des blocages.</li>
          <li>Après accord pour les notifications : identifiant d’installation, jeton FCM, plateforme, version, langue, autorisation, heures calmes, rappels quotidiens/hebdomadaires et alerte activée pour un ami accepté. Il n’existe aucun suivi silencieux d’un joueur arbitraire.</li>
          <li>Compteur limité et date du dernier rappel de l’app en jeu, afin de ne pas répéter sa promotion auprès d’un joueur non associé.</li>
          <li>Tant que l’ancienne version 1.2.3 reste disponible sur de vieux appareils Android : pseudo Minecraft, produit et historique d’achat Google Play, jeton et signature d’achat, ainsi que les interactions de consultation utilisées par l’ancienne boutique et Google App Indexing.</li>
          <li>Données de sécurité temporaires, notamment les compteurs de limitation par IP et journaux techniques.</li>
        </ul>
        <p class="mt-3">
          L’app actuelle n’utilise ni identifiant publicitaire, ni suivi inter-apps, ni Analytics,
          ni Crashlytics, ni localisation précise, contacts, caméra, microphone ou paiement.
          L’ancienne version 1.2.3 transmettait ses demandes de boutique sans chiffrement ; la mise
          à jour remplace cette implémentation sur les appareils compatibles.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Finalités et bases légales</h2>
        <p>
          Le contrat permet de fournir le compte, l’association, les statistiques, l’historique, le rang,
          les objectifs, la gestion de l’île, du stockage et du marché Skyblock avec les pièces
          gagnées en jeu, les achats de kits avec ces pièces, la présence restreinte,
          les amis et suggestions de joueurs récents, groupes et événements. Le consentement couvre
          uniquement les notifications facultatives, dont les appels de joueurs, rappels d’objectifs
          et alertes d’amis acceptés configurables séparément. Les heures calmes les suppriment. L’intérêt
          légitime couvre la sécurité, l’anti-abus, la modération, l’équité et les incidents. Les
          obligations légales peuvent imposer la conservation ou la communication de certains éléments.
          Aucune donnée n’est vendue ni utilisée pour de la publicité ciblée.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Destinataires et transferts</h2>
        <p>
          Google Firebase fournit l’authentification anonyme et les notifications. L’ancienne app
          partageait aussi les interactions de consultation avec Google App Indexing. Apple et Google
          distribuent l’app. Les avatars sont chargés depuis mc-heads.net, qui reçoit le pseudo
          Minecraft public et l’adresse IP de l’appareil. Des prestataires d’infrastructure européens hébergent le site, l’API,
          la base, le monitoring et le serveur. Certains services peuvent traiter des données hors
          EEE avec les garanties applicables, notamment décision d’adéquation ou clauses contractuelles types.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Durées</h2>
        <ul class="list-disc space-y-2 pl-6">
          <li>Code d’association : 10 minutes ; trace du défi : 7 jours.</li>
          <li>Profil mobile, associations et notifications : pendant l’utilisation ou jusqu’à suppression du compte mobile.</li>
          <li>Amis, blocages et groupes actifs sont liés à l’UUID Minecraft : jusqu’à leur retrait, la fin du groupe ou la durée publiée.</li>
          <li>La date d’une demande d’ami empêche de recontacter la même personne pendant 30 jours après une annulation ou un refus ; elle est supprimée après 90 jours.</li>
          <li>Appareils révoqués : 30 jours ; associations révoquées : 12 mois.</li>
          <li>Demandes, invitations refusées/expirées et groupes terminés : 90 jours.</li>
          <li>Signalements : 24 mois, davantage uniquement pour un dossier encore ouvert ou une obligation légale.</li>
          <li>Tâches de notification livrées : 90 jours ; marqueur de compte supprimé : 30 jours.</li>
          <li>Résultats et statistiques agrégées : pendant la durée de vie du serveur pour le classement, l’équité et l’intégrité des matchs.</li>
          <li>Objectifs quotidiens/hebdomadaires, succès, XP, pièces et limiteur de promotion de l’app : données de jeu conservées selon la même durée que les statistiques Minecraft.</li>
          <li>Progression d’île, stockage, transactions du marché et dépôts de reprise Skyblock : données de jeu et d’intégrité conservées selon la même durée que les statistiques Minecraft.</li>
        </ul>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Vos droits</h2>
        <p>
          Sans association, l’état, les actualités, événements et classements restent accessibles.
          Dans l’app, vous pouvez désactiver les notifications, dissocier un joueur, copier vos
          données et supprimer le compte mobile. Vous pouvez aussi demander accès, rectification,
          effacement, limitation, portabilité ou opposition, et retirer un consentement. Écrivez à
          l’adresse ci-dessus ou utilisez la
          <NuxtLink class="text-orange-400" to="/account/delete">page de suppression</NuxtLink>.
          Vous pouvez saisir votre autorité locale ; en France, la CNIL.
        </p>
        <p class="mt-3">
          La suppression du compte mobile efface le profil mobile pseudonyme, les appareils,
          préférences, alertes d’amis et associations mobiles. Elle n’efface pas le rang, l’XP, les
          pièces, succès, objectifs quotidiens/hebdomadaires, île/stockage, marché ou dépôts Skyblock :
          ces éléments sont des données de jeu
          Minecraft, avec les contrôles et durées indiqués ci-dessus.
        </p>
      </section>

      <section>
        <h2 class="mb-3 text-2xl font-semibold text-white">Âge et modifications</h2>
        <p>
          L’app compagnon est destinée aux joueurs de 13 ans ou plus. En dessous de l’âge de
          consentement numérique applicable, l’accord d’un parent ou responsable légal est requis.
          Toute modification importante sera publiée ici avec une nouvelle date d’effet.
        </p>
      </section>
    </section>
  </article>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Privacy Policy | Cookie Build",
  description: "Cookie Build privacy policy, data controls, retention, and account deletion.",
  robots: "index, follow",
});
</script>
