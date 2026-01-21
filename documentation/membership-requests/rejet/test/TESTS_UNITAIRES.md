# Tests Unitaires - Fonctionnalité "Rejet d'une Demande d'Adhésion"

> Plan détaillé des tests unitaires pour la fonctionnalité de rejet

---

## 📋 Vue d'ensemble

**Objectif de couverture** : 85%+ pour toutes les fonctionnalités de rejet

**Répartition estimée** :
- **Utilitaires** : ~5 tests (100% couverture)
- **Services** : ~25 tests (85%+ couverture)
- **Repositories** : ~8 tests (85%+ couverture)
- **Composants** : ~40 tests (80%+ couverture)
- **Hooks** : ~12 tests (80%+ couverture)

**Total estimé** : ~90 tests unitaires

---

## 🧪 1. Utilitaires

### 1.1 WhatsAppUrlUtils

**Fichier** : `src/shared/utils/whatsAppUrlUtils.ts`

#### `generateRejectionWhatsAppUrl(phoneNumber: string, firstName: string, matricule: string, motifReject: string)`

**Tests** :
```typescript
describe('generateRejectionWhatsAppUrl', () => {
  it('should generate valid WhatsApp URL with rejection message', () => {
    const url = generateRejectionWhatsAppUrl(
      '+24165671734',
      'Jean',
      'MK-2024-001234',
      'Documents incomplets'
    )
    expect(url).toContain('https://wa.me/')
    expect(url).toContain('24165671734')
    expect(url).toContain('text=')
  })

  it('should include first name in message', () => {
    const url = generateRejectionWhatsAppUrl(
      '+24165671734',
      'Jean',
      'MK-2024-001234',
      'Documents incomplets'
    )
    const decodedUrl = decodeURIComponent(url)
    expect(decodedUrl).toContain('Jean')
  })

  it('should include matricule in message', () => {
    const url = generateRejectionWhatsAppUrl(
      '+24165671734',
      'Jean',
      'MK-2024-001234',
      'Documents incomplets'
    )
    const decodedUrl = decodeURIComponent(url)
    expect(decodedUrl).toContain('MK-2024-001234')
  })

  it('should include rejection reason in message', () => {
    const url = generateRejectionWhatsAppUrl(
      '+24165671734',
      'Jean',
      'MK-2024-001234',
      'Documents incomplets'
    )
    const decodedUrl = decodeURIComponent(url)
    expect(decodedUrl).toContain('Documents incomplets')
  })

  it('should normalize phone number (remove spaces, dashes)', () => {
    const url = generateRejectionWhatsAppUrl(
      '+241 65 67 17 34',
      'Jean',
      'MK-2024-001234',
      'Documents incomplets'
    )
    expect(url).toContain('24165671734')
    expect(url).not.toContain(' ')
  })
})
```

**Total** : ~5 tests

---

## 🔧 2. Services

### 2.1 MembershipServiceV2

**Fichier** : `src/domains/memberships/services/MembershipServiceV2.ts`

#### `rejectMembershipRequest(params: RejectMembershipRequestParams)`

