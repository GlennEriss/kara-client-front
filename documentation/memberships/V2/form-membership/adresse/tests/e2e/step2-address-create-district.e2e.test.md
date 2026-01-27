# Test E2E - Création et Sélection d'un District (Arrondissement)

## 📋 Vue d'ensemble

Test E2E complet pour la création et la sélection d'un district (arrondissement) dans Step2 Adresse, dans le contexte d'une commune sélectionnée.

## 🎯 Objectifs

Vérifier que :
1. Un admin peut créer plusieurs districts (2-3) dans une commune sélectionnée
2. Les districts créés apparaissent **immédiatement** dans le Combobox (Optimistic Update)
3. Un district créé peut être **sélectionné** immédiatement
4. Les quarters sont déverrouillés après sélection du district
5. La progression est mise à jour correctement

## 📝 Test complet

### E2E-DISTRICT-001 : Création de plusieurs districts et sélection

```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin, navigateToMembershipForm } from '../helpers/auth-helpers'
import { 
  selectProvince,
  selectCommune,
  waitForDistrictCombobox,
  openDistrictModal,
  fillDistrictForm,
  submitDistrictModal,
  selectDistrictFromCombobox
} from '../step2-address-helpers'

test.describe('Step2 Adresse - Création District', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToMembershipForm(page)
    await page.getByTestId('membership-form-step-2').click()
    
    // Prérequis : Sélectionner une province et une commune
    await selectProvince(page, 'Estuaire')
    await selectCommune(page, 'Libreville')
  })

  test('E2E-DISTRICT-001: devrait créer 3 districts et sélectionner l\'un d\'eux', async ({ page }) => {
    // ============================================
    // ÉTAPE 1 : Vérifier l'état après sélection commune
    // ============================================
    
    // Vérifier que la commune est sélectionnée
    await expect(page.getByTestId('step2-address-commune-selected'))
      .toContainText('Libreville')
    
    // Vérifier que le Combobox district est maintenant déverrouillé
    const districtCombobox = page.getByTestId('step2-address-district-combobox')
    await expect(districtCombobox).toBeEnabled()
    
    // Vérifier que le bouton d'ajout est visible et activé
    const addButton = page.getByTestId('step2-address-district-add-button')
    await expect(addButton).toBeVisible()
    await expect(addButton).toBeEnabled()
    
    // ============================================
    // ÉTAPE 2 : Créer le premier district
    // ============================================
    
    const district1Name = 'District Test 1'
    
    // Ouvrir le modal
    await addButton.click()
    await expect(page.getByTestId('step2-address-modal-district')).toBeVisible()
    
    // Remplir le formulaire
    await page.getByLabel(/nom de l'arrondissement/i).fill(district1Name)
    
    // Soumettre
    await page.getByTestId('step2-address-modal-district-submit-button').click()
    await expect(page.getByTestId('step2-address-modal-district')).not.toBeVisible({ timeout: 5000 })
    
    // Vérifier l'Optimistic Update
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText(district1Name, { timeout: 2000 })
    
    // ============================================
    // ÉTAPE 3 : Créer le deuxième district
    // ============================================
    
    const district2Name = 'District Test 2'
    
    // Ouvrir le modal à nouveau
    await page.getByTestId('step2-address-district-add-button').click()
    await expect(page.getByTestId('step2-address-modal-district')).toBeVisible()
    
    // Remplir le formulaire
    await page.getByLabel(/nom de l'arrondissement/i).fill(district2Name)
    
    // Soumettre
    await page.getByTestId('step2-address-modal-district-submit-button').click()
    await expect(page.getByTestId('step2-address-modal-district')).not.toBeVisible({ timeout: 5000 })
    
    // Vérifier l'Optimistic Update
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText(district2Name, { timeout: 2000 })
    
    // ============================================
    // ÉTAPE 4 : Créer le troisième district
    // ============================================
    
    const district3Name = 'District Test 3'
    
    // Ouvrir le modal à nouveau
    await page.getByTestId('step2-address-district-add-button').click()
    await expect(page.getByTestId('step2-address-modal-district')).toBeVisible()
    
    // Remplir le formulaire
    await page.getByLabel(/nom de l'arrondissement/i).fill(district3Name)
    
    // Soumettre
    await page.getByTestId('step2-address-modal-district-submit-button').click()
    await expect(page.getByTestId('step2-address-modal-district')).not.toBeVisible({ timeout: 5000 })
    
    // Vérifier l'Optimistic Update
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText(district3Name, { timeout: 2000 })
    
    // ============================================
    // ÉTAPE 5 : Vérifier que tous les districts sont dans le Combobox
    // ============================================
    
    // Ouvrir le Combobox
    const districtTrigger = page.getByTestId('step2-address-district-trigger')
    await districtTrigger.click()
    await expect(page.getByTestId('step2-address-district-popover')).toBeVisible()
    
    // Vérifier que les 3 districts sont présents
    const results = page.getByTestId('step2-address-district-results')
    await expect(results).toBeVisible()
    
    // Vérifier le premier district
    const district1Item = page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: district1Name })
    await expect(district1Item).toBeVisible()
    
    // Vérifier le deuxième district
    const district2Item = page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: district2Name })
    await expect(district2Item).toBeVisible()
    
    // Vérifier le troisième district
    const district3Item = page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: district3Name })
    await expect(district3Item).toBeVisible()
    
    // Vérifier que le troisième district est sélectionné (le dernier créé)
    await expect(district3Item).toHaveClass(/selected/)
    
    // ============================================
    // ÉTAPE 6 : Sélectionner le premier district créé
    // ============================================
    
    // Cliquer sur le premier district
    await district1Item.click()
    
    // Vérifier que le premier district est maintenant sélectionné
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText(district1Name)
    
    // Vérifier que le badge de progression est mis à jour
    const districtBadge = page.getByTestId('step2-address-progression-district-badge')
    await expect(districtBadge).toHaveClass(/success/)
    
    // ============================================
    // ÉTAPE 7 : Vérifier la cascade
    // ============================================
    
    // Vérifier que le quarter est maintenant déverrouillé
    const quarterCombobox = page.getByTestId('step2-address-quarter-combobox')
    await expect(quarterCombobox).toBeEnabled({ timeout: 2000 })
    
    // Vérifier que le message de verrouillage a disparu
    await expect(page.getByTestId('step2-address-quarter-locked-message')).not.toBeVisible()
  })

  test('E2E-DISTRICT-002: devrait créer 2 districts et sélectionner le deuxième', async ({ page }) => {
    // Créer le premier district
    await openDistrictModal(page)
    await fillDistrictForm(page, { name: 'District A' })
    await submitDistrictModal(page)
    
    // Attendre que le premier district soit sélectionné
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText('District A', { timeout: 2000 })
    
    // Créer le deuxième district
    await openDistrictModal(page)
    await fillDistrictForm(page, { name: 'District B' })
    await submitDistrictModal(page)
    
    // Attendre que le deuxième district soit sélectionné
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText('District B', { timeout: 2000 })
    
    // Ouvrir le Combobox
    await page.getByTestId('step2-address-district-trigger').click()
    await expect(page.getByTestId('step2-address-district-popover')).toBeVisible()
    
    // Vérifier que les 2 districts sont présents
    await expect(page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: 'District A' })).toBeVisible()
    await expect(page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: 'District B' })).toBeVisible()
    
    // Vérifier que le deuxième district est sélectionné
    const districtBItem = page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: 'District B' })
    await expect(districtBItem).toHaveClass(/selected/)
    
    // Sélectionner le premier district
    const districtAItem = page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: 'District A' })
    await districtAItem.click()
    
    // Vérifier que le premier district est maintenant sélectionné
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText('District A')
  })

  test('E2E-DISTRICT-003: devrait réinitialiser le quarter lors de la création d\'un nouveau district', async ({ page }) => {
    // Prérequis : Avoir un district et un quarter sélectionnés
    await openDistrictModal(page)
    await fillDistrictForm(page, { name: 'District Initial' })
    await submitDistrictModal(page)
    
    // Sélectionner un quarter existant (si disponible)
    await page.getByTestId('step2-address-quarter-trigger').click()
    const quarterItem = page.getByTestId('step2-address-quarter-result-item').first()
    if (await quarterItem.isVisible()) {
      await quarterItem.click()
      await expect(page.getByTestId('step2-address-quarter-selected')).toBeVisible()
    }
    
    // Créer un nouveau district
    await openDistrictModal(page)
    await fillDistrictForm(page, { name: 'Nouveau District Reset' })
    await submitDistrictModal(page)
    
    // Vérifier que le quarter est réinitialisé
    await expect(page.getByTestId('step2-address-quarter-trigger'))
      .toContainText('Sélectionnez d\'abord un arrondissement')
    
    // Vérifier que le Combobox quarter est verrouillé
    await expect(page.getByTestId('step2-address-quarter-combobox')).toBeDisabled()
  })
})
```

## 🎯 Points critiques testés

1. **Création multiple** : Création de 2-3 districts successifs
2. **Optimistic Update** : Chaque district apparaît immédiatement
3. **Sélection** : Sélection de n'importe quel district créé
4. **Cascade** : Le quarter est déverrouillé après sélection du district
5. **Cascade Reset** : Le quarter est réinitialisé lors de la création d'un nouveau district
6. **Progression** : Le badge de progression est mis à jour

## 📊 Test IDs utilisés

- `step2-address-commune-selected`
- `step2-address-district-combobox`
- `step2-address-district-add-button`
- `step2-address-modal-district`
- `step2-address-modal-district-submit-button`
- `step2-address-district-trigger`
- `step2-address-district-selected`
- `step2-address-district-popover`
- `step2-address-district-results`
- `step2-address-district-result-item`
- `step2-address-progression-district-badge`
- `step2-address-quarter-combobox`
- `step2-address-quarter-locked-message`

## 🔗 Références

- [Test IDs complets](../ui/test-ids.md)
- [Helpers de test](./step2-address-helpers.md)
