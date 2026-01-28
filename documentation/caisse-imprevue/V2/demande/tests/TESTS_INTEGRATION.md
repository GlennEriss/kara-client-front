# Tests d'Intégration - Module Demandes Caisse Imprévue V2

> Plan détaillé des tests d'intégration pour le module Demandes Caisse Imprévue V2

## 📋 Vue d'ensemble

**Objectif** : Tester l'interaction entre plusieurs unités (composants ↔ services ↔ repositories ↔ Firestore)

**Framework** : Vitest + React Testing Library  
**Structure** : `src/domains/financial/caisse-imprevue/__tests__/integration/`  
**Couverture cible** : 70%+

**Total estimé** : ~40 cas de test d'intégration

---

## 🎯 Types de Tests d'Intégration

1. **Flux complets** : Composant → Hook → Service → Repository → Firestore
2. **Cache React Query** : Hook → Cache → Repository
3. **Notifications** : Service → NotificationService → Firestore
4. **Validation** : Schema → Service → Repository
5. **Pagination serveur** : Hook → Repository → Firestore → Cache

---

## 🧪 1. Tests de Création Complète

### 1.1 Création d'une Demande (Flux Complet)

**IT-CI-01** : Devrait créer une demande complète (formulaire → service → repository → Firestore → notification)

```typescript
describe('IT-CI-01: Création complète d\'une demande', () => {
  it('should complete full flow: Form → Service → Repository → Firestore → Notification', async () => {
    // Arrange
    const member = await createTestMember()
    const subscription = await createTestSubscriptionCI()
    const adminId = 'admin-1'
    
    const formData = {
      memberId: member.id,
      cause: 'Motif valide avec plus de 10 caractères minimum requis',
      subscriptionCIID: subscription.id,
      paymentFrequency: 'MONTHLY' as const,
      desiredDate: new Date(),
      emergencyContact: {
        lastName: 'Dupont',
        firstName: 'Jean',
        phone1: '+24165671734',
        relationship: 'Famille',
        typeId: 'CNI',
        idNumber: '123456789'
      }
    }
    
    // Act
    const result = await CaisseImprevueService.createDemand(formData, adminId)
    
    // Assert
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.status).toBe('PENDING')
    expect(result.memberId).toBe(member.id)
    expect(result.cause).toBe(formData.cause)
    expect(result.createdBy).toBe(adminId)
    expect(result.createdAt).toBeInstanceOf(Date)
    
    // Vérifier dans Firestore
    const firestoreDoc = await getFirestoreDoc(`caisseImprevueDemands/${result.id}`)
    expect(firestoreDoc).toBeDefined()
    expect(firestoreDoc.data().status).toBe('PENDING')
    
    // Vérifier la notification
    const notifications = await getNotifications({ 
      module: 'caisse_imprevue',
      type: 'caisse_imprevue_demand_created'
    })
    expect(notifications.length).toBeGreaterThan(0)
    expect(notifications[0].metadata.demandId).toBe(result.id)
  })
})
```

**IT-CI-02** : Devrait valider les données avant création

```typescript
describe('IT-CI-02: Validation avant création', () => {
  it('should validate cause length before creation', async () => {
    // Arrange
    const formData = {
      ...createValidDemandData(),
      cause: 'Court' // Trop court
    }
    
    // Act & Assert
    await expect(
      CaisseImprevueService.createDemand(formData, 'admin-1')
    ).rejects.toThrow('cause must be at least 10 characters')
  })
  
  it('should validate emergencyContact before creation', async () => {
    // Arrange
    const formData = {
      ...createValidDemandData(),
      emergencyContact: {
        ...createValidEmergencyContact(),
        lastName: '' // Manquant
      }
    }
    
    // Act & Assert
    await expect(
      CaisseImprevueService.createDemand(formData, 'admin-1')
    ).rejects.toThrow('emergencyContact.lastName is required')
  })
})
```

### 1.2 Persistance du Formulaire (localStorage)

**IT-CI-03** : Devrait sauvegarder les données du formulaire dans localStorage

