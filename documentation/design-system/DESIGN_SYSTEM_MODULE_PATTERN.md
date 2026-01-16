# Pattern de Design Standard pour les Modules KARA

## 🎯 Objectif

Définir un pattern standardisé pour l'organisation et le design de tous les modules de l'application KARA, garantissant une cohérence visuelle et une expérience utilisateur uniforme.

---

## 📐 Structure Standard d'un Module

Chaque module doit suivre cette structure hiérarchique :

```
┌─────────────────────────────────────────────────────────┐
│ 1. HEADER (Titre + Description + Icône)                │
├─────────────────────────────────────────────────────────┤
│ 2. STATISTIQUES (Cards avec métriques clés)            │
├─────────────────────────────────────────────────────────┤
│ 3. TABS (Navigation entre sections si nécessaire)      │
├─────────────────────────────────────────────────────────┤
│ 4. FILTRES ET RECHERCHE (Barre de recherche + filtres) │
├─────────────────────────────────────────────────────────┤
│ 5. ACTIONS PRINCIPALES (Boutons d'action en haut)      │
├─────────────────────────────────────────────────────────┤
│ 6. CONTENU PRINCIPAL (Liste, tableau, ou grille)       │
└─────────────────────────────────────────────────────────┘
```

---

## 1. HEADER (En-tête du Module)

### Structure

```tsx
<div className="space-y-2">
  {/* Icône + Titre */}
  <div className="flex items-center gap-3">
    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#234D65] to-[#2c5a73] flex items-center justify-center">
      <IconComponent className="h-6 w-6 text-white" />
    </div>
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Titre du Module
      </h1>
      <p className="text-muted-foreground mt-1">
        Description courte du module et de son objectif
      </p>
    </div>
  </div>
</div>
```

### Règles

- **Titre** : `text-3xl font-bold tracking-tight text-gray-900`
- **Description** : `text-muted-foreground` (gris clair)
- **Icône** : Badge avec gradient KARA (`from-[#234D65] to-[#2c5a73]`)
- **Espacement** : `space-y-2` entre le titre et la description

---

## 2. STATISTIQUES (Cards de Métriques)

### Structure

```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {statsData.map((stat) => (
    <Card key={stat.title} className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {stat.title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">
          {stat.value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {stat.description}
        </p>
      </CardContent>
    </Card>
  ))}
</div>
```

### Règles

- **Grille responsive** : `md:grid-cols-2 lg:grid-cols-4`
- **Titre de la carte** : `text-sm font-medium text-gray-600`
- **Valeur** : `text-2xl font-bold text-gray-900`
- **Description** : `text-xs text-muted-foreground`
- **Hover effect** : `hover:shadow-md transition-shadow`

### Couleurs selon le type de métrique

- **Succès** : Icône verte (`text-green-600`)
- **Avertissement** : Icône orange (`text-orange-600`)
- **Erreur** : Icône rouge (`text-red-600`)
- **Info** : Icône bleue (`text-blue-600`)

---

## 3. TABS (Navigation par Onglets)

### Structure

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <TabsList className="grid w-full grid-cols-{nombre}"}>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
    {/* ... */}
  </TabsList>
  
  <TabsContent value="tab1" className="mt-6">
    {/* Contenu du tab */}
  </TabsContent>
</Tabs>
```

### Règles

- **Layout** : `grid w-full grid-cols-{nombre}` pour répartir équitablement
- **Espacement du contenu** : `mt-6` sur `TabsContent`
- Utiliser les composants Shadcn UI `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`

---

## 4. FILTRES ET RECHERCHE

### Structure

```tsx
<Card>
  <CardContent className="p-4">
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Barre de recherche */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="pl-9"
        />
      </div>
      
      {/* Filtres additionnels si nécessaire */}
      <Select>
        {/* Options de filtre */}
      </Select>
    </div>
  </CardContent>
</Card>
```

### Règles

- **Layout responsive** : `flex-col sm:flex-row`
- **Icône de recherche** : Positionnée absolument à gauche
- **Placeholder** : Clair et descriptif

---

## 5. ACTIONS PRINCIPALES (Boutons)

### Structure

```tsx
<div className="flex items-center gap-3">
  <Button variant="outline" size="sm" onClick={handleExport}>
    <Download className="h-4 w-4 mr-2" />
    Export CSV
  </Button>
  <Button variant="outline" size="sm" onClick={handleRefresh}>
    <RefreshCw className="h-4 w-4 mr-2" />
    Actualiser
  </Button>
  <Button 
    size="sm" 
    onClick={handleCreate}
    className="bg-[#234D65] hover:bg-[#234D65]/90 text-white"
  >
    <Plus className="h-4 w-4 mr-2" />
    Nouvelle Entité
  </Button>
