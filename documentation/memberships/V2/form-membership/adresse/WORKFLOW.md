# WORKFLOW — Step2 Adresse avec Cascading Dependent Selection

> **Objectif** : Implémenter le pattern **Cascading Dependent Selection avec Optimistic Updates** pour le composant Step2 Adresse dans le formulaire d'ajout de membre (`/memberships/add`).

> **Référence** : Ce workflow suit le template général défini dans `documentation/general/WORKFLOW.md`

---

## 📋 Vue d'ensemble

### Contexte

**Problématique actuelle (V1)** :
- Le composant Step2 Adresse bug trop en production
- Lors de l'ajout d'une nouvelle commune, elle n'apparaît pas immédiatement dans le Combobox
- Problèmes de synchronisation cache React Query ↔ formulaire react-hook-form
- Race conditions lors de la création d'entités géographiques
- Tentative de charger toutes les communes (trop nombreuses)

**Solution proposée (V2)** :
- Pattern **Cascading Dependent Selection avec Optimistic Updates**
- Hook réutilisable `useCascadingEntityCreation` pour gérer la création d'entités
- Stratégies de cache adaptées : Chargement complet vs Recherche selon le volume
- Synchronisation parfaite cache ↔ formulaire
- Réinitialisation en cascade des niveaux enfants

### Use Case

**UC-MEM-FORM-011-V2** : Saisir l'adresse de résidence avec cascade et création optimisée

**Acteurs** :
- **Admin KARA** : Utilisateur administrateur
- **Système** : Firestore, React Query Cache

**Documentation UML** :
- Use case V1 : `documentation/memberships/V2/form-membership/adresse/uml/use-case-v1.puml`
- Use case V2 : `documentation/memberships/V2/form-membership/adresse/uml/use-case-v2.puml`
- Diagramme d'activité : `documentation/memberships/V2/form-membership/adresse/uml/activite.puml`
- Diagramme de séquence : `documentation/memberships/V2/form-membership/adresse/uml/sequence.puml`

---

## 🌿 Branche Git

### Nom de la branche

```bash
feat/step2-address-cascade-optimistic-update
```

**Convention** : `feat/<feature>` pour une nouvelle fonctionnalité

### Création de la branche

```bash
# Depuis develop
git checkout develop
git pull origin develop

# Créer la branche
git checkout -b feat/step2-address-cascade-optimistic-update
```

---

## 📝 Étape 1 — Documentation (Déjà complétée ✅)

### 1.1 Documentation UML

- [x] Use case V1 documenté (`uml/use-case-v1.puml`)
- [x] Use case V2 documenté (`uml/use-case-v2.puml`)
- [x] Diagramme d'activité (`uml/activite.puml`)
- [x] Diagramme de séquence (`uml/sequence.puml`)

### 1.2 Documentation UI/UX

- [x] Documentation UI complète (`ui/README.md`)
- [x] Wireframes (`ui/wireframe-*.md`)
- [x] IDs de tests E2E (`ui/test-ids.md`)

### 1.3 Documentation Technique

- [x] Gestion du cache et cas critiques (`CACHE-ET-CAS-CRITIQUES.md`)
- [x] Plan de tests (`tests/README.md`)
- [x] Mocks et fixtures (`tests/MOCKS-AND-FIXTURES.md`)

### 1.4 Documentation principale

- [x] README principal (`README.md`)

**Action** : Vérifier que toute la documentation est à jour avant de commencer l'implémentation.

---

## 🏗️ Étape 2 — Architecture et Structure

### 2.1 Structure des fichiers à créer/modifier

```
src/domains/memberships/
├── hooks/
│   ├── useCascadingEntityCreation.ts          # Hook réutilisable pour création optimiste
│   └── useAddressCascade.ts                    # Hook existant (à améliorer)
│
src/components/register/
├── Step2.tsx                                   # Composant principal (à modifier)
│
src/domains/infrastructure/geography/
├── components/
│   ├── forms/
│   │   ├── ProvinceCombobox.tsx               # Combobox province (à améliorer)
│   │   ├── CommuneCombobox.tsx                # Combobox commune (à modifier - recherche uniquement)
│   │   ├── DistrictCombobox.tsx               # Combobox district (à améliorer)
│   │   └── QuarterCombobox.tsx                # Combobox quarter (à modifier - recherche uniquement)
│   └── modals/
│       ├── AddProvinceModal.tsx               # Modal création province (existant)
│       ├── AddCommuneModal.tsx                # Modal création commune (existant)
│       ├── AddDistrictModal.tsx               # Modal création district (existant)
│       └── AddQuarterModal.tsx                # Modal création quarter (existant)
│
src/domains/infrastructure/geography/
├── services/
│   └── GeographieService.ts                   # Service existant (à vérifier méthodes recherche)
```

