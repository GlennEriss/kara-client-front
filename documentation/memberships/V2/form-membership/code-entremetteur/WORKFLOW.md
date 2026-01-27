# WORKFLOW — Code Entremetteur avec Autocomplétion

> **Objectif** : Implémenter la recherche avec autocomplétion pour le code entremetteur dans le formulaire d'ajout de membre (`/memberships/add`).

> **Référence** : Ce workflow suit le template général défini dans `documentation/general/WORKFLOW.md`

---

## 📋 Vue d'ensemble

### Contexte

**Problématique actuelle (V1)** :
- Champ texte simple demandant le format `XXXX.MK.XXXX`
- L'admin doit naviguer vers la liste des membres pour trouver le code
- Risques d'erreurs de copie et perte de temps (30-60 secondes)

**Solution proposée (V2)** :
- Composant de recherche avec autocomplétion (Combobox)
- Recherche en temps réel par nom/prénom via Algolia
- Sélection automatique du code entremetteur

### Use Case

**UC-MEM-FORM-002-V2** : Rechercher un membre entremetteur (autocomplétion)

**Acteurs** :
- **Admin KARA** : Utilisateur administrateur
- **Système** : Système de recherche (Algolia)

**Documentation UML** :
- Use case V2 : `documentation/memberships/V2/form-membership/code-entremetteur/uml/use-case-v2.puml`
- Diagramme d'activité : `documentation/memberships/V2/form-membership/code-entremetteur/uml/activite.puml`
- Diagramme de séquence : `documentation/memberships/V2/form-membership/code-entremetteur/uml/sequence.puml`

---

## 🌿 Branche Git

### Nom de la branche

```bash
feat/intermediary-code-search-autocomplete
```

**Convention** : `feat/<feature>` pour une nouvelle fonctionnalité

### Création de la branche

```bash
# Depuis develop
git checkout develop
git pull origin develop

# Créer la branche
git checkout -b feat/intermediary-code-search-autocomplete
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

- [x] Stratégie de cache (`cache-strategy.md`)
- [x] Règles Firestore (`firebase/firestore-regles.md`)
- [x] Indexes Firestore (`firebase/firestore-indexes.md`)
- [x] Plan de tests (`tests/README.md`)

### 1.4 Documentation principale

- [x] README principal (`README.md`)

**Action** : Vérifier que toute la documentation est à jour avant de commencer l'implémentation.

---

## 🏗️ Étape 2 — Architecture et Structure

### 2.1 Structure des fichiers à créer

```
src/domains/memberships/
├── components/
│   └── form/
│       └── IntermediaryCodeSearch.tsx    # Composant Combobox principal
├── hooks/
│   └── useIntermediaryCodeSearch.ts      # Hook React Query pour recherche
├── services/
│   └── IntermediaryCodeService.ts        # Service métier (optionnel)
└── utils/
    └── formatIntermediaryDisplay.ts      # Utilitaire de formatage
```

### 2.2 Dépendances existantes à utiliser

- **Algolia** : `MembersAlgoliaSearchService` (existant)
- **React Query** : `@tanstack/react-query` (existant)
- **shadcn/ui** : `Command`, `Popover` (existant)
- **react-hook-form** : Intégration avec le formulaire existant

### 2.3 Architecture respectée

```
┌─────────────────────────────────────────────────────────────┐
│              IdentityStepV2 (Composant)                     │
│              Utilise IntermediaryCodeSearch                 │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         useIntermediaryCodeSearch (Hook React Query)        │
│         Cache automatique avec staleTime: 5 min             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         MembersAlgoliaSearchService (Service existant)      │
│         Recherche dans index members-{env}                 │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Algolia (Service externe)                 │
│                    Index: members-{env}                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Étape 3 — Implémentation

### 3.1 Checklist d'implémentation

#### Phase 1 : Hook de recherche

