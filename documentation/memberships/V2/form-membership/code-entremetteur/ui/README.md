# UI/UX – Code Entremetteur (V2)

## 1. Vue d'ensemble

Cette documentation décrit l'interface utilisateur du composant de recherche du code entremetteur avec autocomplétion, incluant les wireframes, spécifications de design, animations et IDs de tests E2E.

## 2. Composant : `IntermediaryCodeSearch`

### 2.1 Structure générale

```
┌─────────────────────────────────────────────────────────┐
│  Label: "Qui vous a référé?" *                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🔍 [Input de recherche]                           │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 📋 Liste déroulante (Popover)                      │  │
│  │   • Résultat 1: "Dupont Jean (1228.MK.0058)"     │  │
│  │   • Résultat 2: "Martin Marie (1234.MK.0059)"    │  │
│  │   • Résultat 3: ...                               │  │
│  └───────────────────────────────────────────────────┘  │
│  💡 Hint: "Tapez au moins 2 caractères"                 │
│  ✅ Validation visuelle (si sélectionné)                │
└─────────────────────────────────────────────────────────┘
```

## 3. États du composant

### 3.1 État initial (vide)

**Apparence** :
- Champ input avec placeholder : "Rechercher par nom ou prénom..."
- Icône de recherche (🔍) à gauche
- Bordure : `border-rose-200` (2px)
- Fond : `bg-white`
- Texte hint en dessous : "Tapez au moins 2 caractères" (gris clair)

**Classes CSS** :
```tsx
className="h-12 rounded-xl border-2 border-rose-200 hover:border-rose-400 focus:border-rose-500 transition-all bg-white"
```

**data-testid** : `intermediary-code-search-input`

### 3.2 État : Recherche en cours (< 2 caractères)

**Apparence** :
- Même style que l'état initial
- Message hint visible : "Tapez au moins 2 caractères"
- Pas de liste déroulante

**Classes CSS** :
```tsx
// Hint
className="text-xs text-gray-400 mt-1"
```

**data-testid** : `intermediary-code-search-hint`

### 3.3 État : Recherche active (>= 2 caractères)

**Apparence** :
- Bordure : `border-rose-500` (focus)
- Liste déroulante s'affiche sous le champ
- Indicateur de chargement si recherche en cours
- Maximum 10 résultats affichés

**Classes CSS** :
```tsx
// Input focus
className="border-rose-500 focus:ring-rose-500/20"

// Popover
className="w-[var(--radix-popover-trigger-width)] p-0 mt-1 shadow-lg border border-gray-200 rounded-lg bg-white"
```

**data-testid** : `intermediary-code-search-results`

### 3.4 État : Chargement

**Apparence** :
- Spinner animé dans la liste déroulante
- Texte : "Recherche en cours..."

**Classes CSS** :
```tsx
// Spinner
className="w-4 h-4 animate-spin text-rose-600"

// Container
className="flex items-center justify-center p-4"
```

**data-testid** : `intermediary-code-search-loading`

### 3.5 État : Résultats affichés

**Apparence** :
- Liste déroulante avec résultats formatés
- Format : "Nom Prénom (Code)"
- Hover sur chaque résultat : fond gris clair
- Icône de validation (✓) pour le résultat sélectionné

**Classes CSS** :
```tsx
// Item de résultat
className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors"

// Texte formaté
className="text-sm text-gray-900"
// Code entre parenthèses
className="text-xs text-gray-500 font-mono ml-1"
```

**data-testid** : `intermediary-code-search-option-{matricule}`

### 3.6 État : Aucun résultat

**Apparence** :
- Message : "Aucun résultat pour '{query}'"
- Icône d'information

**Classes CSS** :
```tsx
className="p-4 text-center text-sm text-gray-500"
```

**data-testid** : `intermediary-code-search-empty`

### 3.7 État : Sélectionné (validé)

**Apparence** :
- Champ rempli avec le code : "1228.MK.0058"
- Bordure : `border-[#CBB171]` (KARA Gold)
- Fond : `bg-[#CBB171]/5` (KARA Gold très clair)
- Icône de validation (✓) à droite
- Message hint : "Format valide" (vert)

**Classes CSS** :
```tsx
// Input sélectionné
className="border-[#CBB171] bg-[#CBB171]/5"

// Icône validation
className="w-5 h-5 text-green-500 animate-in zoom-in-50 duration-200"

// Message validation
className="text-xs text-green-600 mt-1"
```

**data-testid** : `intermediary-code-search-validated`

### 3.8 État : Erreur