### 2.2 Dépendances existantes à utiliser

- **React Query** : `@tanstack/react-query` (existant)
- **react-hook-form** : Intégration avec le formulaire existant
- **shadcn/ui** : `Command`, `Popover` pour les Combobox (existant)
- **Firestore** : Collections géographiques existantes

### 2.3 Architecture respectée

```
┌─────────────────────────────────────────────────────────────┐
│              Step2 (Composant)                               │
│              Utilise useCascadingEntityCreation              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         useCascadingEntityCreation (Hook)                   │
│         Pattern Optimistic Update + Context-Aware           │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         React Query Cache                                   │
│         Stratégies adaptées par niveau                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         GeographieService (Service)                        │
│         - getProvinces() (chargement complet)               │
│         - getDepartmentsByProvinceId() (par province)       │
│         - searchCommunes() (recherche uniquement)           │
│         - getDistrictsByCommuneId() (chargement complet)    │
│         - searchQuarters() (recherche uniquement)          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firestore                                 │
│                    Collections géographiques                │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Stratégies de cache par niveau

| Niveau | Volume | Stratégie | Cache | Recherche |
|--------|--------|-----------|-------|-----------|
| **Provinces** | 9 | Chargement complet | 30 min | ❌ Non |
| **Départements** | ~50-60 | Chargement par province | 30 min | 🟡 Optionnelle |
| **Communes** | Très élevé | **Recherche uniquement** | 5 min | ✅ Obligatoire (min 2 chars) |
| **Districts** | Max 7/commune | Chargement complet | 30 min | ❌ Non |
| **Quarters** | Très élevé | **Recherche uniquement** | 5 min | ✅ Obligatoire (min 2 chars) |

**Voir** : `CACHE-ET-CAS-CRITIQUES.md` pour les détails complets

---

## 💻 Étape 3 — Implémentation

### 3.1 Checklist d'implémentation

#### Phase 1 : Hook useCascadingEntityCreation

- [ ] Créer `src/domains/memberships/hooks/useCascadingEntityCreation.ts`
  - [ ] Interface `UseCascadingEntityCreationOptions<T>`
  - [ ] Fonction `handleEntityCreated` avec 6 phases :
    1. **Context Check** : Vérification du contexte parent
    2. **Optimistic Update (Context-Aware)** : Mise à jour cache spécifique + générique
    3. **Invalidation** : Invalidation ciblée des queries
    4. **Refetch Actif** : Refetch des queries actives
    5. **Selection** : Sélection dans le formulaire
    6. **Cascade Reset** : Réinitialisation des niveaux enfants
  - [ ] Gestion des erreurs
  - [ ] Tri alphabétique avec `localeCompare('fr')`

#### Phase 2 : Améliorer useAddressCascade

- [ ] Vérifier `src/domains/memberships/hooks/useAddressCascade.ts`
  - [ ] S'assurer que `selectedCommune`, `selectedDistrict`, etc. sont calculés correctement
  - [ ] Vérifier la réinitialisation en cascade
  - [ ] Vérifier la mise à jour automatique des champs texte

#### Phase 3 : Modifier CommuneCombobox (Recherche uniquement)

- [ ] Modifier `src/domains/infrastructure/geography/components/forms/CommuneCombobox.tsx`
  - [ ] **CRITIQUE** : Remplacer `useQueries` par `useQuery` avec recherche
  - [ ] Implémenter la recherche avec debounce (300ms)
  - [ ] Minimum 2 caractères pour activer la recherche
  - [ ] Limite de 50 résultats
  - [ ] Cache 5 minutes par terme de recherche
  - [ ] Tri alphabétique des résultats
  - [ ] États : initial, recherche, chargement, résultats, sélectionné, erreur
  - [ ] `data-testid` : Tous les IDs documentés dans `ui/test-ids.md`

#### Phase 4 : Modifier QuarterCombobox (Recherche uniquement)

- [ ] Modifier `src/domains/infrastructure/geography/components/forms/QuarterCombobox.tsx`
  - [ ] Même stratégie que CommuneCombobox (recherche uniquement)
  - [ ] Debounce 300ms, min 2 chars, limit 50, cache 5 min

#### Phase 5 : Améliorer ProvinceCombobox et DistrictCombobox

- [ ] Vérifier `ProvinceCombobox.tsx` : Chargement complet (9 provinces)
- [ ] Vérifier `DistrictCombobox.tsx` : Chargement complet (max 7 par commune)
- [ ] S'assurer que le cache est configuré correctement (30 min)

#### Phase 6 : Intégrer useCascadingEntityCreation dans Step2

- [ ] Modifier `src/components/register/Step2.tsx`
  - [ ] Utiliser `useCascadingEntityCreation` pour les communes
  - [ ] Utiliser `useCascadingEntityCreation` pour les districts
  - [ ] Utiliser `useCascadingEntityCreation` pour les quarters
  - [ ] Gérer les handlers `handleCommuneCreated`, `handleDistrictCreated`, `handleQuarterCreated`
  - [ ] Vérifier la cascade reset

#### Phase 7 : Service GeographieService

- [ ] Vérifier `src/domains/infrastructure/geography/services/GeographieService.ts`
  - [ ] Méthode `searchCommunes({ search, departmentIds, limit })` existe
  - [ ] Méthode `searchQuarters({ search, districtId, limit })` existe
  - [ ] Tri alphabétique côté service ou client

### 3.2 Design System

**Couleurs** :
- Bordure par défaut : `border-kara-neutral-200`
- Bordure hover : `border-kara-primary-light`
- Bordure focus : `border-kara-primary-dark`
- Bordure sélectionné : `border-kara-primary-dark`
- Fond sélectionné : `bg-kara-primary-light/10`

**Composants shadcn/ui** :
- `Popover` : Liste déroulante
- `Command` : Recherche et résultats
- `CommandInput` : Champ de recherche
- `CommandList` : Liste des résultats
- `CommandItem` : Item individuel

**Voir** : `ui/README.md` pour les spécifications complètes

### 3.3 Responsive

**Mobile (< 640px)** :
- [ ] Largeur : 100% du conteneur
- [ ] Padding horizontal : `px-3` (12px)
- [ ] Label : `text-xs` (12px)
- [ ] Texte hint : `text-xs` (12px)
- [ ] Liste déroulante : `max-h-[250px]` (250px)
- [ ] Padding items : `px-2 py-1.5` (réduit)

**Tablette (640px - 1024px)** :
- [ ] Largeur : 100% du conteneur
- [ ] Padding horizontal : `px-4` (16px)
- [ ] Label : `text-xs sm:text-sm` (12px → 14px)
- [ ] Texte hint : `text-xs sm:text-sm` (12px → 14px)
- [ ] Liste déroulante : `max-h-[300px]` (300px)
- [ ] Padding items : `px-3 py-2` (normal)

**Desktop (> 1024px)** :
- [ ] Largeur : 100% (ou max-width si défini)
- [ ] Padding horizontal : `px-4` (16px)
- [ ] Label : `text-sm` (14px)
- [ ] Texte hint : `text-xs` (12px)
- [ ] Liste déroulante : `max-h-[300px]` avec scroll si nécessaire
- [ ] Padding items : `px-3 py-2` (normal)

**Voir** : `ui/README.md` pour les spécifications complètes

---

## 🧪 Étape 4 — Tests

### 4.1 Tests unitaires

**Fichiers à créer** :

- [ ] `src/domains/memberships/hooks/__tests__/useCascadingEntityCreation.test.ts`
  - [ ] Optimistic Update (context-aware, générique)
  - [ ] Context Check
  - [ ] Invalidation
  - [ ] Refetch actif
  - [ ] Cascade Reset
  - [ ] Tri alphabétique
  - [ ] Gestion erreurs

- [ ] `src/domains/memberships/hooks/__tests__/useAddressCascade.test.ts`
  - [ ] Chargement des données
  - [ ] Mise à jour automatique des champs texte
  - [ ] Réinitialisation en cascade
  - [ ] Calcul des entités sélectionnées
  - [ ] Agrégation des communes

- [ ] `src/domains/infrastructure/geography/components/forms/__tests__/CommuneCombobox.test.tsx`
  - [ ] Recherche avec debounce
  - [ ] Minimum 2 caractères
  - [ ] Limite 50 résultats
  - [ ] Cache React Query
  - [ ] Tri alphabétique
  - [ ] États (initial, recherche, chargement, résultats, erreur)

- [ ] `src/components/register/__tests__/Step2.test.tsx`
  - [ ] Intégration useCascadingEntityCreation
  - [ ] Handlers de création
  - [ ] Cascade de sélection
  - [ ] Cascade reset

**Commandes** :
```bash
pnpm test --run useCascadingEntityCreation
pnpm test --run useAddressCascade
pnpm test --run CommuneCombobox
pnpm test --run Step2
```

### 4.2 Tests d'intégration

**Fichiers à créer** :

- [ ] `src/domains/memberships/__tests__/integration/step2-address-cascade.integration.test.tsx`
  - [ ] Cascade complète de sélection
  - [ ] Réinitialisation en cascade
  - [ ] Ordre de chargement

- [ ] `src/domains/memberships/__tests__/integration/step2-address-creation.integration.test.tsx`
  - [ ] Création province, commune, district, quarter
  - [ ] Validation des formulaires
  - [ ] Gestion des erreurs

- [ ] `src/domains/memberships/__tests__/integration/step2-address-optimistic-update.integration.test.tsx`
  - [ ] Optimistic Update immédiat
  - [ ] Synchronisation cache-formulaire
  - [ ] Cascade Reset après création
  - [ ] Context-Aware Update

- [ ] `src/domains/memberships/__tests__/integration/step2-address-cache-management.integration.test.tsx`
  - [ ] Cache lors du retour à une recherche précédente
  - [ ] Debounce de la recherche
  - [ ] Limite de résultats (50)
  - [ ] Tri alphabétique
  - [ ] Chargement complet vs Recherche
  - [ ] Minimum de caractères (2)

**Commande** :
```bash
pnpm test --run step2-address
```

### 4.3 Tests E2E

**Fichier à créer** :

- [ ] `e2e/step2-address-create-province.spec.ts`
  - [ ] E2E-PROV-001 : Création et sélection d'une province
  - [ ] E2E-PROV-002 : Sélection de la province créée depuis le Combobox

- [ ] `e2e/step2-address-create-commune.spec.ts`
  - [ ] E2E-COMMUNE-001 : Création et sélection d'une commune
  - [ ] E2E-COMMUNE-002 : Sélection de la commune créée depuis le Combobox
  - [ ] E2E-COMMUNE-003 : Réinitialisation des niveaux enfants

- [ ] `e2e/step2-address-create-district.spec.ts`
  - [ ] E2E-DISTRICT-001 : Création de 3 districts et sélection de l'un d'eux
  - [ ] E2E-DISTRICT-002 : Création de 2 districts et sélection du deuxième
  - [ ] E2E-DISTRICT-003 : Réinitialisation du quarter

- [ ] `e2e/step2-address-create-quarter.spec.ts`
  - [ ] E2E-QUARTER-001 : Création et sélection d'un quarter
  - [ ] E2E-QUARTER-002 : Sélection du quarter créé depuis le Combobox

- [ ] `e2e/step2-address-full-cascade-create.spec.ts`
  - [ ] E2E-FULL-001 : Cascade complète avec création (Province → Commune → 3 Districts → Quarter)
  - [ ] E2E-FULL-002 : Cascade avec 2 districts et sélection du premier

**Commandes** :
```bash
# Tests E2E locaux (avec Firebase Cloud dev)
pnpm dev  # Dans un terminal
pnpm test:e2e step2-address  # Dans un autre terminal

