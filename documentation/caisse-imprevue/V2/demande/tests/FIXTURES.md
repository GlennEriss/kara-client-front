# Fixtures - Module Demandes Caisse Imprévue V2

> Données de test réutilisables pour les tests unitaires, d'intégration et E2E

## 📋 Vue d'ensemble

**Objectif** : Centraliser toutes les données de test (fixtures) pour garantir la cohérence et la réutilisabilité

**Structure** : `src/domains/financial/caisse-imprevue/__tests__/fixtures/`

---

## 🎯 Types de Fixtures

1. **Demandes** : `CaisseImprevueDemand` avec différents statuts
2. **Forfaits** : `SubscriptionCI` avec différentes configurations
3. **Membres** : `Member` pour les tests de sélection
4. **Contacts d'urgence** : `EmergencyContactCI` avec différentes configurations
5. **Contrats** : `ContractCI` pour les tests de conversion

---

## 📁 Structure des Fichiers

```
__tests__/fixtures/
├── demands.ts              # Fixtures pour les demandes
├── subscriptions.ts        # Fixtures pour les forfaits
├── members.ts              # Fixtures pour les membres
├── emergency-contacts.ts    # Fixtures pour les contacts d'urgence
├── contracts.ts            # Fixtures pour les contrats
├── helpers.ts              # Helpers pour créer des fixtures
└── index.ts                # Export centralisé
```

---

## 🧪 1. Fixtures de Demandes (`demands.ts`)

### 1.1 Demande Basique

```typescript
import { CaisseImprevueDemand } from '@/types/types'
import { Timestamp } from 'firebase/firestore'

export function createDemandFixture(
  overrides?: Partial<CaisseImprevueDemand>
): CaisseImprevueDemand {
  const now = new Date()
  
  return {
    id: `MK_DEMANDE_CI_TEST_${Date.now()}`,
    
    // Informations du demandeur
    memberId: 'member-test-1',
    memberFirstName: 'Jean',
    memberLastName: 'Dupont',
    memberContacts: ['+24165671734'],
    memberEmail: 'jean.dupont@test.com',
    
    // Informations du forfait
    subscriptionCIID: 'sub-ci-test-1',
    subscriptionCICode: 'CI_MONTHLY_10000',
    subscriptionCILabel: 'Forfait Mensuel 10 000 FCFA',
    subscriptionCIAmountPerMonth: 10000,
    subscriptionCINominal: 120000,
    subscriptionCIDuration: 12,
    subscriptionCISupportMin: 50000,
    subscriptionCISupportMax: 100000,
    
    // Fréquence et dates
    paymentFrequency: 'MONTHLY',
    desiredDate: '2024-02-01',
    
    // Contact d'urgence
    emergencyContact: {
      lastName: 'Martin',
      firstName: 'Marie',
      phone1: '+24165671735',
      phone2: '+24165671736',
      relationship: 'Famille',
      typeId: 'CNI',
      idNumber: '123456789',
      documentPhotoUrl: 'https://example.com/id-photo.jpg'
    },
    
    // Motif
    cause: 'Motif de test valide avec plus de 10 caractères minimum requis pour la validation',
    
    // Statut
    status: 'PENDING',
    
    // Métadonnées
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin-test-1',
    
    ...overrides
  }
}
```

### 1.2 Demande avec Statut Spécifique

