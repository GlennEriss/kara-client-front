# Plan de Migration vers la Structure Domains/ — KARA

> Plan progressif pour migrer de l'organisation actuelle (par type) vers une organisation par domaines (DDD)

---

## 📊 État Actuel vs État Cible

### Structure Actuelle
```
src/
  repositories/    # Tous les repositories (par module)
  services/        # Tous les services (par module)
  hooks/           # Tous les hooks (par module)
  components/      # Tous les composants (par module)
  schemas/         # Tous les schemas
  factories/       # Factories
  mediators/       # Médiateurs
  db/              # Anciens fichiers db (legacy)
  constantes/      # Constantes
  types/           # Types
  firebase/        # Configuration Firebase
  app/             # Next.js App Router
```

### Structure Cible (Domains/)
```
src/
  domains/
    membership/
      entities/
      repositories/
      services/
      hooks/
      components/
      schemas/
      __tests__/
    financial/
      caisse-speciale/
      caisse-imprevue/
      credit-speciale/
      placement/
    complementary/
      vehicle/
      charity/
    infrastructure/
      geography/
      documents/
      notifications/
      references/
  shared/
    ui/
    factories/
    providers/
    constants/
    types/
    utils/
  app/
  firebase/
```

---

## 🎯 Objectifs de la Migration

1. ✅ Organiser le code par domaine métier (DDD)
2. ✅ Améliorer la maintenabilité et la scalabilité
3. ✅ Faciliter les tests (tests près du code)
4. ✅ Clarifier les dépendances entre modules
5. ✅ Respecter le workflow défini dans `WORKFLOW.md`

---

## 📋 Mapping des Modules vers Domaines

### Domaine MEMBERSHIP
**Modules actuels** :
- `repositories/members/`
- `repositories/admins/`
- `services/membership/`
- `services/member/`
- `hooks/membership/`
- `hooks/member/`
- `components/memberships/`
- `components/member/`
- `components/register/`
- `schemas/membership.schema.ts`
- `schemas/member.schema.ts`
- `schemas/register.schema.ts`

**Destination** :
```
domains/membership/
  entities/          # Types/interfaces (depuis types/types.ts)
  repositories/      # MemberRepository, AdminRepository
  services/          # MembershipService, MemberService
  hooks/             # useMemberships, useMember, etc.
  components/        # MembershipCard, MemberProfile, RegisterForm
  schemas/           # membership.schema.ts, member.schema.ts
```

### Domaine FINANCIAL — Caisse Spéciale
**Modules actuels** :
- `repositories/caisse-speciale/` (si existe)
- `services/caisse-speciale/`
- `hooks/caisse-speciale/`
- `components/caisse-speciale/`
- `schemas/caisse-speciale.schema.ts`

**Destination** :
```
domains/financial/caisse-speciale/
  entities/
  repositories/
  services/
  hooks/
  components/
  schemas/
```

### Domaine FINANCIAL — Caisse Imprévue
**Modules actuels** :
- `repositories/caisse-imprevu/`
- `services/caisse-imprevue/`
- `hooks/caisse-imprevue/`
- `components/caisse-imprevue/`
- `schemas/caisse-imprevue.schema.ts`

**Destination** :
```
domains/financial/caisse-imprevue/
  entities/
  repositories/
  services/
  hooks/
  components/
  schemas/
```

### Domaine FINANCIAL — Crédit Spéciale
**Modules actuels** :
- `repositories/credit-speciale/` (si existe)
- `services/credit-speciale/`
- `hooks/credit-speciale/`
- `components/credit-speciale/`
- `schemas/credit-speciale.schema.ts`

**Destination** :
```
domains/financial/credit-speciale/
  entities/
  repositories/
  services/
  hooks/
  components/
  schemas/
```

### Domaine FINANCIAL — Placement
**Modules actuels** :
- `repositories/placement/`
- `services/placement/`
- `hooks/placement/`
- `components/placement/`
- `schemas/placement.schema.ts`

