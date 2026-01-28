# Tests Unitaires - Module Demandes Caisse Imprévue V2

> Plan détaillé des tests unitaires pour le module Demandes Caisse Imprévue V2

## 📋 Vue d'ensemble

**Objectif de couverture : 80% minimum**

**Fichiers à tester** :
- Repositories : `DemandCIRepository.ts`
- Services : `CaisseImprevueService.ts`, `DemandSimulationService.ts`
- Hooks : `useCaisseImprevueDemands.ts`, `useDemandForm.ts`, `useDemandFormPersistence.ts`, `useSubscriptionsCICache.ts`, `useDemandSimulation.ts`, `useDemandSearch.ts`
- Utils : Fonctions utilitaires (formatage, validation, calculs)
- Schemas : Validation Zod

---

## 🧪 1. Repositories

### 1.1 DemandCIRepository

**Fichier :** `src/domains/financial/caisse-imprevue/repositories/DemandCIRepository.ts`

#### `create(demand: CreateDemandCIDto)`

**Tests :**
```typescript
describe('DemandCIRepository.create', () => {
  it('should create demand with valid data', async () => {
    // Arrange
    const demandData = createDemandFixture()
    const mockFirestore = createMockFirestore()
    
    // Act
    const result = await repository.create(demandData)
    
    // Assert
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.status).toBe('PENDING')
    expect(mockFirestore.collection('caisseImprevueDemands').add).toHaveBeenCalled()
  })
  
  it('should throw error when memberId is missing', async () => {
    // Arrange
    const demandData = { ...createDemandFixture(), memberId: '' }
    
    // Act & Assert
    await expect(repository.create(demandData)).rejects.toThrow('memberId is required')
  })
  
  it('should throw error when cause is too short', async () => {
    // Arrange
    const demandData = { ...createDemandFixture(), cause: 'short' }
    
    // Act & Assert
    await expect(repository.create(demandData)).rejects.toThrow('cause must be at least 10 characters')
  })
  
  it('should throw error when cause is too long', async () => {
    // Arrange
    const demandData = { ...createDemandFixture(), cause: 'a'.repeat(501) }
    
    // Act & Assert
    await expect(repository.create(demandData)).rejects.toThrow('cause must not exceed 500 characters')
  })
  
  it('should throw error when emergencyContact is missing', async () => {
    // Arrange
    const demandData = { ...createDemandFixture(), emergencyContact: null }
    
    // Act & Assert
    await expect(repository.create(demandData)).rejects.toThrow('emergencyContact is required')
  })
  
  it('should throw error when emergencyContact.lastName is missing', async () => {
    // Arrange
    const demandData = {
      ...createDemandFixture(),
      emergencyContact: { ...createDemandFixture().emergencyContact, lastName: '' }
    }
    
    // Act & Assert
    await expect(repository.create(demandData)).rejects.toThrow('emergencyContact.lastName is required')
  })
  
  it('should throw error when emergencyContact.phone1 is missing', async () => {
    // Arrange
    const demandData = {
      ...createDemandFixture(),
      emergencyContact: { ...createDemandFixture().emergencyContact, phone1: '' }
    }
    
    // Act & Assert
    await expect(repository.create(demandData)).rejects.toThrow('emergencyContact.phone1 is required')
  })
  
  it('should set createdAt and updatedAt timestamps', async () => {
    // Arrange
    const demandData = createDemandFixture()
    const beforeCreate = new Date()
    
    // Act
    const result = await repository.create(demandData)
    
    // Assert
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.updatedAt).toBeInstanceOf(Date)
    expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
  })
})
```

#### `getById(id: string)`

**Tests :**
```typescript
describe('DemandCIRepository.getById', () => {
  it('should return demand when exists', async () => {
    // Arrange
    const demand = await createTestDemand()
    
    // Act
    const result = await repository.getById(demand.id)
    
    // Assert
    expect(result).toBeDefined()
    expect(result?.id).toBe(demand.id)
  })
  
  it('should return null when demand does not exist', async () => {
    // Act
    const result = await repository.getById('non-existent-id')
    
    // Assert
    expect(result).toBeNull()
  })
})
```