**Apparence** :
- Bordure rouge : `border-red-500`
- Message d'erreur en dessous
- Icône d'alerte

**Classes CSS** :
```tsx
// Input erreur
className="border-red-500 focus:border-red-500 focus:ring-red-500/20"

// Message erreur
className="text-xs text-red-500 mt-1 flex items-center gap-1"
```

**data-testid** : `intermediary-code-search-error`

## 4. Palette de couleurs

### 4.1 Couleurs principales

| Élément | Couleur | Code Hex | Usage |
|---------|---------|----------|-------|
| **Bordure par défaut** | Rose clair | `#fecdd3` | `border-rose-200` |
| **Bordure hover** | Rose moyen | `#fb7185` | `border-rose-400` |
| **Bordure focus** | Rose foncé | `#f43f5e` | `border-rose-500` |
| **Bordure sélectionné** | KARA Gold | `#CBB171` | `border-[#CBB171]` |
| **Fond sélectionné** | KARA Gold clair | `#CBB171` à 5% | `bg-[#CBB171]/5` |
| **Texte principal** | KARA Blue | `#224D62` | `text-[#224D62]` |
| **Texte secondaire** | Gris | `#6b7280` | `text-gray-500` |
| **Validation** | Vert | `#10b981` | `text-green-600` |
| **Erreur** | Rouge | `#ef4444` | `text-red-500` |

### 4.2 Couleurs d'état

```css
/* États du champ */
--intermediary-default-border: #fecdd3;    /* rose-200 */
--intermediary-hover-border: #fb7185;      /* rose-400 */
--intermediary-focus-border: #f43f5e;      /* rose-500 */
--intermediary-selected-border: #CBB171;   /* KARA Gold */
--intermediary-selected-bg: rgba(203, 177, 113, 0.05);

/* États de validation */
--intermediary-success: #10b981;           /* green-600 */
--intermediary-error: #ef4444;            /* red-500 */
```

## 5. Typographie

### 5.1 Labels

```tsx
// Label principal
className="text-xs sm:text-sm font-semibold text-[#224D62] flex items-center gap-2"

// Astérisque requis
className="text-red-500"
```

### 5.2 Input

```tsx
// Texte dans l'input
className="text-sm text-gray-900 placeholder:text-gray-400"

// Code sélectionné (monospace)
className="font-mono tracking-wider text-sm"
```

### 5.3 Résultats

```tsx
// Nom complet dans résultat
className="text-sm text-gray-900 font-medium"

// Code dans résultat
className="text-xs text-gray-500 font-mono"
```

### 5.4 Messages

```tsx
// Hint
className="text-xs text-gray-400"

// Validation
className="text-xs text-green-600"

// Erreur
className="text-xs text-red-500"
```

## 6. Animations et transitions

### 6.1 Transitions de bordure

```css
transition-all duration-200 ease-in-out
```

**Effet** : Changement de couleur de bordure en 200ms

### 6.2 Animation de la liste déroulante

```css
/* Apparition */
animate-in fade-in-0 slide-in-from-top-2 duration-200

/* Disparition */
animate-out fade-out-0 slide-out-to-top-2 duration-150
```

**Effet** : La liste apparaît avec un fade + slide depuis le haut

### 6.3 Animation de validation

```css
/* Icône de validation */
animate-in zoom-in-50 duration-200

/* Message de validation */
animate-in slide-in-from-bottom-2 duration-300
```

**Effet** : L'icône zoom et le message slide depuis le bas

### 6.4 Animation de chargement

```css
/* Spinner */
animate-spin duration-1000
```

**Effet** : Rotation continue du spinner

### 6.5 Hover sur résultats

```css
transition-colors duration-150 ease-in-out
```

**Effet** : Changement de fond en 150ms au survol

## 7. Espacements et dimensions

### 7.1 Dimensions du champ

| Propriété | Valeur | Classe Tailwind |
|-----------|--------|-----------------|
| Hauteur | 48px | `h-12` |
| Border radius | 12px | `rounded-xl` |
| Border width | 2px | `border-2` |
| Padding horizontal | 16px | `px-4` |
| Padding vertical | 12px | `py-3` |

### 7.2 Espacements

| Élément | Espacement | Classe Tailwind |
|---------|------------|-----------------|
| Entre label et input | 8px | `space-y-2` |
| Entre input et hint | 4px | `mt-1` |
| Entre input et liste | 4px | `mt-1` |
| Padding liste | 0px | `p-0` |
| Padding items | 12px vertical | `py-3` |
| Gap icône-texte | 8px | `gap-2` |

### 7.3 Largeur de la liste déroulante