```typescript
describe('IT-CI-03: Persistance formulaire localStorage', () => {
  it('should save form data to localStorage on step change', async () => {
    // Arrange
    const { result } = renderHook(() => useDemandForm())
    const formData = {
      memberId: 'member-1',
      cause: 'Motif valide avec plus de 10 caractères'
    }
    
    // Act
    act(() => {
      result.current.form.setValue('memberId', formData.memberId)
      result.current.form.setValue('cause', formData.cause)
    })
    
    await waitFor(() => {
      const saved = localStorage.getItem('demand-form-state')
      expect(saved).toBeDefined()
    })
    
    // Assert
    const saved = JSON.parse(localStorage.getItem('demand-form-state')!)
    expect(saved.memberId).toBe(formData.memberId)
    expect(saved.cause).toBe(formData.cause)
    expect(saved.version).toBeDefined()
    expect(saved.expiresAt).toBeGreaterThan(Date.now())
  })
  
  it('should restore form data from localStorage on mount', () => {
    // Arrange
    const savedData = {
      memberId: 'member-1',
      cause: 'Motif restauré',
      version: '1.0.0',
      expiresAt: Date.now() + 3600000
    }
    localStorage.setItem('demand-form-state', JSON.stringify(savedData))
    
    // Act
    const { result } = renderHook(() => useDemandFormPersistence())
    
    // Assert
    expect(result.current.formData.memberId).toBe(savedData.memberId)
    expect(result.current.formData.cause).toBe(savedData.cause)
  })
  
  it('should clear localStorage after successful submission', async () => {
    // Arrange
    localStorage.setItem('demand-form-state', JSON.stringify({ memberId: 'member-1' }))
    const { result } = renderHook(() => useDemandFormPersistence())
    
    // Act
    await result.current.clearFormData()
    
    // Assert
    expect(localStorage.getItem('demand-form-state')).toBeNull()
  })
})
```

---

## 🧪 2. Tests d'Acceptation/Refus/Réouverture

### 2.1 Acceptation d'une Demande

**IT-CI-04** : Devrait accepter une demande (modal → service → repository → notification)

```typescript
describe('IT-CI-04: Acceptation complète d\'une demande', () => {
  it('should complete approval flow: Modal → Service → Repository → Notification', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    const adminId = 'admin-1'
    const decisionReason = 'Raison d\'acceptation valide avec plus de 10 caractères'
    
    // Act
    const result = await CaisseImprevueService.approveDemand(
      demand.id,
      decisionReason,
      adminId
    )
    
    // Assert
    expect(result.status).toBe('APPROVED')
    expect(result.decisionReason).toBe(decisionReason)
    expect(result.decisionMadeBy).toBe(adminId)
    expect(result.decisionDate).toBeInstanceOf(Date)
    
    // Vérifier dans Firestore
    const firestoreDoc = await getFirestoreDoc(`caisseImprevueDemands/${demand.id}`)
    expect(firestoreDoc.data().status).toBe('APPROVED')
    
    // Vérifier la notification
    const notifications = await getNotifications({
      module: 'caisse_imprevue',
      type: 'caisse_imprevue_demand_approved',
      metadata: { demandId: demand.id }
    })
    expect(notifications.length).toBeGreaterThan(0)
  })
  
  it('should throw error when approving non-PENDING demand', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'APPROVED' })
    
    // Act & Assert
    await expect(
      CaisseImprevueService.approveDemand(demand.id, 'Reason', 'admin-1')
    ).rejects.toThrow('Only PENDING demands can be approved')
  })
})
```

### 2.2 Refus d'une Demande

**IT-CI-05** : Devrait refuser une demande (modal → service → repository → notification)

```typescript
describe('IT-CI-05: Refus complet d\'une demande', () => {
  it('should complete rejection flow: Modal → Service → Repository → Notification', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    const adminId = 'admin-1'
    const decisionReason = 'Raison de refus valide avec plus de 10 caractères'
    
    // Act
    const result = await CaisseImprevueService.rejectDemand(
      demand.id,
      decisionReason,
      adminId
    )
    
    // Assert
    expect(result.status).toBe('REJECTED')
    expect(result.decisionReason).toBe(decisionReason)
    expect(result.decisionMadeBy).toBe(adminId)
    
    // Vérifier la notification
    const notifications = await getNotifications({
      module: 'caisse_imprevue',
      type: 'caisse_imprevue_demand_rejected',
      metadata: { demandId: demand.id }
    })
    expect(notifications.length).toBeGreaterThan(0)
  })
})
```

### 2.3 Réouverture d'une Demande