#### `getPaginated(params: GetPaginatedDemandsParams)`

**Tests :**
```typescript
describe('DemandCIRepository.getPaginated', () => {
  it('should return paginated demands with default params', async () => {
    // Arrange
    await createMultipleTestDemands(15)
    
    // Act
    const result = await repository.getPaginated({})
    
    // Assert
    expect(result.data).toHaveLength(10) // Default pageSize
    expect(result.total).toBeGreaterThanOrEqual(15)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(10)
  })
  
  it('should return demands filtered by status', async () => {
    // Arrange
    await createTestDemand({ status: 'PENDING' })
    await createTestDemand({ status: 'APPROVED' })
    
    // Act
    const result = await repository.getPaginated({ status: 'PENDING' })
    
    // Assert
    expect(result.data.every(d => d.status === 'PENDING')).toBe(true)
  })
  
  it('should return demands sorted by createdAt desc', async () => {
    // Arrange
    const demand1 = await createTestDemand({ createdAt: new Date('2024-01-01') })
    const demand2 = await createTestDemand({ createdAt: new Date('2024-01-02') })
    
    // Act
    const result = await repository.getPaginated({ sortBy: 'createdAt', sortOrder: 'desc' })
    
    // Assert
    expect(result.data[0].id).toBe(demand2.id)
    expect(result.data[1].id).toBe(demand1.id)
  })
  
  it('should return demands sorted by memberLastName asc', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Zulu' })
    await createTestDemand({ memberLastName: 'Alpha' })
    
    // Act
    const result = await repository.getPaginated({ sortBy: 'memberLastName', sortOrder: 'asc' })
    
    // Assert
    expect(result.data[0].memberLastName).toBe('Alpha')
    expect(result.data[1].memberLastName).toBe('Zulu')
  })
  
  it('should return second page when page=2', async () => {
    // Arrange
    await createMultipleTestDemands(25)
    
    // Act
    const page1 = await repository.getPaginated({ page: 1, pageSize: 10 })
    const page2 = await repository.getPaginated({ page: 2, pageSize: 10 })
    
    // Assert
    expect(page1.data[0].id).not.toBe(page2.data[0].id)
    expect(page2.page).toBe(2)
  })
  
  it('should return correct total count', async () => {
    // Arrange
    await createMultipleTestDemands(15)
    
    // Act
    const result = await repository.getPaginated({})
    
    // Assert
    expect(result.total).toBe(15)
  })
})
```

#### `search(query: string, params?: SearchDemandsParams)`

**Tests :**
```typescript
describe('DemandCIRepository.search', () => {
  it('should return demands matching lastName', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Jean' })
    await createTestDemand({ memberLastName: 'Martin', memberFirstName: 'Pierre' })
    
    // Act
    const result = await repository.search('Dupont')
    
    // Assert
    expect(result.data).toHaveLength(1)
    expect(result.data[0].memberLastName).toBe('Dupont')
  })
  
  it('should return demands matching firstName', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Jean' })
    await createTestDemand({ memberLastName: 'Martin', memberFirstName: 'Pierre' })
    
    // Act
    const result = await repository.search('Jean')
    
    // Assert
    expect(result.data).toHaveLength(1)
    expect(result.data[0].memberFirstName).toBe('Jean')
  })
  
  it('should return demands matching partial lastName', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Jean' })
    
    // Act
    const result = await repository.search('Dup')
    
    // Assert
    expect(result.data).toHaveLength(1)
    expect(result.data[0].memberLastName).toContain('Dup')
  })
  
  it('should be case insensitive', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Jean' })
    
    // Act
    const result = await repository.search('DUPONT')
    
    // Assert
    expect(result.data).toHaveLength(1)
  })
  
  it('should return empty array when no match', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Dupont' })
    
    // Act
    const result = await repository.search('NonExistent')
    
    // Assert
    expect(result.data).toHaveLength(0)
  })
  
  it('should filter by status when provided', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Dupont', status: 'PENDING' })
    await createTestDemand({ memberLastName: 'Dupont', status: 'APPROVED' })
    
    // Act
    const result = await repository.search('Dupont', { status: 'PENDING' })
    
    // Assert
    expect(result.data).toHaveLength(1)
    expect(result.data[0].status).toBe('PENDING')
  })
})
```