**Destination** :
```
domains/financial/placement/
  entities/
  repositories/
  services/
  hooks/
  components/
  schemas/
```

### Domaine COMPLEMENTARY — Véhicule
**Modules actuels** :
- `repositories/vehicule/`
- `services/vehicule/`
- `hooks/vehicule/`
- `components/vehicule/`
- `schemas/vehicule.schema.ts`

**Destination** :
```
domains/complementary/vehicle/
  entities/
  repositories/
  services/
  hooks/
  components/
  schemas/
```

### Domaine COMPLEMENTARY — Bienfaiteur
**Modules actuels** :
- `repositories/bienfaiteur/` (si existe)
- `services/bienfaiteur/`
- `hooks/bienfaiteur/`
- `components/bienfaiteur/`
- `schemas/bienfaiteur.schema.ts`

**Destination** :
```
domains/complementary/charity/
  entities/
  repositories/
  services/
  hooks/
  components/
  schemas/
```

### Domaine INFRASTRUCTURE — Géographie
**Modules actuels** :
- `repositories/geographie/`
- `services/geographie/`
- `hooks/geographie/`
- `components/geographie/`
- `schemas/geographie.schema.ts`

**Destination** :
```
domains/infrastructure/geography/
  entities/
  repositories/
  services/
  hooks/
  components/
  schemas/
```

### Domaine INFRASTRUCTURE — Documents
**Modules actuels** :
- `repositories/documents/`
- `services/documents/`
- `hooks/documents/`
- `components/documents/` (si existe)
- `schemas/documents.schema.ts`

**Destination** :
```
domains/infrastructure/documents/
  entities/
  repositories/
  services/
  hooks/
  components/
  schemas/
```

### Domaine INFRASTRUCTURE — Notifications
**Modules actuels** :
- `repositories/notifications/`
- `services/notifications/`
- `hooks/notifications/`
- `components/notifications/` (si existe)
- `schemas/notifications.schema.ts`

**Destination** :
```
domains/infrastructure/notifications/
  entities/
  repositories/
  services/
  hooks/
  components/
  schemas/
```

### Domaine INFRASTRUCTURE — Référentiels
**Modules actuels** :
- `repositories/companies/` (si existe)
- `repositories/professions/` (si existe)
- `services/company/`
- `hooks/company/`
- `components/company/`
- `components/jobs/`
- `schemas/company.schema.ts`
- `schemas/profession.schema.ts`

**Destination** :
```
domains/infrastructure/references/
  entities/
  repositories/      # CompanyRepository, ProfessionRepository
  services/          # CompanyService, ProfessionService
  hooks/             # useCompanies, useProfessions
  components/        # CompanyCard, ProfessionCard
  schemas/           # company.schema.ts, profession.schema.ts
```

### SHARED (Code partagé)
**Modules actuels** :
- `components/ui/` → `shared/ui/`
- `factories/` → `shared/factories/`
- `providers/` → `shared/providers/`
- `constantes/` → `shared/constants/`
- `types/types.ts` → `shared/types/` (partagés uniquement)
- `lib/` → `shared/lib/`
- `utils/` → `shared/utils/`
- `mediators/` → À analyser (peut rester dans shared ou aller dans domains)

---

## 🚀 Plan de Migration Progressif

### Phase 1 : Préparation (1-2 jours)

#### Étape 1.1 : Créer la structure des dossiers
```bash
# Créer la structure domains/
mkdir -p src/domains/{membership,financial,complementary,infrastructure}/{entities,repositories,services,hooks,components,schemas,__tests__}
mkdir -p src/domains/financial/{caisse-speciale,caisse-imprevue,credit-speciale,placement}/{entities,repositories,services,hooks,components,schemas,__tests__}
mkdir -p src/domains/complementary/{vehicle,charity}/{entities,repositories,services,hooks,components,schemas,__tests__}
mkdir -p src/domains/infrastructure/{geography,documents,notifications,references}/{entities,repositories,services,hooks,components,schemas,__tests__}

# Créer shared/
mkdir -p src/shared/{ui,factories,providers,constants,types,utils,lib}

# Déplacer ce qui est déjà partagé
mv src/components/ui src/shared/ui
mv src/factories src/shared/factories
mv src/providers src/shared/providers
mv src/constantes src/shared/constants
mv src/lib src/shared/lib
mv src/utils src/shared/utils
```

