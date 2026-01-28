# Test E2E - Création et Sélection d'une Commune

## 📋 Vue d'ensemble

Test E2E complet pour la création et la sélection d'une commune dans Step2 Adresse, dans le contexte d'une province sélectionnée.

## 🎯 Objectifs

Vérifier que :
1. Un admin peut créer une nouvelle commune dans une province sélectionnée
2. La commune créée apparaît **immédiatement** dans le Combobox (Optimistic Update)
3. La commune créée peut être **sélectionnée** immédiatement
4. Les districts sont déverrouillés après sélection de la commune
5. La progression est mise à jour correctement

## 📝 Test complet

### E2E-COMMUNE-001 : Création et sélection d'une commune

```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin, navigateToMembershipForm } from '../helpers/auth-helpers'
import { 
  selectProvince,
  waitForCommuneCombobox,
  openCommuneModal,
  fillCommuneForm,
  submitCommuneModal,
  selectCommuneFromCombobox
} from '../step2-address-helpers'

test.describe('Step2 Adresse - Création Commune', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToMembershipForm(page)
    await page.getByTestId('membership-form-step-2').click()
    
    // Prérequis : Sélectionner une province existante
    // (ou créer une province si nécessaire)
    await selectProvince(page, 'Estuaire')
  })

  test('E2E-COMMUNE-001: devrait créer une commune et la sélectionner immédiatement', async ({ page }) => {
    // ============================================
    // ÉTAPE 1 : Vérifier l'état après sélection province
    // ============================================
    
    // Vérifier que la province est sélectionnée
    await expect(page.getByTestId('step2-address-province-selected'))
      .toContainText('Estuaire')
    
    // Vérifier que le Combobox commune est maintenant déverrouillé
    const communeCombobox = page.getByTestId('step2-address-commune-combobox')
    await expect(communeCombobox).toBeEnabled()
    
    // Vérifier que le message de verrouillage a disparu
    await expect(page.getByTestId('step2-address-commune-locked-message')).not.toBeVisible()
    
    // Vérifier que le bouton d'ajout est visible et activé
    const addButton = page.getByTestId('step2-address-commune-add-button')
    await expect(addButton).toBeVisible()
    await expect(addButton).toBeEnabled()
    
    // ============================================
    // ÉTAPE 2 : Ouvrir le modal de création
    // ============================================
    
    // Cliquer sur le bouton d'ajout
    await addButton.click()
    
    // Vérifier que le modal s'ouvre
    const communeModal = page.getByTestId('step2-address-modal-commune')
    await expect(communeModal).toBeVisible()
    
    // Vérifier que le modal contient les champs requis
    await expect(page.getByLabel(/nom de la commune/i)).toBeVisible()
    await expect(page.getByLabel(/département/i)).toBeVisible()
    await expect(page.getByLabel(/code postal/i)).toBeVisible()
    
    // Vérifier que le département est pré-sélectionné avec un département de la province
    // (selon l'implémentation)
    
    // ============================================
    // ÉTAPE 3 : Remplir le formulaire
    // ============================================
    
    const newCommuneName = 'Nouvelle Commune Test'
    const newCommunePostalCode = '24199'
    
    // Remplir le nom
    await page.getByLabel(/nom de la commune/i).fill(newCommuneName)
    
    // Sélectionner un département (de la province sélectionnée)
    // Note: Le département devrait être filtré pour ne montrer que ceux de la province
    await page.getByLabel(/département/i).selectOption({ index: 0 }) // Premier département
    
    // Remplir le code postal
    await page.getByLabel(/code postal/i).fill(newCommunePostalCode)
    
    // Vérifier que le bouton de soumission est activé
    const submitButton = page.getByTestId('step2-address-modal-commune-submit-button')
    await expect(submitButton).toBeEnabled()
    
    // ============================================
    // ÉTAPE 4 : Soumettre le formulaire
    // ============================================
    
    // Cliquer sur le bouton de soumission
    await submitButton.click()
    
    // Vérifier que le modal se ferme
    await expect(communeModal).not.toBeVisible({ timeout: 5000 })
    
    // ============================================
    // ÉTAPE 5 : Vérifier l'Optimistic Update
    // ============================================
    
    // Vérifier que la commune apparaît IMMÉDIATEMENT dans le Combobox
    const communeTrigger = page.getByTestId('step2-address-commune-trigger')
    await expect(communeTrigger).toContainText(newCommuneName, { timeout: 2000 })
    
    // Vérifier que la commune est sélectionnée automatiquement
    await expect(page.getByTestId('step2-address-commune-selected')).toBeVisible()
    await expect(page.getByTestId('step2-address-commune-selected')).toContainText(newCommuneName)
    
    // Vérifier que le badge de progression est mis à jour
    const communeBadge = page.getByTestId('step2-address-progression-commune-badge')
    await expect(communeBadge).toHaveClass(/success/, { timeout: 2000 })
    
    // ============================================
    // ÉTAPE 6 : Vérifier la sélection dans le Combobox
    // ============================================
    
    // Ouvrir le Combobox pour vérifier que la commune est dans la liste
    await communeTrigger.click()
    
    // Attendre que le popover s'ouvre
    await expect(page.getByTestId('step2-address-commune-popover')).toBeVisible()
    
    // Vérifier que la nouvelle commune est dans les résultats
    const results = page.getByTestId('step2-address-commune-results')
    await expect(results).toBeVisible()
    
    // Vérifier que la commune créée est présente
    const communeItem = page.getByTestId('step2-address-commune-result-item')
      .filter({ hasText: newCommuneName })
    await expect(communeItem).toBeVisible()
    
    // Vérifier que la commune créée est marquée comme sélectionnée
    await expect(communeItem).toHaveClass(/selected/)
    
    // Fermer le popover
    await page.keyboard.press('Escape')
    
    // ============================================
    // ÉTAPE 7 : Vérifier la cascade
    // ============================================
    
    // Vérifier que le district est maintenant déverrouillé
    const districtCombobox = page.getByTestId('step2-address-district-combobox')
    await expect(districtCombobox).toBeEnabled({ timeout: 2000 })
    
    // Vérifier que le message de verrouillage a disparu
    await expect(page.getByTestId('step2-address-district-locked-message')).not.toBeVisible()
    
    // Vérifier que le quarter reste verrouillé (pas encore de district sélectionné)
    const quarterCombobox = page.getByTestId('step2-address-quarter-combobox')
    await expect(quarterCombobox).toBeDisabled()
    
    // ============================================
    // ÉTAPE 8 : Vérifier le toast de succès
    // ============================================
    
    // Vérifier qu'un toast de succès apparaît
    const toast = page.locator('[role="status"]').filter({ hasText: newCommuneName })
    await expect(toast).toBeVisible({ timeout: 3000 })
    await expect(toast).toContainText('créée et sélectionnée')
  })

  test('E2E-COMMUNE-002: devrait permettre de sélectionner la commune créée depuis le Combobox', async ({ page }) => {
    // Prérequis : Créer une commune
    await openCommuneModal(page)
    await fillCommuneForm(page, {
      name: 'Commune Test Sélection',
      postalCode: '24198',
      departmentIndex: 0
    })
    await submitCommuneModal(page)
    
    // Attendre que la commune soit créée et sélectionnée
    await expect(page.getByTestId('step2-address-commune-selected'))
      .toContainText('Commune Test Sélection', { timeout: 3000 })
    
    // Désélectionner la commune (si possible)
    // Note: Cela dépend de l'implémentation
    
    // Ouvrir le Combobox
    await page.getByTestId('step2-address-commune-trigger').click()
    await expect(page.getByTestId('step2-address-commune-popover')).toBeVisible()
    
    // Rechercher la commune créée
    const searchInput = page.getByTestId('step2-address-commune-search-input')
    await searchInput.fill('Commune Test Sélection')
    
    // Attendre que les résultats se filtrent
    await page.waitForTimeout(500) // Attendre le debounce
    
    // Sélectionner la commune créée depuis la liste
    const communeItem = page.getByTestId('step2-address-commune-result-item')
      .filter({ hasText: 'Commune Test Sélection' })
    await expect(communeItem).toBeVisible()
    await communeItem.click()
    
    // Vérifier que la commune est sélectionnée
    await expect(page.getByTestId('step2-address-commune-selected'))
      .toContainText('Commune Test Sélection')
    
    // Vérifier que le district est déverrouillé
    await expect(page.getByTestId('step2-address-district-combobox')).toBeEnabled()
  })

  test('E2E-COMMUNE-003: devrait réinitialiser les niveaux enfants lors de la création', async ({ page }) => {
    // Prérequis : Avoir une cascade complète sélectionnée
    // (Province → Commune → District → Quarter)
    
    // Sélectionner une commune existante
    await selectCommuneFromCombobox(page, 'Libreville')
    
    // Sélectionner un district existant
    await page.getByTestId('step2-address-district-trigger').click()
    await page.getByTestId('step2-address-district-result-item').first().click()
    
    // Vérifier que le district est sélectionné
    await expect(page.getByTestId('step2-address-district-selected')).toBeVisible()
    
    // Créer une nouvelle commune
    await openCommuneModal(page)
    await fillCommuneForm(page, {
      name: 'Nouvelle Commune Reset',
      postalCode: '24197',
      departmentIndex: 0
    })
    await submitCommuneModal(page)
    
    // Vérifier que le district est réinitialisé
    await expect(page.getByTestId('step2-address-district-trigger'))
      .toContainText('Sélectionnez d\'abord une ville')
    
    // Vérifier que le quarter est réinitialisé
    await expect(page.getByTestId('step2-address-quarter-trigger'))
      .toContainText('Sélectionnez d\'abord un arrondissement')
    
    // Vérifier que les Combobox sont verrouillés
    await expect(page.getByTestId('step2-address-district-combobox')).toBeDisabled()
    await expect(page.getByTestId('step2-address-quarter-combobox')).toBeDisabled()
  })
})
```