**Tests** :
```typescript
describe('MembershipServiceV2.rejectMembershipRequest', () => {
  it('should reject membership request with valid reason', async () => {
    // Arrange
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Documents incomplets. Veuillez fournir tous les documents requis.'
    }
    const mockRequest = {
      id: 'req-123',
      status: 'pending',
      // ... autres champs
    }
    
    // Act
    await service.rejectMembershipRequest(params)
    
    // Assert
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'req-123',
      'rejected',
      expect.objectContaining({
        motifReject: params.reason.trim(),
        processedBy: 'admin-123',
        processedAt: expect.any(Date),
      })
    )
    expect(notificationService.createRejectionNotification).toHaveBeenCalled()
  })

  it('should throw error if reason is too short (< 10 characters)', async () => {
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Short' // 5 caractères
    }
    
    await expect(
      service.rejectMembershipRequest(params)
    ).rejects.toThrow('Le motif de rejet doit contenir au moins 10 caractères')
  })

  it('should throw error if reason is too long (> 500 characters)', async () => {
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'A'.repeat(501) // 501 caractères
    }
    
    await expect(
      service.rejectMembershipRequest(params)
    ).rejects.toThrow('Le motif de rejet ne peut pas dépasser 500 caractères')
  })

  it('should throw error if request does not exist', async () => {
    repository.getById.mockResolvedValue(null)
    
    const params = {
      requestId: 'req-not-found',
      adminId: 'admin-123',
      reason: 'Documents incomplets'
    }
    
    await expect(
      service.rejectMembershipRequest(params)
    ).rejects.toThrow('Demande d\'adhésion req-not-found introuvable')
  })

  it('should create notification for admins', async () => {
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Documents incomplets'
    }
    
    await service.rejectMembershipRequest(params)
    
    expect(notificationService.createRejectionNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
        adminId: 'admin-123',
        motifReject: 'Documents incomplets',
      })
    )
  })
})
```

#### `reopenMembershipRequest(params: ReopenMembershipRequestParams)`

**Tests** :
```typescript
describe('MembershipServiceV2.reopenMembershipRequest', () => {
  it('should reopen rejected membership request with valid reason', async () => {
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Nouvelle information disponible. Le dossier nécessite un réexamen.'
    }
    const mockRequest = {
      id: 'req-123',
      status: 'rejected',
      // ... autres champs
    }
    
    await service.reopenMembershipRequest(params)
    
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'req-123',
      'under_review',
      expect.objectContaining({
        reopenReason: params.reason.trim(),
        reopenedBy: 'admin-123',
        reopenedAt: expect.any(Date),
      })
    )
    expect(notificationService.createReopeningNotification).toHaveBeenCalled()
  })

  it('should throw error if request is not rejected', async () => {
    const mockRequest = {
      id: 'req-123',
      status: 'pending', // Pas rejeté
    }
    repository.getById.mockResolvedValue(mockRequest)
    
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Nouvelle information disponible'
    }
    
    await expect(
      service.reopenMembershipRequest(params)
    ).rejects.toThrow('Seules les demandes rejetées peuvent être réouvertes')
  })

  it('should throw error if reason is too short', async () => {
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Short' // 5 caractères
    }
    
    await expect(
      service.reopenMembershipRequest(params)
    ).rejects.toThrow('Le motif de réouverture doit contenir au moins 10 caractères')
  })
})
```

**Total** : ~15 tests

---

### 2.2 NotificationService

**Fichier** : `src/services/notifications/NotificationService.ts`

#### `createRejectionNotification(params)`

**Tests** :
```typescript
describe('NotificationService.createRejectionNotification', () => {
  it('should create rejection notification for admins', async () => {
    const params = {
      requestId: 'req-123',
      memberName: 'Jean Dupont',
      adminName: 'Admin User',
      adminId: 'admin-123',
      motifReject: 'Documents incomplets',
      processedAt: new Date(),
    }
    
    const notification = await notificationService.createRejectionNotification(params)
    
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'membership_rejected',
        module: 'memberships',
        entityId: 'req-123',
        title: 'Demande d\'adhésion rejetée',
        message: expect.stringContaining('Admin User'),
        message: expect.stringContaining('Jean Dupont'),
        message: expect.stringContaining('Documents incomplets'),
        metadata: expect.objectContaining({
          requestId: 'req-123',
          memberName: 'Jean Dupont',
          adminName: 'Admin User',
          adminId: 'admin-123',
          status: 'rejected',
          motifReject: 'Documents incomplets',
        }),
      })
    )
  })
})
```

#### `createReopeningNotification(params)`