#### Étape 1.2 : Analyser les dépendances
- [ ] Créer un mapping complet des imports
- [ ] Identifier les dépendances entre modules
- [ ] Documenter les dépendances circulaires (si existantes)

**Script d'analyse** (à créer) :
```typescript
// scripts/analyze-imports.ts
// Analyser tous les imports pour identifier les dépendances
```

#### Étape 1.3 : Créer un fichier de migration par domaine
- [ ] `documentation/migration/MIGRATION_MEMBERSHIP.md`
- [ ] `documentation/migration/MIGRATION_FINANCIAL.md`
- [ ] `documentation/migration/MIGRATION_COMPLEMENTARY.md`
- [ ] `documentation/migration/MIGRATION_INFRASTRUCTURE.md`

---

### Phase 2 : Migration Infrastructure (Semaine 1)

**Pourquoi commencer par Infrastructure ?**
- Utilisé par tous les autres domaines
- Moins de dépendances externes
- Plus simple à migrer en premier

#### Étape 2.1 : Infrastructure — Geography

**Branche** : `refactor/migration-geography`

1. **Migrer les repositories** :
   ```bash
   # Créer les dossiers
   mkdir -p src/domains/infrastructure/geography/{repositories,entities}
   
   # Déplacer
   mv src/repositories/geographie/* src/domains/infrastructure/geography/repositories/
   ```

2. **Migrer les services** :
   ```bash
   mv src/services/geographie/* src/domains/infrastructure/geography/services/
   ```

3. **Migrer les hooks** :
   ```bash
   mv src/hooks/geographie/* src/domains/infrastructure/geography/hooks/
   ```

4. **Migrer les components** :
   ```bash
   mv src/components/geographie/* src/domains/infrastructure/geography/components/
   ```

5. **Migrer les schemas** :
   ```bash
   mv src/schemas/geographie.schema.ts src/domains/infrastructure/geography/schemas/
   ```

6. **Migrer les types/entities** :
   - Extraire les types liés à la géographie de `src/types/types.ts`
   - Créer `src/domains/infrastructure/geography/entities/geography.types.ts`

7. **Mettre à jour les imports** :
   - Chercher tous les imports de `@/repositories/geographie`
   - Remplacer par `@/domains/infrastructure/geography/repositories`
   - Répéter pour services, hooks, components, schemas

8. **Mettre à jour les factories** :
   - Mettre à jour `RepositoryFactory` et `ServiceFactory`

9. **Tests** :
   - [ ] Vérifier que tout compile
   - [ ] Tests manuels
   - [ ] Migrer les tests existants (si disponibles)

10. **Commit** :
    ```bash
    git add .
    git commit -m "refactor(infrastructure): migrate geography to domains structure"
    ```

#### Étape 2.2 : Infrastructure — Documents

**Branche** : `refactor/migration-documents`

Même processus que Geography.

#### Étape 2.3 : Infrastructure — Notifications

**Branche** : `refactor/migration-notifications`

Même processus que Geography.

#### Étape 2.4 : Infrastructure — References (Companies, Professions)

**Branche** : `refactor/migration-references`

Même processus, mais regrouper companies et professions.

---

### Phase 3 : Migration Complementary (Semaine 2)

#### Étape 3.1 : Complementary — Vehicle

**Branche** : `refactor/migration-vehicle`

**Note** : Renommer `vehicule` → `vehicle` pour cohérence.

#### Étape 3.2 : Complementary — Charity (Bienfaiteur)

