# Audit du bundle admin — 3 novembre 2026

Le chargement initial est lourd, surtout sur les détails des contrats de Caisse imprévue. Les causes principales sont une double inclusion de Firestore, le chargement de services métier depuis les factories globales et l’inclusion du moteur PDF avant son utilisation.

Analyse du commit `bb448882e414fec2df91d5a5862c56b4abc6e2d6`. Un build de production a été exécuté avec une instrumentation Webpack temporaire, sans modifier les fichiers de configuration ni le code applicatif. Les fichiers du serveur de développement restent dans `.next-dev`.

## Poids initial

Somme des fichiers JavaScript minifiés nécessaires à la page et à ses layouts parents, après déduplication, compressés individuellement en gzip. Les chiffres représentent un chargement à cache froid ; ils ne s’additionnent pas à chaque navigation interne. Les images, CSS, réponses API et chunks chargés ultérieurement sont exclus.

| Écran | JavaScript initial gzip, layouts inclus | JavaScript avant compression |
|---|---:|---:|
| Connexion | 554 Ko | 1,95 Mo |
| Socle admin commun | 676 Ko | 2,35 Mo |
| Tableau de bord | 805 Ko | 2,83 Mo |
| Caisse spéciale : liste | 875 Ko | 3,07 Mo |
| Caisse spéciale : détail | 800 Ko | 2,82 Mo |
| Caisse imprévue : liste | 839 Ko | 2,97 Mo |
| Caisse imprévue : détail | **1,34 Mo** | **4,46 Mo** |
| Calendrier | 825 Ko | 2,92 Mo |
| Placements : liste | 856 Ko | 3,00 Mo |
| Crédit spécial : demandes | 899 Ko | 3,19 Mo |
| Crédit spécial : détail | 822 Ko | 2,90 Mo |
| Véhicules : liste | 846 Ko | 2,96 Mo |

Le tableau de compilation Next.js indique environ 274 Ko pour le bloc de page du dashboard. L’union des fichiers de cette page et de ses layouts atteint environ 805 Ko. Il faut donc inclure les layouts pour évaluer le coût d’une première ouverture.

## Causes constatées

1. **Firestore présent en ESM et CommonJS.** Deux chunks distincts contiennent `@firebase/firestore/dist/index.esm.js` et `index.cjs.js` : environ 57 Ko et 85 Ko gzip. Le `require('firebase/firestore')` dans `src/repositories/notifications/NotificationRepository.ts:43` constitue un point d’entrée CommonJS à harmoniser avec les imports ESM. Le gain réel devra être confirmé par un build après correction.

2. **Factories globales dans les chemins de connexion et de layout.** `src/domains/auth/hooks/useLogin.ts:3` et `src/domains/auth/hooks/useLogout.ts:2` importent `ServiceFactory`. Les services de crédit, placement et caisses sont présents dans un chunk métier commun de 53 Ko gzip, également chargé sur la connexion. Les importations statiques de `ServiceFactory` et `RepositoryFactory` élargissent le graphe de dépendances de fonctions simples.

3. **Pile PDF dans le chargement initial des détails CI.** Six chunks contenant la pile React PDF, PDFKit, Fontkit et Yoga totalisent environ **512 Ko gzip** sur cette route. Cette somme porte sur les chunks complets, y compris leurs autres modules ; ce n’est pas une taille attribuée exclusivement à une seule bibliothèque. Un chemin confirmé est `MonthlyCIContract` / `DailyCIContract` → modales de retrait → `DownloadRefundRequestButton` → import statique de `@react-pdf/renderer`. Charger le composant en différé exige aussi de conditionner son montage à son utilisation.

4. **Graphiques et panneaux communs.** Le chunk contenant Recharts et ses dépendances atteint environ 101 Ko gzip sur le dashboard. Le layout embarque également le panneau de recherche membre et le contenu d’aide, même avant leur ouverture. Ces chargements peuvent être séparés après traitement des causes précédentes.

## Attente liée aux données

- Dans `src/components/caisse-speciale/ListContracts.tsx`, le chargement des remboursements utilise une boucle avec `await listRefunds(...)` pour chaque contrat. Les requêtes sont séquentielles et la mise à jour des cartes attend la fin de toute la boucle. Une concurrence bornée permettrait de réduire cette attente sans changer les données lues.
- Chaque carte CI utilise les statistiques de paiement et les remboursements. `getContractPaymentStats` lit les paiements, puis les aides, successivement. Cela peut représenter trois lectures de sous-collections par carte avant utilisation du cache. Le temps correspondant n’a pas été mesuré sur une session connectée.
- Toute optimisation de ces lectures doit conserver les montants et statuts réels et distinguer une erreur de chargement d’un montant nul.

## Essais sur la connexion en production

URL : `https://adzap-nye-admin-kara.com/login`. Trois visites par profil, avec de nouveaux contextes navigateur, cache désactivé et une fenêtre d’observation de cinq secondes après l’événement `load`.

| Profil | Affichage principal, LCP médian | Événement load médian | JavaScript reçu, corps compressés |
|---|---:|---:|---:|
| Ordinateur, sans limitation artificielle | 0,96 s | 1,61 s | 571 Ko |
| Mobile simulé : CPU ×4, 1,6 Mbit/s, latence configurée 150 ms | 1,41 s | 4,21 s | 571 Ko |

Le navigateur reçoit environ 1,96 Mo de JavaScript après décompression, en 30 ressources. L’affichage initial de la connexion reste relativement rapide dans ces essais ; le poids réseau et le coût du code méritent néanmoins un allègement.

