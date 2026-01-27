# Wireframe – Recherche Active

## Description

État du composant `IntermediaryCodeSearch` pendant une recherche active (>= 2 caractères tapés, résultats affichés).

## Wireframe ASCII

```
┌─────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : INFORMATIONS D'IDENTITÉ                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🔍 Qui vous a référé? *                                   │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ [🔍] Jean                                          │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  │                                                           │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ 📋 Résultats (3)                                     │   │ │
│  │ ├─────────────────────────────────────────────────────┤   │
│  │ │ ✓ Dupont Jean (1228.MK.0058)        [hover]        │   │
│  │ │   Martin Jean (1234.MK.0059)                       │   │
│  │ │   Ndong Jean (1235.MK.0060)                        │   │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Spécifications visuelles

### Input avec texte saisi

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍] Jean                                                   │
└─────────────────────────────────────────────────────────────┘
```

**Styles** :
- Bordure : `border-rose-500` (focus actif)
- Ring : `ring-2 ring-rose-500/20` (focus ring)
- Texte : `text-sm text-gray-900`
- Fond : `bg-white`

### Liste déroulante (Popover)

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Résultats (3)                                            │
├─────────────────────────────────────────────────────────────┤
│ ✓ Dupont Jean (1228.MK.0058)              [hover: bg-gray-100] │
│   Martin Jean (1234.MK.0059)                               │
│   Ndong Jean (1235.MK.0060)                                │
└─────────────────────────────────────────────────────────────┘
```

**Styles** :
- Conteneur : `bg-white border border-gray-200 rounded-lg shadow-lg`
- Largeur : `w-[var(--radix-popover-trigger-width)]` (même largeur que l'input)
- Padding : `p-0` (pas de padding sur le conteneur)
- Max-height : `max-h-[300px]` avec scroll si nécessaire
- Animation : `animate-in fade-in-0 slide-in-from-top-2 duration-200`

### Item de résultat

```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Dupont Jean (1228.MK.0058)                               │
└─────────────────────────────────────────────────────────────┘
```

**Styles** :
- Padding : `px-3 py-2` (12px horizontal, 8px vertical)
- Hover : `hover:bg-gray-100 transition-colors duration-150`
- Cursor : `cursor-pointer`
- Border radius : `rounded-sm` sur hover

**Structure** :
- Icône check (✓) : `w-4 h-4`, visible si sélectionné, `opacity-0` sinon
- Nom complet : `text-sm text-gray-900 font-medium`
- Code entre parenthèses : `text-xs text-gray-500 font-mono`

## États de la liste

### État : Chargement

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         ⏳ Recherche en cours...                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Styles** :
- Spinner : `w-4 h-4 animate-spin text-rose-600`
- Container : `flex items-center justify-center p-4`
- Texte : `text-sm text-gray-500`

### État : Aucun résultat

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ℹ️  Aucun résultat pour "XXXXXXX"                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Styles** :
- Container : `p-4 text-center`
- Texte : `text-sm text-gray-500`
- Icône : InfoCircle, `w-4 h-4 text-gray-400`

### État : Résultats affichés

**Maximum 10 résultats** affichés avec scroll si nécessaire.

## Dimensions

| Élément | Largeur | Hauteur | Notes |
|---------|---------|---------|-------|
| Liste déroulante | = Input | Max 300px | Scroll si > 300px |
| Item résultat | 100% | Auto | Min-height 40px |
| Icône check | 16px | 16px | `w-4 h-4` |
| Gap icône-texte | 8px | - | `gap-2` |

## Couleurs

| Élément | Couleur | Code Hex | Classe Tailwind |
|---------|---------|----------|-----------------|
| Bordure input (focus) | Rose foncé | `#f43f5e` | `border-rose-500` |
| Fond liste | Blanc | `#ffffff` | `bg-white` |
| Bordure liste | Gris clair | `#e5e7eb` | `border-gray-200` |
| Ombre liste | Gris | - | `shadow-lg` |
| Fond item hover | Gris très clair | `#f3f4f6` | `hover:bg-gray-100` |
| Texte nom | Gris foncé | `#111827` | `text-gray-900` |
| Texte code | Gris moyen | `#6b7280` | `text-gray-500` |
| Icône check | Vert | `#10b981` | `text-green-500` |

## Animations

### Apparition de la liste

```css
/* Animation d'entrée */
animate-in fade-in-0 slide-in-from-top-2 duration-200
```

**Effet** : La liste apparaît avec un fade + slide depuis le haut en 200ms.

### Hover sur item

```css
/* Transition de couleur */
transition-colors duration-150 ease-in-out
```

**Effet** : Le fond change en 150ms au survol.

### Spinner de chargement

```css
/* Rotation continue */
animate-spin duration-1000
```

**Effet** : Rotation continue du spinner.

## Comportement

### Interactions

