# Audit de la section `/credit-speciale/contrats`

> Cette note reprend l’état actuel de la gestion des contrats de crédit spéciale dans l’app (listage, détail, paiements, pénalités, mois de repos) pour identifier ce qui tourne aujourd’hui dans le code avant une refonte.

## 1. Objectif
- Comprendre la stack front/back qui alimente `/credit-speciale/contrats` et `/credit-speciale/contrats/[id]` (page list + détail). 
- Documenter les calculs qui gouvernent les échéanciers, les mois de repos et les pénalités pour repérer les points de friction signalés sur les contrats MK_CSP_…. 
- Avoir un point d’entrée unique dans la documentation pour désigner la logique actuelle avant de réécrire la partie simulateur/versements.

## 2. Pages & composants

### 2.1. Liste des contrats
- La page `src/app/(admin)/credit-speciale/contrats/page.tsx:1` sérialise `ListContrats` avec un fallback visuel (squelette) pendant la résolution des données.
- `ListContrats` (`src/components/credit-speciale/ListContrats.tsx:252`) : tableaux vs cartes, stats (via `StatisticsCreditContrats`), filtres, pagination, sélection d’un contrat, modals pour générer un PDF, remplacer un contrat signé, supprimer, imprimer un bordereau… Le composant appelle `useCreditContracts`, `useCreditContractsStats`, `useCreditContractMutations` et `useUnpaidCreditPenaltiesByCreditId` pour afficher l’état ici/maintenant.
- Les filtres prennent en charge le type de crédit (spéciale/fixe/aide), le statut et la recherche libre ; la vue peut basculer entre grille et liste, ce qui multiplie les zones de code entre les cartes, les badges d’état et les menus d’actions.

### 2.2. Détail d’un contrat
- La route `/credit-speciale/contrats/[id]` utilise `app/(admin)/credit-speciale/contrats/[id]/page.tsx:1` pour charger `CreditContractDetail` via `useCreditContract`.
- `CreditContractDetail` (`src/components/credit-speciale/CreditContractDetail.tsx:250`) chevauche trois crédits (`SPECIALE`, `FIXE`, `AIDE`) et bifurque avec `isSimpleCredit = contract.creditType === 'FIXE' || contract.creditType === 'AIDE'`.
- L’onglet principal regroupe : résumé (statuts, dates, soldes, journaux), onglet échéancier, onglet pénalités, onglet garant. Les modals disponibles : paiement (`CreditPaymentModal`), mois de repos (`RestMonthModal`), payement final, quittance, extension, PDF, versements du garant.
- Le détail expose plusieurs calculs (échéancier théorique, échéancier réel, référence 7 mois, taux de perte) pour répondre aux questions métier du service client.

## 3. Architecture & flux de données

### 3.1. Hooks ↔ Services
- `useCreditSpeciale.ts:1` enveloppe `ServiceFactory.getCreditSpecialeService()` pour toutes les requêtes (demandes, contrats, paiements, pénalités, garanties). Les `useQuery`/`useMutation` sont déclarés dans ce fichier et exportés vers les composants.
- `ServiceFactory` (`src/factories/ServiceFactory.ts:178`) instancie `CreditSpecialeService` en singleton, ce qui permet de retrouver les appels dans le backend partagé.
- `ICreditSpecialeService` (`src/services/credit-speciale/ICreditSpecialeService.ts:1`) liste toutes les opérations attendues : contrats, paiements, simulations, pénalités, rémunérations, clôture, etc. On y voit en particulier `recordRestMonth`, `createPayment`, `calculateStandardSimulation`, `checkAndCreateMissingPenalties`.

### 3.2. Données métier
- `CreditContract` (`src/types/types.ts:1504`) porte les propriétés utilisées par l’UI : `creditType`, `amount`, `interestRate`, `monthlyPaymentAmount`, `totalAmount`, `duration`, `status`, `amountPaid`, `amountRemaining`, `restMonths`, `customSchedule`, `firstPaymentDate`, `guarantor*`.
- Les mois de repos sont typés `RestMonth` (`src/types/types.ts:1534`) : numéro du mois calendaire, motif, admin, date. Le tableau `restMonths` est mis à jour par `CreditSpecialeService.recordRestMonth` (`src/services/credit-speciale/CreditSpecialeService.ts:370`).
- Les statistiques côté liste reposent sur `CreditContractFilters`/`CreditContractStats` (`src/repositories/credit-speciale/ICreditContractRepository.ts`), notamment `byType` et `overdue`.

