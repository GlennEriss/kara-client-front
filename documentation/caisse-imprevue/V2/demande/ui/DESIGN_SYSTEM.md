# Design System - Module Demandes Caisse Imprévue V2

> Spécifications détaillées du design system pour le module Demandes Caisse Imprévue V2

## 🎨 Palette de Couleurs

### Couleurs Principales KARA

```typescript
const karaColors = {
  primary: {
    dark: '#234D65',      // Bleu foncé - Principal
    light: '#2c5a73',     // Bleu clair - Hover
    DEFAULT: '#234D65',
  },
  accent: {
    gold: '#CBB171',      // Or/Doré - Accent
    light: '#d4c085',     // Or clair
  },
  neutral: {
    50: '#f8f9fa',        // Fond très clair
    100: '#e9ecef',       // Fond clair
    200: '#dee2e6',       // Bordures
    300: '#ced4da',       // Bordures hover
    400: '#adb5bd',       // Texte désactivé
    500: '#6c757d',       // Texte secondaire
    600: '#495057',       // Texte secondaire foncé
    700: '#343a40',       // Texte principal
    800: '#212529',       // Texte très foncé
    900: '#0d1117',       // Texte noir
  },
  status: {
    success: '#10b981',   // Vert - Accepté
    successLight: '#d1fae5',
    error: '#ef4444',     // Rouge - Refusé
    errorLight: '#fee2e2',
    warning: '#f59e0b',   // Orange - En attente
    warningLight: '#fef3c7',
    info: '#3b82f6',      // Bleu - Info
    infoLight: '#dbeafe',
  },
}
```

### Utilisation des Couleurs

#### Statuts des Demandes

```typescript
const statusColors = {
  PENDING: {
    bg: 'bg-kara-warning-light',
    text: 'text-kara-warning',
    border: 'border-kara-warning',
    badge: 'bg-orange-100 text-orange-700',
  },
  APPROVED: {
    bg: 'bg-kara-success-light',
    text: 'text-kara-success',
    border: 'border-kara-success',
    badge: 'bg-green-100 text-green-700',
  },
  REJECTED: {
    bg: 'bg-kara-error-light',
    text: 'text-kara-error',
    border: 'border-kara-error',
    badge: 'bg-red-100 text-red-700',
  },
  REOPENED: {
    bg: 'bg-kara-info-light',
    text: 'text-kara-info',
    border: 'border-kara-info',
    badge: 'bg-blue-100 text-blue-700',
  },
  CONVERTED: {
    bg: 'bg-kara-success-light',
    text: 'text-kara-success',
    border: 'border-kara-success',
    badge: 'bg-green-100 text-green-700',
  },
}
```

---

## 📐 Typographie

### Hiérarchie

```typescript
const typography = {
  h1: {
    mobile: 'text-2xl font-black tracking-tight',
    tablet: 'text-3xl font-black tracking-tight',
    desktop: 'text-4xl font-black tracking-tight',
    color: 'text-white', // Sur fond KARA primary
  },
  h2: {
    mobile: 'text-xl font-bold',
    tablet: 'text-2xl font-bold',
    desktop: 'text-3xl font-bold',
    color: 'text-kara-neutral-900',
  },
  h3: {
    mobile: 'text-lg font-bold',
    tablet: 'text-xl font-bold',
    desktop: 'text-2xl font-bold',
    color: 'text-kara-neutral-900',
  },
  body: {
    mobile: 'text-sm',
    tablet: 'text-base',
    desktop: 'text-base',
    color: 'text-kara-neutral-700',
  },
  caption: {
    mobile: 'text-xs',
    tablet: 'text-sm',
    desktop: 'text-sm',
    color: 'text-kara-neutral-600',
  },
}
```

### Polices

- **Famille principale** : `font-sans` (Inter)
- **Poids disponibles** : `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700), `font-black` (900)

---

## 📏 Espacements

### Padding

```typescript
const spacing = {
  container: {
    mobile: 'p-3',      // 12px
    tablet: 'p-4',      // 16px
    desktop: 'p-6',     // 24px
  },
  section: {
    mobile: 'p-4',      // 16px
    tablet: 'p-5',      // 20px
    desktop: 'p-6',     // 24px
  },
  card: {
    mobile: 'p-4',      // 16px
    tablet: 'p-5',      // 20px
    desktop: 'p-6',     // 24px
  },
}
```

### Gaps

```typescript
const gaps = {
  small: {
    mobile: 'gap-2',    // 8px
    tablet: 'gap-3',    // 12px
    desktop: 'gap-3',   // 12px
  },
  medium: {
    mobile: 'gap-3',    // 12px
    tablet: 'gap-4',    // 16px
    desktop: 'gap-6',   // 24px
  },
  large: {
    mobile: 'gap-4',    // 16px
    tablet: 'gap-6',    // 24px
    desktop: 'gap-8',   // 32px
  },
}
```

---

## 🎯 Composants UI

### Boutons

#### Bouton Primaire

```tsx
<Button className="bg-[#234D65] hover:bg-[#2c5a73] text-white">
  Action principale
