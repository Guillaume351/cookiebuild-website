# Cookie Build private operator

Runner Node.js privé, sans dépendance npm, destiné au BFF admin. Il expose quatre actions fermées (`status`, `simulate`, `restart-minecraft`, `maintenance`) et n’accepte ni commande, ni argument d’exécutable venant d’une requête.

## Contrat HTTP et signature

`GET /healthz` est la seule route publique. Les routes signées sont :

- `GET /v1/status`
- `POST /v1/actions/simulate`
- `POST /v1/actions/restart-minecraft`
- `POST /v1/actions/maintenance`

Headers obligatoires :

- `X-CookieBuild-Timestamp`: timestamp Unix en millisecondes, exactement 13 chiffres ;
- `X-CookieBuild-Nonce`: 16 à 128 caractères parmi `A-Z a-z 0-9 . _ : -` (un UUID convient) ;
- `X-CookieBuild-Signature`: HMAC-SHA256 hexadécimal ;
- `Idempotency-Key`: en plus sur les deux mutations `restart-minecraft` et `maintenance`.

La chaîne canonique est exactement :

```text
${METHOD_UPPER}\n${PATH_WITH_QUERY}\n${TIMESTAMP}\n${NONCE}\n${SHA256_HEX_RAW_BODY}
```

`PATH_WITH_QUERY` est le pathname suivi de la query telle qu’envoyée, sans schéma ni hôte. Le hash porte sur les octets bruts du corps ; un corps vide utilise SHA-256 de zéro octet. Le runner accepte par défaut ±60 secondes, compare la signature en temps constant et conserve les nonces 120 secondes dans le fichier d’état. Le BFF doit donc signer le JSON sérialisé final, pas un objet re-sérialisé après signature.

Exemple de corps :

```json
{"action":"restart-minecraft","reason":"maintenance planifiée"}
```

pour `/v1/actions/simulate`, ou :

```json
{"enabled":true,"reason":"maintenance planifiée"}
```

pour `/v1/actions/maintenance`. Un redémarrage avec joueurs n’est accepté que si `OPERATOR_ALLOW_FORCE_WITH_PLAYERS=true`, `force:true` et une raison d’au moins huit caractères sont tous présents.

## Garde-fous

- secret distinct d’au moins 32 caractères, jamais retourné ni loggé ;
- nonces et idempotence persistés, verrou exclusif avec expiration ; une seule réplique du runner ;
- comptage joueurs obligatoire et fail-closed par défaut ;
- maintenance activée avant redémarrage et désactivée uniquement après réussite des canaris ;
- canaris HTTP/TCP obligatoires par défaut ;
- audit JSONL et sorties tronquées/nettoyées ;
- adaptateur Docker Swarm limité au service configuré, via `execFile` avec `shell:false` ;
- adaptateur alternatif `command-manifest` limité aux commandes fixes `status`, `restart-minecraft` et, si configurées ensemble, `maintenance-on`/`maintenance-off`, dont les exécutables doivent être explicitement listés dans `OPERATOR_ALLOWED_EXECUTABLES`.

Le montage du socket Docker donne un pouvoir important au conteneur. Le runner doit rester sur un réseau privé, derrière le BFF, et son accès au socket doit idéalement être remplacé par un proxy Docker filtrant `service inspect/update`. Dans un conteneur, configurez `OPERATOR_HOST=0.0.0.0` pour le réseau overlay, mais ne publiez jamais le port sur l’hôte ou Internet. En mode Swarm, l’exemple conserve l’UID non-root `operator` et utilise `user: operator:${DOCKER_SOCKET_GID}` afin de prendre comme GID primaire le groupe numérique propriétaire du socket; `group_add` n’est pas accepté par `docker stack config`.

## Configuration minimale

Voir `docker-compose.example.yml`. Créez le réseau Docker privé externe `cookiebuild-admin` et raccordez-y également le BFF Nuxt ; le nom DNS interne devient alors `cookiebuild-operator:9410`. Les valeurs de service, URL de supervision et canaris doivent être redécouvertes dans l’environnement cible et ne sont volontairement pas codées en dur. Les états et audits vont dans `/state`.

Pour l’adaptateur manifest :

```text
OPERATOR_ADAPTER=command-manifest
OPERATOR_COMMAND_MANIFEST_FILE=/run/operator/commands.json
OPERATOR_ALLOWED_EXECUTABLES=/opt/cookiebuild/bin/minecraft-status,/opt/cookiebuild/bin/restart-minecraft,/opt/cookiebuild/bin/maintenance
```

Le fichier de maintenance doit être monté dans le BFF ou le reverse proxy qui sert la page de maintenance. Avec l’adaptateur manifest, les deux commandes fixes optionnelles peuvent synchroniser un autre contrôle externe ; si l’une est déclarée, l’autre devient obligatoire. Les variables `OPERATOR_ALLOW_RESTART_WITHOUT_MONITOR` et `OPERATOR_ALLOW_RESTART_WITHOUT_CANARIES` sont des échappatoires de dépannage dangereuses, désactivées par défaut.

## Tests

```sh
npm test
```