```tsx
// La liste prend la largeur du trigger (input)
className="w-[var(--radix-popover-trigger-width)]"
```

## 8. Responsive

### 8.1 Breakpoints Tailwind

| Breakpoint | Largeur | Usage |
|------------|---------|-------|
| `sm` | ≥ 640px | Tablette (petite) |
| `md` | ≥ 768px | Tablette (grande) |
| `lg` | ≥ 1024px | Desktop |
| `xl` | ≥ 1280px | Desktop (large) |

### 8.2 Mobile (< 640px)

**Caractéristiques** :
- Largeur : 100% du conteneur parent
- Padding horizontal : `px-3` (12px)
- Padding vertical input : `py-3` (12px)
- Hauteur input : `h-12` (48px) - conservée pour la lisibilité

**Typographie** :
- Label : `text-xs` (12px)
- Texte input : `text-sm` (14px)
- Texte hint : `text-xs` (12px)
- Texte résultats : `text-sm` (14px)
- Code dans résultats : `text-xs` (12px)

**Composants** :
- Liste déroulante : Même largeur que l'input (100%)
- Max-height liste : `max-h-[250px]` (au lieu de 300px)
- Padding items résultats : `px-2 py-1.5` (8px horizontal, 6px vertical)
- Icône validation : `w-4 h-4` (16px au lieu de 20px)
- Gap icône-texte : `gap-1` (4px)

**Espacements** :
- Gap label-icône : `gap-1.5` (6px)
- Marge hint : `mt-1` (4px)
- Marge liste : `mt-1` (4px)

**Classes CSS** :
```tsx
// Conteneur
className="w-full space-y-2"

// Label
className="text-xs font-semibold text-[#224D62] flex items-center gap-1.5"

// Input
className="h-12 rounded-xl border-2 border-rose-200 px-3 py-3 text-sm"

// Hint
className="text-xs text-gray-400 mt-1"

// Liste déroulante
className="w-full max-h-[250px] p-0"

// Items résultats
className="px-2 py-1.5 text-sm"
```

### 8.3 Tablette (640px - 1024px)

**Caractéristiques** :
- Largeur : 100% du conteneur parent
- Padding horizontal : `px-4` (16px)
- Padding vertical input : `py-3` (12px)
- Hauteur input : `h-12` (48px)

**Typographie** :
- Label : `text-xs sm:text-sm` (12px → 14px)
- Texte input : `text-sm` (14px)
- Texte hint : `text-xs sm:text-sm` (12px → 14px)
- Texte résultats : `text-sm` (14px)
- Code dans résultats : `text-xs` (12px)

**Composants** :
- Liste déroulante : Même largeur que l'input (100%)
- Max-height liste : `max-h-[300px]`
- Padding items résultats : `px-3 py-2` (12px horizontal, 8px vertical)
- Icône validation : `w-5 h-5` (20px)
- Gap icône-texte : `gap-2` (8px)

**Espacements** :
- Gap label-icône : `gap-2` (8px)
- Marge hint : `mt-1` (4px)
- Marge liste : `mt-1` (4px)

**Classes CSS** :
```tsx
// Label
className="text-xs sm:text-sm font-semibold text-[#224D62] flex items-center gap-2"

// Input
className="h-12 rounded-xl border-2 border-rose-200 px-4 py-3 text-sm"

// Hint
className="text-xs sm:text-sm text-gray-400 mt-1"

// Liste déroulante
className="w-full max-h-[300px] p-0"

// Items résultats
className="px-3 py-2 text-sm"
```

### 8.4 Desktop (> 1024px)

**Caractéristiques** :
- Largeur : 100% du conteneur (ou `max-w-md` / `max-w-lg` si défini par le parent)
- Padding horizontal : `px-4` (16px)
- Padding vertical input : `py-3` (12px)
- Hauteur input : `h-12` (48px)

**Typographie** :
- Label : `text-sm` (14px)
- Texte input : `text-sm` (14px)
- Texte hint : `text-xs` (12px)
- Texte résultats : `text-sm` (14px)
- Code dans résultats : `text-xs` (12px)

**Composants** :
- Liste déroulante : Même largeur que l'input
- Max-height liste : `max-h-[300px]` avec scroll si nécessaire
- Padding items résultats : `px-3 py-2` (12px horizontal, 8px vertical)
- Icône validation : `w-5 h-5` (20px)
- Gap icône-texte : `gap-2` (8px)

**Espacements** :
- Gap label-icône : `gap-2` (8px)
- Marge hint : `mt-1` (4px)
- Marge liste : `mt-1` (4px)

