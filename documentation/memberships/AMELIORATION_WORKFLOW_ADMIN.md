# Amélioration du Workflow Admin - Formulaire d'Ajout de Membre

## 📋 Problématique

Lors de l'ajout d'un membre via la page admin `/memberships/add`, l'administrateur rencontre plusieurs problèmes de workflow qui rendent le processus fastidieux :

### Problèmes identifiés

1. **Step 2 - Adresse de résidence** :
   - Si une province, ville, arrondissement ou quartier n'existe pas dans la base de données, l'admin doit :
     - Sortir du formulaire
     - Naviguer vers `/geographie`
     - Ajouter l'élément manquant
     - Revenir au formulaire
     - Retourner au Step 2
     - Sélectionner le nouvel élément
   - Les éléments ne sont pas triés par ordre alphabétique

2. **Step 3 - Informations professionnelles** :
   - **Entreprise** : Si l'entreprise n'existe pas, même processus (sortir → `/companies` → ajouter → revenir → Step 3)
   - **Adresse entreprise** : Même problème que Step 2 pour la géographie
   - **Profession** : 
     - Le champ n'est pas un combobox avec recherche
     - Les professions ne sont pas triées par ordre alphabétique
     - Si la profession n'existe pas, même processus (sortir → `/jobs` → ajouter → revenir → Step 3)

### Impact

- **Perte de contexte** : L'admin perd sa place dans le formulaire
- **Temps perdu** : Navigation inutile entre plusieurs pages
- **Risque d'erreur** : Possibilité d'oublier où on en était
- **Expérience utilisateur dégradée** : Workflow non intuitif

---

## 🎯 Solutions Proposées

### Solution 1 : Modals de Création Rapide Intégrés

#### Principe
Ajouter des boutons "+" (ou "Ajouter") à côté de chaque select/combobox pour ouvrir un modal de création rapide directement depuis le formulaire.

#### Avantages
- ✅ Pas de navigation hors du formulaire
- ✅ Conservation du contexte (step actuel, données déjà saisies)
- ✅ Création rapide et intuitive
- ✅ Sélection automatique après création

#### Implémentation

##### 1.1 Step 2 - Géographie

**Composants à créer :**
- `AddProvinceModal.tsx`
- `AddCommuneModal.tsx`
- `AddDistrictModal.tsx`
- `AddQuarterModal.tsx`

**Modifications dans `Step2.tsx` :**

```tsx
// Ajouter un bouton "+" à côté de chaque Select
<div className="flex items-center gap-2">
  <Select ...>
    {/* Select existant */}
  </Select>
  <Button
    type="button"
    variant="outline"
    size="icon"
    onClick={() => setShowAddProvinceModal(true)}
    className="h-10 w-10"
  >
    <Plus className="w-4 h-4" />
  </Button>
</div>

// Modal de création
<AddProvinceModal
  open={showAddProvinceModal}
  onClose={() => setShowAddProvinceModal(false)}
  onSuccess={(newProvince) => {
    // Sélectionner automatiquement la nouvelle province
    setValue('address.provinceId', newProvince.id)
    // Rafraîchir la liste des provinces
    refetchProvinces()
  }}
/>
```

**Fonctionnalités des modals :**
- Formulaire simplifié (champs essentiels uniquement)
- Validation en temps réel
- Toast de confirmation
- Rafraîchissement automatique de la liste après création
- Sélection automatique de l'élément créé

##### 1.2 Step 3 - Entreprise

**Composant à créer :**
- `AddCompanyModal.tsx`

**Modifications dans `CompanyCombobox.tsx` :**

```tsx
<Popover>
  <PopoverTrigger asChild>
    <div className="flex items-center gap-2">
      <Button variant="outline" ...>
        {/* Combobox existant */}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setShowAddCompanyModal(true)}
        className="h-10 w-10"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  </PopoverTrigger>
</Popover>

<AddCompanyModal
  open={showAddCompanyModal}
  onClose={() => setShowAddCompanyModal(false)}
  onSuccess={(newCompany) => {
    setValue('company.companyName', newCompany.name)
    refetchCompanies()
  }}
/>
```

##### 1.3 Step 3 - Profession

