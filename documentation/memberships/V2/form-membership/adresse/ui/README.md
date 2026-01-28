# UI/UX – Step2 Adresse (V2)

## 🎨 Vue d'ensemble

Cette documentation décrit les propositions d'amélioration UI/UX pour le composant **Step2 Adresse** du formulaire d'adhésion, avec un focus sur l'expérience utilisateur, la responsivité et le respect du thème KARA.

## 📐 Analyse de l'UI actuelle

### Points forts ✅
- Structure claire avec cascade Province → Commune → District → Quarter
- Utilisation cohérente des couleurs KARA
- Animations d'entrée fluides
- Responsive design de base

### Points à améliorer 🔧
- **Visibilité de la cascade** : L'utilisateur ne voit pas clairement la dépendance entre les niveaux
- **Feedback visuel** : Manque d'indicateurs visuels pour les états (chargement, erreur, succès)
- **Guidage utilisateur** : Pas assez d'aide contextuelle pour comprendre le flux
- **Espacement** : Les Combobox sont espacées mais manquent de hiérarchie visuelle
- **Boutons d'ajout** : Les boutons "+" ne sont pas assez visibles pour les admins

## 🎯 Objectifs de design

1. **Clarté de la cascade** : Visualiser clairement la dépendance entre les niveaux
2. **Feedback immédiat** : Indicateurs visuels pour chaque état (vide, chargement, sélectionné, erreur)
3. **Guidage utilisateur** : Aide contextuelle et messages clairs
4. **Accessibilité** : Respect des standards WCAG 2.1
5. **Responsive** : Expérience optimale sur mobile, tablette et desktop

## 🎨 Thème Couleur KARA

### Palette principale
- **KARA Blue (Primary Dark)** : `#224D62` - Texte, bordures, éléments principaux
- **KARA Gold (Primary Light)** : `#CBB171` - Accents, hover, états actifs
- **Neutres** : Gris pour les textes secondaires et arrière-plans

### Utilisation dans Step2
```css
/* Couleurs principales */
--kara-primary-dark: #224D62;    /* Labels, bordures focus */
--kara-primary-light: #CBB171;   /* Accents, hover, sélection */
--kara-neutral-200: #dee2e6;     /* Bordures par défaut */
--kara-neutral-500: #6c757d;     /* Textes secondaires */
--kara-success: #10b981;          /* Validation réussie */
--kara-error: #ef4444;            /* Erreurs */
```

## 📱 Responsive Design

### Breakpoints
- **Mobile** : < 640px (sm)
- **Tablette** : 640px - 1024px (md)
- **Desktop** : > 1024px (lg)

### Stratégie responsive
- **Mobile** : Stack vertical (1 colonne), Combobox pleine largeur
- **Tablette** : 2 colonnes pour Province/Commune et District/Quarter
- **Desktop** : 2 colonnes avec plus d'espace, meilleure lisibilité

## 🖼️ Wireframes

Voir les fichiers détaillés :
- [Wireframe - État initial](./wireframe-etat-initial.md)
- [Wireframe - Recherche active](./wireframe-recherche-active.md)
- [Wireframe - Sélection complète](./wireframe-selection-complete.md)

## 🎭 États et interactions

### États des Combobox

#### 1. État initial (vide)
- Bordure : `border-kara-neutral-200`
- Fond : `bg-white`
- Placeholder : "Sélectionnez une province..."
- Icône : MapPin (gris)
- Hint : "Commencez par sélectionner une province"

#### 2. État désactivé (niveau parent non sélectionné)
- Bordure : `border-kara-neutral-200`
- Fond : `bg-kara-neutral-50`
- Texte : Gris clair
- Icône : Lock (petite)
- Message : "Sélectionnez d'abord [niveau parent]"

#### 3. État chargement
- Spinner animé dans le Combobox
- Bordure : `border-kara-primary-light`
- Message : "Chargement des [entités]..."

#### 4. État sélectionné
- Bordure : `border-kara-primary-light` (2px)
- Fond : `bg-kara-primary-light/5`
- Icône : CheckCircle (vert)
- Badge : Nom sélectionné en évidence

#### 5. État erreur
- Bordure : `border-kara-error`
- Fond : `bg-kara-error-light/10`
- Icône : AlertCircle (rouge)
- Message d'erreur en dessous

### Indicateurs de cascade

#### Flèche de progression
```
Province ──→ Commune ──→ District ──→ Quarter
  ✅          ⏳          🔒          🔒
```

- ✅ **Complété** : Badge vert avec check
- ⏳ **En cours** : Badge bleu avec spinner
- 🔒 **Verrouillé** : Badge gris avec cadenas

## 🎬 Animations et transitions

### Transitions de base
```css
/* Transition standard */
transition-all duration-300 ease-in-out

/* Hover */
hover:border-kara-primary-light hover:shadow-md

/* Focus */
focus:border-kara-primary-dark focus:ring-2 focus:ring-kara-primary-dark/20
```

### Animations spécifiques

#### 1. Apparition des Combobox (cascade)
- Délai progressif : 200ms, 300ms, 400ms, 500ms
- Animation : `fade-in slide-in-from-left-4`

