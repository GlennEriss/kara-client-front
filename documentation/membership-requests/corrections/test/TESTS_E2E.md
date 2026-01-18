# Tests E2E - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document liste tous les cas de tests E2E pour la fonctionnalité de correction, avec les `data-testid` nécessaires.

**⚠️ IMPORTANT :** Les tests E2E doivent utiliser les **Cloud Functions** déployées en production ou les émulateurs Firebase. Les appels aux Cloud Functions (`verifySecurityCode` et `submitCorrections`) sont testés de bout en bout.

---

## 🎭 1. Tests E2E Admin

### 1.1 Demander des corrections

**Fichier :** `e2e/membership-requests-v2/request-corrections.spec.ts`

**Tests :**
```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin, goToMembershipRequestsV2, waitForRequestsList } from './helpers'
import { createPendingUnpaidRequest, deleteTestMembershipRequest } from './fixtures'

test.describe('E2E: Demander des Corrections (Admin)', () => {
  const createdRequests: string[] = []

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await goToMembershipRequestsV2(page)
    await waitForRequestsList(page)
  })

  test.afterEach(async () => {
    await Promise.all(createdRequests.map(id => deleteTestMembershipRequest(id)))
    createdRequests.length = 0
  })

  test('P0-CORR-01: devrait demander des corrections pour une demande en attente', async ({ page }) => {
    test.setTimeout(120000)

    // 1. Créer une demande en pending
    const request = await createPendingUnpaidRequest()
    createdRequests.push(request.id)

    // 2. Attendre que la demande apparaisse dans la liste
    await page.reload()
    await waitForRequestsList(page)
    
    const requestRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
    await expect(requestRow).toBeVisible({ timeout: 10000 })

    // 3. Ouvrir le dropdown "⋮"
    const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
    await menuButton.click()

    // 4. Cliquer sur "Demander des corrections"
    const requestCorrectionsMenu = page.locator('[data-testid="request-corrections-menu"]').first()
    await expect(requestCorrectionsMenu).toBeVisible()
    await requestCorrectionsMenu.click()

    // 5. Vérifier que le modal s'ouvre
    const modal = page.locator('[data-testid="corrections-modal"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="corrections-modal-title"]')).toHaveText('Demander des corrections')

    // 6. Saisir les corrections
    const textarea = page.locator('[data-testid="corrections-modal-textarea"]')
    await textarea.fill('Photo floue\nAdresse incomplète\nSignature manquante')

    // 7. Vérifier le compteur
    const counter = page.locator('[data-testid="corrections-modal-counter"]')
    await expect(counter).toContainText('3 correction(s)')

    // 8. Vérifier que le bouton est actif
    const submitButton = page.locator('[data-testid="corrections-modal-submit-button"]')
    await expect(submitButton).toBeEnabled()

    // 9. Soumettre
    await submitButton.click()

    // 10. Vérifier que le modal se ferme
    await expect(modal).not.toBeVisible({ timeout: 10000 })

    // 11. Vérifier le toast de succès
    await expect(page.locator('text=Corrections demandées')).toBeVisible({ timeout: 5000 })

    // 12. Vérifier que le badge change en "En correction"
    await page.reload()
    await waitForRequestsList(page)
    
    const updatedRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
    const badge = updatedRow.locator('[data-testid="status-under-review-badge"]')
    await expect(badge).toBeVisible({ timeout: 10000 })
    await expect(badge).toContainText('En correction')

    // 13. Vérifier que le bloc "Corrections demandées" apparaît
    const correctionsBlock = updatedRow.locator('[data-testid="corrections-block"]')
    await expect(correctionsBlock).toBeVisible()
    await expect(correctionsBlock.locator('[data-testid="corrections-block-title"]')).toContainText('Corrections demandées')
    
    // 14. Vérifier les corrections affichées
    await expect(correctionsBlock.locator('[data-testid="correction-item-0"]')).toContainText('Photo floue')
    await expect(correctionsBlock.locator('[data-testid="correction-item-1"]')).toContainText('Adresse incomplète')
    await expect(correctionsBlock.locator('[data-testid="correction-item-2"]')).toContainText('Signature manquante')

    // 15. Vérifier le code affiché (format AB12-CD34)
    const codeValue = correctionsBlock.locator('[data-testid="corrections-block-code-value"]')
    await expect(codeValue).toBeVisible()
    const codeText = await codeValue.textContent()
    expect(codeText).toMatch(/^\d{2}-\d{2}-\d{2}$/) // Format AB12-CD34

    // 16. Vérifier l'expiration avec date et temps restant
    const expiryValue = correctionsBlock.locator('[data-testid="corrections-block-expiry-value"]')
    await expect(expiryValue).toBeVisible()
    const expiryText = await expiryValue.textContent()
    expect(expiryText).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/) // Format "18/01/2026 22:10"
    
    const expiryRemaining = correctionsBlock.locator('[data-testid="corrections-block-expiry-remaining"]')
    await expect(expiryRemaining).toBeVisible()
    const remainingText = await expiryRemaining.textContent()
    expect(remainingText).toMatch(/\(reste \d+j \d+h\)/) // Format "(reste 2j 13h)"

    // 17. Vérifier "Demandé par" avec nom et matricule
    const requestedByValue = correctionsBlock.locator('[data-testid="corrections-block-requested-by-value"]')
    await expect(requestedByValue).toBeVisible()
    const requestedByText = await requestedByValue.textContent()
    expect(requestedByText).toBeTruthy() // Nom de l'admin
    
    const requestedByMatricule = correctionsBlock.locator('[data-testid="corrections-block-requested-by-matricule"]')
    await expect(requestedByMatricule).toBeVisible()
    const matriculeText = await requestedByMatricule.textContent()
    expect(matriculeText).toMatch(/\(MAT-\d+\)/) // Format "(MAT-001)"

    // 18. Vérifier que les actions restent accessibles (Détails, Fiche, Pièce)
    const menuButtonAfter = updatedRow.locator('[data-testid="action-menu"]').first()
    await menuButtonAfter.click()
    
    // Vérifier que "Voir les détails" est toujours visible
    const viewDetailsMenu = page.locator('text=Voir les détails').first()
    await expect(viewDetailsMenu).toBeVisible()
    
    // Vérifier que "Fiche d'adhésion" est toujours visible
    const membershipFormMenu = page.locator('text=Fiche d\'adhésion').first()
    await expect(membershipFormMenu).toBeVisible()
    
    // Vérifier que "Pièce d'identité" est toujours visible
    const idDocumentMenu = page.locator('text=Voir pièce d\'identité').first()
    await expect(idDocumentMenu).toBeVisible()
  })

  test('P0-CORR-02: devrait afficher "Demander des corrections" uniquement si status=pending', async ({ page }) => {
    // 1. Créer une demande en pending
    const pendingRequest = await createPendingUnpaidRequest()
    createdRequests.push(pendingRequest.id)

    // 2. Créer une demande en under_review
    const underReviewRequest = await createRequestWithCorrections()
    createdRequests.push(underReviewRequest.id)

    await page.reload()
    await waitForRequestsList(page)

    // 3. Vérifier que "Demander des corrections" est visible pour pending
    const pendingRow = page.locator(`[data-testid="membership-request-row-${pendingRequest.id}"]`)
    const pendingMenuButton = pendingRow.locator('[data-testid="action-menu"]').first()
    await pendingMenuButton.click()
    
    const requestCorrectionsMenuPending = page.locator('[data-testid="request-corrections-menu"]').first()
    await expect(requestCorrectionsMenuPending).toBeVisible()
    await page.keyboard.press('Escape') // Fermer le menu

    // 4. Vérifier que "Demander des corrections" n'est PAS visible pour under_review
    const underReviewRow = page.locator(`[data-testid="membership-request-row-${underReviewRequest.id}"]`)
    const underReviewMenuButton = underReviewRow.locator('[data-testid="action-menu"]').first()
    await underReviewMenuButton.click()
    
    const requestCorrectionsMenuUnderReview = page.locator('[data-testid="request-corrections-menu"]')
    await expect(requestCorrectionsMenuUnderReview).not.toBeVisible()

    // 5. Vérifier que les actions post-création sont visibles pour under_review
    const copyLinkMenu = page.locator('[data-testid="copy-correction-link-menu"]').first()
    await expect(copyLinkMenu).toBeVisible()
    
    const sendWhatsappMenu = page.locator('[data-testid="send-whatsapp-menu"]').first()
    await expect(sendWhatsappMenu).toBeVisible()
    
    const renewCodeMenu = page.locator('[data-testid="renew-code-menu"]').first()
    await expect(renewCodeMenu).toBeVisible()
  })

  test('P0-CORR-02B: devrait désactiver le bouton si aucune correction saisie', async ({ page }) => {
    const request = await createPendingUnpaidRequest()
    createdRequests.push(request.id)

    await page.reload()
    await waitForRequestsList(page)
    
    const requestRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
    const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
    await menuButton.click()

    const requestCorrectionsMenu = page.locator('[data-testid="request-corrections-menu"]').first()
    await requestCorrectionsMenu.click()

    const modal = page.locator('[data-testid="corrections-modal"]')
    await expect(modal).toBeVisible()

    const submitButton = page.locator('[data-testid="corrections-modal-submit-button"]')
    await expect(submitButton).toBeDisabled()

    const textarea = page.locator('[data-testid="corrections-modal-textarea"]')
    await textarea.fill('   ') // Espaces uniquement

    await expect(submitButton).toBeDisabled()
  })

  test('P0-CORR-03: devrait ne pas afficher WhatsApp dans le modal de corrections', async ({ page }) => {
    const request = await createPendingUnpaidRequest()
    createdRequests.push(request.id)

    await page.reload()
    await waitForRequestsList(page)
    
    const requestRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
    const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
    await menuButton.click()

    const requestCorrectionsMenu = page.locator('[data-testid="request-corrections-menu"]').first()
    await requestCorrectionsMenu.click()

    const modal = page.locator('[data-testid="corrections-modal"]')
    await expect(modal).toBeVisible()

    // Vérifier que WhatsApp n'est PAS dans le modal
    const whatsappCheckbox = modal.locator('text=Envoyer via WhatsApp')
    await expect(whatsappCheckbox).not.toBeVisible()
    
    const phoneSelect = modal.locator('[data-testid="whatsapp-modal-phone-select"]')
    await expect(phoneSelect).not.toBeVisible()

    // Vérifier que seul le textarea est présent
    const textarea = modal.locator('[data-testid="corrections-modal-textarea"]')
    await expect(textarea).toBeVisible()
  })

  test('P0-CORR-03B: devrait afficher le compteur de corrections en temps réel', async ({ page }) => {
    const request = await createPendingUnpaidRequest()
    createdRequests.push(request.id)

    await page.reload()
    await waitForRequestsList(page)
    
    const requestRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
    const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
    await menuButton.click()

    const requestCorrectionsMenu = page.locator('[data-testid="request-corrections-menu"]').first()
    await requestCorrectionsMenu.click()

    const modal = page.locator('[data-testid="corrections-modal"]')
    await expect(modal).toBeVisible()

    const textarea = page.locator('[data-testid="corrections-modal-textarea"]')
    const counter = page.locator('[data-testid="corrections-modal-counter"]')

    await textarea.fill('Photo floue')
    await expect(counter).toContainText('1 correction')

    await textarea.fill('Photo floue\nAdresse incomplète')
    await expect(counter).toContainText('2 correction(s)')

    await textarea.fill('Photo floue\nAdresse incomplète\nSignature manquante')
    await expect(counter).toContainText('3 correction(s)')
  })
})
```

