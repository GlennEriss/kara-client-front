# Tests d'Intégration - Module Registration

Ce fichier contient les tests d'intégration pour le module de registration. Ces tests vérifient l'intégration entre les différentes couches : Repository → Service → Hook → Components.

## 📋 Structure des Tests

### 1. **Flux Complet de Soumission**
Tests du parcours complet depuis le remplissage jusqu'à la soumission :
- Remplissage du formulaire
- Sauvegarde automatique dans le cache
- Soumission au backend
- Gestion des erreurs

### 2. **Intégration Cache Service**
Tests de l'intégration entre le cache et les autres services :
- Sauvegarde automatique lors de la navigation
- Restauration des données au rechargement
- Expiration et nettoyage du cache
- Gestion des versions du cache

### 3. **Hook + Service**
Tests de l'intégration entre `useRegistration` et `RegistrationService` :
- Navigation entre étapes avec validation
- Blocage de la navigation si étape invalide
- Validation croisée entre sections

### 4. **Code de Sécurité**
Tests du flux de correction avec code de sécurité :
- Vérification du code
- Chargement des données pour correction
- Mise à jour de la demande existante

### 5. **Validation Croisée**
Tests des validations qui dépendent de plusieurs champs :
- Informations conjoint si marié
- Adresse entreprise si employé
- Dépendances entre sections

### 6. **Gestion d'Erreurs**
Tests de la propagation des erreurs :
- Repository → Service → Hook
- Retry automatique après erreur
- Préservation du cache en cas d'erreur

## 🎯 Ce qui est Testé

### ✅ Flux Complet
```typescript
it('devrait intégrer correctement le flux : remplissage → cache → soumission')
```
- Remplir toutes les étapes du formulaire
- Vérifier que le cache est mis à jour automatiquement
- Soumettre le formulaire
- Vérifier que `repository.create()` est appelé
- Vérifier l'état final (isSubmitted, userData)
- Vérifier le nettoyage du cache

### ✅ Cache Automatique
```typescript
it('devrait sauvegarder automatiquement lors de la navigation')
```
- Modifier des champs du formulaire
- Attendre le debounce (500ms)
- Vérifier que le cache est sauvegardé
- Vérifier que l'étape courante est sauvegardée

### ✅ Restauration du Cache
```typescript
it('devrait restaurer les données du cache au chargement')
```
- Pré-remplir le cache avec des données
- Créer une nouvelle instance du hook
- Vérifier que les données sont restaurées
- Vérifier que l'étape courante est restaurée

### ✅ Expiration du Cache
```typescript
it('devrait nettoyer le cache expiré')
```
- Créer un cache avec TTL expiré
- Charger le hook
- Vérifier que le cache est nettoyé automatiquement

### ✅ Navigation avec Validation
```typescript
it('devrait naviguer entre les étapes avec validation')
```
- Remplir une étape
- Appeler `nextStep()`
- Vérifier que la validation est effectuée
- Vérifier la navigation réussie

### ✅ Blocage de Navigation
```typescript
it('devrait bloquer la navigation si l\'étape est invalide')
```
- Laisser une étape vide/invalide
- Appeler `nextStep()`
- Vérifier que la navigation est bloquée
- Vérifier l'affichage des erreurs

### ✅ Code de Sécurité
```typescript
it('devrait vérifier le code et charger les données pour correction')
```
- Simuler une demande de correction
- Saisir le code de sécurité
- Appeler `verifySecurityCode()`
- Vérifier le chargement des données
- Vérifier la réinitialisation des étapes

### ✅ Mise à Jour après Correction
```typescript
it('devrait mettre à jour une demande existante après correction')
```
- Vérifier le code de sécurité
- Modifier les données
- Soumettre le formulaire
- Vérifier que `repository.update()` est appelé (pas `create()`)

### ✅ Validation Croisée - Employé
```typescript
it('devrait valider les dépendances entre étapes')
```
- Marquer comme employé (`isEmployed: true`)
- Ne pas remplir les infos entreprise
- Valider l'étape
- Vérifier que la validation échoue

### ✅ Validation Croisée - Marié
```typescript
it('devrait valider les informations du conjoint si marié')
```
- Marquer comme marié
- Ne pas remplir les infos conjoint
- Valider l'étape
- Vérifier que la validation échoue

### ✅ Propagation des Erreurs
```typescript
it('devrait propager les erreurs Repository → Service → Hook')
```
- Mock une erreur au niveau Repository
- Soumettre le formulaire
- Vérifier que l'erreur est propagée jusqu'au hook
- Vérifier l'affichage de `submissionError`

