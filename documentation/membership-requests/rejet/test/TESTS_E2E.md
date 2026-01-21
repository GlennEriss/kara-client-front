# Tests E2E - Fonctionnalité "Rejet d'une Demande d'Adhésion"

> Plan détaillé des tests E2E (End-to-End) pour la fonctionnalité de rejet

---

## 📋 Vue d'ensemble

**Objectif** : Tester les flows complets depuis l'interface utilisateur jusqu'à Firestore

**Outils** : Playwright

**Environnement** :
- **Local** : Firebase Cloud (dev) - Tests de développement
- **Préprod** : Firebase Cloud (préprod) - **OBLIGATOIRE avant prod**

**Total estimé** : ~20 tests E2E

---

## 🔴 Tests E2E - Rejet

### P0-REJET-01 : Rejeter une demande d'adhésion (flow complet)

**Description** : Tester le flow complet de rejet depuis l'interface admin

**Test** :
```typescript
test('P0-REJET-01: devrait rejeter une demande d\'adhésion avec motif valide', async ({ page }) => {
  // Arrange
  await page.goto('/membership-requests')
  
  // Trouver une demande en attente
  const requestCard = page.locator('[data-testid="request-card"]').first()
  const status = await requestCard.locator('[data-testid="request-status"]').textContent()
  
  // Act
  if (status === 'En attente' || status === 'En cours d\'examen') {
    // Cliquer sur "Rejeter"
    await requestCard.locator('[data-testid="reject-button"]').click()
    
    // Vérifier que le modal s'ouvre
    await expect(page.locator('[data-testid="reject-modal"]')).toBeVisible()
    
    // Remplir le motif de rejet
    await page.locator('[data-testid="reject-modal-reason-input"]').fill(
      'Documents incomplets. Veuillez fournir tous les documents requis pour finaliser votre demande.'
    )
    
    // Vérifier compteur de caractères
    await expect(page.locator('[data-testid="reject-modal-reason-counter"]')).toContainText('120 / 500 caractères')
    
    // Soumettre
    await page.locator('[data-testid="reject-modal-submit-button"]').click()
    
    // Assert
    await expect(page.locator('[data-testid="reject-modal"]')).not.toBeVisible()
    await expect(page.locator('text=Demande rejetée avec succès')).toBeVisible()
    
    // Vérifier que le statut a changé à "Rejetée"
    await expect(requestCard.locator('[data-testid="request-status"]')).toContainText('Rejetée')
  }
})
```

### P0-REJET-02 : Vérifier notification Firestore créée

**Description** : Vérifier que la notification Firestore est créée pour les admins

**Test** :
```typescript
test('P0-REJET-02: devrait créer une notification Firestore pour les admins', async ({ page }) => {
  // Arrange
  await page.goto('/membership-requests')
  
  // Rejeter une demande (comme P0-REJET-01)
  // ... (code de rejet)
  
  // Act
  // Vérifier dans NotificationBell
  await page.locator('[data-testid="notification-bell"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="notification-rejected"]')).toBeVisible()
  await expect(page.locator('[data-testid="notification-rejected"]')).toContainText('Demande d\'adhésion rejetée')
  await expect(page.locator('[data-testid="notification-rejected"]')).toContainText('Documents incomplets')
})
```

**Total** : ~4 tests E2E rejet

---

## 🔄 Tests E2E - Réouverture

### P0-REJET-03 : Réouvrir un dossier rejeté (flow complet)

**Description** : Tester le flow complet de réouverture depuis l'interface admin

**Test** :
```typescript
test('P0-REJET-03: devrait réouvrir un dossier rejeté avec motif valide', async ({ page }) => {
  // Arrange
  await page.goto('/membership-requests')
  
  // Trouver une demande rejetée
  const requestCard = page.locator('[data-testid="request-card"]')
    .filter({ hasText: 'Rejetée' })
    .first()
  
  // Act
  // Cliquer sur "Réouvrir"
  await requestCard.locator('[data-testid="reopen-button"]').click()
  
  // Vérifier que le modal s'ouvre
  await expect(page.locator('[data-testid="reopen-modal"]')).toBeVisible()
  
  // Vérifier affichage informations
  await expect(page.locator('[data-testid="reopen-modal-member-name"]')).toBeVisible()
  await expect(page.locator('[data-testid="reopen-modal-matricule"]')).toBeVisible()
  await expect(page.locator('[data-testid="reopen-modal-previous-reject-reason"]')).toBeVisible()
  
  // Remplir le motif de réouverture
  await page.locator('[data-testid="reopen-modal-reason-input"]').fill(
    'Nouvelle information disponible. Le dossier nécessite un réexamen approfondi.'
  )
  
  // Soumettre
  await page.locator('[data-testid="reopen-modal-submit-button"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="reopen-modal"]')).not.toBeVisible()
  await expect(page.locator('text=Dossier réouvert avec succès')).toBeVisible()
  
  // Vérifier que le statut a changé à "En cours d'examen"
  await expect(requestCard.locator('[data-testid="request-status"]')).toContainText('En cours d\'examen')
})
```

