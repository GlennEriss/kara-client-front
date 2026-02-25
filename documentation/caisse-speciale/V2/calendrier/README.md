# Amélioration du calendrier des versements (caisse spéciale)

**Contexte :** Calendrier affiché sur la page détail d’un contrat caisse spéciale (journalier / journalier charitable) à l’URL `/caisse-speciale/contrats/[id]`. Il permet de voir par jour les statuts « Versé », « À venir », « À verser (passé) », « Non disponible », « Aujourd’hui » et d’enregistrer un versement en cliquant sur un jour.

**Problème rapporté :** Un versement enregistré sur un jour s’affiche correctement (« Versé »), puis disparaît après un moment (le jour repasse en « À venir » ou « À verser »).

---

## 1. Comment le calendrier est fait aujourd’hui

### 1.1 Emplacement dans le code

| Élément | Fichier / ressource |
|--------|----------------------|
| Page détail contrat | `src/app/(admin)/caisse-speciale/contrats/[id]/page.tsx` |
| Composant avec le calendrier | `src/components/contract/DailyContract.tsx` (contrats JOURNALIERE / JOURNALIERE_CHARITABLE) |
| Données contrat + versements | Hook `useCaisseContract(id)` dans `src/hooks/useCaisseContracts.ts` |
| Lecture contrat + calcul état | `src/services/caisse/readers.ts` → `getContractWithComputedState(contractId)` |
| Liste des paiements | `src/db/caisse/payments.db.ts` → `listPayments(contractId)` |
| Enregistrement versement | `src/services/caisse/mutations.ts` → `pay()` ou `payGroup()` |

### 1.2 Flux de données

1. **Chargement**
   - `DailyContract` appelle `useCaisseContract(id)` (React Query, clé `['caisse-contract', contractId]`).
   - La `queryFn` exécute `getContractWithComputedState(contractId)` :
     - `getContract(contractId)`
     - `listPayments(contractId)` (sous-collection Firestore `caisseContracts/{id}/payments`)
     - `listRefunds(contractId)`
     - calcul du statut et de `nextDueAt`
     - **écriture** `updateContract(contractId, { status, nextDueAt })`
   - Le résultat (dont `data.payments`) est mis en cache React Query.

2. **Affichage du calendrier**
   - Les jours du mois sont dérivés dans le rendu (pas de composant calendrier dédié).
   - Pour chaque jour, `getPaymentForDate(date)` est appelé :
     - Calcul de `monthIndex` via `getMonthIndexFromStart(date)` (périodes de 30 jours pour journalier).
     - Recherche dans `data.payments` du paiement avec `dueMonthIndex === monthIndex`.
     - Pour les contrats individuels : vérification que `payment.contribs` contient au moins une contribution dont `paidAt` (normalisé à la date) correspond au jour.
     - Pour les contrats de groupe : logique similaire sur `groupContributions` / `createdAt`.
   - Le statut du jour (Versé / À venir / À verser / Non disponible / Aujourd’hui) est dérivé de la présence d’un paiement et de la date.

3. **Après enregistrement d’un versement**
   - `onPaymentSubmit` appelle `pay()` ou `payGroup()` (écriture Firestore).
   - Puis `await refetch()` sur le résultat de `useCaisseContract(id)`.
   - Aucune invalidation explicite de la clé `['caisse-contract', id]` dans la couche mutation (`pay` / `payGroup`).
   - Aucune mise à jour optimiste : l’UI ne change qu’après le refetch.

### 1.3 Design actuel (résumé)

- **Pas de composant Calendrier réutilisable :** la grille et la logique sont intégrées dans `DailyContract`.
- **Source de vérité unique :** `data` (contrat + `payments`) fourni par React Query.
- **Dérivation au rendu :** `getPaymentForDate` et le style de chaque cellule sont calculés à chaque rendu à partir de `data.payments` et des dates.
- **Synchronisation après écriture :** uniquement via `refetch()` après `pay()` / `payGroup()`.