**IT-CI-06** : Devrait réouvrir une demande refusée

```typescript
describe('IT-CI-06: Réouverture complète d\'une demande', () => {
  it('should complete reopen flow: Modal → Service → Repository → Notification', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'REJECTED' })
    const adminId = 'admin-1'
    const reopenReason = 'Raison de réouverture valide avec plus de 10 caractères'
    
    // Act
    const result = await CaisseImprevueService.reopenDemand(
      demand.id,
      reopenReason,
      adminId
    )
    
    // Assert
    expect(result.status).toBe('REOPENED')
    expect(result.reopenReason).toBe(reopenReason)
    expect(result.reopenedBy).toBe(adminId)
    expect(result.previousStatus).toBe('REJECTED')
    
    // Vérifier la notification
    const notifications = await getNotifications({
      module: 'caisse_imprevue',
      type: 'caisse_imprevue_demand_reopened',
      metadata: { demandId: demand.id }
    })
    expect(notifications.length).toBeGreaterThan(0)
  })
})
```

---

## 🧪 3. Tests de Pagination Serveur

### 3.1 Pagination avec React Query

**IT-CI-07** : Devrait paginer les demandes (hook → repository → Firestore → cache)

```typescript
describe('IT-CI-07: Pagination serveur avec React Query', () => {
  it('should fetch paginated demands and cache results', async () => {
    // Arrange
    await createMultipleTestDemands(25)
    const queryClient = new QueryClient()
    
    // Act - Page 1
    const { result: result1 } = renderHook(
      () => useCaisseImprevueDemands({ page: 1, pageSize: 10 }),
      { wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )}
    )
    
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    
    // Assert Page 1
    expect(result1.current.data?.data).toHaveLength(10)
    expect(result1.current.data?.page).toBe(1)
    expect(result1.current.data?.total).toBe(25)
    
    // Act - Page 2 (devrait utiliser le cache si disponible)
    const { result: result2 } = renderHook(
      () => useCaisseImprevueDemands({ page: 2, pageSize: 10 }),
      { wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )}
    )
    
    await waitFor(() => expect(result2.current.isSuccess).toBe(true))
    
    // Assert Page 2
    expect(result2.current.data?.data).toHaveLength(10)
    expect(result2.current.data?.page).toBe(2)
    
    // Vérifier que les données sont différentes
    expect(result2.current.data?.data[0].id).not.toBe(result1.current.data?.data[0].id)
  })
  
  it('should invalidate cache when demand is updated', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    const queryClient = new QueryClient()
    
    // Act - Fetch initial
    const { result } = renderHook(
      () => useCaisseImprevueDemands({}),
      { wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )}
    )
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    // Approve demand
    await CaisseImprevueService.approveDemand(demand.id, 'Reason', 'admin-1')
    
    // Invalidate cache
    queryClient.invalidateQueries({ queryKey: ['caisse-imprevue-demands'] })
    
    // Refetch
    await result.current.refetch()
    
    // Assert
    const updatedDemand = result.current.data?.data.find(d => d.id === demand.id)
    expect(updatedDemand?.status).toBe('APPROVED')
  })
})
```

### 3.2 Tri et Filtrage

**IT-CI-08** : Devrait trier les demandes (hook → repository → Firestore)

```typescript
describe('IT-CI-08: Tri des demandes', () => {
  it('should sort by createdAt desc', async () => {
    // Arrange
    const demand1 = await createTestDemand({ createdAt: new Date('2024-01-01') })
    const demand2 = await createTestDemand({ createdAt: new Date('2024-01-02') })
    
    // Act
    const { result } = renderHook(() => useCaisseImprevueDemands({
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }))
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    // Assert
    expect(result.current.data?.data[0].id).toBe(demand2.id)
    expect(result.current.data?.data[1].id).toBe(demand1.id)
  })
  
  it('should sort by memberLastName asc', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Zulu' })
    await createTestDemand({ memberLastName: 'Alpha' })
    
    // Act
    const { result } = renderHook(() => useCaisseImprevueDemands({
      sortBy: 'memberLastName',
      sortOrder: 'asc'
    }))
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    // Assert
    expect(result.current.data?.data[0].memberLastName).toBe('Alpha')
    expect(result.current.data?.data[1].memberLastName).toBe('Zulu')
  })
})
```

**IT-CI-09** : Devrait filtrer par statut

