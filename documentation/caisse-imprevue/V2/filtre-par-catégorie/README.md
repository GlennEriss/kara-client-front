# Filtre par catégorie des contrats - Caisse Imprévue V2 (Architecture Domains)

> Documentation de la fonctionnalité **Filtrer les contrats par catégorie (forfait)** sur la page `http://localhost:3000/caisse-imprevue`.
> **Statut :** documentation uniquement (implémentation à valider puis développer).
> **Règle d'architecture :** implémentation **domains-first** obligatoire.

---

## Sommaire

- [1. Objectif](#1-objectif)
- [2. Définition de "catégorie"](#2-définition-de-catégorie)
- [3. Règles UX et comportement attendu](#3-règles-ux-et-comportement-attendu)
- [4. Architecture Domains (obligatoire)](#4-architecture-domains-obligatoire)
- [5. Requêtes Firestore et index](#5-requêtes-firestore-et-index)
- [6. Liste des tâches](#6-liste-des-tâches)
- [7. Tests à prévoir](#7-tests-à-prévoir)
- [8. Critères d'acceptation](#8-critères-dacceptation)
- [9. Références code](#9-références-code)

---

## 1. Objectif

Permettre à l'administrateur de filtrer la liste des contrats CI par **catégorie de contrat** (forfait), en plus des filtres existants :

- recherche textuelle
- statut du contrat
- type de contrat (fréquence `DAILY` / `MONTHLY`)
- onglets (`Tous`, `Journalier`, `Mensuel`, `Mois en cours`, `Retard`)

Le filtre doit être combinable avec les autres filtres existants.

---

## 2. Définition de "catégorie"

Dans ce contexte, la catégorie d'un contrat correspond au **forfait CI** associé :

- `subscriptionCIID` (clé technique pour filtrer côté Firestore)
- `subscriptionCICode` et `subscriptionCILabel` (affichage UI)

Important : ce filtre est **distinct** du filtre "Type de contrat" (`paymentFrequency`).

---

## 3. Règles UX et comportement attendu

### 3.1 Champ de filtre à ajouter

Ajouter un select "Catégorie" dans la zone de filtres de la page contrats :

- option par défaut : `Toutes les catégories`
- options dynamiques : forfaits actifs (`subscriptionsCI`)
- label affiché : `label` si présent, sinon `code`
- valeur transmise au filtre : `subscriptionCIID`

### 3.2 Combinaison avec les autres filtres

Le filtre catégorie doit fonctionner avec :

- `status` (`ACTIVE`, `FINISHED`, `CANCELED`, `all`)
- `paymentFrequency` (déduit des onglets ou select "Type de contrat")
- `search` (filtre client existant)
- `overdueOnly` (onglet "Retard")

### 3.3 Réinitialisation

Le bouton "Réinitialiser" doit remettre la catégorie à "toutes" (donc `subscriptionCIID` non défini).

### 3.4 Pagination

Quand la catégorie change :

- reset page à `1`
- relancer le chargement avec la nouvelle clé React Query

---

## 4. Architecture Domains (obligatoire)

### 4.1 Règle de migration

Toute nouvelle logique de filtre catégorie doit être implémentée dans :

- `src/domains/financial/caisse-imprevue/...`

et non dans les anciens chemins `src/components/caisse-imprevue`, `src/hooks/caisse-imprevue`, `src/repositories/caisse-imprevu` (sauf adaptateur transitoire).

### 4.2 Arborescence cible

```text
src/domains/financial/caisse-imprevue/
├── entities/
│   ├── contract-filters.types.ts              # Nouveau
│   └── contract-list.types.ts                 # Optionnel si besoin de types paginés
├── repositories/
│   ├── IContractCIRepository.ts               # Nouveau (interface domain)
│   ├── ContractCIRepository.ts                # Nouveau (implémentation domain)
│   └── index.ts                               # Export à compléter
├── services/
│   ├── CaisseImprevueContractsService.ts      # Nouveau (service contrat/liste)
│   └── index.ts                               # Export à compléter
├── hooks/
│   ├── useContractsCI.ts                      # Nouveau (query list + stats)
│   └── index.ts                               # Export à compléter
└── components/
    └── contracts/
        ├── ListContractsCIV2.tsx              # Nouveau container page
        └── filters/
            └── ContractsFiltersV2.tsx         # Nouveau filtre UI
```

### 4.3 Entités (domains)

**Fichier** : `src/domains/financial/caisse-imprevue/entities/contract-filters.types.ts` (nouveau)

Ajouter :

```ts
export interface ContractCIFilters {
  search?: string
  status?: 'ACTIVE' | 'FINISHED' | 'CANCELED' | 'all'
  paymentFrequency?: 'DAILY' | 'MONTHLY' | 'all'
  subscriptionCIID?: string
  overdueOnly?: boolean
}
```

### 4.4 Repository (domains)

**Fichiers** :

- `src/domains/financial/caisse-imprevue/repositories/IContractCIRepository.ts` (nouveau)
- `src/domains/financial/caisse-imprevue/repositories/ContractCIRepository.ts` (nouveau)

Comportement attendu dans `getContractsWithFilters(filters)` :

```ts
if (filters?.subscriptionCIID) {
  constraints.push(where('subscriptionCIID', '==', filters.subscriptionCIID))
}
```

Note transitoire : l'implémentation domain peut déléguer au repository legacy via `RepositoryFactory.getContractCIRepository()` pendant la migration, mais le point d'entrée consommé par l'UI doit rester `domains`.

### 4.5 Service (domains)

**Fichier** : `src/domains/financial/caisse-imprevue/services/CaisseImprevueContractsService.ts` (nouveau)

Responsabilités :

- orchestrer repository contrats
- exposer `getContractsWithFilters(filters)`
- exposer `getContractsStats(filters)`
- conserver les règles métier de filtrage et de pagination

### 4.6 Hooks (domains)

**Fichier** : `src/domains/financial/caisse-imprevue/hooks/useContractsCI.ts` (nouveau)

Responsabilités :

- `useContractsCI(filters)` via service domain
- `useContractsCIStats(filters)` via service domain
- clés React Query dédiées, par exemple :
  - `['caisse-imprevue-contracts', filters]`
  - `['caisse-imprevue-contracts-stats', filters]`

### 4.7 Composants UI (domains)

**Fichiers** :

- `src/domains/financial/caisse-imprevue/components/contracts/ListContractsCIV2.tsx` (nouveau)
- `src/domains/financial/caisse-imprevue/components/contracts/filters/ContractsFiltersV2.tsx` (nouveau)

Règles :

- `ContractsFiltersV2` gère le select catégorie (`subscriptionCIID`)
- les options de catégorie viennent de `useSubscriptionsCICache()` (déjà dans domains)
- `ListContractsCIV2` compose les filtres effectifs et applique reset/pagination

### 4.8 Intégration page admin

**Fichier** : `src/app/(admin)/caisse-imprevue/page.tsx`

Remplacer l'import legacy par le composant domain :

- avant : `@/components/caisse-imprevue/ListContractsCISection`
- après : `@/domains/financial/caisse-imprevue/components/contracts/ListContractsCIV2`

---

## 5. Requêtes Firestore et index

### 5.1 Requête cible

La requête principale reste :

```ts
collection('contractsCI')
where('status', '==', ...)
where('paymentFrequency', '==', ...)
where('subscriptionCIID', '==', ...)
orderBy('createdAt', 'desc')
```

### 5.2 Index existants confirmés

`contractsCI` dispose déjà de :

- `status + createdAt`
- `paymentFrequency + createdAt`
- `status + paymentFrequency + createdAt`
- `subscriptionCIID + createdAt`

### 5.3 Index à ajouter

Pour supporter toutes les combinaisons avec catégorie :

- `subscriptionCIID + status + createdAt`
- `subscriptionCIID + paymentFrequency + createdAt`
- `subscriptionCIID + status + paymentFrequency + createdAt`

---

## 6. Liste des tâches

- [ ] Créer `entities/contract-filters.types.ts` dans `domains`.
- [ ] Créer `repositories/IContractCIRepository.ts` dans `domains`.
- [ ] Créer `repositories/ContractCIRepository.ts` dans `domains` avec filtre `subscriptionCIID`.
- [ ] Exporter le nouveau repository dans `repositories/index.ts`.
- [ ] Créer `services/CaisseImprevueContractsService.ts`.
- [ ] Exporter le service dans `services/index.ts`.
- [ ] Créer `hooks/useContractsCI.ts` (list + stats).
- [ ] Exporter le hook dans `hooks/index.ts`.
- [ ] Créer `components/contracts/filters/ContractsFiltersV2.tsx`.
- [ ] Créer `components/contracts/ListContractsCIV2.tsx`.
- [ ] Brancher la page `src/app/(admin)/caisse-imprevue/page.tsx` sur le composant domain.
- [ ] Ajouter les index Firestore manquants.

---

## 7. Tests à prévoir

### 7.1 Unitaires (domains/repository)

- retourne uniquement les contrats avec `subscriptionCIID` demandé
- combine correctement `subscriptionCIID + status`
- combine correctement `subscriptionCIID + paymentFrequency`
- combine correctement `subscriptionCIID + status + paymentFrequency`

### 7.2 Intégration (domains/hooks + UI)

- le select catégorie affiche les forfaits actifs
- la sélection d'une catégorie met à jour la liste
- le reset supprime le filtre catégorie
- la catégorie se combine avec le statut et les onglets

### 7.3 E2E

Parcours complet sur `/caisse-imprevue` :

- sélection catégorie A -> seuls contrats A
- passage onglet Mensuel -> intersection catégorie + mensuel
- reset -> retour à la liste non filtrée

---

## 8. Critères d'acceptation

- le filtre catégorie est visible et fonctionnel sur `/caisse-imprevue`
- le filtrage est exact sur `subscriptionCIID`
- les combinaisons de filtres ne cassent pas les requêtes Firestore
- le reset remet bien tous les filtres à l'état initial
- la feature est branchée sur des composants/hooks/services/repositories `domains`

---

## 9. Références code

### 9.1 Cible domains

- `src/domains/financial/caisse-imprevue/hooks/useSubscriptionsCICache.ts`
- `src/domains/financial/caisse-imprevue/hooks/useContractCIMutations.ts`
- `src/domains/financial/caisse-imprevue/services/CaisseImprevueService.ts`
- `src/domains/financial/caisse-imprevue/repositories/index.ts`
- `src/domains/financial/caisse-imprevue/hooks/index.ts`
- `src/domains/financial/caisse-imprevue/services/index.ts`

### 9.2 Legacy à migrer (source actuelle)

- `src/components/caisse-imprevue/ListContractsCISection.tsx`
- `src/components/caisse-imprevue/FiltersCI.tsx`
- `src/hooks/caisse-imprevue/useContractsCI.ts`
- `src/repositories/caisse-imprevu/ContractCIRepository.ts`
- `src/repositories/caisse-imprevu/IContractCIRepository.ts`
- `firestore.indexes.json`
