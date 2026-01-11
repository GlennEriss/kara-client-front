# Plan pour Atteindre 80% de Couverture de Code

## 📊 État Actuel

- **Couverture globale** : ~1% (très faible)
- **Objectif** : 80% minimum

## 🎯 Stratégie

### Phase 1 : Module Auth (Priorité Haute)
- ✅ Repositories : Tests créés (10 tests)
- ✅ Services : Tests créés (10 tests)
- ⚠️ Hooks : Tests créés mais nécessitent ajustements (8 tests)
- ✅ Intégration : Tests créés (2 tests)

**Couverture actuelle du module Auth** : ~60-70% (estimation)

### Phase 2 : Autres Modules Critiques
1. **Géographie** : Déjà bien testé
2. **Services métier** : À tester
3. **Repositories** : À tester
4. **Hooks** : À tester

## 📝 Actions Immédiates

### 1. Corriger les Tests des Hooks Auth
- Simplifier les mocks de Firebase
- Utiliser `act()` pour les mises à jour React
- Focus sur la couverture plutôt que la perfection

### 2. Créer des Tests pour les Modules Non Testés
- Services métier (MembershipService, etc.)
- Repositories existants
- Hooks utilisés fréquemment

### 3. Configurer les Seuils de Couverture
- Ajouter `thresholds` dans `vitest.config.ts`
- Faire échouer les tests si < 80%

## 🔧 Configuration

Les seuils de couverture ont été ajoutés dans `vitest.config.ts` :
```typescript
thresholds: {
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
}
```

## 📈 Prochaines Étapes

1. **Corriger les tests des hooks** (useAuth, useLogin)
2. **Créer des tests pour les services métier**
3. **Créer des tests pour les repositories**
4. **Vérifier la couverture après chaque ajout**
5. **Atteindre 80% module par module**

## ⚠️ Note

La couverture globale de 1% est normale car :
- Beaucoup de code n'est pas encore testé
- Les tests se concentrent sur les modules refactorisés
- L'objectif est d'atteindre 80% progressivement, module par module
