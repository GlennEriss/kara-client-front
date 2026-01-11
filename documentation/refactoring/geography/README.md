# Refactoring — Migration Geography vers domains/

> Migration du module Geography vers la structure `domains/infrastructure/geography/`

---

## Objectif du Refactoring

Migrer le module Geography de l'organisation actuelle (par type technique) vers l'organisation par domaines (DDD) : `domains/infrastructure/geography/`.

---

## État Actuel (BEFORE)

### Structure actuelle
```
src/
├── repositories/geographie/
│   ├── ProvinceRepository.ts
│   ├── DepartmentRepository.ts
│   ├── CommuneRepository.ts
│   ├── DistrictRepository.ts
│   └── QuarterRepository.ts
├── services/geographie/
│   └── GeographieService.ts
├── hooks/
│   └── useGeographie.ts
├── components/geographie/
│   ├── GeographieManagement.tsx
│   ├── ProvinceList.tsx
│   ├── DepartmentList.tsx
│   ├── CommuneList.tsx
│   ├── DistrictList.tsx
│   ├── QuarterList.tsx
│   └── modals/
│       ├── AddProvinceModal.tsx
│       ├── AddDepartmentModal.tsx
│       ├── AddCommuneModal.tsx
│       ├── AddDistrictModal.tsx
│       └── AddQuarterModal.tsx
├── schemas/
│   └── geographie.schema.ts
└── types/types.ts
    └── (interfaces: Province, Department, Commune, District, Quarter)
```

### Imports actuels
- Repositories : `@/repositories/geographie/...`
- Services : `@/services/geographie/GeographieService`
- Hooks : `@/hooks/useGeographie`
- Components : `@/components/geographie/...`
- Schemas : `@/schemas/geographie.schema`
- Types : `@/types/types`

---

## État Cible (AFTER)

### Structure cible
```
src/
└── domains/infrastructure/geography/
    ├── entities/
    │   └── geography.types.ts      # Types extraits de types/types.ts
    ├── repositories/
    │   ├── ProvinceRepository.ts
    │   ├── DepartmentRepository.ts
    │   ├── CommuneRepository.ts
    │   ├── DistrictRepository.ts
    │   └── QuarterRepository.ts
    ├── services/
    │   └── GeographieService.ts
    ├── hooks/
    │   └── useGeographie.ts
    ├── components/
    │   ├── GeographieManagement.tsx
    │   ├── ProvinceList.tsx
    │   ├── DepartmentList.tsx
    │   ├── CommuneList.tsx
    │   ├── DistrictList.tsx
    │   ├── QuarterList.tsx
    │   └── modals/
    │       ├── AddProvinceModal.tsx
    │       ├── AddDepartmentModal.tsx
    │       ├── AddCommuneModal.tsx
    │       ├── AddDistrictModal.tsx
    │       └── AddQuarterModal.tsx
    └── schemas/
        └── geographie.schema.ts
```

### Imports cibles
- Entities : `@/domains/infrastructure/geography/entities`
- Repositories : `@/domains/infrastructure/geography/repositories/...`
- Services : `@/domains/infrastructure/geography/services/GeographieService`
- Hooks : `@/domains/infrastructure/geography/hooks/useGeographie`
- Components : `@/domains/infrastructure/geography/components/...`
- Schemas : `@/domains/infrastructure/geography/schemas/geographie.schema`

---

## Plan de Migration

### Étape 1 : Créer la structure
- [x] Créer `src/domains/infrastructure/geography/` avec sous-dossiers

### Étape 2 : Migrer les entities
- [ ] Extraire les types de `src/types/types.ts`
- [ ] Créer `entities/geography.types.ts`
- [ ] Exporter les types (Province, Department, Commune, District, Quarter)

### Étape 3 : Migrer les repositories
- [ ] Déplacer les 5 repositories
- [ ] Mettre à jour les imports internes

### Étape 4 : Migrer les services
- [ ] Déplacer GeographieService.ts
- [ ] Mettre à jour les imports (repositories)

### Étape 5 : Migrer les hooks
- [ ] Déplacer useGeographie.ts
- [ ] Mettre à jour les imports (services, entities)

### Étape 6 : Migrer les components
- [ ] Déplacer tous les components
- [ ] Mettre à jour les imports (hooks, schemas, entities)

### Étape 7 : Migrer les schemas
- [ ] Déplacer geographie.schema.ts
- [ ] Mettre à jour les imports si nécessaire

### Étape 8 : Mettre à jour les factories
- [ ] Mettre à jour `RepositoryFactory.getGeographieRepositories()`
- [ ] Mettre à jour `ServiceFactory.getGeographieService()`

### Étape 9 : Mettre à jour les imports dans l'application
- [ ] Chercher tous les imports `@/repositories/geographie`
- [ ] Chercher tous les imports `@/services/geographie`
- [ ] Chercher tous les imports `@/hooks/useGeographie`
- [ ] Chercher tous les imports `@/components/geographie`
- [ ] Chercher tous les imports `@/schemas/geographie`
- [ ] Chercher les imports de types depuis `@/types/types` (Province, Department, etc.)
- [ ] Remplacer tous les imports par les nouveaux chemins

### Étape 10 : Mettre à jour les routes/pages
- [ ] Vérifier `src/app/(admin)/geographie/page.tsx`
- [ ] Mettre à jour les imports si nécessaire

### Étape 11 : Tests et vérifications
- [ ] Vérifier que tout compile (`pnpm typecheck`)
- [ ] Vérifier le linting (`pnpm lint`)
- [ ] Tests manuels (vérifier que la page /geographie fonctionne)
- [ ] Vérifier que les formulaires fonctionnent (création/édition)
- [ ] Vérifier que les listes s'affichent correctement

### Étape 12 : Nettoyage
- [ ] Supprimer les anciens dossiers vides (si possible)
- [ ] Vérifier qu'aucun import ancien ne reste

---

## Références UML

- **Use cases** : `documentation/uml/use-cases/USE_CASES_COMPLETS.puml` (section Géographie)
- **Diagramme de classes** : `documentation/uml/classes/CLASSES_GEOGRAPHIE.puml`

---

## Notes Techniques

### Dépendances
- Le module Geography n'a pas de dépendances vers d'autres domaines
- Utilisé par d'autres modules (Membership pour les adresses, etc.)

### Impact
- Cette migration ne devrait pas casser d'autres modules car :
  - Les imports seront mis à jour partout
  - Les factories seront mises à jour
  - L'API publique reste la même (mêmes classes, mêmes méthodes)

### Tests
- Pas de tests unitaires/integration existants identifiés
- Tests manuels nécessaires après migration
