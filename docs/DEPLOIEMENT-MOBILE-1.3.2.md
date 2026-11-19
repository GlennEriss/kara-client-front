# Vue consolidée — API mobile 1.3.2

Déploiement autorisé le 19 novembre 2026.

- Commit applicatif : `41d20e5d7881d4c33c44000be653b7b770764ee7`.
- Backend : `kara-admin`, projet `kara-gabon`, région `us-east4`.
- Build/rollout : `build-2026-11-19-003`.

## Périmètre

La modale web expose les identifiants des demandes et contrats derrière les
compteurs, y compris les contrats clôturés, avec navigation vers leurs fiches.
Les listes sont chargées par membre avant filtrage afin de ne pas tronquer les
compteurs et liens aux huit derniers documents.

La nouvelle lecture `GET /api/mobile/member-overview/[id]` reprend les mêmes
règles métier. Elle demande un jeton Firebase valide, le droit membres et les
droits de chaque module. Les familles interdites ne sont ni lues ni exposées ;
les agents de recouvrement ne reçoivent pas les informations financières.
La réponse est privée et sans cache HTTP. Les erreurs partielles sont signalées.

Validation préalable : TypeScript, ESLint ciblé et 17 tests réussis. Les lectures
locales avec session autorisée confirment les compteurs, les identifiants et la
navigation, sans écriture métier.

## Vérification de livraison

- Cloud Build `SUCCESS`, App Hosting `READY`, rollout `SUCCEEDED`.
- Trafic vérifié : 100 % sur `build-2026-11-19-003`.
- Les routes `/api/mobile/me`, `/api/mobile/admin/members` et
  `/api/mobile/member-overview/check` renvoient 401 JSON sans jeton, avec
  `Cache-Control: no-store, private`.
- APK production signé 1.3.2 / 13 installé et démarré sur l’émulateur Android.
  Recherche de membres et modale chargées avec la session conservée et les données
  de production. Un identifiant de contrat Crédit spécial ouvre sa fiche native ;
  la référence de la fiche correspond au choix et la modale se ferme.
- Aucune écriture métier réalisée pendant la recette. Les captures et traces
  contenant des données réelles restent privées et hors Git.

Aucun déploiement de Functions, de règles ou d’index, aucune migration de données
ni notification de test n’est déclenché par cette livraison.