# Tests E2E préprod (OBLIGATOIRE avant prod)
NEXT_PUBLIC_APP_ENV=preprod pnpm test:e2e:preprod step2-address
```

**IDs de tests** : Utiliser tous les `data-testid` documentés dans `ui/test-ids.md`

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
pnpm test:e2e step2-address
```

**Règle absolue** :
- ✅ **Si tous les tests passent** → Commit et push autorisés
- ❌ **Si un test échoue** → Corriger avant de commit/push

---

## 🔥 Étape 5 — Firebase

### 5.1 Règles Firestore

**Vérification** :
- [ ] Les règles actuelles permettent la lecture par les admins
- [ ] Lecture individuelle (get) fonctionne
- [ ] Lecture en batch fonctionne
- [ ] Requêtes de recherche fonctionnent (pour communes et quarters)

**Action** : Vérifier `firestore.rules` (normalement pas de modification nécessaire)

### 5.2 Indexes Firestore

**Indexes pour recherche (si implémentés côté Firestore)** :
- [ ] Index pour recherche de communes par `name` + `departmentId`
- [ ] Index pour recherche de quarters par `name` + `districtId`

**Déploiement** :
```bash
# Déployer sur dev
firebase use dev
firebase deploy --only firestore:indexes

# Vérifier dans Firebase Console > Firestore > Indexes
```