---

### 1.2 Copier lien de correction

**Tests :**
```typescript
test('P0-CORR-04: devrait copier le lien de correction dans le presse-papier', async ({ page, context }) => {
  // 1. Créer une demande avec corrections
  const request = await createRequestWithCorrections()
  createdRequests.push(request.id)

  await page.reload()
  await waitForRequestsList(page)
  
  const requestRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
  const correctionsBlock = requestRow.locator('[data-testid="corrections-block"]')
  await expect(correctionsBlock).toBeVisible()

  // 2. Cliquer sur "Copier lien"
  const copyButton = correctionsBlock.locator('[data-testid="corrections-block-copy-link-button"]')
  await copyButton.click()

  // 3. Vérifier le toast
  await expect(page.locator('text=Lien copié')).toBeVisible({ timeout: 5000 })

  // 4. Vérifier que le lien est dans le presse-papier (format: /register?requestId=XXX, SANS code)
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboardText).toBe(`/register?requestId=${request.id}`)
  expect(clipboardText).not.toContain('code=') // Le code ne doit PAS être dans l'URL
})
```

---

### 1.3 Envoyer via WhatsApp

**Tests :**
```typescript
  test('P0-CORR-05: devrait afficher "Envoyer via WhatsApp" uniquement si numéro disponible', async ({ page }) => {
    // 1. Créer une demande avec numéro
    const requestWithPhone = await createRequestWithCorrections({
      identity: {
        contacts: ['+24165671734'],
      },
    })
    createdRequests.push(requestWithPhone.id)

    // 2. Créer une demande sans numéro
    const requestWithoutPhone = await createRequestWithCorrections({
      identity: {
        contacts: [],
      },
    })
    createdRequests.push(requestWithoutPhone.id)

    await page.reload()
    await waitForRequestsList(page)

    // 3. Vérifier que le bouton WhatsApp est visible si numéro disponible
    const rowWithPhone = page.locator(`[data-testid="membership-request-row-${requestWithPhone.id}"]`)
    const correctionsBlockWithPhone = rowWithPhone.locator('[data-testid="corrections-block"]')
    await expect(correctionsBlockWithPhone).toBeVisible()
    
    const whatsappButtonWithPhone = correctionsBlockWithPhone.locator('[data-testid="corrections-block-send-whatsapp-button"]')
    await expect(whatsappButtonWithPhone).toBeVisible()

    // 4. Vérifier que le bouton WhatsApp n'est PAS visible si pas de numéro
    const rowWithoutPhone = page.locator(`[data-testid="membership-request-row-${requestWithoutPhone.id}"]`)
    const correctionsBlockWithoutPhone = rowWithoutPhone.locator('[data-testid="corrections-block"]')
    await expect(correctionsBlockWithoutPhone).toBeVisible()
    
    const whatsappButtonWithoutPhone = correctionsBlockWithoutPhone.locator('[data-testid="corrections-block-send-whatsapp-button"]')
    await expect(whatsappButtonWithoutPhone).not.toBeVisible()

    // 5. Vérifier que le menu item "Envoyer via WhatsApp" n'est pas visible dans le dropdown
    const menuButton = rowWithoutPhone.locator('[data-testid="action-menu"]').first()
    await menuButton.click()
    
    const sendWhatsappMenu = page.locator('[data-testid="send-whatsapp-menu"]')
    await expect(sendWhatsappMenu).not.toBeVisible()
  })

  test('P0-CORR-05B: devrait ouvrir WhatsApp avec le message correct', async ({ page, context }) => {
  const request = await createRequestWithCorrections({
    identity: {
      contacts: ['+24165671734', '+24107123456'],
    },
  })
  createdRequests.push(request.id)

  await page.reload()
  await waitForRequestsList(page)
  
  const requestRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
  const correctionsBlock = requestRow.locator('[data-testid="corrections-block"]')
  await expect(correctionsBlock).toBeVisible()

  // 1. Cliquer sur "Envoyer WhatsApp"
  const whatsappButton = correctionsBlock.locator('[data-testid="corrections-block-send-whatsapp-button"]')
  await whatsappButton.click()

  // 2. Vérifier que le modal WhatsApp s'ouvre
  const whatsappModal = page.locator('[data-testid="whatsapp-modal"]')
  await expect(whatsappModal).toBeVisible({ timeout: 5000 })

  // 3. Sélectionner un numéro (si plusieurs)
  const phoneSelect = page.locator('[data-testid="whatsapp-modal-phone-select-trigger"]')
  if (await phoneSelect.isVisible()) {
    await phoneSelect.click()
    const phoneOption = page.locator('[data-testid="whatsapp-modal-phone-option-1"]')
    await phoneOption.click()
  }

  // 4. Cliquer sur "Envoyer via WhatsApp"
  const sendButton = page.locator('[data-testid="whatsapp-modal-send-button"]')
  await sendButton.click()

  // 5. Vérifier qu'un nouvel onglet WhatsApp s'ouvre
  const pages = await context.pages()
  expect(pages.length).toBeGreaterThan(1)
  
  const whatsappPage = pages[pages.length - 1]
  expect(whatsappPage.url()).toContain('wa.me')
  expect(whatsappPage.url()).toContain('24107123456') // Numéro sélectionné

  // 6. Vérifier que le message WhatsApp contient : lien + code + expiration
  // Note: Le message est dans l'URL encodée, on peut vérifier les paramètres
  const urlParams = new URLSearchParams(whatsappPage.url().split('?')[1] || '')
  const textParam = urlParams.get('text')
  expect(textParam).toBeTruthy()
  
  const decodedMessage = decodeURIComponent(textParam || '')
  expect(decodedMessage).toContain('/register?requestId=') // Lien
  expect(decodedMessage).toMatch(/\d{2}-\d{2}-\d{2}/) // Code formaté (AB12-CD34)
  expect(decodedMessage).toMatch(/\d{2}\/\d{2}\/\d{4}/) // Date expiration
  expect(decodedMessage).toMatch(/reste \d+j \d+h/) // Temps restant
})
```