**Composant à créer :**
- `AddProfessionModal.tsx`

**Transformation du champ profession en Combobox :**

Créer `ProfessionCombobox.tsx` similaire à `CompanyCombobox.tsx` :

```tsx
// Utiliser useProfessions() pour récupérer toutes les professions
// Trier par ordre alphabétique
// Ajouter un bouton "+" pour créer une nouvelle profession
```

**Modifications dans `Step3.tsx` :**

Remplacer le champ Input par :
```tsx
<div className="flex items-center gap-2">
  <ProfessionCombobox form={form} />
  <Button
    type="button"
    variant="outline"
    size="icon"
    onClick={() => setShowAddProfessionModal(true)}
  >
    <Plus className="w-4 h-4" />
  </Button>
</div>
```

---

### Solution 2 : Tri Alphabétique Systématique

#### Principe
S'assurer que tous les selects/combobox affichent les éléments triés par ordre alphabétique (locale française).

#### Implémentation

##### 2.1 Step 2 - Géographie

**Modifications dans `Step2.tsx` :**

```tsx
// Trier les provinces
const sortedProvinces = useMemo(() => {
  return [...provinces].sort((a, b) => 
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  )
}, [provinces])

// Trier les communes
const sortedCommunes = useMemo(() => {
  return [...allCommunes].sort((a, b) => 
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  )
}, [allCommunes])

// Trier les districts
const sortedDistricts = useMemo(() => {
  return [...districts].sort((a, b) => 
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  )
}, [districts])

// Trier les quarters
const sortedQuarters = useMemo(() => {
  return [...quarters].sort((a, b) => 
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  )
}, [quarters])
```

##### 2.2 Step 3 - Entreprise

**Déjà implémenté dans `CompanyCombobox.tsx` :**
```tsx
const sortedCompanies = useMemo(() => {
  return [...companies].sort((a, b) => 
    a.name.localeCompare(b.name, 'fr')
  )
}, [companies])
```

##### 2.3 Step 3 - Profession

**À implémenter dans `ProfessionCombobox.tsx` :**
```tsx
const sortedProfessions = useMemo(() => {
  return [...professions].sort((a, b) => 
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  )
}, [professions])
```

##### 2.4 Step 3 - Adresse Entreprise

**Modifications dans `Step3.tsx` :**

Appliquer le même tri que pour Step 2 pour :
- `companyProvinces`
- `allCompanyCommunes`
- `companyDistricts`
- `companyQuarters`

---

### Solution 3 : Transformation du Champ Profession en Combobox

#### Principe
Remplacer le champ Input avec suggestions par un Combobox similaire à celui des entreprises.

#### Implémentation

**Créer `src/components/profession-form/ProfessionCombobox.tsx` :**

```tsx
'use client'

import React, { useState, useMemo } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { useProfessions } from '@/hooks/useProfessions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Check, ChevronsUpDown, Loader2, GraduationCap, AlertCircle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

interface ProfessionComboboxProps {
  form: UseFormReturn<RegisterFormData>
  onAddNew?: () => void // Callback pour ouvrir le modal d'ajout
}

export default function ProfessionCombobox({ form, onAddNew }: ProfessionComboboxProps) {
  const [open, setOpen] = useState(false)
  const { professions, isLoading, error, refetch } = useProfessions()
  const { watch, setValue, formState: { errors } } = form
  
  const selectedProfessionName = watch('company.profession') || ''
  
  // Trier les professions par ordre alphabétique
  const sortedProfessions = useMemo(() => {
    return [...professions].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [professions])

  const handleSelect = (professionName: string) => {
    setValue('company.profession', professionName === selectedProfessionName ? '' : professionName, { shouldValidate: true })
    setOpen(false)
  }

  return (
    <div className="space-y-2 w-full">
      <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
        Profession <span className="text-red-500">*</span>
      </Label>
      
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between h-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                errors?.company?.profession && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                selectedProfessionName && !errors?.company?.profession && "border-[#CBB171] bg-[#CBB171]/5"
              )}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <GraduationCap className="w-4 h-4 text-[#CBB171] flex-shrink-0" />
                <span className={cn(
                  "truncate text-sm",
                  !selectedProfessionName && "text-muted-foreground"
                )}>
                  {selectedProfessionName || "Sélectionnez une profession..."}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Rechercher une profession..." 
                className="h-9"
              />
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                  </div>
                ) : error ? (
                  <CommandEmpty>
                    <div className="flex items-center space-x-2 text-red-500 p-4">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {sortedProfessions.length === 0 ? (
                      <CommandEmpty>
                        <div className="p-4 text-center text-sm text-gray-500">
                          Aucune profession disponible.
                        </div>
                      </CommandEmpty>
                    ) : (
                      sortedProfessions.map((profession) => (
                        <CommandItem
                          key={profession.id}
                          value={profession.name}
                          onSelect={() => handleSelect(profession.name)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedProfessionName === profession.name
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            <GraduationCap className="w-4 h-4 text-[#224D62] flex-shrink-0" />
                            <span className="text-sm">{profession.name}</span>
                            {profession.category && (
                              <span className="text-xs text-gray-500 ml-auto">
                                {profession.category}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {onAddNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onAddNew}
            className="h-10 w-10"
            title="Ajouter une nouvelle profession"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {errors?.company?.profession && (
        <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
          <AlertCircle className="w-3 h-3" />
          <span>{errors.company.profession.message}</span>
        </div>
      )}
    </div>
  )
}
```