## 🎯 Points critiques testés

1. **Optimistic Update** : La commune apparaît immédiatement sans attendre le refetch
2. **Sélection automatique** : La commune créée est automatiquement sélectionnée
3. **Cascade** : Le district est déverrouillé après sélection de la commune
4. **Cascade Reset** : Les niveaux enfants (district, quarter) sont réinitialisés lors de la création
5. **Progression** : Le badge de progression est mis à jour
6. **Toast** : Un message de succès apparaît
7. **Recherche** : La commune créée est trouvable via la recherche

## 📊 Test IDs utilisés

- `step2-address-province-selected`
- `step2-address-commune-combobox`
- `step2-address-commune-locked-message`
- `step2-address-commune-add-button`
- `step2-address-modal-commune`
- `step2-address-modal-commune-submit-button`
- `step2-address-commune-trigger`
- `step2-address-commune-selected`
- `step2-address-commune-popover`
- `step2-address-commune-results`
- `step2-address-commune-result-item`
- `step2-address-commune-search-input`
- `step2-address-progression-commune-badge`
- `step2-address-district-combobox`
- `step2-address-district-locked-message`
- `step2-address-quarter-combobox`

## 🔗 Références

- [Test IDs complets](../ui/test-ids.md)
- [Helpers de test](./step2-address-helpers.md)