### ✅ Retry après Erreur
```typescript
it('devrait permettre un retry après une erreur')
```
- Mock une erreur puis un succès
- Premier essai : vérifier l'erreur
- Retry : vérifier le succès
- Vérifier que le cache est préservé entre les essais

## 🔧 Mocks Utilisés

### localStorage
```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
```

### Repository
```typescript
const mockRepository = {
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  verifySecurityCode: vi.fn(),
  markSecurityCodeAsUsed: vi.fn(),
}
```

### Toast (sonner)
```typescript
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))
```

### getMembershipRequestById
```typescript
vi.mock('@/db/membership.db', () => ({
  getMembershipRequestById: vi.fn(),
}))
```

## 📊 Données de Test

### Formulaire Complet
```typescript
const mockFormData: RegisterFormData = {
  identity: { /* données complètes */ },
  address: { /* données complètes */ },
  company: { /* données complètes */ },
  documents: { /* données complètes */ },
}
```

### Demande d'Adhésion
```typescript
const mockMembershipRequest: MembershipRequest = {
  id: 'test-request-id-123',
  matricule: '1234.MK.5678',
  status: 'pending',
  securityCode: 'SEC-CODE-123',
  reviewNote: 'Veuillez vérifier votre adresse',
  /* ... */
}
```

## 🚀 Exécution des Tests

```bash
# Tous les tests d'intégration
npm run test src/domains/auth/registration/__tests__/integration

# Tests spécifiques
npm run test registration.integration.test

# Mode watch
npm run test:watch registration.integration.test

# Avec couverture
npm run test:coverage registration.integration.test
```

## 🎨 Patterns de Test Utilisés

### 1. **Arrange-Act-Assert (AAA)**
```typescript
it('devrait faire quelque chose', async () => {
  // Arrange
  const mockData = createMockFormData()
  vi.mocked(mockRepository.create).mockResolvedValue('id')

  // Act
  const { result } = renderHook(...)
  await act(async () => {
    await result.current.submitForm()
  })

  // Assert
  expect(result.current.isSubmitted).toBe(true)
})
```

### 2. **Test de Timing (Debounce)**
```typescript
// Attendre le debounce de 500ms
await new Promise((resolve) => setTimeout(resolve, 600))
```

### 3. **Test d'État Asynchrone**
```typescript
await waitFor(() => {
  expect(result.current.isCacheLoaded).toBe(true)
})
```

### 4. **Test de Mutation d'État**
```typescript
await act(async () => {
  result.current.form.setValue('identity.lastName', 'MBOUMBA')
})
```

## ⚠️ Points d'Attention

### Timing et Debounce
Le cache utilise un debounce de 500ms. Toujours attendre au moins 600ms après une modification :
```typescript
act(() => {
  result.current.form.setValue(...)
})
await new Promise((resolve) => setTimeout(resolve, 600))
```

### Cleanup
Toujours nettoyer le localStorage entre les tests :
```typescript
beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})
```

### Mocks de Hooks
Les hooks React Testing Library nécessitent `act()` pour les mutations :
```typescript
await act(async () => {
  await result.current.submitForm()
})
```

### Erreurs Asynchrones
Toujours wrapper les appels qui peuvent échouer :
```typescript
await act(async () => {
  try {
    await result.current.submitForm()
  } catch (e) {
    // Erreur attendue
  }
})
```

## 📈 Couverture Attendue

Ces tests d'intégration couvrent :
- ✅ 100% des flux utilisateur critiques
- ✅ 95%+ des interactions entre services
- ✅ 90%+ des cas d'erreur
- ✅ 100% des validations croisées

## 🐛 Débogage

### Afficher l'état du hook
```typescript
console.log('Current state:', {
  currentStep: result.current.currentStep,
  isSubmitted: result.current.isSubmitted,
  errors: result.current.form.formState.errors,
})
```

### Afficher le cache
```typescript
console.log('Cache data:', cacheService.loadFormData())
console.log('Has cache:', cacheService.hasCachedData())
```

### Afficher les appels mock
```typescript
console.log('Repository calls:', mockRepository.create.mock.calls)
```

## 🔗 Liens Utiles

- [Documentation React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Hooks](https://react-hooks-testing-library.com/)

## 📝 Notes

- Ces tests sont **isolés** : ils n'appellent pas Firebase/Firestore
- Les tests utilisent des **mocks** pour simuler les services externes
- Les tests sont **déterministes** : pas de dépendance au réseau ou à l'horloge
- Les tests sont **rapides** : < 5 secondes pour toute la suite

---

**Dernière mise à jour** : Janvier 2026  
**Mainteneur** : Équipe Kara  
**Coverage cible** : 95%+