---

### 1.4 Régénérer le code

**Tests :**
```typescript
  test('P0-CORR-06: devrait afficher max 3 corrections puis "Voir plus"', async ({ page }) => {
    const request = await createRequestWithCorrections({
      reviewNote: 'Photo floue\nAdresse incomplète\nSignature manquante\nEmail invalide\nTéléphone manquant',
    })
    createdRequests.push(request.id)

    await page.reload()
    await waitForRequestsList(page)
    
    const requestRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
    const correctionsBlock = requestRow.locator('[data-testid="corrections-block"]')
    await expect(correctionsBlock).toBeVisible()

    // Vérifier que seules les 3 premières corrections sont affichées
    await expect(correctionsBlock.locator('[data-testid="correction-item-0"]')).toContainText('Photo floue')
    await expect(correctionsBlock.locator('[data-testid="correction-item-1"]')).toContainText('Adresse incomplète')
    await expect(correctionsBlock.locator('[data-testid="correction-item-2"]')).toContainText('Signature manquante')

    // Vérifier que "Voir plus" est affiché
    const seeMoreLink = correctionsBlock.locator('text=Voir plus').or(correctionsBlock.locator('text=... et'))
    await expect(seeMoreLink).toBeVisible()
    await expect(seeMoreLink).toContainText('2 autre(s)') // 5 corrections - 3 affichées = 2 autres
  })

  test('P0-CORR-06B: devrait régénérer le code de sécurité', async ({ page }) => {
  const request = await createRequestWithCorrections()
  createdRequests.push(request.id)

  await page.reload()
  await waitForRequestsList(page)
  
  const requestRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
  
  // 1. Récupérer l'ancien code
  const correctionsBlock = requestRow.locator('[data-testid="corrections-block"]')
  const oldCode = await correctionsBlock.locator('[data-testid="corrections-block-code-value"]').textContent()

  // 2. Ouvrir le dropdown
  const menuButton = requestRow.locator('[data-testid="action-menu"]').first()
  await menuButton.click()

  // 3. Cliquer sur "Régénérer le code"
  const renewMenu = page.locator('[data-testid="renew-code-menu"]').first()
  await renewMenu.click()

  // 4. Vérifier que le modal s'ouvre
  const renewModal = page.locator('[data-testid="renew-code-modal"]')
  await expect(renewModal).toBeVisible({ timeout: 5000 })

  // 5. Vérifier l'avertissement
  const warning = page.locator('[data-testid="renew-code-modal-warning"]')
  await expect(warning).toBeVisible()

  // 6. Cocher la confirmation
  const checkbox = page.locator('[data-testid="renew-code-modal-confirm-checkbox"]')
  await checkbox.click()

  // 7. Cliquer sur "Régénérer le code"
  const renewButton = page.locator('[data-testid="renew-code-modal-renew-button"]')
  await expect(renewButton).toBeEnabled()
  await renewButton.click()

  // 8. Vérifier le toast
  await expect(page.locator('text=Code régénéré')).toBeVisible({ timeout: 5000 })

  // 9. Vérifier que le nouveau code est différent
  await page.reload()
  await waitForRequestsList(page)
  
  const updatedRow = page.locator(`[data-testid="membership-request-row-${request.id}"]`)
  const updatedBlock = updatedRow.locator('[data-testid="corrections-block"]')
  const newCode = await updatedBlock.locator('[data-testid="corrections-block-code-value"]').textContent()
  
  expect(newCode).not.toBe(oldCode)
  expect(newCode).toMatch(/^\d{2}-\d{2}-\d{2}$/)
})
```