---

## 2. Défauts identifiés

### 2.1 Instabilité / disparition du versement

- **Cause probable 1 – Race refetch / Firestore**  
  Après `pay()`, le `refetch()` lance immédiatement `getContractWithComputedState` → `listPayments()`. Si la lecture Firestore s’effectue avant que le nouveau document (paiement ou contribution) soit visible (réplication / latence), la réponse ne contient pas le nouveau versement. L’UI affiche alors à nouveau l’ancien état (jour non « Versé »). Comportement typique en « read-after-write » sans délai ni retry.

- **Cause probable 2 – Pas d’invalidation centralisée**  
  Les mutations `pay` / `payGroup` n’invalident pas la clé `['caisse-contract', contractId]`. Seul le `refetch()` dans le composant met à jour les données. Si un autre refetch (ex. `refetchOnMount: 'always'`) ou une autre source lit des données encore stales, l’affichage peut revenir à l’ancien état.

- **Cause probable 3 – Écriture dans le reader**  
  `getContractWithComputedState` appelle `updateContract(contractId, { status, nextDueAt })` à chaque lecture. En cas d’appels multiples ou de refetchs rapprochés, cela peut introduire des races ou des états incohérents par rapport aux paiements venant d’être créés.

### 2.2 Bonnes pratiques React / données

- **Pas de mise à jour optimiste :** l’utilisateur peut avoir l’impression que le versement « saute » si le refetch renvoie des données sans le nouveau paiement (cf. ci-dessus).
- **État dérivé en rendu mais logique lourde :** `getPaymentForDate` et la logique jour (contribs, groupe, 30 jours) sont dans un gros composant ; pas de mémoïsation ciblée des calculs par jour (risque de rendus coûteux si `data` ou `currentMonth` changent souvent).
- **Dépendance implicite à la structure Firestore :** normalisation des `paidAt` (Date / Timestamp / string) répétée dans plusieurs branches (contrat individuel / groupe) ; toute évolution du schéma peut casser l’affichage.
- **Pas de déduplication des requêtes côté mutation :** après un `pay()`, seul le composant qui appelle `refetch()` voit la mise à jour ; les autres utilisateurs de `useCaisseContract(id)` (ou d’autres onglets) ne sont pas invalidés automatiquement.

### 2.3 Maintenabilité et design

- **Composant monolithique :** `DailyContract` gère à la fois en-tête, stats, calendrier, modales de paiement, remboursements, etc. Le calendrier n’est pas isolé, ce qui complique les tests et les évolutions.
- **Duplication de logique :** `DailyCIContract` (caisse imprévue) a une grille de calendrier et une logique de type « getPaymentForDate » similaire ; pas de partage avec la caisse spéciale.
- **Pas de couche « calendrier » dédiée :** pas de hook du type `useContractCalendar(contractId, currentMonth)` qui exposerait uniquement les jours avec leur statut, ce qui rendrait les tests et un futur remplacement plus simples.

---

## 3. Contraintes et difficultés

### 3.1 Contraintes métier

- **Périodes de 30 jours (journalier) :** l’index de mois `dueMonthIndex` et les plages de dates doivent rester cohérents avec le moteur actuel (`getMonthIndexFromStart`, `getMonthDateRange`).
- **Contrats de groupe vs individuels :** un jour « Versé » pour un groupe peut reposer sur `groupContributions` (plusieurs membres) ; la logique ne doit pas régresser.
- **Légende et accessibilité :** conserver les mêmes états (Versé, À verser (passé), À venir, Non disponible, Aujourd’hui) et la même lisibilité pour les utilisateurs.

### 3.2 Contraintes techniques