## 4. Logiques métier actuellement actives

### 4.1. Échéancier théorique vs réel
- `calculateDueItems` (`src/components/credit-speciale/CreditContractDetail.tsx:576`) reconstruit un échéancier mois par mois avec :
  1. Détection des mois de repos (`isRestMonth`) et affichage comme lignes `status='REST'`.
  2. Calcul de `montantGlobal = resteDuPrecedent + intérêts` (le taux mensuel est `interestRate / 100`).
  3. Application soit de l’échéance personnalisée (`customSchedule`), soit de la mensualité par défaut.
  4. Statuts `PAID`, `DUE`, `FUTURE` basés sur les paiements connus (`paymentsByMonthMap`).
- `calculateActualSchedule` (`src/components/credit-speciale/CreditContractDetail.tsx:873`) recalcule un autre jeu de lignes en intégrant les paiements réellement enregistrés pour afficher le calendrier complet (utilisé par les cartes de l’onglet échéancier).
- La référence 7 mois (sans pénalités) se construit via `calculateReferenceSchedule` (`src/components/credit-speciale/CreditContractDetail.tsx:1201`) : intérêt composé pendant 7 mois puis division en mensualités égales.

### 4.2. Mois de repos et mois logique
- `isRestMonth`, `getLogicalMonthIndex`, `isAfterLogicalMonth7` (`src/utils/credit-speciale-rest-months.ts:11`) gèrent la « règle des 7 mois sans intérêts » : un mois calendaire peut être marqué comme repos sans intérêts, mais la logique doit alors ajuster ses index logiques.
- Ces utils sont invoqués à chaque boucle d’échéancier (`calculateDueItems`), mais la même logique n’est pas reprise dans `CreditSpecialeService.createPayment` ou dans la génération des pénalités, ce qui crée des zones de désynchronisation.

### 4.3. Règles de pénalités
- `checkAndCreatePenalties` (`src/services/credit-speciale/CreditSpecialeService.ts:1767`) est déclenché après chaque paiement actif (hors 0 FCFA). Elle :
  1. Ignore les paiements antérieurs au `newPenaltyLogicStartDate` (16/12/2025) et les mois de repos.
  2. Calcule `daysLate` en soustrayant la date attendue (`firstPaymentDate + monthNumber - 1`) de la date réelle.
  3. Respecte une tolérance de 3 jours, puis applique la règle de trois `(daysLate * montantDeLechéance)/30`.
  4. Cherche une pénalité existante sur la même échéance et la crée via `createPenalty` (`src/services/credit-speciale/CreditSpecialeService.ts:2265`) si nécessaire.
  5. La création s’arrête pour toute date précédant le 16/12/2025 (bascule de logique). Ce garde-fou est codé en dur et ne supporte pas un horizon rétroactif.
- Une fonction sœur `calculatePenalties` (`src/services/credit-speciale/CreditSpecialeService.ts:2022`) expose la même règle de trois pour d’autres usages. L’ajout de pénalités est donc entièrement couplé à la recomputation du montant d’échéance, pas à un suivi d’`installment` séparé.

### 4.4. Paiements, restes et garanties
- `createPayment` (`src/services/credit-speciale/CreditSpecialeService.ts:1012`) :
  - Reconstruit le solde en triant les paiements existants et en appliquant un intérêt mensuel constant.
  - Génère l’`id` `M{mois}_{creditId}` pour récupérer le mois, mais ce calcul ne tient pas compte des mois de repos (le `monthNumber` est dérivé de la date ou d’un `installmentNumber` optionnel).
  - Affecte d’abord les intérêts, puis le principal (sauf pour `FIXE`/`AIDE` où tout part dans le capital).
  - Actualise le statut du contrat (`PARTIAL`, `DISCHARGED`, `TRANSFORMED`) à partir de `totalRemaining`.
  - Déclenche la création des pénalités (`checkAndCreatePenalties`) et met à jour le score du client.
  - Lance la rémunération du garant pour les 7 premiers mois avec `calculateSchedule` (`src/services/credit-speciale/CreditSpecialeService.ts:1341`).
