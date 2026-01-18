# Tests d'Intégration - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document liste tous les cas de tests d'intégration pour la fonctionnalité de correction, testant l'interaction entre composants, services, repositories et **Cloud Functions**.

**Objectif de couverture : 80% minimum**

**✅ Tous les flows du feedback P0 sont couverts**

**⚠️ IMPORTANT :** Les tests doivent maintenant mocker les appels aux Cloud Functions (`verifySecurityCode` et `submitCorrections`) au lieu d'appeler directement les repositories.

---

## 🔗 1. Intégration Admin - Demander des Corrections

### 1.1 Flow complet : Admin → Service → Repository → Firestore

**Fichier :** `src/domains/memberships/__tests__/integration/request-corrections.integration.test.tsx`

**Tests :**
```typescript
describe('Integration: Request Corrections Flow', () => {
  let service: MembershipServiceV2
  let repository: MembershipRepositoryV2
  let adminRepository: AdminRepository

  beforeEach(() => {
    service = MembershipServiceV2.getInstance()
    repository = MembershipRepositoryV2.getInstance()
    adminRepository = AdminRepository.getInstance()
  })

  it('should complete full flow: Admin action → Service → Repository → Firestore', async () => {
    // 1. Setup: Créer une demande en pending
    const request = await createTestMembershipRequest({ status: 'pending' })
    
    // 2. Mock admin
    const admin = { id: 'admin-1', firstName: 'Admin', lastName: 'Test' }
    vi.spyOn(adminRepository, 'getAdminById').mockResolvedValue(admin as Admin)
    
    // 3. Exécuter requestCorrections
    const result = await service.requestCorrections({
      requestId: request.id,
      adminId: 'admin-1',
      corrections: ['Photo floue', 'Adresse incomplète'],
      selectedPhoneIndex: 0,
    })
    
    // 4. Vérifier que le code est généré
    expect(result.securityCode).toMatch(/^\d{6}$/)
    expect(result.securityCodeExpiry).toBeInstanceOf(Date)
    
    // 5. Vérifier que la demande a été mise à jour dans Firestore
    const updatedRequest = await repository.getById(request.id)
    expect(updatedRequest?.status).toBe('under_review')
    expect(updatedRequest?.reviewNote).toBe('Photo floue\nAdresse incomplète')
    expect(updatedRequest?.securityCode).toBe(result.securityCode)
    expect(updatedRequest?.securityCodeUsed).toBe(false)
    expect(updatedRequest?.processedBy).toBe('admin-1')
    
    // 6. Nettoyer
    await deleteTestMembershipRequest(request.id)
  })

  it('should generate WhatsApp URL when phone number is available', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
      identity: {
        contacts: ['+24165671734', '+24107123456'],
        firstName: 'Jean',
      },
    })
    
    const admin = { id: 'admin-1', firstName: 'Admin', lastName: 'Test' }
    vi.spyOn(adminRepository, 'getAdminById').mockResolvedValue(admin as Admin)
    
    const result = await service.requestCorrections({
      requestId: request.id,
      adminId: 'admin-1',
      corrections: ['Photo floue'],
      selectedPhoneIndex: 1, // Deuxième numéro
    })
    
    expect(result.whatsAppUrl).toBeDefined()
    expect(result.whatsAppUrl).toContain('wa.me')
    expect(result.whatsAppUrl).toContain('24107123456') // Deuxième numéro
    
    await deleteTestMembershipRequest(request.id)
  })

  it('should not generate WhatsApp URL when no phone number', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
      identity: {
        contacts: [],
        firstName: 'Jean',
      },
    })
    
    const admin = { id: 'admin-1', firstName: 'Admin', lastName: 'Test' }
    vi.spyOn(adminRepository, 'getAdminById').mockResolvedValue(admin as Admin)
    
    const result = await service.requestCorrections({
      requestId: request.id,
      adminId: 'admin-1',
      corrections: ['Photo floue'],
      selectedPhoneIndex: 0,
    })
    
    expect(result.whatsAppUrl).toBeUndefined()
    
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

## 🔗 2. Intégration Demandeur - Vérification Code

### 2.1 Flow complet : URL → Hook → Service → Repository

**Fichier :** `src/domains/auth/registration/__tests__/integration/verify-security-code.integration.test.tsx`

**Tests :**
```typescript
describe('Integration: Verify Security Code Flow', () => {
  let service: RegistrationService
  let repository: RegistrationRepository

  beforeEach(() => {
    service = new RegistrationService(new RegistrationRepository())
    repository = new RegistrationRepository()
  })

  it('should verify code and load registration data', async () => {
    // 1. Créer une demande avec corrections
    const request = await createTestMembershipRequest({
      status: 'under_review',
      reviewNote: 'Photo floue',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
      securityCodeUsed: false,
    })
    
    // 2. Vérifier le code
    const isValid = await service.verifySecurityCode(request.id, '123456')
    expect(isValid).toBe(true)
    
    // 3. Charger les données pour correction
    const formData = await service.loadRegistrationForCorrection(request.id)
    expect(formData).toBeDefined()
    expect(formData?.identity.firstName).toBe(request.identity.firstName)
    
    // 4. Vérifier que le code est marqué comme utilisé
    const updatedRequest = await repository.getById(request.id)
    expect(updatedRequest?.securityCodeUsed).toBe(true)
    
    await deleteTestMembershipRequest(request.id)
  })

  it('should reject expired code (via Cloud Function)', async () => {
    const request = await createTestMembershipRequest({
      status: 'under_review',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() - 1000), // Expiré
      securityCodeUsed: false,
    })
    
    // Note: verifySecurityCode() appelle la Cloud Function qui vérifie l'expiration
    const isValid = await service.verifySecurityCode(request.id, '123456')
    expect(isValid).toBe(false)
    // Note: La Cloud Function retourne { isValid: false, reason: 'CODE_EXPIRED' }
    
    await deleteTestMembershipRequest(request.id)
  })

  it('should reject used code (via Cloud Function)', async () => {
    const request = await createTestMembershipRequest({
      status: 'under_review',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
      securityCodeUsed: true, // Déjà utilisé
    })
    
    // Note: verifySecurityCode() appelle la Cloud Function qui vérifie l'usage
    const isValid = await service.verifySecurityCode(request.id, '123456')
    expect(isValid).toBe(false)
    // Note: La Cloud Function retourne { isValid: false, reason: 'CODE_ALREADY_USED' }
    
    await deleteTestMembershipRequest(request.id)
  })

  it('should reject incorrect code', async () => {
    const request = await createTestMembershipRequest({
      status: 'under_review',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
      securityCodeUsed: false,
    })
    
    const isValid = await service.verifySecurityCode(request.id, '999999') // Code incorrect
    expect(isValid).toBe(false)
    
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

## 🔗 3. Intégration Demandeur - Soumission Corrections

### 3.1 Flow complet : Formulaire → Service → Repository → Firestore

**Fichier :** `src/domains/auth/registration/__tests__/integration/submit-corrections.integration.test.tsx`

**Tests :**
```typescript
describe('Integration: Submit Corrections Flow', () => {
  let service: RegistrationService
  let repository: RegistrationRepository

  beforeEach(() => {
    service = new RegistrationService(new RegistrationRepository())
    repository = new RegistrationRepository()
  })

  it('should update request and mark code as used', async () => {
    // 1. Créer une demande avec corrections
    const originalRequest = await createTestMembershipRequest({
      status: 'under_review',
      reviewNote: 'Photo floue',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() + 48 * 60 * 60 * 1000),
      securityCodeUsed: false,
    })
    
    // 2. Préparer les données modifiées
    const updatedFormData: RegisterFormData = {
      ...originalRequest,
      identity: {
        ...originalRequest.identity,
        photo: 'new-photo-url', // Photo corrigée
      },
    }
    
    // 3. Soumettre les corrections
    const success = await service.updateRegistration(originalRequest.id, updatedFormData)
    expect(success).toBe(true)
    
    // 4. Vérifier que la demande a été mise à jour
    const updatedRequest = await repository.getById(originalRequest.id)
    expect(updatedRequest?.status).toBe('pending') // Retour à pending
    expect(updatedRequest?.securityCodeUsed).toBe(true) // Code marqué comme utilisé
    expect(updatedRequest?.reviewNote).toBeNull() // ReviewNote nettoyé
    expect(updatedRequest?.securityCode).toBeNull() // SecurityCode nettoyé
    expect(updatedRequest?.identity.photo).toBe('new-photo-url') // Données mises à jour
    
    await deleteTestMembershipRequest(originalRequest.id)
  })

  it('should preserve processedBy and processedAt when updating', async () => {
    const originalRequest = await createTestMembershipRequest({
      status: 'under_review',
      processedBy: 'admin-1',
      processedAt: new Date('2024-01-01'),
    })
    
    const updatedFormData: RegisterFormData = {
      ...originalRequest,
      identity: {
        ...originalRequest.identity,
        firstName: 'Jean Updated',
      },
    }
    
    await service.updateRegistration(originalRequest.id, updatedFormData)
    
    const updatedRequest = await repository.getById(originalRequest.id)
    expect(updatedRequest?.processedBy).toBe('admin-1') // Préservé
    expect(updatedRequest?.processedAt).toEqual(originalRequest.processedAt) // Préservé
    
    await deleteTestMembershipRequest(originalRequest.id)
  })
})
```

---

## 🔗 4. Intégration Admin - Actions Post-Création

### 4.1 Copier lien de correction

**Fichier :** `src/domains/memberships/__tests__/integration/copy-correction-link.integration.test.tsx`

**Tests :**
```typescript
describe('Integration: Copy Correction Link', () => {
  it('should generate correct link format', () => {
    const requestId = 'test-request-id'
    const link = generateCorrectionLink(requestId)
    
    expect(link).toBe(`/register?requestId=${requestId}`)
  })

  it('should copy link to clipboard', async () => {
    const requestId = 'test-request-id'
    const link = generateCorrectionLink(requestId)
    
    // Mock clipboard API
    const writeTextSpy = vi.fn()
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    })
    
    await copyCorrectionLink(requestId)
    
    expect(writeTextSpy).toHaveBeenCalledWith(link)
  })
})
```

---

### 4.2 Régénérer le code

**Fichier :** `src/domains/memberships/__tests__/integration/renew-security-code.integration.test.tsx`

**Tests :**
```typescript
describe('Integration: Renew Security Code', () => {
  let service: MembershipServiceV2
  let repository: MembershipRepositoryV2

  beforeEach(() => {
    service = MembershipServiceV2.getInstance()
    repository = MembershipRepositoryV2.getInstance()
  })

  it('should generate new code and update expiry', async () => {
    const request = await createTestMembershipRequest({
      status: 'under_review',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
    })
    
    const result = await service.renewSecurityCode(request.id, 'admin-1')
    
    expect(result.success).toBe(true)
    expect(result.newCode).toBeDefined()
    expect(result.newCode).toMatch(/^\d{6}$/)
    expect(result.newCode).not.toBe('123456') // Nouveau code différent
    
    // Vérifier que la demande a été mise à jour
    const updatedRequest = await repository.getById(request.id)
    expect(updatedRequest?.securityCode).toBe(result.newCode)
    expect(updatedRequest?.securityCodeExpiry.getTime()).toBeGreaterThan(
      request.securityCodeExpiry.getTime()
    )
    
    await deleteTestMembershipRequest(request.id)
  })

  it('should invalidate old code', async () => {
    const request = await createTestMembershipRequest({
      status: 'under_review',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      securityCodeUsed: false,
    })
    
    const result = await service.renewSecurityCode(request.id, 'admin-1')
    
    // L'ancien code ne doit plus fonctionner
    const registrationService = new RegistrationService(new RegistrationRepository())
    const isValidOldCode = await registrationService.verifySecurityCode(request.id, '123456')
    expect(isValidOldCode).toBe(false)
    
    // Le nouveau code doit fonctionner
    const isValidNewCode = await registrationService.verifySecurityCode(request.id, result.newCode!)
    expect(isValidNewCode).toBe(true)
    
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

---

## 🔗 4. Intégration Admin - Copier Lien de Correction

### 4.1 Flow complet : Génération et copie du lien

**Fichier :** `src/domains/memberships/__tests__/integration/copy-correction-link.integration.test.tsx`

**Tests :**
```typescript
describe('Integration: Copy Correction Link', () => {
  it('should generate correct link format (without code)', () => {
    const requestId = 'test-request-id'
    const link = generateCorrectionLink(requestId)
    
    expect(link).toBe(`/register?requestId=${requestId}`)
    expect(link).not.toContain('code=') // Le code ne doit PAS être dans l'URL
  })

  it('should copy link to clipboard', async () => {
    const requestId = 'test-request-id'
    const link = generateCorrectionLink(requestId)
    
    // Mock clipboard API
    const writeTextSpy = vi.fn()
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    })
    
    await copyCorrectionLink(requestId)
    
    expect(writeTextSpy).toHaveBeenCalledWith(link)
  })

  it('should handle clipboard API errors gracefully', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
      },
    })
    
    await expect(copyCorrectionLink('test-id')).rejects.toThrow('Clipboard error')
  })
})
```

---

## 🔗 5. Intégration Admin - Régénérer le Code

### 5.1 Flow complet : Régénération avec nouvelle expiration

**Fichier :** `src/domains/memberships/__tests__/integration/renew-security-code.integration.test.tsx`

**Tests :**
```typescript
describe('Integration: Renew Security Code', () => {
  let service: MembershipServiceV2
  let repository: MembershipRepositoryV2

  beforeEach(() => {
    service = MembershipServiceV2.getInstance()
    repository = MembershipRepositoryV2.getInstance()
  })

  it('should generate new code and update expiry to 48h', async () => {
    const request = await createTestMembershipRequest({
      status: 'under_review',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
    })
    
    const result = await service.renewSecurityCode(request.id, 'admin-1')
    
    expect(result.success).toBe(true)
    expect(result.newCode).toBeDefined()
    expect(result.newCode).toMatch(/^\d{6}$/)
    expect(result.newCode).not.toBe('123456') // Nouveau code différent
    
    // Vérifier que la demande a été mise à jour
    const updatedRequest = await repository.getById(request.id)
    expect(updatedRequest?.securityCode).toBe(result.newCode)
    
    // Vérifier que la nouvelle expiration est ~48h
    const newExpiry = updatedRequest?.securityCodeExpiry
    expect(newExpiry).toBeDefined()
    const hoursUntilExpiry = (newExpiry!.getTime() - Date.now()) / (1000 * 60 * 60)
    expect(hoursUntilExpiry).toBeGreaterThanOrEqual(47)
    expect(hoursUntilExpiry).toBeLessThanOrEqual(48)
    
    await deleteTestMembershipRequest(request.id)
  })

  it('should invalidate old code', async () => {
    const request = await createTestMembershipRequest({
      status: 'under_review',
      securityCode: '123456',
      securityCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      securityCodeUsed: false,
    })
    
    const result = await service.renewSecurityCode(request.id, 'admin-1')
    
    // L'ancien code ne doit plus fonctionner
    const registrationService = new RegistrationService(new RegistrationRepository())
    const isValidOldCode = await registrationService.verifySecurityCode(request.id, '123456')
    expect(isValidOldCode).toBe(false)
    
    // Le nouveau code doit fonctionner
    const isValidNewCode = await registrationService.verifySecurityCode(request.id, result.newCode!)
    expect(isValidNewCode).toBe(true)
    
    await deleteTestMembershipRequest(request.id)
  })

  it('should throw error if request not in under_review status', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
    })
    
    await expect(
      service.renewSecurityCode(request.id, 'admin-1')
    ).rejects.toThrow('La demande doit être en correction')
    
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

## 🔗 6. Intégration Admin - Génération Message WhatsApp

### 6.1 Flow complet : Génération message avec lien + code + expiration

**Fichier :** `src/domains/memberships/__tests__/integration/whatsapp-message.integration.test.tsx`

**Tests :**
```typescript
describe('Integration: WhatsApp Message Generation', () => {
  it('should generate message with link, code, and expiry', () => {
    const params = {
      firstName: 'Jean',
      correctionLink: '/register?requestId=test-id',
      securityCode: '123456',
      formattedCode: '12-34-56',
      expiryDate: new Date('2026-01-18T22:10:00'),
      timeRemaining: '2j 13h',
      corrections: ['Photo floue', 'Adresse incomplète'],
    }
    
    const message = generateWhatsAppMessage(params)
    
    expect(message).toContain('Bonjour Jean')
    expect(message).toContain('/register?requestId=test-id') // Lien
    expect(message).toContain('12-34-56') // Code formaté
    expect(message).toContain('18/01/2026 22:10') // Date expiration
    expect(message).toContain('reste 2j 13h') // Temps restant
    expect(message).toContain('Photo floue') // Corrections
    expect(message).toContain('Adresse incomplète')
  })

  it('should generate WhatsApp URL with encoded message', () => {
    const phoneNumber = '+24165671734'
    const message = 'Bonjour\n\nVotre demande nécessite des corrections.'
    
    const url = generateWhatsAppUrl(phoneNumber, message)
    
    expect(url).toContain('wa.me')
    expect(url).toContain('24165671734')
    expect(url).toContain('text=')
    expect(decodeURIComponent(url.split('text=')[1] || '')).toContain('Bonjour')
  })
})
```

---

## ✅ Checklist

### Tests Intégration Admin
- [x] requestCorrections flow complet (Service → Repository → Firestore)
- [x] Génération WhatsApp URL (avec sélection numéro)
- [x] copyCorrectionLink (génération + copie presse-papier)
- [x] renewSecurityCode (régénération + nouvelle expiration 48h)
- [x] Génération message WhatsApp (lien + code + expiration)

### Tests Intégration Demandeur
- [x] verifySecurityCode flow (Service → Repository → Firestore)
- [x] submitCorrections flow (Service → Repository → Firestore)
- [x] Validation code (expiré, utilisé, incorrect)

### Coverage
- [ ] **Objectif : 80% minimum**
- [ ] Intégration Admin : 80%+ (tous les flows)
- [ ] Intégration Demandeur : 80%+ (tous les flows)
- [ ] Mocks Firestore configurés
- [ ] Helpers de test créés (createTestMembershipRequest, deleteTestMembershipRequest)