### P0-REJET-04 : Vérifier notification réouverture créée

**Description** : Vérifier que la notification Firestore est créée pour la réouverture

**Test** :
```typescript
test('P0-REJET-04: devrait créer une notification Firestore pour la réouverture', async ({ page }) => {
  // Arrange
  // Réouvrir une demande (comme P0-REJET-03)
  // ... (code de réouverture)
  
  // Act
  await page.locator('[data-testid="notification-bell"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="notification-reopened"]')).toBeVisible()
  await expect(page.locator('[data-testid="notification-reopened"]')).toContainText('Dossier réouvert')
})
```

**Total** : ~4 tests E2E réouverture

---

## 💬 Tests E2E - WhatsApp

### P0-REJET-05 : Envoyer WhatsApp du motif de rejet

**Description** : Tester le flow complet d'envoi WhatsApp depuis l'interface admin

**Test** :
```typescript
test('P0-REJET-05: devrait ouvrir WhatsApp Web avec message de rejet', async ({ page, context }) => {
  // Arrange
  await page.goto('/membership-requests')
  
  // Trouver une demande rejetée
  const requestCard = page.locator('[data-testid="request-card"]')
    .filter({ hasText: 'Rejetée' })
    .first()
  
  // Act
  // Cliquer sur "Envoyer WhatsApp"
  await requestCard.locator('[data-testid="send-whatsapp-button"]').click()
  
  // Vérifier que le modal s'ouvre
  await expect(page.locator('[data-testid="reject-whatsapp-modal"]')).toBeVisible()
  
  // Si plusieurs numéros, sélectionner un numéro
  const phoneSelect = page.locator('[data-testid="reject-whatsapp-modal-phone-select"]')
  if (await phoneSelect.isVisible()) {
    await phoneSelect.click()
    await page.locator('[role="option"]').first().click()
  }
  
  // Vérifier message template prérempli
  const messageTextarea = page.locator('[data-testid="reject-whatsapp-modal-message-textarea"]')
  await expect(messageTextarea).toHaveValue(expect.stringContaining('Bonjour'))
  
  // Modifier le message si nécessaire
  await messageTextarea.fill('Message modifié pour test')
  
  // Ouvrir WhatsApp
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.locator('[data-testid="reject-whatsapp-modal-send-button"]').click(),
  ])
  
  // Assert
  await expect(newPage.url()).toContain('wa.me/')
  await expect(newPage.url()).toContain('text=')
  
  // Vérifier toast de confirmation
  await expect(page.locator('text=WhatsApp ouvert')).toBeVisible()
})
```

**Total** : ~3 tests E2E WhatsApp

---

## 🗑️ Tests E2E - Suppression

### P0-REJET-06 : Supprimer définitivement un dossier rejeté

**Description** : Tester le flow complet de suppression via Cloud Function

**Test** :
```typescript
test('P0-REJET-06: devrait supprimer définitivement un dossier rejeté avec confirmation matricule', async ({ page }) => {
  // Arrange
  await page.goto('/membership-requests')
  
  // Trouver une demande rejetée
  const requestCard = page.locator('[data-testid="request-card"]')
    .filter({ hasText: 'Rejetée' })
    .first()
  
  const matricule = await requestCard.locator('[data-testid="request-matricule"]').textContent()
  
  // Act
  // Cliquer sur "Supprimer"
  await requestCard.locator('[data-testid="delete-button"]').click()
  
  // Vérifier que le modal s'ouvre
  await expect(page.locator('[data-testid="delete-modal"]')).toBeVisible()
  
  // Vérifier avertissement
  await expect(page.locator('[data-testid="delete-modal-warning"]')).toBeVisible()
  await expect(page.locator('[data-testid="delete-modal-warning"]')).toContainText('définitive et non réversible')
  
  // Vérifier informations affichées
  await expect(page.locator('[data-testid="delete-modal-member-name"]')).toBeVisible()
  await expect(page.locator('[data-testid="delete-modal-matricule-display"]')).toContainText(matricule!)
  
  // Saisir le matricule incorrect (devrait désactiver le bouton)
  await page.locator('[data-testid="delete-modal-matricule-input"]').fill('MK-WRONG')
  await expect(page.locator('[data-testid="delete-modal-submit-button"]')).toBeDisabled()
  
  // Saisir le matricule correct
  await page.locator('[data-testid="delete-modal-matricule-input"]').fill(matricule!)
  await expect(page.locator('[data-testid="delete-modal-submit-button"]')).not.toBeDisabled()
  
  // Soumettre
  await page.locator('[data-testid="delete-modal-submit-button"]').click()
  
  // Assert
  await expect(page.locator('[data-testid="delete-modal"]')).not.toBeVisible()
  await expect(page.locator('text=Dossier supprimé avec succès')).toBeVisible()
  
  // Vérifier que le dossier n'apparaît plus dans la liste
  await expect(requestCard).not.toBeVisible()
})
```