- [ ] Créer `src/domains/memberships/hooks/useIntermediaryCodeSearch.ts`
  - [ ] Utiliser `useQuery` de React Query
  - [ ] Clé de cache : `['intermediary-code-search', { query, filters }]`
  - [ ] Configuration : `staleTime: 5 min`, `gcTime: 10 min`
  - [ ] Debounce : 300ms (dans le composant)
  - [ ] Filtre automatique : `isActive: true`
  - [ ] Limite : 10 résultats (`hitsPerPage: 10`)

#### Phase 2 : Utilitaire de formatage

- [ ] Créer `src/domains/memberships/utils/formatIntermediaryDisplay.ts`
  - [ ] Fonction `formatIntermediaryDisplay(member: User): string`
  - [ ] Format : `"Nom Prénom (Code)"`
  - [ ] Gestion du code manquant

#### Phase 3 : Composant Combobox

- [ ] Créer `src/domains/memberships/components/form/IntermediaryCodeSearch.tsx`
  - [ ] Utiliser `Popover` + `Command` de shadcn/ui
  - [ ] Intégration avec `react-hook-form`
  - [ ] États : initial, recherche, chargement, résultats, sélectionné, erreur
  - [ ] Animations : fade-in, zoom-in pour validation
  - [ ] Accessibilité : ARIA labels, navigation clavier
  - [ ] `data-testid` : Tous les IDs documentés dans `ui/test-ids.md`

#### Phase 4 : Intégration dans IdentityStepV2

- [ ] Remplacer le champ `Input` actuel par `IntermediaryCodeSearch`
- [ ] Conserver la validation Zod existante
- [ ] Vérifier que le formulaire fonctionne toujours

### 3.2 Design System

**Couleurs** :
- Bordure par défaut : `border-rose-200`
- Bordure hover : `border-rose-400`
- Bordure focus : `border-rose-500`
- Bordure sélectionné : `border-[#CBB171]` (KARA Gold)
- Fond sélectionné : `bg-[#CBB171]/5`

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
- [ ] Icône validation : `w-4 h-4` (16px)

**Tablette (640px - 1024px)** :
- [ ] Largeur : 100% du conteneur
- [ ] Padding horizontal : `px-4` (16px)
- [ ] Label : `text-xs sm:text-sm` (12px → 14px)
- [ ] Texte hint : `text-xs sm:text-sm` (12px → 14px)
- [ ] Liste déroulante : `max-h-[300px]` (300px)
- [ ] Padding items : `px-3 py-2` (normal)
- [ ] Icône validation : `w-5 h-5` (20px)

**Desktop (> 1024px)** :
- [ ] Largeur : 100% (ou max-width si défini)
- [ ] Padding horizontal : `px-4` (16px)
- [ ] Label : `text-sm` (14px)
- [ ] Texte hint : `text-xs` (12px)
- [ ] Liste déroulante : `max-h-[300px]` avec scroll si nécessaire
- [ ] Padding items : `px-3 py-2` (normal)
- [ ] Icône validation : `w-5 h-5` (20px)

**Voir** : `ui/README.md` section 8 pour les spécifications complètes

---

## 🧪 Étape 4 — Tests

### 4.1 Tests unitaires

**Fichiers à créer** :

- [ ] `src/domains/memberships/hooks/__tests__/useIntermediaryCodeSearch.test.ts`
  - [ ] Recherche activée (query >= 2 caractères)
  - [ ] Recherche désactivée (query < 2 caractères)
  - [ ] Debounce fonctionne
  - [ ] Cache React Query
  - [ ] Recherche identique utilise le cache
  - [ ] Gestion erreurs Algolia

- [ ] `src/domains/memberships/utils/__tests__/formatIntermediaryDisplay.test.ts`
  - [ ] Format standard : "Nom Prénom (Code)"
  - [ ] Code manquant
  - [ ] Caractères spéciaux

- [ ] `src/domains/memberships/components/form/__tests__/IntermediaryCodeSearch.test.tsx`
  - [ ] Affichage initial
  - [ ] Recherche et affichage résultats
  - [ ] Sélection d'un membre
  - [ ] Validation format
  - [ ] États d'erreur

**Commandes** :
```bash
pnpm test --run useIntermediaryCodeSearch
pnpm test --run formatIntermediaryDisplay
pnpm test --run IntermediaryCodeSearch
```