**Branche** : `refactor/migration-charity`

**Note** : Renommer `bienfaiteur` → `charity` pour cohérence.

---

### Phase 4 : Migration Financial (Semaines 3-4)

#### Étape 4.1 : Financial — Placement

**Branche** : `refactor/migration-placement`

#### Étape 4.2 : Financial — Caisse Imprévue

**Branche** : `refactor/migration-caisse-imprevue`

#### Étape 4.3 : Financial — Crédit Spéciale

**Branche** : `refactor/migration-credit-speciale`

#### Étape 4.4 : Financial — Caisse Spéciale

**Branche** : `refactor/migration-caisse-speciale`

---

### Phase 5 : Migration Membership (Semaine 5)

**Branche** : `refactor/migration-membership`

**Complexité** : Plus complexe car utilisé partout.

1. Regrouper members, admins, membership-requests
2. Migrer register/ dans membership/
3. Vérifier toutes les dépendances

---

### Phase 6 : Nettoyage et Finalisation (Semaine 6)

#### Étape 6.1 : Nettoyer les dossiers vides
- [ ] Supprimer `src/repositories/` (si vide)
- [ ] Supprimer `src/services/` (si vide)
- [ ] Supprimer `src/hooks/` (si vide)
- [ ] Supprimer `src/components/` (si vide, sauf ui qui est dans shared)
- [ ] Supprimer `src/schemas/` (si vide)

#### Étape 6.2 : Migrer les fichiers legacy
- [ ] Analyser `src/db/` (anciens fichiers db)
- [ ] Migrer vers les repositories appropriés
- [ ] Supprimer `src/db/` une fois migré

#### Étape 6.3 : Mettre à jour les imports dans app/
- [ ] Mettre à jour tous les imports dans `src/app/`
- [ ] Vérifier que tout compile

#### Étape 6.4 : Mettre à jour la documentation
- [ ] Mettre à jour `documentation/architecture/ARCHITECTURE.md`
- [ ] Mettre à jour `WORKFLOW.md` si nécessaire
- [ ] Mettre à jour `CONTRIBUTING.md`

#### Étape 6.5 : Tests finaux
- [ ] Tests complets de l'application
- [ ] Vérifier qu'aucune régression
- [ ] Tests E2E (si disponibles)

---

## 📝 Template de Migration par Domaine

Pour chaque domaine, créer un fichier `documentation/migration/MIGRATION_<DOMAIN>.md` :