---

## 🎭 2. Tests E2E Demandeur

**⚠️ IMPORTANT :** Ces tests utilisent les **Cloud Functions** pour la vérification du code et la soumission des corrections. Les appels sont testés de bout en bout avec les transactions atomiques.

### 2.1 Accéder aux corrections via URL

**Fichier :** `e2e/registration/corrections.spec.ts`

**Tests :**
```typescript
test.describe('E2E: Corrections (Demandeur)', () => {
  test('P0-CORR-07: devrait afficher le formulaire de code avec le banner', async ({ page }) => {
    // 1. Créer une demande avec corrections
    const request = await createRequestWithCorrections()
    
    // 2. Accéder à la page avec requestId
    await page.goto(`/register?requestId=${request.id}`)

    // 3. Vérifier que le banner s'affiche
    const banner = page.locator('[data-testid="correction-banner"]')
    await expect(banner).toBeVisible({ timeout: 10000 })
    await expect(banner.locator('[data-testid="correction-banner-title"]')).toContainText('Corrections demandées')

    // 4. Vérifier que les corrections sont affichées
    await expect(banner.locator('[data-testid="correction-banner-item-0"]')).toBeVisible()

    // 5. Vérifier que le formulaire de code s'affiche
    const codeForm = page.locator('[data-testid="security-code-form"]')
    await expect(codeForm).toBeVisible()
    await expect(codeForm.locator('[data-testid="security-code-form-title"]')).toContainText('Code de sécurité requis')

    // 6. Vérifier qu'il y a 6 inputs
    for (let i = 0; i < 6; i++) {
      await expect(page.locator(`[data-testid="security-code-input-${i}"]`)).toBeVisible()
    }

    await deleteTestMembershipRequest(request.id)
  })

  test('P0-CORR-08: devrait afficher une erreur si le code est expiré', async ({ page }) => {
    const request = await createRequestWithCorrections({
      securityCodeExpiry: new Date(Date.now() - 1000), // Expiré
    })
    
    await page.goto(`/register?requestId=${request.id}`)

    // Vérifier le message d'erreur
    await expect(page.locator('text=Code expiré')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Le code de sécurité a expiré')).toBeVisible()

    await deleteTestMembershipRequest(request.id)
  })

  test('P0-CORR-09: devrait afficher une erreur si le code est déjà utilisé', async ({ page }) => {
    const request = await createRequestWithCorrections({
      securityCodeUsed: true,
    })
    
    await page.goto(`/register?requestId=${request.id}`)

    // Vérifier le message d'erreur
    await expect(page.locator('text=Code déjà utilisé')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Ce code de sécurité a déjà été utilisé')).toBeVisible()

    await deleteTestMembershipRequest(request.id)
  })
})
```