```typescript
describe('IT-CI-09: Filtrage par statut', () => {
  it('should filter by status', async () => {
    // Arrange
    await createTestDemand({ status: 'PENDING' })
    await createTestDemand({ status: 'APPROVED' })
    await createTestDemand({ status: 'REJECTED' })
    
    // Act
    const { result } = renderHook(() => useCaisseImprevueDemands({
      status: 'PENDING'
    }))
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    // Assert
    expect(result.current.data?.data.every(d => d.status === 'PENDING')).toBe(true)
    expect(result.current.data?.data.length).toBe(1)
  })
})
```

---

## 🧪 4. Tests de Recherche

### 4.1 Recherche avec Cache

**IT-CI-10** : Devrait rechercher et mettre en cache les résultats

```typescript
describe('IT-CI-10: Recherche avec cache', () => {
  it('should search demands and cache results', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Jean' })
    await createTestDemand({ memberLastName: 'Martin', memberFirstName: 'Pierre' })
    
    // Act - Première recherche
    const { result: result1 } = renderHook(() => useDemandSearch('Dupont'))
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    
    // Assert
    expect(result1.current.data?.data).toHaveLength(1)
    expect(result1.current.data?.data[0].memberLastName).toBe('Dupont')
    
    // Act - Deuxième recherche (même query, devrait utiliser le cache)
    const { result: result2 } = renderHook(() => useDemandSearch('Dupont'))
    
    // Assert
    expect(result2.current.isFetching).toBe(false) // Devrait utiliser le cache
    expect(result2.current.data?.data).toHaveLength(1)
  })
  
  it('should debounce search queries', async () => {
    // Arrange
    const { result } = renderHook(() => useDemandSearch(''))
    const searchSpy = vi.spyOn(DemandCIRepository.prototype, 'search')
    
    // Act
    act(() => {
      result.current.setQuery('D')
      result.current.setQuery('Du')
      result.current.setQuery('Dup')
      result.current.setQuery('Dupont')
    })
    
    // Attendre le debounce (500ms)
    await waitFor(() => {
      expect(result.current.query).toBe('Dupont')
    }, { timeout: 1000 })
    
    // Assert - Devrait n'avoir appelé search qu'une seule fois après debounce
    expect(searchSpy).toHaveBeenCalledTimes(1)
    expect(searchSpy).toHaveBeenCalledWith('Dupont', expect.any(Object))
  })
})
```

---

## 🧪 5. Tests de Cache des Forfaits

### 5.1 Cache des Subscriptions CI

**IT-CI-11** : Devrait mettre en cache les forfaits pour 30 minutes

```typescript
describe('IT-CI-11: Cache des forfaits', () => {
  it('should cache subscriptions for 30 minutes', async () => {
    // Arrange
    await createTestSubscriptionCI({ code: 'FORFAIT-A' })
    await createTestSubscriptionCI({ code: 'FORFAIT-B' })
    
    // Act - Première récupération
    const { result: result1 } = renderHook(() => useSubscriptionsCICache())
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    
    // Assert
    expect(result1.current.data).toHaveLength(2)
    
    // Act - Deuxième récupération (devrait utiliser le cache)
    const { result: result2 } = renderHook(() => useSubscriptionsCICache())
    
    // Assert
    expect(result2.current.isFetching).toBe(false) // Devrait utiliser le cache
    expect(result2.current.data).toHaveLength(2)
  })
  
  it('should filter active subscriptions', async () => {
    // Arrange
    await createTestSubscriptionCI({ status: 'ACTIVE' })
    await createTestSubscriptionCI({ status: 'INACTIVE' })
    
    // Act
    const { result } = renderHook(() => useSubscriptionsCICache({ status: 'ACTIVE' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    // Assert
    expect(result.current.data?.every(s => s.status === 'ACTIVE')).toBe(true)
    expect(result.current.data?.length).toBe(1)
  })
})
```

---

## 🧪 6. Tests de Conversion en Contrat

### 6.1 Création de Contrat depuis une Demande

**IT-CI-12** : Devrait créer un contrat depuis une demande acceptée