**Tests** :
```typescript
describe('NotificationService.createReopeningNotification', () => {
  it('should create reopening notification for admins', async () => {
    const params = {
      requestId: 'req-123',
      memberName: 'Jean Dupont',
      adminName: 'Admin User',
      adminId: 'admin-123',
      reopenReason: 'Nouvelle information disponible',
      reopenedAt: new Date(),
      previousMotifReject: 'Documents incomplets',
    }
    
    const notification = await notificationService.createReopeningNotification(params)
    
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'membership_reopened',
        module: 'memberships',
        entityId: 'req-123',
        title: 'Dossier réouvert',
        message: expect.stringContaining('Nouvelle information disponible'),
        metadata: expect.objectContaining({
          requestId: 'req-123',
          status: 'under_review',
          reopenReason: 'Nouvelle information disponible',
          previousStatus: 'rejected',
          previousMotifReject: 'Documents incomplets',
        }),
      })
    )
  })
})
```

**Total** : ~10 tests

---

## 💾 3. Repositories

### 3.1 MembershipRepositoryV2

**Fichier** : `src/domains/memberships/repositories/MembershipRepositoryV2.ts`

#### `updateStatus(id: string, status: MembershipRequestStatus, data: Partial<MembershipRequest>)`

**Tests** :
```typescript
describe('MembershipRepositoryV2.updateStatus', () => {
  it('should update status to rejected with traçabilité fields', async () => {
    const id = 'req-123'
    const status = 'rejected'
    const data = {
      motifReject: 'Documents incomplets',
      processedBy: 'admin-123',
      processedAt: new Date(),
    }
    
    await repository.updateStatus(id, status, data)
    
    expect(updateDoc).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        status: 'rejected',
        motifReject: 'Documents incomplets',
        processedBy: 'admin-123',
        processedAt: expect.any(Date),
        updatedAt: expect.any(Object), // serverTimestamp()
      })
    )
  })

  it('should update status to under_review with réouverture fields', async () => {
    const id = 'req-123'
    const status = 'under_review'
    const data = {
      reopenReason: 'Nouvelle information disponible',
      reopenedBy: 'admin-123',
      reopenedAt: new Date(),
    }
    
    await repository.updateStatus(id, status, data)
    
    expect(updateDoc).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        status: 'under_review',
        reopenReason: 'Nouvelle information disponible',
        reopenedBy: 'admin-123',
        reopenedAt: expect.any(Date),
      })
    )
  })
})
```

**Total** : ~8 tests

---

## 🎨 4. Composants

### 4.1 RejectModalV2

**Fichier** : `src/domains/memberships/components/modals/RejectModalV2.tsx`

**Tests** :
```typescript
describe('RejectModalV2', () => {
  it('should render modal with member name', () => {
    render(<RejectModalV2 isOpen={true} memberName="Jean Dupont" />)
    
    expect(screen.getByTestId('reject-modal')).toBeInTheDocument()
    expect(screen.getByTestId('reject-modal-member-name')).toHaveTextContent('Jean Dupont')
  })

  it('should validate reason length (minimum 10 characters)', () => {
    render(<RejectModalV2 isOpen={true} memberName="Jean Dupont" />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Short' } })
    
    expect(screen.getByTestId('reject-modal-submit-button')).toBeDisabled()
    expect(screen.getByTestId('reject-modal-reason-error')).toHaveTextContent(
      'Minimum 10 caractères requis'
    )
  })

  it('should enable submit button when reason is valid', () => {
    render(<RejectModalV2 isOpen={true} memberName="Jean Dupont" />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Documents incomplets. Veuillez fournir tous les documents requis.' } })
    
    expect(screen.getByTestId('reject-modal-submit-button')).not.toBeDisabled()
  })

  it('should display character counter', () => {
    render(<RejectModalV2 isOpen={true} memberName="Jean Dupont" />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Documents incomplets' } })
    
    expect(screen.getByTestId('reject-modal-reason-counter')).toHaveTextContent('24 / 500 caractères')
  })

  it('should call onReject with valid reason', async () => {
    const onReject = jest.fn()
    render(<RejectModalV2 isOpen={true} memberName="Jean Dupont" onReject={onReject} />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Documents incomplets' } })
    
    const submitButton = screen.getByTestId('reject-modal-submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(onReject).toHaveBeenCalledWith('Documents incomplets')
    })
  })

  it('should show loading state during submission', async () => {
    const onReject = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
    render(<RejectModalV2 isOpen={true} memberName="Jean Dupont" onReject={onReject} />)
    
    const input = screen.getByTestId('reject-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Documents incomplets' } })
    
    const submitButton = screen.getByTestId('reject-modal-submit-button')
    fireEvent.click(submitButton)
    
    expect(screen.getByTestId('reject-modal-loading')).toBeInTheDocument()
  })
})
```