- **Firestore :** lecture après écriture peut être légèrement retardée ; pas de transaction multi-document côté front pour « attendre » la visibilité du nouveau paiement.
- **Double source de hooks :** la page détail utilise `useCaisseContract` depuis `@/hooks/useCaisseContracts.ts` (lecture via `getContractWithComputedState`), alors que le domaine `src/domains/financial/caisse-speciale/contrats/hooks` expose aussi un `useCaisseContract` (autre queryFn / autre source). Risque de confusion et de clés différentes selon les endroits.
- **Reader qui écrit :** `getContractWithComputedState` fait un `updateContract` à chaque appel ; à terme, il serait préférable de séparer lecture et mise à jour du statut/nextDueAt (ex. côté Cloud Function ou job, ou endpoint dédié).

### 3.3 Cassures à éviter lors d’un remplacement

- **URL et entrée :** la page reste `/caisse-speciale/contrats/[id]` avec le même choix Standard / Daily / Free selon `caisseType`.
- **Comportement au clic :** clic sur un jour (dans la plage autorisée) ouvre soit le détail du versement existant, soit le formulaire d’enregistrement d’un nouveau versement ; ce flux doit être conservé.
- **Résumé mensuel sous le calendrier :** les cartes « Mois 1 », « Mois 2 », etc. (objectif, versé, progression) dépendent de `data.payments` et des mêmes helpers (`getTotalForMonth`, `getMonthStatus`, `getMonthDateRange`) ; toute refonte du calendrier doit préserver ces sorties ou les alimenter à partir de la même source.
- **Modales et formulaires :** le modal de paiement et celui de détail de versement s’appuient sur `selectedDate`, `paymentDetails`, `getPaymentForDate` / données du contrat ; l’API interne (props, callbacks) peut être simplifiée mais pas le comportement fonctionnel.

---

## 4. Propositions d’amélioration

### 4.1 Stabiliser l’affichage (court terme)

- **Invalidation après mutation :** dans `pay()` et `payGroup()` (ou dans un hook de mutation qui les enveloppe), après succès, appeler `queryClient.invalidateQueries({ queryKey: ['caisse-contract', contractId] })` pour forcer une relecture cohérente partout où ce contrat est utilisé.
- **Retry ou délai léger sur refetch :** après `pay()` / `payGroup()`, soit relancer un refetch après un court délai (ex. 300–500 ms) si la première réponse n’inclut pas encore le nouveau versement, soit utiliser une stratégie « refetch avec retry » (ex. 2 tentatives espacées) pour limiter l’effet « disparition ».
- **Optimistic update (optionnel) :** après succès de `pay()` / `payGroup()`, mettre à jour le cache React Query avec une version du contrat où le paiement concerné inclut déjà la nouvelle contribution (même structure que celle retournée par `listPayments`), pour que le calendrier affiche « Versé » immédiatement même si un refetch ultérieur est encore stale une fois.

### 4.2 Aligner avec les bonnes pratiques React / données

- **Dérivation au rendu :** garder le principe « pas d’état local pour les données serveur », mais mémoïser les calculs coûteux (ex. `useMemo` sur la liste des jours avec statut pour le mois courant, dépendances `[data?.payments, currentMonth, contractStartDate, caisseType]`) pour éviter de recalculer à chaque rendu.
- **Un seul reader sans écriture systématique :** à terme, déplacer la mise à jour `status` / `nextDueAt` hors de `getContractWithComputedState` (ex. déclenchée par une Cloud Function après écriture d’un paiement, ou endpoint dédié), pour que la lecture soit idempotente et prévisible.
- **Déduplication / SWR :** le hook `useCaisseContract` a déjà `refetchOnMount: 'always'` ; combiner avec une invalidation explicite après mutation pour que tous les consommateurs du même contrat voient la même donnée à jour.

### 4.3 Meilleur design pattern pour le calendrier

- **Extraire un composant « Calendrier » réutilisable :**
  - Props : `month: Date`, `daysWithStatus: { date: Date; status: 'paid' | 'due' | 'upcoming' | 'unavailable' | 'today'; payment?: Payment }[]`, `onDayClick: (date: Date) => void`, `isLoading?: boolean`.
  - Responsabilité unique : afficher la grille, la légende et déléguer les clics. Pas d’appel Firestore ni de `pay()` dans ce composant.