**Note** : Les index Firestore sont nécessaires si la recherche est implémentée côté Firestore. Si la recherche est uniquement côté client (filtrage après chargement), les index ne sont pas nécessaires.

---

## 📦 Étape 6 — Commits et Push

### 6.1 Convention de commits

**Format** :
```
feat(memberships): add cascading dependent selection with optimistic updates for address
```

**Exemples de commits** :
```bash
# Hook useCascadingEntityCreation
git commit -m "feat(memberships): add useCascadingEntityCreation hook with optimistic update pattern"

# Modification CommuneCombobox (recherche uniquement)
git commit -m "feat(geography): refactor CommuneCombobox to use search-only strategy"

# Modification QuarterCombobox (recherche uniquement)
git commit -m "feat(geography): refactor QuarterCombobox to use search-only strategy"

# Intégration dans Step2
git commit -m "feat(memberships): integrate useCascadingEntityCreation in Step2 address component"

# Tests
git commit -m "test(memberships): add tests for step2 address cascade and optimistic updates"

# Documentation
git commit -m "docs(memberships): update step2 address documentation with cache strategies"
```

### 6.2 Push vers la branche

```bash
git push -u origin feat/step2-address-cascade-optimistic-update
```

---

## 🔀 Étape 7 — Pull Request vers `develop`

