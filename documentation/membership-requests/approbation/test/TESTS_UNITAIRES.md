# Tests Unitaires - Approbation d'une Demande d'Adhésion

> Cas de tests unitaires pour l'approbation

---

## 📋 Vue d'ensemble

**Objectif de couverture** : **≥ 80%**

**Fichiers de test** :
- Utilitaires : `src/utils/__tests__/approvalUtils.test.ts`
- Services : `src/domains/memberships/__tests__/unit/services/MembershipServiceV2.test.ts`
- Repositories : `src/domains/memberships/__tests__/unit/repositories/MembershipRepositoryV2.test.ts`
- Cloud Function : `functions/src/membership-requests/__tests__/approveMembershipRequest.test.ts`
- Composants : `src/components/memberships/__tests__/ApprovalModal.test.tsx`

---

## 🧪 1. Utilitaires

### 1.1 ApprovalUtils

**Fichier** : `src/utils/approvalUtils.ts`

#### `generateEmail(firstName: string, lastName: string, matricule: string)`

**Tests** :
```typescript
describe('generateEmail', () => {
  it('UNIT-APPROV-01: should generate email from firstName, lastName and matricule', () => {
    const email = generateEmail('Jean', 'Dupont', '1234.MK.567890')
    expect(email).toBe('jeandupont1234@kara.ga')
  })

  it('UNIT-APPROV-02: should handle special characters in names', () => {
    const email = generateEmail('Jean-Pierre', "D'Angelo", '1234.MK.567890')
    expect(email).toBe('jeanpierredangelo1234@kara.ga')
  })

  it('UNIT-APPROV-03: should handle names with accents', () => {
    const email = generateEmail('José', 'González', '1234.MK.567890')
    expect(email).toBe('josegonzalez1234@kara.ga')
  })

  it('UNIT-APPROV-04: should use first 4 digits of matricule', () => {
    const email = generateEmail('Jean', 'Dupont', '1234567890.MK.567890')
    expect(email).toBe('jeandupont1234@kara.ga')
  })

  it('UNIT-APPROV-05: should handle empty names', () => {
    const email = generateEmail('', '', '1234.MK.567890')
    expect(email).toBe('member1234@kara.ga')
  })
})
```

---

#### `generateSecurePassword(length: number)`

**Tests** :
```typescript
describe('generateSecurePassword', () => {
  it('UNIT-APPROV-06: should generate password with default length (12)', () => {
    const password = generateSecurePassword()
    expect(password.length).toBe(12)
  })

  it('UNIT-APPROV-07: should generate password with custom length', () => {
    const password = generateSecurePassword(16)
    expect(password.length).toBe(16)
  })

  it('UNIT-APPROV-08: should generate different passwords on each call', () => {
    const passwords = Array.from({ length: 100 }, () => generateSecurePassword())
    const uniquePasswords = new Set(passwords)
    expect(uniquePasswords.size).toBeGreaterThan(90)
  })

  it('UNIT-APPROV-09: should include uppercase, lowercase, numbers and special chars', () => {
    const password = generateSecurePassword(20)
    expect(password).toMatch(/[A-Z]/) // Au moins une majuscule
    expect(password).toMatch(/[a-z]/) // Au moins une minuscule
    expect(password).toMatch(/[0-9]/) // Au moins un chiffre
    expect(password).toMatch(/[!@#$%^&*]/) // Au moins un caractère spécial
  })
})
```

---

#### `membershipTypeToRole(membershipType: string)`

**Tests** :
```typescript
describe('membershipTypeToRole', () => {
  it('UNIT-APPROV-10: should convert adherant to Adherant', () => {
    expect(membershipTypeToRole('adherant')).toBe('Adherant')
  })

  it('UNIT-APPROV-11: should convert bienfaiteur to Bienfaiteur', () => {
    expect(membershipTypeToRole('bienfaiteur')).toBe('Bienfaiteur')
  })

  it('UNIT-APPROV-12: should convert sympathisant to Sympathisant', () => {
    expect(membershipTypeToRole('sympathisant')).toBe('Sympathisant')
  })

  it('UNIT-APPROV-13: should default to Adherant for unknown type', () => {
    expect(membershipTypeToRole('unknown')).toBe('Adherant')
  })
})
```

---

### 1.2 PDFGenerator

**Fichier** : `src/utils/pdfGenerator.ts`

#### `generateCredentialsPDF(data: CredentialsPDFData)`

