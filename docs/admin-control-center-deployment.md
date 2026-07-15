# Déploiement du control center admin

Cette livraison est volontairement non déployée. L’ordre ci-dessous garde le bridge désactivé
tant que la base, RabbitMQ et le BFF ne sont pas prêts.

## Préparation et sauvegardes

1. Sauvegarder PostgreSQL, les artefacts Paper/plugins actuels et les configurations Dokploy.
2. Noter les images, JAR et variables en production pour pouvoir revenir exactement en arrière.
3. Créer un vhost/utilisateur RabbitMQ dédié avec uniquement les droits sur l’exchange
   `cookiebuild.admin` et les queues `cookiebuild.admin.*`.
4. Créer le réseau Docker privé externe `cookiebuild-admin`; y raccorder le site, l’operator et
   l’update-monitor. Aucun de leurs ports privés ne doit être publié sur Internet.

## Ordre de livraison

1. Appliquer `drizzle/0007_admin_control_center.sql`. Le fichier est réexécutable et le journal
   d’audit refuse ensuite tout `UPDATE`/`DELETE`.
2. Déployer CookieDough avec `ADMIN_BRIDGE_ENABLED=false`, puis exécuter ses canaris habituels.
3. Déployer `operator/` et `update-monitor/` avec deux secrets HMAC distincts de 32 caractères ou
   plus, les versions réellement installées, la garde joueurs et les canaris Java/Bedrock/HTTP.
4. Déployer le site avec les variables admin de `.env.example`, sans encore exposer `/admin` dans
   la navigation publique.
5. Vérifier dans Firebase Console que le fournisseur **E-mail/Mot de passe** est activé et que
   `NUXT_PUBLIC_FIREBASE_API_KEY` provient bien de l’application Firebase du même projet que
   `NUXT_FIREBASE_PROJECT_ID`. Provisionner ensuite le premier compte owner nominatif sans créer
   ni transmettre de mot de passe
   temporaire. Le script peut créer un utilisateur Firebase sans mot de passe, lui ajouter le
   claim `admin=true` et créer son entrée RBAC :

   ```sh
   npm run admin:provision -- --create guillaume@example.com owner "Guillaume"
   ```

   Utiliser une adresse personnelle dédiée, contrôlée par l’owner et différente d’un compte joueur
   partagé. Ensuite, dans Firebase Console > Authentication > Users, envoyer l’e-mail de
   réinitialisation du mot de passe à cette adresse. L’owner choisit seul son mot de passe depuis le
   lien reçu. Ne jamais copier le mot de passe ou le lien de réinitialisation dans un chat, un ticket,
   les logs ou Dokploy. Si l’utilisateur Firebase existe déjà, retirer `--create`.

   Tester ensuite une nouvelle connexion sur `/admin/login`; une session ouverte avant le
   provisionnement doit être fermée puis recréée pour recevoir le nouveau claim.

6. Activer CookieDough avec `ADMIN_BRIDGE_ENABLED=true`, un `ADMIN_BRIDGE_SERVER_ID` stable et les
   mêmes vhost/exchange RabbitMQ que le BFF.
7. Vérifier dans `/admin/runtime` un snapshot frais, puis tester dans cet ordre : message privé,
   mute temporaire, unmute, ban temporaire sur un compte de test, unban, fermeture/réouverture
   d’admissions et appel de joueurs.
8. Ajouter le scrape/règles/dashboard de `observability/admin-ops/`, vérifier le routage
   Alertmanager, puis lancer un check du moniteur depuis `/admin/updates`.
9. Simuler le restart depuis `/admin/operations`. Le restart réel ne doit être essayé qu’avec zéro
   joueur : le BFF active d’abord la maintenance Paper, exige `restart_ready`, le runner revérifie
   le compteur et termine par les canaris.

## Variables principales

- Site : `NUXT_ADMIN_RABBITMQ_URL`, `NUXT_ADMIN_DEFAULT_SERVER_ID`, `NUXT_PROMETHEUS_URL`,
  `NUXT_LOKI_URL`, `NUXT_OPERATOR_URL`, `NUXT_OPERATOR_HMAC_SECRET`,
  `NUXT_UPDATE_MONITOR_URL`, `NUXT_UPDATE_MONITOR_HMAC_SECRET`,
  `NUXT_PUBLIC_FIREBASE_API_KEY` et `NUXT_FIREBASE_PROJECT_ID`.
- CookieDough : `ADMIN_BRIDGE_ENABLED`, `ADMIN_BRIDGE_SERVER_ID`, `RABBITMQ_URL`,
  `ADMIN_BRIDGE_EXCHANGE`, `ADMIN_BRIDGE_COMMAND_QUEUE`.
- Operator : variables du `operator/docker-compose.example.yml`, avec compteur joueurs fail-closed
  et au moins un canari Java, Bedrock et HTTP.
- Update monitor : variables de `update-monitor/docker-compose.example.yml`, ainsi qu’un fichier
  `installed-versions.json` renseigné depuis les artefacts réellement déployés.

## Rollback

1. Désactiver `ADMIN_BRIDGE_ENABLED` avant toute autre action : le gameplay redevient indépendant
   du control plane.
2. Retirer l’accès au BFF admin, puis arrêter operator/update-monitor.
3. Restaurer l’ancien JAR CookieDough si la régression vient du plugin.
4. Ne supprimer aucune table admin pendant l’incident. Elles sont additives et préservent l’audit;
   leur retrait peut être planifié séparément après sauvegarde.