</Button>
```

#### Bouton Secondaire

```tsx
<Button variant="outline" className="border-[#234D65] text-[#234D65] hover:bg-[#234D65]/10">
  Action secondaire
</Button>
```

#### Bouton Danger

```tsx
<Button variant="destructive" className="bg-kara-error hover:bg-kara-error/90">
  Supprimer
</Button>
```

### Cards

#### Card Standard

```tsx
<Card className="bg-white border border-kara-neutral-200 shadow-md hover:shadow-lg transition-shadow">
  <CardHeader>
    <CardTitle>Titre</CardTitle>
  </CardHeader>
  <CardContent>
    Contenu
  </CardContent>
</Card>
```

#### Card Statut

```tsx
<Card className={cn(
  "border-2",
  statusColors[status].border,
  statusColors[status].bg
)}>
  {/* Contenu */}
</Card>
```

### Badges

#### Badge Statut

```tsx
<Badge className={statusColors[status].badge}>
  {statusLabel}
</Badge>
```

### Inputs

#### Input Standard

```tsx
<Input 
  className="border-kara-neutral-200 focus:border-[#234D65] focus:ring-[#234D65]/20"
  placeholder="Placeholder"
/>
```

#### Textarea

```tsx
<Textarea 
  className="border-kara-neutral-200 focus:border-[#234D65] focus:ring-[#234D65]/20 min-h-[100px]"
  placeholder="Placeholder"
/>
```

### Modals

#### Modal Standard

```tsx
<Dialog>
  <DialogContent className="sm:max-w-[600px] lg:max-w-[700px]">
    <DialogHeader>
      <DialogTitle className="text-2xl font-bold text-[#234D65]">
        Titre
      </DialogTitle>
      <DialogDescription>
        Description
      </DialogDescription>
    </DialogHeader>
    {/* Contenu */}
  </DialogContent>
</Dialog>
```

---

## 📱 Responsive Design

### Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Tablette portrait
  md: '768px',   // Tablette paysage
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px', // Extra large desktop
}
```

### Patterns Responsive

#### Grilles

```tsx
// Mobile: 1 colonne, Tablette: 2 colonnes, Desktop: 3 colonnes
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
  {/* Cards */}
</div>
```

#### Flex

```tsx
// Mobile: colonne, Desktop: ligne
<div className="flex flex-col lg:flex-row gap-4">
  {/* Éléments */}
</div>
```

#### Affichage Conditionnel

```tsx
{/* Mobile: afficher, Desktop: cacher */}
<div className="block lg:hidden">
  {/* Menu mobile */}
</div>

{/* Mobile: cacher, Desktop: afficher */}
<div className="hidden lg:block">
  {/* Menu desktop */}
</div>
```

---

## 🎨 États Visuels

### Loading

```tsx
<div className="flex items-center justify-center p-8">
  <Loader2 className="w-8 h-8 animate-spin text-[#234D65]" />
  <span className="ml-2 text-kara-neutral-600">Chargement...</span>
</div>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center p-12 text-center">
  <Inbox className="w-16 h-16 text-kara-neutral-400 mb-4" />
  <h3 className="text-lg font-semibold text-kara-neutral-900 mb-2">
    Aucune demande trouvée
  </h3>
  <p className="text-sm text-kara-neutral-600">
    Commencez par créer une nouvelle demande
  </p>
</div>
```

### Error State

```tsx
<div className="flex flex-col items-center justify-center p-12 text-center">
  <AlertCircle className="w-16 h-16 text-kara-error mb-4" />
  <h3 className="text-lg font-semibold text-kara-neutral-900 mb-2">
    Erreur de chargement
  </h3>
  <p className="text-sm text-kara-neutral-600 mb-4">
    Une erreur est survenue lors du chargement des données
  </p>
  <Button onClick={retry}>Réessayer</Button>
</div>
```

---

## 🎯 Zones de Touch (Mobile)

### Tailles Minimales

- **Boutons** : `min-h-[44px]` (44x44px minimum)
- **Liens** : `min-h-[44px]` avec padding
- **Inputs** : `min-h-[44px]`
- **Cards cliquables** : Zone de tap claire

### Espacement

- **Entre éléments interactifs** : `gap-3` minimum (12px)
- **Padding interne** : `px-4 py-3` minimum

---

## 📚 Références

- **Shadcn UI** : https://ui.shadcn.com/
- **Tailwind CSS** : https://tailwindcss.com/
- **Design System KARA** : [`../../design-system/DESIGN_SYSTEM_COULEURS_KARA.md`](../../design-system/DESIGN_SYSTEM_COULEURS_KARA.md)

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior Designer UI/UX