1. **Tape dans l'input** :
   - La recherche se déclenche après 300ms (debounce)
   - Le spinner apparaît
   - La liste s'affiche avec les résultats

2. **Hover sur un résultat** :
   - Le fond devient `gray-100`
   - Le curseur devient `pointer`

3. **Clic sur un résultat** :
   - Le résultat est sélectionné
   - La liste se ferme
   - Le champ est rempli avec le code
   - L'état "validé" s'affiche

4. **Flèches haut/bas** :
   - Navigation dans les résultats
   - Mise en surbrillance du résultat actif

5. **Echap** :
   - Ferme la liste
   - Garde le focus sur l'input

## Code HTML/CSS de référence

```tsx
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Input
      data-testid="intermediary-code-search-input"
      value={query}
      onChange={handleChange}
      className="border-rose-500 focus:ring-rose-500/20"
    />
  </PopoverTrigger>
  
  <PopoverContent 
    data-testid="intermediary-code-search-results"
    className="w-[var(--radix-popover-trigger-width)] p-0 mt-1 shadow-lg border border-gray-200 rounded-lg bg-white animate-in fade-in-0 slide-in-from-top-2 duration-200"
  >
    <Command shouldFilter={false}>
      {isLoading ? (
        <div data-testid="intermediary-code-search-loading" className="flex items-center justify-center p-4">
          <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
          <span className="ml-2 text-sm text-gray-500">Recherche en cours...</span>
        </div>
      ) : results.length === 0 ? (
        <div data-testid="intermediary-code-search-empty" className="p-4 text-center text-sm text-gray-500">
          <InfoCircle className="w-4 h-4 mx-auto mb-1 text-gray-400" />
          Aucun résultat pour "{query}"
        </div>
      ) : (
        <CommandGroup>
          {results.map((member) => (
            <CommandItem
              key={member.matricule}
              data-testid={`intermediary-code-search-option-${member.matricule}`}
              value={member.displayName}
              onSelect={() => handleSelect(member)}
              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors duration-150"
            >
              <Check
                className={cn(
                  "w-4 h-4 mr-2",
                  selectedMatricule === member.matricule ? "opacity-100 text-green-500" : "opacity-0"
                )}
              />
              <span className="text-sm text-gray-900 font-medium">
                {member.lastName} {member.firstName}
              </span>
              <span className="text-xs text-gray-500 font-mono ml-1">
                ({member.matricule})
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </Command>
  </PopoverContent>
</Popover>
```

## Accessibilité

### Attributs ARIA

```tsx
<Input
  role="combobox"
  aria-expanded={open}
  aria-controls="intermediary-code-search-results"
  aria-haspopup="listbox"
/>

<div
  role="listbox"
  id="intermediary-code-search-results"
>
  {results.map((member) => (
    <div
      role="option"
      aria-selected={selectedMatricule === member.matricule}
    >
      {member.displayName} ({member.matricule})
    </div>
  ))}
</div>
```

### Navigation clavier

- **Flèche bas** : Premier résultat → suivant
- **Flèche haut** : Dernier résultat → précédent
- **Entrée** : Sélectionne le résultat actif
- **Echap** : Ferme la liste
- **Tab** : Sort du composant

## Responsive

### Mobile (< 640px)

**Caractéristiques** :
- Liste : Même largeur que l'input (100%)
- Max-height : `max-h-[250px]` (250px au lieu de 300px)
- Padding items : `px-2 py-1.5` (8px horizontal, 6px vertical)
- Texte résultats : `text-sm` (14px)
- Code dans résultats : `text-xs` (12px)

**Classes CSS** :
```tsx
// Liste déroulante
className="w-full max-h-[250px] overflow-y-auto p-0"

// Items résultats
className="px-2 py-1.5 text-sm hover:bg-gray-100"
```

### Tablette (640px - 1024px)

**Caractéristiques** :
- Liste : Même largeur que l'input (100%)
- Max-height : `max-h-[300px]` (300px)
- Padding items : `px-3 py-2` (12px horizontal, 8px vertical)
- Texte résultats : `text-sm` (14px)
- Code dans résultats : `text-xs` (12px)

**Classes CSS** :
```tsx
// Liste déroulante
className="w-full max-h-[300px] overflow-y-auto p-0"

// Items résultats
className="px-3 py-2 text-sm hover:bg-gray-100"
```

### Desktop (> 1024px)

**Caractéristiques** :
- Liste : Même largeur que l'input
- Max-height : `max-h-[300px]` (300px) avec scroll si nécessaire
- Padding items : `px-3 py-2` (12px horizontal, 8px vertical)
- Texte résultats : `text-sm` (14px)
- Code dans résultats : `text-xs` (12px)

**Classes CSS** :
```tsx
// Liste déroulante
className="w-full max-h-[300px] overflow-y-auto p-0"

// Items résultats
className="px-3 py-2 text-sm hover:bg-gray-100"
```