---

### 2.2 Vérifier le code de sécurité

**Tests :**
```typescript
  test('P0-CORR-10: devrait vérifier le code via Cloud Function et charger le formulaire', async ({ page }) => {
  const request = await createRequestWithCorrections({
    securityCode: '123456',
  })
  
  await page.goto(`/register?requestId=${request.id}`)

  // 1. Saisir le code
  for (let i = 0; i < 6; i++) {
    const input = page.locator(`[data-testid="security-code-input-${i}"]`)
    await input.fill(String(i + 1)) // Code: 123456
  }

  // 2. Vérifier que le bouton est actif
  const verifyButton = page.locator('[data-testid="security-code-form-verify-button"]')
  await expect(verifyButton).toBeEnabled()

  // 3. Cliquer sur "Vérifier le code"
  await verifyButton.click()

  // 4. Vérifier le toast de succès
  await expect(page.locator('text=Code vérifié')).toBeVisible({ timeout: 10000 })

  // 5. Vérifier que le formulaire de code disparaît
  const codeForm = page.locator('[data-testid="security-code-form"]')
  await expect(codeForm).not.toBeVisible({ timeout: 5000 })

  // 6. Vérifier que le formulaire d'inscription s'affiche pré-rempli
  const registrationForm = page.locator('[data-testid="registration-form"]')
  await expect(registrationForm).toBeVisible()

  await deleteTestMembershipRequest(request.id)
})

test('P0-CORR-11: devrait afficher une erreur si le code est incorrect', async ({ page }) => {
  const request = await createRequestWithCorrections({
    securityCode: '123456',
  })
  
  await page.goto(`/register?requestId=${request.id}`)

  // Saisir un code incorrect
  for (let i = 0; i < 6; i++) {
    const input = page.locator(`[data-testid="security-code-input-${i}"]`)
    await input.fill('9') // Code: 999999
  }

  const verifyButton = page.locator('[data-testid="security-code-form-verify-button"]')
  await verifyButton.click()

  // Vérifier le message d'erreur
  const errorAlert = page.locator('[data-testid="security-code-form-error"]')
  await expect(errorAlert).toBeVisible({ timeout: 5000 })
  await expect(errorAlert.locator('[data-testid="security-code-form-error-message"]')).toContainText('Code incorrect')

  await deleteTestMembershipRequest(request.id)
})

test('P0-CORR-12: devrait auto-avancer entre les inputs', async ({ page }) => {
  const request = await createRequestWithCorrections()
  
  await page.goto(`/register?requestId=${request.id}`)

  const input0 = page.locator('[data-testid="security-code-input-0"]')
  const input1 = page.locator('[data-testid="security-code-input-1"]')

  await input0.fill('1')
  
  // Vérifier que le focus passe au deuxième input
  await expect(input1).toBeFocused()

  await deleteTestMembershipRequest(request.id)
})
```

