# Mocks et Fixtures - Step2 Adresse

## 📋 Vue d'ensemble

Documentation des mocks et fixtures nécessaires pour les tests de Step2 Adresse.

## 🛠️ Mocks nécessaires

### 1. React Query

```typescript
// src/domains/memberships/__tests__/setup/test-utils.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0
      }
    }
  })
}

export function TestWrapper({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 2. Hooks géographie

```typescript
// src/domains/memberships/__tests__/mocks/geographyMocks.ts

import { vi } from 'vitest'
import type { Province, Department, Commune, District, Quarter } from '@/domains/infrastructure/geography/entities/geography.types'

export const mockProvinces: Province[] = [
  { id: 'province-1', name: 'Estuaire', code: 'EST', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' },
  { id: 'province-2', name: 'Haut-Ogooué', code: 'HOG', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' }
]

export const mockDepartments: Department[] = [
  { id: 'dept-1', name: 'Libreville', code: 'LBV', provinceId: 'province-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' },
  { id: 'dept-2', name: 'Ntoum', code: 'NTO', provinceId: 'province-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' },
  { id: 'dept-3', name: 'Franceville', code: 'FRV', provinceId: 'province-2', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' }
]

export const mockCommunes: Commune[] = [
  { id: 'commune-1', name: 'Libreville', departmentId: 'dept-1', postalCode: '24100', alias: 'LBV', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' },
  { id: 'commune-2', name: 'Port-Gentil', departmentId: 'dept-1', postalCode: '24101', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' },
  { id: 'commune-3', name: 'Ntoum', departmentId: 'dept-2', postalCode: '24102', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' }
]

export const mockDistricts: District[] = [
  { id: 'district-1', name: 'Akanda', communeId: 'commune-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' },
  { id: 'district-2', name: 'Owendo', communeId: 'commune-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' }
]

export const mockQuarters: Quarter[] = [
  { id: 'quarter-1', name: 'Akanda Centre', districtId: 'district-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' },
  { id: 'quarter-2', name: 'Akanda Sud', districtId: 'district-1', createdAt: new Date(), updatedAt: new Date(), createdBy: 'user-1' }
]

// Mock des hooks
export const mockUseProvinces = vi.fn(() => ({
  data: mockProvinces,
  isLoading: false,
  isError: false
}))

export const mockUseDepartments = vi.fn((provinceId?: string) => ({
  data: provinceId 
    ? mockDepartments.filter(d => d.provinceId === provinceId)
    : mockDepartments,
  isLoading: false,
  isError: false
}))

export const mockUseDistricts = vi.fn((communeId?: string) => ({
  data: communeId
    ? mockDistricts.filter(d => d.communeId === communeId)
    : mockDistricts,
  isLoading: false,
  isError: false
}))

export const mockUseQuarters = vi.fn((districtId?: string) => ({
  data: districtId
    ? mockQuarters.filter(q => q.districtId === districtId)
    : mockQuarters,
  isLoading: false,
  isError: false
}))
```

### 3. ServiceFactory

```typescript
// src/domains/memberships/__tests__/mocks/serviceFactoryMocks.ts

import { vi } from 'vitest'
import type { Commune } from '@/domains/infrastructure/geography/entities/geography.types'

export const mockGeographieService = {
  getCommunesByDepartmentId: vi.fn((departmentId: string) => {
    return Promise.resolve(
      mockCommunes.filter(c => c.departmentId === departmentId)
    )
  }),
  getDistrictsByCommuneId: vi.fn((communeId: string) => {
    return Promise.resolve(
      mockDistricts.filter(d => d.communeId === communeId)
    )
  }),
  getQuartersByDistrictId: vi.fn((districtId: string) => {
    return Promise.resolve(
      mockQuarters.filter(q => q.districtId === districtId)
    )
  })
}

vi.mock('@/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getGeographieService: vi.fn(() => mockGeographieService)
  }
}))
```

### 4. useIsAdminContext

```typescript
// src/domains/memberships/__tests__/mocks/adminContextMocks.ts

import { vi } from 'vitest'

export const mockUseIsAdminContext = vi.fn(() => false)

vi.mock('@/hooks/useIsAdminContext', () => ({
  useIsAdminContext: mockUseIsAdminContext
}))
```

### 5. Toast (sonner)

```typescript
// src/domains/memberships/__tests__/mocks/toastMocks.ts

import { vi } from 'vitest'

export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
}

vi.mock('sonner', () => ({
  toast: mockToast
}))
```

### 6. Modals

```typescript
// src/domains/memberships/__tests__/mocks/modalMocks.tsx

import { vi } from 'vitest'
import type { Commune } from '@/domains/infrastructure/geography/entities/geography.types'

export const MockAddCommuneModal = ({ 
  open, 
  onSuccess, 
  onClose 
}: { 
  open: boolean
  onSuccess: (commune: Commune) => void
  onClose: () => void
}) => {
  if (!open) return null
  
  const handleSubmit = () => {
    onSuccess({
      id: 'commune-new',
      name: 'Nouvelle Ville',
      departmentId: 'dept-1',
      postalCode: '24100',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1'
    })
    onClose()
  }
  
  return (
    <div data-testid="step2-address-modal-commune">
      <button onClick={handleSubmit} data-testid="step2-address-modal-commune-submit-button">
        Créer
      </button>
      <button onClick={onClose} data-testid="step2-address-modal-commune-close-button">
        Annuler
      </button>
    </div>
  )
}

vi.mock('@/domains/infrastructure/geography/components/modals/AddCommuneModal', () => ({
  default: MockAddCommuneModal
}))
```

## 📦 Fixtures

### Fixtures de données

```typescript
// src/domains/memberships/__tests__/fixtures/addressFixtures.ts

import type { Province, Commune, District, Quarter } from '@/domains/infrastructure/geography/entities/geography.types'

export function createProvinceFixture(overrides: Partial<Province> = {}): Province {
  return {
    id: 'province-1',
    name: 'Estuaire',
    code: 'EST',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    ...overrides
  }
}

export function createCommuneFixture(overrides: Partial<Commune> = {}): Commune {
  return {
    id: 'commune-1',
    name: 'Libreville',
    departmentId: 'dept-1',
    postalCode: '24100',
    alias: 'LBV',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    ...overrides
  }
}

export function createDistrictFixture(overrides: Partial<District> = {}): District {
  return {
    id: 'district-1',
    name: 'Akanda',
    communeId: 'commune-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    ...overrides
  }
}

export function createQuarterFixture(overrides: Partial<Quarter> = {}): Quarter {
  return {
    id: 'quarter-1',
    name: 'Akanda Centre',
    districtId: 'district-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    ...overrides
  }
}
```

### Fixtures de formulaire

```typescript
// src/domains/memberships/__tests__/fixtures/formFixtures.ts

import { useForm } from 'react-hook-form'
import type { RegisterFormData } from '@/schemas/schemas'

export function createStep2FormFixture(initialValues: Partial<RegisterFormData> = {}) {
  return useForm<RegisterFormData>({
    defaultValues: {
      address: {
        provinceId: '',
        communeId: '',
        districtId: '',
        quarterId: '',
        province: '',
        city: '',
        arrondissement: '',
        district: '',
        additionalInfo: '',
        ...initialValues.address
      },
      ...initialValues
    }
  })
}
```

## 🔧 Helpers de test

```typescript
// src/domains/memberships/__tests__/helpers/addressTestHelpers.ts

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'

export async function selectProvince(user: UserEvent, provinceName: string) {
  await user.click(screen.getByTestId('step2-address-province-trigger'))
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-province-results')).toBeInTheDocument()
  })
  await user.click(screen.getByText(provinceName))
}