#### `update(id: string, updates: Partial<CaisseImprevueDemand>)`

**Tests :**
```typescript
describe('DemandCIRepository.update', () => {
  it('should update demand with valid data', async () => {
    // Arrange
    const demand = await createTestDemand()
    
    // Act
    const result = await repository.update(demand.id, { cause: 'Nouveau motif' })
    
    // Assert
    expect(result.cause).toBe('Nouveau motif')
    expect(result.updatedAt.getTime()).toBeGreaterThan(demand.updatedAt.getTime())
  })
  
  it('should throw error when updating non-existent demand', async () => {
    // Act & Assert
    await expect(repository.update('non-existent', { cause: 'Test' })).rejects.toThrow('Demand not found')
  })
  
  it('should validate cause length on update', async () => {
    // Arrange
    const demand = await createTestDemand()
    
    // Act & Assert
    await expect(repository.update(demand.id, { cause: 'short' })).rejects.toThrow('cause must be at least 10 characters')
  })
})
```

#### `delete(id: string)`

**Tests :**
```typescript
describe('DemandCIRepository.delete', () => {
  it('should delete demand when exists', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'REJECTED' })
    
    // Act
    await repository.delete(demand.id)
    
    // Assert
    const result = await repository.getById(demand.id)
    expect(result).toBeNull()
  })
  
  it('should throw error when deleting non-existent demand', async () => {
    // Act & Assert
    await expect(repository.delete('non-existent')).rejects.toThrow('Demand not found')
  })
  
  it('should throw error when deleting non-REJECTED demand', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    
    // Act & Assert
    await expect(repository.delete(demand.id)).rejects.toThrow('Only REJECTED demands can be deleted')
  })
})
```

---

## 🧪 2. Services

### 2.1 CaisseImprevueService

**Fichier :** `src/domains/financial/caisse-imprevue/services/CaisseImprevueService.ts`

#### `createDemand(data: CreateDemandCIDto, adminId: string)`

**Tests :**
```typescript
describe('CaisseImprevueService.createDemand', () => {
  it('should create demand with valid data', async () => {
    // Arrange
    const demandData = createDemandFixture()
    const adminId = 'admin-1'
    
    // Act
    const result = await service.createDemand(demandData, adminId)
    
    // Assert
    expect(result).toBeDefined()
    expect(result.status).toBe('PENDING')
    expect(result.createdBy).toBe(adminId)
  })
  
  it('should validate cause length', async () => {
    // Arrange
    const demandData = { ...createDemandFixture(), cause: 'short' }
    
    // Act & Assert
    await expect(service.createDemand(demandData, 'admin-1')).rejects.toThrow('cause must be at least 10 characters')
  })
  
  it('should validate emergencyContact', async () => {
    // Arrange
    const demandData = { ...createDemandFixture(), emergencyContact: null }
    
    // Act & Assert
    await expect(service.createDemand(demandData, 'admin-1')).rejects.toThrow('emergencyContact is required')
  })
  
  it('should create notification after creation', async () => {
    // Arrange
    const demandData = createDemandFixture()
    const mockNotificationService = createMockNotificationService()
    
    // Act
    await service.createDemand(demandData, 'admin-1')
    
    // Assert
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'caisse_imprevue_demand_created',
        module: 'caisse_imprevue'
      })
    )
  })
})
```

#### `approveDemand(demandId: string, decisionReason: string, adminId: string)`

