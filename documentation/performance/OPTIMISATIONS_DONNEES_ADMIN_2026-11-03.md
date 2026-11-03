# Optimisations des lectures admin — 3 novembre 2026

Base de travail : `9b3746a3` (première passe d’allègement du bundle). Cette seconde passe réduit les lectures répétées et le chargement initial des graphiques. Les calculs d’intérêts, de bonus, de pénalités, de manque à gagner et de remise ne sont pas remplacés.

## Calendrier

- **Caisse imprévue :** les périodes visibles sont déterminées avec `getPaymentDueDate`, le même calcul que précédemment. Les contrats sans échéance dans le mois ne déclenchent plus de lecture de paiements. Pour les autres, la requête cible les `monthIndex` utiles. Elle conserve les identifiants historiques, les versements partiels et la construction des échéances sans document. Un mois peut contenir deux fins de cycles quotidiens de 30 jours : les deux sont conservées.
- **Caisse spéciale :** les statuts déjà retenus par le calendrier sont filtrés dans la requête des contrats. Les dates d’échéance enregistrées sont conservées, y compris après décalage ; elles ne sont pas reconstruites à partir de la date initiale du contrat.
- **Crédits :** la requête des contrats cible le type affiché. Le calcul existant de l’échéancier reste utilisé, avec les mêmes paiements, mois de repos et situations de crédit.
- **Placements :** les commissions sont chargées avec une concurrence bornée, dans l’ordre des placements. Les commissions partielles et les restitutions de capital restent agrégées par le calcul existant.
- Le calendrier, les tableaux de retards, de versements à venir et de remises traitent au maximum **six contrats ou placements simultanément par parcours**. Les lectures distinctes nécessaires à un même contrat peuvent rester parallèles. Les listes complètes, leurs tris et les liens vers les contrats/échéances sont conservés.

Sur le jeu de vérification CI de douze paiements, le mois affiché nécessite une lecture d’un document au lieu de douze. Le contrat hors période ne déclenche aucune lecture de paiements. Ce sont des mesures sur fixtures, pas une extrapolation des volumes réels de production.

## Tableau de bord et bilans

`FirestoreReadScope` partage les promesses de lecture **au sein d’une seule requête**. Une collection ou un groupe de sous-collections déjà demandé est lu une fois. Chaque nouvelle requête crée un nouveau scope : aucun résultat financier n’est conservé entre deux demandes.

Cela évite notamment de relire `payments` pour chaque caisse et de relire les mêmes contrats, paiements ou adhésions entre les indicateurs métier et le bilan financier de référence. La séparation des modules reste fondée sur le chemin de leur collection parente, même si deux modules utilisent le même identifiant de contrat ou de paiement. La conversion des dates reste identique.

Nombre d’appels Firestore par calcul du dashboard côté serveur, vérifié par les tests :

| Onglet | Lectures indépendantes | Lectures dédupliquées |
|---|---:|---:|
| Exécutif | 22 | 20 |
| Caisse spéciale | 19 | 16 |
| Caisse imprévue | 19 | 16 |
| Chaque onglet crédit | 20 | 16 |
| Placements | 19 | 16 |

Il s’agit d’appels de requêtes, pas du nombre de documents lus ou facturés. Les sources nécessaires aux bilans restent complètes. Une erreur de lecture requise est propagée ; elle ne devient pas un bilan partiel mis en cache.

## Contrats CI, pagination et exports

