# Wireframe – État Initial

## Description

État initial du composant `IntermediaryCodeSearch` avant toute interaction utilisateur.

## Wireframe ASCII

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : INFORMATIONS D'IDENTITÉ                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🔍 Qui vous a référé? *                                   │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ [🔍] Rechercher par nom ou prénom...                │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  │ 💡 Tapez au moins 2 caractères                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Spécifications visuelles

### Label

```
┌─────────────────────────────────────┐
│ 🔍 Qui vous a référé? *            │
└─────────────────────────────────────┘
```

**Styles** :
- Icône : Hash (`#`), couleur `#f43f5e` (rose-600), taille 16px
- Texte : `text-xs sm:text-sm font-semibold text-[#224D62]`
- Astérisque : `text-red-500`
- Espacement : `gap-2` (8px entre icône et texte)

### Champ Input

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍] Rechercher par nom ou prénom...                       │
└─────────────────────────────────────────────────────────────┘
```

**Styles** :
- Hauteur : `h-12` (48px)
- Border radius : `rounded-xl` (12px)
- Bordure : `border-2 border-rose-200` (2px, couleur `#fecdd3`)
- Fond : `bg-white`
- Padding : `px-4 py-3` (16px horizontal, 12px vertical)
- Texte placeholder : `text-gray-400 text-sm`
- Transition : `transition-all duration-200`

**États** :
- **Par défaut** : Bordure `rose-200`
- **Hover** : Bordure `rose-400` (`#fb7185`)
- **Focus** : Bordure `rose-500` (`#f43f5e`) + ring `rose-500/20`

### Message Hint

```
💡 Tapez au moins 2 caractères
```

**Styles** :
- Texte : `text-xs text-gray-400`
- Marge : `mt-1` (4px depuis l'input)
- Icône : InfoCircle, taille 12px, couleur `gray-400`

## Dimensions

| Élément | Largeur | Hauteur | Notes |
|---------|---------|---------|-------|
| Conteneur | 100% | Auto | Prend toute la largeur disponible |
| Input | 100% | 48px | `w-full h-12` |
| Label | Auto | Auto | S'adapte au contenu |
| Hint | Auto | Auto | S'adapte au contenu |

## Couleurs

| Élément | Couleur | Code Hex | Classe Tailwind |
|---------|---------|----------|-----------------|
| Bordure input | Rose clair | `#fecdd3` | `border-rose-200` |
| Bordure hover | Rose moyen | `#fb7185` | `border-rose-400` |
| Bordure focus | Rose foncé | `#f43f5e` | `border-rose-500` |
| Texte label | KARA Blue | `#224D62` | `text-[#224D62]` |
| Texte hint | Gris clair | `#9ca3af` | `text-gray-400` |
| Icône | Rose | `#f43f5e` | `text-rose-600` |

## Comportement

### Interactions

1. **Clic sur l'input** :
   - Le champ reçoit le focus
   - Bordure passe à `rose-500`
   - Curseur clignotant apparaît

2. **Tape un caractère** :
   - Le texte apparaît dans l'input
   - Le hint reste visible si < 2 caractères

3. **Tape 2 caractères ou plus** :
   - Le hint disparaît
   - La recherche se déclenche (debounce 300ms)
   - La liste déroulante apparaît

### États visuels

- **Par défaut** : Bordure `rose-200`, fond blanc
- **Hover** : Bordure `rose-400`
- **Focus** : Bordure `rose-500` + ring de focus
- **Disabled** : Opacité 50%, curseur `not-allowed`

## Code HTML/CSS de référence

```tsx
<div className="space-y-2 w-full">
  <Label className="text-xs sm:text-sm font-semibold text-[#224D62] flex items-center gap-2">
    <Hash className="w-4 h-4 text-rose-600" />
    Qui vous a référé? <span className="text-red-500">*</span>
  </Label>
  
  <Input
    data-testid="intermediary-code-search-input"
    placeholder="Rechercher par nom ou prénom..."
    className="h-12 rounded-xl border-2 border-rose-200 hover:border-rose-400 focus:border-rose-500 transition-all bg-white"
  />
  
  <p 
    data-testid="intermediary-code-search-hint"
    className="text-xs text-gray-400 mt-1 flex items-center gap-1"
  >
    <Info className="w-3 h-3" />
    Tapez au moins 2 caractères
  </p>
</div>
```

## Accessibilité

### Attributs ARIA

```tsx
<Input
  role="combobox"
  aria-expanded="false"
  aria-controls="intermediary-code-search-results"
  aria-haspopup="listbox"
  aria-label="Rechercher un membre entremetteur"
/>
```

### Navigation clavier

- **Tab** : Focus sur l'input
- **Espace/Entrée** : Ouvre la liste (si >= 2 caractères)
- **Flèches** : Inactives tant que la liste n'est pas ouverte

## Responsive

### Mobile (< 640px)

**Caractéristiques** :
- Largeur : 100%
- Padding horizontal : `px-3` (12px)
- Padding vertical : `py-3` (12px)
- Hauteur input : `h-12` (48px)

**Typographie** :
- Label : `text-xs` (12px)
- Texte input : `text-sm` (14px)
- Texte hint : `text-xs` (12px)

**Espacements** :
- Gap label-icône : `gap-1.5` (6px)
- Marge hint : `mt-1` (4px)

**Classes CSS** :
```tsx
// Label
className="text-xs font-semibold text-[#224D62] flex items-center gap-1.5"

// Input
className="h-12 rounded-xl border-2 border-rose-200 px-3 py-3 text-sm"

// Hint
className="text-xs text-gray-400 mt-1"
```

### Tablette (640px - 1024px)

**Caractéristiques** :
- Largeur : 100%
- Padding horizontal : `px-4` (16px)
- Padding vertical : `py-3` (12px)
- Hauteur input : `h-12` (48px)

**Typographie** :
- Label : `text-xs sm:text-sm` (12px → 14px)
- Texte input : `text-sm` (14px)
- Texte hint : `text-xs sm:text-sm` (12px → 14px)

**Espacements** :
- Gap label-icône : `gap-2` (8px)
- Marge hint : `mt-1` (4px)

**Classes CSS** :
```tsx
// Label
className="text-xs sm:text-sm font-semibold text-[#224D62] flex items-center gap-2"

// Input
className="h-12 rounded-xl border-2 border-rose-200 px-4 py-3 text-sm"

// Hint
className="text-xs sm:text-sm text-gray-400 mt-1"
```

### Desktop (> 1024px)

**Caractéristiques** :
- Largeur : 100% (ou max-width si défini)
- Padding horizontal : `px-4` (16px)
- Padding vertical : `py-3` (12px)
- Hauteur input : `h-12` (48px)

**Typographie** :
- Label : `text-sm` (14px)
- Texte input : `text-sm` (14px)
- Texte hint : `text-xs` (12px)

**Espacements** :
- Gap label-icône : `gap-2` (8px)
- Marge hint : `mt-1` (4px)

**Classes CSS** :
```tsx
// Label
className="text-sm font-semibold text-[#224D62] flex items-center gap-2"

// Input
className="h-12 rounded-xl border-2 border-rose-200 px-4 py-3 text-sm"

// Hint
className="text-xs text-gray-400 mt-1"
```