</div>
```

### Règles

- **Bouton principal (création)** : 
  - Couleur KARA : `bg-[#234D65] hover:bg-[#234D65]/90`
  - Texte blanc : `text-white`
- **Boutons secondaires** : `variant="outline"`
- **Taille** : `size="sm"` pour les actions en haut
- **Icônes** : Toujours à gauche avec `mr-2`

### ⚠️ IMPORTANT : Visibilité des Boutons

- **Bouton primaire** : Toujours utiliser la couleur KARA (`bg-[#234D65]`) avec texte blanc
- **Boutons dans les formulaires** : 
  - Bouton "Enregistrer" : `bg-[#234D65] hover:bg-[#234D65]/90 text-white`
  - Bouton "Annuler" : `variant="outline"`
- **JAMAIS de boutons blancs sur fond blanc** sans bordure visible

---

## 6. CONTENU PRINCIPAL

### Liste/Tableau

```tsx
{isLoading ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
) : error ? (
  <Alert variant="destructive">
    <AlertDescription>
      Une erreur est survenue lors du chargement
    </AlertDescription>
  </Alert>
) : items.length > 0 ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {items.map((item) => (
      <Card key={item.id} className="hover:shadow-md transition-shadow">
        {/* Contenu de la carte */}
      </Card>
    ))}
  </div>
) : (
  <Card>
    <CardContent className="text-center py-12">
      Aucun élément trouvé
    </CardContent>
  </Card>
)}
```

### Règles

- **Grille responsive** : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- **États** : Gérer loading, error, empty, et success
- **Hover effect** : `hover:shadow-md transition-shadow` sur les cartes

---

## 🎨 Typographie

### Hiérarchie

- **Titre principal (h1)** : `text-3xl font-bold tracking-tight text-gray-900`
- **Titre de section (h2)** : `text-2xl font-bold text-gray-900`
- **Titre de carte** : `text-sm font-medium text-gray-600`
- **Texte principal** : `text-base text-gray-900`
- **Texte secondaire** : `text-sm text-gray-600`
- **Texte muted** : `text-xs text-muted-foreground`

### Polices

- **Famille** : `font-sans` (Inter par défaut)
- **Poids** : `font-bold` (titres), `font-medium` (sous-titres), `font-normal` (texte)

---

## 🎨 Couleurs (Design System KARA)

### Couleurs Principales

```css
/* Primaire KARA */
--kara-primary: #234D65;      /* Bleu foncé */
--kara-primary-light: #CBB171; /* Or/Doré */

/* Utilisation */
bg-[#234D65]              /* Fond bouton primaire */
text-white                 /* Texte sur fond primaire */
hover:bg-[#234D65]/90      /* Hover bouton primaire */
```

### Couleurs d'État

- **Succès** : `text-green-600`, `bg-green-50`
- **Erreur** : `text-red-600`, `bg-red-50`
- **Avertissement** : `text-orange-600`, `bg-orange-50`
- **Info** : `text-blue-600`, `bg-blue-50`

### Couleurs Neutres

- **Texte principal** : `text-gray-900`
- **Texte secondaire** : `text-gray-600`
- **Texte muted** : `text-muted-foreground` (gris clair)
- **Bordures** : `border-gray-200`

---

## 📱 Responsive Design

### Breakpoints Tailwind

- **sm** : `640px` (tablette portrait)
- **md** : `768px` (tablette paysage)
- **lg** : `1024px` (desktop)
- **xl** : `1280px` (large desktop)

### Patterns Responsive

- **Grilles** : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- **Flex** : `flex-col sm:flex-row`
- **Espacement** : `gap-4 sm:gap-6`
- **Padding** : `p-4 sm:p-6`

---

## ✅ Checklist pour un Nouveau Module

- [ ] Header avec titre, description et icône KARA
- [ ] Section statistiques avec cards (si applicable)
- [ ] Tabs si plusieurs sections (utilisant Shadcn UI)
- [ ] Barre de recherche avec icône
- [ ] Boutons d'action visibles (couleur KARA pour le primaire)
- [ ] Gestion des états (loading, error, empty, success)
- [ ] Responsive design (mobile, tablette, desktop)
- [ ] Typographie cohérente
- [ ] Utilisation des couleurs du design system KARA
- [ ] Hover effects et transitions

---

## 📚 Exemples de Référence

- **Dashboard** : `src/components/dashboard/Dashboard.tsx`
- **Membership Requests** : `src/components/memberships/MembershipRequestsList.tsx`
- **Groups** : `src/components/groups/GroupList.tsx`

---

## 🔄 Migration du Module Géographie

Le module Géographie doit être refactorisé pour respecter ce pattern :

1. ✅ Ajouter un header avec icône et description
2. ✅ Ajouter des statistiques (nombre de provinces, départements, etc.)
3. ✅ Améliorer la visibilité des boutons (couleur KARA)
4. ✅ Standardiser la typographie
5. ✅ Améliorer le responsive design
6. ✅ Ajouter des états de chargement cohérents