**Total** : ~12 tests

---

### 4.2 ReopenModalV2

**Fichier** : `src/domains/memberships/components/modals/ReopenModalV2.tsx`

**Tests** :
```typescript
describe('ReopenModalV2', () => {
  it('should render modal with member info and previous reject reason', () => {
    render(
      <ReopenModalV2
        isOpen={true}
        memberName="Jean Dupont"
        matricule="MK-2024-001234"
        previousRejectReason="Documents incomplets"
      />
    )
    
    expect(screen.getByTestId('reopen-modal')).toBeInTheDocument()
    expect(screen.getByTestId('reopen-modal-member-name')).toHaveTextContent('Jean Dupont')
    expect(screen.getByTestId('reopen-modal-matricule')).toHaveTextContent('MK-2024-001234')
    expect(screen.getByTestId('reopen-modal-previous-reject-reason')).toHaveTextContent('Documents incomplets')
  })

  it('should validate reopen reason length (minimum 10 characters)', () => {
    render(<ReopenModalV2 isOpen={true} memberName="Jean Dupont" />)
    
    const input = screen.getByTestId('reopen-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Short' } })
    
    expect(screen.getByTestId('reopen-modal-submit-button')).toBeDisabled()
  })

  it('should call onReopen with valid reason', async () => {
    const onReopen = jest.fn()
    render(<ReopenModalV2 isOpen={true} memberName="Jean Dupont" onReopen={onReopen} />)
    
    const input = screen.getByTestId('reopen-modal-reason-input')
    fireEvent.change(input, { target: { value: 'Nouvelle information disponible' } })
    
    const submitButton = screen.getByTestId('reopen-modal-submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(onReopen).toHaveBeenCalledWith('Nouvelle information disponible')
    })
  })
})
```

**Total** : ~10 tests

---

### 4.3 DeleteModalV2

**Fichier** : `src/domains/memberships/components/modals/DeleteModalV2.tsx`

**Tests** :
```typescript
describe('DeleteModalV2', () => {
  it('should render modal with warning and member info', () => {
    render(
      <DeleteModalV2
        isOpen={true}
        memberName="Jean Dupont"
        matricule="MK-2024-001234"
      />
    )
    
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument()
    expect(screen.getByTestId('delete-modal-warning')).toBeInTheDocument()
    expect(screen.getByTestId('delete-modal-member-name')).toHaveTextContent('Jean Dupont')
    expect(screen.getByTestId('delete-modal-matricule-display')).toHaveTextContent('MK-2024-001234')
  })

  it('should disable submit button if matricule does not match', () => {
    render(
      <DeleteModalV2
        isOpen={true}
        memberName="Jean Dupont"
        matricule="MK-2024-001234"
      />
    )
    
    const input = screen.getByTestId('delete-modal-matricule-input')
    fireEvent.change(input, { target: { value: 'MK-2024-001235' } }) // Différent
    
    expect(screen.getByTestId('delete-modal-submit-button')).toBeDisabled()
  })

  it('should enable submit button if matricule matches', () => {
    render(
      <DeleteModalV2
        isOpen={true}
        memberName="Jean Dupont"
        matricule="MK-2024-001234"
      />
    )
    
    const input = screen.getByTestId('delete-modal-matricule-input')
    fireEvent.change(input, { target: { value: 'MK-2024-001234' } }) // Correspond
    
    expect(screen.getByTestId('delete-modal-submit-button')).not.toBeDisabled()
  })

  it('should call onDelete with confirmed matricule', async () => {
    const onDelete = jest.fn()
    render(
      <DeleteModalV2
        isOpen={true}
        memberName="Jean Dupont"
        matricule="MK-2024-001234"
        onDelete={onDelete}
      />
    )
    
    const input = screen.getByTestId('delete-modal-matricule-input')
    fireEvent.change(input, { target: { value: 'MK-2024-001234' } })
    
    const submitButton = screen.getByTestId('delete-modal-submit-button')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('MK-2024-001234')
    })
  })
})
```