export async function selectCommune(user: UserEvent, communeName: string) {
  await user.click(screen.getByTestId('step2-address-commune-trigger'))
  await waitFor(() => {
    expect(screen.getByTestId('step2-address-commune-results')).toBeInTheDocument()
  })
  await user.click(screen.getByText(communeName))
}

export async function selectFullCascade(
  user: UserEvent,
  form: any
) {
  await selectProvince(user, 'Estuaire')
  await waitFor(() => {
    expect(form.getValues('address.provinceId')).toBeTruthy()
  })
  
  await selectCommune(user, 'Libreville')
  await waitFor(() => {
    expect(form.getValues('address.communeId')).toBeTruthy()
  })
  
  await user.click(screen.getByTestId('step2-address-district-trigger'))
  await user.click(screen.getByText('Akanda'))
  await waitFor(() => {
    expect(form.getValues('address.districtId')).toBeTruthy()
  })
  
  await user.click(screen.getByTestId('step2-address-quarter-trigger'))
  await user.click(screen.getByText('Akanda Centre'))
  await waitFor(() => {
    expect(form.getValues('address.quarterId')).toBeTruthy()
  })
}
```

## 📚 Utilisation dans les tests

```typescript
// Exemple d'utilisation

import { render, screen } from '@testing-library/react'
import { TestWrapper } from '../setup/test-utils'
import { mockUseProvinces, mockUseDepartments } from '../mocks/geographyMocks'
import { createCommuneFixture } from '../fixtures/addressFixtures'
import Step2 from '@/components/register/Step2'

describe('Step2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseProvinces.mockReturnValue({
      data: mockProvinces,
      isLoading: false
    })
  })
  
  it('devrait fonctionner', () => {
    render(<Step2 form={form} />, { wrapper: TestWrapper })
    // ...
  })
})
```
