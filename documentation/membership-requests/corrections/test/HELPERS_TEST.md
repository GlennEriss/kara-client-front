# Helpers de Test - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document liste les helpers et fixtures nécessaires pour les tests de la fonctionnalité de correction.

---

## 🛠️ Helpers E2E

### 1. Fixtures

**Fichier :** `e2e/membership-requests-v2/fixtures/corrections.ts`

```typescript
import { MembershipRequest } from '@/types/types'

export interface CreateRequestWithCorrectionsOptions {
  status?: 'under_review'
  reviewNote?: string
  securityCode?: string
  securityCodeExpiry?: Date
  securityCodeUsed?: boolean
  processedBy?: string
  identity?: {
    contacts?: string[]
    firstName?: string
    [key: string]: any
  }
}

export async function createRequestWithCorrections(
  options: CreateRequestWithCorrectionsOptions = {}
): Promise<MembershipRequest> {
  const {
    status = 'under_review',
    reviewNote = 'Photo floue\nAdresse incomplète',
    securityCode = '123456',
    securityCodeExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000),
    securityCodeUsed = false,
    processedBy = 'admin-test-id',
    identity = {
      contacts: ['+24165671734'],
      firstName: 'Jean',
      lastName: 'Dupont',
    },
  } = options

  // Créer la demande via API ou Firestore directement
  const request = await createTestMembershipRequest({
    status,
    reviewNote,
    securityCode,
    securityCodeExpiry,
    securityCodeUsed,
    processedBy,
    identity,
  })

  return request
}

export async function deleteTestMembershipRequest(requestId: string): Promise<void> {
  // Supprimer la demande de test
  await deleteMembershipRequest(requestId)
}
```

---

### 2. Helpers de navigation

**Fichier :** `e2e/membership-requests-v2/helpers/corrections.ts`

```typescript
import { Page } from '@playwright/test'

export async function waitForCorrectionsModal(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="corrections-modal"]', { state: 'visible', timeout: 5000 })
}

export async function waitForCorrectionsBlock(page: Page, requestId: string): Promise<void> {
  const requestRow = page.locator(`[data-testid="membership-request-row-${requestId}"]`)
  await requestRow.locator('[data-testid="corrections-block"]').waitFor({ state: 'visible', timeout: 10000 })
}

export async function fillSecurityCode(page: Page, code: string): Promise<void> {
  for (let i = 0; i < 6; i++) {
    const input = page.locator(`[data-testid="security-code-input-${i}"]`)
    await input.fill(code[i])
  }
}

export async function openRequestCorrectionsModal(page: Page, requestId: string): Promise<void> {
  const requestRow = page.locator(`[data-testid="membership-request-row-${requestId}"]`)
  const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
  await menuButton.click()
  
  const requestCorrectionsMenu = page.locator('[data-testid="request-corrections-menu"]').first()
  await requestCorrectionsMenu.click()
  
  await waitForCorrectionsModal(page)
}

export async function submitCorrections(page: Page, corrections: string[]): Promise<void> {
  const textarea = page.locator('[data-testid="corrections-modal-textarea"]')
  await textarea.fill(corrections.join('\n'))
  
  const submitButton = page.locator('[data-testid="corrections-modal-submit-button"]')
  await expect(submitButton).toBeEnabled()
  await submitButton.click()
  
  // Attendre la fermeture du modal
  await page.waitForSelector('[data-testid="corrections-modal"]', { state: 'hidden', timeout: 10000 })
}
```

---

## 🧪 Helpers Unitaires

### 1. Mocks

**Fichier :** `src/domains/memberships/__tests__/helpers/mocks.ts`

```typescript
import { vi } from 'vitest'
import { MembershipRequest } from '@/types/types'

export function createMockMembershipRequest(
  overrides: Partial<MembershipRequest> = {}
): MembershipRequest {
  return {
    id: 'test-request-id',
    status: 'pending',
    identity: {
      firstName: 'Jean',
      lastName: 'Dupont',
      contacts: ['+24165671734'],
    },
    createdAt: new Date(),
    ...overrides,
  } as MembershipRequest
}

export function createMockAdmin(overrides: Partial<Admin> = {}): Admin {
  return {
    id: 'admin-test-id',
    firstName: 'Admin',
    lastName: 'Test',
    matricule: 'MAT-001',
    ...overrides,
  } as Admin
}
```

---

### 2. Setup/Teardown

**Fichier :** `src/domains/memberships/__tests__/helpers/setup.ts`

```typescript
import { beforeEach, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

export function setupTestEnvironment() {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup React components
    cleanup()
  })
}
```

---

## 📊 Helpers d'Assertion

**Fichier :** `src/domains/memberships/__tests__/helpers/assertions.ts`

```typescript
export function expectSecurityCodeFormat(code: string): void {
  expect(code).toMatch(/^\d{6}$/)
}

export function expectSecurityCodeFormatted(code: string): void {
  expect(code).toMatch(/^\d{2}-\d{2}-\d{2}$/)
}

export function expectTimeRemainingFormat(remaining: string): void {
  expect(remaining).toMatch(/^\d+j \d+h$/)
}

export function expectWhatsAppUrl(url: string, phoneNumber: string): void {
  expect(url).toContain('wa.me')
  expect(url).toContain(phoneNumber.replace(/\D/g, ''))
}
```

---

## ✅ Checklist

- [ ] Fixtures E2E créés (createRequestWithCorrections, deleteTestMembershipRequest)
- [ ] Helpers navigation E2E créés
- [ ] Mocks unitaires créés
- [ ] Setup/Teardown configurés
- [ ] Helpers d'assertion créés
- [ ] Documentation des helpers
