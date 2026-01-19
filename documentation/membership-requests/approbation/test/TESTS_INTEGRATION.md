# Tests d'Intégration - Approbation d'une Demande d'Adhésion

> Cas de tests d'intégration pour l'approbation, testant l'interaction entre composants, services, repositories et Cloud Functions

---

## 📋 Vue d'ensemble

**Objectif de couverture** : **≥ 80%**

**⚠️ IMPORTANT** : Les tests doivent mocker les appels aux Cloud Functions (`approveMembershipRequest`) au lieu d'appeler directement les repositories.

---

## 🔗 1. Intégration Admin - Approbation Complète

### 1.1 Flow complet : Admin → Service → Cloud Function → Firebase

**Fichier** : `src/domains/memberships/__tests__/integration/approve-membership-request.integration.test.tsx`

**Tests** :
```typescript
describe('Integration: Approve Membership Request Flow', () => {
  let service: MembershipServiceV2
  let repository: MembershipRepositoryV2
  let adminRepository: AdminRepository

  beforeEach(() => {
    service = MembershipServiceV2.getInstance()
    repository = MembershipRepositoryV2.getInstance()
    adminRepository = AdminRepository.getInstance()
  })

  it('INT-APPROV-01: should complete full flow: Admin → Service → Cloud Function → Firebase', async () => {
    // 1. Setup: Créer une demande payée en pending
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
      identity: {
        firstName: 'Jean',
        lastName: 'Dupont',
        contacts: ['+24165671734'],
      },
    })
    
    // 2. Mock admin
    const admin = { id: 'admin-1', firstName: 'Admin', lastName: 'Test' }
    vi.spyOn(adminRepository, 'getAdminById').mockResolvedValue(admin as Admin)
    
    // 3. Mock Cloud Function
    const mockApproveFunction = vi.fn().mockResolvedValue({
      success: true,
      matricule: request.matricule,
      email: 'jeandupont1234@kara.ga',
      password: 'TempPass123!',
      subscriptionId: 'sub-123',
      companyId: null,
      professionId: null,
    })
    vi.spyOn(service, 'approveMembershipRequest').mockImplementation(mockApproveFunction)
    
    // 4. Exécuter approveMembershipRequest
    const result = await service.approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      companyId: null,
      professionId: null,
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
    
    // 5. Vérifier que la Cloud Function a été appelée
    expect(mockApproveFunction).toHaveBeenCalledWith({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      companyId: null,
      professionId: null,
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
    
    // 6. Vérifier le résultat
    expect(result.success).toBe(true)
    expect(result.matricule).toBe(request.matricule)
    expect(result.email).toMatch(/^jeandupont\d+@kara\.ga$/)
    expect(result.password).toBeDefined()
    
    // 7. Vérifier que la demande a été mise à jour dans Firestore
    const updatedRequest = await repository.getById(request.id)
    expect(updatedRequest?.status).toBe('approved')
    expect(updatedRequest?.approvedBy).toBe('admin-1')
    expect(updatedRequest?.approvedAt).toBeInstanceOf(Date)
    
    // 8. Nettoyer
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

### 1.2 Intégration avec création d'entreprise

**Tests** :
```typescript
it('INT-APPROV-02: should create company if it does not exist', async () => {
  // 1. Setup: Créer une demande avec entreprise
  const request = await createTestMembershipRequest({
    status: 'pending',
    isPaid: true,
    company: {
      isEmployed: true,
      companyName: 'Nouvelle Entreprise',
    },
  })
  
  // 2. Mock CompanyService pour vérifier l'existence
  const companyService = CompanyService.getInstance()
  vi.spyOn(companyService, 'findByName').mockResolvedValue(null) // N'existe pas
  
  // 3. Mock création d'entreprise
  const createdCompany = { id: 'company-123', name: 'Nouvelle Entreprise' }
  vi.spyOn(companyService, 'findOrCreate').mockResolvedValue(createdCompany)
  
  // 4. Exécuter approveMembershipRequest
  const result = await service.approveMembershipRequest({
    requestId: request.id,
    adminId: 'admin-1',
    membershipType: 'adherant',
    companyId: 'company-123', // ID de l'entreprise créée
    professionId: null,
    adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
  })
  
  // 5. Vérifier que l'entreprise a été créée
  expect(companyService.findOrCreate).toHaveBeenCalledWith('Nouvelle Entreprise', 'admin-1')
  expect(result.companyId).toBe('company-123')
  
  // 6. Nettoyer
  await deleteTestMembershipRequest(request.id)
  await deleteTestCompany('company-123')
})
```

---

### 1.3 Intégration avec création de profession

**Tests** :
```typescript
it('INT-APPROV-03: should create profession if it does not exist', async () => {
  // 1. Setup: Créer une demande avec profession
  const request = await createTestMembershipRequest({
    status: 'pending',
    isPaid: true,
    company: {
      isEmployed: true,
      profession: 'Nouvelle Profession',
    },
  })
  
  // 2. Mock ProfessionService pour vérifier l'existence
  const professionService = ProfessionService.getInstance()
  vi.spyOn(professionService, 'findByName').mockResolvedValue(null) // N'existe pas
  
  // 3. Mock création de profession
  const createdProfession = { id: 'prof-123', name: 'Nouvelle Profession' }
  vi.spyOn(professionService, 'findOrCreate').mockResolvedValue(createdProfession)
  
  // 4. Exécuter approveMembershipRequest
  const result = await service.approveMembershipRequest({
    requestId: request.id,
    adminId: 'admin-1',
    membershipType: 'adherant',
    companyId: null,
    professionId: 'prof-123', // ID de la profession créée
    adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
  })
  
  // 5. Vérifier que la profession a été créée
  expect(professionService.findOrCreate).toHaveBeenCalledWith('Nouvelle Profession', 'admin-1')
  expect(result.professionId).toBe('prof-123')
  
  // 6. Nettoyer
  await deleteTestMembershipRequest(request.id)
  await deleteTestProfession('prof-123')
})
```

---

## 🔗 2. Intégration Cloud Function

### 2.1 Flow complet : Cloud Function → Firebase Auth → Firestore

**Fichier** : `functions/src/membership-requests/__tests__/approveMembershipRequest.integration.test.ts`

**Tests** :
```typescript
describe('Integration: approveMembershipRequest Cloud Function', () => {
  let adminApp: admin.app.App
  let testDb: admin.firestore.Firestore
  let testAuth: admin.auth.Auth

  beforeAll(async () => {
    // Initialiser Firebase Admin pour les tests
    adminApp = admin.initializeApp({
      projectId: 'test-project',
    })
    testDb = admin.firestore()
    testAuth = admin.auth()
  })

  afterAll(async () => {
    await adminApp.delete()
  })

  it('INT-APPROV-04: should create user in Firebase Auth', async () => {
    // 1. Créer une demande de test
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
      matricule: '1234.MK.567890',
    })
    
    // 2. Appeler la Cloud Function
    const result = await approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
    
    // 3. Vérifier que l'utilisateur est créé dans Firebase Auth
    const userRecord = await testAuth.getUser(result.matricule)
    expect(userRecord).toBeDefined()
    expect(userRecord.email).toBe(result.email)
    expect(userRecord.uid).toBe(result.matricule)
    
    // 4. Nettoyer
    await testAuth.deleteUser(result.matricule)
    await deleteTestMembershipRequest(request.id)
  })

  it('INT-APPROV-05: should create user document in Firestore', async () => {
    // 1. Créer une demande de test
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
      matricule: '1234.MK.567890',
    })
    
    // 2. Appeler la Cloud Function
    const result = await approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
    
    // 3. Vérifier que le document users est créé
    const userDoc = await testDb.collection('users').doc(result.matricule).get()
    expect(userDoc.exists).toBe(true)
    expect(userDoc.data()?.matricule).toBe(result.matricule)
    expect(userDoc.data()?.email).toBe(result.email)
    expect(userDoc.data()?.membershipType).toBe('adherant')
    expect(userDoc.data()?.isActive).toBe(true)
    
    // 4. Nettoyer
    await testDb.collection('users').doc(result.matricule).delete()
    await testAuth.deleteUser(result.matricule)
    await deleteTestMembershipRequest(request.id)
  })

  it('INT-APPROV-06: should create subscription', async () => {
    // 1. Créer une demande de test
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
      matricule: '1234.MK.567890',
    })
    
    // 2. Appeler la Cloud Function
    const result = await approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
    
    // 3. Vérifier que la subscription est créée
    const subscriptionDoc = await testDb.collection('subscriptions').doc(result.subscriptionId).get()
    expect(subscriptionDoc.exists).toBe(true)
    expect(subscriptionDoc.data()?.memberId).toBe(result.matricule)
    expect(subscriptionDoc.data()?.membershipType).toBe('adherant')
    expect(subscriptionDoc.data()?.status).toBe('active')
    expect(subscriptionDoc.data()?.adhesionPdfURL).toBe('https://storage.googleapis.com/.../adhesion.pdf')
    
    // 4. Vérifier que la subscription est liée au user
    const userDoc = await testDb.collection('users').doc(result.matricule).get()
    expect(userDoc.data()?.subscriptions).toContain(result.subscriptionId)
    
    // 5. Nettoyer
    await testDb.collection('subscriptions').doc(result.subscriptionId).delete()
    await testDb.collection('users').doc(result.matricule).delete()
    await testAuth.deleteUser(result.matricule)
    await deleteTestMembershipRequest(request.id)
  })

  it('INT-APPROV-07: should archive PDF document', async () => {
    // 1. Créer une demande de test
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
      matricule: '1234.MK.567890',
    })
    
    const pdfURL = 'https://storage.googleapis.com/.../adhesion.pdf'
    
    // 2. Appeler la Cloud Function
    const result = await approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      adhesionPdfURL: pdfURL,
    })
    
    // 3. Vérifier que le document est archivé
    const documentsSnapshot = await testDb.collection('documents')
      .where('memberId', '==', result.matricule)
      .where('type', '==', 'ADHESION')
      .get()
    
    expect(documentsSnapshot.size).toBeGreaterThan(0)
    const document = documentsSnapshot.docs[0].data()
    expect(document.type).toBe('ADHESION')
    expect(document.format).toBe('pdf')
    expect(document.memberId).toBe(result.matricule)
    expect(document.url).toBe(pdfURL)
    
    // 4. Nettoyer
    await testDb.collection('documents').doc(documentsSnapshot.docs[0].id).delete()
    await testDb.collection('users').doc(result.matricule).delete()
    await testAuth.deleteUser(result.matricule)
    await deleteTestMembershipRequest(request.id)
  })

  it('INT-APPROV-08: should create notification', async () => {
    // 1. Créer une demande de test
    const request = await createTestMembershipRequest({
      status: 'pending',
      isPaid: true,
      matricule: '1234.MK.567890',
      identity: {
        firstName: 'Jean',
        lastName: 'Dupont',
      },
    })
    
    // 2. Appeler la Cloud Function
    const result = await approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
    
    // 3. Vérifier que la notification est créée
    const notificationsSnapshot = await testDb.collection('notifications')
      .where('entityId', '==', request.id)
      .where('type', '==', 'status_update')
      .get()
    
    expect(notificationsSnapshot.size).toBeGreaterThan(0)
    const notification = notificationsSnapshot.docs[0].data()
    expect(notification.metadata.status).toBe('approved')
    expect(notification.metadata.memberId).toBe(result.matricule)
    expect(notification.metadata.approvedBy).toBe('admin-1')
    expect(notification.title).toContain('approuvée')
    
    // 4. Nettoyer
    await testDb.collection('notifications').doc(notificationsSnapshot.docs[0].id).delete()
    await testDb.collection('users').doc(result.matricule).delete()
    await testAuth.deleteUser(result.matricule)
    await deleteTestMembershipRequest(request.id)
  })
})
```

---

## 🔗 3. Intégration Rollback

### 3.1 Rollback si création User échoue

**Tests** :
```typescript
it('INT-APPROV-09: should rollback if user creation fails', async () => {
  // 1. Créer une demande de test
  const request = await createTestMembershipRequest({
    status: 'pending',
    isPaid: true,
    matricule: '1234.MK.567890',
  })
  
  // 2. Mock pour faire échouer la création User
  const originalCreateUser = admin.auth().createUser
  vi.spyOn(admin.auth(), 'createUser').mockRejectedValue(new Error('Auth creation failed'))
  
  // 3. Appeler la Cloud Function (doit échouer)
  await expect(
    approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
  ).rejects.toThrow()
  
  // 4. Vérifier que rien n'a été créé
  const userDoc = await testDb.collection('users').doc('1234.MK.567890').get()
  expect(userDoc.exists).toBe(false)
  
  const subscriptionsSnapshot = await testDb.collection('subscriptions')
    .where('memberId', '==', '1234.MK.567890')
    .get()
  expect(subscriptionsSnapshot.size).toBe(0)
  
  // 5. Vérifier que le statut de la demande n'a pas changé
  const updatedRequest = await testDb.collection('membership-requests').doc(request.id).get()
  expect(updatedRequest.data()?.status).toBe('pending')
  
  // 6. Restaurer
  vi.restoreAllMocks()
  await deleteTestMembershipRequest(request.id)
})
```

---

### 3.2 Rollback si création Subscription échoue

**Tests** :
```typescript
it('INT-APPROV-10: should rollback if subscription creation fails', async () => {
  // 1. Créer une demande de test
  const request = await createTestMembershipRequest({
    status: 'pending',
    isPaid: true,
    matricule: '1234.MK.567890',
  })
  
  // 2. Mock pour faire échouer la création Subscription
  const originalAdd = testDb.collection('subscriptions').add
  vi.spyOn(testDb.collection('subscriptions'), 'add').mockRejectedValue(new Error('Subscription creation failed'))
  
  // 3. Appeler la Cloud Function (doit échouer)
  await expect(
    approveMembershipRequest({
      requestId: request.id,
      adminId: 'admin-1',
      membershipType: 'adherant',
      adhesionPdfURL: 'https://storage.googleapis.com/.../adhesion.pdf',
    })
  ).rejects.toThrow()
  
  // 4. Vérifier que le User créé est supprimé (rollback)
  const userDoc = await testDb.collection('users').doc('1234.MK.567890').get()
  expect(userDoc.exists).toBe(false)
  
  try {
    await testAuth.getUser('1234.MK.567890')
    fail('User should have been deleted')
  } catch (error: any) {
    expect(error.code).toBe('auth/user-not-found')
  }
  
  // 5. Restaurer
  vi.restoreAllMocks()
  await deleteTestMembershipRequest(request.id)
})
```

---

## 🔗 4. Intégration PDF Generator

### 4.1 Génération et téléchargement du PDF des identifiants

**Fichier** : `src/utils/__tests__/pdfGenerator.integration.test.ts`

**Tests** :
```typescript
describe('Integration: PDF Generator for Credentials', () => {
  it('INT-APPROV-11: should generate PDF with credentials', async () => {
    // 1. Générer le PDF
    const pdfBlob = await generateCredentialsPDF({
      firstName: 'Jean',
      lastName: 'Dupont',
      matricule: '1234.MK.567890',
      email: 'jeandupont1234@kara.ga',
      password: 'TempPass123!',
    })
    
    // 2. Vérifier que le PDF est généré
    expect(pdfBlob).toBeInstanceOf(Blob)
    expect(pdfBlob.type).toBe('application/pdf')
    expect(pdfBlob.size).toBeGreaterThan(0)
    
    // 3. Vérifier le contenu du PDF (parser le PDF)
    const pdfText = await extractTextFromPDF(pdfBlob)
    expect(pdfText).toContain('Jean Dupont')
    expect(pdfText).toContain('1234.MK.567890')
    expect(pdfText).toContain('jeandupont1234@kara.ga')
    expect(pdfText).toContain('TempPass123!')
  })

  it('INT-APPROV-12: should download PDF automatically', async () => {
    // 1. Mock window.URL.createObjectURL et window.URL.revokeObjectURL
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    
    // 2. Mock document.createElement et appendChild
    const linkElement = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(linkElement as any)
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')
    
    // 3. Générer et télécharger le PDF
    const pdfBlob = await generateCredentialsPDF({
      firstName: 'Jean',
      lastName: 'Dupont',
      matricule: '1234.MK.567890',
      email: 'jeandupont1234@kara.ga',
      password: 'TempPass123!',
    })
    
    downloadPDF(pdfBlob, 'Identifiants_Connexion_1234.MK.567890_2024-01-20.pdf')
    
    // 4. Vérifier que le téléchargement a été déclenché
    expect(createObjectURLSpy).toHaveBeenCalledWith(pdfBlob)
    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(linkElement.href).toBe('blob:test-url')
    expect(linkElement.download).toBe('Identifiants_Connexion_1234.MK.567890_2024-01-20.pdf')
    expect(linkElement.click).toHaveBeenCalled()
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url')
    
    // 5. Restaurer
    vi.restoreAllMocks()
  })
})
```

---

## 📊 Résumé des Tests d'Intégration

### Par Catégorie

- **Flow complet Admin** : 3 tests
- **Cloud Function** : 5 tests
- **Rollback** : 2 tests
- **PDF Generator** : 2 tests

**Total** : **12 tests d'intégration**

### Couverture

- ✅ Flow complet d'approbation
- ✅ Création entreprise/profession
- ✅ Création User, Subscription, Document
- ✅ Rollback en cas d'erreur
- ✅ Génération PDF identifiants

---

## 📖 Références

- **Cloud Function** : `../functions/IMPLEMENTATION.md`
- **Services** : `src/domains/memberships/services/`
- **Repositories** : `src/domains/memberships/repositories/`