- **Hook dédié `useContractCalendar(contractId, currentMonth)` :**
  - Utilise `useCaisseContract(contractId)` en interne.
  - Expose : `daysWithStatus`, `isLoading`, `error`, `refetch`, et les helpers nécessaires (`getPaymentForDate`, `onDateClick` pré-rempli) pour que `DailyContract` (ou une page) n’ait plus à porter la logique de calcul des jours.
  - Centralise la logique « monthIndex / 30 jours / contribs / groupe » et la normalisation des dates (Timestamp / Date / string).
- **Mutations avec invalidation :**
  - Créer (ou réutiliser) un hook `useRecordPayment()` qui appelle `pay()` / `payGroup()`, puis invalide `['caisse-contract', contractId]` (et éventuellement `['caisse-contracts']`) en `onSuccess`. Les composants qui utilisent `useCaisseContract` ou `useContractCalendar` se mettent à jour sans refetch manuel.
- **Optionnel – Optimistic update :**
  - Dans `useRecordPayment()`, après succès, faire un `setQueryData` sur `['caisse-contract', contractId]` en fusionnant le nouveau paiement/contribution dans la liste existante, avec le même format que `getContractWithComputedState`, pour éviter tout flash « Versé → À venir » si le refetch suivant est encore stale.

---

## 5. Intégration d’un nouveau calendrier en conservant les fonctionnalités

Pour introduire un « nouveau » calendrier (composant + hook) sans perdre les fonctionnalités actuelles :

1. **Définir l’interface du hook**  
   `useContractCalendar(contractId, currentMonth)` retourne au minimum :  
   `{ daysWithStatus, isLoading, error, refetch, getPaymentForDate, onDateClick }` avec `daysWithStatus` prêt pour la grille (date + statut + payment optionnel).

2. **Extraire la grille en composant**  
   `ContractCalendarGrid({ month, daysWithStatus, onDayClick, legend })` : uniquement affichage + clics. Tester ce composant avec des données mock (jours versés / à venir / à verser).

3. **Remplacer progressivement dans `DailyContract`**  
   - Remplacer l’appel direct à `useCaisseContract(id)` par `useContractCalendar(id, currentMonth)` pour la partie calendrier, ou garder `useCaisseContract` et alimenter le hook calendrier avec `data`.
   - Remplacer la grille inline par `<ContractCalendarGrid ... />` en lui passant les sorties du hook.
   - Conserver les modales et formulaires existants ; ils continuent d’utiliser `selectedDate`, `paymentDetails`, et les callbacks actuels (éventuellement fournis par le hook calendrier).

4. **Mutations**  
   - S’assurer que chaque enregistrement de versement (depuis le modal) appelle une mutation qui invalide `['caisse-contract', contractId]` (et retry/délai si besoin).
   - Optionnel : ajouter une mise à jour optimiste du cache pour le jour concerné.

5. **Résumé mensuel**  
   - Continuer à utiliser `data.payments` (toujours fourni par `useCaisseContract` ou par le hook calendrier qui le lit) pour `getTotalForMonth`, `getMonthStatus`, `getMonthDateRange`, afin de ne pas casser les cartes « Mois 1 », « Mois 2 », etc.

6. **Tests**  
   - Tests unitaires du hook `useContractCalendar` avec des `data.payments` mock (un paiement avec contrib au jour J, pas de contrib, groupe, etc.).
   - Test d’intégration : enregistrer un versement depuis le modal puis vérifier que le jour reste « Versé » après refetch (et après invalidation).

En suivant ce plan, le calendrier devient plus stable (invalidation + optionnel retry/optimistic), plus lisible (composant + hook dédiés) et aligné avec les bonnes pratiques React, tout en conservant les mêmes fonctionnalités et le même ressenti pour l’utilisateur.
