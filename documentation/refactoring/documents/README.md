# Refactoring — Migration Documents vers domains/

> Migration du module Documents vers la structure `domains/infrastructure/documents/`

---

## Objectif du Refactoring

Migrer le module Documents de l'organisation actuelle (par type technique) vers l'organisation par domaines (DDD) : `domains/infrastructure/documents/`.

---

## État Actuel (BEFORE)

### Structure actuelle
```
src/
├── repositories/documents/
│   ├── DocumentRepository.ts
│   └── IDocumentRepository.ts
├── services/documents/
│   └── DocumentService.ts
├── hooks/documents/
│   ├── useDocuments.ts
│   ├── useDocumentList.ts
│   └── index.ts
├── components/member/
│   ├── ListDocuments.tsx
│   └── DocumentPreviewModal.tsx
├── components/contract/
│   └── PdfDocumentModal.tsx
├── components/placement/
│   ├── PlacementDocumentUploadModal.tsx
│   └── ViewPlacementDocumentModal.tsx
├── components/caisse-imprevue/
│   ├── ViewRefundDocumentCIModal.tsx
│   └── ViewUploadedContractCIModal.tsx
├── components/caisse-speciale/
│   └── ContractPdfUploadModal.tsx
├── utils/documents/
│   └── documentTypes.ts
├── schemas/
│   └── (schemas liés aux documents dans différents modules)
├── constantes/
│   └── document-types.ts
└── types/types.ts
    └── (interfaces: Document, DocumentType, DocumentFormat, etc.)
```

### Imports actuels
- Repositories : `@/repositories/documents/...`
- Services : `@/services/documents/DocumentService`
- Hooks : `@/hooks/documents/...`
- Components : `@/components/member/ListDocuments`, `@/components/contract/PdfDocumentModal`, etc.
- Utils : `@/utils/documents/documentTypes`
- Constantes : `@/constantes/document-types`
- Types : `@/types/types`

---

## État Cible (AFTER)

### Structure cible
```
src/
└── domains/infrastructure/documents/
    ├── entities/
    │   └── document.types.ts          # Document, DocumentType, DocumentFormat, etc.
    ├── repositories/
    │   ├── DocumentRepository.ts
    │   └── IDocumentRepository.ts
    ├── services/
    │   └── DocumentService.ts
    ├── hooks/
    │   ├── useDocuments.ts
    │   ├── useDocumentList.ts
    │   └── index.ts
    ├── components/
    │   ├── ListDocuments.tsx
    │   ├── DocumentPreviewModal.tsx
    │   ├── PdfDocumentModal.tsx
    │   └── modals/
    │       ├── PlacementDocumentUploadModal.tsx
    │       ├── ViewPlacementDocumentModal.tsx
    │       ├── ViewRefundDocumentCIModal.tsx
    │       ├── ViewUploadedContractCIModal.tsx
    │       └── ContractPdfUploadModal.tsx
    ├── schemas/
    │   └── document.schema.ts          # Si nécessaire
    ├── utils/
    │   └── documentTypes.ts
    ├── constants/
    │   └── document-types.ts
    └── __tests__/
        ├── repositories/
        ├── services/
        └── hooks/
```

### Imports cibles
- Repositories : `@/domains/infrastructure/documents/repositories/...`
- Services : `@/domains/infrastructure/documents/services/DocumentService`
- Hooks : `@/domains/infrastructure/documents/hooks/...`
- Components : `@/domains/infrastructure/documents/components/...`
- Utils : `@/domains/infrastructure/documents/utils/documentTypes`
- Constants : `@/domains/infrastructure/documents/constants/document-types`
- Entities : `@/domains/infrastructure/documents/entities/document.types`

---

## Plan de Migration

### Étape 1 : Créer la structure cible
- [ ] Créer `src/domains/infrastructure/documents/`
- [ ] Créer les sous-dossiers : `entities/`, `repositories/`, `services/`, `hooks/`, `components/`, `schemas/`, `utils/`, `constants/`, `__tests__/`

### Étape 2 : Migrer les entities
- [ ] Créer `entities/document.types.ts`
- [ ] Extraire `Document`, `DocumentType`, `DocumentFormat` depuis `types/types.ts`
- [ ] Extraire les types liés : `DocumentListQuery`, `DocumentListResult`, `DocumentFilters`, etc.