### P0-REJET-07 : Vérifier Cloud Function deleteMembershipRequest

**Description** : Vérifier que la Cloud Function supprime Firestore + Storage et crée audit-log

**Test** :
```typescript
test('P0-REJET-07: devrait supprimer Firestore + Storage et créer audit-log via Cloud Function', async ({ page }) => {
  // Arrange
  // Note: Ce test nécessite un accès direct à Firestore/Storage pour vérifier
  
  await page.goto('/membership-requests')
  
  // Trouver une demande rejetée avec documents Storage
  const requestCard = page.locator('[data-testid="request-card"]')
    .filter({ hasText: 'Rejetée' })
    .first()
  
  const requestId = await requestCard.getAttribute('data-request-id')
  const matricule = await requestCard.locator('[data-testid="request-matricule"]').textContent()
  
  // Act
  // Supprimer la demande (comme P0-REJET-06)
  // ... (code de suppression)
  
  // Assert
  // Vérifier que le document Firestore a été supprimé
  // (nécessite accès Firestore Admin SDK ou API)
  
  // Vérifier que les fichiers Storage ont été supprimés
  // (nécessite accès Storage Admin SDK ou API)
  
  // Vérifier qu'un log d'audit a été créé dans audit-logs
  // (nécessite accès Firestore Admin SDK ou API)
  
  // Note: Ces vérifications peuvent nécessiter des helpers de test ou API dédiée
})
```

**Total** : ~4 tests E2E suppression

---

## ✅ Checklist Globale

### Tests Rejet
- [ ] P0-REJET-01 : Rejeter une demande (flow complet)
- [ ] P0-REJET-02 : Vérifier notification Firestore créée
- [ ] Validation motif (minimum 10 caractères)
- [ ] Validation motif (maximum 500 caractères)

### Tests Réouverture
- [ ] P0-REJET-03 : Réouvrir un dossier rejeté (flow complet)
- [ ] P0-REJET-04 : Vérifier notification réouverture créée
- [ ] Vérifier que seules les demandes rejetées peuvent être réouvertes
- [ ] Validation motif de réouverture (10-500 caractères)

### Tests WhatsApp
- [ ] P0-REJET-05 : Envoyer WhatsApp du motif de rejet
- [ ] Sélection numéro (si plusieurs numéros)
- [ ] Message template prérempli avec motif de rejet

### Tests Suppression
- [ ] P0-REJET-06 : Supprimer définitivement un dossier rejeté
- [ ] P0-REJET-07 : Vérifier Cloud Function (Firestore + Storage + Audit Log)
- [ ] Validation matricule (doit correspondre)
- [ ] Avertissement suppression définitive

---

## 📊 Résumé

| Catégorie | Nombre de Tests | Priorité |
|-----------|----------------|----------|
| Rejet | ~4 | P0 |
| Réouverture | ~4 | P0 |
| WhatsApp | ~3 | P1 |
| Suppression | ~4 | P0 |
| Notifications | ~3 | P1 |
| Validations | ~2 | P0 |
| **Total** | **~20** | |

---

## 🚀 Exécution des Tests E2E

### Tests E2E Locaux

```bash
# Prérequis : pnpm dev en arrière-plan
pnpm test:e2e

# Tests spécifiques
pnpm test:e2e reject.spec.ts
pnpm test:e2e reopen.spec.ts
pnpm test:e2e delete.spec.ts
pnpm test:e2e send-whatsapp.spec.ts
```

### Tests E2E Préprod (OBLIGATOIRE avant prod)

```bash
# Configuration préprod
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-preprod \
pnpm test:e2e:preprod
```

---

## 📚 Références

- **Workflow** : `../workflow-use-case-rejet.md`
- **Flux détaillé** : `../FLUX_REJET.md`
- **Actions post-rejet** : `../ACTIONS_POST_REJET.md`
- **Data-testid** : `DATA_TESTID.md`
- **Tests unitaires** : `TESTS_UNITAIRES.md`
- **Tests intégration** : `TESTS_INTEGRATION.md`

---

**Note** : Ces tests seront implémentés progressivement selon le workflow d'implémentation. Les tests E2E en préprod sont **OBLIGATOIRES** avant la mise en production.