**Total** : ~10 tests

---

### 4.4 RejectWhatsAppModalV2

**Fichier** : `src/domains/memberships/components/modals/RejectWhatsAppModalV2.tsx`

**Tests** :
```typescript
describe('RejectWhatsAppModalV2', () => {
  it('should render modal with single phone number', () => {
    render(
      <RejectWhatsAppModalV2
        isOpen={true}
        phoneNumbers={['+24165671734']}
        firstName="Jean"
        matricule="MK-2024-001234"
        motifReject="Documents incomplets"
      />
    )
    
    expect(screen.getByTestId('reject-whatsapp-modal')).toBeInTheDocument()
    expect(screen.getByTestId('reject-whatsapp-modal-phone-display')).toHaveTextContent('+24165671734')
  })

  it('should render dropdown when multiple phone numbers', () => {
    render(
      <RejectWhatsAppModalV2
        isOpen={true}
        phoneNumbers={['+24165671734', '+24107123456']}
        firstName="Jean"
        matricule="MK-2024-001234"
        motifReject="Documents incomplets"
      />
    )
    
    expect(screen.getByTestId('reject-whatsapp-modal-phone-select')).toBeInTheDocument()
  })

  it('should pre-fill message template with rejection reason', () => {
    render(
      <RejectWhatsAppModalV2
        isOpen={true}
        phoneNumbers={['+24165671734']}
        firstName="Jean"
        matricule="MK-2024-001234"
        motifReject="Documents incomplets"
      />
    )
    
    const textarea = screen.getByTestId('reject-whatsapp-modal-message-textarea')
    expect(textarea).toHaveValue(expect.stringContaining('Jean'))
    expect(textarea).toHaveValue(expect.stringContaining('MK-2024-001234'))
    expect(textarea).toHaveValue(expect.stringContaining('Documents incomplets'))
  })

  it('should allow editing message', () => {
    render(
      <RejectWhatsAppModalV2
        isOpen={true}
        phoneNumbers={['+24165671734']}
        firstName="Jean"
        matricule="MK-2024-001234"
        motifReject="Documents incomplets"
      />
    )
    
    const textarea = screen.getByTestId('reject-whatsapp-modal-message-textarea')
    fireEvent.change(textarea, { target: { value: 'Message modifié' } })
    
    expect(textarea).toHaveValue('Message modifié')
  })

  it('should open WhatsApp Web when send button clicked', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation()
    render(
      <RejectWhatsAppModalV2
        isOpen={true}
        phoneNumbers={['+24165671734']}
        firstName="Jean"
        matricule="MK-2024-001234"
        motifReject="Documents incomplets"
      />
    )
    
    const sendButton = screen.getByTestId('reject-whatsapp-modal-send-button')
    fireEvent.click(sendButton)
    
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/24165671734'),
      '_blank'
    )
  })
})
```

**Total** : ~8 tests

---

## 🪝 5. Hooks

### 5.1 useMembershipActionsV2

**Fichier** : `src/domains/memberships/hooks/useMembershipActionsV2.ts`

