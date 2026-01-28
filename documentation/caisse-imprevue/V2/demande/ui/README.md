# Wireframes UI/UX - Module Demandes Caisse Imprévue V2

> Wireframes complets pour toutes les vues du module Demandes Caisse Imprévue V2 (Mobile, Tablette, Desktop)

## 📋 Vue d'ensemble

Ce dossier contient les wireframes détaillés pour toutes les interfaces du module Demandes Caisse Imprévue V2, conçus selon les principes du Design System KARA et optimisés pour une expérience utilisateur exceptionnelle sur tous les appareils.

**Design System** : KARA (Bleu foncé #234D65, Or #CBB171)  
**Framework UI** : Shadcn UI  
**Responsive** : Mobile-first (320px+), Tablette (768px+), Desktop (1024px+)

---

## 📁 Structure des Wireframes

```
ui/
├── README.md                    # Ce fichier (vue d'ensemble)
├── WIREFRAME_LISTE.md          # Wireframe liste des demandes
├── WIREFRAME_CREATION.md       # Wireframe formulaire de création (3 étapes)
├── WIREFRAME_DETAILS.md        # Wireframe page de détails
├── WIREFRAME_MODALS.md         # Wireframes des modals (accepter, refuser, etc.)
└── DESIGN_SYSTEM.md            # Spécifications design system pour ce module
```

---

## 🎨 Principes de Design

### Palette de Couleurs KARA

```css
/* Couleurs Principales */
--kara-primary-dark: #234D65;      /* Bleu foncé - Principal */
--kara-primary-light: #CBB171;     /* Or/Doré - Accent */

/* Couleurs d'État */
--kara-success: #10b981;           /* Vert - Accepté */
--kara-error: #ef4444;             /* Rouge - Refusé */
--kara-warning: #f59e0b;           /* Orange - En attente */
--kara-info: #3b82f6;              /* Bleu - Info */

/* Couleurs Neutres */
--kara-neutral-50: #f8f9fa;        /* Fond très clair */
--kara-neutral-100: #e9ecef;       /* Fond clair */
--kara-neutral-200: #dee2e6;       /* Bordures */
--kara-neutral-600: #495057;       /* Texte secondaire */
--kara-neutral-900: #0d1117;       /* Texte principal */
```

### Typographie

- **Famille** : Inter (sans-serif)
- **Titres** : `font-black` (900), `tracking-tight`
- **Sous-titres** : `font-bold` (700)
- **Texte** : `font-normal` (400)
- **Texte secondaire** : `font-medium` (500)

### Espacements

- **Mobile** : `p-3` (12px), `gap-3` (12px)
- **Tablette** : `p-4` (16px), `gap-4` (16px)
- **Desktop** : `p-6` (24px), `gap-6` (24px)

### Breakpoints Responsive

- **Mobile** : `< 640px` (sm)
- **Tablette** : `640px - 1023px` (sm, md)
- **Desktop** : `≥ 1024px` (lg, xl)

---

## 📱 Vues à Wireframer

### 1. Liste des Demandes
- **Fichier** : `WIREFRAME_LISTE.md`
- **Vues** : Mobile, Tablette, Desktop
- **Sections** : Header, Stats, Tabs, Filtres, Recherche, Liste/Table, Pagination

### 2. Création de Demande
- **Fichier** : `WIREFRAME_CREATION.md`
- **Vues** : Mobile, Tablette, Desktop
- **Étapes** : Step 1 (Membre + Motif), Step 2 (Forfait), Step 3 (Contact d'urgence)

### 3. Détails d'une Demande
- **Fichier** : `WIREFRAME_DETAILS.md`
- **Vues** : Mobile, Tablette, Desktop
- **Sections** : Header, Informations générales, Motif, Forfait, Contact d'urgence, Tableau versements, Actions

### 4. Modals
- **Fichier** : `WIREFRAME_MODALS.md`
- **Modals** : Accepter, Refuser, Réouvrir, Supprimer, Créer contrat, Éditer
- **Vues** : Mobile, Tablette, Desktop

---

## 🎯 Objectifs UX

### Accessibilité
- ✅ Contraste suffisant (WCAG AA minimum)
- ✅ Focus visible sur tous les éléments interactifs
- ✅ Labels clairs et descriptifs
- ✅ Messages d'erreur explicites

### Performance
- ✅ Chargement progressif (skeleton loaders)
- ✅ Optimistic updates pour feedback immédiat
- ✅ Lazy loading des images
- ✅ Debounce sur les recherches

### Responsive
- ✅ Mobile-first approach
- ✅ Touch-friendly (zones de tap ≥ 44x44px)
- ✅ Navigation adaptative (menu hamburger sur mobile)
- ✅ Grilles flexibles (grid/flex)

### Cohérence
- ✅ Même design system que le reste de l'application
- ✅ Composants Shadcn UI standardisés
- ✅ Patterns de navigation familiers
- ✅ Feedback utilisateur uniforme (toasts, modals)

---

## 📚 Références

- **Solutions proposées** : [`../SOLUTIONS_PROPOSEES.md`](../SOLUTIONS_PROPOSEES.md)
- **Design System KARA** : [`../../design-system/DESIGN_SYSTEM_COULEURS_KARA.md`](../../design-system/DESIGN_SYSTEM_COULEURS_KARA.md)
- **Design System UI** : [`../../membership-requests/DESIGN_SYSTEM_UI.md`](../../membership-requests/DESIGN_SYSTEM_UI.md)
- **Wireframes Membership Requests** : [`../../membership-requests/WIREFRAME_UI.md`](../../membership-requests/WIREFRAME_UI.md)

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior Designer UI/UX