```typescript
describe('IT-CI-12: Création de contrat depuis demande', () => {
  it('should create contract from approved demand', async () => {
    // Arrange
    const demand = await createTestDemand({
      status: 'APPROVED',
      subscriptionCIID: 'sub-1',
      memberId: 'member-1',
      paymentFrequency: 'MONTHLY'
    })
    const adminId = 'admin-1'
    
    // Act
    const result = await CaisseImprevueService.createContractFromDemand(
      demand.id,
      adminId
    )
    
    // Assert
    expect(result.contract).toBeDefined()
    expect(result.contract.id).toBeDefined()
    expect(result.contract.memberId).toBe(demand.memberId)
    expect(result.contract.subscriptionCIID).toBe(demand.subscriptionCIID)
    
    // Vérifier que la demande est marquée comme convertie
    expect(result.demand.status).toBe('CONVERTED')
    expect(result.demand.contractId).toBe(result.contract.id)
    
    // Vérifier dans Firestore
    const contractDoc = await getFirestoreDoc(`contractsCI/${result.contract.id}`)
    expect(contractDoc).toBeDefined()
    
    const demandDoc = await getFirestoreDoc(`caisseImprevueDemands/${demand.id}`)
    expect(demandDoc.data().status).toBe('CONVERTED')
    expect(demandDoc.data().contractId).toBe(result.contract.id)
    
    // Vérifier la notification
    const notifications = await getNotifications({
      module: 'caisse_imprevue',
      type: 'caisse_imprevue_demand_converted',
      metadata: { demandId: demand.id, contractId: result.contract.id }
    })
    expect(notifications.length).toBeGreaterThan(0)
  })
  
  it('should throw error when demand is not APPROVED', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    
    // Act & Assert
    await expect(
      CaisseImprevueService.createContractFromDemand(demand.id, 'admin-1')
    ).rejects.toThrow('Only APPROVED demands can be converted')
  })
})
```

---

## 🧪 7. Tests de Suppression

### 7.1 Suppression d'une Demande

**IT-CI-13** : Devrait supprimer une demande refusée

```typescript
describe('IT-CI-13: Suppression d\'une demande', () => {
  it('should delete rejected demand and create notification', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'REJECTED' })
    const adminId = 'admin-1'
    
    // Act
    await CaisseImprevueService.deleteDemand(demand.id, adminId)
    
    // Assert - Vérifier que la demande n'existe plus dans Firestore
    const firestoreDoc = await getFirestoreDoc(`caisseImprevueDemands/${demand.id}`)
    expect(firestoreDoc).toBeNull()
    
    // Vérifier la notification (créée avant suppression)
    const notifications = await getNotifications({
      module: 'caisse_imprevue',
      type: 'caisse_imprevue_demand_deleted',
      metadata: { demandId: demand.id }
    })
    expect(notifications.length).toBeGreaterThan(0)
  })
  
  it('should throw error when deleting non-REJECTED demand', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    
    // Act & Assert
    await expect(
      CaisseImprevueService.deleteDemand(demand.id, 'admin-1')
    ).rejects.toThrow('Only REJECTED demands can be deleted')
  })
})
```

---

## 🧪 8. Tests de Simulation de Versements

### 8.1 Calcul du Plan de Remboursement

**IT-CI-14** : Devrait calculer le plan de remboursement mensuel

```typescript
describe('IT-CI-14: Calcul plan de remboursement', () => {
  it('should calculate monthly payment schedule', () => {
    // Arrange
    const demand = createDemandFixture({
      subscriptionCIAmountPerMonth: 10000,
      subscriptionCIDuration: 12,
      paymentFrequency: 'MONTHLY',
      desiredDate: new Date('2024-02-01')
    })
    
    // Act
    const schedule = DemandSimulationService.calculatePaymentSchedule(demand)
    
    // Assert
    expect(schedule.payments).toHaveLength(12)
    expect(schedule.payments[0].amount).toBe(10000)
    expect(schedule.payments[0].date).toBe('2024-02-01')
    expect(schedule.payments[1].date).toBe('2024-03-01')
    expect(schedule.totalAmount).toBe(120000)
    
    // Vérifier le cumulé
    let cumulative = 0
    schedule.payments.forEach((payment, index) => {
      cumulative += payment.amount
      expect(payment.cumulative).toBe(cumulative)
    })
  })
  
  it('should calculate daily payment schedule', () => {
    // Arrange
    const demand = createDemandFixture({
      subscriptionCIAmountPerMonth: 30000,
      subscriptionCIDuration: 30,
      paymentFrequency: 'DAILY',
      desiredDate: new Date('2024-02-01')
    })
    
    // Act
    const schedule = DemandSimulationService.calculatePaymentSchedule(demand)
    
    // Assert
    expect(schedule.payments).toHaveLength(30)
    expect(schedule.payments[0].amount).toBeCloseTo(1000, 2) // 30000 / 30
    expect(schedule.totalAmount).toBe(30000)
  })
})
```