---

### 2.3 Soumettre les corrections

**Tests :**
```typescript
test('P0-CORR-13: devrait soumettre les corrections et remettre le statut à pending', async ({ page }) => {
  const request = await createRequestWithCorrections({
    securityCode: '123456',
  })
  
  await page.goto(`/register?requestId=${request.id}`)

  // 1. Vérifier le code
  for (let i = 0; i < 6; i++) {
    const input = page.locator(`[data-testid="security-code-input-${i}"]`)
    await input.fill(String(i + 1))
  }
  
  const verifyButton = page.locator('[data-testid="security-code-form-verify-button"]')
  await verifyButton.click()
  await expect(page.locator('text=Code vérifié')).toBeVisible({ timeout: 10000 })

  // 2. Modifier les données (ex: photo)
  // ... remplir le formulaire avec les corrections

  // 3. Soumettre
  const submitButton = page.locator('[data-testid="registration-form-submit-corrections-button"]')
  await expect(submitButton).toBeVisible()
  await expect(submitButton).toContainText('Soumettre les corrections')
  await submitButton.click()

  // 4. Vérifier le toast de succès
  await expect(page.locator('text=Corrections soumises')).toBeVisible({ timeout: 10000 })

  // 5. Vérifier que la demande est repassée à pending (via API)
  const updatedRequest = await getMembershipRequestById(request.id)
  expect(updatedRequest?.status).toBe('pending')
  expect(updatedRequest?.securityCodeUsed).toBe(true)

  await deleteTestMembershipRequest(request.id)
})
```