**Tests :**
```typescript
describe('CaisseImprevueService.approveDemand', () => {
  it('should approve PENDING demand', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    
    // Act
    const result = await service.approveDemand(demand.id, 'Raison d\'acceptation valide', 'admin-1')
    
    // Assert
    expect(result.status).toBe('APPROVED')
    expect(result.decisionReason).toBe('Raison d\'acceptation valide')
    expect(result.decisionMadeBy).toBe('admin-1')
    expect(result.decisionDate).toBeInstanceOf(Date)
  })
  
  it('should throw error when demand is not PENDING', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'APPROVED' })
    
    // Act & Assert
    await expect(service.approveDemand(demand.id, 'Reason', 'admin-1')).rejects.toThrow('Only PENDING demands can be approved')
  })
  
  it('should validate decisionReason length', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    
    // Act & Assert
    await expect(service.approveDemand(demand.id, 'short', 'admin-1')).rejects.toThrow('decisionReason must be at least 10 characters')
  })
  
  it('should create notification after approval', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    const mockNotificationService = createMockNotificationService()
    
    // Act
    await service.approveDemand(demand.id, 'Raison valide', 'admin-1')
    
    // Assert
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'caisse_imprevue_demand_approved',
        module: 'caisse_imprevue'
      })
    )
  })
})
```

#### `rejectDemand(demandId: string, decisionReason: string, adminId: string)`

**Tests :**
```typescript
describe('CaisseImprevueService.rejectDemand', () => {
  it('should reject PENDING demand', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    
    // Act
    const result = await service.rejectDemand(demand.id, 'Raison de refus valide', 'admin-1')
    
    // Assert
    expect(result.status).toBe('REJECTED')
    expect(result.decisionReason).toBe('Raison de refus valide')
    expect(result.decisionMadeBy).toBe('admin-1')
  })
  
  it('should throw error when demand is not PENDING', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'APPROVED' })
    
    // Act & Assert
    await expect(service.rejectDemand(demand.id, 'Reason', 'admin-1')).rejects.toThrow('Only PENDING demands can be rejected')
  })
  
  it('should create notification after rejection', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    const mockNotificationService = createMockNotificationService()
    
    // Act
    await service.rejectDemand(demand.id, 'Raison valide', 'admin-1')
    
    // Assert
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'caisse_imprevue_demand_rejected',
        module: 'caisse_imprevue'
      })
    )
  })
})
```

#### `reopenDemand(demandId: string, reopenReason: string, adminId: string)`

**Tests :**
```typescript
describe('CaisseImprevueService.reopenDemand', () => {
  it('should reopen REJECTED demand', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'REJECTED' })
    
    // Act
    const result = await service.reopenDemand(demand.id, 'Raison de réouverture valide', 'admin-1')
    
    // Assert
    expect(result.status).toBe('REOPENED')
    expect(result.reopenReason).toBe('Raison de réouverture valide')
    expect(result.reopenedBy).toBe('admin-1')
    expect(result.previousStatus).toBe('REJECTED')
  })
  
  it('should throw error when demand is not REJECTED', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    
    // Act & Assert
    await expect(service.reopenDemand(demand.id, 'Reason', 'admin-1')).rejects.toThrow('Only REJECTED demands can be reopened')
  })
  
  it('should create notification after reopening', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'REJECTED' })
    const mockNotificationService = createMockNotificationService()
    
    // Act
    await service.reopenDemand(demand.id, 'Raison valide', 'admin-1')
    
    // Assert
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'caisse_imprevue_demand_reopened',
        module: 'caisse_imprevue'
      })
    )
  })
})
```

#### `createContractFromDemand(demandId: string, adminId: string)`

