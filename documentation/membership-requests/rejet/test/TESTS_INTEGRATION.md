# Tests d'Intégration - Fonctionnalité "Rejet d'une Demande d'Adhésion"

> Plan détaillé des tests d'intégration pour la fonctionnalité de rejet

---

## 📋 Vue d'ensemble

**Objectif de couverture** : 80%+ pour tous les flows d'intégration

**Répartition estimée** :
- **Flow Rejet** : ~8 tests
- **Flow Réouverture** : ~8 tests
- **Flow Suppression** : ~6 tests
- **Flow WhatsApp** : ~4 tests

**Total estimé** : ~26 tests d'intégration

---

## 🔄 1. Flow Rejet Complet

### Test : Rejeter une demande d'adhésion (flow complet)

**Description** : Tester le flow complet de rejet depuis le service jusqu'à Firestore

**Test** :
```typescript
describe('Integration: Reject Membership Request Flow', () => {
  it('should complete full flow: Service → Repository → Firestore → Notification', async () => {
    // Arrange
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Documents incomplets. Veuillez fournir tous les documents requis.'
    }
    
    const mockRequest = {
      id: 'req-123',
      status: 'pending',
      matricule: 'MK-2024-001234',
      identity: {
        firstName: 'Jean',
        lastName: 'Dupont',
      },
    }
    
    // Mock repository
    repository.getById.mockResolvedValue(mockRequest)
    repository.updateStatus.mockResolvedValue(undefined)
    
    // Mock notification service
    notificationService.createRejectionNotification.mockResolvedValue({
      id: 'notif-123',
      type: 'membership_rejected',
      // ... autres champs
    })
    
    // Act
    await service.rejectMembershipRequest(params)
    
    // Assert
    expect(repository.getById).toHaveBeenCalledWith('req-123')
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'req-123',
      'rejected',
      expect.objectContaining({
        motifReject: params.reason.trim(),
        processedBy: 'admin-123',
        processedAt: expect.any(Date),
      })
    )
    expect(notificationService.createRejectionNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
        memberName: 'Jean Dupont',
        adminId: 'admin-123',
        motifReject: params.reason.trim(),
      })
    )
  })

  it('should invalidate React Query cache after rejection', async () => {
    // Arrange
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Documents incomplets'
    }
    
    // Mock hooks
    const { result } = renderHook(() => useRejectMembershipRequest())
    
    // Act
    await act(async () => {
      await result.current.mutate(params)
    })
    
    // Assert
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

  it('should handle error during rejection and not create notification', async () => {
    // Arrange
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Documents incomplets'
    }
    
    repository.getById.mockResolvedValue({
      id: 'req-123',
      status: 'pending',
    })
    repository.updateStatus.mockRejectedValue(new Error('Firestore error'))
    
    // Act & Assert
    await expect(
      service.rejectMembershipRequest(params)
    ).rejects.toThrow('Firestore error')
    
    expect(notificationService.createRejectionNotification).not.toHaveBeenCalled()
  })
})
```

**Total** : ~8 tests

---

## 🔄 2. Flow Réouverture Complet

### Test : Réouvrir un dossier rejeté (flow complet)

**Description** : Tester le flow complet de réouverture depuis le service jusqu'à Firestore

**Test** :
```typescript
describe('Integration: Reopen Membership Request Flow', () => {
  it('should complete full flow: Service → Repository → Firestore → Notification', async () => {
    // Arrange
    const params = {
      requestId: 'req-123',
      adminId: 'admin-123',
      reason: 'Nouvelle information disponible. Le dossier nécessite un réexamen.'
    }
    
    const mockRequest = {
      id: 'req-123',
      status: 'rejected',
      matricule: 'MK-2024-001234',
      motifReject: 'Documents incomplets',
      identity: {
        firstName: 'Jean',
        lastName: 'Dupont',
      },
    }
    
    repository.getById.mockResolvedValue(mockRequest)
    repository.updateStatus.mockResolvedValue(undefined)
    notificationService.createReopeningNotification.mockResolvedValue({
      id: 'notif-456',
      type: 'membership_reopened',
    })
    
    // Act
    await service.reopenMembershipRequest(params)
    
    // Assert
    expect(repository.getById).toHaveBeenCalledWith('req-123')
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'req-123',
      'under_review',
      expect.objectContaining({
        reopenReason: params.reason.trim(),
        reopenedBy: 'admin-123',
        reopenedAt: expect.any(Date),
        motifReject: mockRequest.motifReject, // Conservé pour historique
      })
    )
    expect(notificationService.createReopeningNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
        memberName: 'Jean Dupont',
        adminId: 'admin-123',
        reopenReason: params.reason.trim(),
        previousMotifReject: 'Documents incomplets',
      })
    )
  })

  it('should invalidate React Query cache after reopening', async () => {
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
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['membershipRequest', 'req-123'],
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['notifications'],
    })
  })
})
```

**Total** : ~8 tests

---

## 🗑️ 3. Flow Suppression Complet

### Test : Supprimer définitivement un dossier rejeté (flow complet)

**Description** : Tester le flow complet de suppression via Cloud Function

