# Test E2E - Cascade Complète avec Création

## 📋 Vue d'ensemble

Test E2E complet pour la cascade complète avec création de toutes les entités : Province → Commune → Districts (2-3) → Quarter.

## 🎯 Objectifs

Vérifier que :
1. Un admin peut créer toute la cascade complète
2. Chaque entité créée apparaît **immédiatement** (Optimistic Update)
3. Chaque entité créée peut être **sélectionnée** immédiatement
4. La cascade fonctionne correctement à chaque niveau
5. Le résumé final est correct

## 📝 Test complet

### E2E-FULL-001 : Cascade complète avec création

```typescript
import { test, expect } from '@playwright/test'
import { loginAsAdmin, navigateToMembershipForm } from '../helpers/auth-helpers'
import { 
  openProvinceModal,
  fillProvinceForm,
  submitProvinceModal,
  openCommuneModal,
  fillCommuneForm,
  submitCommuneModal,
  openDistrictModal,
  fillDistrictForm,
  submitDistrictModal,
  openQuarterModal,
  fillQuarterForm,
  submitQuarterModal
} from '../step2-address-helpers'

test.describe('Step2 Adresse - Cascade Complète avec Création', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await navigateToMembershipForm(page)
    await page.getByTestId('membership-form-step-2').click()
  })

  test('E2E-FULL-001: devrait créer toute la cascade complète (Province → Commune → 3 Districts → Quarter)', async ({ page }) => {
    // ============================================
    // ÉTAPE 1 : Créer et sélectionner une province
    // ============================================
    
    const provinceName = 'Province Cascade Test'
    
    // Créer la province
    await openProvinceModal(page)
    await fillProvinceForm(page, {
      name: provinceName,
      code: 'PCT'
    })
    await submitProvinceModal(page)
    
    // Vérifier que la province est créée et sélectionnée
    await expect(page.getByTestId('step2-address-province-selected'))
      .toContainText(provinceName, { timeout: 3000 })
    
    // Vérifier que la commune est déverrouillée
    await expect(page.getByTestId('step2-address-commune-combobox')).toBeEnabled()
    
    // Vérifier la progression
    await expect(page.getByTestId('step2-address-progression-province-badge'))
      .toHaveClass(/success/)
    
    // ============================================
    // ÉTAPE 2 : Créer et sélectionner une commune
    // ============================================
    
    const communeName = 'Commune Cascade Test'
    
    // Créer la commune
    await openCommuneModal(page)
    await fillCommuneForm(page, {
      name: communeName,
      postalCode: '24999',
      departmentIndex: 0
    })
    await submitCommuneModal(page)
    
    // Vérifier que la commune est créée et sélectionnée
    await expect(page.getByTestId('step2-address-commune-selected'))
      .toContainText(communeName, { timeout: 3000 })
    
    // Vérifier que le district est déverrouillé
    await expect(page.getByTestId('step2-address-district-combobox')).toBeEnabled()
    
    // Vérifier la progression
    await expect(page.getByTestId('step2-address-progression-commune-badge'))
      .toHaveClass(/success/)
    
    // ============================================
    // ÉTAPE 3 : Créer 3 districts et sélectionner le deuxième
    // ============================================
    
    const district1Name = 'District Cascade 1'
    const district2Name = 'District Cascade 2'
    const district3Name = 'District Cascade 3'
    
    // Créer le premier district
    await openDistrictModal(page)
    await fillDistrictForm(page, { name: district1Name })
    await submitDistrictModal(page)
    
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText(district1Name, { timeout: 2000 })
    
    // Créer le deuxième district
    await openDistrictModal(page)
    await fillDistrictForm(page, { name: district2Name })
    await submitDistrictModal(page)
    
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText(district2Name, { timeout: 2000 })
    
    // Créer le troisième district
    await openDistrictModal(page)
    await fillDistrictForm(page, { name: district3Name })
    await submitDistrictModal(page)
    
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText(district3Name, { timeout: 2000 })
    
    // Ouvrir le Combobox pour sélectionner le deuxième district
    await page.getByTestId('step2-address-district-trigger').click()
    await expect(page.getByTestId('step2-address-district-popover')).toBeVisible()
    
    // Sélectionner le deuxième district
    const district2Item = page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: district2Name })
    await expect(district2Item).toBeVisible()
    await district2Item.click()
    
    // Vérifier que le deuxième district est sélectionné
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText(district2Name)
    
    // Vérifier que le quarter est déverrouillé
    await expect(page.getByTestId('step2-address-quarter-combobox')).toBeEnabled()
    
    // Vérifier la progression
    await expect(page.getByTestId('step2-address-progression-district-badge'))
      .toHaveClass(/success/)
    
    // ============================================
    // ÉTAPE 4 : Créer et sélectionner un quarter
    // ============================================
    
    const quarterName = 'Quarter Cascade Test'
    
    // Créer le quarter
    await openQuarterModal(page)
    await fillQuarterForm(page, { name: quarterName })
    await submitQuarterModal(page)
    
    // Vérifier que le quarter est créé et sélectionné
    await expect(page.getByTestId('step2-address-quarter-selected'))
      .toContainText(quarterName, { timeout: 3000 })
    
    // Vérifier la progression
    await expect(page.getByTestId('step2-address-progression-quarter-badge'))
      .toHaveClass(/success/)
    
    // ============================================
    // ÉTAPE 5 : Vérifier le résumé final
    // ============================================
    
    // Vérifier que le résumé apparaît
    const summaryContainer = page.getByTestId('step2-address-summary-container')
    await expect(summaryContainer).toBeVisible({ timeout: 2000 })
    
    // Vérifier la hiérarchie complète
    const hierarchy = page.getByTestId('step2-address-summary-hierarchy')
    await expect(hierarchy).toContainText(provinceName)
    await expect(hierarchy).toContainText(communeName)
    await expect(hierarchy).toContainText(district2Name) // Le district sélectionné
    await expect(hierarchy).toContainText(quarterName)
    
    // Vérifier le format de la hiérarchie
    await expect(hierarchy).toContainText('>') // Séparateur
    
    // Vérifier le message de validation
    const validationMessage = page.getByTestId('step2-address-summary-validation-message')
    await expect(validationMessage).toBeVisible()
    await expect(validationMessage).toContainText('Adresse complète')
    
    // ============================================
    // ÉTAPE 6 : Vérifier que tous les districts sont disponibles
    // ============================================
    
    // Ouvrir le Combobox district pour vérifier
    await page.getByTestId('step2-address-district-trigger').click()
    await expect(page.getByTestId('step2-address-district-popover')).toBeVisible()
    
    // Vérifier que les 3 districts sont présents
    await expect(page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: district1Name })).toBeVisible()
    await expect(page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: district2Name })).toBeVisible()
    await expect(page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: district3Name })).toBeVisible()
    
    // Fermer le popover
    await page.keyboard.press('Escape')
    
    // ============================================
    // ÉTAPE 7 : Vérifier la progression complète
    // ============================================
    
    // Vérifier que tous les badges sont en succès
    await expect(page.getByTestId('step2-address-progression-province-badge'))
      .toHaveClass(/success/)
    await expect(page.getByTestId('step2-address-progression-commune-badge'))
      .toHaveClass(/success/)
    await expect(page.getByTestId('step2-address-progression-district-badge'))
      .toHaveClass(/success/)
    await expect(page.getByTestId('step2-address-progression-quarter-badge'))
      .toHaveClass(/success/)
  })

  test('E2E-FULL-002: devrait créer 2 districts et sélectionner le premier', async ({ page }) => {
    // Créer province
    await openProvinceModal(page)
    await fillProvinceForm(page, { name: 'Province 2 Districts', code: 'P2D' })
    await submitProvinceModal(page)
    
    // Créer commune
    await openCommuneModal(page)
    await fillCommuneForm(page, { name: 'Commune 2 Districts', postalCode: '24998', departmentIndex: 0 })
    await submitCommuneModal(page)
    
    // Créer le premier district
    await openDistrictModal(page)
    await fillDistrictForm(page, { name: 'District Premier' })
    await submitDistrictModal(page)
    
    // Créer le deuxième district
    await openDistrictModal(page)
    await fillDistrictForm(page, { name: 'District Second' })
    await submitDistrictModal(page)
    
    // Sélectionner le premier district
    await page.getByTestId('step2-address-district-trigger').click()
    await expect(page.getByTestId('step2-address-district-popover')).toBeVisible()
    
    const district1Item = page.getByTestId('step2-address-district-result-item')
      .filter({ hasText: 'District Premier' })
    await district1Item.click()
    
    // Vérifier que le premier district est sélectionné
    await expect(page.getByTestId('step2-address-district-selected'))
      .toContainText('District Premier')
    
    // Créer et sélectionner un quarter
    await openQuarterModal(page)
    await fillQuarterForm(page, { name: 'Quarter Final' })
    await submitQuarterModal(page)
    
    // Vérifier le résumé
    await expect(page.getByTestId('step2-address-summary-container')).toBeVisible()
    await expect(page.getByTestId('step2-address-summary-hierarchy'))
      .toContainText('District Premier')
  })
})
```

## 🎯 Points critiques testés

1. **Cascade complète** : Tous les niveaux sont créés et sélectionnés
2. **Optimistic Update** : Chaque entité apparaît immédiatement
3. **Sélection multiple** : Création de 2-3 districts et sélection de l'un d'eux
4. **Résumé final** : Le résumé affiche correctement toute la hiérarchie
5. **Progression** : Tous les badges de progression sont en succès
6. **Disponibilité** : Toutes les entités créées sont disponibles dans les Combobox

## 📊 Test IDs utilisés

Tous les test IDs documentés dans [test-ids.md](../ui/test-ids.md) sont utilisés dans ce test.

## 🔗 Références

- [Test IDs complets](../ui/test-ids.md)
- [Helpers de test](./step2-address-helpers.md)
- [Documentation principale](../../README.md)
