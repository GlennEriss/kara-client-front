# 🚀 Lancer les Tests - Guide Rapide

## Commandes Principales

### 1. Installer les dépendances
```bash
pnpm install
```

### 2. Tests Unitaires (rapides, pas besoin de dev)
```bash
pnpm test:run
```

### 3. Tests E2E (nécessite pnpm dev en arrière-plan)
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm test:e2e
```

### 4. Checklist complète avant commit
```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm test:e2e
```

---

📚 Documentation complète : `refactoring/geography/RUN_TESTS.md`