### 7.1 Checklist PR

**Documentation** :
- [x] Use case V2 documenté dans `uml/use-case-v2.puml`
- [x] Diagrammes UML complets (activité, séquence)
- [x] Documentation UI/UX complète
- [x] Documentation technique (cache, tests)
- [x] Gestion du cache et cas critiques documentés

**Code** :
- [ ] Respect de l'architecture (Hooks → Services → Repositories)
- [ ] Design System KARA respecté
- [ ] Responsive (mobile < 640px, tablette 640-1024px, desktop > 1024px)
- [ ] Stratégies de cache respectées (chargement complet vs recherche)
- [ ] Pattern Optimistic Update implémenté
- [ ] Gestion des erreurs
- [ ] Loading states

**Tests** :
- [ ] Tests unitaires écrits et passent
- [ ] Tests d'intégration écrits et passent
- [ ] Tests E2E écrits et passent localement
- [ ] Tous les `data-testid` implémentés

**Firebase** :
- [ ] Règles Firestore vérifiées
- [ ] Indexes Firestore ajoutés si nécessaire

**CI** :
- [ ] **CI vert (tous les tests passent, incluant E2E)** ← **OBLIGATOIRE**

### 7.2 Description de la PR

**Template** :
```markdown
## 🎯 Objectif

Corriger les bugs du composant Step2 Adresse et implémenter le pattern **Cascading Dependent Selection avec Optimistic Updates** pour garantir une synchronisation parfaite entre le cache React Query et le formulaire.

## 📝 Changements

### Nouveaux fichiers
- `src/domains/memberships/hooks/useCascadingEntityCreation.ts` - Hook réutilisable pour création optimiste
- Tests unitaires, d'intégration et E2E complets

### Modifications
- `src/components/register/Step2.tsx` - Intégration du pattern Optimistic Update
- `src/domains/infrastructure/geography/components/forms/CommuneCombobox.tsx` - Recherche uniquement (pas de chargement complet)
- `src/domains/infrastructure/geography/components/forms/QuarterCombobox.tsx` - Recherche uniquement (pas de chargement complet)
- `src/domains/memberships/hooks/useAddressCascade.ts` - Améliorations

### Stratégies de cache
- Provinces : Chargement complet (9, cache 30 min)
- Départements : Chargement par province (~50-60, cache 30 min)
- Communes : **Recherche uniquement** (min 2 chars, limit 50, cache 5 min)
- Districts : Chargement complet (max 7, cache 30 min)
- Quarters : **Recherche uniquement** (min 2 chars, limit 50, cache 5 min)

## 🧪 Tests

- [x] Tests unitaires passent (`pnpm test --run`)
- [x] Tests E2E passent localement (`pnpm test:e2e`)
- [x] Build réussi (`pnpm build`)

## 📚 Documentation

- [x] Documentation UML complète
- [x] Documentation UI/UX avec wireframes
- [x] Documentation technique (cache, stratégies)
- [x] Plan de tests complet

## 🔗 Références

- Documentation : `documentation/memberships/V2/form-membership/adresse/`
- Use case : `uml/use-case-v2.puml`
- Cache : `CACHE-ET-CAS-CRITIQUES.md`
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
   - Déploiement automatique vers **préprod**

### 8.2 Validation préprod (smoke test)

**Actions** :
- [ ] Accéder à `/memberships/add` en préprod
- [ ] Naviguer jusqu'à Step2 (Adresse)
- [ ] Vérifier que les Combobox s'affichent correctement
- [ ] Tester la recherche de commune (min 2 chars)
- [ ] Créer une nouvelle commune → Vérifier qu'elle apparaît immédiatement
- [ ] Vérifier que la cascade fonctionne (Province → Commune → District → Quarter)
- [ ] Vérifier que les districts se chargent complètement (max 7)
- [ ] Vérifier que les quarters utilisent la recherche uniquement

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
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false pnpm test:e2e:preprod step2-address
```