**Classes CSS** :
```tsx
// Label
className="text-sm font-semibold text-[#224D62] flex items-center gap-2"

// Input
className="h-12 rounded-xl border-2 border-rose-200 px-4 py-3 text-sm"

// Hint
className="text-xs text-gray-400 mt-1"

// Liste déroulante
className="w-full max-h-[300px] overflow-y-auto p-0"

// Items résultats
className="px-3 py-2 text-sm"
```

### 8.5 Tableau récapitulatif responsive

| Propriété | Mobile (< 640px) | Tablette (640-1024px) | Desktop (> 1024px) |
|-----------|------------------|------------------------|---------------------|
| **Largeur** | 100% | 100% | 100% (ou max-width) |
| **Padding horizontal** | `px-3` (12px) | `px-4` (16px) | `px-4` (16px) |
| **Padding vertical input** | `py-3` (12px) | `py-3` (12px) | `py-3` (12px) |
| **Hauteur input** | `h-12` (48px) | `h-12` (48px) | `h-12` (48px) |
| **Label** | `text-xs` (12px) | `text-xs sm:text-sm` (12-14px) | `text-sm` (14px) |
| **Texte input** | `text-sm` (14px) | `text-sm` (14px) | `text-sm` (14px) |
| **Texte hint** | `text-xs` (12px) | `text-xs sm:text-sm` (12-14px) | `text-xs` (12px) |
| **Max-height liste** | `max-h-[250px]` | `max-h-[300px]` | `max-h-[300px]` |
| **Padding items** | `px-2 py-1.5` | `px-3 py-2` | `px-3 py-2` |
| **Icône validation** | `w-4 h-4` (16px) | `w-5 h-5` (20px) | `w-5 h-5` (20px) |
| **Gap label-icône** | `gap-1.5` (6px) | `gap-2` (8px) | `gap-2` (8px) |

### 8.6 Comportement adaptatif

**Mobile** :
- Optimisé pour le touch (zones de clic plus grandes)
- Texte plus petit pour économiser l'espace
- Liste déroulante plus compacte (max-height réduite)

**Tablette** :
- Transition progressive entre mobile et desktop
- Texte légèrement plus grand pour meilleure lisibilité
- Espacements optimaux pour interaction tactile

**Desktop** :
- Espacements généreux pour interaction souris
- Liste déroulante avec scroll si nécessaire
- Meilleure lisibilité avec tailles de texte optimales

### 8.7 Tests responsive

**À tester sur** :
- [ ] iPhone SE (375px) - Mobile petit
- [ ] iPhone 12/13 (390px) - Mobile standard
- [ ] iPad (768px) - Tablette portrait
- [ ] iPad Pro (1024px) - Tablette paysage / Desktop petit
- [ ] Desktop (1280px+) - Desktop standard

**Points de vérification** :
- [ ] Le composant s'adapte correctement à chaque breakpoint
- [ ] Le texte reste lisible sur tous les écrans
- [ ] Les zones de clic sont suffisamment grandes sur mobile
- [ ] La liste déroulante s'affiche correctement sur tous les écrans
- [ ] Les animations fonctionnent sur tous les écrans

## 9. Accessibilité

### 9.1 ARIA

```tsx
// Input
role="combobox"
aria-expanded={open}
aria-controls="intermediary-code-search-results"
aria-haspopup="listbox"

// Liste
role="listbox"
id="intermediary-code-search-results"

// Items
role="option"
aria-selected={isSelected}
```

### 9.2 Navigation clavier

- **Tab** : Focus sur l'input
- **Espace/Entrée** : Ouvre/ferme la liste
- **Flèches haut/bas** : Navigue dans les résultats
- **Entrée** : Sélectionne le résultat
- **Echap** : Ferme la liste
- **Tab** : Sort du composant

### 9.3 Focus visible

```css
focus:ring-2 focus:ring-rose-500/20 focus:outline-none
```

## 10. Wireframes détaillés

Voir les fichiers :
- [wireframe-etat-initial.md](./wireframe-etat-initial.md)
- [wireframe-recherche-active.md](./wireframe-recherche-active.md)
- [wireframe-selectionne.md](./wireframe-selectionne.md)

## 11. IDs de tests E2E

Voir [test-ids.md](./test-ids.md) pour la liste complète des `data-testid` et leur utilisation dans les tests E2E.

## 12. Références

- [Design System KARA](../../../../../design-system/DESIGN_SYSTEM_COULEURS_KARA.md)
- [Tests E2E](../tests/README.md)
- [Composants shadcn/ui](https://ui.shadcn.com/docs/components/command)
