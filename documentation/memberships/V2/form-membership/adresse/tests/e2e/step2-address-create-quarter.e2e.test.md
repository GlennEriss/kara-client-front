# Test E2E - Création et Sélection d'un Quarter

## 📋 Vue d'ensemble

Test E2E complet pour la création et la sélection d'un quarter dans Step2 Adresse, dans le contexte d'un district sélectionné.

## 🎯 Objectifs

Vérifier que :
1. Un admin peut créer un nouveau quarter dans un district sélectionné
2. Le quarter créé apparaît **immédiatement** dans le Combobox (Optimistic Update)
3. Le quarter créé peut être **sélectionné** immédiatement
4. Le résumé de l'adresse apparaît après sélection complète
5. La progression est mise à jour correctement

## 📝 Test complet

### E2E-QUARTER-001 : Création et sélection d'un quarter

```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin, navigateToMembershipForm } from '../helpers/auth-helpers'
import { 
  selectProvince,
  selectCommune,
  selectDistrict,
  waitForQuarterCombobox,
  openQuarterModal,
  fillQuarterForm,
  submitQuarterModal,
  selectQuarterFromCombobox
} from '../step2-address-helpers'

test.describe('Step2 Adresse - Création Quarter', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToMembershipForm(page)
    await page.getByTestId('membership-form-step-2').click()
    
    // Prérequis : Sélectionner une province, commune et district
    await selectProvince(page, 'Estuaire')
    await selectCommune(page, 'Libreville')
    await selectDistrict(page, 'Akanda')
  })

  test('E2E-QUARTER-001: devrait créer un quarter et le sélectionner immédiatement', async ({ page }) => {
    // ============================================
    // ÉTAPE 1 : Vérifier l'état après sélection district
    // ============================================
    
    // Vérifier que le district est sélectionné
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText('Akanda')
    
    // Vérifier que le Combobox quarter est maintenant déverrouillé
    const quarterCombobox = page.getByTestId('step2-address-quarter-combobox')
    await expect(quarterCombobox).toBeEnabled()
    
    // Vérifier que le bouton d'ajout est visible et activé
    const addButton = page.getByTestId('step2-address-quarter-add-button')
    await expect(addButton).toBeVisible()
    await expect(addButton).toBeEnabled()
    
    // ============================================
    // ÉTAPE 2 : Ouvrir le modal de création
    // ============================================
    
    // Cliquer sur le bouton d'ajout
    await addButton.click()
    
    // Vérifier que le modal s'ouvre
    const quarterModal = page.getByTestId('step2-address-modal-quarter')
    await expect(quarterModal).toBeVisible()
    
    // Vérifier que le modal contient les champs requis
    await expect(page.getByLabel(/nom du quartier/i)).toBeVisible()
    
    // Vérifier que le district est pré-sélectionné (contexte)
    
    // ============================================
    // ÉTAPE 3 : Remplir le formulaire
    // ============================================
    
    const newQuarterName = 'Quarter Test Nouveau'
    
    // Remplir le nom
    await page.getByLabel(/nom du quartier/i).fill(newQuarterName)
    
    // Vérifier que le bouton de soumission est activé
    const submitButton = page.getByTestId('step2-address-modal-quarter-submit-button')
    await expect(submitButton).toBeEnabled()
    
    // ============================================
    // ÉTAPE 4 : Soumettre le formulaire
    // ============================================
    
    // Cliquer sur le bouton de soumission
    await submitButton.click()
    
    // Vérifier que le modal se ferme
    await expect(quarterModal).not.toBeVisible({ timeout: 5000 })
    
    // ============================================
    // ÉTAPE 5 : Vérifier l'Optimistic Update
    // ============================================
    
    // Vérifier que le quarter apparaît IMMÉDIATEMENT dans le Combobox
    const quarterTrigger = page.getByTestId('step2-address-quarter-trigger')
    await expect(quarterTrigger).toContainText(newQuarterName, { timeout: 2000 })
    
    // Vérifier que le quarter est sélectionné automatiquement
    await expect(page.getByTestId('step2-address-quarter-selected')).toBeVisible()
    await expect(page.getByTestId('step2-address-quarter-selected')).toContainText(newQuarterName)
    
    // Vérifier que le badge de progression est mis à jour
    const quarterBadge = page.getByTestId('step2-address-progression-quarter-badge')
    await expect(quarterBadge).toHaveClass(/success/, { timeout: 2000 })
    
    // ============================================
    // ÉTAPE 6 : Vérifier la sélection dans le Combobox
    // ============================================
    
    // Ouvrir le Combobox pour vérifier que le quarter est dans la liste
    await quarterTrigger.click()
    
    // Attendre que le popover s'ouvre
    await expect(page.getByTestId('step2-address-quarter-popover')).toBeVisible()
    
    // Vérifier que le nouveau quarter est dans les résultats
    const results = page.getByTestId('step2-address-quarter-results')
    await expect(results).toBeVisible()
    
    // Vérifier que le quarter créé est présent
    const quarterItem = page.getByTestId('step2-address-quarter-result-item')
      .filter({ hasText: newQuarterName })
    await expect(quarterItem).toBeVisible()
    
    // Vérifier que le quarter créé est marqué comme sélectionné
    await expect(quarterItem).toHaveClass(/selected/)
    
    // Fermer le popover
    await page.keyboard.press('Escape')
    
    // ============================================
    // ÉTAPE 7 : Vérifier le résumé de l'adresse
    // ============================================
    
    // Vérifier que le résumé apparaît (tous les niveaux sont sélectionnés)
    const summaryContainer = page.getByTestId('step2-address-summary-container')
    await expect(summaryContainer).toBeVisible({ timeout: 2000 })
    
    // Vérifier la hiérarchie complète
    const hierarchy = page.getByTestId('step2-address-summary-hierarchy')
    await expect(hierarchy).toContainText('Estuaire')
    await expect(hierarchy).toContainText('Libreville')
    await expect(hierarchy).toContainText('Akanda')
    await expect(hierarchy).toContainText(newQuarterName)
    
    // Vérifier le message de validation
    const validationMessage = page.getByTestId('step2-address-summary-validation-message')
    await expect(validationMessage).toBeVisible()
    await expect(validationMessage).toContainText('Adresse complète')
    
    // ============================================
    // ÉTAPE 8 : Vérifier le toast de succès
    // ============================================
    
    // Vérifier qu'un toast de succès apparaît
    const toast = page.locator('[role="status"]').filter({ hasText: newQuarterName })
    await expect(toast).toBeVisible({ timeout: 3000 })
    await expect(toast).toContainText('créé et sélectionné')
  })

  test('E2E-QUARTER-002: devrait permettre de sélectionner le quarter créé depuis le Combobox', async ({ page }) => {
    // Prérequis : Créer un quarter
    await openQuarterModal(page)
    await fillQuarterForm(page, { name: 'Quarter Test Sélection' })
    await submitQuarterModal(page)
    
    // Attendre que le quarter soit créé et sélectionné
    await expect(page.getByTestId('step2-address-quarter-selected'))
      .toContainText('Quarter Test Sélection', { timeout: 3000 })
    
    // Désélectionner le quarter (si possible)
    // Note: Cela dépend de l'implémentation
    
    // Ouvrir le Combobox
    await page.getByTestId('step2-address-quarter-trigger').click()
    await expect(page.getByTestId('step2-address-quarter-popover')).toBeVisible()
    
    // Rechercher le quarter créé
    const searchInput = page.getByTestId('step2-address-quarter-search-input')
    await searchInput.fill('Quarter Test Sélection')
    
    // Attendre que les résultats se filtrent
    await page.waitForTimeout(500) // Attendre le debounce
    
    // Sélectionner le quarter créé depuis la liste
    const quarterItem = page.getByTestId('step2-address-quarter-result-item')
      .filter({ hasText: 'Quarter Test Sélection' })
    await expect(quarterItem).toBeVisible()
    await quarterItem.click()
    
    // Vérifier que le quarter est sélectionné
    await expect(page.getByTestId('step2-address-quarter-selected'))
      .toContainText('Quarter Test Sélection')
    
    // Vérifier que le résumé est toujours visible
    await expect(page.getByTestId('step2-address-summary-container')).toBeVisible()
  })
})
```

## 🎯 Points critiques testés

1. **Optimistic Update** : Le quarter apparaît immédiatement sans attendre le refetch
2. **Sélection automatique** : Le quarter créé est automatiquement sélectionné
3. **Résumé** : Le résumé de l'adresse apparaît après sélection complète
4. **Progression** : Le badge de progression est mis à jour
5. **Toast** : Un message de succès apparaît
6. **Recherche** : Le quarter créé est trouvable via la recherche

## 📊 Test IDs utilisés

- `step2-address-district-selected`
- `step2-address-quarter-combobox`
- `step2-address-quarter-add-button`
- `step2-address-modal-quarter`
- `step2-address-modal-quarter-submit-button`
- `step2-address-quarter-trigger`
- `step2-address-quarter-selected`
- `step2-address-quarter-popover`
- `step2-address-quarter-results`
- `step2-address-quarter-result-item`
- `step2-address-quarter-search-input`
- `step2-address-progression-quarter-badge`
- `step2-address-summary-container`
- `step2-address-summary-hierarchy`
- `step2-address-summary-validation-message`

## 🔗 Références

- [Test IDs complets](../ui/test-ids.md)
- [Helpers de test](./step2-address-helpers.md)
