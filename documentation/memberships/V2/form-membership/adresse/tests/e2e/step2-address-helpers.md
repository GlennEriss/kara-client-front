# Helpers E2E - Step2 Adresse

## 📋 Vue d'ensemble

Helpers réutilisables pour les tests E2E de Step2 Adresse.

## 🛠️ Helpers de sélection

### selectProvince

```typescript
/**
 * Sélectionne une province depuis le Combobox
 * @param page - Page Playwright
 * @param provinceName - Nom de la province à sélectionner
 */
export async function selectProvince(page: Page, provinceName: string) {
  // Ouvrir le Combobox
  await page.getByTestId('step2-address-province-trigger').click()
  
  // Attendre que le popover s'ouvre
  await expect(page.getByTestId('step2-address-province-popover')).toBeVisible()
  
  // Rechercher la province (optionnel)
  const searchInput = page.getByTestId('step2-address-province-search-input')
  if (await searchInput.isVisible()) {
    await searchInput.fill(provinceName)
    await page.waitForTimeout(500) // Attendre le debounce
  }
  
  // Sélectionner la province
  const provinceItem = page.getByTestId('step2-address-province-result-item')
    .filter({ hasText: provinceName })
  await expect(provinceItem).toBeVisible()
  await provinceItem.click()
  
  // Vérifier que la province est sélectionnée
  await expect(page.getByTestId('step2-address-province-selected'))
    .toContainText(provinceName, { timeout: 3000 })
}
```

### selectCommune

```typescript
/**
 * Sélectionne une commune depuis le Combobox
 * @param page - Page Playwright
 * @param communeName - Nom de la commune à sélectionner
 */
export async function selectCommune(page: Page, communeName: string) {
  // Vérifier que la commune est déverrouillée
  await expect(page.getByTestId('step2-address-commune-combobox')).toBeEnabled()
  
  // Ouvrir le Combobox
  await page.getByTestId('step2-address-commune-trigger').click()
  
  // Attendre que le popover s'ouvre
  await expect(page.getByTestId('step2-address-commune-popover')).toBeVisible()
  
  // Rechercher la commune
  const searchInput = page.getByTestId('step2-address-commune-search-input')
  await searchInput.fill(communeName)
  await page.waitForTimeout(500) // Attendre le debounce
  
  // Sélectionner la commune
  const communeItem = page.getByTestId('step2-address-commune-result-item')
    .filter({ hasText: communeName })
  await expect(communeItem).toBeVisible()
  await communeItem.click()
  
  // Vérifier que la commune est sélectionnée
  await expect(page.getByTestId('step2-address-commune-selected'))
    .toContainText(communeName, { timeout: 3000 })
}
```

### selectDistrict

```typescript
/**
 * Sélectionne un district depuis le Combobox
 * @param page - Page Playwright
 * @param districtName - Nom du district à sélectionner
 */
export async function selectDistrict(page: Page, districtName: string) {
  // Vérifier que le district est déverrouillé
  await expect(page.getByTestId('step2-address-district-combobox')).toBeEnabled()
  
  // Ouvrir le Combobox
  await page.getByTestId('step2-address-district-trigger').click()
  
  // Attendre que le popover s'ouvre
  await expect(page.getByTestId('step2-address-district-popover')).toBeVisible()
  
  // Rechercher le district
  const searchInput = page.getByTestId('step2-address-district-search-input')
  await searchInput.fill(districtName)
  await page.waitForTimeout(500) // Attendre le debounce
  
  // Sélectionner le district
  const districtItem = page.getByTestId('step2-address-district-result-item')
    .filter({ hasText: districtName })
  await expect(districtItem).toBeVisible()
  await districtItem.click()
  
  // Vérifier que le district est sélectionné
  await expect(page.getByTestId('step2-address-district-selected'))
    .toContainText(districtName, { timeout: 3000 })
}
```

### selectQuarter

```typescript
/**
 * Sélectionne un quarter depuis le Combobox
 * @param page - Page Playwright
 * @param quarterName - Nom du quarter à sélectionner
 */
export async function selectQuarter(page: Page, quarterName: string) {
  // Vérifier que le quarter est déverrouillé
  await expect(page.getByTestId('step2-address-quarter-combobox')).toBeEnabled()
  
  // Ouvrir le Combobox
  await page.getByTestId('step2-address-quarter-trigger').click()
  
  // Attendre que le popover s'ouvre
  await expect(page.getByTestId('step2-address-quarter-popover')).toBeVisible()
  
  // Rechercher le quarter
  const searchInput = page.getByTestId('step2-address-quarter-search-input')
  await searchInput.fill(quarterName)
  await page.waitForTimeout(500) // Attendre le debounce
  
  // Sélectionner le quarter
  const quarterItem = page.getByTestId('step2-address-quarter-result-item')
    .filter({ hasText: quarterName })
  await expect(quarterItem).toBeVisible()
  await quarterItem.click()
  
  // Vérifier que le quarter est sélectionné
  await expect(page.getByTestId('step2-address-quarter-selected'))
    .toContainText(quarterName, { timeout: 3000 })
}
```

## 🛠️ Helpers de création

### openProvinceModal

```typescript
/**
 * Ouvre le modal de création de province
 * @param page - Page Playwright
 */
export async function openProvinceModal(page: Page) {
  await page.getByTestId('step2-address-province-add-button').click()
  await expect(page.getByTestId('step2-address-modal-province')).toBeVisible()
}
```

### fillProvinceForm

```typescript
/**
 * Remplit le formulaire de création de province
 * @param page - Page Playwright
 * @param data - Données de la province
 */
export async function fillProvinceForm(
  page: Page,
  data: { name: string; code: string }
) {
  await page.getByLabel(/nom de la province/i).fill(data.name)
  await page.getByLabel(/code/i).fill(data.code)
}
```

