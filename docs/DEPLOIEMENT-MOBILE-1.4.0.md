# Livraison web/API/mobile 1.4.0

Déploiements, règles, commits/push et APK autorisés le 21 novembre 2026.
Le développement admin et membre reste sur `develop` ; le dépôt mobile conserve
sa branche `feat/native-admin-sections`.

## Périmètre

Les routes `/api/mobile/member/**` servent l’espace membre natif (lots 1–4),
avec vérification du jeton, du dossier approuvé, de la première connexion et
du règlement, et une isolation des données personnelles. Demandes, déclarations,
pièces et signatures restent soumises aux validations administratives existantes.
La fonction push inclut les appareils membres natifs sans exposer leurs tokens.

Les calendriers web et mobile admin lisent les fins d’assurance et les prospects
en suivi, avec contacts et quartiers de Géographie. Les deux sites retirent
l’installation et le cache PWA ; le service de notifications reste disponible.

La vue consolidée sépare les résiliations CS `RESCINDED` / CI `CANCELED` des
clôtures CS `CLOSED` / CI `FINISHED`, et expose les identifiants dans chaque
catégorie. Les contrats résiliés ne restent pas dans les contrats en suivi.
Crédit spécial expose le nombre de contrats non clos hors partie fixe, selon
le même calcul métier que le compteur Partie fixe. Les états terminaux CLOSED,
DISCHARGED et WRITTEN_OFF sont exclus ; un calcul manquant reste indisponible.

## Validation et sauvegardes

TypeScript web/API et Functions passent ; lint ciblé sans erreurs. Les tests
unitaires de la vue consolidée et de la phase des crédits passent, ainsi que
les parcours mobiles correspondants en clair/sombre. Les 18 tests des règles
Firestore/Storage groupes et accords passent sur le projet émulateur de test.

Les règles actives, la fonction push et le trafic des deux backends ont été
sauvegardés hors du dépôt avant publication. Le différentiel des règles est
limité aux accords, remises et protections de suppression des groupes déjà
implémentés dans les sources. Aucun index n’est supprimé par cette livraison.
La réactivation administrative ciblée dispose d’une sauvegarde et d’une trace
privées ; les cotisations sont conservées. Le responsable a également confirmé que le
remboursement final payé était erroné : cet enregistrement est archivé, sans
marqueurs de remise, avec son état initial conservé dans la trace administrative.

## Résultat de livraison

### Production vérifiée

- Admin/API : `f82fd0a67db49178200f4830a2f7e607560751f3`, backend `kara-admin`
  (inclut les fonctions de `f3df79af` et la route de retrait PWA).
- Site membre : `153b163431b9722b11ffa17aa7cfbf9506021dd3`, backend `kara-members`.
- Builds : admin `build-2026-11-21-002`, membre `build-2026-11-21-001`,
  projet `kara-gabon` / `us-east4`. READY, rollouts SUCCEEDED, trafic 100 %,
  vérifiés le 22 novembre 2026 (heure du Gabon).
- Firestore : `bb968648-43e5-46ce-af28-3b8f62d4f310` ; Storage :
  `5ea7182d-f955-4910-8933-2477e22ee541`. Les contenus publiés correspondent
  exactement aux fichiers du dépôt validés par les 18 tests en émulateur.
- Fonction `sendPushOnNotification` ACTIVE, révision
  `sendpushonnotification-00003-wes`, Node.js 22, `europe-west1`.
- Politique de nettoyage Artifact Registry conservée dans son état initial :
  le nettoyage à un jour ajouté par défaut par la CLI a été retiré, sans demande
  de suppression des images de déploiements précédents.
- Les sauvegardes avant/après et journaux contenant des données privées restent
  hors Git. Les index existants sont conservés ; aucun index supprimé.
- Vérification HTTP après la publication finale : `/sw.js` admin retourne 200
  JavaScript sans cache et désinscrit l’ancienne PWA ; le worker FCM retourne
  200 et l’API membre sans jeton retourne 401 JSON avec `no-store, private`.
