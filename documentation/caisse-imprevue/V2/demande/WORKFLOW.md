# WORKFLOW — Module Demandes Caisse Imprévue V2

> **Objectif** : Implémenter la refonte complète du module Demandes Caisse Imprévue V2 avec architecture domains-based, pagination serveur, cache optimisé, responsive design et exports PDF/Excel.

> **Référence** : Ce workflow suit le template général défini dans `documentation/general/WORKFLOW.md`

---

## 📋 Vue d'ensemble

### Contexte

**Problématique actuelle (V1)** :
- Architecture monolithique avec logique métier dans les composants
- Pagination côté client (limite de performance)
- Pas de cache (requêtes répétées)
- Design non responsive
- Pas d'export PDF/Excel
- Formulaire de création avec problèmes UX
- Pas de traçabilité complète (acceptedBy, rejectedBy, etc.)

**Solution proposée (V2)** :
- Architecture domains-based (DDD)
- Pagination serveur avec cursor-based
- Cache React Query optimisé (liste, recherche, détails, forfaits)
- Design responsive (mobile, tablette, desktop)
- Exports PDF et Excel avec filtres avancés
- Formulaire multi-étapes amélioré avec persistance localStorage
- Traçabilité complète (tous les attributs d'audit)
- ID standardisé : `MK_DEMANDE_CI_{matricule}_{date}_{heure}`

### Use Cases

**Documentation UML** :
- Use cases globaux : `USE_CASES.puml`
- Diagrammes d'activité : `activite/*.puml`
- Diagrammes de séquence : `sequence/SEQ_*.puml`

**Principaux use cases** :
- UC-DEM-001 : Créer une demande (3 étapes)
- UC-DEM-002 : Lister les demandes (pagination serveur, tri, recherche, filtres)
- UC-DEM-003 : Voir les détails d'une demande
- UC-DEM-006 : Accepter une demande
- UC-DEM-007 : Refuser une demande
- UC-DEM-008 : Réouvrir une demande
- UC-DEM-009 : Créer un contrat depuis demande acceptée
- UC-DEM-023 : Exporter les demandes (PDF ou Excel)
- UC-DEM-028 : Exporter détails d'une demande en PDF

---

## 🌿 Branche Git

### Nom de la branche

```bash
feat/caisse-imprevue-demandes-v2
```

**Convention** : `feat/<feature>` pour une nouvelle fonctionnalité majeure

### Création de la branche

```bash
# Depuis develop
git checkout develop
git pull origin develop

# Créer la branche
git checkout -b feat/caisse-imprevue-demandes-v2
```

---

## 📝 Étape 1 — Documentation (Déjà complétée ✅)

### 1.1 Documentation UML

- [x] Use cases globaux documentés (`USE_CASES.puml`)
- [x] Diagrammes d'activité complets (`activite/*.puml`)
- [x] Diagrammes de séquence complets (`sequence/SEQ_*.puml`)

### 1.2 Documentation UI/UX

- [x] Documentation UI complète (`ui/README.md`)
- [x] Design System (`ui/DESIGN_SYSTEM.md`)
- [x] Wireframes complets (`ui/WIREFRAME_*.md`)
- [x] IDs de tests E2E (`tests/DATA_TESTID.md`)

### 1.3 Documentation Technique

- [x] Solutions proposées (`SOLUTIONS_PROPOSEES.md`)
- [x] Critique code et design (`CRITIQUE_CODE_ET_DESIGN.md`)
- [x] Règles Firestore (`firebase/FIRESTORE_RULES.md`)
- [x] Indexes Firestore (`firebase/INDEXES.md`)
- [x] Storage Rules (`firebase/STORAGE_RULES.md`)
- [x] Notifications (`notifications/README.md`)
- [x] Plan de tests (`tests/README.md`)

### 1.4 Documentation principale

- [x] README principal (`README.md`)

**Action** : Vérifier que toute la documentation est à jour avant de commencer l'implémentation.

---

## 🏗️ Étape 2 — Architecture et Structure

### 2.1 Structure des fichiers à créer

```
src/
├── app/(admin)/caisse-imprevue/demandes/
│   ├── page.tsx                    # Liste des demandes
│   ├── add/
│   │   └── page.tsx                # Page création
│   └── [id]/
│       └── page.tsx                # Page détails
│
├── domains/financial/caisse-imprevue/
│   ├── entities/
│   │   ├── demand.types.ts         # Types CaisseImprevueDemand
│   │   ├── subscription.types.ts   # Types SubscriptionCI
│   │   └── demand-filters.types.ts # Types filtres et pagination
│   │
│   ├── repositories/
│   │   ├── DemandCIRepository.ts   # Repository avec pagination serveur
│   │   └── SubscriptionCIRepository.ts # Repository forfaits
│   │
│   ├── services/
│   │   ├── CaisseImprevueService.ts # Service métier
│   │   ├── DemandSimulationService.ts # Service calculs simulation
│   │   └── DemandExportService.ts  # Service exports PDF/Excel
│   │
│   ├── hooks/
│   │   ├── useCaisseImprevueDemands.ts # Hook liste avec cache
│   │   ├── useCaisseImprevueDemandsStats.ts # Hook statistiques
│   │   ├── useDemandDetail.ts      # Hook détails avec cache
│   │   ├── useDemandForm.ts        # Hook formulaire
│   │   ├── useDemandFormPersistence.ts # Hook persistance localStorage
│   │   ├── useSubscriptionsCICache.ts # Hook cache forfaits
│   │   ├── useDemandSimulation.ts  # Hook calculs simulation
│   │   ├── useDemandSearch.ts      # Hook recherche avec cache
│   │   ├── useExportDemands.ts     # Hook export liste
│   │   └── useExportDemandDetails.ts # Hook export détails
│   │
│   ├── components/
│   │   ├── demandes/
│   │   │   ├── ListDemandesV2.tsx   # Liste responsive
│   │   │   ├── DemandCardV2.tsx    # Card responsive
│   │   │   ├── DemandTableV2.tsx    # Table responsive
│   │   │   ├── DemandDetailV2.tsx   # Détails responsive
│   │   │   ├── StatisticsV2.tsx     # Stats
│   │   │   ├── PaymentScheduleTable.tsx # Tableau versements
│   │   │   └── filters/
│   │   │       ├── DemandFiltersV2.tsx # Filtres
│   │   │       ├── DemandSearchV2.tsx  # Recherche
│   │   │       └── DemandSortV2.tsx   # Tri
│   │   │
│   │   ├── forms/
│   │   │   ├── CreateDemandFormV2.tsx # Formulaire multi-étapes
│   │   │   └── steps/
│   │   │       ├── Step1Member.tsx  # Étape 1 : Membre + Motif
│   │   │       ├── Step2Forfait.tsx # Étape 2 : Forfait + Fréquence
│   │   │       └── Step3Contact.tsx # Étape 3 : Contact d'urgence
│   │   │
│   │   ├── modals/
│   │   │   ├── AcceptDemandModalV2.tsx # Modal acceptation
│   │   │   ├── RejectDemandModalV2.tsx # Modal refus
│   │   │   ├── ReopenDemandModalV2.tsx # Modal réouverture
│   │   │   ├── DeleteDemandModalV2.tsx # Modal suppression
│   │   │   ├── EditDemandModalV2.tsx   # Modal édition
│   │   │   ├── ConfirmContractModalV2.tsx # Modal confirmation contrat
│   │   │   └── ExportDemandsModalV2.tsx # Modal export liste
│   │   │
│   │   └── exports/
│   │       └── DemandPDFGenerator.ts  # Générateur PDF
│   │
│   └── schemas/
│       ├── caisse-imprevue.schema.ts # Schemas Zod
│       └── demand-steps.schema.ts   # Schemas par étape
```

### 2.2 Dépendances existantes à utiliser

- **React Query** : `@tanstack/react-query` (cache)
- **Firestore** : `firebase/firestore` (base de données)
- **shadcn/ui** : Composants UI (Dialog, Table, Card, etc.)
- **react-hook-form** : Gestion formulaires
- **Zod** : Validation schémas
- **jsPDF** : Génération PDF
- **xlsx** : Génération Excel
- **date-fns** : Manipulation dates

### 2.3 Architecture respectée

```
┌─────────────────────────────────────────────────────────────┐
│              Pages Next.js (App Router)                      │
│              /caisse-imprevue/demandes                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Components (UI)                                │
│              ListDemandesV2, DemandDetailV2, etc.          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Hooks (React Query)                            │
│              useCaisseImprevueDemands, useDemandDetail, etc.│
│              Cache automatique (staleTime configuré)         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Services (Logique métier)                      │
│              CaisseImprevueService, DemandExportService, etc.│
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Repositories (Accès données)                    │
│              DemandCIRepository, SubscriptionCIRepository  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firestore (Base de données)               │
│                    Collection: caisseImprevueDemands        │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Étape 3 — Implémentation (Phases)

### Phase 1 : Infrastructure et Repository

#### 1.1 Types et Entités

- [ ] Créer `entities/demand.types.ts`
  - [ ] Interface `CaisseImprevueDemand` avec tous les attributs
  - [ ] Types pour statuts, fréquences, etc.
  - [ ] Types pour traçabilité (acceptedBy, rejectedBy, etc.)

- [ ] Créer `entities/demand-filters.types.ts`
  - [ ] Interface `DemandFilters`
  - [ ] Interface `PaginationParams`
  - [ ] Interface `SortParams`

#### 1.2 Repository

- [ ] Créer `repositories/DemandCIRepository.ts`
  - [ ] Méthode `getPaginated()` avec cursor-based pagination
  - [ ] Méthode `getById()` avec cache
  - [ ] Méthode `create()` avec génération ID standardisé
  - [ ] Méthode `update()` avec traçabilité
  - [ ] Méthode `delete()` avec traçabilité pré-suppression
  - [ ] Méthode `search()` pour recherche par nom/prénom
  - [ ] Méthode `getStats()` pour statistiques

- [ ] Créer `repositories/SubscriptionCIRepository.ts` (si nécessaire)
  - [ ] Méthode `getAll()` avec cache

### Phase 2 : Services

#### 2.1 Service métier

- [ ] Créer/Étendre `services/CaisseImprevueService.ts`
  - [ ] Méthode `createDemand()` avec validation
  - [ ] Méthode `acceptDemand()` avec traçabilité
  - [ ] Méthode `rejectDemand()` avec traçabilité
  - [ ] Méthode `reopenDemand()` avec traçabilité
  - [ ] Méthode `updateDemand()` avec traçabilité
  - [ ] Méthode `deleteDemand()` avec traçabilité
  - [ ] Méthode `createContractFromDemand()` avec traçabilité

#### 2.2 Service simulation

- [ ] Créer `services/DemandSimulationService.ts`
  - [ ] Méthode `calculatePaymentSchedule()` (DAILY vs MONTHLY)
  - [ ] Méthode `formatScheduleForDisplay()`

#### 2.3 Service export

- [ ] Créer `services/DemandExportService.ts`
  - [ ] Méthode `exportToPDF()` pour liste
  - [ ] Méthode `exportToExcel()` pour liste
  - [ ] Méthode `exportDemandDetailsToPDF()` pour détails

### Phase 3 : Hooks React Query

#### 3.1 Hooks de données

- [ ] Créer `hooks/useCaisseImprevueDemands.ts`
  - [ ] Cache : `staleTime: 5 min`, `gcTime: 10 min`
  - [ ] Support pagination, tri, filtres

- [ ] Créer `hooks/useCaisseImprevueDemandsStats.ts`
  - [ ] Cache : `staleTime: 15 min`, `gcTime: 30 min`

- [ ] Créer `hooks/useDemandDetail.ts`
  - [ ] Cache : `staleTime: 10 min`, `gcTime: 20 min`
  - [ ] Prefetch au survol

- [ ] Créer `hooks/useDemandSearch.ts`
  - [ ] Cache : `staleTime: 2 min`, `gcTime: 5 min`
  - [ ] Debounce : 300ms

- [ ] Créer `hooks/useSubscriptionsCICache.ts`
  - [ ] Cache : `staleTime: 30 min`, `gcTime: 60 min`

#### 3.2 Hooks formulaires

- [ ] Créer `hooks/useDemandForm.ts`
  - [ ] Gestion formulaire multi-étapes
  - [ ] Validation Zod par étape

- [ ] Créer `hooks/useDemandFormPersistence.ts`
  - [ ] Sauvegarde localStorage (debounce 500ms)
  - [ ] Restauration automatique
  - [ ] Expiration 24h

#### 3.3 Hooks export

- [ ] Créer `hooks/useExportDemands.ts`
  - [ ] Export liste avec filtres

- [ ] Créer `hooks/useExportDemandDetails.ts`
  - [ ] Export détails PDF

### Phase 4 : Composants UI

#### 4.1 Liste des demandes

- [ ] Créer `components/demandes/ListDemandesV2.tsx`
  - [ ] Responsive (mobile, tablette, desktop)
  - [ ] Toggle vue Grid/Table
  - [ ] Intégration pagination haut et bas

- [ ] Créer `components/demandes/DemandCardV2.tsx`
  - [ ] Responsive
  - [ ] Badge statut
  - [ ] Actions contextuelles

- [ ] Créer `components/demandes/DemandTableV2.tsx`
  - [ ] Responsive
  - [ ] Colonnes adaptatives
  - [ ] Actions dropdown

- [ ] Créer `components/demandes/StatisticsV2.tsx`
  - [ ] Stats avec cache

- [ ] Créer `components/demandes/filters/DemandFiltersV2.tsx`
  - [ ] Filtres statut, fréquence, forfait

- [ ] Créer `components/demandes/filters/DemandSearchV2.tsx`
  - [ ] Recherche avec cache

- [ ] Créer `components/demandes/filters/DemandSortV2.tsx`
  - [ ] Tri date, alphabétique

#### 4.2 Détails

- [ ] Créer `components/demandes/DemandDetailV2.tsx`
  - [ ] Responsive
  - [ ] Toutes les sections
  - [ ] Actions contextuelles

- [ ] Créer `components/demandes/PaymentScheduleTable.tsx`
  - [ ] Tableau versements formaté
  - [ ] Responsive

#### 4.3 Formulaire création

- [ ] Créer `components/forms/CreateDemandFormV2.tsx`
  - [ ] Multi-étapes avec stepper
  - [ ] Persistance localStorage
  - [ ] Responsive

- [ ] Créer `components/forms/steps/Step1Member.tsx`
  - [ ] Recherche membre avec autocomplétion
  - [ ] Champ motif (textarea)

- [ ] Créer `components/forms/steps/Step2Forfait.tsx`
  - [ ] Sélection forfait (cache 30 min)
  - [ ] Sélection fréquence
  - [ ] Date souhaitée

- [ ] Créer `components/forms/steps/Step3Contact.tsx`
  - [ ] Contact d'urgence
  - [ ] Exclusion membre sélectionné
  - [ ] Upload photo pièce identité

#### 4.4 Modals

- [ ] Créer `components/modals/AcceptDemandModalV2.tsx`
  - [ ] Responsive
  - [ ] Validation raison

- [ ] Créer `components/modals/RejectDemandModalV2.tsx`
  - [ ] Responsive
  - [ ] Validation motif

- [ ] Créer `components/modals/ReopenDemandModalV2.tsx`
  - [ ] Responsive

- [ ] Créer `components/modals/DeleteDemandModalV2.tsx`
  - [ ] Responsive
  - [ ] Confirmation

- [ ] Créer `components/modals/EditDemandModalV2.tsx`
  - [ ] Responsive
  - [ ] Édition champs

- [ ] Créer `components/modals/ConfirmContractModalV2.tsx`
  - [ ] Responsive
  - [ ] Confirmation création contrat

- [ ] Créer `components/modals/ExportDemandsModalV2.tsx`
  - [ ] Responsive
  - [ ] Configuration export (format, périmètre, filtres, tri)
  - [ ] Aperçu nombre demandes

#### 4.5 Export

- [ ] Créer `components/exports/DemandPDFGenerator.ts`
  - [ ] Génération PDF liste
  - [ ] Génération PDF détails

### Phase 5 : Pages Next.js

- [ ] Créer `app/(admin)/caisse-imprevue/demandes/page.tsx`
  - [ ] Page liste avec `ListDemandesV2`

- [ ] Créer `app/(admin)/caisse-imprevue/demandes/add/page.tsx`
  - [ ] Page création avec `CreateDemandFormV2`

- [ ] Créer `app/(admin)/caisse-imprevue/demandes/[id]/page.tsx`
  - [ ] Page détails avec `DemandDetailV2`

### Phase 6 : Schemas Zod

- [ ] Créer/Étendre `schemas/caisse-imprevue.schema.ts`
  - [ ] Schema validation demande complète
  - [ ] Schema validation par étape

- [ ] Créer `schemas/demand-steps.schema.ts`
  - [ ] Schema étape 1
  - [ ] Schema étape 2
  - [ ] Schema étape 3

---

## 🧪 Étape 4 — Tests

### 4.1 Tests unitaires

**Fichiers à créer** :

- [ ] `repositories/__tests__/DemandCIRepository.test.ts`
  - [ ] Pagination serveur
  - [ ] Génération ID standardisé
  - [ ] Traçabilité (acceptedBy, rejectedBy, etc.)
  - [ ] Recherche

- [ ] `services/__tests__/CaisseImprevueService.test.ts`
  - [ ] Création demande
  - [ ] Acceptation avec traçabilité
  - [ ] Refus avec traçabilité
  - [ ] Réouverture avec traçabilité
  - [ ] Suppression avec traçabilité
  - [ ] Création contrat

- [ ] `services/__tests__/DemandSimulationService.test.ts`
  - [ ] Calcul versements DAILY
  - [ ] Calcul versements MONTHLY

- [ ] `services/__tests__/DemandExportService.test.ts`
  - [ ] Export PDF liste
  - [ ] Export Excel liste
  - [ ] Export PDF détails

- [ ] `hooks/__tests__/useCaisseImprevueDemands.test.ts`
  - [ ] Cache React Query
  - [ ] Pagination
  - [ ] Filtres

- [ ] `hooks/__tests__/useDemandFormPersistence.test.ts`
  - [ ] Sauvegarde localStorage
  - [ ] Restauration
  - [ ] Expiration

**Commandes** :
```bash
pnpm test --run DemandCIRepository
pnpm test --run CaisseImprevueService
pnpm test --run DemandSimulationService
pnpm test --run DemandExportService
```

### 4.2 Tests d'intégration

**Fichiers à créer** :

- [ ] `__tests__/integration/demand-creation.integration.test.tsx`
  - [ ] Création complète 3 étapes
  - [ ] Persistance localStorage
  - [ ] Validation

- [ ] `__tests__/integration/demand-actions.integration.test.tsx`
  - [ ] Acceptation avec traçabilité
  - [ ] Refus avec traçabilité
  - [ ] Réouverture avec traçabilité

- [ ] `__tests__/integration/demand-export.integration.test.tsx`
  - [ ] Export liste avec filtres
  - [ ] Export détails

**Commande** :
```bash
pnpm test --run integration
```

### 4.3 Tests E2E

**Fichier à créer** :

- [ ] `e2e/caisse-imprevue-demandes-v2.spec.ts`
  - [ ] E2E-CI-01 : Création demande complète (3 étapes)
  - [ ] E2E-CI-02 : Liste avec pagination
  - [ ] E2E-CI-03 : Recherche avec cache
  - [ ] E2E-CI-04 : Filtres multiples
  - [ ] E2E-CI-05 : Tri date/alphabétique
  - [ ] E2E-CI-06 : Détails avec simulation
  - [ ] E2E-CI-07 : Acceptation demande
  - [ ] E2E-CI-08 : Refus demande
  - [ ] E2E-CI-09 : Réouverture demande
  - [ ] E2E-CI-10 : Suppression demande
  - [ ] E2E-CI-11 : Création contrat
  - [ ] E2E-CI-12 : Export liste PDF
  - [ ] E2E-CI-13 : Export liste Excel
  - [ ] E2E-CI-14 : Export détails PDF
  - [ ] E2E-CI-15 : Responsive mobile
  - [ ] E2E-CI-16 : Responsive tablette
  - [ ] E2E-CI-17 : Responsive desktop

**Commandes** :
```bash
# Tests E2E locaux (avec Firebase Cloud dev)
pnpm dev  # Dans un terminal
pnpm test:e2e caisse-imprevue-demandes-v2  # Dans un autre terminal

# Tests E2E préprod (OBLIGATOIRE avant prod)
NEXT_PUBLIC_APP_ENV=preprod pnpm test:e2e:preprod caisse-imprevue-demandes-v2
```

**IDs de tests** : Utiliser tous les `data-testid` documentés dans `tests/DATA_TESTID.md`

### 4.4 Tests locaux (OBLIGATOIRE avant commit)

**⚠️ RÈGLE CRITIQUE** : **Aucun commit/push si les tests échouent localement**

```bash
# 1. Linter
pnpm lint

# 2. Type check
pnpm typecheck

# 3. Tests unitaires/component/integration (mockés - rapides)
pnpm test --run

# 4. Build (vérifier que ça compile)
pnpm build

# 5. Tests E2E locaux (OBLIGATOIRE pour flows critiques)
# Prérequis : pnpm dev en arrière-plan
pnpm test:e2e caisse-imprevue-demandes-v2
```

**Règle absolue** :
- ✅ **Si tous les tests passent** → Commit et push autorisés
- ❌ **Si un test échoue** → Corriger avant de commit/push

---

## 🔥 Étape 5 — Firebase

### 5.1 Règles Firestore

**Vérification** :
- [ ] Les règles permettent la lecture par les admins
- [ ] Les règles permettent l'écriture par les admins
- [ ] Les règles interdisent l'accès aux non-admins

**Action** : Vérifier `firestore.rules` et déployer si modifications

**Documentation** : `firebase/FIRESTORE_RULES.md`

**Déploiement** :
```bash
# Déployer sur dev
firebase use dev
firebase deploy --only firestore:rules

# Vérifier dans Firebase Console > Firestore > Rules
```

### 5.2 Indexes Firestore

**Indexes requis** :
- [ ] Index pour pagination avec statut + createdAt
- [ ] Index pour pagination avec statut + memberLastName
- [ ] Index pour recherche par memberLastName
- [ ] Index pour recherche par memberFirstName
- [ ] Index pour filtres multiples (statut + paymentFrequency + subscriptionCIID)

**Déploiement** :
```bash
# Déployer sur dev
firebase use dev
firebase deploy --only firestore:indexes

# Vérifier dans Firebase Console > Firestore > Indexes
```

**Documentation** : `firebase/INDEXES.md`

### 5.3 Storage Rules

**Vérification** :
- [ ] Les règles permettent l'upload de photos pièce identité par les admins
- [ ] Validation type de fichier (images uniquement)
- [ ] Validation taille (max 5MB)

**Action** : Vérifier `storage.rules` et déployer si modifications

**Documentation** : `firebase/STORAGE_RULES.md`

**Déploiement** :
```bash
# Déployer sur dev
firebase use dev
firebase deploy --only storage
```

---

## 📦 Étape 6 — Commits et Push

### 6.1 Convention de commits

**Format** :
```
feat(caisse-imprevue): add feature description
```

**Exemples de commits** :
```bash
# Infrastructure
git commit -m "feat(caisse-imprevue): add DemandCIRepository with server-side pagination"

# Services
git commit -m "feat(caisse-imprevue): add CaisseImprevueService with traceability"

# Hooks
git commit -m "feat(caisse-imprevue): add useCaisseImprevueDemands hook with React Query cache"

# Composants
git commit -m "feat(caisse-imprevue): add ListDemandesV2 component with responsive design"

# Formulaire
git commit -m "feat(caisse-imprevue): add CreateDemandFormV2 with localStorage persistence"

# Exports
git commit -m "feat(caisse-imprevue): add export PDF/Excel functionality"

# Tests
git commit -m "test(caisse-imprevue): add unit tests for DemandCIRepository"

# Documentation
git commit -m "docs(caisse-imprevue): update workflow documentation"
```

### 6.2 Push vers la branche

```bash
git push -u origin feat/caisse-imprevue-demandes-v2
```

---

## 🔀 Étape 7 — Pull Request vers `develop`

### 7.1 Checklist PR

**Documentation** :
- [x] Use cases documentés dans `USE_CASES.puml`
- [x] Diagrammes UML complets (activité, séquence)
- [x] Documentation UI/UX complète
- [x] Documentation technique (Firebase, tests)

**Code** :
- [ ] Respect de l'architecture (Hooks → Services → Repositories)
- [ ] Design System KARA respecté
- [ ] Responsive (mobile < 640px, tablette 640-1024px, desktop > 1024px)
- [ ] Validation Zod conservée
- [ ] Gestion des erreurs
- [ ] Loading states
- [ ] Traçabilité complète (tous les attributs d'audit)

**Tests** :
- [ ] Tests unitaires écrits et passent
- [ ] Tests d'intégration écrits et passent
- [ ] Tests E2E écrits et passent localement
- [ ] Tests E2E responsive (mobile 375px, tablette 768px, desktop 1280px)
- [ ] Tous les `data-testid` implémentés

**Firebase** :
- [ ] Règles Firestore déployées
- [ ] Indexes Firestore déployés
- [ ] Storage Rules déployées

**CI** :
- [ ] **CI vert (tous les tests passent, incluant E2E)** ← **OBLIGATOIRE**

### 7.2 Description de la PR

**Template** :
```markdown
## 🎯 Objectif

Refonte complète du module Demandes Caisse Imprévue V2 avec architecture domains-based, pagination serveur, cache optimisé, responsive design et exports PDF/Excel.

## 📝 Changements

### Nouveaux fichiers
- Repository avec pagination serveur
- Services avec traçabilité complète
- Hooks React Query avec cache optimisé
- Composants responsive (mobile, tablette, desktop)
- Formulaire multi-étapes avec persistance localStorage
- Exports PDF et Excel avec filtres avancés

### Modifications
- Architecture domains-based
- ID standardisé : MK_DEMANDE_CI_{matricule}_{date}_{heure}
- Traçabilité complète (acceptedBy, rejectedBy, etc.)

### Tests
- Tests unitaires complets
- Tests d'intégration
- Tests E2E Playwright

## 🧪 Tests

- [x] Tests unitaires passent (`pnpm test --run`)
- [x] Tests E2E passent localement (`pnpm test:e2e`)
- [x] Build réussi (`pnpm build`)

## 📚 Documentation

- [x] Documentation UML complète
- [x] Documentation UI/UX avec wireframes
- [x] Documentation technique (Firebase, tests)
- [x] Plan de tests

## 🔗 Références

- Documentation : `documentation/caisse-imprevue/V2/demande/`
- Use cases : `USE_CASES.puml`
- Solutions : `SOLUTIONS_PROPOSEES.md`
- UI/UX : `ui/README.md`
- Tests : `tests/README.md`
```

### 7.3 Processus automatique GitHub Actions

1. PR créée → Workflow `pr-checks.yml` s'exécute
2. Exécution de tous les tests :
   - Lint (ESLint)
   - Type check (TypeScript)
   - Tests unitaires (Vitest - mockés)
   - Build Next.js
   - **Tests E2E** (Playwright avec Firebase Cloud)
3. **Si un seul test échoue** → ❌ PR bloquée, merge impossible
4. **Si tous les tests passent** → ✅ PR peut être mergée

---

## 🚀 Étape 8 — Merge vers `develop` + Déploiement préprod

### 8.1 Processus automatique après merge

1. **Phase Tests (OBLIGATOIRE)** :
   - Workflow `ci.yml` s'exécute automatiquement sur `develop`
   - Exécution de tous les tests (incluant E2E)
   - **Si un test échoue** → ❌ **Déploiement annulé**

2. **Phase Déploiement (seulement si tests OK)** :
   - Workflow `deploy-preprod.yml` s'exécute **uniquement si** `ci.yml` est vert
   - Déploiement automatique vers **préprod** :
     - Firestore Rules
     - Firestore Indexes
     - Storage Rules
     - Cloud Functions (si modifiées)

### 8.2 Validation préprod (smoke test)

**Actions** :
- [ ] Accéder à `/caisse-imprevue/demandes` en préprod
- [ ] Vérifier que la liste s'affiche correctement
- [ ] Tester la pagination
- [ ] Tester la recherche
- [ ] Tester les filtres
- [ ] Tester la création d'une demande (3 étapes)
- [ ] Tester l'export PDF/Excel
- [ ] Vérifier responsive (mobile, tablette, desktop)

**Si OK** : Passer à l'étape 8.3 (tests E2E en préprod).  
**Si problème** : Corriger sur `develop`, re-déployer en préprod.

---

## ✅ Étape 8.3 — Tests E2E en préprod (OBLIGATOIRE avant prod)

**⚠️ RÈGLE CRITIQUE** : **Aucune feature ne peut être mise en production sans tests E2E réussis en préprod**

### 8.3.1 Configuration

```bash
# Variables préprod pour tests E2E
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-gabon-preprod
NEXT_PUBLIC_APP_URL=https://<preprod-url>.vercel.app
```

### 8.3.2 Tests E2E avec base de données réelle

```bash
# Tests E2E en préprod (CRITIQUE)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false pnpm test:e2e:preprod caisse-imprevue-demandes-v2
```

### 8.3.3 Checklist des tests E2E en préprod

- [ ] **E2E-CI-01** : Création demande complète (3 étapes)
- [ ] **E2E-CI-02** : Liste avec pagination
- [ ] **E2E-CI-03** : Recherche avec cache
- [ ] **E2E-CI-04** : Filtres multiples
- [ ] **E2E-CI-05** : Tri date/alphabétique
- [ ] **E2E-CI-06** : Détails avec simulation
- [ ] **E2E-CI-07** : Acceptation demande
- [ ] **E2E-CI-08** : Refus demande
- [ ] **E2E-CI-09** : Réouverture demande
- [ ] **E2E-CI-10** : Suppression demande
- [ ] **E2E-CI-11** : Création contrat
- [ ] **E2E-CI-12** : Export liste PDF
- [ ] **E2E-CI-13** : Export liste Excel
- [ ] **E2E-CI-14** : Export détails PDF
- [ ] **E2E-CI-15** : Responsive mobile
- [ ] **E2E-CI-16** : Responsive tablette
- [ ] **E2E-CI-17** : Responsive desktop

### 8.3.4 Règle absolue

- ✅ **Si tous les tests E2E passent en préprod** → Feature prête pour production
- ❌ **Si un test échoue en préprod** → Corriger, re-déployer, re-tester

---

## 🎯 Étape 9 — Release vers `main` (prod)

### 9.1 Créer une PR `develop` → `main`

**Processus automatique** :

1. **Phase Tests PR (OBLIGATOIRE)** :
   - Workflow `pr-checks.yml` s'exécute
   - Exécution de tous les tests (incluant E2E)
   - **Si un test échoue** → ❌ PR bloquée

2. **Phase Merge** :
   - **Seulement si tous les tests passent** → Merge possible

3. **Phase Tests Post-Merge (OBLIGATOIRE)** :
   - Workflow `ci.yml` s'exécute sur `main`
   - Exécution de tous les tests (incluant E2E)
   - **Si un test échoue** → ❌ **Déploiement annulé**

4. **Phase Déploiement Prod (seulement si tests OK)** :
   - Workflow `deploy-prod.yml` s'exécute **uniquement si** `ci.yml` est vert
   - Déploiement automatique vers **prod**
   - Création d'un tag Git `vX.Y.Z`
   - Annuaire : marquer feature comme "✅ Réalisée"

---

## 📋 Definition of Done (DoD)

### Checklist complète

**Documentation** :
- [x] Use cases documentés dans `USE_CASES.puml`
- [x] Diagrammes UML complets (activité, séquence)
- [x] Documentation UI/UX avec wireframes
- [x] Documentation technique (Firebase, tests)
- [x] Plan de tests complet

**Code** :
- [ ] Repository avec pagination serveur créé et testé
- [ ] Services avec traçabilité créés et testés
- [ ] Hooks React Query avec cache créés et testés
- [ ] Composants responsive créés et testés
- [ ] Formulaire multi-étapes avec persistance créé et testé
- [ ] Exports PDF/Excel créés et testés
- [ ] Respect de l'architecture (Hooks → Services → Repositories)
- [ ] Design System KARA respecté
- [ ] Responsive (mobile < 640px, tablette 640-1024px, desktop > 1024px)
- [ ] Validation Zod conservée
- [ ] Gestion des erreurs
- [ ] Loading states
- [ ] Traçabilité complète (tous les attributs d'audit)

**Tests** :
- [ ] Tests unitaires écrits et passent (`pnpm test --run`)
- [ ] Tests d'intégration écrits et passent
- [ ] Tests E2E écrits et passent localement (`pnpm test:e2e`)
- [ ] Tests E2E responsive (mobile 375px, tablette 768px, desktop 1280px)
- [ ] **Tests E2E passent en préprod** (OBLIGATOIRE)
- [ ] Tous les `data-testid` implémentés

**Firebase** :
- [ ] Règles Firestore déployées
- [ ] Indexes Firestore déployés
- [ ] Storage Rules déployées

**CI/CD** :
- [ ] **CI vert (tous les tests passent, incluant E2E)** ← **OBLIGATOIRE**
- [ ] Préprod déployée et testée
- [ ] Tests E2E préprod passent (OBLIGATOIRE)
- [ ] Prod déployée et testée

**Annuaire** :
- [ ] Feature marquée comme "✅ Réalisée" dans l'annuaire

---

## 🔍 Points d'attention

### Cache React Query

- **Liste** : `staleTime: 5 min`, `gcTime: 10 min`
- **Recherche** : `staleTime: 2 min`, `gcTime: 5 min`
- **Détails** : `staleTime: 10 min`, `gcTime: 20 min` (avec prefetch)
- **Stats** : `staleTime: 15 min`, `gcTime: 30 min`
- **Forfaits** : `staleTime: 30 min`, `gcTime: 60 min`

### Performance

- **Pagination serveur** : Cursor-based avec `startAfter`
- **Debounce recherche** : 300ms
- **Persistance formulaire** : Debounce 500ms
- **Limite résultats recherche** : 50 maximum

### Traçabilité

- **Attributs obligatoires** : `createdBy`, `createdAt`, `updatedBy`, `updatedAt`
- **Acceptation** : `acceptedBy`, `acceptedAt`
- **Refus** : `rejectedBy`, `rejectedAt`
- **Réouverture** : `reopenedBy`, `reopenedAt`
- **Suppression** : `deletedBy`, `deletedAt` (avant `deleteDoc`)
- **Création contrat** : `convertedBy`, `convertedAt`

### ID Standardisé

- **Format** : `MK_DEMANDE_CI_{4PremiersChiffresMatricule}_{DDMMYY}_{HHMM}`
- **Exemple** : `MK_DEMANDE_CI_8438_270126_2219`
- **Génération** : Repository avec `setDoc` (pas `addDoc`)

### Responsive

- **Mobile (< 640px)** : Cards empilées, boutons empilés, tableau scrollable
- **Tablette (640-1024px)** : Grille 2 colonnes, boutons côte à côte
- **Desktop (> 1024px)** : Grille 3 colonnes, vue table complète

---

## 📚 Références

### Documentation

- **Workflow général** : `documentation/general/WORKFLOW.md`
- **Documentation principale** : `documentation/caisse-imprevue/V2/demande/README.md`
- **Solutions proposées** : `documentation/caisse-imprevue/V2/demande/SOLUTIONS_PROPOSEES.md`
- **UML** : `documentation/caisse-imprevue/V2/demande/activite/` et `sequence/`
- **UI/UX** : `documentation/caisse-imprevue/V2/demande/ui/`
- **Firebase** : `documentation/caisse-imprevue/V2/demande/firebase/`
- **Tests** : `documentation/caisse-imprevue/V2/demande/tests/`
- **Notifications** : `documentation/caisse-imprevue/V2/demande/notifications/`

### Architecture

- **Architecture générale** : `documentation/architecture/ARCHITECTURE.md`
- **Design System** : `documentation/design-system/DESIGN_SYSTEM_COULEURS_KARA.md`
- **Plan migration domains** : `documentation/PLAN_MIGRATION_DOMAINS.md`

---

## 🎯 Résumé du workflow

```
1. Documentation ✅ (déjà complétée)
   ↓
2. Créer branche feat/caisse-imprevue-demandes-v2
   ↓
3. Phase 1 : Infrastructure et Repository
   ↓
4. Phase 2 : Services
   ↓
5. Phase 3 : Hooks React Query
   ↓
6. Phase 4 : Composants UI
   ↓
7. Phase 5 : Pages Next.js
   ↓
8. Phase 6 : Schemas Zod
   ↓
9. Écrire tests (unitaires, intégration, E2E)
   ↓
10. Tests locaux passent ✅
    ↓
11. Commit et push
    ↓
12. PR vers develop
    ↓
13. CI vert ✅
    ↓
14. Merge vers develop
    ↓
15. Déploiement préprod automatique
    ↓
16. Tests E2E préprod ✅ (OBLIGATOIRE)
    ↓
17. PR vers main
    ↓
18. CI vert ✅
    ↓
19. Merge vers main
    ↓
20. Déploiement prod automatique
    ↓
21. Feature ✅ Réalisée
```

---

**Note** : Ce workflow doit être suivi étape par étape. Chaque étape doit être validée avant de passer à la suivante. Les tests E2E en préprod sont **OBLIGATOIRES** avant toute mise en production.