### 8.3.3 Checklist des tests E2E en préprod

- [ ] **E2E-PROV-001** : Création et sélection d'une province
- [ ] **E2E-COMMUNE-001** : Création et sélection d'une commune
- [ ] **E2E-COMMUNE-003** : Réinitialisation des niveaux enfants
- [ ] **E2E-DISTRICT-001** : Création de 3 districts et sélection
- [ ] **E2E-QUARTER-001** : Création et sélection d'un quarter
- [ ] **E2E-FULL-001** : Cascade complète avec création

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
- [x] Use case V2 documenté dans `uml/use-case-v2.puml`
- [x] Diagrammes UML complets (activité, séquence)
- [x] Documentation UI/UX avec wireframes
- [x] Documentation technique (cache, stratégies)
- [x] Plan de tests complet

**Code** :
- [ ] Hook `useCascadingEntityCreation` créé et testé
- [ ] Hook `useAddressCascade` amélioré et testé
- [ ] `CommuneCombobox` modifié (recherche uniquement) et testé
- [ ] `QuarterCombobox` modifié (recherche uniquement) et testé
- [ ] `Step2` modifié avec intégration du pattern et testé
- [ ] Respect de l'architecture (Hooks → Services → Repositories)
- [ ] Design System KARA respecté
- [ ] Responsive (mobile < 640px, tablette 640-1024px, desktop > 1024px)
- [ ] Stratégies de cache respectées
- [ ] Gestion des erreurs
- [ ] Loading states

**Tests** :
- [ ] Tests unitaires écrits et passent (`pnpm test --run`)
- [ ] Tests d'intégration écrits et passent
- [ ] Tests E2E écrits et passent localement (`pnpm test:e2e`)
- [ ] **Tests E2E passent en préprod** (OBLIGATOIRE)
- [ ] Tous les `data-testid` implémentés

**Firebase** :
- [ ] Règles Firestore vérifiées
- [ ] Indexes Firestore ajoutés si nécessaire

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

