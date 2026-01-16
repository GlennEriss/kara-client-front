# Guide des Couleurs KARA - Design System

## 🎨 Palette de Couleurs du Logo KARA

Les couleurs officielles du logo KARA sont :
- **KARA Blue (Primary Dark)** : `#224D62` - Utilisé pour le texte "KARA" et les formes du logo
- **KARA Gold (Primary Light)** : `#CBB171` - Utilisé pour l'icône sunburst au centre du logo

## 📋 Utilisation dans Tailwind CSS v4

### Classes Tailwind Disponibles

#### Couleurs Principales
```tsx
// KARA Blue (Primary Dark)
<div className="bg-kara-primary-dark">     {/* #224D62 */}
<div className="text-kara-primary-dark">
<div className="border-kara-primary-dark">

// KARA Gold (Primary Light)
<div className="bg-kara-primary-light">    {/* #CBB171 */}
<div className="text-kara-primary-light">
<div className="border-kara-primary-light">

// Variantes
<div className="bg-kara-secondary-dark">   {/* #1a3d4f */}
<div className="bg-kara-secondary-light">  {/* #d4c085 */}
```

#### Couleurs Neutres
```tsx
// Neutres (50 = le plus clair, 900 = le plus foncé)
<div className="bg-kara-neutral-50">
<div className="bg-kara-neutral-100">
<div className="bg-kara-neutral-200">
// ... jusqu'à neutral-900
```

#### Couleurs d'État
```tsx
// Success (Vert)
<div className="bg-kara-success">          {/* #10b981 */}
<div className="bg-kara-success-light">    {/* #d1fae5 */}

// Error (Rouge)
<div className="bg-kara-error">            {/* #ef4444 */}
<div className="bg-kara-error-light">      {/* #fee2e2 */}

// Warning (Orange)
<div className="bg-kara-warning">          {/* #f59e0b */}
<div className="bg-kara-warning-light">    {/* #fef3c7 */}

// Info (Bleu)
<div className="bg-kara-info">             {/* #3b82f6 */}
<div className="bg-kara-info-light">       {/* #dbeafe */}
```

### Variables CSS Disponibles

Pour une utilisation directe en CSS :

```css
/* Couleurs principales */
var(--kara-blue)          /* #224D62 */
var(--kara-gold)          /* #CBB171 */
var(--kara-blue-rgb)      /* 34, 77, 98 */
var(--kara-gold-rgb)      /* 203, 177, 113 */

/* Classes Tailwind */
var(--color-kara-primary-dark)
var(--color-kara-primary-light)
var(--color-kara-secondary-dark)
var(--color-kara-secondary-light)
```

## 🎯 Règles d'Utilisation

### Primary Dark (#224D62)
**Usage** :
- ✅ Textes principaux (titres, labels)
- ✅ Boutons principaux (actions principales)
- ✅ Bordures importantes
- ✅ États actifs/sélectionnés

**Exemple** :
```tsx
<h1 className="text-kara-primary-dark">Titre</h1>
<Button className="bg-kara-primary-dark">Valider</Button>
```

### Primary Light (#CBB171)
**Usage** :
- ✅ Accents (icônes, badges)
- ✅ États hover
- ✅ Éléments décoratifs
- ✅ Mise en évidence

**Exemple** :
```tsx
<Badge className="bg-kara-primary-light">Nouveau</Badge>
<Icon className="text-kara-primary-light" />
```

### Combinaisons Recommandées

```tsx
// Fond bleu foncé + texte blanc
<div className="bg-kara-primary-dark text-white">
  Contenu
</div>

// Fond doré + texte bleu foncé
<div className="bg-kara-primary-light text-kara-primary-dark">
  Contenu
</div>

// Bordure bleu foncé + fond blanc
<div className="border-2 border-kara-primary-dark bg-white">
  Contenu
</div>
```

## ⚠️ À Éviter

### ❌ Ne pas utiliser
- Couleurs en dur dans le code (`#224D62`, `#CBB171` directement)
- Autres bleus/dorés non standardisés
- Combinaisons de couleurs non testées

### ✅ À faire
- Utiliser les classes Tailwind (`kara-primary-dark`, `kara-primary-light`)
- Utiliser les variables CSS (`var(--kara-blue)`)
- Tester le contraste (WCAG AA minimum)

## 🔍 Migration depuis les Couleurs en Dur

### Avant (❌)
```tsx
<div className="text-[#224D62]">
<div className="bg-[#CBB171]">
<div style={{ color: '#224D62' }}>
```

### Après (✅)
```tsx
<div className="text-kara-primary-dark">
<div className="bg-kara-primary-light">
<div className="text-[--kara-blue]"> {/* ou utiliser var() en CSS */}
```

## 📱 Intégration avec Shadcn UI

Les couleurs KARA sont intégrées dans les variables Shadcn :

- `--primary` : Utilise KARA Blue (#224D62)
- `--secondary` : Utilise KARA Gold (#CBB171)
- `--ring` : Utilise KARA Blue pour les focus rings

**Exemple avec composants Shadcn** :
```tsx
<Button>                    {/* Utilise --primary (KARA Blue) */}
<Button variant="secondary"> {/* Utilise --secondary (KARA Gold) */}
```

## 🎨 Palette Complète

| Nom | Couleur | Code Hex | Usage |
|-----|---------|----------|-------|
| **KARA Blue** | 🔵 | `#224D62` | Primary, textes, boutons principaux |
| **KARA Gold** | 🟡 | `#CBB171` | Secondary, accents, hover |
| **Success** | 🟢 | `#10b981` | Succès, validation |
| **Error** | 🔴 | `#ef4444` | Erreurs, danger |
| **Warning** | 🟠 | `#f59e0b` | Avertissements |
| **Info** | 🔵 | `#3b82f6` | Informations |

## 📚 Références

- Logo KARA : `public/Logo-Kara.jpg`
- Configuration : `src/app/globals.css`
- Documentation Design System : `documentation/DESIGN_SYSTEM_ET_QUALITE_UI.md`
