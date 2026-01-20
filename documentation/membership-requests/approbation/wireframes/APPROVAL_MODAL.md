# Wireframe - Modal d'Approbation

> Wireframe détaillé du modal d'approbation avec data-testid

---

## 🎨 Design

### Structure du Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  [X]                                                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Icon] ✅ Approuver une Demande d'Adhésion              │  │
│  │         {firstName} {lastName}                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  📋 Informations du Dossier                              │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Matricule: {matricule}                             │  │  │
│  │  │ Statut: [Badge: En attente]                        │  │  │
│  │  │ Paiement: [Badge: Payé / Non payé]                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🏢 Entreprise (si isEmployed === true)                  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Nom: {companyName} [Badge: Existe / N'existe pas] │  │  │
│  │  │ [Bouton: Créer l'entreprise] (si n'existe pas)   │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  💼 Profession (si isEmployed === true)                  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Nom: {profession} [Badge: Existe / N'existe pas]  │  │  │
│  │  │ [Bouton: Créer la profession] (si n'existe pas)   │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  👤 Type de Membre *                                      │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ [Select] Adhérent | Bienfaiteur | Sympathisant     │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  📄 Fiche d'Adhésion (PDF) *                             │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ [Zone de drop] ou [Bouton: Choisir un fichier]    │  │  │
│  │  │ Format: PDF uniquement, Max: 10 MB                 │  │  │
│  │  │ [Aperçu du fichier sélectionné]                    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Bouton: Annuler]  [Bouton: Approuver]                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Détails Visuels

### Header du Modal

**Couleur** : Gradient KARA Blue
- **Icon Container** : `bg-gradient-to-br from-[#234D65] to-[#2c5a73]`
- **Title** : `bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent`
- **Font** : `text-2xl font-bold`

### Sections

**Couleur de fond** : `bg-white` ou `bg-gradient-to-br from-white to-gray-50`
**Bordure** : `border border-gray-200`
**Padding** : `p-4` ou `p-6`
**Espacement** : `space-y-4`

### Boutons

**Bouton Primaire (Approuver)** :
- **Couleur** : `bg-[#234D65] hover:bg-[#234D65]/90`
- **Texte** : `text-white`
- **Taille** : `px-6 py-2`

**Bouton Secondaire (Annuler)** :
- **Variant** : `variant="outline"`
- **Couleur bordure** : `border-gray-300`

### Badges

**Statut** : Utiliser les composants Badge existants
**Paiement** : Badge vert (payé) / Badge rouge (non payé)
**Existence** : Badge bleu (existe) / Badge orange (n'existe pas)

---

## 🏷️ Data-TestID

### Structure Principale

```typescript
// Modal Container
data-testid="approval-modal"

// Header
data-testid="approval-modal-header"
data-testid="approval-modal-title"
data-testid="approval-modal-close-button"

// Informations du Dossier
data-testid="approval-modal-dossier-section"
data-testid="approval-modal-matricule"
data-testid="approval-modal-status-badge"
data-testid="approval-modal-payment-badge"

// Entreprise (si applicable)
data-testid="approval-modal-company-section"
data-testid="approval-modal-company-name"
data-testid="approval-modal-company-exists-badge"
data-testid="approval-modal-create-company-button"

// Profession (si applicable)
data-testid="approval-modal-profession-section"
data-testid="approval-modal-profession-name"
data-testid="approval-modal-profession-exists-badge"
data-testid="approval-modal-create-profession-button"

// Type de Membre
data-testid="approval-modal-membership-type-section"
data-testid="approval-modal-membership-type-select"

// PDF d'Adhésion
data-testid="approval-modal-pdf-section"
data-testid="approval-modal-pdf-upload-zone"
data-testid="approval-modal-pdf-file-input"
data-testid="approval-modal-pdf-file-name"
data-testid="approval-modal-pdf-remove-button"

// Actions
data-testid="approval-modal-cancel-button"
data-testid="approval-modal-approve-button"
data-testid="approval-modal-loading-spinner"
```

---

## 📱 Responsive Design

### Desktop (> 1024px)
- **Largeur du modal** : `max-w-2xl` ou `max-w-3xl`
- **Padding** : `p-6`
- **Espacement** : `space-y-6`

### Tablet (768px - 1024px)
- **Largeur du modal** : `max-w-xl`
- **Padding** : `p-5`
- **Espacement** : `space-y-5`

### Mobile (< 768px)
- **Largeur du modal** : `w-[95vw]`
- **Padding** : `p-4`
- **Espacement** : `space-y-4`
- **Boutons** : Stack vertical (`flex-col`)

---

## ✅ Validation

### Champs Obligatoires
- ✅ Type de membre (select)
- ✅ PDF d'adhésion (file upload)

### Validation Visuelle
- **Champs requis** : Afficher `*` après le label
- **Erreur** : Bordure rouge + message d'erreur
- **Succès** : Bordure verte (après validation)

---

## 🎯 États du Modal

### 1. État Initial
- Tous les champs sont vides
- Bouton "Approuver" désactivé si PDF manquant

### 2. État de Chargement
- Spinner sur le bouton "Approuver"
- Boutons désactivés
- Message "Approbation en cours..."

### 3. État d'Erreur
- Message d'erreur affiché
- Boutons réactivés
- Champs modifiables

### 4. État de Succès
- Toast de succès
- Modal fermé automatiquement
- Liste des demandes rafraîchie

---

## 📖 Références

- **Composant Shadcn Dialog** : `src/components/ui/dialog.tsx`
- **Composant Shadcn Select** : `src/components/ui/select.tsx`
- **Composant Shadcn Button** : `src/components/ui/button.tsx`
- **Composant Shadcn Badge** : `src/components/ui/badge.tsx`