- **Provinces** : `staleTime: 30 min`, `cacheTime: Infinity` (données très stables)
- **Départements** : `staleTime: 30 min`, `cacheTime: 60 min` (par province)
- **Communes** : `staleTime: 5 min`, `cacheTime: 10 min` (par terme de recherche)
- **Districts** : `staleTime: 30 min`, `cacheTime: 60 min` (par commune)
- **Quarters** : `staleTime: 5 min`, `cacheTime: 10 min` (par terme de recherche)

**Vérifier** : Recherche "Libreville" → Change → "Libreville" = Cache HIT ✅ (dans les 5 min)

### Performance

- **Debounce** : 300ms pour éviter les recherches multiples
- **Limite résultats** : 50 maximum pour communes et quarters
- **Cache** : Évite les recherches redondantes
- **Chargement complet** : Seulement pour provinces (9) et districts (max 7)

### Stratégies de chargement

- **CRITIQUE** : Ne jamais charger toutes les communes ou tous les quarters
- **Recherche uniquement** : Minimum 2 caractères, debounce 300ms, limit 50
- **Chargement complet** : Seulement pour petites listes (provinces, districts)

### Accessibilité

- **ARIA** : `role="combobox"`, `aria-expanded`, `aria-controls`
- **Navigation clavier** : Flèches, Entrée, Echap
- **Focus visible** : Ring de focus sur l'input
- **Messages de verrouillage** : Clair pour les niveaux dépendants

### Responsive

- **Mobile (< 640px)** : Largeur 100%, padding `px-3`, texte `text-xs`, liste `max-h-[250px]`
- **Tablette (640-1024px)** : Largeur 100%, padding `px-4`, texte `text-xs sm:text-sm`, liste `max-h-[300px]`
- **Desktop (> 1024px)** : Largeur 100% (ou max-width), padding `px-4`, texte `text-sm`, liste `max-h-[300px]`

**Voir** : `ui/README.md` pour les spécifications détaillées

---

## 📚 Références

### Documentation

- **Workflow général** : `documentation/general/WORKFLOW.md`
- **Documentation principale** : `documentation/memberships/V2/form-membership/adresse/README.md`
- **UML** : `documentation/memberships/V2/form-membership/adresse/uml/`
- **UI/UX** : `documentation/memberships/V2/form-membership/adresse/ui/`
- **Cache** : `documentation/memberships/V2/form-membership/adresse/CACHE-ET-CAS-CRITIQUES.md`
- **Tests** : `documentation/memberships/V2/form-membership/adresse/tests/`

### Architecture

- **Architecture générale** : `documentation/architecture/ARCHITECTURE.md`
- **Design System** : `documentation/design-system/DESIGN_SYSTEM_COULEURS_KARA.md`

### Code existant

- **Step2** : `src/components/register/Step2.tsx`
- **CommuneCombobox** : `src/domains/infrastructure/geography/components/forms/CommuneCombobox.tsx`
- **GeographieService** : `src/domains/infrastructure/geography/services/GeographieService.ts`
- **useAddressCascade** : `src/domains/memberships/hooks/useAddressCascade.ts`

---

## 🎯 Résumé du workflow

```
1. Documentation ✅ (déjà complétée)
   ↓
2. Créer branche feat/step2-address-cascade-optimistic-update
   ↓
3. Implémenter hook useCascadingEntityCreation
   ↓
4. Modifier CommuneCombobox (recherche uniquement)
   ↓
5. Modifier QuarterCombobox (recherche uniquement)
   ↓
6. Intégrer useCascadingEntityCreation dans Step2
   ↓
7. Écrire tests (unitaires, intégration, E2E)
   ↓
8. Tests locaux passent ✅
   ↓
9. Commit et push
   ↓
10. PR vers develop
    ↓
11. CI vert ✅
    ↓
12. Merge vers develop
    ↓
13. Déploiement préprod automatique
    ↓
14. Tests E2E préprod ✅ (OBLIGATOIRE)
    ↓
15. PR vers main
    ↓
16. CI vert ✅
    ↓
17. Merge vers main
    ↓
18. Déploiement prod automatique
    ↓
19. Feature ✅ Réalisée
```

---

**Note** : Ce workflow doit être suivi étape par étape. Chaque étape doit être validée avant de passer à la suivante.