Ces résultats de laboratoire ne sont pas des Core Web Vitals collectés auprès des utilisateurs. Les écrans authentifiés n’ont pas été chronométrés dans le navigateur. Le build local et la version déployée sont deux mesures distinctes : leur identité de commit n’a pas été vérifiée.

## Ordre proposé

1. Éliminer la double inclusion de Firestore et contrôler le résultat au build.
2. Charger la génération PDF lors de son utilisation sur les contrats CI.
3. Découpler les services d’authentification des factories métier globales ; différer les panneaux lourds du layout.
4. Réduire les lectures Firestore en cascade avec une concurrence bornée et un cache correctement invalidé.
5. Comparer avant/après et mesurer des parcours authentifiés représentatifs, avec leurs données et volumes habituels.

## Améliorations appliquées et comparaison

Mesures avant/après réalisées avec la même méthode, sur la même base de code, avec les layouts parents inclus. L’« après » correspond au code local optimisé, avant commit et déploiement.

| Écran | Avant, gzip | Après, gzip | Réduction |
|---|---:|---:|---:|
| Connexion | 554 Ko | 231 Ko | 58 % |
| Socle admin commun | 676 Ko | 397 Ko | 41 % |
| Tableau de bord | 805 Ko | 526 Ko | 35 % |
| Caisse spéciale : liste | 875 Ko | 728 Ko | 17 % |
| Caisse spéciale : détail | 800 Ko | 636 Ko | 21 % |
| Caisse imprévue : liste | 839 Ko | 691 Ko | 18 % |
| Caisse imprévue : détail | 1 343 Ko | 648 Ko | 52 % |
| Calendrier | 825 Ko | 662 Ko | 20 % |
| Placements : liste | 856 Ko | 708 Ko | 17 % |
| Crédit spécial : demandes | 899 Ko | 744 Ko | 17 % |
| Crédit spécial : détail | 822 Ko | 659 Ko | 20 % |
| Véhicules : liste | 846 Ko | 698 Ko | 17 % |

Changements effectués :

- Suppression du convertisseur inutilisé contenant le `require('firebase/firestore')`. Les statistiques Webpack ne contiennent plus de module Firestore CommonJS.
- Accès dédié aux services d’authentification et de notifications depuis les hooks communs, sans import des factories métier globales. Les vérifications de connexion, de session et de rôle sont conservées.
- Chargement du moteur PDF et de la demande de remboursement au clic sur le téléchargement. Les libellés des modes de paiement viennent désormais du module de constantes, et ne provoquent plus l’import du document PDF.
- Montage des modales PDF et des reçus CI lors de leur ouverture. Aucun module `@react-pdf/*` n’est présent dans les chunks initiaux du détail CI après compilation.
- Chargement du dossier membre après sélection, avec une modale d’attente refermable ; chargement de l’aide contextuelle à sa première ouverture, avec indicateur d’attente. La fiche reste déterminée par la page et par les permissions existantes.
- Lectures des remboursements CS par groupes de quatre au maximum, avec protection contre les résultats obsolètes après changement de page. Paiements et aides CI chargés en parallèle. Les sources, les montants et les calculs sont conservés ; le nombre de lectures par contrat n’est pas réduit par ces changements.

### Vérifications

- Build de production réussi et vérification TypeScript réussie.
- 90 tests ciblés réussis dans 21 fichiers : authentification, notifications, statistiques CI, documents PDF et ouvertures différées de l’aide et des dossiers membres. Les tests vérifient aussi le blocage d’un second téléchargement pendant la génération et la possibilité de réessayer après une erreur.
- ESLint ciblé : aucune erreur ; avertissements existants dans les fichiers legacy concernés.
- Six visites de la connexion sur le serveur local de production, dans de nouveaux contextes Chrome. Le navigateur reçoit 231 Ko de JavaScript compressé, 765 Ko décompressé, en 19 ressources. Toutes les visites répondent en HTTP 200.
- Contrôle navigateur de la connexion en 1 440 × 900 et 390 × 844 : aucun débordement horizontal ni erreur JavaScript non interceptée ; visibilité du mot de passe fonctionnelle et formulaire vide bloqué avant tout appel POST.
- Sur ce serveur local : LCP médian de 96 ms et événement `load` de 97 ms sur ordinateur ; LCP médian de 1,56 s et `load` de 1,95 s avec la simulation mobile précédente. Ces temps locaux ne constituent pas un comparatif avant/après avec le site distant : le serveur, la connexion et la charge de la machine diffèrent.

Les écrans authentifiés n’ont pas été chronométrés dans une session navigateur connectée. Leur réduction de poids est vérifiée au build ; le temps d’attente Firestore en conditions réelles reste à mesurer. Les graphiques Recharts restent chargés sur les écrans qui les affichent. Les gains ci-dessus ne s’appliquent au site public qu’après déploiement.

### Refaire la mesure

Exécuter `npm run build`, puis `npm run analyze:bundle`. Pour un export exploitable : `npm run analyze:bundle -- --json`.

Le script utilise `.next/app-build-manifest.json`, déduplique les fichiers JavaScript de chaque page et de ses layouts, puis calcule leur gzip. Il n’exige aucune dépendance supplémentaire et n’instrumente pas la configuration Next.js.

Les exports de cette session sont disponibles localement dans `/tmp/kara-admin-bundle-before.json`, `/tmp/kara-admin-bundle-after.json`, `/tmp/kara-admin-login-performance.json` et `/tmp/kara-admin-login-performance-after.json`.