**Test** :
```typescript
describe('Integration: Delete Membership Request Flow', () => {
  it('should complete full flow: Hook → Cloud Function → Firestore + Storage → Audit Log', async () => {
    // Arrange
    const mockCloudFunction = jest.fn().mockResolvedValue({
      data: {
        success: true,
        requestId: 'req-123',
        filesDeleted: 3,
        deletedAt: new Date().toISOString(),
      },
    })
    
    // Mock httpsCallable
    httpsCallable.mockReturnValue(mockCloudFunction)
    
    // Act
    const { result } = renderHook(() => useDeleteMembershipRequest())
    
    await act(async () => {
      await result.current.mutate({
        requestId: 'req-123',
        confirmedMatricule: 'MK-2024-001234',
      })
    })
    
    // Assert
    expect(mockCloudFunction).toHaveBeenCalledWith({
      requestId: 'req-123',
      confirmedMatricule: 'MK-2024-001234',
    })
    
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['membershipRequests'],
    })
  })

  it('should handle error from Cloud Function', async () => {
    const mockCloudFunction = jest.fn().mockRejectedValue(
      new HttpsError('permission-denied', 'Le matricule confirmé ne correspond pas')
    )
    
    httpsCallable.mockReturnValue(mockCloudFunction)
    
    const { result } = renderHook(() => useDeleteMembershipRequest())
    
    await act(async () => {
      try {
        await result.current.mutate({
          requestId: 'req-123',
          confirmedMatricule: 'MK-WRONG',
        })
      } catch (error) {
        expect(error).toBeInstanceOf(HttpsError)
      }
    })
  })
})
```

**Total** : ~6 tests

---

## 💬 4. Flow WhatsApp Complet

### Test : Envoyer WhatsApp du motif de rejet (flow complet)

**Description** : Tester le flow complet d'envoi WhatsApp depuis le composant

**Test** :
```typescript
describe('Integration: Send WhatsApp Flow', () => {
  it('should complete full flow: Component → WhatsAppUrlUtils → Window.open', () => {
    // Arrange
    const openSpy = jest.spyOn(window, 'open').mockImplementation()
    
    render(
      <RejectWhatsAppModalV2
        isOpen={true}
        phoneNumbers={['+24165671734']}
        firstName="Jean"
        matricule="MK-2024-001234"
        motifReject="Documents incomplets. Veuillez fournir tous les documents requis."
        onClose={jest.fn()}
      />
    )
    
    // Act
    const sendButton = screen.getByTestId('reject-whatsapp-modal-send-button')
    fireEvent.click(sendButton)
    
    // Assert
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/24165671734'),
      '_blank'
    )
    
    const calledUrl = openSpy.mock.calls[0][0]
    const decodedUrl = decodeURIComponent(calledUrl)
    expect(decodedUrl).toContain('Jean')
    expect(decodedUrl).toContain('MK-2024-001234')
    expect(decodedUrl).toContain('Documents incomplets')
  })

  it('should use selected phone number when multiple numbers available', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation()
    
    render(
      <RejectWhatsAppModalV2
        isOpen={true}
        phoneNumbers={['+24165671734', '+24107123456']}
        firstName="Jean"
        matricule="MK-2024-001234"
        motifReject="Documents incomplets"
        onClose={jest.fn()}
      />
    )
    
    // Select second phone number
    const select = screen.getByTestId('reject-whatsapp-modal-phone-select')
    fireEvent.change(select, { target: { value: '+24107123456' } })
    
    // Send
    const sendButton = screen.getByTestId('reject-whatsapp-modal-send-button')
    fireEvent.click(sendButton)
    
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('24107123456'),
      '_blank'
    )
  })
})
```

**Total** : ~4 tests

---

## ✅ Checklist Globale

### Flow Rejet
- [ ] Service → Repository → Firestore → Notification (3 tests)
- [ ] Hook → Service → Repository → Cache invalidation (2 tests)
- [ ] Gestion erreurs (3 tests)

### Flow Réouverture
- [ ] Service → Repository → Firestore → Notification (3 tests)
- [ ] Hook → Service → Repository → Cache invalidation (2 tests)
- [ ] Gestion erreurs (3 tests)

### Flow Suppression
- [ ] Hook → Cloud Function → Firestore + Storage → Audit Log (3 tests)
- [ ] Gestion erreurs Cloud Function (3 tests)

### Flow WhatsApp
- [ ] Component → WhatsAppUrlUtils → Window.open (2 tests)
- [ ] Sélection numéro multiple (2 tests)

---

## 📊 Résumé

| Flow | Nombre de Tests | Description |
|------|----------------|-------------|
| Rejet | ~8 | Service → Repository → Firestore → Notification |
| Réouverture | ~8 | Service → Repository → Firestore → Notification |
| Suppression | ~6 | Hook → Cloud Function → Firestore + Storage → Audit Log |
| WhatsApp | ~4 | Component → WhatsAppUrlUtils → Window.open |
| **Total** | **~26** | |

---

## 📚 Références

- **Workflow** : `../workflow-use-case-rejet.md`
- **Flux détaillé** : `../FLUX_REJET.md`
- **Actions post-rejet** : `../ACTIONS_POST_REJET.md`
- **Tests unitaires** : `TESTS_UNITAIRES.md`
- **Tests E2E** : `TESTS_E2E.md`

---

**Note** : Ces tests seront implémentés progressivement selon le workflow d'implémentation.
