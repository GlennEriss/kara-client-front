# Plan de Correction des Tests - Module Membership Requests V2

## 🎯 Objectif

- ✅ Corriger les 12 tests qui échouent
- ✅ Atteindre **80% de couverture de code** minimum
- ✅ Tous les tests unitaires et d'intégration passent

---

## 📊 État Actuel

### Tests créés

1. ✅ **Repositories** : `MembershipRepositoryV2.test.ts`
2. ✅ **Services** : `MembershipServiceV2.test.ts`
3. ✅ **Hooks** :
   - `useMembershipRequestsV2.test.ts`
   - `useMembershipActionsV2.test.ts`
   - `useMembershipStatsV2.test.ts`
4. ✅ **Utils** :
   - `whatsappUrl.test.ts`
   - `securityCode.test.ts`
   - `membershipValidation.test.ts`

### Configuration de couverture

✅ Seuils de 80% ajoutés dans `vitest.config.ts` pour :
- `src/domains/memberships/repositories/**`
- `src/domains/memberships/services/**`
- `src/domains/memberships/hooks/**`
- `src/domains/memberships/utils/**`

---

## 🔧 Corrections à Apporter

### 1. Erreurs de Syntaxe (Corrigées)

- ✅ Import React dupliqué dans `useMembershipStatsV2.test.ts` → **Corrigé**

### 2. Mocks Firebase

**Problème potentiel** : Les mocks Firestore peuvent ne pas être correctement configurés.

**Fichiers à vérifier** :
- `MembershipRepositoryV2.test.ts` : Mocks Firestore (collection, doc, query, etc.)

**Solution** : Vérifier que les mocks retournent les bonnes structures de données.

### 3. Tests qui Échouent (12 tests)

**Actions à prendre** :

1. **Exécuter les tests avec détails** :
   ```bash
   pnpm test --run src/domains/memberships 2>&1 | tee test-errors.log
   ```

2. **Identifier les erreurs** :
   - Erreurs de mocks
   - Erreurs d'assertions
   - Erreurs de types
   - Erreurs de dépendances manquantes

3. **Corriger par catégorie** :
   - Mocks incorrects → Corriger les mocks
   - Assertions incorrectes → Ajuster les assertions
   - Types incorrects → Corriger les types
   - Dépendances manquantes → Ajouter les mocks nécessaires

### 4. Couverture de Code

**Vérifier la couverture actuelle** :
```bash
pnpm test --run --coverage src/domains/memberships
```

**Objectif** : 80% minimum pour chaque catégorie :
- Lines : 80%
- Functions : 80%
- Branches : 80%
- Statements : 80%

**Si couverture < 80%** :
- Identifier les lignes non couvertes
- Ajouter des tests pour les cas limites
- Ajouter des tests pour les branches conditionnelles
- Ajouter des tests pour les erreurs

---

## 📝 Checklist de Correction

### Phase 1 : Diagnostic

- [ ] Exécuter les tests et identifier les 12 tests qui échouent
- [ ] Lister les erreurs par fichier
- [ ] Vérifier la couverture actuelle
- [ ] Identifier les lignes/branches non couvertes

### Phase 2 : Correction des Tests

- [ ] Corriger les mocks Firebase dans `MembershipRepositoryV2.test.ts`
- [ ] Corriger les mocks du service dans `MembershipServiceV2.test.ts`
- [ ] Corriger les mocks React Query dans les tests de hooks
- [ ] Vérifier que tous les tests passent

### Phase 3 : Amélioration de la Couverture

- [ ] Ajouter des tests pour les cas limites
- [ ] Ajouter des tests pour les erreurs
- [ ] Ajouter des tests pour les branches conditionnelles
- [ ] Vérifier que la couverture est >= 80%

### Phase 4 : Validation Finale

- [ ] Tous les tests passent
- [ ] Couverture >= 80% pour tous les fichiers
- [ ] Pas d'erreurs de lint
- [ ] Type check passe

---

## 🔍 Points d'Attention

### Mocks Firebase

Les tests utilisent des mocks pour Firestore. Vérifier que :
- Les mocks retournent les bonnes structures
- Les méthodes async sont correctement mockées
- Les erreurs sont correctement simulées

### React Query

Les tests de hooks utilisent React Query. Vérifier que :
- Le QueryClient est correctement configuré
- Les invalidations de cache sont testées
- Les états de chargement/erreur sont testés

### Services

Les tests de services mockent le repository. Vérifier que :
- Les appels au repository sont correctement mockés
- Les erreurs sont correctement propagées
- Les validations métier sont testées

---

## 📚 Ressources

- [Documentation Vitest](https://vitest.dev/)
- [Documentation Testing Library](https://testing-library.com/)
- [Documentation React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)

---

## 🚀 Commandes Utiles

```bash
# Exécuter tous les tests du module
pnpm test --run src/domains/memberships

# Exécuter avec couverture
pnpm test --run --coverage src/domains/memberships

# Exécuter un fichier spécifique
pnpm test --run src/domains/memberships/__tests__/unit/repositories/MembershipRepositoryV2.test.ts

# Mode watch
pnpm test src/domains/memberships

# Voir le rapport de couverture
open coverage/index.html
```

---

## 📝 Notes

- Les tests sont écrits en TDD (tests avant implémentation)
- Les mocks doivent refléter le comportement réel de Firebase
- La couverture doit être vérifiée pour chaque fichier individuellement
- Les tests doivent être rapides (< 1s par test)
