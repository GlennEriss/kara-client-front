# API mobile 1.3.1 — déploiement production

Déploiement autorisé et effectué le 19 novembre 2026.

- Commit livré : `36b56d1713e79ec69f1cbef50c835a6d43c94a4f`.
- Backend : `kara-admin`, projet `kara-gabon`, région `us-east4`.
- Build/rollout : `build-2026-11-19-002`.
- Cloud Build : `SUCCESS` ; App Hosting : `READY` ; rollout : `SUCCEEDED`.
- Trafic vérifié : 100 % sur cette version.

La livraison inclut le correctif commun des dates et badges de ponctualité pour
les trois crédits, sur le web et dans les réponses de l’API mobile. Le script
audité de réconciliation des anniversaires est versionné mais n’est pas exécuté
par le build ou le démarrage. Aucune nouvelle modification de données métier.

Validation : TypeScript, 28 tests ciblés des crédits, six tests du script de
réconciliation ; lint ciblé sans erreur et dix avertissements antérieurs.
Les routes `/api/mobile/me`, `/api/mobile/admin/members` et
`/api/mobile/finance/credit-fixe/contracts` répondent 401 JSON sans jeton.
L’APK production signé 1.3.1 / 12 est installé et démarré dans l’émulateur,
avec session conservée. Les deux historiques restent accessibles dans les
fiches membres, sans sections autonomes dans la sidebar.

Aucune publication de Functions, règle Firebase, migration automatique ou
notification de test pour ce déploiement. Les journaux détaillés restent privés.
