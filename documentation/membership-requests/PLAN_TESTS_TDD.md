# Plan de Tests TDD - Module Membership Requests

Ce document définit la stratégie de tests complète pour le refactoring du module de gestion des demandes d'adhésion avec une approche **Test-Driven Development (TDD)**.

---

## Sommaire

1. [Philosophie TDD](#1-philosophie-tdd)
2. [Architecture des Tests](#2-architecture-des-tests)
3. [Tests Unitaires](#3-tests-unitaires)
4. [Tests d'Intégration](#4-tests-dintégration)
5. [Tests E2E](#5-tests-e2e)
6. [Données de Test (Fixtures)](#6-données-de-test-fixtures)
7. [Mocks et Stubs](#7-mocks-et-stubs)
8. [Planning d'Implémentation](#8-planning-dimplémentation)
9. [Checklist de Validation](#9-checklist-de-validation)

---

## 1. Philosophie TDD

### 1.1 Cycle TDD : Red → Green → Refactor

```
1. 🔴 RED    : Écrire un test qui échoue (le test définit le comportement attendu)
2. 🟢 GREEN : Écrire le code minimal pour faire passer le test
3. 🔵 REFACTOR : Améliorer le code en gardant les tests au vert
```

### 1.2 Règles d'Or

1. **Ne jamais écrire de code de production sans un test qui échoue d'abord**
2. **Un test = Un comportement** (pas plusieurs assertions sur des comportements différents)
3. **Tests isolés** : Chaque test doit pouvoir s'exécuter indépendamment
4. **Tests rapides** : Les tests unitaires doivent s'exécuter en < 10ms chacun
5. **Tests lisibles** : Le nom du test doit décrire le comportement testé

### 1.3 Couverture Cible

| Type de Test | Couverture Cible | Fichiers |
|--------------|------------------|----------|
| Unitaires | 80% | Services, Repositories, Hooks, Utils |
| Intégration | 70% | Flux complets, API Routes |
| E2E | Chemins critiques | User journeys principaux |

---

## 2. Architecture des Tests

### 2.1 Structure des Dossiers

```
src/domains/memberships/
├── __tests__/
│   ├── fixtures/                    # Données de test
│   │   ├── membership-request.fixture.ts
│   │   ├── notification.fixture.ts
│   │   └── index.ts
│   ├── mocks/                       # Mocks et stubs
│   │   ├── repositories/
│   │   │   └── MembershipRepository.mock.ts
│   │   ├── services/
│   │   │   └── MembershipService.mock.ts
│   │   └── firebase/
│   │       └── firestore.mock.ts
│   ├── unit/                        # Tests unitaires
│   │   ├── repositories/
│   │   │   └── MembershipRepository.test.ts
│   │   ├── services/
│   │   │   ├── MembershipService.test.ts
│   │   │   ├── MembershipApprovalService.test.ts
│   │   │   └── MembershipNotificationService.test.ts
│   │   ├── hooks/
│   │   │   ├── useMembershipRequests.test.tsx
│   │   │   ├── useMembershipActions.test.tsx
│   │   │   └── useMembershipStats.test.tsx
│   │   ├── utils/
│   │   │   ├── membershipValidation.test.ts
│   │   │   ├── securityCode.test.ts
│   │   │   └── whatsappUrl.test.ts
│   │   └── components/
│   │       ├── MembershipRequestRow.test.tsx
│   │       └── MembershipRequestActions.test.tsx
│   └── integration/                 # Tests d'intégration
│       ├── membershipList.integration.test.tsx
│       ├── membershipApproval.integration.test.tsx
│       └── membershipPayment.integration.test.tsx

e2e/
├── membership-requests/
│   ├── list.spec.ts                 # Tests E2E liste
│   ├── details.spec.ts              # Tests E2E détails
│   ├── approval.spec.ts             # Tests E2E approbation
│   ├── rejection.spec.ts            # Tests E2E rejet
│   ├── corrections.spec.ts          # Tests E2E corrections
│   ├── payment.spec.ts              # Tests E2E paiement
│   └── search-filter.spec.ts        # Tests E2E recherche/filtres
```

### 2.2 Conventions de Nommage

```typescript
// Fichiers de test
[NomDuModule].test.ts     // Tests unitaires
[NomDuModule].spec.ts     // Tests E2E
[NomDuModule].integration.test.ts  // Tests d'intégration

// Descriptions de test
describe('[NomDuModule]', () => {
  describe('[méthode/fonctionnalité]', () => {
    it('devrait [comportement attendu] quand [condition]', () => {})
    it('devrait échouer quand [condition d\'erreur]', () => {})
  })
})
```

---

## 3. Tests Unitaires

### 3.1 Repository : `MembershipRepository.test.ts`

#### 3.1.1 Méthode `getAll()`

```typescript
describe('MembershipRepository', () => {
  describe('getAll', () => {
    // ==================== SUCCÈS ====================
    
    it('devrait retourner une liste paginée de demandes', async () => {
      // Arrange: 15 demandes en base, page 1, limit 10
      // Act: getAll({ page: 1, limit: 10 })
      // Assert: 10 demandes retournées, totalItems: 15, totalPages: 2
    })

    it('devrait retourner une liste vide si aucune demande', async () => {
      // Arrange: 0 demande en base
      // Act: getAll()
      // Assert: items: [], totalItems: 0
    })

    it('devrait filtrer par statut "pending"', async () => {
      // Arrange: 5 pending, 3 approved, 2 rejected
      // Act: getAll({ status: 'pending' })
      // Assert: 5 demandes retournées
    })

    it('devrait filtrer par statut "approved"', async () => {
      // Arrange: 5 pending, 3 approved
      // Act: getAll({ status: 'approved' })
      // Assert: 3 demandes
    })

    it('devrait filtrer par statut "rejected"', async () => {})
    it('devrait filtrer par statut "under_review"', async () => {})

    it('devrait trier par date décroissante par défaut', async () => {
      // Arrange: 3 demandes avec dates différentes
      // Act: getAll()
      // Assert: ordre décroissant de createdAt
    })

    it('devrait trier par date croissante si spécifié', async () => {})

    it('devrait supporter la pagination avec curseur (Firestore)', async () => {
      // Arrange: 25 demandes
      // Act: getAll({ page: 2, limit: 10, cursor: lastDoc })
      // Assert: demandes 11-20
    })

    it('devrait filtrer par isPaid=true', async () => {
      // Arrange: 5 payées, 5 non payées
      // Act: getAll({ isPaid: true })
      // Assert: 5 demandes payées
    })

    it('devrait combiner les filtres (status + isPaid)', async () => {
      // Arrange: pending payées: 2, pending non payées: 3
      // Act: getAll({ status: 'pending', isPaid: true })
      // Assert: 2 demandes
    })

    // ==================== ERREURS ====================

    it('devrait throw une erreur si la connexion Firestore échoue', async () => {
      // Arrange: mock Firestore throw
      // Act & Assert: expect().rejects.toThrow()
    })

    it('devrait retourner une liste vide si statut invalide', async () => {
      // Arrange: statut inexistant
      // Act: getAll({ status: 'invalid' as any })
      // Assert: items: []
    })
  })
})
```

#### 3.1.2 Méthode `getById()`

```typescript
describe('getById', () => {
  it('devrait retourner une demande par son ID', async () => {})
  it('devrait retourner null si ID inexistant', async () => {})
  it('devrait throw si ID est vide', async () => {})
  it('devrait inclure les sous-documents (identity, address, etc.)', async () => {})
})
```

#### 3.1.3 Méthode `updateStatus()`

```typescript
describe('updateStatus', () => {
  it('devrait mettre à jour le statut en "approved"', async () => {
    // Assert: status changé, processedAt défini, processedBy défini
  })

  it('devrait mettre à jour le statut en "rejected" avec motif', async () => {
    // Assert: status changé, rejectionReason défini
  })

  it('devrait mettre à jour le statut en "under_review" avec corrections', async () => {
    // Assert: status changé, corrections défini, securityCode généré
  })

  it('devrait throw si ID inexistant', async () => {})
  it('devrait throw si transition de statut invalide (approved → pending)', async () => {})
  it('devrait mettre à jour updatedAt', async () => {})
})
```

#### 3.1.4 Méthode `markAsPaid()`

```typescript
describe('markAsPaid', () => {
  it('devrait marquer comme payé avec les infos de paiement', async () => {
    // Assert: isPaid=true, paidAt défini, paymentInfo défini
  })

  it('devrait throw si déjà payé', async () => {})
  it('devrait throw si montant invalide (<= 0)', async () => {})
  it('devrait throw si mode de paiement invalide', async () => {})
})
```

#### 3.1.5 Méthode `getStatistics()`

```typescript
describe('getStatistics', () => {
  it('devrait retourner les compteurs par statut', async () => {
    // Assert: { total: 10, pending: 5, approved: 3, rejected: 2, under_review: 0 }
  })

  it('devrait retourner les compteurs de paiement', async () => {
    // Assert: { paid: 4, unpaid: 6 }
  })

  it('devrait calculer les pourcentages', async () => {
    // Assert: pendingPercent: 50, approvedPercent: 30, etc.
  })

  it('devrait gérer le cas où total = 0 (éviter division par zéro)', async () => {})
})
```

---

### 3.2 Service : `MembershipService.test.ts`

#### 3.2.1 Méthode `approveMembershipRequest()`

```typescript
describe('MembershipService', () => {
  describe('approveMembershipRequest', () => {
    // ==================== PRÉREQUIS ====================
    
    it('devrait throw si la demande n\'est pas payée', async () => {
      // Arrange: demande avec isPaid=false
      // Act & Assert: expect().rejects.toThrow('La demande doit être payée avant approbation')
    })

    it('devrait throw si le statut n\'est pas "pending" ou "under_review"', async () => {
      // Arrange: demande avec status='approved'
      // Act & Assert: expect().rejects.toThrow('Statut invalide pour approbation')
    })

    // ==================== FLUX PRINCIPAL ====================

    it('devrait créer un compte utilisateur Firebase Auth', async () => {
      // Assert: createUser appelé avec email, mot de passe généré
    })

    it('devrait créer un document user dans Firestore', async () => {
      // Assert: user créé avec role='Member', memberId défini
    })

    it('devrait créer un document member dans Firestore', async () => {
      // Assert: member créé avec toutes les infos de la demande
    })

    it('devrait créer un abonnement initial', async () => {
      // Assert: subscription créée avec statut 'active'
    })

    it('devrait mettre à jour le statut de la demande en "approved"', async () => {
      // Assert: status='approved', processedAt, processedBy
    })

    it('devrait générer et sauvegarder le PDF d\'adhésion', async () => {
      // Assert: PDF généré, uploadé dans Storage, URL sauvegardée
    })

    it('devrait envoyer une notification à l\'admin', async () => {
      // Assert: notification créée avec type='approval', targetUserId=adminId
    })

    // ==================== ROLLBACK ====================

    it('devrait faire un rollback si création user échoue', async () => {
      // Arrange: createUser throw
      // Assert: aucun document créé, statut inchangé
    })

    it('devrait faire un rollback si création member échoue', async () => {
      // Arrange: createMember throw après createUser success
      // Assert: user supprimé, statut inchangé
    })

    it('devrait faire un rollback si création subscription échoue', async () => {})

    // ==================== EDGE CASES ====================

    it('devrait gérer le cas où l\'email existe déjà (doublon)', async () => {
      // Assert: erreur spécifique 'email-already-exists'
    })

    it('devrait gérer le cas où le matricule existe déjà', async () => {})
    
    it('devrait fonctionner même si le PDF échoue (warning, pas d\'erreur)', async () => {
      // Assert: approbation réussie, warning loggué
    })
  })
})
```

#### 3.2.2 Méthode `rejectMembershipRequest()`

```typescript
describe('rejectMembershipRequest', () => {
  it('devrait throw si pas de motif de rejet', async () => {})
  it('devrait throw si motif trop court (< 10 caractères)', async () => {})
  it('devrait mettre à jour le statut en "rejected"', async () => {})
  it('devrait sauvegarder le motif de rejet', async () => {})
  it('devrait envoyer une notification', async () => {})
  it('devrait NE PAS supprimer les documents uploadés', async () => {})
})
```

#### 3.2.3 Méthode `requestCorrections()`

```typescript
describe('requestCorrections', () => {
  it('devrait throw si pas de liste de corrections', async () => {})
  it('devrait générer un code de sécurité à 6 chiffres', async () => {})
  it('devrait définir une expiration de 48h pour le code', async () => {})
  it('devrait mettre à jour le statut en "under_review"', async () => {})
  it('devrait sauvegarder la liste des corrections', async () => {})
  it('devrait envoyer une notification', async () => {})
  it('devrait générer l\'URL WhatsApp correctement', async () => {})
  
  // Régénération de code
  it('devrait pouvoir régénérer un nouveau code si l\'ancien est expiré', async () => {})
  it('devrait marquer l\'ancien code comme utilisé si régénéré', async () => {})
})
```

#### 3.2.4 Méthode `processPayment()`

```typescript
describe('processPayment', () => {
  it('devrait throw si montant <= 0', async () => {})
  it('devrait throw si mode de paiement invalide', async () => {})
  it('devrait throw si déjà payé', async () => {})
  it('devrait valider les modes de paiement autorisés', async () => {
    // Assert: ['AirtelMoney', 'Mobicash', 'Cash', 'Virement', 'Chèque']
  })
  it('devrait enregistrer la date et l\'heure de paiement', async () => {})
  it('devrait enregistrer l\'admin qui a validé le paiement', async () => {})
  it('devrait créer un reçu de paiement', async () => {})
  it('devrait envoyer une notification', async () => {})
})
```

---

### 3.3 Hooks : `useMembershipRequests.test.tsx`

```typescript
describe('useMembershipRequests', () => {
  describe('fetching', () => {
    it('devrait charger les demandes au mount', async () => {})
    it('devrait afficher isLoading=true pendant le chargement', async () => {})
    it('devrait mettre à jour les données après le fetch', async () => {})
    it('devrait gérer les erreurs de fetch', async () => {})
  })

  describe('pagination', () => {
    it('devrait changer de page correctement', async () => {})
    it('devrait refetch quand la page change', async () => {})
    it('devrait retenir la page actuelle dans l\'URL', async () => {})
  })

  describe('filters', () => {
    it('devrait filtrer par statut', async () => {})
    it('devrait filtrer par recherche', async () => {})
    it('devrait combiner les filtres', async () => {})
    it('devrait réinitialiser la page à 1 quand un filtre change', async () => {})
  })

  describe('caching', () => {
    it('devrait utiliser le cache React Query', async () => {})
    it('devrait invalider le cache après une mutation', async () => {})
    it('devrait avoir un staleTime de 30 secondes', async () => {})
  })
})
```

---

### 3.4 Utils : Tests des Utilitaires

#### 3.4.1 `securityCode.test.ts`

```typescript
describe('SecurityCode Utils', () => {
  describe('generateSecurityCode', () => {
    it('devrait générer un code de 6 chiffres', () => {
      const code = generateSecurityCode()
      expect(code).toMatch(/^\d{6}$/)
    })

    it('devrait générer des codes uniques (pas de doublons sur 1000 appels)', () => {
      const codes = new Set(Array(1000).fill(0).map(() => generateSecurityCode()))
      expect(codes.size).toBeGreaterThan(990) // < 1% doublons
    })

    it('devrait éviter les codes faciles (000000, 111111, 123456)', () => {
      const easyPatterns = ['000000', '111111', '123456', '654321', '012345']
      const codes = Array(100).fill(0).map(() => generateSecurityCode())
      codes.forEach(code => {
        expect(easyPatterns).not.toContain(code)
      })
    })
  })

  describe('isSecurityCodeValid', () => {
    it('devrait retourner true si code non utilisé et non expiré', () => {})
    it('devrait retourner false si code utilisé', () => {})
    it('devrait retourner false si code expiré', () => {})
    it('devrait retourner false si code null', () => {})
  })

  describe('calculateCodeExpiry', () => {
    it('devrait retourner une date 48h dans le futur', () => {})
    it('devrait accepter un paramètre de durée personnalisé', () => {})
  })
})
```

#### 3.4.2 `whatsappUrl.test.ts`

```typescript
describe('WhatsApp URL Utils', () => {
  describe('normalizePhoneNumber', () => {
    it('devrait ajouter le préfixe +241 si absent', () => {
      expect(normalizePhoneNumber('65671734')).toBe('+24165671734')
    })

    it('devrait conserver +241 si déjà présent', () => {
      expect(normalizePhoneNumber('+24165671734')).toBe('+24165671734')
    })

    it('devrait supprimer les espaces', () => {
      expect(normalizePhoneNumber('65 67 17 34')).toBe('+24165671734')
    })

    it('devrait supprimer les tirets', () => {
      expect(normalizePhoneNumber('65-67-17-34')).toBe('+24165671734')
    })

    it('devrait gérer le préfixe 00241', () => {
      expect(normalizePhoneNumber('0024165671734')).toBe('+24165671734')
    })

    it('devrait throw si numéro invalide (trop court)', () => {})
    it('devrait throw si numéro invalide (caractères non numériques)', () => {})
  })

  describe('generateWhatsAppUrl', () => {
    it('devrait générer une URL WhatsApp Web valide', () => {
      const url = generateWhatsAppUrl('+24165671734', 'Bonjour')
      expect(url).toBe('https://wa.me/24165671734?text=Bonjour')
    })

    it('devrait encoder le message correctement', () => {
      const url = generateWhatsAppUrl('+24165671734', 'Bonjour Jean & Marie')
      expect(url).toContain('Bonjour%20Jean%20%26%20Marie')
    })

    it('devrait gérer les caractères spéciaux dans le message', () => {})
    it('devrait tronquer les messages trop longs (> 4096 caractères)', () => {})
  })

  describe('generateCorrectionMessage', () => {
    it('devrait inclure le nom du demandeur', () => {})
    it('devrait inclure la liste des corrections', () => {})
    it('devrait inclure le code de sécurité', () => {})
    it('devrait inclure l\'URL de correction', () => {})
    it('devrait inclure la date d\'expiration du code', () => {})
  })
})
```

#### 3.4.3 `membershipValidation.test.ts`

```typescript
describe('Membership Validation Utils', () => {
  describe('canApprove', () => {
    it('devrait retourner true si payé et statut pending', () => {})
    it('devrait retourner true si payé et statut under_review', () => {})
    it('devrait retourner false si non payé', () => {})
    it('devrait retourner false si déjà approuvé', () => {})
    it('devrait retourner false si rejeté', () => {})
  })

  describe('canReject', () => {
    it('devrait retourner true si statut pending', () => {})
    it('devrait retourner true si statut under_review', () => {})
    it('devrait retourner false si déjà approuvé', () => {})
    it('devrait retourner false si déjà rejeté', () => {})
  })

  describe('canRequestCorrections', () => {
    it('devrait retourner true si statut pending', () => {})
    it('devrait retourner false si déjà under_review', () => {})
    it('devrait retourner false si approuvé', () => {})
    it('devrait retourner false si rejeté', () => {})
  })

  describe('canPay', () => {
    it('devrait retourner true si non payé et statut pending', () => {})
    it('devrait retourner false si déjà payé', () => {})
    it('devrait retourner false si approuvé', () => {})
    it('devrait retourner false si rejeté', () => {})
  })

  describe('validatePaymentData', () => {
    it('devrait accepter un paiement valide', () => {})
    it('devrait rejeter un montant <= 0', () => {})
    it('devrait rejeter un mode de paiement invalide', () => {})
    it('devrait rejeter une date future', () => {})
  })
})
```

---

### 3.5 Composants : Tests de Rendu

```typescript
describe('MembershipRequestActions', () => {
  describe('rendu conditionnel', () => {
    it('devrait afficher le bouton Approuver si canApprove=true', () => {})
    it('devrait NE PAS afficher Approuver si canApprove=false', () => {})
    it('devrait afficher le bouton Payer si canPay=true', () => {})
    it('devrait afficher le bouton Corrections si canRequestCorrections=true', () => {})
    it('devrait afficher le bouton Rejeter si canReject=true', () => {})
  })

  describe('interactions', () => {
    it('devrait appeler onApprove au clic sur Approuver', () => {})
    it('devrait appeler onPay au clic sur Payer', () => {})
    it('devrait ouvrir le modal de corrections au clic sur Corrections', () => {})
    it('devrait désactiver les boutons pendant le loading', () => {})
  })

  describe('accessibilité', () => {
    it('devrait avoir les labels ARIA appropriés', () => {})
    it('devrait supporter la navigation clavier', () => {})
  })
})

describe('MembershipRequestRow', () => {
  describe('affichage des informations', () => {
    it('devrait afficher la photo du demandeur', () => {})
    it('devrait afficher le nom complet', () => {})
    it('devrait afficher le matricule', () => {})
    it('devrait afficher le badge de statut avec la bonne couleur', () => {})
    it('devrait afficher le badge de paiement', () => {})
    it('devrait afficher la date relative', () => {})
  })

  describe('badge d\'urgence', () => {
    it('devrait afficher le badge urgent si > 14 jours', () => {})
    it('devrait NE PAS afficher le badge urgent si < 14 jours', () => {})
  })
})
```

---

## 4. Tests d'Intégration

### 4.1 Flux de Liste des Demandes

```typescript
describe('Integration: Liste des demandes', () => {
  describe('Flux complet: Repository → Service → Hook → Component', () => {
    it('devrait afficher la liste avec pagination', async () => {
      // 1. Seed: 25 demandes dans Firestore (emulator)
      // 2. Mount: composant MembershipRequestsList
      // 3. Assert: 10 demandes affichées, pagination visible
      // 4. Act: clic sur page 2
      // 5. Assert: demandes 11-20 affichées
    })

    it('devrait filtrer par statut et mettre à jour la liste', async () => {
      // 1. Seed: 5 pending, 3 approved
      // 2. Mount: composant
      // 3. Act: sélectionner filtre "En attente"
      // 4. Assert: 5 demandes affichées, stats mises à jour
    })

    it('devrait rechercher et mettre à jour la liste', async () => {
      // 1. Seed: "Jean Dupont", "Marie Koumba"
      // 2. Act: recherche "Dupont"
      // 3. Assert: 1 résultat
    })
  })
})
```

### 4.2 Flux d'Approbation

```typescript
describe('Integration: Approbation d\'une demande', () => {
  it('devrait approuver une demande et créer toutes les entités', async () => {
    // Arrange
    const requestId = await seedMembershipRequest({ status: 'pending', isPaid: true })
    
    // Act
    const { result } = renderHook(() => useMembershipActions())
    await act(() => result.current.approve(requestId, { membershipType: 'standard' }))
    
    // Assert
    // 1. Vérifier le user Firebase Auth créé
    const authUser = await admin.auth().getUserByEmail(testEmail)
    expect(authUser).toBeDefined()
    
    // 2. Vérifier le document user
    const userDoc = await db.collection('users').doc(authUser.uid).get()
    expect(userDoc.data()?.role).toBe('Member')
    
    // 3. Vérifier le document member
    const memberDoc = await db.collection('members').where('userId', '==', authUser.uid).get()
    expect(memberDoc.docs).toHaveLength(1)
    
    // 4. Vérifier l'abonnement
    const subscriptionDoc = await db.collection('subscriptions').where('userId', '==', authUser.uid).get()
    expect(subscriptionDoc.docs).toHaveLength(1)
    
    // 5. Vérifier le statut mis à jour
    const requestDoc = await db.collection('membership-requests').doc(requestId).get()
    expect(requestDoc.data()?.status).toBe('approved')
    
    // 6. Vérifier la notification
    const notifications = await db.collection('notifications').where('relatedId', '==', requestId).get()
    expect(notifications.docs).toHaveLength(1)
  })

  it('devrait rollback si une étape échoue', async () => {
    // Simuler une erreur à l'étape 3 (création member)
    // Vérifier que user est supprimé, statut inchangé
  })
})
```

### 4.3 Flux de Paiement

```typescript
describe('Integration: Paiement d\'une demande', () => {
  it('devrait enregistrer le paiement et mettre à jour le statut', async () => {
    // 1. Seed: demande pending, non payée
    // 2. Act: processPayment avec montant, mode
    // 3. Assert: isPaid=true, paidAt défini, reçu créé
  })

  it('devrait permettre l\'approbation après paiement', async () => {
    // 1. Seed: demande pending, non payée
    // 2. Act: payer
    // 3. Assert: bouton Approuver devient actif
    // 4. Act: approuver
    // 5. Assert: succès
  })
})
```

### 4.4 Flux de Corrections

```typescript
describe('Integration: Demande de corrections', () => {
  it('devrait générer un code et envoyer une notification', async () => {
    // 1. Seed: demande pending
    // 2. Act: requestCorrections avec liste
    // 3. Assert: status='under_review', securityCode généré
    // 4. Assert: notification créée
  })

  it('devrait permettre au demandeur de corriger avec le code', async () => {
    // 1. Seed: demande under_review avec code
    // 2. Act: mise à jour avec code valide
    // 3. Assert: données mises à jour, code marqué utilisé
  })

  it('devrait rejeter une correction avec code expiré', async () => {})
  it('devrait rejeter une correction avec code déjà utilisé', async () => {})
})
```

---

## 5. Tests E2E

### 5.1 Configuration E2E

```typescript
// e2e/membership-requests/fixtures.ts
export const ADMIN_CREDENTIALS = {
  email: 'admin@test.com',
  password: 'TestPassword123!'
}

export const TEST_REQUESTS = {
  pending_unpaid: { /* ... */ },
  pending_paid: { /* ... */ },
  under_review: { /* ... */ },
  approved: { /* ... */ },
  rejected: { /* ... */ },
}
```

### 5.2 User Journey: Consultation de la Liste

```typescript
// e2e/membership-requests/list.spec.ts
describe('E2E: Liste des demandes d\'adhésion', () => {
  test.beforeEach(async ({ page }) => {
    // Connexion admin
    await loginAsAdmin(page)
    await page.goto('/membership-requests')
    await page.waitForLoadState('networkidle')
  })

  test('devrait afficher la liste des demandes', async ({ page }) => {
    // 1. Vérifier le titre de la page
    await expect(page.locator('h1')).toContainText('Demandes d\'Adhésion')
    
    // 2. Vérifier les statistiques
    await expect(page.locator('[data-testid="stats-total"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-pending"]')).toBeVisible()
    
    // 3. Vérifier la présence de demandes
    const rows = page.locator('[data-testid="membership-request-row"]')
    await expect(rows).toHaveCount(await rows.count() > 0 ? await rows.count() : 0)
    
    // 4. Vérifier la pagination si > 10 demandes
    if (await rows.count() > 10) {
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible()
    }
  })

  test('devrait filtrer par statut "En attente"', async ({ page }) => {
    // 1. Cliquer sur le filtre
    await page.click('[data-testid="filter-status-pending"]')
    
    // 2. Attendre le chargement
    await page.waitForLoadState('networkidle')
    
    // 3. Vérifier que toutes les lignes ont le badge "En attente"
    const badges = page.locator('[data-testid="status-badge"]')
    const count = await badges.count()
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toContainText('En attente')
    }
  })

  test('devrait rechercher par nom', async ({ page }) => {
    // 1. Entrer un terme de recherche
    await page.fill('[data-testid="search-input"]', 'Dupont')
    
    // 2. Attendre le debounce (300ms)
    await page.waitForTimeout(500)
    
    // 3. Vérifier les résultats
    const rows = page.locator('[data-testid="membership-request-row"]')
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText(/dupont/i)
    }
  })

  test('devrait paginer correctement', async ({ page }) => {
    // 1. Vérifier qu'on est sur la page 1
    await expect(page.locator('[data-testid="page-current"]')).toContainText('1')
    
    // 2. Mémoriser les demandes de la page 1
    const firstRow = await page.locator('[data-testid="membership-request-row"]').first().textContent()
    
    // 3. Aller à la page 2
    await page.click('[data-testid="page-next"]')
    await page.waitForLoadState('networkidle')
    
    // 4. Vérifier qu'on est sur la page 2
    await expect(page.locator('[data-testid="page-current"]')).toContainText('2')
    
    // 5. Vérifier que le contenu a changé
    const newFirstRow = await page.locator('[data-testid="membership-request-row"]').first().textContent()
    expect(firstRow).not.toBe(newFirstRow)
  })

  test('devrait persister les filtres dans l\'URL', async ({ page }) => {
    // 1. Appliquer un filtre
    await page.click('[data-testid="filter-status-approved"]')
    await page.waitForLoadState('networkidle')
    
    // 2. Vérifier l'URL
    expect(page.url()).toContain('status=approved')
    
    // 3. Recharger la page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // 4. Vérifier que le filtre est toujours actif
    await expect(page.locator('[data-testid="filter-status-approved"]')).toHaveClass(/active/)
  })
})
```

### 5.3 User Journey: Approbation d'une Demande

```typescript
// e2e/membership-requests/approval.spec.ts
describe('E2E: Approbation d\'une demande', () => {
  test('devrait approuver une demande payée', async ({ page }) => {
    // Arrange
    await loginAsAdmin(page)
    const requestId = await seedPaidPendingRequest()
    await page.goto('/membership-requests')
    
    // Act: trouver la ligne et cliquer sur Approuver
    const row = page.locator(`[data-testid="request-${requestId}"]`)
    await row.locator('button:has-text("Approuver")').click()
    
    // Assert: modal de confirmation
    await expect(page.locator('[data-testid="modal-approve"]')).toBeVisible()
    
    // Act: sélectionner le type d'adhésion
    await page.selectOption('[data-testid="membership-type-select"]', 'standard')
    
    // Act: confirmer
    await page.click('[data-testid="confirm-approve"]')
    
    // Assert: loading
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
    
    // Assert: succès
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('approuvée')
    
    // Assert: ligne mise à jour
    await expect(row.locator('[data-testid="status-badge"]')).toContainText('Approuvée')
    
    // Assert: boutons d'action changés
    await expect(row.locator('button:has-text("Approuver")')).not.toBeVisible()
  })

  test('devrait NE PAS pouvoir approuver une demande non payée', async ({ page }) => {
    await loginAsAdmin(page)
    const requestId = await seedUnpaidPendingRequest()
    await page.goto('/membership-requests')
    
    const row = page.locator(`[data-testid="request-${requestId}"]`)
    
    // Assert: bouton Approuver absent ou désactivé
    const approveButton = row.locator('button:has-text("Approuver")')
    if (await approveButton.count() > 0) {
      await expect(approveButton).toBeDisabled()
    }
    
    // Assert: bouton Payer visible
    await expect(row.locator('button:has-text("Payer")')).toBeVisible()
  })

  test('devrait afficher une erreur si l\'approbation échoue', async ({ page }) => {
    // Simuler une erreur côté serveur
    await page.route('**/api/membership-requests/*/approve', route => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Erreur serveur' }) })
    })
    
    await loginAsAdmin(page)
    const requestId = await seedPaidPendingRequest()
    await page.goto('/membership-requests')
    
    const row = page.locator(`[data-testid="request-${requestId}"]`)
    await row.locator('button:has-text("Approuver")').click()
    await page.selectOption('[data-testid="membership-type-select"]', 'standard')
    await page.click('[data-testid="confirm-approve"]')
    
    // Assert: erreur affichée
    await expect(page.locator('[data-testid="toast-error"]')).toBeVisible()
    
    // Assert: statut inchangé
    await expect(row.locator('[data-testid="status-badge"]')).toContainText('En attente')
  })
})
```

### 5.4 User Journey: Demande de Corrections

```typescript
// e2e/membership-requests/corrections.spec.ts
describe('E2E: Demande de corrections', () => {
  test('devrait demander des corrections via le formulaire', async ({ page }) => {
    await loginAsAdmin(page)
    const requestId = await seedPendingRequest()
    await page.goto('/membership-requests')
    
    // Act: ouvrir le modal de corrections
    const row = page.locator(`[data-testid="request-${requestId}"]`)
    await row.locator('button:has-text("Corrections")').click()
    
    // Assert: modal visible
    await expect(page.locator('[data-testid="modal-corrections"]')).toBeVisible()
    
    // Act: entrer les corrections
    await page.fill('[data-testid="corrections-textarea"]', 
      'Veuillez mettre à jour votre photo et corriger votre adresse.')
    
    // Act: confirmer
    await page.click('[data-testid="confirm-corrections"]')
    
    // Assert: succès
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible()
    
    // Assert: statut mis à jour
    await expect(row.locator('[data-testid="status-badge"]')).toContainText('En cours')
    
    // Assert: code de sécurité affiché
    await expect(page.locator('[data-testid="security-code"]')).toBeVisible()
  })

  test('devrait pouvoir envoyer les corrections via WhatsApp', async ({ page }) => {
    await loginAsAdmin(page)
    const requestId = await seedPendingRequest()
    await page.goto('/membership-requests')
    
    const row = page.locator(`[data-testid="request-${requestId}"]`)
    await row.locator('button:has-text("Corrections")').click()
    await page.fill('[data-testid="corrections-textarea"]', 'Correction requise')
    await page.click('[data-testid="confirm-corrections"]')
    
    // Assert: bouton WhatsApp visible
    await expect(page.locator('[data-testid="whatsapp-button"]')).toBeVisible()
    
    // Act: cliquer sur WhatsApp (intercepter l'ouverture de fenêtre)
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('[data-testid="whatsapp-button"]')
    ])
    
    // Assert: URL WhatsApp correcte
    expect(newPage.url()).toContain('wa.me')
  })
})
```

### 5.5 User Journey: Paiement

```typescript
// e2e/membership-requests/payment.spec.ts
describe('E2E: Paiement d\'une demande', () => {
  test('devrait enregistrer un paiement en espèces', async ({ page }) => {
    await loginAsAdmin(page)
    const requestId = await seedUnpaidPendingRequest()
    await page.goto('/membership-requests')
    
    const row = page.locator(`[data-testid="request-${requestId}"]`)
    await row.locator('button:has-text("Payer")').click()
    
    // Assert: modal de paiement
    await expect(page.locator('[data-testid="modal-payment"]')).toBeVisible()
    
    // Act: remplir le formulaire
    await page.fill('[data-testid="payment-amount"]', '25000')
    await page.selectOption('[data-testid="payment-mode"]', 'Cash')
    await page.fill('[data-testid="payment-date"]', '2026-01-16')
    await page.fill('[data-testid="payment-time"]', '10:30')
    
    // Act: confirmer
    await page.click('[data-testid="confirm-payment"]')
    
    // Assert: succès
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible()
    
    // Assert: badge de paiement mis à jour
    await expect(row.locator('[data-testid="payment-badge"]')).toContainText('Payé')
    
    // Assert: bouton Approuver maintenant visible
    await expect(row.locator('button:has-text("Approuver")')).toBeVisible()
  })

  test('devrait valider les champs du formulaire de paiement', async ({ page }) => {
    await loginAsAdmin(page)
    const requestId = await seedUnpaidPendingRequest()
    await page.goto('/membership-requests')
    
    const row = page.locator(`[data-testid="request-${requestId}"]`)
    await row.locator('button:has-text("Payer")').click()
    
    // Act: essayer de confirmer sans remplir
    await page.click('[data-testid="confirm-payment"]')
    
    // Assert: erreurs de validation
    await expect(page.locator('text=Le montant est requis')).toBeVisible()
    await expect(page.locator('text=Le mode de paiement est requis')).toBeVisible()
    
    // Act: entrer un montant invalide
    await page.fill('[data-testid="payment-amount"]', '-100')
    await page.click('[data-testid="confirm-payment"]')
    
    // Assert: erreur de montant
    await expect(page.locator('text=Le montant doit être positif')).toBeVisible()
  })
})
```

### 5.6 User Journey: Détails d'une Demande

```typescript
// e2e/membership-requests/details.spec.ts
describe('E2E: Détails d\'une demande', () => {
  test('devrait afficher tous les détails d\'une demande', async ({ page }) => {
    await loginAsAdmin(page)
    const requestId = await seedCompleteRequest()
    
    await page.goto(`/membership-requests/${requestId}`)
    await page.waitForLoadState('networkidle')
    
    // Assert: informations personnelles
    await expect(page.locator('[data-testid="section-identity"]')).toBeVisible()
    await expect(page.locator('[data-testid="field-fullname"]')).toBeVisible()
    await expect(page.locator('[data-testid="field-birthdate"]')).toBeVisible()
    
    // Assert: adresse
    await expect(page.locator('[data-testid="section-address"]')).toBeVisible()
    
    // Assert: profession
    await expect(page.locator('[data-testid="section-company"]')).toBeVisible()
    
    // Assert: documents
    await expect(page.locator('[data-testid="section-documents"]')).toBeVisible()
    
    // Assert: actions
    await expect(page.locator('[data-testid="actions-panel"]')).toBeVisible()
  })

  test('devrait afficher la pièce d\'identité', async ({ page }) => {
    await loginAsAdmin(page)
    const requestId = await seedRequestWithDocuments()
    
    await page.goto(`/membership-requests/${requestId}`)
    
    // Act: cliquer sur "Voir pièce d'identité"
    await page.click('[data-testid="view-id-document"]')
    
    // Assert: modal avec images recto/verso
    await expect(page.locator('[data-testid="modal-id-document"]')).toBeVisible()
    await expect(page.locator('[data-testid="id-document-recto"]')).toBeVisible()
    await expect(page.locator('[data-testid="id-document-verso"]')).toBeVisible()
  })

  test('devrait télécharger la fiche d\'adhésion PDF', async ({ page }) => {
    await loginAsAdmin(page)
    const requestId = await seedApprovedRequest()
    
    await page.goto(`/membership-requests/${requestId}`)
    
    // Act: cliquer sur "Fiche d'adhésion"
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-membership-pdf"]')
    
    // Assert: téléchargement
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})
```

### 5.7 Tests Responsive

```typescript
// e2e/membership-requests/responsive.spec.ts
describe('E2E: Responsive Design', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 },
  ]

  for (const viewport of viewports) {
    test(`devrait afficher correctement sur ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await loginAsAdmin(page)
      await page.goto('/membership-requests')
      
      // Assert: contenu principal visible
      await expect(page.locator('h1')).toBeVisible()
      
      // Assert: liste visible
      await expect(page.locator('[data-testid="requests-list"]')).toBeVisible()
      
      // Assert: actions accessibles
      const firstRow = page.locator('[data-testid="membership-request-row"]').first()
      if (viewport.name === 'Mobile') {
        // Sur mobile, les actions sont dans un menu
        await firstRow.locator('[data-testid="actions-menu"]').click()
        await expect(page.locator('[data-testid="dropdown-menu"]')).toBeVisible()
      } else {
        // Sur desktop, les boutons sont visibles
        await expect(firstRow.locator('button:has-text("Approuver")')).toBeVisible()
      }
    })
  }
})
```

---

## 6. Données de Test (Fixtures)

### 6.1 Fixtures TypeScript

```typescript
// src/domains/memberships/__tests__/fixtures/membership-request.fixture.ts

import { MembershipRequest } from '@/types/types'

export const createMembershipRequestFixture = (
  overrides: Partial<MembershipRequest> = {}
): MembershipRequest => ({
  id: `test-${Date.now()}`,
  matricule: `MK_2025_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
  status: 'pending',
  isPaid: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  identity: {
    civility: 'Monsieur',
    firstName: 'Jean',
    lastName: 'Dupont',
    birthDate: '1990-05-15',
    birthPlace: 'Libreville',
    birthCertificateNumber: 'LBV-1990-123456',
    nationality: 'GA',
    gender: 'Homme',
    maritalStatus: 'Célibataire',
    contacts: ['+24165671734'],
    email: 'jean.dupont@test.com',
    religion: 'Christianisme',
    prayerPlace: 'Église St-Michel',
    hasCar: false,
    photoURL: 'https://example.com/photo.jpg',
  },
  address: {
    province: 'Estuaire',
    city: 'Libreville',
    district: 'Centre-Ville',
    arrondissement: '1er Arrondissement',
    street: '123 Rue de Test',
  },
  company: {
    isEmployed: true,
    companyName: 'Test Corp',
    profession: 'Ingénieur',
    seniority: '5 ans',
    companyAddress: {
      province: 'Estuaire',
      city: 'Libreville',
    },
  },
  documents: {
    identityDocument: 'CNI',
    identityDocumentNumber: '1234567890',
    issuingDate: '2020-01-15',
    expirationDate: '2030-01-15',
    issuingPlace: 'Libreville',
    photoFront: 'https://example.com/front.jpg',
    photoBack: 'https://example.com/back.jpg',
    termsAccepted: true,
  },
  ...overrides,
})

// Variantes pré-définies
export const pendingUnpaidRequest = createMembershipRequestFixture({
  status: 'pending',
  isPaid: false,
})

export const pendingPaidRequest = createMembershipRequestFixture({
  status: 'pending',
  isPaid: true,
  paidAt: new Date(),
  paymentInfo: {
    amount: 25000,
    mode: 'Cash',
    date: new Date().toISOString(),
  },
})

export const underReviewRequest = createMembershipRequestFixture({
  status: 'under_review',
  isPaid: true,
  corrections: 'Veuillez mettre à jour votre photo.',
  securityCode: '123456',
  securityCodeUsed: false,
  securityCodeExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
})

export const approvedRequest = createMembershipRequestFixture({
  status: 'approved',
  isPaid: true,
  processedAt: new Date(),
  processedBy: 'admin-123',
})

export const rejectedRequest = createMembershipRequestFixture({
  status: 'rejected',
  isPaid: false,
  processedAt: new Date(),
  processedBy: 'admin-123',
  rejectionReason: 'Documents incomplets.',
})

// Liste pour les tests de pagination
export const generateManyRequests = (count: number): MembershipRequest[] => {
  return Array(count)
    .fill(0)
    .map((_, i) =>
      createMembershipRequestFixture({
        id: `test-${i}`,
        matricule: `MK_2025_${String(i).padStart(4, '0')}`,
        identity: {
          ...createMembershipRequestFixture().identity,
          firstName: `Prénom${i}`,
          lastName: `Nom${i}`,
          email: `user${i}@test.com`,
        },
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // i jours dans le passé
      })
    )
}
```

### 6.2 Fixtures pour les Statistiques

```typescript
// src/domains/memberships/__tests__/fixtures/statistics.fixture.ts

export const statisticsFixture = {
  total: 127,
  byStatus: {
    pending: 45,
    under_review: 12,
    approved: 58,
    rejected: 12,
  },
  byPayment: {
    paid: 70,
    unpaid: 57,
  },
  percentages: {
    pending: 35.4,
    under_review: 9.4,
    approved: 45.7,
    rejected: 9.4,
  },
}
```

---

## 7. Mocks et Stubs

### 7.1 Mock Repository

```typescript
// src/domains/memberships/__tests__/mocks/repositories/MembershipRepository.mock.ts

import { IMembershipRepository } from '../../repositories/IMembershipRepository'
import { createMembershipRequestFixture, generateManyRequests } from '../fixtures'

export const createMockMembershipRepository = (
  overrides: Partial<IMembershipRepository> = {}
): IMembershipRepository => ({
  getAll: vi.fn().mockResolvedValue({
    items: generateManyRequests(10),
    pagination: { page: 1, limit: 10, totalItems: 25, totalPages: 3 },
  }),
  
  getById: vi.fn().mockResolvedValue(createMembershipRequestFixture()),
  
  updateStatus: vi.fn().mockResolvedValue(undefined),
  
  markAsPaid: vi.fn().mockResolvedValue(undefined),
  
  getStatistics: vi.fn().mockResolvedValue({
    total: 10,
    pending: 5,
    approved: 3,
    rejected: 2,
    under_review: 0,
    paid: 4,
    unpaid: 6,
  }),
  
  search: vi.fn().mockResolvedValue([]),
  
  ...overrides,
})
```

### 7.2 Mock Service

```typescript
// src/domains/memberships/__tests__/mocks/services/MembershipService.mock.ts

import { IMembershipService } from '../../services/IMembershipService'

export const createMockMembershipService = (
  overrides: Partial<IMembershipService> = {}
): IMembershipService => ({
  approveMembershipRequest: vi.fn().mockResolvedValue({
    userId: 'new-user-123',
    memberId: 'new-member-123',
  }),
  
  rejectMembershipRequest: vi.fn().mockResolvedValue(undefined),
  
  requestCorrections: vi.fn().mockResolvedValue({
    securityCode: '123456',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  }),
  
  processPayment: vi.fn().mockResolvedValue({
    receiptId: 'receipt-123',
  }),
  
  regenerateSecurityCode: vi.fn().mockResolvedValue({
    securityCode: '654321',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  }),
  
  ...overrides,
})
```

### 7.3 Mock Firestore

```typescript
// src/domains/memberships/__tests__/mocks/firebase/firestore.mock.ts

export const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })),
    add: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
    where: vi.fn(() => ({
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
    })),
  })),
}

vi.mock('@/firebase/clientApp', () => ({
  db: mockFirestore,
}))
```

---

## 8. Planning d'Implémentation

### Phase 1 : Tests Unitaires (Semaine 1-2)

| Jour | Tâche | Tests |
|------|-------|-------|
| J1 | Setup + Fixtures | Créer les fixtures et mocks |
| J2 | Repository.getAll | 12 tests |
| J3 | Repository.getById, updateStatus | 8 tests |
| J4 | Repository.markAsPaid, getStatistics | 8 tests |
| J5 | Service.approveMembershipRequest | 15 tests |
| J6 | Service.rejectMembershipRequest | 8 tests |
| J7 | Service.requestCorrections | 10 tests |
| J8 | Service.processPayment | 10 tests |
| J9 | Utils (securityCode, whatsapp, validation) | 25 tests |
| J10 | Hooks (useMembershipRequests) | 15 tests |

### Phase 2 : Tests d'Intégration (Semaine 3)

| Jour | Tâche | Tests |
|------|-------|-------|
| J11 | Setup Firebase Emulator | Configuration |
| J12 | Integration: Liste + Pagination | 5 tests |
| J13 | Integration: Approbation | 5 tests |
| J14 | Integration: Corrections | 5 tests |
| J15 | Integration: Paiement | 5 tests |

### Phase 3 : Tests E2E (Semaine 4)

| Jour | Tâche | Tests |
|------|-------|-------|
| J16 | E2E: Liste + Filtres | 6 tests |
| J17 | E2E: Approbation | 4 tests |
| J18 | E2E: Corrections + WhatsApp | 4 tests |
| J19 | E2E: Paiement | 4 tests |
| J20 | E2E: Détails + Responsive | 6 tests |

### Phase 4 : Implémentation du Code (Semaines 5-8)

Suivre le cycle TDD : pour chaque test qui échoue, écrire le code minimal pour le faire passer.

---

## 9. Checklist de Validation

### 9.1 Avant de Commencer le Refactoring

- [ ] Tous les tests unitaires sont écrits et échouent (RED)
- [ ] Tous les tests d'intégration sont écrits et échouent
- [ ] Tous les tests E2E sont écrits et échouent
- [ ] Les fixtures et mocks sont prêts
- [ ] Firebase Emulator est configuré

### 9.2 Pendant le Développement

- [ ] Chaque commit fait passer au moins un test
- [ ] La couverture augmente à chaque sprint
- [ ] Aucun test précédemment vert ne devient rouge
- [ ] Les tests E2E passent sur Desktop, Tablet, Mobile

### 9.3 Avant la Mise en Production

- [ ] Couverture unitaire ≥ 80%
- [ ] Couverture intégration ≥ 70%
- [ ] Tous les tests E2E passent
- [ ] Tests de performance passent (< 3s pour charger 100 demandes)
- [ ] Tests d'accessibilité passent (WCAG 2.1 AA)
- [ ] Review par un QA senior

### 9.4 Commandes de Test

```bash
# Tests unitaires uniquement
npm run test:unit

# Tests avec couverture
npm run test:coverage

# Tests d'intégration (avec emulator)
npm run test:integration

# Tests E2E
npm run test:e2e

# Tests E2E sur un navigateur spécifique
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=mobile
npm run test:e2e -- --project=tablet

# Tests E2E avec interface visuelle
npm run test:e2e:ui

# Tous les tests
npm run test:all
```

---

## 10. Métriques de Succès

| Métrique | Objectif | Seuil Minimum |
|----------|----------|---------------|
| Couverture de code (unitaires) | 80% | 70% |
| Couverture de code (intégration) | 70% | 60% |
| Tests E2E passants | 100% | 95% |
| Temps d'exécution (unitaires) | < 30s | < 60s |
| Temps d'exécution (E2E) | < 5min | < 10min |
| Bugs découverts en production | 0 | < 3 |

---

## Références

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- `ANALYSE_ACTUELLE.md` - État actuel du module
- `DIAGRAMMES_SEQUENCE.puml` - Flux à tester
