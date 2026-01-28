# Test E2E - Création et Sélection d'une Province

## 📋 Vue d'ensemble

Test E2E complet pour la création et la sélection d'une province dans Step2 Adresse.

## 🎯 Objectifs

Vérifier que :
1. Un admin peut créer une nouvelle province via le modal
2. La province créée apparaît **immédiatement** dans le Combobox (Optimistic Update)
3. La province créée peut être **sélectionnée** immédiatement
4. La progression est mise à jour correctement

## 📝 Test complet

### E2E-PROV-001 : Création et sélection d'une province

```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin, navigateToMembershipForm } from '../helpers/auth-helpers'
import { 
  waitForProvinceCombobox, 
  openProvinceModal,
  fillProvinceForm,
  submitProvinceModal,
  selectProvinceFromCombobox
} from '../step2-address-helpers'

test.describe('Step2 Adresse - Création Province', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToMembershipForm(page)
    // Naviguer jusqu'à Step2
    await page.getByTestId('membership-form-step-2').click()
  })

  test('E2E-PROV-001: devrait créer une province et la sélectionner immédiatement', async ({ page }) => {
    // ============================================
    // ÉTAPE 1 : Vérifier l'état initial
    // ============================================
    
    // Vérifier que le Combobox province est visible
    await expect(page.getByTestId('step2-address-province-combobox')).toBeVisible()
    
    // Vérifier que le trigger est actif
    const provinceTrigger = page.getByTestId('step2-address-province-trigger')
    await expect(provinceTrigger).toBeEnabled()
    await expect(provinceTrigger).toContainText('Sélectionnez une province')
    
    // Vérifier que le bouton d'ajout est visible (admin)
    await expect(page.getByTestId('step2-address-province-add-button')).toBeVisible()
    await expect(page.getByTestId('step2-address-province-add-button')).toBeEnabled()
    
    // Vérifier la progression initiale
    const provinceBadge = page.getByTestId('step2-address-progression-province-badge')
    await expect(provinceBadge).toHaveClass(/locked/) // État verrouillé
    
    // ============================================
    // ÉTAPE 2 : Ouvrir le modal de création
    // ============================================
    
    // Cliquer sur le bouton d'ajout
    await page.getByTestId('step2-address-province-add-button').click()
    
    // Vérifier que le modal s'ouvre
    const provinceModal = page.getByTestId('step2-address-modal-province')
    await expect(provinceModal).toBeVisible()
    
    // Vérifier que le modal contient les champs requis
    await expect(page.getByLabel(/nom de la province/i)).toBeVisible()
    await expect(page.getByLabel(/code/i)).toBeVisible()
    
    // ============================================
    // ÉTAPE 3 : Remplir le formulaire
    // ============================================
    
    const newProvinceName = 'Nouvelle Province Test'
    const newProvinceCode = 'NPT'
    
    // Remplir le nom
    await page.getByLabel(/nom de la province/i).fill(newProvinceName)
    
    // Remplir le code
    await page.getByLabel(/code/i).fill(newProvinceCode)
    
    // Vérifier que le bouton de soumission est activé
    const submitButton = page.getByTestId('step2-address-modal-province-submit-button')
    await expect(submitButton).toBeEnabled()
    
    // ============================================
    // ÉTAPE 4 : Soumettre le formulaire
    // ============================================
    
    // Cliquer sur le bouton de soumission
    await submitButton.click()
    
    // Vérifier que le modal se ferme
    await expect(provinceModal).not.toBeVisible({ timeout: 5000 })
    
    // ============================================
    // ÉTAPE 5 : Vérifier l'Optimistic Update
    // ============================================
    
    // Vérifier que la province apparaît IMMÉDIATEMENT dans le Combobox
    // (sans attendre le refetch)
    await expect(provinceTrigger).toContainText(newProvinceName, { timeout: 2000 })
    
    // Vérifier que la province est sélectionnée automatiquement
    await expect(page.getByTestId('step2-address-province-selected')).toBeVisible()
    await expect(page.getByTestId('step2-address-province-selected')).toContainText(newProvinceName)
    
    // Vérifier que le badge de progression est mis à jour
    await expect(provinceBadge).toHaveClass(/success/, { timeout: 2000 })
    
    // ============================================
    // ÉTAPE 6 : Vérifier la sélection dans le Combobox
    // ============================================
    
    // Ouvrir le Combobox pour vérifier que la province est dans la liste
    await provinceTrigger.click()
    
    // Attendre que le popover s'ouvre
    await expect(page.getByTestId('step2-address-province-popover')).toBeVisible()
    
    // Vérifier que la nouvelle province est dans les résultats
    const results = page.getByTestId('step2-address-province-results')
    await expect(results).toBeVisible()
    
    // Vérifier que la province créée est présente
    const provinceItem = page.getByTestId('step2-address-province-result-item')
      .filter({ hasText: newProvinceName })
    await expect(provinceItem).toBeVisible()
    
    // Vérifier que la province créée est marquée comme sélectionnée
    await expect(provinceItem).toHaveClass(/selected/)
    
    // Fermer le popover
    await page.keyboard.press('Escape')
    
    // ============================================
    // ÉTAPE 7 : Vérifier la cascade
    // ============================================
    
    // Vérifier que la commune est maintenant déverrouillée
    const communeCombobox = page.getByTestId('step2-address-commune-combobox')
    await expect(communeCombobox).toBeEnabled({ timeout: 2000 })
    
    // Vérifier que le message de verrouillage a disparu
    await expect(page.getByTestId('step2-address-commune-locked-message')).not.toBeVisible()
    
    // ============================================
    // ÉTAPE 8 : Vérifier le toast de succès
    // ============================================
    
    // Vérifier qu'un toast de succès apparaît
    const toast = page.locator('[role="status"]').filter({ hasText: newProvinceName })
    await expect(toast).toBeVisible({ timeout: 3000 })
    await expect(toast).toContainText('créée et sélectionnée')
  })

  test('E2E-PROV-002: devrait permettre de sélectionner la province créée depuis le Combobox', async ({ page }) => {
    // Prérequis : Créer une province
    await openProvinceModal(page)
    await fillProvinceForm(page, {
      name: 'Province Test Sélection',
      code: 'PTS'
    })
    await submitProvinceModal(page)
    
    // Attendre que la province soit créée et sélectionnée
    await expect(page.getByTestId('step2-address-province-selected'))
      .toContainText('Province Test Sélection', { timeout: 3000 })
    
    // Désélectionner la province (cliquer ailleurs ou vider le champ)
    // Note: Cela dépend de l'implémentation, peut nécessiter un bouton "Clear"
    
    // Ouvrir le Combobox
    await page.getByTestId('step2-address-province-trigger').click()
    await expect(page.getByTestId('step2-address-province-popover')).toBeVisible()
    
    // Sélectionner la province créée depuis la liste
    const provinceItem = page.getByTestId('step2-address-province-result-item')
      .filter({ hasText: 'Province Test Sélection' })
    await expect(provinceItem).toBeVisible()
    await provinceItem.click()
    
    // Vérifier que la province est sélectionnée
    await expect(page.getByTestId('step2-address-province-selected'))
      .toContainText('Province Test Sélection')
    
    // Vérifier que la commune est déverrouillée
    await expect(page.getByTestId('step2-address-commune-combobox')).toBeEnabled()
  })
})
```

## 🎯 Points critiques testés

1. **Optimistic Update** : La province apparaît immédiatement sans attendre le refetch
2. **Sélection automatique** : La province créée est automatiquement sélectionnée
3. **Cascade** : La commune est déverrouillée après sélection de la province
4. **Progression** : Le badge de progression est mis à jour
5. **Toast** : Un message de succès apparaît

## 📊 Test IDs utilisés

- `step2-address-province-combobox`
- `step2-address-province-trigger`
- `step2-address-province-add-button`
- `step2-address-modal-province`
- `step2-address-modal-province-submit-button`
- `step2-address-province-selected`
- `step2-address-province-popover`
- `step2-address-province-results`
- `step2-address-province-result-item`
- `step2-address-progression-province-badge`
- `step2-address-commune-combobox`
- `step2-address-commune-locked-message`

## 🔗 Références

- [Test IDs complets](../ui/test-ids.md)
- [Helpers de test](./step2-address-helpers.md)