- Les paiements publiés sur l’UI (`CreditContractDetail`) utilisent ce même `totalRemaining` + `amountPaid` pour afficher les soldes.

### 4.5. Simulations et PDF
- Le calcul des échéances fixe depuis l’UI repose aussi sur `calculateSchedule` (`src/utils/credit-speciale-calculations.ts:57`), notamment pour :
  - Les exports PDF (`CreditSpecialeContractPDF.tsx:1`).
  - La simulation « référence » affichée dans l’onglet échéancier et dans les modals (les montants calculés ne sont pas réutilisés côté service).
- `CreditSpecialeService.createContractFromDemand` et `calculateStandardSimulation` utilisent indirectement `CreditFixeSimulationService` (`src/domains/financial/credit-speciale/fixe/simulation/components/…`).

## 5. Points de friction identifiés
- **Duplication des calculs d’échéancier** : `calculateDueItems` (UI), `calculateActualSchedule`, `calculateReferenceSchedule`, `CreditSpecialeService.createPayment` et `calculateSchedule` recomputent chacun leur côté la progression des mensualités et des restants (`src/components/credit-speciale/CreditContractDetail.tsx:576`, `:873`, `:1201`, `src/services/credit-speciale/CreditSpecialeService.ts:1012`, `src/utils/credit-speciale-calculations.ts:57`). Le moindre changement de règle doit être répercuté à plusieurs niveaux, d’où les conflits constatés entre simulation et versements.
- **Mois de repos pas propagés** : la logique `isRestMonth` (`src/utils/credit-speciale-rest-months.ts:11`) n’est pas partagée par `createPayment` ni `checkAndCreatePenalties`, donc un paiement réalisé après un mois de repos conserve la numérotation calendaire et peut générer une pénalité sur une échéance qui n’existe plus.
- **Limitation des 7 mois** : `calculateReferenceSchedule` part toujours d’un intérêt composé sur 7 mois puis divise en mensualités, mais les revenus effectifs (avec `restMonths`, `customSchedule`, prolongations) peuvent dépasser ou sauter certains mois. À la clé, les tableaux de simulation et les pénalités/montants versés ne sont pas synchronisés (`src/components/credit-speciale/CreditContractDetail.tsx:1201`, `src/services/credit-speciale/CreditSpecialeService.ts:1767`).
- **Hard-code temps** : la date `16 décembre 2025` est le point de bascule pour `checkAndCreatePenalties` (`src/services/credit-speciale/CreditSpecialeService.ts:1803`) et `createPenalty` (`src/services/credit-speciale/CreditSpecialeService.ts:2265`), donc aucune logique rétroactive (ni test) n’existe pour les contrats antérieurs.
- **Restitution du mois de repos** : `recordRestMonth` se contente d’ajouter l’entrée dans `restMonths` sans contraindre le calendrier (tri, mensualités personnalisées). Le UI ne vérifie pas non plus qu’un contrat n’a pas déjà atteint sa durée (contrôle uniquement côté formulaire).

## 6. Prochaines étapes suggérées
1. **Réduire la duplication** : extraire une couche commune (calculateur unique) qui sert à la fois à l’UI et au service avant de refondre les échéanciers.
2. **Normaliser les mois (repos + logique des 7 mois)** afin que `createPayment`, `checkAndCreatePenalties`, `calculateDueItems` et les exports PDF utilisent la même notion de « mois logique ». Ce point est critique pour les colonnes affichées sur `/credit-speciale/contrats/MK_CSP_9143_…`.
3. **Documenter les règles métier critiques** (tolérance 3 jours, pénalités → règle de 3, mois de repos n’acquièrent pas d’intérêts après M7, garantie payée max 7 mois) dans un même dossier /audit-contrats pour servir de référence pendant la refonte.

---

Le dossier `documentation/credit-speciale/audit-contrats` est prêt pour y ajouter d’autres fichiers (ex. tickets de refonte, simulations chiffrées, listes de tests) une fois que les points prioritaires ont été clarifiés.