**Tests :**
```typescript
describe('CaisseImprevueService.createContractFromDemand', () => {
  it('should create contract from APPROVED demand', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'APPROVED' })
    
    // Act
    const result = await service.createContractFromDemand(demand.id, 'admin-1')
    
    // Assert
    expect(result.contract).toBeDefined()
    expect(result.demand.status).toBe('CONVERTED')
    expect(result.demand.contractId).toBe(result.contract.id)
  })
  
  it('should throw error when demand is not APPROVED', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    
    // Act & Assert
    await expect(service.createContractFromDemand(demand.id, 'admin-1')).rejects.toThrow('Only APPROVED demands can be converted')
  })
  
  it('should create notification after conversion', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'APPROVED' })
    const mockNotificationService = createMockNotificationService()
    
    // Act
    await service.createContractFromDemand(demand.id, 'admin-1')
    
    // Assert
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'caisse_imprevue_demand_converted',
        module: 'caisse_imprevue'
      })
    )
  })
})
```

#### `deleteDemand(demandId: string, adminId: string)`

**Tests :**
```typescript
describe('CaisseImprevueService.deleteDemand', () => {
  it('should delete REJECTED demand', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'REJECTED' })
    
    // Act
    await service.deleteDemand(demand.id, 'admin-1')
    
    // Assert
    const result = await repository.getById(demand.id)
    expect(result).toBeNull()
  })
  
  it('should throw error when demand is not REJECTED', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'PENDING' })
    
    // Act & Assert
    await expect(service.deleteDemand(demand.id, 'admin-1')).rejects.toThrow('Only REJECTED demands can be deleted')
  })
  
  it('should create notification before deletion', async () => {
    // Arrange
    const demand = await createTestDemand({ status: 'REJECTED' })
    const mockNotificationService = createMockNotificationService()
    
    // Act
    await service.deleteDemand(demand.id, 'admin-1')
    
    // Assert
    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'caisse_imprevue_demand_deleted',
        module: 'caisse_imprevue'
      })
    )
  })
})
```

### 2.2 DemandSimulationService

**Fichier :** `src/domains/financial/caisse-imprevue/services/DemandSimulationService.ts`

#### `calculatePaymentSchedule(demand: CaisseImprevueDemand)`

**Tests :**
```typescript
describe('DemandSimulationService.calculatePaymentSchedule', () => {
  it('should calculate monthly payments correctly', () => {
    // Arrange
    const demand = createDemandFixture({
      subscriptionCIAmountPerMonth: 10000,
      subscriptionCIDuration: 12,
      paymentFrequency: 'MONTHLY'
    })
    
    // Act
    const schedule = service.calculatePaymentSchedule(demand)
    
    // Assert
    expect(schedule.payments).toHaveLength(12)
    expect(schedule.payments[0].amount).toBe(10000)
    expect(schedule.totalAmount).toBe(120000)
  })
  
  it('should calculate daily payments correctly', () => {
    // Arrange
    const demand = createDemandFixture({
      subscriptionCIAmountPerMonth: 10000,
      subscriptionCIDuration: 30,
      paymentFrequency: 'DAILY'
    })
    
    // Act
    const schedule = service.calculatePaymentSchedule(demand)
    
    // Assert
    expect(schedule.payments).toHaveLength(30)
    expect(schedule.payments[0].amount).toBeCloseTo(10000 / 30, 2)
  })
  
  it('should set correct payment dates for monthly frequency', () => {
    // Arrange
    const demand = createDemandFixture({
      desiredDate: '2024-02-01',
      paymentFrequency: 'MONTHLY',
      subscriptionCIDuration: 3
    })
    
    // Act
    const schedule = service.calculatePaymentSchedule(demand)
    
    // Assert
    expect(schedule.payments[0].date).toBe('2024-02-01')
    expect(schedule.payments[1].date).toBe('2024-03-01')
    expect(schedule.payments[2].date).toBe('2024-04-01')
  })
  
  it('should calculate total amount correctly', () => {
    // Arrange
    const demand = createDemandFixture({
      subscriptionCIAmountPerMonth: 5000,
      subscriptionCIDuration: 6,
      paymentFrequency: 'MONTHLY'
    })
    
    // Act
    const schedule = service.calculatePaymentSchedule(demand)
    
    // Assert
    expect(schedule.totalAmount).toBe(30000)
  })
})
```

---

## 🧪 3. Hooks