#### `useRejectMembershipRequest()`

**Tests** :
```typescript
describe('useRejectMembershipRequest', () => {
  it('should reject membership request and invalidate cache', async () => {
    const { result } = renderHook(() => useRejectMembershipRequest())
    
    await act(async () => {
      await result.current.mutate({
        requestId: 'req-123',
        adminId: 'admin-123',
        reason: 'Documents incomplets',
      })
    })
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['membershipRequests'],
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['membershipRequest', 'req-123'],
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications'],
    })
  })
})
```

#### `useReopenMembershipRequest()`

**Tests** :
```typescript
describe('useReopenMembershipRequest', () => {
  it('should reopen membership request and invalidate cache', async () => {
    const { result } = renderHook(() => useReopenMembershipRequest())
    
    await act(async () => {
      await result.current.mutate({
        requestId: 'req-123',
        adminId: 'admin-123',
        reason: 'Nouvelle information disponible',
      })
    })
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['membershipRequests'],
    })
  })
})
```

#### `useDeleteMembershipRequest()`

**Tests** :
```typescript
describe('useDeleteMembershipRequest', () => {
  it('should call Cloud Function deleteMembershipRequest', async () => {
    const { result } = renderHook(() => useDeleteMembershipRequest())
    
    await act(async () => {
      await result.current.mutate({
        requestId: 'req-123',
        confirmedMatricule: 'MK-2024-001234',
      })
    })
    
    expect(httpsCallable).toHaveBeenCalledWith(
      expect.any(Object),
      'deleteMembershipRequest'
    )
  })
})
```

**Total** : ~12 tests

---

## ✅ Checklist Globale

### Utilitaires
- [ ] `whatsAppUrlUtils.generateRejectionWhatsAppUrl()` (5 tests)
- [ ] Tests unitaires écrits et passent (100% couverture)

### Services
- [ ] `MembershipServiceV2.rejectMembershipRequest()` (10 tests)
- [ ] `MembershipServiceV2.reopenMembershipRequest()` (5 tests)
- [ ] `NotificationService.createRejectionNotification()` (3 tests)
- [ ] `NotificationService.createReopeningNotification()` (3 tests)
- [ ] `NotificationService.createDeletionNotification()` (4 tests)
- [ ] Tests unitaires écrits et passent (85%+ couverture)

### Repositories
- [ ] `MembershipRepositoryV2.updateStatus()` (8 tests)
- [ ] Tests unitaires écrits et passent (85%+ couverture)

### Composants
- [ ] `RejectModalV2` (12 tests)
- [ ] `ReopenModalV2` (10 tests)
- [ ] `DeleteModalV2` (10 tests)
- [ ] `RejectWhatsAppModalV2` (8 tests)
- [ ] Tests unitaires écrits et passent (80%+ couverture)

### Hooks
- [ ] `useRejectMembershipRequest()` (4 tests)
- [ ] `useReopenMembershipRequest()` (4 tests)
- [ ] `useDeleteMembershipRequest()` (4 tests)
- [ ] Tests unitaires écrits et passent (80%+ couverture)

---

## 📊 Résumé

| Catégorie | Nombre de Tests | Couverture Cible |
|-----------|----------------|------------------|
| Utilitaires | ~5 | 100% |
| Services | ~25 | 85%+ |
| Repositories | ~8 | 85%+ |
| Composants | ~40 | 80%+ |
| Hooks | ~12 | 80%+ |
| **Total** | **~90** | **85%+** |

---

## 📚 Références

- **Workflow** : `../workflow-use-case-rejet.md`
- **Flux détaillé** : `../FLUX_REJET.md`
- **Actions post-rejet** : `../ACTIONS_POST_REJET.md`
- **Data-testid** : `DATA_TESTID.md`
- **Tests E2E** : `TESTS_E2E.md`

---

**Note** : Ces tests seront implémentés progressivement selon le workflow d'implémentation.