```typescript
export function createPendingDemand(
  overrides?: Partial<CaisseImprevueDemand>
): CaisseImprevueDemand {
  return createDemandFixture({
    status: 'PENDING',
    ...overrides
  })
}

export function createApprovedDemand(
  overrides?: Partial<CaisseImprevueDemand>
): CaisseImprevueDemand {
  const now = new Date()
  
  return createDemandFixture({
    status: 'APPROVED',
    decisionMadeAt: now,
    decisionMadeBy: 'admin-test-1',
    decisionMadeByName: 'Admin Test',
    decisionReason: 'Raison d\'acceptation valide avec plus de 10 caractères',
    ...overrides
  })
}

export function createRejectedDemand(
  overrides?: Partial<CaisseImprevueDemand>
): CaisseImprevueDemand {
  const now = new Date()
  
  return createDemandFixture({
    status: 'REJECTED',
    decisionMadeAt: now,
    decisionMadeBy: 'admin-test-1',
    decisionMadeByName: 'Admin Test',
    decisionReason: 'Raison de refus valide avec plus de 10 caractères',
    ...overrides
  })
}

export function createReopenedDemand(
  overrides?: Partial<CaisseImprevueDemand>
): CaisseImprevueDemand {
  const now = new Date()
  
  return createDemandFixture({
    status: 'REOPENED',
    previousStatus: 'REJECTED',
    reopenedAt: now,
    reopenedBy: 'admin-test-1',
    reopenedByName: 'Admin Test',
    reopenReason: 'Raison de réouverture valide avec plus de 10 caractères',
    ...overrides
  })
}

export function createConvertedDemand(
  overrides?: Partial<CaisseImprevueDemand>
): CaisseImprevueDemand {
  return createApprovedDemand({
    status: 'CONVERTED',
    contractId: 'contract-test-1',
    convertedDate: new Date(),
    ...overrides
  })
}
```

### 1.3 Demande avec Fréquence Journalière

```typescript
export function createDailyDemand(
  overrides?: Partial<CaisseImprevueDemand>
): CaisseImprevueDemand {
  return createDemandFixture({
    paymentFrequency: 'DAILY',
    subscriptionCIDuration: 30, // 30 jours
    ...overrides
  })
}
```

### 1.4 Demande avec Motif Long

```typescript
export function createDemandWithLongCause(
  overrides?: Partial<CaisseImprevueDemand>
): CaisseImprevueDemand {
  return createDemandFixture({
    cause: 'A'.repeat(500), // Maximum 500 caractères
    ...overrides
  })
}
```

### 1.5 Demande avec Contact Membre

```typescript
export function createDemandWithMemberContact(
  overrides?: Partial<CaisseImprevueDemand>
): CaisseImprevueDemand {
  return createDemandFixture({
    emergencyContact: {
      lastName: 'Contact',
      firstName: 'Test',
      phone1: '+24165671737',
      relationship: 'Ami(e)',
      typeId: 'Passeport',
      idNumber: '987654321',
      memberId: 'member-contact-1' // Contact est un membre
    },
    ...overrides
  })
}
```

### 1.6 Helper pour Créer Plusieurs Demandes

```typescript
export async function createMultipleTestDemands(
  count: number,
  options?: {
    status?: CaisseImprevueDemandStatus
    startDate?: Date
  }
): Promise<CaisseImprevueDemand[]> {
  const demands: CaisseImprevueDemand[] = []
  const startDate = options?.startDate || new Date()
  
  for (let i = 0; i < count; i++) {
    const demand = createDemandFixture({
      status: options?.status || 'PENDING',
      createdAt: new Date(startDate.getTime() + i * 86400000), // +1 jour par demande
      memberLastName: `Member${i}`,
      memberFirstName: `Test${i}`
    })
    
    // Sauvegarder dans Firestore (mock ou réel selon le contexte)
    demands.push(demand)
  }
  
  return demands
}

export async function createTestDemands(options: {
  pending?: number
  approved?: number
  rejected?: number
  reopened?: number
}): Promise<{
  pending: CaisseImprevueDemand[]
  approved: CaisseImprevueDemand[]
  rejected: CaisseImprevueDemand[]
  reopened: CaisseImprevueDemand[]
}> {
  const result = {
    pending: [] as CaisseImprevueDemand[],
    approved: [] as CaisseImprevueDemand[],
    rejected: [] as CaisseImprevueDemand[],
    reopened: [] as CaisseImprevueDemand[]
  }
  
  if (options.pending) {
    result.pending = await createMultipleTestDemands(options.pending, { status: 'PENDING' })
  }
  
  if (options.approved) {
    result.approved = await createMultipleTestDemands(options.approved, { status: 'APPROVED' })
  }
  
  if (options.rejected) {
    result.rejected = await createMultipleTestDemands(options.rejected, { status: 'REJECTED' })
  }
  
  if (options.reopened) {
    result.reopened = await createMultipleTestDemands(options.reopened, { status: 'REOPENED' })
  }
  
  return result
}
```