### 3.1 useCaisseImprevueDemands

**Fichier :** `src/domains/financial/caisse-imprevue/hooks/useCaisseImprevueDemands.ts`

**Tests :**
```typescript
describe('useCaisseImprevueDemands', () => {
  it('should fetch demands with default params', async () => {
    // Arrange
    await createMultipleTestDemands(15)
    const { result } = renderHook(() => useCaisseImprevueDemands({}))
    
    // Act
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    // Assert
    expect(result.current.data?.data).toHaveLength(10)
    expect(result.current.data?.total).toBeGreaterThanOrEqual(15)
  })
  
  it('should filter by status', async () => {
    // Arrange
    await createTestDemand({ status: 'PENDING' })
    await createTestDemand({ status: 'APPROVED' })
    const { result } = renderHook(() => useCaisseImprevueDemands({ status: 'PENDING' }))
    
    // Act
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    // Assert
    expect(result.current.data?.data.every(d => d.status === 'PENDING')).toBe(true)
  })
  
  it('should handle pagination', async () => {
    // Arrange
    await createMultipleTestDemands(25)
    const { result } = renderHook(() => useCaisseImprevueDemands({ page: 2, pageSize: 10 }))
    
    // Act
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    // Assert
    expect(result.current.data?.page).toBe(2)
    expect(result.current.data?.data).toHaveLength(10)
  })
  
  it('should cache results', async () => {
    // Arrange
    await createMultipleTestDemands(10)
    const { result: result1 } = renderHook(() => useCaisseImprevueDemands({}))
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    
    // Act
    const { result: result2 } = renderHook(() => useCaisseImprevueDemands({}))
    
    // Assert
    expect(result2.current.isFetching).toBe(false) // Should use cache
  })
})
```

### 3.2 useDemandForm

**Fichier :** `src/domains/financial/caisse-imprevue/hooks/useDemandForm.ts`

**Tests :**
```typescript
describe('useDemandForm', () => {
  it('should initialize form with default values', () => {
    // Act
    const { result } = renderHook(() => useDemandForm())
    
    // Assert
    expect(result.current.form.getValues('memberId')).toBe('')
    expect(result.current.form.getValues('cause')).toBe('')
    expect(result.current.currentStep).toBe(1)
  })
  
  it('should validate step 1 before moving to step 2', async () => {
    // Arrange
    const { result } = renderHook(() => useDemandForm())
    
    // Act
    result.current.form.setValue('memberId', 'member-1')
    result.current.form.setValue('cause', 'Valid cause with more than 10 characters')
    const canProceed = await result.current.canProceedToNextStep()
    
    // Assert
    expect(canProceed).toBe(true)
  })
  
  it('should not allow proceeding if step 1 is invalid', async () => {
    // Arrange
    const { result } = renderHook(() => useDemandForm())
    
    // Act
    result.current.form.setValue('memberId', '')
    const canProceed = await result.current.canProceedToNextStep()
    
    // Assert
    expect(canProceed).toBe(false)
  })
  
  it('should save form data to localStorage', async () => {
    // Arrange
    const { result } = renderHook(() => useDemandForm())
    
    // Act
    result.current.form.setValue('memberId', 'member-1')
    result.current.form.setValue('cause', 'Test cause')
    await result.current.saveToLocalStorage()
    
    // Assert
    const saved = localStorage.getItem('demand-form-state')
    expect(saved).toBeDefined()
    const parsed = JSON.parse(saved!)
    expect(parsed.memberId).toBe('member-1')
  })
})
```

### 3.3 useDemandFormPersistence

**Fichier :** `src/domains/financial/caisse-imprevue/hooks/useDemandFormPersistence.ts`