---

## 🧪 9. Tests d'Optimistic Updates

### 9.1 Mise à Jour Optimiste

**IT-CI-15** : Devrait mettre à jour optimistiquement la liste après acceptation

```typescript
describe('IT-CI-15: Optimistic updates', () => {
  it('should optimistically update list after approval', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    const queryClient = new QueryClient()
    
    // Act - Fetch initial
    const { result } = renderHook(
      () => useCaisseImprevueDemands({ status: 'PENDING' }),
      { wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )}
    )
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.data.find(d => d.id === demand.id)?.status).toBe('PENDING')
    
    // Act - Approve avec optimistic update
    const approveMutation = useMutation({
      mutationFn: (data: { demandId: string, reason: string }) =>
        CaisseImprevueService.approveDemand(data.demandId, data.reason, 'admin-1'),
      onMutate: async (variables) => {
        // Optimistic update
        await queryClient.cancelQueries({ queryKey: ['caisse-imprevue-demands'] })
        const previousData = queryClient.getQueryData(['caisse-imprevue-demands', { status: 'PENDING' }])
        
        queryClient.setQueryData(['caisse-imprevue-demands', { status: 'PENDING' }], (old: any) => {
          return {
            ...old,
            data: old.data.map((d: any) =>
              d.id === variables.demandId ? { ...d, status: 'APPROVED' } : d
            )
          }
        })
        
        return { previousData }
      },
      onError: (err, variables, context) => {
        // Rollback on error
        queryClient.setQueryData(['caisse-imprevue-demands', { status: 'PENDING' }], context?.previousData)
      }
    })
    
    await approveMutation.mutateAsync({ demandId: demand.id, reason: 'Reason' })
    
    // Assert - Vérifier que la liste est mise à jour
    const updatedData = queryClient.getQueryData(['caisse-imprevue-demands', { status: 'PENDING' }]) as any
    expect(updatedData.data.find((d: any) => d.id === demand.id)).toBeUndefined() // Plus dans PENDING
  })
})
```

---

## 📊 Matrice de Couverture

| Fonctionnalité | Tests | Priorité |
|----------------|-------|----------|
| **Création complète** | 3 | P0 |
| **Acceptation/Refus/Réouverture** | 3 | P0 |
| **Pagination serveur** | 3 | P0 |
| **Recherche** | 2 | P1 |
| **Cache forfaits** | 2 | P1 |
| **Conversion contrat** | 2 | P0 |
| **Suppression** | 2 | P1 |
| **Simulation versements** | 2 | P1 |
| **Optimistic updates** | 1 | P2 |
| **TOTAL** | **20** | |

---

## ✅ Checklist d'Implémentation

- [ ] Créer le dossier `__tests__/integration/`
- [ ] Créer les fixtures de test (`FIXTURES.md`)
- [ ] Créer les mocks nécessaires (`MOCKS.md`)
- [ ] Implémenter les tests de création (3 tests)
- [ ] Implémenter les tests d'acceptation/refus/réouverture (3 tests)
- [ ] Implémenter les tests de pagination (3 tests)
- [ ] Implémenter les tests de recherche (2 tests)
- [ ] Implémenter les tests de cache (2 tests)
- [ ] Implémenter les tests de conversion (2 tests)
- [ ] Implémenter les tests de suppression (2 tests)
- [ ] Implémenter les tests de simulation (2 tests)
- [ ] Implémenter les tests d'optimistic updates (1 test)
- [ ] Vérifier la couverture (objectif 70%+)
- [ ] Corriger les tests qui échouent

---

## 📚 Références

- **Tests unitaires** : `TESTS_UNITAIRES.md`
- **Tests E2E** : `TESTS_E2E.md`
- **Fixtures** : `FIXTURES.md`
- **Mocks** : `MOCKS.md`
- **Solutions proposées** : `../SOLUTIONS_PROPOSEES.md`

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior QA