### submitProvinceModal

```typescript
/**
 * Soumet le formulaire de création de province
 * @param page - Page Playwright
 */
export async function submitProvinceModal(page: Page) {
  await page.getByTestId('step2-address-modal-province-submit-button').click()
  await expect(page.getByTestId('step2-address-modal-province')).not.toBeVisible({ timeout: 5000 })
}
```

### openCommuneModal

```typescript
/**
 * Ouvre le modal de création de commune
 * @param page - Page Playwright
 */
export async function openCommuneModal(page: Page) {
  await page.getByTestId('step2-address-commune-add-button').click()
  await expect(page.getByTestId('step2-address-modal-commune')).toBeVisible()
}
```

### fillCommuneForm

```typescript
/**
 * Remplit le formulaire de création de commune
 * @param page - Page Playwright
 * @param data - Données de la commune
 */
export async function fillCommuneForm(
  page: Page,
  data: { name: string; postalCode: string; departmentIndex: number }
) {
  await page.getByLabel(/nom de la commune/i).fill(data.name)
  await page.getByLabel(/code postal/i).fill(data.postalCode)
  await page.getByLabel(/département/i).selectOption({ index: data.departmentIndex })
}
```

### submitCommuneModal

```typescript
/**
 * Soumet le formulaire de création de commune
 * @param page - Page Playwright
 */
export async function submitCommuneModal(page: Page) {
  await page.getByTestId('step2-address-modal-commune-submit-button').click()
  await expect(page.getByTestId('step2-address-modal-commune')).not.toBeVisible({ timeout: 5000 })
}
```

### openDistrictModal

```typescript
/**
 * Ouvre le modal de création de district
 * @param page - Page Playwright
 */
export async function openDistrictModal(page: Page) {
  await page.getByTestId('step2-address-district-add-button').click()
  await expect(page.getByTestId('step2-address-modal-district')).toBeVisible()
}
```

### fillDistrictForm

```typescript
/**
 * Remplit le formulaire de création de district
 * @param page - Page Playwright
 * @param data - Données du district
 */
export async function fillDistrictForm(
  page: Page,
  data: { name: string }
) {
  await page.getByLabel(/nom de l'arrondissement/i).fill(data.name)
}
```

### submitDistrictModal

```typescript
/**
 * Soumet le formulaire de création de district
 * @param page - Page Playwright
 */
export async function submitDistrictModal(page: Page) {
  await page.getByTestId('step2-address-modal-district-submit-button').click()
  await expect(page.getByTestId('step2-address-modal-district')).not.toBeVisible({ timeout: 5000 })
}
```

### openQuarterModal

```typescript
/**
 * Ouvre le modal de création de quarter
 * @param page - Page Playwright
 */
export async function openQuarterModal(page: Page) {
  await page.getByTestId('step2-address-quarter-add-button').click()
  await expect(page.getByTestId('step2-address-modal-quarter')).toBeVisible()
}
```

### fillQuarterForm

```typescript
/**
 * Remplit le formulaire de création de quarter
 * @param page - Page Playwright
 * @param data - Données du quarter
 */
export async function fillQuarterForm(
  page: Page,
  data: { name: string }
) {
  await page.getByLabel(/nom du quartier/i).fill(data.name)
}
```

### submitQuarterModal

```typescript
/**
 * Soumet le formulaire de création de quarter
 * @param page - Page Playwright
 */
export async function submitQuarterModal(page: Page) {
  await page.getByTestId('step2-address-modal-quarter-submit-button').click()
  await expect(page.getByTestId('step2-address-modal-quarter')).not.toBeVisible({ timeout: 5000 })
}
```

## 🛠️ Helpers de vérification

### waitForProvinceCombobox

```typescript
/**
 * Attend que le Combobox province soit prêt
 * @param page - Page Playwright
 */
export async function waitForProvinceCombobox(page: Page) {
  await expect(page.getByTestId('step2-address-province-combobox')).toBeVisible()
  await expect(page.getByTestId('step2-address-province-trigger')).toBeEnabled()
}
```

### waitForCommuneCombobox

```typescript
/**
 * Attend que le Combobox commune soit déverrouillé
 * @param page - Page Playwright
 */
export async function waitForCommuneCombobox(page: Page) {
  await expect(page.getByTestId('step2-address-commune-combobox')).toBeEnabled()
  await expect(page.getByTestId('step2-address-commune-locked-message')).not.toBeVisible()
}
```

### waitForDistrictCombobox

```typescript
/**
 * Attend que le Combobox district soit déverrouillé
 * @param page - Page Playwright
 */
export async function waitForDistrictCombobox(page: Page) {
  await expect(page.getByTestId('step2-address-district-combobox')).toBeEnabled()
  await expect(page.getByTestId('step2-address-district-locked-message')).not.toBeVisible()
}
```

### waitForQuarterCombobox

```typescript
/**
 * Attend que le Combobox quarter soit déverrouillé
 * @param page - Page Playwright
 */
export async function waitForQuarterCombobox(page: Page) {
  await expect(page.getByTestId('step2-address-quarter-combobox')).toBeEnabled()
  await expect(page.getByTestId('step2-address-quarter-locked-message')).not.toBeVisible()
}
```

## 📚 Utilisation

```typescript
import { selectProvince, openCommuneModal, fillCommuneForm, submitCommuneModal } from './step2-address-helpers'

test('exemple', async ({ page }) => {
  // Sélectionner une province
  await selectProvince(page, 'Estuaire')
  
  // Créer une commune
  await openCommuneModal(page)
  await fillCommuneForm(page, {
    name: 'Nouvelle Commune',
    postalCode: '24100',
    departmentIndex: 0
  })
  await submitCommuneModal(page)
})
```