---

## 🧪 2. Fixtures de Forfaits (`subscriptions.ts`)

### 2.1 Forfait Basique

```typescript
import { SubscriptionCI } from '@/types/types'

export function createSubscriptionCIFixture(
  overrides?: Partial<SubscriptionCI>
): SubscriptionCI {
  const now = new Date()
  
  return {
    id: `sub-ci-test-${Date.now()}`,
    code: 'CI_MONTHLY_10000',
    label: 'Forfait Mensuel 10 000 FCFA',
    amountPerMonth: 10000,
    nominal: 120000,
    durationInMonths: 12,
    penaltyRate: 0.5,
    penaltyDelayDays: 3,
    supportMin: 50000,
    supportMax: 100000,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin-test-1',
    ...overrides
  }
}
```

### 2.2 Forfaits Prédéfinis

```typescript
export function createForfaitA(): SubscriptionCI {
  return createSubscriptionCIFixture({
    code: 'CI_FORFAIT_A',
    label: 'Forfait A',
    amountPerMonth: 5000,
    nominal: 60000,
    durationInMonths: 12,
    supportMin: 25000,
    supportMax: 50000
  })
}

export function createForfaitB(): SubscriptionCI {
  return createSubscriptionCIFixture({
    code: 'CI_FORFAIT_B',
    label: 'Forfait B',
    amountPerMonth: 10000,
    nominal: 120000,
    durationInMonths: 12,
    supportMin: 50000,
    supportMax: 100000
  })
}

export function createForfaitC(): SubscriptionCI {
  return createSubscriptionCIFixture({
    code: 'CI_FORFAIT_C',
    label: 'Forfait C',
    amountPerMonth: 15000,
    nominal: 180000,
    durationInMonths: 12,
    supportMin: 75000,
    supportMax: 150000
  })
}

export function createForfaitD(): SubscriptionCI {
  return createSubscriptionCIFixture({
    code: 'CI_FORFAIT_D',
    label: 'Forfait D',
    amountPerMonth: 20000,
    nominal: 240000,
    durationInMonths: 12,
    supportMin: 100000,
    supportMax: 200000
  })
}

export function createForfaitE(): SubscriptionCI {
  return createSubscriptionCIFixture({
    code: 'CI_FORFAIT_E',
    label: 'Forfait E',
    amountPerMonth: 25000,
    nominal: 300000,
    durationInMonths: 12,
    supportMin: 125000,
    supportMax: 250000
  })
}
```

### 2.3 Forfait Inactif

```typescript
export function createInactiveSubscriptionCI(
  overrides?: Partial<SubscriptionCI>
): SubscriptionCI {
  return createSubscriptionCIFixture({
    status: 'INACTIVE',
    ...overrides
  })
}
```

### 2.4 Helper pour Créer Plusieurs Forfaits

```typescript
export async function createTestSubscriptions(
  count: number,
  options?: {
    status?: 'ACTIVE' | 'INACTIVE'
  }
): Promise<SubscriptionCI[]> {
  const subscriptions: SubscriptionCI[] = []
  
  for (let i = 0; i < count; i++) {
    const subscription = createSubscriptionCIFixture({
      code: `CI_TEST_${i}`,
      label: `Forfait Test ${i}`,
      amountPerMonth: 10000 + (i * 1000),
      status: options?.status || 'ACTIVE'
    })
    
    subscriptions.push(subscription)
  }
  
  return subscriptions
}
```

---

## 🧪 3. Fixtures de Membres (`members.ts`)

### 3.1 Membre Basique

```typescript
import { Member } from '@/types/types'

export function createMemberFixture(
  overrides?: Partial<Member>
): Member {
  const now = new Date()
  
  return {
    id: `member-test-${Date.now()}`,
    firstName: 'Jean',
    lastName: 'Dupont',
    matricule: `MAT${Date.now()}`,
    email: 'jean.dupont@test.com',
    phone: '+24165671734',
    contacts: ['+24165671734'],
    gender: 'M',
    birthDate: '1990-01-01',
    nationality: 'Gabonaise',
    address: 'Libreville, Gabon',
    profession: 'Ingénieur',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}
```

