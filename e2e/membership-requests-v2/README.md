# Tests E2E - Membership Requests V2

Ce dossier contient les tests End-to-End (E2E) pour le module de gestion des demandes d'adhésion V2.

## 📁 Structure

```
e2e/membership-requests-v2/
├── helpers.ts              # Helpers partagés (auth, navigation, sélecteurs)
├── fixtures.ts             # Fixtures pour créer/supprimer données de test
├── list.spec.ts           # Tests de la liste (filtres, recherche, pagination)
├── approval.spec.ts       # Tests d'approbation
├── rejection.spec.ts      # Tests de rejet
├── corrections.spec.ts    # Tests de corrections
├── payment.spec.ts        # Tests de paiement
├── responsive.spec.ts     # Tests responsive (mobile, tablette, desktop)
└── README.md              # Ce fichier
```

## 🚀 Exécution

### Tous les tests

```bash
# Exécuter tous les tests du module V2
pnpm test:e2e membership-requests-v2
```

### Tests spécifiques

```bash
# Liste uniquement
pnpm test:e2e membership-requests-v2/list

# Approbation uniquement
pnpm test:e2e membership-requests-v2/approval

# Responsive uniquement
pnpm test:e2e membership-requests-v2/responsive
```

### Mode UI (interactif)

```bash
pnpm test:e2e:ui membership-requests-v2
```

### Mode debug

```bash
pnpm test:e2e:debug membership-requests-v2
```

## 🔧 Prérequis

1. **Serveur de développement lancé** :
   ```bash
   pnpm dev
   ```

2. **Firebase configuré** :
   - Projet dev configuré dans `.env.local`
   - Ou émulateurs Firebase lancés
   - **Service account** : Fichier `service-accounts/kara-gabon-dev-*.json` requis pour les fixtures

3. **Utilisateur admin** :
   - Les tests utilisent les identifiants définis dans `helpers.ts`
   - Par défaut : `glenneriss@gmail.com` / `0001.MK.110126`
   - Personnalisable via variables d'environnement :
     ```bash
     E2E_AUTH_EMAIL=admin@test.com
     E2E_AUTH_PASSWORD=password
     E2E_AUTH_MATRICULE=0001.MK.110126
     ```

## 📦 Fixtures (Données de test)

Les tests utilisent des **fixtures** pour créer et supprimer automatiquement les demandes de test :

### Fonctions disponibles (`fixtures.ts`)

- `createTestMembershipRequest(options)` : Crée une demande personnalisée
- `createPendingUnpaidRequest()` : Crée une demande "En attente" non payée
- `createPendingPaidRequest()` : Crée une demande "En attente" payée
- `createApprovedRequest()` : Crée une demande "Approuvée"
- `createRejectedRequest()` : Crée une demande "Rejetée"
- `createUnderReviewRequest()` : Crée une demande "En cours de révision"
- `createRequestWithCorrections()` : Crée une demande avec corrections demandées
- `deleteTestMembershipRequest(id)` : Supprime une demande
- `deleteTestMembershipRequests(ids[])` : Supprime plusieurs demandes

### Utilisation dans les tests

```typescript
import { createPendingUnpaidRequest, deleteTestMembershipRequest } from './fixtures'

test.describe('Mon test', () => {
  const createdRequestIds: string[] = []

  test.afterEach(async () => {
    // Nettoyage automatique après chaque test
    if (createdRequestIds.length > 0) {
      await Promise.all(createdRequestIds.map(id => deleteTestMembershipRequest(id)))
      createdRequestIds.length = 0
    }
  })

  test('mon test', async ({ page }) => {
    // Créer une demande de test
    const requestId = await createPendingUnpaidRequest()
    createdRequestIds.push(requestId)
    
    // Utiliser la demande dans le test
    // ...
  })
})
```

### Nettoyage automatique

Les tests nettoient automatiquement les demandes créées après chaque test via `test.afterEach()`. Cela garantit :
- ✅ Pas de pollution de la base de données
- ✅ Tests isolés et reproductibles
- ✅ Pas de conflits entre tests

## 📋 Tests disponibles

### 1. Liste (`list.spec.ts`)
- ✅ Affichage de la page avec tous les éléments
- ✅ Affichage des statistiques
- ✅ Filtrage par statut (En attente, Approuvées, etc.)
- ✅ Recherche par nom
- ✅ Pagination
- ✅ Informations essentielles dans chaque ligne/card
- ✅ Actions principales selon le statut

### 2. Approbation (`approval.spec.ts`)
- ✅ Affichage du bouton Approuver selon le workflow
- ✅ Ouverture du modal d'approbation
- ✅ Approbation avec succès
- ✅ Validation du workflow (paiement requis)

### 3. Rejet (`rejection.spec.ts`)
- ✅ Ouverture du modal de rejet
- ✅ Rejet avec motif

### 4. Corrections (`corrections.spec.ts`)
- ✅ Ouverture du modal de corrections
- ✅ Envoi de corrections

### 5. Paiement (`payment.spec.ts`)
- ✅ Ouverture du modal de paiement
- ✅ Validation du formulaire
- ✅ Enregistrement du paiement
- ✅ Mise à jour du statut

### 6. Responsive (`responsive.spec.ts`)
- ✅ Affichage mobile (cards)
- ✅ Affichage tablette
- ✅ Affichage desktop (table)
- ✅ Adaptation des tabs de filtres
- ✅ Adaptation de la barre de recherche

## 🎯 Bonnes pratiques

1. **Sélecteurs robustes** : Utiliser `data-testid` quand possible
2. **Timeouts raisonnables** : 5-10s pour les interactions, 10-30s pour les requêtes réseau
3. **Tests isolés** : Chaque test est indépendant
4. **Attentes explicites** : Utiliser `waitFor` pour les éléments dynamiques
5. **Gestion des états** : Les tests gèrent les cas où les éléments peuvent ne pas être présents

## 🔍 Debugging

### Voir les screenshots

Après un échec, les screenshots sont dans `test-results/` :

```bash
ls test-results/
```

### Voir le rapport HTML

```bash
npx playwright show-report
```

### Mode debug interactif

```bash
# Ouvrir Playwright Inspector
pnpm test:e2e:debug membership-requests-v2/list

# Exécuter avec console verbose
DEBUG=pw:api pnpm test:e2e membership-requests-v2
```

## 📝 Notes importantes

- Les tests sont conçus pour être **tolérants** : ils vérifient la présence d'éléments mais ne bloquent pas si certains éléments optionnels sont absents
- Les tests utilisent des **timeouts généreux** pour gérer les requêtes React Query et Firebase
- Les tests **ne nettoient pas** les données créées (à faire manuellement ou via scripts de nettoyage)

## 🔗 Références

- [Documentation Playwright](https://playwright.dev/)
- [Plan de tests TDD](./documentation/membership-requests/PLAN_TESTS_TDD.md)
- [Workflow d'implémentation](./documentation/membership-requests/WORKFLOW_IMPLEMENTATION.md)