### Étape 3 : Migrer les repositories
- [ ] Déplacer `DocumentRepository.ts`
- [ ] Déplacer `IDocumentRepository.ts`
- [ ] Mettre à jour les imports internes

### Étape 4 : Migrer les services
- [ ] Déplacer `DocumentService.ts`
- [ ] Mettre à jour les imports (repositories, entities)

### Étape 5 : Migrer les hooks
- [ ] Déplacer `useDocuments.ts`
- [ ] Déplacer `useDocumentList.ts`
- [ ] Déplacer `index.ts`
- [ ] Mettre à jour les imports (services, entities)

### Étape 6 : Migrer les components
- [ ] Déplacer `ListDocuments.tsx` depuis `components/member/`
- [ ] Déplacer `DocumentPreviewModal.tsx` depuis `components/member/`
- [ ] Déplacer `PdfDocumentModal.tsx` depuis `components/contract/`
- [ ] Déplacer les modals depuis `components/placement/`, `components/caisse-imprevue/`, `components/caisse-speciale/`
- [ ] Mettre à jour les imports (hooks, entities)

### Étape 7 : Migrer les utils et constants
- [ ] Déplacer `documentTypes.ts` depuis `utils/documents/`
- [ ] Déplacer `document-types.ts` depuis `constantes/`
- [ ] Mettre à jour les imports si nécessaire

### Étape 8 : Migrer les schemas (si nécessaire)
- [ ] Créer `schemas/document.schema.ts` si des schemas Zod sont nécessaires
- [ ] Extraire les schemas liés aux documents depuis les autres modules si applicable

### Étape 9 : Mettre à jour les factories
- [ ] Mettre à jour `RepositoryFactory.getDocumentRepository()`
- [ ] Mettre à jour `ServiceFactory.getDocumentService()`

### Étape 10 : Mettre à jour les imports dans l'application
- [ ] Chercher tous les imports `@/repositories/documents`
- [ ] Chercher tous les imports `@/services/documents`
- [ ] Chercher tous les imports `@/hooks/documents`
- [ ] Chercher tous les imports `@/components/member/ListDocuments`, `@/components/contract/PdfDocumentModal`, etc.
- [ ] Chercher tous les imports `@/utils/documents`
- [ ] Chercher tous les imports `@/constantes/document-types`
- [ ] Chercher les imports de types depuis `@/types/types` (Document, DocumentType, etc.)
- [ ] Remplacer tous les imports par les nouveaux chemins

### Étape 11 : Tests et vérifications
- [ ] Vérifier que tout compile (`pnpm typecheck`)
- [ ] Vérifier le linting (`pnpm lint`)
- [ ] Tests manuels (vérifier que les fonctionnalités de documents fonctionnent)
- [ ] Vérifier que les uploads de documents fonctionnent
- [ ] Vérifier que les prévisualisations de documents fonctionnent

### Étape 12 : Nettoyage
- [ ] Supprimer les anciens dossiers vides (si possible)
- [ ] Vérifier qu'aucun import ancien ne reste

---

## Références UML

- **Use cases** : `documentation/uml/use-cases/USE_CASES_COMPLETS.puml` (section Documents)
- **Diagramme de classes** : À créer si nécessaire

---

## Notes Techniques

### Dépendances
- Le module Documents est utilisé par plusieurs autres modules :
  - **Placement** : Upload et visualisation de documents de placement
  - **Caisse Imprévue** : Documents de contrat et remboursement
  - **Caisse Spéciale** : Documents de contrat PDF
  - **Member** : Liste et prévisualisation des documents d'un membre

### Points d'attention
- Les components de documents sont dispersés dans plusieurs modules (`member/`, `contract/`, `placement/`, `caisse-imprevue/`, `caisse-speciale/`)
- Certains hooks spécifiques utilisent DocumentService (ex: `usePlacementDocument`, `useDocumentCI`)
- Les schemas de documents peuvent être intégrés dans les schemas des modules utilisateurs

---

## Checklist de Migration

- [ ] Structure créée
- [ ] Entities migrées
- [ ] Repositories migrés
- [ ] Services migrés
- [ ] Hooks migrés
- [ ] Components migrés
- [ ] Utils migrés
- [ ] Constants migrés
- [ ] Schemas migrés (si nécessaire)
- [ ] Imports internes mis à jour
- [ ] Factories mises à jour
- [ ] Imports externes mis à jour
- [ ] Tests compilent
- [ ] Tests manuels OK
- [ ] PR créée
- [ ] PR mergée