---

## ✅ Checklist

### Tests Admin (10 tests)
- [x] P0-CORR-01 : Demander corrections (flow complet avec toutes vérifications)
- [x] P0-CORR-02 : Dropdown conditionnel selon statut
- [x] P0-CORR-02B : Validation formulaire (bouton désactivé)
- [x] P0-CORR-03 : Modal sans WhatsApp
- [x] P0-CORR-03B : Compteur corrections temps réel
- [x] P0-CORR-04 : Copier lien (format correct, sans code)
- [x] P0-CORR-05 : WhatsApp conditionnel (si numéro disponible)
- [x] P0-CORR-05B : Message WhatsApp complet (lien + code + expiration)
- [x] P0-CORR-06 : Max 3 corrections + "Voir plus"
- [x] P0-CORR-06B : Régénérer code (vérifications complètes)

### Tests Demandeur (7 tests)
- [x] P0-CORR-07 : Accéder via URL (banner + formulaire code)
- [x] P0-CORR-08 : Erreur si code expiré
- [x] P0-CORR-09 : Erreur si code déjà utilisé
- [x] P0-CORR-10 : Vérifier code et charger formulaire
- [x] P0-CORR-11 : Erreur si code incorrect
- [x] P0-CORR-12 : Auto-advance entre inputs
- [x] P0-CORR-13 : Soumettre corrections

### Implémentation
- [ ] Tous les data-testid ajoutés dans les composants (57 data-testid)
- [ ] Helpers E2E créés (createRequestWithCorrections, etc.)
- [ ] Timeouts appropriés pour les opérations async
- [ ] Nettoyage des données de test après chaque test
- [ ] Tous les tests passent en E2E

**✅ Tous les cas du feedback P0 sont couverts** (voir `COUVERTURE_FEEDBACK_P0.md` pour détails)