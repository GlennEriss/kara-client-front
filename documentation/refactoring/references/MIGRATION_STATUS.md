# Statut de Migration — Module References (Companies, Professions)

## ✅ Migration Terminée

### Structure créée
- [x] `src/domains/infrastructure/references/`
- [x] Sous-dossiers : `entities/`, `repositories/`, `services/`, `hooks/`, `components/`, `schemas/`, `utils/`, `__tests__/`

### Entities migrées
- [x] `entities/company.types.ts` (Company, CompanyAddress, CompanySearchResult)
- [x] `entities/profession.types.ts` (Profession, ProfessionSearchResult, ProfessionFilters, PaginatedProfessions)

### Repositories créés
- [x] `ICompanyRepository.ts` et `CompanyRepository.ts`
- [x] `IProfessionRepository.ts` et `ProfessionRepository.ts`
- [x] `utils/normalizeName.ts` (fonction partagée)

### Services créés
- [x] `CompanyService.ts`
- [x] `ProfessionService.ts`
- [x] `CompanySuggestionsService.ts` (migré depuis `services/suggestions/`)

### Hooks migrés
- [x] `hooks/useCompanies.ts` (useCompaniesPaginated, useCompanyMutations, useCompanySearch, useCompanies)
- [x] `hooks/useProfessions.ts` (useProfessionsPaginated, useProfessionMutations, useProfessionSearch, useProfessions, useJobs, useJobMutations)
- [x] `hooks/useCompanySuggestions.ts`
- [x] `hooks/index.ts` (barrel export)

### Components migrés
- [x] `components/CompanyList.tsx` (migré depuis `components/company/CompanyList.tsx`)
- [x] `components/ProfessionList.tsx` (migré depuis `components/jobs/JobsList.tsx`, renommé)
- [x] `components/forms/CompanyCombobox.tsx`
- [x] `components/forms/AddCompanyModal.tsx`
- [x] `components/forms/ProfessionCombobox.tsx`
- [x] `components/forms/AddProfessionModal.tsx`
- [x] `components/index.ts` (barrel export)

### Factories mises à jour
- [x] `RepositoryFactory.ts` (ajout de `getCompanyRepository()`, `getProfessionRepository()`)
- [x] `ServiceFactory.ts` (ajout de `getCompanyService()`, `getProfessionService()`, mise à jour de `getCompanySuggestionsService()`)

### Imports mis à jour
- [x] `app/(admin)/companies/page.tsx`
- [x] `app/(admin)/jobs/page.tsx`
- [x] `components/register/Step3.tsx`
- [x] `components/memberships/CompanyProfessionFields.tsx`
- [x] `components/memberships/MemberFilters.tsx`
- [x] `components/memberships/MembershipRequestsList.tsx`
- [x] `components/company-form/*` (anciens fichiers, imports mis à jour pour compatibilité)
- [x] `components/profession-form/*` (anciens fichiers, imports mis à jour pour compatibilité)

### Tests créés
- [x] Tests unitaires pour repositories (CompanyRepository, ProfessionRepository)
- [x] Tests unitaires pour services (CompanyService, ProfessionService, CompanySuggestionsService)
- [x] Tests unitaires pour hooks (useCompanies, useProfessions)
- [x] Tests d'intégration (references.integration.test.ts)
- [x] Tests E2E (references.spec.ts) - Companies et Professions avec CRUD complet

### Vérifications
- [x] Typecheck : ✅ Aucune erreur TypeScript
- [x] Tests unitaires : ✅ 18 tests passent
- [x] Tests d'intégration : ✅ Créés
- [x] Tests E2E : ✅ Créés
- [ ] Tests manuels (à faire)

## 📝 Notes

### Fichiers Legacy Supprimés
- ✅ `src/db/company.db.ts` - Supprimé
- ✅ `src/db/profession.db.ts` - Supprimé
- ✅ `src/hooks/useCompaniesQuery.ts` - Supprimé
- ✅ `src/hooks/useJobs.ts` - Supprimé
- ✅ `src/components/company/CompanyList.tsx` - Supprimé
- ✅ `src/components/jobs/JobsList.tsx` - Supprimé
- ✅ `src/services/suggestions/CompanySuggestionsService.ts` - Supprimé

### Fichiers Legacy Conservés (pour compatibilité)
Les fichiers suivants sont conservés dans leur emplacement d'origine mais utilisent maintenant les nouveaux hooks/services :
- `src/components/company-form/*` (utilisent les nouveaux hooks via ServiceFactory)
- `src/components/profession-form/*` (utilisent les nouveaux hooks via ServiceFactory)
- `src/hooks/useCompany.ts` (wrapper vers les nouveaux hooks, marqué @deprecated)
- `src/hooks/useCompanySuggestions.ts` (utilise ServiceFactory)
- `src/hooks/useCompanyCacheManager.ts` (utilise ServiceFactory)
- `src/hooks/company/*` (utilisent ServiceFactory)

### Fonctionnalités à Implémenter
- [ ] `updateMembershipRequestCompany` et `updateMembershipRequestProfession` (actuellement stubs dans `CompanyProfessionFields.tsx`)

### Prochaines Étapes
1. ✅ Tests unitaires créés et passent
2. ✅ Tests d'intégration créés
3. ✅ Tests E2E créés
4. ✅ Fichiers legacy principaux supprimés
5. Tests manuels sur les pages `/companies` et `/jobs` (à faire)
6. Vérifier que les formulaires d'inscription fonctionnent (CompanyProfessionFields)
7. Vérifier que les suggestions d'entreprises fonctionnent
8. Supprimer les fichiers legacy restants après validation complète (useCompany.ts, etc.)