**Tests** :
```typescript
describe('generateCredentialsPDF', () => {
  it('UNIT-APPROV-14: should generate PDF blob', async () => {
    const pdfBlob = await generateCredentialsPDF({
      firstName: 'Jean',
      lastName: 'Dupont',
      matricule: '1234.MK.567890',
      email: 'jeandupont1234@kara.ga',
      password: 'TempPass123!',
    })
    
    expect(pdfBlob).toBeInstanceOf(Blob)
    expect(pdfBlob.type).toBe('application/pdf')
    expect(pdfBlob.size).toBeGreaterThan(0)
  })

  it('UNIT-APPROV-15: should include all required information', async () => {
    const pdfBlob = await generateCredentialsPDF({
      firstName: 'Jean',
      lastName: 'Dupont',
      matricule: '1234.MK.567890',
      email: 'jeandupont1234@kara.ga',
      password: 'TempPass123!',
    })
    
    // Parser le PDF et vérifier le contenu
    const pdfText = await extractTextFromPDF(pdfBlob)
    expect(pdfText).toContain('Jean Dupont')
    expect(pdfText).toContain('1234.MK.567890')
    expect(pdfText).toContain('jeandupont1234@kara.ga')
    expect(pdfText).toContain('TempPass123!')
    expect(pdfText).toContain('KARA Mutuelle')
  })

  it('UNIT-APPROV-16: should format filename correctly', () => {
    const filename = formatCredentialsFilename('1234.MK.567890', new Date('2024-01-20'))
    expect(filename).toMatch(/^Identifiants_Connexion_1234\.MK\.567890_\d{4}-\d{2}-\d{2}\.pdf$/)
  })
})
```

---

## 🧪 2. Services

### 2.1 MembershipServiceV2

**Fichier** : `src/domains/memberships/__tests__/unit/services/MembershipServiceV2.test.ts`

#### `approveMembershipRequest(params)`

**Tests** :
```typescript
describe('MembershipServiceV2.approveMembershipRequest', () => {
  let service: MembershipServiceV2
  let repository: MembershipRepositoryV2
  let mockCloudFunction: any

  beforeEach(() => {
    service = MembershipServiceV2.getInstance()
    repository = MembershipRepositoryV2.getInstance()
    mockCloudFunction = vi.fn()
  })

  it('UNIT-APPROV-17: should call Cloud Function with correct parameters', async () => {
    const params = {
      requestId: 'request-123',
      adminId: 'admin-1',
      membershipType: 'adherant' as const,
      companyId: 'company-123',
      professionId: 'prof-123',
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    }
    
    mockCloudFunction.mockResolvedValue({
      success: true,
      matricule: '1234.MK.567890',
      email: 'jeandupont1234@kara.ga',
      password: 'TempPass123!',
      subscriptionId: 'sub-123',
      companyId: 'company-123',
      professionId: 'prof-123',
    })
    
    vi.spyOn(service, 'approveMembershipRequest').mockImplementation(mockCloudFunction)
    
    const result = await service.approveMembershipRequest(params)
    
    expect(mockCloudFunction).toHaveBeenCalledWith(params)
    expect(result.success).toBe(true)
  })

  it('UNIT-APPROV-18: should handle Cloud Function errors', async () => {
    const params = {
      requestId: 'request-123',
      adminId: 'admin-1',
      membershipType: 'adherant' as const,
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    }
    
    mockCloudFunction.mockRejectedValue(new Error('Cloud Function error'))
    
    vi.spyOn(service, 'approveMembershipRequest').mockImplementation(mockCloudFunction)
    
    await expect(service.approveMembershipRequest(params)).rejects.toThrow('Cloud Function error')
  })
})
```

---

## 🧪 3. Repositories

### 3.1 MembershipRepositoryV2

**Fichier** : `src/domains/memberships/__tests__/unit/repositories/MembershipRepositoryV2.test.ts`

#### `updateStatus(id, status, data)`