### 4.2 Tests d'intégration

**Fichier à créer** :

- [ ] `src/domains/memberships/__tests__/integration/intermediary-code-search.integration.test.tsx`
  - [ ] Intégration dans `IdentityStepV2`
  - [ ] Recherche et sélection fonctionnent
  - [ ] Validation du formulaire
  - [ ] Navigation étape suivante

**Commande** :
```bash
pnpm test --run intermediary-code-search.integration
```

### 4.3 Tests E2E

**Fichier à créer** :

- [ ] `e2e/intermediary-code-search.spec.ts`
  - [ ] E2E-ICS-01 : Recherche et sélection complète
  - [ ] E2E-ICS-02 : Recherche sans résultat
  - [ ] E2E-ICS-03 : Validation format manuel
  - [ ] E2E-ICS-04 : Effacement sélection
  - [ ] E2E-ICS-05 : Navigation clavier

**Commandes** :
```bash
# Tests E2E locaux (avec Firebase Cloud dev)
pnpm dev  # Dans un terminal
pnpm test:e2e intermediary-code-search  # Dans un autre terminal

# Tests E2E préprod (OBLIGATOIRE avant prod)
NEXT_PUBLIC_APP_ENV=preprod pnpm test:e2e:preprod intermediary-code-search
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
pnpm test:e2e intermediary-code-search
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
- [ ] Requêtes avec filtres fonctionnent

**Action** : Vérifier `firestore.rules` (normalement pas de modification nécessaire)

**Documentation** : `firebase/firestore-regles.md`

### 5.2 Indexes Firestore

**Vérification** :
- [ ] Index Algolia `members-{env}` existe et est à jour
- [ ] Champs `firstName`, `lastName`, `matricule` indexés dans Algolia

**Indexes Firestore (fallback optionnel)** :
- [ ] Si fallback Firestore implémenté, ajouter les index dans `firestore.indexes.json`
- [ ] Index pour recherche par `firstName` + `isActive`
- [ ] Index pour recherche par `lastName` + `isActive`
- [ ] Index pour recherche par `matricule` + `isActive`

**Déploiement** :
```bash
# Déployer sur dev
firebase use dev
firebase deploy --only firestore:indexes

# Vérifier dans Firebase Console > Firestore > Indexes
```

**Documentation** : `firebase/firestore-indexes.md`

**Note** : Les index Firestore sont **optionnels** si Algolia est toujours disponible. Recommandés pour la résilience.

---

## 📦 Étape 6 — Commits et Push

### 6.1 Convention de commits

**Format** :
```
feat(memberships): add intermediary code search with autocomplete
```

**Exemples de commits** :
```bash
# Hook de recherche
git commit -m "feat(memberships): add useIntermediaryCodeSearch hook with React Query cache"

# Composant Combobox
git commit -m "feat(memberships): add IntermediaryCodeSearch component with shadcn/ui"

# Intégration
git commit -m "feat(memberships): integrate IntermediaryCodeSearch in IdentityStepV2"

# Tests
git commit -m "test(memberships): add tests for intermediary code search"

# Documentation
git commit -m "docs(memberships): update intermediary code search documentation"
```

### 6.2 Push vers la branche

```bash
git push -u origin feat/intermediary-code-search-autocomplete
```

---

## 🔀 Étape 7 — Pull Request vers `develop`

### 7.1 Checklist PR

**Documentation** :
- [x] Use case V2 documenté dans `uml/use-case-v2.puml`
- [x] Diagrammes UML complets (activité, séquence)
- [x] Documentation UI/UX complète
- [x] Documentation technique (cache, Firebase, tests)

**Code** :
- [ ] Respect de l'architecture (Hooks → Services → Repositories)
- [ ] Design System KARA respecté
- [ ] Responsive (mobile < 640px, tablette 640-1024px, desktop > 1024px) - Voir `ui/README.md` section 8
- [ ] Validation Zod conservée
- [ ] Gestion des erreurs
- [ ] Loading states

**Tests** :
- [ ] Tests unitaires écrits et passent
- [ ] Tests d'intégration écrits et passent
- [ ] Tests E2E écrits et passent localement
- [ ] Tests E2E responsive (mobile 375px, tablette 768px, desktop 1280px) - Voir `tests/README.md` E2E-ICS-06/07/08
- [ ] Tous les `data-testid` implémentés

**Firebase** :
- [ ] Règles Firestore vérifiées (pas de modification nécessaire normalement)
- [ ] Indexes Firestore ajoutés si fallback implémenté
- [ ] Index Algolia vérifié

**CI** :
- [ ] **CI vert (tous les tests passent, incluant E2E)** ← **OBLIGATOIRE**

### 7.2 Description de la PR

**Template** :
```markdown
## 🎯 Objectif

