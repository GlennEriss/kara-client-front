# Tests du Module Géographie

Ce dossier contient tous les tests pour le module Géographie.

## Structure

```
__tests__/
├── README.md                    # Ce fichier
├── hooks/
│   └── useGeographie.test.ts   # Tests unitaires des hooks
├── services/
│   └── GeographieService.test.ts # Tests unitaires du service
└── repositories/                # Tests unitaires des repositories (à créer)
    └── ProvinceRepository.test.ts
```

## Types de Tests

### Tests Unitaires (Vitest)

- **Hooks** : Testent la logique des hooks React Query
- **Services** : Testent la logique métier (validation, transformation)
- **Repositories** : Testent l'accès aux données (mocks de Firestore)

### Tests E2E (Playwright)

Voir `e2e/geographie.spec.ts` pour les tests end-to-end complets.

## Exécution des Tests

```bash
# Tests unitaires
pnpm test

# Tests unitaires en mode watch
pnpm test:watch

# Tests E2E (nécessite pnpm dev en arrière-plan)
pnpm test:e2e

# Coverage
pnpm test:coverage
```

## Notes

- Les tests unitaires utilisent des mocks pour Firebase
- Les tests E2E nécessitent Firebase Cloud (projet dev) ou l'émulateur
- Tous les tests doivent passer avant de commit/push (voir WORKFLOW.md)
