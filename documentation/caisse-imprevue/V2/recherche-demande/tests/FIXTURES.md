# Fixtures - Recherche des Demandes

> Données de test pour les tests de recherche avec `searchableText`.

## 📋 Vue d'ensemble

Les fixtures doivent inclure le champ `searchableText` pour tous les tests de recherche.

## 🔧 generateDemandSearchableText

```typescript
function generateDemandSearchableText(
  lastName: string,
  firstName: string,
  matricule: string
): string {
  return [lastName, firstName, matricule]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
```

## 📦 Fixtures de base

### createDemandFixture (avec searchableText)

```typescript
export function createDemandFixture(overrides?: Partial<CaisseImprevueDemand>) {
  const base = {
    id: `MK_DEMANDE_CI_${Date.now()}`,
    memberId: 'member-1',
    memberLastName: 'Dupont',
    memberFirstName: 'Jean',
    memberMatricule: '8438.MK.160126',
    memberEmail: 'jean.dupont@example.com',
    cause: 'Motif valide avec plus de 10 caractères',
    subscriptionCIID: 'sub-1',
    subscriptionCICode: 'CI-001',
    paymentFrequency: 'MONTHLY' as const,
    desiredStartDate: '2024-02-01',
    status: 'PENDING' as const,
    emergencyContact: {
      lastName: 'Martin',
      firstName: 'Marie',
      phone1: '+24165671734',
      relationship: 'Famille',
      typeId: 'CNI',
      idNumber: '123456789',
    },
    createdBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
  
  // Générer searchableText si non fourni
  if (!base.searchableText && (base.memberLastName || base.memberFirstName || base.memberMatricule)) {
    base.searchableText = generateDemandSearchableText(
      base.memberLastName || '',
      base.memberFirstName || '',
      base.memberMatricule || ''
    )
  }
  
  return base
}
```

### createTestDemand (E2E / intégration)

```typescript
export async function createTestDemand(overrides?: Partial<CreateCaisseImprevueDemandInput> & { searchableText?: string }) {
  const fixture = createDemandFixture(overrides as any)
  const memberMatricule = fixture.memberMatricule || '8438.MK.160126'
  
  return await DemandCIRepository.getInstance().create(
    { ...fixture, searchableText: undefined } as CreateCaisseImprevueDemandInput,
    memberMatricule
  )
}
```

## 📋 Scénarios de test

### Scénario 1 : Recherche par nom

```typescript
const demandDupont = createDemandFixture({
  memberLastName: 'Dupont',
  memberFirstName: 'Jean',
  memberMatricule: '8438.MK.160126',
  searchableText: 'dupont jean 8438.mk.160126',
})
```

### Scénario 2 : Recherche par prénom (préfixe)

```typescript
const demandDupontJean = createDemandFixture({
  memberLastName: 'Dupont',
  memberFirstName: 'Jean',
  searchableText: 'dupont jean 8438.mk.160126',
})
// Recherche "dupont jean" → matche
```

### Scénario 3 : Recherche avec accents

```typescript
const demandFrancois = createDemandFixture({
  memberLastName: 'François',
  memberFirstName: 'José',
  searchableText: 'francois jose 8438',
})
// Recherche "François" → normalisé "francois" → matche
```

### Scénario 4 : Recherche + statut

```typescript
const demandPending = createDemandFixture({
  memberLastName: 'Dupont',
  status: 'PENDING',
  searchableText: 'dupont jean 8438',
})
const demandApproved = createDemandFixture({
  memberLastName: 'Dupont',
  status: 'APPROVED',
  searchableText: 'dupont marie 9999',
})
// Tab En attente + recherche "Dupont" → 1 résultat (PENDING)
```

### Scénario 5 : Pagination

```typescript
async function createMultipleTestDemandsWithSearchableText(prefix: string, count: number) {
  const demands = []
  for (let i = 0; i < count; i++) {
    demands.push(await createTestDemand({
      memberLastName: 'Dupont',
      memberFirstName: `Jean${i}`,
      searchableText: `${prefix} jean${i} 8438`,
    }))
  }
  return demands
}
```

## ⚠️ Migration

Les demandes existantes n'ont pas `searchableText`. Pour les tests E2E sur des données réelles, exécuter le script de migration :

```bash
pnpm tsx scripts/migrate-demands-searchable-text.ts dev
```