Améliorer l'expérience utilisateur lors de la saisie du code entremetteur dans le formulaire d'ajout de membre en remplaçant le champ texte simple par un composant de recherche avec autocomplétion.

## 📝 Changements

### Nouveaux fichiers
- `src/domains/memberships/hooks/useIntermediaryCodeSearch.ts` - Hook React Query avec cache
- `src/domains/memberships/components/form/IntermediaryCodeSearch.tsx` - Composant Combobox
- `src/domains/memberships/utils/formatIntermediaryDisplay.ts` - Utilitaire de formatage

### Modifications
- `src/domains/auth/registration/components/steps/IdentityStepV2.tsx` - Intégration du nouveau composant

### Tests
- Tests unitaires pour le hook
- Tests unitaires pour le composant
- Tests d'intégration
- Tests E2E Playwright

## 🧪 Tests

- [x] Tests unitaires passent (`pnpm test --run`)
- [x] Tests E2E passent localement (`pnpm test:e2e`)
- [x] Build réussi (`pnpm build`)

## 📚 Documentation

- [x] Documentation UML complète
- [x] Documentation UI/UX avec wireframes
- [x] Documentation technique (cache, Firebase)
- [x] Plan de tests

## 🔗 Références

- Documentation : `documentation/memberships/V2/form-membership/code-entremetteur/`
- Use case : `uml/use-case-v2.puml`
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
     - Firestore Rules (si modifiées)
     - Firestore Indexes (si ajoutés)
     - Storage Rules (si modifiées)
     - Cloud Functions (si modifiées)

### 8.2 Validation préprod (smoke test)