**Modifications dans `Step3.tsx` :**

```tsx
import ProfessionCombobox from '@/components/profession-form/ProfessionCombobox'

// Remplacer le champ profession existant par :
<ProfessionCombobox 
  form={form} 
  onAddNew={() => setShowAddProfessionModal(true)}
/>
```

---

## 📐 Architecture des Modals de Création Rapide

### Structure Générale

Tous les modals suivront cette structure :

```tsx
interface AddXModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newItem: X) => void
  // Props spécifiques si nécessaire (ex: provinceId pour commune)
  parentId?: string
}

export default function AddXModal({ open, onClose, onSuccess, parentId }: AddXModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm({ ... })
  const { create } = useXMutations() // Hook de mutation approprié

  const handleSubmit = async (data: XFormData) => {
    setIsSubmitting(true)
    try {
      const newItem = await create(data)
      toast.success(`${X} créé(e) avec succès`)
      onSuccess(newItem)
      form.reset()
      onClose()
    } catch (error) {
      toast.error(`Erreur lors de la création de ${X}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle {X}</DialogTitle>
          <DialogDescription>
            Créez rapidement une nouvelle {X} sans quitter le formulaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            {/* Champs du formulaire */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

### Exemple : AddProvinceModal

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useProvinceMutations } from '@/hooks/useGeographie'
import { provinceSchema, type ProvinceFormData } from '@/schemas/geographie.schema'
import type { Province } from '@/types/types'

interface AddProvinceModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newProvince: Province) => void
}