- Les requêtes compatibles avec une pagination Firestore chargent quatorze lignes et un comptage agrégé. Le tri par création, ses ex æquo, les curseurs et les arrivées directes par URL sont vérifiés contre le repository historique.
- Les recherches dans les noms, les retards, les retraits anticipés, les prochaines échéances et les métriques de sous-collections restent filtrés sur l’ensemble des résultats **avant** le découpage en pages. Le résultat complet est réutilisé entre pages selon le cache et les invalidations existants. Le parcours des contrats ouverts sans statut explicite garde aussi son comportement historique pour les éventuels statuts manquants.
- Le changement de filtre n’affiche pas provisoirement les personnes de l’ancien filtre. Le bouton « Actualiser » force aussi la relecture des filtres calculés.
- Les exports Excel et PDF récupèrent tous les contrats correspondant aux filtres et à l’onglet. Ils ne se limitent pas à la page courante ; un échec de la lecture principale remonte jusqu’à l’action d’export au lieu de générer un fichier vide.
- La répartition par fréquence utilise la lecture déjà nécessaire aux statistiques, au lieu de charger une autre liste complète. Le calcul existant du montant global est conservé.

Les statistiques globales et l’abonnement temps réel de la liste conservent leur périmètre global. La pagination ne signifie donc pas que tout l’écran ne lit que quatorze documents.

## Synchronisation et graphiques

Les abonnements CI ont chacun leur propre premier événement, réinitialisé lors d’un changement de contrat. Les invalidations sont regroupées et dédupliquées ; les paiements et aides invalident leurs données dépendantes. Les abonnements et minuteries de l’ancien contrat sont nettoyés lors de la navigation.

Les graphiques du dashboard et des statistiques CI sont importés à l’approche de la zone visible. L’emplacement est réservé pendant le chargement, et les valeurs et légendes restent affichées. Les formats, couleurs et adaptations mobiles sont conservés.

| Écran | Avant cette passe, JS gzip | Après, JS gzip |
|---|---:|---:|
| Tableau de bord | 526 Ko | 420 Ko |
| Liste des contrats CI | 691 Ko | 592 Ko |

Mesure à cache froid de l’union des fichiers JavaScript de la page et de ses layouts, dédupliqués. Les imports différés sont exclus du poids initial ; leur coût existe lorsqu’un graphique est affiché. Commande reproductible après compilation : `npm run analyze:bundle`.

## Validation

- **193 tests ciblés réussis**, dont 186 dans la suite calendrier, dashboard, filtres, bilans et remboursements, plus sept tests sur les pertes et le manque à gagner.
- Parité des réponses des douze onglets du dashboard avec des lectures indépendantes, filtres de zone compris ; nouvelles lectures après modification des données entre deux requêtes.
- Pagination comparée à la liste historique sur 75 contrats, dates identiques comprises ; filtres calculés et exports complets vérifiés.
- Comparaison des tableaux de retards, versements à venir et remises entre l’ancien ordonnancement simultané et le nouvel ordonnancement borné, sur les mêmes données et à la même date.
- Contrôle navigateur des composants graphiques réels, sur fixtures isolées, avec les styles compilés : 1 440 × 900 et 390 × 844, aucun débordement horizontal ni erreur JavaScript non interceptée. Les trois graphiques restent non montés hors écran, puis apparaissent lors du défilement. Captures inspectées visuellement.
- Build de production et TypeScript validés. ESLint ciblé : aucune erreur, huit avertissements legacy dans les fichiers concernés.

Un test de verrouillage préexistant attendait à tort qu’un contrat `FINAL_REFUND_PENDING` soit modifiable. Le code de la base de travail le verrouillait déjà. Le test a été aligné sur cette règle et étendu aux autres statuts de remise en attente ; le verrouillage de production n’a pas été modifié.

## Limites de mesure et état

Les comparaisons de données utilisent des fixtures et des doubles de requêtes Firestore. Le contrôle navigateur concerne des composants isolés, sans écriture ni connexion à une base réelle. Les temps de réponse des parcours authentifiés en production n’ont pas été chronométrés.

Les lectures globales nécessaires aux bilans restent présentes. Les optimisations portent sur les doublons, les périodes inutiles, la pagination applicable et le chargement du code ; elles ne remplacent pas les sources financières par des estimations.

Aucune migration, modification de règles ou écriture en base n’a été nécessaire. Les vérifications ont été réalisées localement, sans déploiement.
