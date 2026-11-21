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
privées ; les écritures de versement et remboursement sont conservées.

## Résultat de livraison

En cours de vérification : les références de builds/rollouts, règles et fonctions
seront renseignées après succès. Aucun résultat de production n’est supposé
à partir des seuls tests locaux.