#### 2. Feedback de sélection
- Badge de validation : `scale-in` (0.9 → 1.0)
- Durée : 200ms

#### 3. Chargement
- Spinner : Rotation continue
- Pulse sur le Combobox pendant le chargement

#### 4. Erreur
- Shake : `shake` animation (3 oscillations)
- Durée : 500ms

## 🎯 Améliorations proposées

### 1. Indicateur de progression de la cascade

**Problème actuel** : L'utilisateur ne voit pas clairement où il en est dans le processus.

**Solution** : Ajouter une barre de progression visuelle en haut du formulaire.

```tsx
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-2">
    <Badge variant={provinceSelected ? "success" : "default"}>
      Province {provinceSelected && <Check className="w-3 h-3 ml-1" />}
    </Badge>
    <ArrowRight className="w-4 h-4 text-kara-neutral-400" />
    <Badge variant={communeSelected ? "success" : provinceSelected ? "loading" : "default"}>
      Ville {communeSelected && <Check className="w-3 h-3 ml-1" />}
    </Badge>
    {/* ... */}
  </div>
</div>
```

### 2. Amélioration des Combobox

**Problème actuel** : Les Combobox manquent de feedback visuel.

**Solution** :
- Ajouter un indicateur de statut (icône) à droite
- Améliorer le style du placeholder
- Ajouter un compteur de résultats

```tsx
<Button className="...">
  <MapPin className="w-4 h-4 text-kara-primary-light" />
  <span>{selectedCommune?.name || "Sélectionnez une ville..."}</span>
  {selectedCommune && (
    <CheckCircle className="w-4 h-4 text-kara-success ml-auto" />
  )}
  {isLoading && (
    <Loader2 className="w-4 h-4 animate-spin text-kara-primary-dark ml-auto" />
  )}
</Button>
```

### 3. Amélioration des boutons d'ajout

**Problème actuel** : Les boutons "+" ne sont pas assez visibles.

**Solution** :
- Bouton plus visible avec label "Ajouter"
- Tooltip explicatif
- Badge "Admin" pour indiquer la fonctionnalité

```tsx
<Button
  variant="outline"
  size="sm"
  className="border-kara-primary-light text-kara-primary-dark hover:bg-kara-primary-light/10"
  title="Ajouter une nouvelle commune (Admin)"
>
  <Plus className="w-4 h-4 mr-1" />
  <span className="hidden sm:inline">Ajouter</span>
</Button>
```

### 4. Messages d'aide contextuels

**Problème actuel** : Pas assez de guidage pour l'utilisateur.

**Solution** : Ajouter des messages d'aide sous chaque Combobox.

```tsx
{!selectedProvinceId && (
  <p className="text-xs text-kara-neutral-500 mt-1 flex items-center gap-1">
    <Info className="w-3 h-3" />
    Commencez par sélectionner une province
  </p>
)}
{selectedProvinceId && !selectedCommuneId && (
  <p className="text-xs text-kara-neutral-500 mt-1 flex items-center gap-1">
    <Info className="w-3 h-3" />
    {allCommunes.length} ville(s) disponible(s)
  </p>
)}
```

### 5. Amélioration de la section "Informations complémentaires"

**Problème actuel** : Section peu visible et peu engageante.

**Solution** :
- Meilleur contraste visuel
- Exemples plus clairs
- Compteur de caractères optionnel

```tsx
<div className="bg-kara-neutral-50 rounded-xl p-4 border border-kara-neutral-200">
  <Label className="flex items-center gap-2">
    <FileText className="w-4 h-4 text-kara-primary-dark" />
    Informations complémentaires
    <Badge variant="secondary" className="text-xs">Optionnel</Badge>
  </Label>
  <Textarea
    placeholder="Ex: Proche du marché central, après la pharmacie, bâtiment bleu au 2ème étage..."
    className="mt-2"
  />
  <p className="text-xs text-kara-neutral-500 mt-2">
    Ces détails aideront à mieux vous localiser
  </p>
</div>
```

## 📱 Responsive - Détails par breakpoint

### Mobile (< 640px)
- **Layout** : Stack vertical complet
- **Combobox** : Pleine largeur, hauteur minimale 48px
- **Boutons** : Pleine largeur, icônes seulement
- **Espacement** : `space-y-4` (16px)
- **Texte** : Taille réduite (`text-sm`)

### Tablette (640px - 1024px)
- **Layout** : 2 colonnes pour Province/Commune et District/Quarter
- **Combobox** : Largeur adaptative
- **Boutons** : Icône + texte
- **Espacement** : `space-y-6` (24px)
- **Texte** : Taille normale (`text-base`)

### Desktop (> 1024px)
- **Layout** : 2 colonnes avec plus d'espace
- **Combobox** : Largeur optimale pour lisibilité
- **Boutons** : Icône + texte complet
- **Espacement** : `space-y-8` (32px)
- **Texte** : Taille normale, meilleure lisibilité

## 🧪 Test IDs pour E2E

Voir le fichier dédié : [test-ids.md](./test-ids.md)

## 📚 Références

- [Design System KARA](../../../../design-system/DESIGN_SYSTEM_COULEURS_KARA.md)
- [Documentation principale](../README.md)
- [Wireframes détaillés](./wireframe-etat-initial.md)
