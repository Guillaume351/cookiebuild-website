# Cookie Build update monitor

Service Node.js privé, sans dépendance npm, qui surveille les versions amont sans jamais télécharger, installer ou redémarrer quoi que ce soit. Il conserve son état JSON, les ETag/Last-Modified et le dernier payload utilisable ; une indisponibilité ponctuelle peut donc servir le cache en le signalant comme périmé. Un cache périmé ne compte pas comme source disponible, ne rend pas `/healthz` vert à lui seul et ne déclenche pas de webhook.

## Sources amont

| Composant | Source officielle/upstream |
|---|---|
| Paper | [Paper Downloads Service v3](https://docs.papermc.io/misc/downloads-service/) (`fill.papermc.io`) ; première build `STABLE` de la version finale la plus récente |
| Geyser | [GeyserMC Downloads API](https://geysermc.org/wiki/api/downloads/) projet `geyser`, dernière build du canal `default` (jamais `experimental`) |
| Floodgate | [GeyserMC Downloads API](https://geysermc.org/wiki/api/downloads/) projet `floodgate`, dernière build du canal `default` (jamais `experimental`) |
| ViaVersion | [releases upstream](https://github.com/ViaVersion/ViaVersion/releases/latest) |
| ViaBackwards | [releases upstream](https://github.com/ViaVersion/ViaBackwards/releases/latest) |
| ProtocolLib | [releases upstream](https://github.com/dmulloy2/ProtocolLib/releases/latest) |
| OldCombatMechanics | [releases upstream](https://github.com/kernitus/BukkitOldCombatMechanics/releases/latest) |

Le service Paper demande un `User-Agent` clair avec logiciel/version et contact. Configurez `UPDATE_MONITOR_USER_AGENT` si l’URL Cookie Build par défaut n’est pas le contact approprié. Le token GitHub optionnel augmente seulement la limite de requêtes ; il ne doit avoir aucun droit d’écriture.

## Contrat HTTP et signature BFF

Routes publiques, à réserver au réseau de supervision :

- `GET /healthz` — 200 uniquement si au moins une source a réussi récemment, sinon 503 ;
- `GET /metrics` — exposition Prometheus sans version en label.

Routes signées :

- `GET /v1/status`
- `GET /v1/report.md`
- `GET /v1/ai-prompt.txt`
- `POST /v1/check` — exige aussi `Idempotency-Key`.

Headers obligatoires : `X-CookieBuild-Timestamp` (Unix ms sur 13 chiffres), `X-CookieBuild-Nonce` (UUID ou 16–128 caractères sûrs) et `X-CookieBuild-Signature` (hex HMAC-SHA256). La chaîne canonique, identique à celle de l’operator, est :

```text
${METHOD_UPPER}\n${PATH_WITH_QUERY}\n${TIMESTAMP}\n${NONCE}\n${SHA256_HEX_RAW_BODY}
```

Le chemin comprend la query exacte sans schéma/hôte. Le hash porte sur les octets bruts (SHA-256 du vide pour un GET sans corps). Fenêtre par défaut : ±60 s ; nonce persisté 120 s ; comparaison en temps constant. Le secret `UPDATE_MONITOR_HMAC_SECRET` est distinct de celui de l’operator et contient au moins 32 caractères.

## Versions installées

Montez un objet JSON via `UPDATE_MONITOR_INSTALLED_FILE` (recommandé) ou `UPDATE_MONITOR_INSTALLED_JSON`. Les sept clés attendues figurent dans `installed-versions.example.json`. Les versions Paper utilisent `version-build`, Geyser/Floodgate `version+build`, les releases GitHub leur tag sans `v`. Une valeur absente produit `installed-unknown`, jamais un faux positif.

Les sorties persistées sont :

- état/cache : `/state/update-monitor.json` ;
- rapport opérateur : `/state/update-report.md` ;
- prompt IA nettoyé : `/state/update-ai-prompt.txt`.

Le prompt contient versions installées/cibles, URLs, résumés de changelog et checklist sauvegarde → test isolé → garde joueurs → canaris → rollback. Il ne contient aucune variable d’environnement ni secret. Le webhook HTTPS optionnel est compatible Discord, n’autorise aucune mention et n’est envoyé que si l’ensemble des cibles change avec au moins une mise à jour disponible. En production, montez-le dans un fichier `0600` et utilisez `UPDATE_MONITOR_WEBHOOK_FILE`; la variable directe reste disponible pour le développement, mais les deux modes sont mutuellement exclusifs.

## Exécution

Voir `docker-compose.example.yml`. Créez le réseau Docker privé externe `cookiebuild-admin` et raccordez-y également le BFF Nuxt ; le nom DNS interne devient alors `cookiebuild-update-monitor:9420`. Configurez `UPDATE_MONITOR_HOST=0.0.0.0` pour l’écoute overlay, sans publier le port sur l’hôte ou Internet. Un check se lance au démarrage puis toutes les six heures par défaut. Tests :

```sh
npm test
```