**Actions** :
- [ ] Accéder à `/memberships/add` en préprod
- [ ] Vérifier que le composant s'affiche correctement
- [ ] Tester la recherche "Jean" → Vérifier résultats
- [ ] Sélectionner un membre → Vérifier validation
- [ ] Vérifier que l'étape 1 peut être validée

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
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false pnpm test:e2e:preprod intermediary-code-search
```

### 8.3.3 Checklist des tests E2E en préprod

- [ ] **E2E-ICS-01** : Recherche et sélection complète
- [ ] **E2E-ICS-02** : Recherche sans résultat
- [ ] **E2E-ICS-03** : Validation format manuel
- [ ] **E2E-ICS-04** : Effacement sélection
- [ ] **E2E-ICS-05** : Navigation clavier

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
- [x] Documentation technique (cache, Firebase)
- [x] Plan de tests complet

**Code** :
- [ ] Hook `useIntermediaryCodeSearch` créé et testé
- [ ] Composant `IntermediaryCodeSearch` créé et testé
- [ ] Intégration dans `IdentityStepV2` fonctionnelle
- [ ] Respect de l'architecture (Hooks → Services → Repositories)
- [ ] Design System KARA respecté
- [ ] Responsive (mobile < 640px, tablette 640-1024px, desktop > 1024px) - Voir `ui/README.md` section 8
- [ ] Validation Zod conservée
- [ ] Gestion des erreurs
- [ ] Loading states

**Tests** :
- [ ] Tests unitaires écrits et passent (`pnpm test --run`)
- [ ] Tests d'intégration écrits et passent
- [ ] Tests E2E écrits et passent localement (`pnpm test:e2e`)
- [ ] Tests E2E responsive (mobile 375px, tablette 768px, desktop 1280px) - Voir `tests/README.md` E2E-ICS-06/07/08
- [ ] **Tests E2E passent en préprod** (OBLIGATOIRE)
- [ ] Tous les `data-testid` implémentés

**Firebase** :
- [ ] Règles Firestore vérifiées (pas de modification nécessaire normalement)
- [ ] Indexes Firestore ajoutés si fallback implémenté
- [ ] Index Algolia vérifié

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

- **staleTime** : 5 minutes (bon compromis fraîcheur/performance)
- **gcTime** : 10 minutes (garde les recherches récentes)
- **Vérifier** : Recherche "Glenn" → Efface → "Glenn" = Cache HIT ✅

### Performance

- **Debounce** : 300ms pour éviter les recherches multiples
- **Limite résultats** : 10 maximum (Algolia `hitsPerPage: 10`)
- **Cache** : Évite les recherches redondantes

### Accessibilité

- **ARIA** : `role="combobox"`, `aria-expanded`, `aria-controls`
- **Navigation clavier** : Flèches, Entrée, Echap
- **Focus visible** : Ring de focus sur l'input

### Responsive

- **Mobile (< 640px)** : Largeur 100%, padding `px-3`, texte `text-xs`, liste `max-h-[250px]`
- **Tablette (640-1024px)** : Largeur 100%, padding `px-4`, texte `text-xs sm:text-sm`, liste `max-h-[300px]`
- **Desktop (> 1024px)** : Largeur 100% (ou max-width), padding `px-4`, texte `text-sm`, liste `max-h-[300px]`

**Voir** : `ui/README.md` section 8 pour les spécifications détaillées

---

## 📚 Références

### Documentation

- **Workflow général** : `documentation/general/WORKFLOW.md`
- **Documentation principale** : `documentation/memberships/V2/form-membership/code-entremetteur/README.md`
- **UML** : `documentation/memberships/V2/form-membership/code-entremetteur/uml/`
- **UI/UX** : `documentation/memberships/V2/form-membership/code-entremetteur/ui/`
- **Cache** : `documentation/memberships/V2/form-membership/code-entremetteur/cache-strategy.md`
- **Firebase** : `documentation/memberships/V2/form-membership/code-entremetteur/firebase/`
- **Tests** : `documentation/memberships/V2/form-membership/code-entremetteur/tests/`

### Architecture

- **Architecture générale** : `documentation/architecture/ARCHITECTURE.md`
- **Design System** : `documentation/design-system/DESIGN_SYSTEM_COULEURS_KARA.md`

### Code existant

- **IdentityStepV2** : `src/domains/auth/registration/components/steps/IdentityStepV2.tsx`
- **MembersAlgoliaSearchService** : `src/services/search/MembersAlgoliaSearchService.ts`
- **Combobox existants** : `src/domains/infrastructure/references/components/forms/CompanyCombobox.tsx`

---

## 🎯 Résumé du workflow

```
1. Documentation ✅ (déjà complétée)
   ↓
2. Créer branche feat/intermediary-code-search-autocomplete
   ↓
3. Implémenter hook useIntermediaryCodeSearch
   ↓
4. Implémenter composant IntermediaryCodeSearch
   ↓
5. Intégrer dans IdentityStepV2
   ↓
6. Écrire tests (unitaires, intégration, E2E)
   ↓
7. Tests locaux passent ✅
   ↓
8. Commit et push
   ↓
9. PR vers develop
   ↓
10. CI vert ✅
    ↓
11. Merge vers develop
    ↓
12. Déploiement préprod automatique
    ↓
13. Tests E2E préprod ✅ (OBLIGATOIRE)
    ↓
14. PR vers main
    ↓
15. CI vert ✅
    ↓
16. Merge vers main
    ↓
17. Déploiement prod automatique
    ↓
18. Feature ✅ Réalisée
```

---

**Note** : Ce workflow doit être suivi étape par étape. Chaque étape doit être validée avant de passer à la suivante.