**Tests :**
```typescript
describe('useDemandFormPersistence', () => {
  it('should load form data from localStorage on mount', () => {
    // Arrange
    localStorage.setItem('demand-form-state', JSON.stringify({
      memberId: 'member-1',
      cause: 'Test cause',
      version: '1.0.0',
      expiresAt: Date.now() + 3600000
    }))
    
    // Act
    const { result } = renderHook(() => useDemandFormPersistence())
    
    // Assert
    expect(result.current.formData.memberId).toBe('member-1')
    expect(result.current.formData.cause).toBe('Test cause')
  })
  
  it('should not load expired data', () => {
    // Arrange
    localStorage.setItem('demand-form-state', JSON.stringify({
      memberId: 'member-1',
      expiresAt: Date.now() - 1000 // Expired
    }))
    
    // Act
    const { result } = renderHook(() => useDemandFormPersistence())
    
    // Assert
    expect(result.current.formData).toBeNull()
  })
  
  it('should save form data with debounce', async () => {
    // Arrange
    const { result } = renderHook(() => useDemandFormPersistence())
    
    // Act
    result.current.saveFormData({ memberId: 'member-1' })
    result.current.saveFormData({ memberId: 'member-2' })
    result.current.saveFormData({ memberId: 'member-3' })
    
    await waitFor(() => {
      const saved = localStorage.getItem('demand-form-state')
      expect(saved).toBeDefined()
      const parsed = JSON.parse(saved!)
      expect(parsed.memberId).toBe('member-3')
    }, { timeout: 1000 })
  })
  
  it('should clear form data after submission', () => {
    // Arrange
    localStorage.setItem('demand-form-state', JSON.stringify({ memberId: 'member-1' }))
    const { result } = renderHook(() => useDemandFormPersistence())
    
    // Act
    result.current.clearFormData()
    
    // Assert
    expect(localStorage.getItem('demand-form-state')).toBeNull()
  })
})
```

### 3.4 useSubscriptionsCICache

**Fichier :** `src/domains/financial/caisse-imprevue/hooks/useSubscriptionsCICache.ts`

**Tests :**
```typescript
describe('useSubscriptionsCICache', () => {
  it('should fetch subscriptions on mount', async () => {
    // Arrange
    await createTestSubscriptions(5)
    
    // Act
    const { result } = renderHook(() => useSubscriptionsCICache())
    
    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(5)
  })
  
  it('should cache subscriptions for 30 minutes', async () => {
    // Arrange
    await createTestSubscriptions(5)
    const { result: result1 } = renderHook(() => useSubscriptionsCICache())
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    
    // Act
    const { result: result2 } = renderHook(() => useSubscriptionsCICache())
    
    // Assert
    expect(result2.current.isFetching).toBe(false) // Should use cache
  })
  
  it('should filter active subscriptions', async () => {
    // Arrange
    await createTestSubscription({ status: 'ACTIVE' })
    await createTestSubscription({ status: 'INACTIVE' })
    
    // Act
    const { result } = renderHook(() => useSubscriptionsCICache({ status: 'ACTIVE' }))
    
    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.every(s => s.status === 'ACTIVE')).toBe(true)
  })
})
```

### 3.5 useDemandSearch

**Fichier :** `src/domains/financial/caisse-imprevue/hooks/useDemandSearch.ts`

**Tests :**
```typescript
describe('useDemandSearch', () => {
  it('should search demands by name', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Dupont', memberFirstName: 'Jean' })
    const { result } = renderHook(() => useDemandSearch('Dupont'))
    
    // Act
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    // Assert
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].memberLastName).toBe('Dupont')
  })
  
  it('should debounce search queries', async () => {
    // Arrange
    const { result } = renderHook(() => useDemandSearch(''))
    
    // Act
    act(() => {
      result.current.setQuery('D')
      result.current.setQuery('Du')
      result.current.setQuery('Dup')
      result.current.setQuery('Dupont')
    })
    
    // Assert
    await waitFor(() => {
      expect(result.current.query).toBe('Dupont')
      // Should only call search once after debounce
    }, { timeout: 1000 })
  })
  
  it('should cache search results', async () => {
    // Arrange
    await createTestDemand({ memberLastName: 'Dupont' })
    const { result: result1 } = renderHook(() => useDemandSearch('Dupont'))
    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    
    // Act
    const { result: result2 } = renderHook(() => useDemandSearch('Dupont'))
    
    // Assert
    expect(result2.current.isFetching).toBe(false) // Should use cache
  })
})
```