```markdown
# Migration — Domaine <DOMAIN>

## Mapping des fichiers

### Repositories
| Ancien | Nouveau |
|--------|---------|
| `src/repositories/<module>/*` | `src/domains/<domain>/<module>/repositories/*` |

### Services
| Ancien | Nouveau |
|--------|---------|
| `src/services/<module>/*` | `src/domains/<domain>/<module>/services/*` |

### Hooks
| Ancien | Nouveau |
|--------|---------|
| `src/hooks/<module>/*` | `src/domains/<domain>/<module>/hooks/*` |

### Components
| Ancien | Nouveau |
|--------|---------|
| `src/components/<module>/*` | `src/domains/<domain>/<module>/components/*` |

### Schemas
| Ancien | Nouveau |
|--------|---------|
| `src/schemas/<module>.schema.ts` | `src/domains/<domain>/<module>/schemas/<module>.schema.ts` |

## Checklist de migration

- [ ] Créer la structure de dossiers
- [ ] Déplacer les fichiers
- [ ] Mettre à jour les imports dans le domaine
- [ ] Mettre à jour les imports dans les autres domaines
- [ ] Mettre à jour les factories
- [ ] Mettre à jour les app/
- [ ] Tests compilent
- [ ] Tests manuels OK
- [ ] Commit et PR
```

---

## 🔧 Scripts Utiles pour la Migration

### Script 1 : Créer la structure

```bash
#!/bin/bash
# scripts/create-domains-structure.sh

DOMAINS=(
  "membership"
  "financial/caisse-speciale"
  "financial/caisse-imprevue"
  "financial/credit-speciale"
  "financial/placement"
  "complementary/vehicle"
  "complementary/charity"
  "infrastructure/geography"
  "infrastructure/documents"
  "infrastructure/notifications"
  "infrastructure/references"
)

for domain in "${DOMAINS[@]}"; do
  mkdir -p "src/domains/$domain/"{entities,repositories,services,hooks,components,schemas,__tests__}
done

mkdir -p src/shared/{ui,factories,providers,constants,types,utils,lib}
```

### Script 2 : Analyser les imports

```typescript
// scripts/analyze-imports.ts
// Analyser tous les imports pour identifier les dépendances
```

### Script 3 : Mettre à jour les imports (exemple pour un module)

```bash
#!/bin/bash
# scripts/update-imports.sh <module> <domain>

MODULE=$1
DOMAIN=$2

# Mettre à jour les imports dans tous les fichiers
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|@/repositories/$MODULE|@/domains/$DOMAIN/repositories|g" \
  -e "s|@/services/$MODULE|@/domains/$DOMAIN/services|g" \
  -e "s|@/hooks/$MODULE|@/domains/$DOMAIN/hooks|g" \
  -e "s|@/components/$MODULE|@/domains/$DOMAIN/components|g" \
  -e "s|@/schemas/$MODULE|@/domains/$DOMAIN/schemas|g" \
  {} \;
```

---

## ⚠️ Risques et Précautions

### Risques identifiés

1. **Dépendances circulaires** :
   - Vérifier avant de migrer
   - Résoudre les dépendances circulaires si nécessaire

2. **Imports cassés** :
   - Utiliser TypeScript pour détecter les erreurs
   - Tests après chaque migration

3. **Factories complexes** :
   - Mettre à jour les factories après chaque migration
   - Tester que l'injection fonctionne toujours

4. **Tests existants** :
   - Migrer les tests en même temps que le code
   - S'assurer qu'ils passent toujours

### Précautions

- ✅ **Une branche par domaine** : Ne pas tout migrer en une fois
- ✅ **Tests après chaque migration** : Vérifier qu'aucune régression
- ✅ **Commits fréquents** : Faciliter le rollback si nécessaire
- ✅ **Documentation à jour** : Mettre à jour les docs au fur et à mesure

---

## 📊 Suivi de la Migration

### Tableau de bord

Créer `documentation/migration/PROGRESS.md` :

```markdown
# Progression de la Migration

## Phase 1 : Infrastructure
- [x] Geography
- [ ] Documents
- [ ] Notifications
- [ ] References

## Phase 2 : Complementary
- [ ] Vehicle
- [ ] Charity

## Phase 3 : Financial
- [ ] Placement
- [ ] Caisse Imprévue
- [ ] Crédit Spéciale
- [ ] Caisse Spéciale

## Phase 4 : Membership
- [ ] Membership

## Phase 5 : Nettoyage
- [ ] Suppression des dossiers vides
- [ ] Migration des fichiers legacy
- [ ] Mise à jour documentation
```

---

## 🎯 Critères de Succès

La migration est réussie quand :

- [ ] Tous les domaines sont migrés
- [ ] Aucun fichier dans `src/repositories/`, `src/services/`, `src/hooks/`, `src/components/`, `src/schemas/` (sauf exceptions)
- [ ] Tous les tests passent
- [ ] L'application compile sans erreur
- [ ] Aucune régression fonctionnelle
- [ ] Documentation à jour
- [ ] Workflow respecté (voir `WORKFLOW.md`)

---

## 📚 Références

- `documentation/ARCHITECTURE_RESTRUCTURATION.md` : Architecture cible
- `documentation/WORKFLOW.md` : Workflow de développement
- `documentation/ARCHITECTURE_COMPARAISON.md` : Comparaison des architectures
- `documentation/architecture/ARCHITECTURE.md` : Architecture actuelle
