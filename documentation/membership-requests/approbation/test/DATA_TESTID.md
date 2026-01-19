# Data-TestID - Approbation d'une Demande d'Adhésion

> Liste complète des attributs `data-testid` pour les tests E2E

---

## 📋 Vue d'ensemble

Cette documentation liste tous les `data-testid` nécessaires pour les tests E2E de la fonctionnalité d'approbation.

---

## 🏷️ Structure des Data-TestID

### Convention de Nommage

Format : `{feature}-{component}-{element}`

Exemples :
- `approval-modal-header`
- `approval-modal-approve-button`
- `approval-success-toast`

---

## 📱 Modal d'Approbation

### Container Principal

```typescript
data-testid="approval-modal"                    // Container principal du modal
data-testid="approval-modal-backdrop"           // Backdrop (overlay)
```

### Header

```typescript
data-testid="approval-modal-header"             // Header du modal
data-testid="approval-modal-title"              // Titre "Approuver une Demande d'Adhésion"
data-testid="approval-modal-subtitle"           // Sous-titre (nom du demandeur)
data-testid="approval-modal-close-button"       // Bouton de fermeture (X)
```

### Section Informations du Dossier

```typescript
data-testid="approval-modal-dossier-section"   // Section "Informations du Dossier"
data-testid="approval-modal-matricule"         // Affichage du matricule
data-testid="approval-modal-status-badge"       // Badge du statut
data-testid="approval-modal-payment-badge"     // Badge de paiement
```

### Section Entreprise (si applicable)

```typescript
data-testid="approval-modal-company-section"           // Section "Entreprise"
data-testid="approval-modal-company-name"               // Nom de l'entreprise
data-testid="approval-modal-company-exists-badge"       // Badge "Existe" / "N'existe pas"
data-testid="approval-modal-create-company-button"     // Bouton "Créer l'entreprise"
data-testid="approval-modal-company-id"                 // ID de l'entreprise (si créée)
```

### Section Profession (si applicable)

```typescript
data-testid="approval-modal-profession-section"         // Section "Profession"
data-testid="approval-modal-profession-name"            // Nom de la profession
data-testid="approval-modal-profession-exists-badge"    // Badge "Existe" / "N'existe pas"
data-testid="approval-modal-create-profession-button"   // Bouton "Créer la profession"
data-testid="approval-modal-profession-id"              // ID de la profession (si créée)
```

### Section Type de Membre

```typescript
data-testid="approval-modal-membership-type-section"    // Section "Type de Membre"
data-testid="approval-modal-membership-type-select"    // Select pour le type de membre
data-testid="approval-modal-membership-type-option-adherant"      // Option "Adhérent"
data-testid="approval-modal-membership-type-option-bienfaiteur"   // Option "Bienfaiteur"
data-testid="approval-modal-membership-type-option-sympathisant"  // Option "Sympathisant"
data-testid="approval-modal-membership-type-error"      // Message d'erreur (si champ requis)
```

### Section PDF d'Adhésion

```typescript
data-testid="approval-modal-pdf-section"               // Section "Fiche d'Adhésion"
data-testid="approval-modal-pdf-upload-zone"           // Zone de drop/upload
data-testid="approval-modal-pdf-file-input"           // Input file (caché)
data-testid="approval-modal-pdf-choose-button"         // Bouton "Choisir un fichier"
data-testid="approval-modal-pdf-file-name"             // Nom du fichier sélectionné
data-testid="approval-modal-pdf-file-size"            // Taille du fichier
data-testid="approval-modal-pdf-remove-button"         // Bouton "Supprimer" le fichier
data-testid="approval-modal-pdf-error"                // Message d'erreur (si requis)
data-testid="approval-modal-pdf-format-hint"          // Indication "PDF uniquement, Max: 10 MB"
```

### Actions (Footer)

```typescript
data-testid="approval-modal-cancel-button"              // Bouton "Annuler"
data-testid="approval-modal-approve-button"            // Bouton "Approuver"
data-testid="approval-modal-loading-spinner"          // Spinner de chargement
data-testid="approval-modal-loading-message"           // Message "Approbation en cours..."
```

### États d'Erreur

```typescript
data-testid="approval-modal-error-message"             // Message d'erreur général
data-testid="approval-modal-api-error"                 // Erreur API
data-testid="approval-modal-retry-button"              // Bouton "Réessayer"
```

---

## 🎉 Toast de Succès

```typescript
data-testid="approval-success-toast"                  // Container du toast de succès
data-testid="approval-success-title"                  // Titre "Demande approuvée avec succès"
data-testid="approval-success-description"             // Description complète
data-testid="approval-success-matricule"               // Matricule affiché
data-testid="approval-success-email"                   // Email affiché
data-testid="approval-success-membership-type"         // Type de membre affiché
data-testid="approval-success-pdf-downloaded"         // Message "PDF téléchargé automatiquement"
```

---

## 📋 Liste des Demandes (Page Principale)

### Bouton Approuver

```typescript
data-testid="membership-request-approve-button-{requestId}"  // Bouton "Approuver" sur la carte
```

### Badge de Paiement

```typescript
data-testid="membership-request-payment-badge-{requestId}"   // Badge de paiement
```

---

## 🔍 Modals de Confirmation

### Modal Créer Entreprise

```typescript
data-testid="create-company-modal"                    // Modal de création d'entreprise
data-testid="create-company-name-input"               // Input nom de l'entreprise
data-testid="create-company-confirm-button"           // Bouton "Créer"
data-testid="create-company-cancel-button"           // Bouton "Annuler"
```

### Modal Créer Profession

```typescript
data-testid="create-profession-modal"                // Modal de création de profession
data-testid="create-profession-name-input"           // Input nom de la profession
data-testid="create-profession-confirm-button"       // Bouton "Créer"
data-testid="create-profession-cancel-button"        // Bouton "Annuler"
```

---

## 📊 Résumé par Composant

### Modal d'Approbation
- **Total** : ~35 data-testid
- **Sections** : 6 sections principales
- **Actions** : 2 boutons principaux

### Toast de Succès
- **Total** : ~7 data-testid
- **Informations** : Matricule, Email, Type de membre

### Modals de Confirmation
- **Total** : ~8 data-testid
- **Modals** : Créer entreprise, Créer profession

---

## 🧪 Utilisation dans les Tests

### Exemple Playwright

```typescript
// Ouvrir le modal
await page.click('[data-testid="membership-request-approve-button-123"]')

// Sélectionner le type de membre
await page.click('[data-testid="approval-modal-membership-type-select"]')
await page.click('[data-testid="approval-modal-membership-type-option-adherant"]')

// Uploader le PDF
const fileInput = page.locator('[data-testid="approval-modal-pdf-file-input"]')
await fileInput.setInputFiles('path/to/file.pdf')

// Approuver
await page.click('[data-testid="approval-modal-approve-button"]')

// Vérifier le toast de succès
await expect(page.locator('[data-testid="approval-success-toast"]')).toBeVisible()
await expect(page.locator('[data-testid="approval-success-matricule"]')).toContainText('1234.MK.567890')
```

---

## 📖 Références

- **Wireframes** : `../wireframes/APPROVAL_MODAL.md`
- **Tests E2E** : `TESTS_E2E.md`
- **Documentation Playwright** : https://playwright.dev/
