# Wireframe – État Sélectionné (Validé)

## Description

État du composant `IntermediaryCodeSearch` après qu'un membre ait été sélectionné et validé.

## Wireframe ASCII

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : INFORMATIONS D'IDENTITÉ                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🔍 Qui vous a référé? *                                   │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ [🔍] 1228.MK.0058                            [✓]    │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  │ ✅ Format valide                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Spécifications visuelles

### Input avec code sélectionné

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍] 1228.MK.0058                                    [✓]    │
└─────────────────────────────────────────────────────────────┘
```

**Styles** :
- Bordure : `border-[#CBB171]` (KARA Gold)
- Fond : `bg-[#CBB171]/5` (KARA Gold à 5% d'opacité)
- Texte : `text-sm font-mono tracking-wider text-gray-900`
- Icône validation : `w-5 h-5 text-green-500` à droite
- Transition : `transition-all duration-200`

**Animation** :
- L'icône de validation apparaît avec un zoom : `animate-in zoom-in-50 duration-200`

### Message de validation

```
✅ Format valide
```

**Styles** :
- Texte : `text-xs text-green-600`
- Icône : CheckCircle, `w-3 h-3 text-green-500`
- Marge : `mt-1` (4px depuis l'input)
- Animation : `animate-in slide-in-from-bottom-2 duration-300`

## Dimensions

| Élément | Largeur | Hauteur | Notes |
|---------|---------|---------|-------|
| Input | 100% | 48px | `h-12` |
| Icône validation | 20px | 20px | `w-5 h-5` |
| Message validation | Auto | Auto | S'adapte au contenu |

## Couleurs

| Élément | Couleur | Code Hex | Classe Tailwind |
|---------|---------|----------|-----------------|
| Bordure input | KARA Gold | `#CBB171` | `border-[#CBB171]` |
| Fond input | KARA Gold clair | `rgba(203, 177, 113, 0.05)` | `bg-[#CBB171]/5` |
| Icône validation | Vert | `#10b981` | `text-green-500` |
| Texte validation | Vert foncé | `#059669` | `text-green-600` |
| Texte code | Gris foncé | `#111827` | `text-gray-900` |

## États visuels

### Transition depuis l'état "recherche"

1. **Sélection d'un résultat** :
   - La liste se ferme (`animate-out fade-out-0 slide-out-to-top-2`)
   - Le code apparaît dans l'input
   - La bordure change de `rose-500` à `#CBB171` (transition 200ms)
   - Le fond change de `white` à `#CBB171/5` (transition 200ms)
   - L'icône de validation apparaît avec zoom (200ms)

2. **Message de validation** :
   - Apparaît avec slide depuis le bas (300ms)
   - Remplace le hint précédent

## Comportement

### Interactions

1. **Clic sur l'input** :
   - Le champ reste en état "sélectionné"
   - La liste peut se rouvrir pour changer la sélection
   - Le code reste affiché

2. **Effacement (si bouton clear présent)** :
   - Clic sur le bouton clear
   - Retour à l'état initial
   - Le code est effacé
   - La bordure redevient `rose-200`

3. **Modification manuelle** :
   - Si l'utilisateur modifie le code manuellement
   - L'état "sélectionné" disparaît
   - Retour à l'état "recherche active" si >= 2 caractères
   - Validation du format en temps réel

## Code HTML/CSS de référence

```tsx
<div className="space-y-2 w-full">
  <Label className="text-xs sm:text-sm font-semibold text-[#224D62] flex items-center gap-2">
    <Hash className="w-4 h-4 text-rose-600" />
    Qui vous a référé? <span className="text-red-500">*</span>
  </Label>
  
  <div className="relative">
    <Input
      data-testid="intermediary-code-search-input"
      value={selectedCode}
      readOnly
      className={cn(
        "h-12 rounded-xl border-2 bg-[#CBB171]/5 font-mono tracking-wider text-sm",
        "border-[#CBB171] focus:border-[#CBB171] focus:ring-[#CBB171]/20",
        "transition-all duration-200"
      )}
    />
    
    {isValidated && (
      <CheckCircle
        data-testid="intermediary-code-search-check-icon"
        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500 animate-in zoom-in-50 duration-200"
      />
    )}
  </div>
  
  {isValidated && (
    <div
      data-testid="intermediary-code-search-validated"
      className="flex items-center gap-1 mt-1 animate-in slide-in-from-bottom-2 duration-300"
    >
      <CheckCircle className="w-3 h-3 text-green-500" />
      <span className="text-xs text-green-600">Format valide</span>
    </div>
  )}
</div>
```

## Variante : Avec bouton clear

Si un bouton pour effacer la sélection est ajouté :

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍] 1228.MK.0058                                    [✓] [×] │
└─────────────────────────────────────────────────────────────┘
```

**Bouton clear** :
- Position : À droite de l'icône de validation
- Style : `w-10 h-10 rounded-lg hover:bg-gray-100`
- Icône : X, `w-4 h-4 text-gray-400`
- data-testid : `intermediary-code-search-clear`

## Animations

### Apparition de l'icône de validation

```css
/* Zoom depuis le centre */
animate-in zoom-in-50 duration-200
```

**Effet** : L'icône apparaît avec un zoom de 50% à 100% en 200ms.

### Apparition du message de validation

```css
/* Slide depuis le bas */
animate-in slide-in-from-bottom-2 duration-300
```

**Effet** : Le message slide depuis 8px en dessous vers sa position finale en 300ms.

### Transition de bordure et fond

```css
/* Transition douce */
transition-all duration-200 ease-in-out
```

**Effet** : Changement de couleur de bordure et fond en 200ms.

## Accessibilité

### Attributs ARIA

```tsx
<Input
  role="combobox"
  aria-expanded="false"
  aria-label="Code entremetteur sélectionné"
  aria-readonly="true"
  value={selectedCode}
/>

<div
  role="status"
  aria-live="polite"
  aria-label="Code entremetteur validé"
>
  Format valide
</div>
```

### Navigation clavier

- **Tab** : Focus sur le champ suivant
- **Entrée/Espace** : Peut rouvrir la liste pour changer la sélection
- **Suppr/Backspace** : Peut effacer la sélection (si fonctionnalité implémentée)

## Responsive

### Mobile (< 640px)

**Caractéristiques** :
- Icône validation : `w-4 h-4` (16px au lieu de 20px)
- Message validation : `text-xs` (12px)
- Padding input : `px-3` (12px - réduit pour laisser place à l'icône)
- Position icône : `right-3` (12px depuis la droite)

**Classes CSS** :
```tsx
// Input
className="h-12 rounded-xl border-2 border-[#CBB171] bg-[#CBB171]/5 px-3 py-3 text-sm font-mono"

// Icône validation
className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500"

// Message validation
className="text-xs text-green-600 mt-1 flex items-center gap-1"
```

### Tablette (640px - 1024px)

**Caractéristiques** :
- Icône validation : `w-5 h-5` (20px)
- Message validation : `text-xs` (12px)
- Padding input : `px-4` (16px)
- Position icône : `right-3` (12px depuis la droite)

**Classes CSS** :
```tsx
// Input
className="h-12 rounded-xl border-2 border-[#CBB171] bg-[#CBB171]/5 px-4 py-3 text-sm font-mono"

// Icône validation
className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500"

// Message validation
className="text-xs text-green-600 mt-1 flex items-center gap-1"
```

### Desktop (> 1024px)

**Caractéristiques** :
- Icône validation : `w-5 h-5` (20px)
- Message validation : `text-xs` (12px)
- Padding input : `px-4` (16px)
- Position icône : `right-3` (12px depuis la droite)

**Classes CSS** :
```tsx
// Input
className="h-12 rounded-xl border-2 border-[#CBB171] bg-[#CBB171]/5 px-4 py-3 text-sm font-mono"

// Icône validation
className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500"

// Message validation
className="text-xs text-green-600 mt-1 flex items-center gap-1"
```

## États d'erreur (si format invalide)

Si l'utilisateur modifie manuellement le code et que le format devient invalide :

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍] 1234.ABC.5678                                    [⚠️]  │
└─────────────────────────────────────────────────────────────┘
⚠️ Format requis: [Numéro].MK.[Numéro] (ex: 1228.MK.0058)
```

**Styles erreur** :
- Bordure : `border-red-500`
- Fond : `bg-red-50`
- Icône : AlertCircle, `text-red-500`
- Message : `text-xs text-red-500`
