# Refactoring — Migration References (Companies, Professions) vers domains/

> Migration du module References (Companies, Professions) vers la structure `domains/infrastructure/references/`

---

## Objectif du Refactoring

Migrer le module References (Companies, Professions) de l'organisation actuelle (par type technique) vers l'organisation par domaines (DDD) : `domains/infrastructure/references/`.

---

## État Actuel (BEFORE)

### Structure actuelle
```
src/
├── db/                          # Legacy database operations
│   ├── company.db.ts
│   └── profession.db.ts
├── services/suggestions/
│   └── CompanySuggestionsService.ts
├── hooks/
│   ├── useCompany.ts
│   ├── useCompanySuggestions.ts
│   ├── useCompanyCacheManager.ts
│   ├── useCompaniesQuery.ts
│   ├── useProfessions.ts
│   └── useJobs.ts
├── hooks/company/
│   ├── useCompanySuggestions.ts
│   └── useCompanyCacheManager.ts
├── components/company/
│   └── CompanyList.tsx
├── components/company-form/
│   ├── CompanyCombobox.tsx
│   ├── AddCompanyModal.tsx
│   ├── CompanySuggestionsDropdown.tsx
│   └── CompanyNameForm.tsx
├── components/profession-form/
│   ├── ProfessionCombobox.tsx
│   └── AddProfessionModal.tsx
├── components/jobs/
│   └── JobsList.tsx
├── components/memberships/
│   └── CompanyProfessionFields.tsx
├── components/providers/
│   └── CompanyCacheProvider.tsx
├── mediators/
│   └── CompanyFormMediator.ts
├── factories/
│   └── CompanyFormMediatorFactory.ts
├── schemas/
│   └── company.schema.ts
└── types/types.ts
    └── (interfaces: Company, Profession, CompanySearchResult, ProfessionSearchResult)
```

### Imports actuels
- Database : `@/db/company.db`, `@/db/profession.db`
- Services : `@/services/suggestions/CompanySuggestionsService`
- Hooks : `@/hooks/useCompany`, `@/hooks/useProfessions`, etc.
- Components : `@/components/company/...`, `@/components/profession-form/...`, `@/components/jobs/...`
- Schemas : `@/schemas/company.schema`
- Types : `@/types/types`

---

## État Cible (AFTER)

### Structure cible
```
src/
└── domains/infrastructure/references/
    ├── entities/
    │   ├── company.types.ts          # Company, CompanySearchResult
    │   └── profession.types.ts      # Profession, ProfessionSearchResult
    ├── repositories/
    │   ├── CompanyRepository.ts
    │   ├── ICompanyRepository.ts
    │   ├── ProfessionRepository.ts
    │   └── IProfessionRepository.ts
    ├── services/
    │   ├── CompanyService.ts
    │   ├── ProfessionService.ts
    │   └── CompanySuggestionsService.ts
    ├── hooks/
    │   ├── useCompany.ts
    │   ├── useCompanies.ts
    │   ├── useCompanySuggestions.ts
    │   ├── useProfession.ts
    │   ├── useProfessions.ts
    │   └── index.ts
    ├── components/
    │   ├── CompanyList.tsx
    │   ├── ProfessionList.tsx (JobsList renommé)
    │   ├── forms/
    │   │   ├── CompanyCombobox.tsx
    │   │   ├── AddCompanyModal.tsx
    │   │   ├── ProfessionCombobox.tsx
    │   │   └── AddProfessionModal.tsx
    │   └── providers/
    │       └── CompanyCacheProvider.tsx
    ├── schemas/
    │   ├── company.schema.ts
    │   └── profession.schema.ts
    ├── utils/
    │   └── normalizeName.ts         # Fonction de normalisation partagée
    └── __tests__/
        ├── repositories/
        ├── services/
        └── hooks/
```

### Imports cibles
- Repositories : `@/domains/infrastructure/references/repositories/...`
- Services : `@/domains/infrastructure/references/services/...`
- Hooks : `@/domains/infrastructure/references/hooks/...`
- Components : `@/domains/infrastructure/references/components/...`
- Schemas : `@/domains/infrastructure/references/schemas/...`
- Entities : `@/domains/infrastructure/references/entities/...`
- Utils : `@/domains/infrastructure/references/utils/...`

---

## Plan de Migration

### Étape 1 : Créer la structure cible
- [ ] Créer `src/domains/infrastructure/references/`
- [ ] Créer les sous-dossiers : `entities/`, `repositories/`, `services/`, `hooks/`, `components/`, `schemas/`, `utils/`, `__tests__/`

### Étape 2 : Migrer les entities
- [ ] Créer `entities/company.types.ts` (Company, CompanySearchResult, CompanyAddress)
- [ ] Créer `entities/profession.types.ts` (Profession, ProfessionSearchResult)
- [ ] Extraire depuis `types/types.ts`