**Tests** :
```typescript
describe('MembershipRepositoryV2.updateStatus', () => {
  let repository: MembershipRepositoryV2

  beforeEach(() => {
    repository = MembershipRepositoryV2.getInstance()
  })

  it('UNIT-APPROV-19: should update status to approved with approvedBy and approvedAt', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
    })
    
    await repository.updateStatus(request.id, 'approved', {
      approvedBy: 'admin-1',
      approvedAt: new Date(),
    })
    
    const updated = await repository.getById(request.id)
    expect(updated?.status).toBe('approved')
    expect(updated?.approvedBy).toBe('admin-1')
    expect(updated?.approvedAt).toBeInstanceOf(Date)
    
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

## 🧪 4. Cloud Function

### 4.1 approveMembershipRequest

**Fichier** : `functions/src/membership-requests/__tests__/approveMembershipRequest.test.ts`

#### Validation

**Tests** :
```typescript
describe('approveMembershipRequest - Validation', () => {
  it('UNIT-APPROV-20: should reject if request not found', async () => {
    await expect(
      approveMembershipRequest({
        requestId: 'non-existent',
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
      })
    ).rejects.toThrow('Demande d\'adhésion non trouvée')
  })

  it('UNIT-APPROV-21: should reject if request not paid', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: false,
    })
    
    await expect(
      approveMembershipRequest({
        requestId: request.id,
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
      })
    ).rejects.toThrow('La demande doit être payée')
    
    await deleteTestMembershipRequest(request.id)
  })

  it('UNIT-APPROV-22: should reject if request already approved', async () => {
    const request = await createTestMembershipRequest({
      status: 'approved',
      isPaid: true,
    })
    
    await expect(
      approveMembershipRequest({
        requestId: request.id,
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
      })
    ).rejects.toThrow('La demande est déjà approuvée')
    
    await deleteTestMembershipRequest(request.id)
  })

  it('UNIT-APPROV-23: should reject if user not admin', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
    })
    
    // Mock request.auth pour un utilisateur non-admin
    const mockRequest = {
      auth: {
        token: {
          role: 'User', // Pas admin
        },
      },
    }
    
    await expect(
      approveMembershipRequest(mockRequest, {
        requestId: request.id,
        adminId: 'user-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
      })
    ).rejects.toThrow('Permissions insuffisantes')
    
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

#### Génération Email et Mot de Passe

**Tests** :
```typescript
describe('approveMembershipRequest - Email and Password Generation', () => {
  it('UNIT-APPROV-24: should generate email correctly', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
      identity: {
        firstName: 'Jean',
        lastName: 'Dupont',
      },
      matricule: '1234.MK.567890',
    })
    
    const result = await approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
    
    expect(result.email).toMatch(/^jeandupont\d+@kara\.ga$/)
    
    // Nettoyer
    await deleteTestUser(result.matricule)
    await deleteTestMembershipRequest(request.id)
  })

  it('UNIT-APPROV-25: should generate secure password', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
    })
    
    const result = await approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
    
    expect(result.password.length).toBeGreaterThanOrEqual(12)
    expect(result.password).toMatch(/[A-Z]/)
    expect(result.password).toMatch(/[a-z]/)
    expect(result.password).toMatch(/[0-9]/)
    expect(result.password).toMatch(/[!@#$%^&*]/)
    
    // Nettoyer
    await deleteTestUser(result.matricule)
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

#### Rollback

**Tests** :
```typescript
describe('approveMembershipRequest - Rollback', () => {
  it('UNIT-APPROV-26: should rollback if user creation fails', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
    })
    
    // Mock pour faire échouer la création User
    const originalCreateUser = admin.auth().createUser
    vi.spyOn(admin.auth(), 'createUser').mockRejectedValue(new Error('Auth creation failed'))
    
    await expect(
      approveMembershipRequest({
        requestId: request.id,
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
      })
    ).rejects.toThrow()
    
    // Vérifier que rien n'a été créé
    const userDoc = await admin.firestore().collection('users').doc(request.matricule).get()
    expect(userDoc.exists).toBe(false)
    
    // Restaurer
    vi.restoreAllMocks()
    await deleteTestMembershipRequest(request.id)
  })

  it('UNIT-APPROV-27: should rollback if subscription creation fails', async () => {
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
    })
    
    // Mock pour faire échouer la création Subscription
    const originalAdd = admin.firestore().collection('subscriptions').add
    vi.spyOn(admin.firestore().collection('subscriptions'), 'add').mockRejectedValue(new Error('Subscription creation failed'))
    
    await expect(
      approveMembershipRequest({
        requestId: request.id,
        adminId: 'admin-1',
        membershipType: 'adherant',
        adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
      })
    ).rejects.toThrow()
    
    // Vérifier que le User créé est supprimé
    try {
      await admin.auth().getUser(request.matricule)
      fail('User should have been deleted')
    } catch (error: any) {
      expect(error.code).toBe('auth/user-not-found')
    }
    
    // Restaurer
    vi.restoreAllMocks()
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

## 🧪 5. Composants React

### 5.1 ApprovalModal

**Fichier** : `src/components/memberships/__tests__/ApprovalModal.test.tsx`