export default function AddProvinceModal({ open, onClose, onSuccess }: AddProvinceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { create } = useProvinceMutations()
  
  const form = useForm<ProvinceFormData>({
    resolver: zodResolver(provinceSchema),
    defaultValues: {
      name: '',
    }
  })

  const handleSubmit = async (data: ProvinceFormData) => {
    setIsSubmitting(true)
    try {
      const newProvince = await create(data)
      toast.success('Province créée avec succès')
      onSuccess(newProvince)
      form.reset()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la création de la province')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle province</DialogTitle>
          <DialogDescription>
            Créez rapidement une nouvelle province sans quitter le formulaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la province <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Estuaire" 
                      {...field} 
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🔄 Gestion du Rafraîchissement des Données

### Principe
Après la création d'un nouvel élément, il faut :
1. Rafraîchir la liste correspondante
2. Sélectionner automatiquement le nouvel élément
3. Invalider le cache React Query si nécessaire

### Implémentation

**Dans les composants Step2 et Step3 :**

```tsx
// Utiliser useQueryClient pour invalider le cache
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

const handleProvinceCreated = (newProvince: Province) => {
  // Invalider le cache des provinces
  queryClient.invalidateQueries({ queryKey: ['provinces'] })
  
  // Sélectionner automatiquement la nouvelle province
  setValue('address.provinceId', newProvince.id, { shouldValidate: true })
  
  // Toast de confirmation
  toast.success(`Province "${newProvince.name}" créée et sélectionnée`)
}
```

---

## 📝 Checklist d'Implémentation

### Phase 1 : Tri Alphabétique
- [ ] Ajouter le tri dans `Step2.tsx` pour provinces, communes, districts, quarters
- [ ] Vérifier que `CompanyCombobox.tsx` trie correctement
- [ ] Créer `ProfessionCombobox.tsx` avec tri alphabétique
- [ ] Ajouter le tri dans `Step3.tsx` pour l'adresse entreprise

### Phase 2 : Modals de Création Rapide - Géographie
- [ ] Créer `AddProvinceModal.tsx`
- [ ] Créer `AddCommuneModal.tsx` (avec sélection de province/département)
- [ ] Créer `AddDistrictModal.tsx` (avec sélection de commune)
- [ ] Créer `AddQuarterModal.tsx` (avec sélection de district)
- [ ] Intégrer les modals dans `Step2.tsx`
- [ ] Intégrer les modals dans `Step3.tsx` (adresse entreprise)

### Phase 3 : Modals de Création Rapide - Entreprise et Profession
- [ ] Créer `AddCompanyModal.tsx`
- [ ] Intégrer dans `CompanyCombobox.tsx`
- [ ] Créer `AddProfessionModal.tsx`
- [ ] Créer `ProfessionCombobox.tsx`
- [ ] Intégrer dans `Step3.tsx`

### Phase 4 : Tests et Optimisations
- [ ] Tester le workflow complet
- [ ] Vérifier la gestion des erreurs
- [ ] Optimiser les performances (debounce, cache)
- [ ] Ajouter des indicateurs de chargement
- [ ] Documenter les nouvelles fonctionnalités

---

## 🎨 Améliorations UX Supplémentaires

### 1. Indicateurs Visuels
- Afficher un badge "Nouveau" sur les éléments récemment créés
- Animation lors de la sélection automatique
- Toast avec option "Annuler" pour revenir en arrière

### 2. Recherche Avancée
- Permettre la recherche par code postal (si applicable)
- Filtres multiples dans les combobox
- Historique des dernières sélections

### 3. Validation Contextuelle
- Vérifier si un élément existe déjà avant de proposer la création
- Suggérer des éléments similaires en cas de faute de frappe
- Validation en temps réel des noms (éviter les doublons)

### 4. Raccourcis Clavier
- `Ctrl/Cmd + K` pour ouvrir la recherche dans un combobox
- `Enter` pour créer rapidement
- `Escape` pour fermer les modals

---

## 🔍 Détection du Contexte Admin

### Principe
Les modals de création rapide ne doivent être disponibles que dans le contexte admin (`/memberships/add`), pas dans le formulaire public (`/register`).

### Implémentation

**Créer un hook `useIsAdminContext.ts` :**

```tsx
import { usePathname } from 'next/navigation'

export function useIsAdminContext() {
  const pathname = usePathname()
  return pathname?.startsWith('/memberships/add') ?? false
}
```

**Utilisation dans les composants :**

```tsx
const isAdminContext = useIsAdminContext()

{isAdminContext && (
  <Button onClick={() => setShowAddModal(true)}>
    <Plus className="w-4 h-4" />
  </Button>
)}
```

---

## 📊 Métriques de Succès

Pour mesurer l'efficacité des améliorations :

1. **Temps moyen de création d'un membre** : Devrait diminuer de 30-40%
2. **Nombre de navigations hors formulaire** : Devrait être proche de 0
3. **Taux d'abandon** : Devrait diminuer
4. **Satisfaction admin** : Feedback qualitatif

---

## 🚀 Conclusion

Ces améliorations permettront de :
- ✅ Réduire significativement le temps de création d'un membre
- ✅ Améliorer l'expérience utilisateur pour les administrateurs
- ✅ Éliminer les interruptions de workflow
- ✅ Rendre le processus plus intuitif et fluide

L'implémentation peut être faite de manière progressive, en commençant par le tri alphabétique (impact immédiat, faible effort), puis les modals de création rapide (impact majeur, effort modéré).