### 3.2 Membres Prédéfinis

```typescript
export function createMemberDupont(): Member {
  return createMemberFixture({
    firstName: 'Jean',
    lastName: 'Dupont',
    matricule: 'MAT001',
    email: 'jean.dupont@test.com',
    phone: '+24165671734'
  })
}

export function createMemberMartin(): Member {
  return createMemberFixture({
    firstName: 'Pierre',
    lastName: 'Martin',
    matricule: 'MAT002',
    email: 'pierre.martin@test.com',
    phone: '+24165671735'
  })
}

export function createMemberZulu(): Member {
  return createMemberFixture({
    firstName: 'Alpha',
    lastName: 'Zulu',
    matricule: 'MAT003',
    email: 'alpha.zulu@test.com',
    phone: '+24165671736'
  })
}
```

---

## 🧪 4. Fixtures de Contacts d'Urgence (`emergency-contacts.ts`)

### 4.1 Contact d'Urgence Basique

```typescript
import { EmergencyContactCI } from '@/types/types'

export function createEmergencyContactFixture(
  overrides?: Partial<EmergencyContactCI>
): EmergencyContactCI {
  return {
    lastName: 'Martin',
    firstName: 'Marie',
    phone1: '+24165671735',
    phone2: '+24165671736',
    relationship: 'Famille',
    typeId: 'CNI',
    idNumber: '123456789',
    documentPhotoUrl: 'https://example.com/id-photo.jpg',
    ...overrides
  }
}
```

### 4.2 Contacts Prédéfinis

```typescript
export function createFamilyContact(): EmergencyContactCI {
  return createEmergencyContactFixture({
    lastName: 'Dupont',
    firstName: 'Sophie',
    relationship: 'Famille',
    phone1: '+24165671740'
  })
}

export function createFriendContact(): EmergencyContactCI {
  return createEmergencyContactFixture({
    lastName: 'Martin',
    firstName: 'Paul',
    relationship: 'Ami(e)',
    phone1: '+24165671741'
  })
}

export function createMemberContact(memberId: string): EmergencyContactCI {
  return createEmergencyContactFixture({
    lastName: 'Contact',
    firstName: 'Member',
    relationship: 'Membre',
    memberId: memberId
  })
}
```

---

## 🧪 5. Fixtures de Contrats (`contracts.ts`)

### 5.1 Contrat Basique

```typescript
import { ContractCI } from '@/types/types'

export function createContractCIFixture(
  overrides?: Partial<ContractCI>
): ContractCI {
  const now = new Date()
  
  return {
    id: `contract-ci-test-${Date.now()}`,
    memberId: 'member-test-1',
    memberFirstName: 'Jean',
    memberLastName: 'Dupont',
    memberContacts: ['+24165671734'],
    memberEmail: 'jean.dupont@test.com',
    subscriptionCIID: 'sub-ci-test-1',
    subscriptionCICode: 'CI_MONTHLY_10000',
    subscriptionCIAmountPerMonth: 10000,
    subscriptionCINominal: 120000,
    subscriptionCIDuration: 12,
    paymentFrequency: 'MONTHLY',
    firstPaymentDate: '2024-02-01',
    emergencyContact: createEmergencyContactFixture(),
    status: 'ACTIVE',
    supportHistory: [],
    totalMonthsPaid: 0,
    isEligibleForSupport: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'admin-test-1',
    updatedBy: 'admin-test-1',
    ...overrides
  }
}
```

---

## 🧪 6. Helpers Généraux (`helpers.ts`)

### 6.1 Helpers de Création dans Firestore