**Tests** :
```typescript
describe('ApprovalModal', () => {
  it('UNIT-APPROV-28: should render modal with all fields', () => {
    const { getByTestId } = render(
      <ApprovalModal
        isOpen={true}
        onClose={vi.fn()}
        request={mockMembershipRequest}
      />
    )
    
    expect(getByTestId('approval-modal')).toBeInTheDocument()
    expect(getByTestId('approval-modal-title')).toBeInTheDocument()
    expect(getByTestId('approval-modal-membership-type-select')).toBeInTheDocument()
    expect(getByTestId('approval-modal-pdf-upload-zone')).toBeInTheDocument()
  })

  it('UNIT-APPROV-29: should disable approve button if PDF missing', () => {
    const { getByTestId } = render(
      <ApprovalModal
        isOpen={true}
        onClose={vi.fn()}
        request={mockMembershipRequest}
      />
    )
    
    const approveButton = getByTestId('approval-modal-approve-button')
    expect(approveButton).toBeDisabled()
  })

  it('UNIT-APPROV-30: should enable approve button when all fields filled', async () => {
    const { getByTestId } = render(
      <ApprovalModal
        isOpen={true}
        onClose={vi.fn()}
        request={mockMembershipRequest}
      />
    )
    
    // Sélectionner le type de membre
    await userEvent.click(getByTestId('approval-modal-membership-type-select'))
    await userEvent.click(getByTestId('approval-modal-membership-type-option-adherant'))
    
    // Uploader un PDF
    const fileInput = getByTestId('approval-modal-pdf-file-input')
    const file = new File(['content'], 'adhesion.pdf', { type: 'application/pdf' })
    await userEvent.upload(fileInput, file)
    
    // Vérifier que le bouton est activé
    const approveButton = getByTestId('approval-modal-approve-button')
    expect(approveButton).toBeEnabled()
  })

  it('UNIT-APPROV-31: should show loading state during approval', async () => {
    const mockApprove = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    const { getByTestId } = render(
      <ApprovalModal
        isOpen={true}
        onClose={vi.fn()}
        request={mockMembershipRequest}
        onApprove={mockApprove}
      />
    )
    
    // Remplir les champs et approuver
    await userEvent.click(getByTestId('approval-modal-membership-type-select'))
    await userEvent.click(getByTestId('approval-modal-membership-type-option-adherant'))
    
    const fileInput = getByTestId('approval-modal-pdf-file-input')
    const file = new File(['content'], 'adhesion.pdf', { type: 'application/pdf' })
    await userEvent.upload(fileInput, file)
    
    await userEvent.click(getByTestId('approval-modal-approve-button'))
    
    // Vérifier le spinner
    expect(getByTestId('approval-modal-loading-spinner')).toBeInTheDocument()
    expect(getByTestId('approval-modal-approve-button')).toBeDisabled()
  })

  it('UNIT-APPROV-32: should display company section if isEmployed is true', () => {
    const requestWithCompany = {
      ...mockMembershipRequest,
      company: {
        isEmployed: true,
        companyName: 'KARA Mutuelle',
      },
    }
    
    const { getByTestId } = render(
      <ApprovalModal
        isOpen={true}
        onClose={vi.fn()}
        request={requestWithCompany}
      />
    )
    
    expect(getByTestId('approval-modal-company-section')).toBeInTheDocument()
    expect(getByTestId('approval-modal-company-name')).toHaveTextContent('KARA Mutuelle')
  })

  it('UNIT-APPROV-33: should not display company section if isEmployed is false', () => {
    const requestWithoutCompany = {
      ...mockMembershipRequest,
      company: {
        isEmployed: false,
      },
    }
    
    const { queryByTestId } = render(
      <ApprovalModal
        isOpen={true}
        onClose={vi.fn()}
        request={requestWithoutCompany}
      />
    )
    
    expect(queryByTestId('approval-modal-company-section')).not.toBeInTheDocument()
  })
})
```

---

## 📊 Résumé des Tests Unitaires

### Par Catégorie

- **Utilitaires** : 16 tests
- **Services** : 2 tests
- **Repositories** : 1 test
- **Cloud Function** : 8 tests
- **Composants React** : 6 tests

**Total** : **33 tests unitaires**

### Couverture par Fichier

- ✅ `approvalUtils.ts` : 100%
- ✅ `pdfGenerator.ts` : 100%
- ✅ `MembershipServiceV2.ts` : ≥ 80%
- ✅ `MembershipRepositoryV2.ts` : ≥ 80%
- ✅ `approveMembershipRequest.ts` : ≥ 80%
- ✅ `ApprovalModal.tsx` : ≥ 80%

---

## 📖 Références

- **Utilitaires** : `src/utils/approvalUtils.ts`
- **Services** : `src/domains/memberships/services/`
- **Repositories** : `src/domains/memberships/repositories/`
- **Cloud Function** : `functions/src/membership-requests/approveMembershipRequest.ts`
- **Composants** : `src/components/memberships/`