### Étape 3 : Créer les repositories
- [ ] Créer `ICompanyRepository.ts` et `CompanyRepository.ts` (migrer depuis `db/company.db.ts`)
- [ ] Créer `IProfessionRepository.ts` et `ProfessionRepository.ts` (migrer depuis `db/profession.db.ts`)
- [ ] Créer `utils/normalizeName.ts` (fonction partagée)

### Étape 4 : Migrer les services
- [ ] Migrer `CompanySuggestionsService.ts`
- [ ] Créer `CompanyService.ts` (logique métier pour companies)
- [ ] Créer `ProfessionService.ts` (logique métier pour professions)

### Étape 5 : Migrer les hooks
- [ ] Migrer `useCompany.ts`, `useCompaniesQuery.ts` → `useCompanies.ts`
- [ ] Migrer `useCompanySuggestions.ts`
- [ ] Migrer `useProfessions.ts`, `useJobs.ts` → `useProfessions.ts`
- [ ] Créer `hooks/index.ts`

### Étape 6 : Migrer les components
- [ ] Migrer `CompanyList.tsx`
- [ ] Migrer `JobsList.tsx` → `ProfessionList.tsx`
- [ ] Migrer les components de formulaires (`CompanyCombobox`, `AddCompanyModal`, etc.)
- [ ] Migrer `CompanyCacheProvider.tsx`

### Étape 7 : Migrer les schemas
- [ ] Migrer `company.schema.ts`
- [ ] Créer `profession.schema.ts` (si nécessaire)

### Étape 8 : Migrer les mediators (si nécessaire)
- [ ] Migrer `CompanyFormMediator.ts` ou intégrer dans le service
- [ ] Migrer `CompanyFormMediatorFactory.ts` ou supprimer si non nécessaire

### Étape 9 : Mettre à jour les factories
- [ ] Mettre à jour `RepositoryFactory` (ajouter `getCompanyRepository`, `getProfessionRepository`)
- [ ] Mettre à jour `ServiceFactory` (ajouter `getCompanyService`, `getProfessionService`)

### Étape 10 : Mettre à jour les imports dans l'application
- [ ] Chercher tous les imports `@/db/company.db`, `@/db/profession.db`
- [ ] Chercher tous les imports `@/hooks/useCompany`, `@/hooks/useProfessions`, etc.
- [ ] Chercher tous les imports `@/components/company/...`, `@/components/profession-form/...`, `@/components/jobs/...`
- [ ] Chercher tous les imports `@/services/suggestions/CompanySuggestionsService`
- [ ] Chercher les imports de types depuis `@/types/types` (Company, Profession, etc.)
- [ ] Remplacer tous les imports par les nouveaux chemins

### Étape 11 : Tests et vérifications
- [ ] Vérifier que tout compile (`pnpm typecheck`)
- [ ] Vérifier le linting (`pnpm lint`)
- [ ] Tests manuels (vérifier que les pages `/companies` et `/jobs` fonctionnent)
- [ ] Vérifier que les formulaires d'inscription fonctionnent (CompanyProfessionFields)
- [ ] Vérifier que les suggestions d'entreprises fonctionnent

### Étape 12 : Nettoyage
- [ ] Supprimer les anciens fichiers `db/company.db.ts`, `db/profession.db.ts` (après validation)
- [ ] Vérifier qu'aucun import ancien ne reste

---

## Références UML

- **Use cases** : `documentation/uml/use-cases/USE_CASES_COMPLETS.puml` (section References)
- **Diagramme de classes** : À créer si nécessaire

---

## Notes Techniques

### Dépendances
- Le module References est utilisé par plusieurs autres modules :
  - **Membership** : Champs entreprise/profession dans les formulaires d'inscription
  - **Member** : Informations d'entreprise et profession des membres
  - **Forms** : Combobox pour sélection d'entreprise/profession

### Points d'attention
- Les fichiers `db/company.db.ts` et `db/profession.db.ts` sont des fichiers legacy qui doivent être remplacés par des repositories
- Le système de cache d'entreprises (`CompanyCacheProvider`) doit être migré
- Les suggestions d'entreprises sont utilisées dans les formulaires d'inscription
- Les hooks `useJobs` et `useProfessions` font référence à la même entité (Profession)

### Fonctionnalités à préserver
- Recherche d'entreprise/profession par nom normalisé
- Suggestions lors de la recherche
- Pagination pour les listes
- Cache des entreprises pour améliorer les performances
- CRUD complet (Create, Read, Update, Delete)

---

## Checklist de Migration

- [ ] Structure créée
- [ ] Entities migrées
- [ ] Repositories créés
- [ ] Services migrés/créés
- [ ] Hooks migrés
- [ ] Components migrés
- [ ] Schemas migrés
- [ ] Utils créés
- [ ] Mediators migrés (si nécessaire)
- [ ] Imports internes mis à jour
- [ ] Factories mises à jour
- [ ] Imports externes mis à jour
- [ ] Tests compilent
- [ ] Tests manuels OK
- [ ] PR créée
- [ ] PR mergée