```typescript
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getFirestore 
} from 'firebase/firestore'

export async function createTestDemand(
  overrides?: Partial<CaisseImprevueDemand>
): Promise<CaisseImprevueDemand> {
  const demand = createDemandFixture(overrides)
  const db = getFirestore()
  
  await setDoc(
    doc(db, 'caisseImprevueDemands', demand.id),
    {
      ...demand,
      createdAt: Timestamp.fromDate(demand.createdAt),
      updatedAt: Timestamp.fromDate(demand.updatedAt)
    }
  )
  
  return demand
}

export async function deleteTestDemand(demandId: string): Promise<void> {
  const db = getFirestore()
  await deleteDoc(doc(db, 'caisseImprevueDemands', demandId))
}

export async function deleteAllTestDemands(): Promise<void> {
  const db = getFirestore()
  const demandsRef = collection(db, 'caisseImprevueDemands')
  const snapshot = await getDocs(demandsRef)
  
  const deletePromises = snapshot.docs
    .filter(doc => doc.id.startsWith('MK_DEMANDE_CI_TEST_'))
    .map(doc => deleteDoc(doc.ref))
  
  await Promise.all(deletePromises)
}

export async function createTestSubscriptionCI(
  overrides?: Partial<SubscriptionCI>
): Promise<SubscriptionCI> {
  const subscription = createSubscriptionCIFixture(overrides)
  const db = getFirestore()
  
  await setDoc(
    doc(db, 'subscriptionsCI', subscription.id),
    {
      ...subscription,
      createdAt: Timestamp.fromDate(subscription.createdAt),
      updatedAt: Timestamp.fromDate(subscription.updatedAt)
    }
  )
  
  return subscription
}

export async function createTestMember(
  overrides?: Partial<Member>
): Promise<Member> {
  const member = createMemberFixture(overrides)
  const db = getFirestore()
  
  await setDoc(
    doc(db, 'members', member.id),
    {
      ...member,
      createdAt: Timestamp.fromDate(member.createdAt),
      updatedAt: Timestamp.fromDate(member.updatedAt)
    }
  )
  
  return member
}
```

### 6.2 Helpers de Nettoyage

```typescript
export async function cleanupTestData(): Promise<void> {
  await deleteAllTestDemands()
  // Ajouter d'autres nettoyages si nécessaire
}

// Utilisation dans les tests
afterEach(async () => {
  await cleanupTestData()
})
```

---

## 📊 Export Centralisé (`index.ts`)

```typescript
// Demands
export * from './demands'

// Subscriptions
export * from './subscriptions'

// Members
export * from './members'

// Emergency Contacts
export * from './emergency-contacts'

// Contracts
export * from './contracts'

// Helpers
export * from './helpers'
```

---

## ✅ Checklist d'Implémentation

- [ ] Créer le dossier `__tests__/fixtures/`
- [ ] Implémenter `demands.ts` avec toutes les variantes
- [ ] Implémenter `subscriptions.ts` avec tous les forfaits
- [ ] Implémenter `members.ts` avec les membres de test
- [ ] Implémenter `emergency-contacts.ts` avec les contacts
- [ ] Implémenter `contracts.ts` avec les contrats
- [ ] Implémenter `helpers.ts` pour Firestore
- [ ] Créer `index.ts` pour les exports
- [ ] Documenter l'utilisation dans les tests
- [ ] Vérifier que toutes les fixtures sont utilisées

---

## 📚 Utilisation dans les Tests

### Exemple : Test Unitaire

```typescript
import { createDemandFixture, createPendingDemand } from '@/__tests__/fixtures'

describe('DemandCIRepository', () => {
  it('should create demand', async () => {
    const demandData = createDemandFixture()
    const result = await repository.create(demandData)
    expect(result).toBeDefined()
  })
})
```

### Exemple : Test d'Intégration

```typescript
import { createTestDemand, createTestMember } from '@/__tests__/fixtures'

describe('CaisseImprevueService', () => {
  it('should create demand', async () => {
    const member = await createTestMember()
    const demand = await createTestDemand({ memberId: member.id })
    expect(demand.memberId).toBe(member.id)
  })
})
```

### Exemple : Test E2E

```typescript
import { createTestDemand, deleteTestDemand } from '@/__tests__/fixtures'

test('should display demand', async ({ page }) => {
  const demand = await createTestDemand()
  
  await page.goto(`/caisse-imprevue/demandes/${demand.id}`)
  await expect(page.locator('[data-testid="ci-demand-detail-title"]')).toBeVisible()
  
  await deleteTestDemand(demand.id)
})
```

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior QA
