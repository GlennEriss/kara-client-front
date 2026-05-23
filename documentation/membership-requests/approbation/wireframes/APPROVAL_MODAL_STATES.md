# Wireframes - États du Modal d'Approbation

> Différents états visuels du modal d'approbation

---

## 📋 États

### 1. État Initial (Vide)

**Description** : Modal ouvert, aucun champ rempli

```
┌─────────────────────────────────────────────────────────────────┐
│  [X]                                                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Icon] ✅ Approuver une Demande d'Adhésion              │  │
│  │         Jean Dupont                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  👤 Type de Membre *                                      │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ [Select: Sélectionner...]                          │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  📄 Fiche d'Adhésion (PDF) *                             │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │                                                    │  │  │
│  │  │        [Icon: Upload]                             │  │  │
│  │  │        Glissez-déposez ou cliquez pour choisir     │  │  │
│  │  │        Format: PDF uniquement, Max: 10 MB          │  │  │
│  │  │                                                    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Annuler]  [Approuver (désactivé)]                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data-TestID** :
- `data-testid="approval-modal-approve-button"` (disabled)

---

### 2. État avec PDF Sélectionné

**Description** : PDF uploadé, prêt pour approbation

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  📄 Fiche d'Adhésion (PDF) *                             │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  [Icon: File] adhesion_jean_dupont_2024-2025.pdf  │  │  │
│  │  │  [X] Supprimer                                     │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Annuler]  [Approuver (actif)]                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data-TestID** :
- `data-testid="approval-modal-pdf-file-name"`
- `data-testid="approval-modal-pdf-remove-button"`
- `data-testid="approval-modal-approve-button"` (enabled)

---

### 3. État de Chargement

**Description** : Approbation en cours

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Annuler (désactivé)]  [🔄 Approuver...]                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ⏳ Approbation en cours...                               │  │
│  │  Veuillez patienter pendant le traitement.               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data-TestID** :
- `data-testid="approval-modal-loading-spinner"`
- `data-testid="approval-modal-loading-message"`
- `data-testid="approval-modal-approve-button"` (disabled avec spinner)

---

### 4. État d'Erreur - Validation

**Description** : Erreur de validation (champ manquant)

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  👤 Type de Membre *                                      │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ [Select: Sélectionner...]                          │  │  │
│  │  │ ❌ Le type de membre est requis                    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  📄 Fiche d'Adhésion (PDF) *                             │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ [Zone vide]                                         │  │  │
│  │  │ ❌ Le PDF d'adhésion est requis                     │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data-TestID** :
- `data-testid="approval-modal-error-message"`
- `data-testid="approval-modal-membership-type-error"`
- `data-testid="approval-modal-pdf-error"`

---

### 5. État d'Erreur - API

**Description** : Erreur lors de l'appel API

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ❌ Erreur lors de l'approbation                         │  │
│  │  {message d'erreur de l'API}                            │  │
│  │  [Bouton: Réessayer]                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Annuler]  [Approuver]                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data-TestID** :
- `data-testid="approval-modal-api-error"`
- `data-testid="approval-modal-retry-button"`

---

### 6. État de Succès (Toast)

**Description** : Toast de succès après approbation

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ Demande approuvée avec succès                               │
│  Jean Dupont est maintenant membre Adhérent.                    │
│  Matricule: 1234.MK.567890                                      │
│  Email: jeandupont1234@kara.ga                                 │
│  PDF téléchargé automatiquement                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Data-TestID** :
- `data-testid="approval-success-toast"`
- `data-testid="approval-success-matricule"`
- `data-testid="approval-success-email"`

---

### 7. État avec Entreprise/Profession

**Description** : Affichage de l'entreprise et profession depuis le dossier

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🏢 Entreprise                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Nom: KARA Association                                 │  │  │
│  │  │ [Badge: ✅ Existe]                                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  💼 Profession                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Nom: Développeur                                    │  │  │
│  │  │ [Badge: ⚠️ N'existe pas]                           │  │  │
│  │  │ [Bouton: Créer la profession]                       │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data-TestID** :
- `data-testid="approval-modal-company-exists-badge"`
- `data-testid="approval-modal-profession-exists-badge"`
- `data-testid="approval-modal-create-profession-button"`

---

## 🎨 Couleurs par État

### Succès
- **Couleur** : `#10b981` (vert)
- **Background** : `bg-green-50`
- **Border** : `border-green-200`
- **Text** : `text-green-800`

### Erreur
- **Couleur** : `#ef4444` (rouge)
- **Background** : `bg-red-50`
- **Border** : `border-red-200`
- **Text** : `text-red-800`

### Chargement
- **Couleur** : `#234D65` (KARA Blue)
- **Spinner** : `animate-spin`

### Warning
- **Couleur** : `#f59e0b` (orange)
- **Background** : `bg-orange-50`
- **Border** : `border-orange-200`
- **Text** : `text-orange-800`

---

## 📖 Références

- **Composant Toast** : `sonner` (toast.success, toast.error)
- **Composant Spinner** : `Loader2` de `lucide-react`
- **Composant Alert** : `src/components/ui/alert.tsx`