---

## 🧪 4. Schemas (Validation Zod)

### 4.1 demand-steps.schema.ts

**Tests :**
```typescript
describe('Demand Step Schemas', () => {
  describe('step1Schema', () => {
    it('should validate valid step 1 data', () => {
      const data = {
        memberId: 'member-1',
        cause: 'Valid cause with more than 10 characters'
      }
      expect(() => step1Schema.parse(data)).not.toThrow()
    })
    
    it('should reject cause shorter than 10 characters', () => {
      const data = {
        memberId: 'member-1',
        cause: 'short'
      }
      expect(() => step1Schema.parse(data)).toThrow()
    })
    
    it('should reject cause longer than 500 characters', () => {
      const data = {
        memberId: 'member-1',
        cause: 'a'.repeat(501)
      }
      expect(() => step1Schema.parse(data)).toThrow()
    })
  })
  
  describe('step2Schema', () => {
    it('should validate valid step 2 data', () => {
      const data = {
        subscriptionCIID: 'sub-1',
        paymentFrequency: 'MONTHLY',
        desiredDate: '2024-02-01'
      }
      expect(() => step2Schema.parse(data)).not.toThrow()
    })
    
    it('should reject invalid paymentFrequency', () => {
      const data = {
        subscriptionCIID: 'sub-1',
        paymentFrequency: 'INVALID',
        desiredDate: '2024-02-01'
      }
      expect(() => step2Schema.parse(data)).toThrow()
    })
  })
  
  describe('step3Schema', () => {
    it('should validate valid step 3 data', () => {
      const data = {
        emergencyContact: {
          lastName: 'Dupont',
          phone1: '+24165671734',
          relationship: 'Famille',
          typeId: 'CNI',
          idNumber: '123456789'
        }
      }
      expect(() => step3Schema.parse(data)).not.toThrow()
    })
    
    it('should reject missing lastName', () => {
      const data = {
        emergencyContact: {
          lastName: '',
          phone1: '+24165671734',
          relationship: 'Famille',
          typeId: 'CNI',
          idNumber: '123456789'
        }
      }
      expect(() => step3Schema.parse(data)).toThrow()
    })
  })
})
```

---

## 📊 Résumé des Tests Unitaires

| Catégorie | Fichier | Nombre de Tests | Priorité |
|-----------|---------|-----------------|----------|
| **Repositories** | `DemandCIRepository.ts` | ~25 tests | P0 |
| **Services** | `CaisseImprevueService.ts` | ~20 tests | P0 |
| **Services** | `DemandSimulationService.ts` | ~10 tests | P1 |
| **Hooks** | `useCaisseImprevueDemands.ts` | ~10 tests | P0 |
| **Hooks** | `useDemandForm.ts` | ~15 tests | P0 |
| **Hooks** | `useDemandFormPersistence.ts` | ~8 tests | P1 |
| **Hooks** | `useSubscriptionsCICache.ts` | ~6 tests | P1 |
| **Hooks** | `useDemandSimulation.ts` | ~5 tests | P1 |
| **Hooks** | `useDemandSearch.ts` | ~8 tests | P1 |
| **Schemas** | `demand-steps.schema.ts` | ~15 tests | P1 |
| **TOTAL** | | **~122 tests** | |

---

## ✅ Checklist d'Implémentation

- [ ] Créer les fixtures de test (`FIXTURES.md`)
- [ ] Créer les mocks nécessaires (`MOCKS.md`)
- [ ] Implémenter les tests du repository
- [ ] Implémenter les tests des services
- [ ] Implémenter les tests des hooks
- [ ] Implémenter les tests des schemas
- [ ] Vérifier la couverture (objectif 80%+)
- [ ] Corriger les tests qui échouent
- [ ] Documenter les cas limites

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior QA
