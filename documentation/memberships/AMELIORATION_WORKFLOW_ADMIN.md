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

**⚠️ IMPORTANT : Hiérarchie Géographique Complète**

La structure géographique suit cette hiérarchie stricte :
```
Province → Département → Commune (Ville) → Arrondissement → Quartier
```

**Note importante :** Dans le formulaire `Step2.tsx`, les départements ne sont **pas affichés** à l'utilisateur car ils ne sont pas nécessaires pour la sélection. Cependant, ils sont **essentiels** pour créer une commune, car chaque commune appartient à un département.

**Composants à créer/modifier :**
- `AddProvinceModal.tsx` ✅ (déjà créé)
- `AddDepartmentModal.tsx` (nouveau - nécessaire pour créer une commune)
- `AddCommuneModal.tsx` ✅ (déjà créé, mais doit permettre la création de département)
- `AddDistrictModal.tsx` ✅ (déjà créé, mais doit suivre la hiérarchie complète)
- `AddQuarterModal.tsx` ✅ (déjà créé)

**Modifications dans `Step2.tsx` :**

```tsx
// Ajouter un bouton "+" à côté de chaque Select
<div className="flex items-center gap-2">
  <Select ...>
    {/* Select existant */}
  </Select>
  {isAdminContext && (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setShowAddProvinceModal(true)}
      className="h-10 w-10 flex-shrink-0"
      title="Ajouter une nouvelle province"
    >
      <Plus className="w-4 h-4" />
    </Button>
  )}
</div>

// Modal de création
<AddProvinceModal
  open={showAddProvinceModal}
  onClose={() => setShowAddProvinceModal(false)}
  onSuccess={(newProvince) => {
    queryClient.invalidateQueries({ queryKey: ['provinces'] })
    setValue('address.provinceId', newProvince.id, { shouldValidate: true })
    toast.success(`Province "${newProvince.name}" créée et sélectionnée`)
  }}
/>
```

**Fonctionnalités des modals :**
- Formulaire simplifié (champs essentiels uniquement)
- Validation en temps réel
- Toast de confirmation
- Rafraîchissement automatique de la liste après création
- Sélection automatique de l'élément créé
- Respect de la hiérarchie géographique complète

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

Tous les modals suivront cette structure de base, avec des adaptations selon la hiérarchie géographique :

```tsx
interface AddXModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newItem: X) => void
  // Props spécifiques selon la hiérarchie
  parentId?: string // ID du parent dans la hiérarchie
}

export default function AddXModal({ open, onClose, onSuccess, parentId }: AddXModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm({ ... })
  const { create } = useXMutations() // Hook de mutation approprié

  const handleSubmit = async (data: XFormData) => {
    setIsSubmitting(true)
    try {
      const newItem = await create.mutateAsync(data)
      toast.success(`${X} créé(e) avec succès`)
      onSuccess(newItem)
      form.reset()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || `Erreur lors de la création de ${X}`)
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
            {/* Champs du formulaire avec sélection hiérarchique si nécessaire */}
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

### Hiérarchie Géographique et Dépendances

**Structure complète :**
```
Province (indépendant)
  └─ Département (dépend de Province)
      └─ Commune/Ville (dépend de Département)
          └─ Arrondissement (dépend de Commune)
              └─ Quartier (dépend de Arrondissement)
```

**Règles importantes :**
1. **Province** : Aucune dépendance, peut être créée directement
2. **Département** : Nécessite une Province (provinceId)
3. **Commune** : Nécessite un Département (departmentId), mais dans le formulaire register on passe par provinceId car on charge tous les départements de la province
4. **Arrondissement** : Nécessite une Commune (communeId), mais pour créer une commune depuis le modal, il faut pouvoir créer/sélectionner un département
5. **Quartier** : Nécessite un Arrondissement (districtId)

### Détails des Modals par Entité

#### 1. AddProvinceModal ✅ (Déjà implémenté)

**Dépendances :** Aucune

**Champs requis :**
- `name` : Nom de la province (ex: "Estuaire")
- `code` : Code de la province (ex: "EST")

**Structure :**
```tsx
interface AddProvinceModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newProvince: Province) => void
}
```

**Comportement :**
- Modal simple avec 2 champs (nom et code)
- Aucune sélection hiérarchique nécessaire
- Le code est automatiquement converti en majuscules

---

#### 2. AddDepartmentModal (À créer)

**Dépendances :** Province (provinceId)

**Champs requis :**
- `provinceId` : ID de la province (sélection depuis liste)
- `name` : Nom du département (ex: "Libreville")
- `code` : Code du département (optionnel)

**Structure :**
```tsx
interface AddDepartmentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newDepartment: Department) => void
  provinceId?: string // Province pré-sélectionnée si disponible depuis Step2
}
```

**Comportement :**
- Si `provinceId` est fourni en prop, le select de province est pré-rempli et désactivé
- Si `provinceId` n'est pas fourni, afficher un select de province (obligatoire)
- Permet de créer un département pour une province existante
- Utilisé principalement depuis `AddCommuneModal` quand aucun département n'existe pour la province sélectionnée

---

#### 3. AddCommuneModal ✅ (Déjà implémenté, mais à améliorer)

**Dépendances :** Département (departmentId), qui dépend lui-même de Province

**Champs requis :**
- `departmentId` : ID du département (sélection depuis liste filtrée par province)
- `name` : Nom de la commune (ex: "Libreville")
- `postalCode` : Code postal (optionnel, ex: "24100")
- `alias` : Alias de la commune (optionnel, ex: "LBV")

**Structure actuelle :**
```tsx
interface AddCommuneModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newCommune: Commune) => void
  provinceId?: string // Province pré-sélectionnée depuis Step2
}
```

**⚠️ Problème identifié :**
Le modal actuel demande seulement la sélection d'un département, mais si aucun département n'existe pour la province sélectionnée, l'admin ne peut pas créer la commune.

**Solution à implémenter :**
1. Afficher un bouton "+" à côté du select de département pour créer un nouveau département
2. Ouvrir `AddDepartmentModal` en cascade depuis `AddCommuneModal`
3. Après création du département, revenir à `AddCommuneModal` avec le département pré-sélectionné
4. Permettre la création complète de la chaîne : Province → Département → Commune

**Comportement amélioré :**
```tsx
// Dans AddCommuneModal
<div className="flex items-center gap-2">
  <Select
    value={selectedDepartmentId}
    onValueChange={handleDepartmentChange}
    disabled={!provinceId || departments.length === 0}
  >
    {/* Select de département */}
  </Select>
  {isAdminContext && (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setShowAddDepartmentModal(true)}
      className="h-10 w-10 flex-shrink-0"
      title="Créer un nouveau département"
      disabled={!provinceId}
    >
      <Plus className="w-4 h-4" />
    </Button>
  )}
</div>

// Modal de création de département en cascade
<AddDepartmentModal
  open={showAddDepartmentModal}
  onClose={() => setShowAddDepartmentModal(false)}
  onSuccess={(newDepartment) => {
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    setValue('departmentId', newDepartment.id, { shouldValidate: true })
    toast.success(`Département "${newDepartment.name}" créé et sélectionné`)
  }}
  provinceId={provinceId} // Pré-sélectionner la province
/>
```

---

#### 4. AddDistrictModal ✅ (Déjà implémenté, mais à améliorer)

**Dépendances :** Commune (communeId), qui dépend elle-même de Département → Province

**Champs requis :**
- `communeId` : ID de la commune (sélection depuis liste)
- `name` : Nom de l'arrondissement (ex: "1er arrondissement")

**Structure actuelle :**
```tsx
interface AddDistrictModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newDistrict: District) => void
  communeId?: string // Commune pré-sélectionnée depuis Step2
}
```

**⚠️ Problème identifié :**
Le modal actuel demande seulement la sélection d'une commune, mais dans le module géographie (`DistrictList.tsx`), le formulaire suit la hiérarchie complète : **Province → Département → Commune**.

**Solution à implémenter :**
Le modal doit suivre la même structure que dans le module géographie pour garantir la cohérence :

```tsx
// Structure améliorée avec sélection en cascade
<FormField
  control={form.control}
  name="communeId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Commune <span className="text-red-500">*</span></FormLabel>
      <div className="grid gap-3">
        {/* 1. Sélection de la Province */}
        <Select
          value={formProvinceId}
          onValueChange={(value) => {
            setFormProvinceId(value)
            setFormDepartmentId('all')
            field.onChange('')
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une province" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((province) => (
              <SelectItem key={province.id} value={province.id}>
                {province.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 2. Sélection du Département (filtré par province) */}
        <Select
          value={formDepartmentId}
          onValueChange={(value) => {
            setFormDepartmentId(value)
            field.onChange('')
          }}
          disabled={formProvinceId === 'all'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un département" />
          </SelectTrigger>
          <SelectContent>
            {departmentsForForm.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 3. Sélection de la Commune (filtrée par département) */}
        <Select
          onValueChange={field.onChange}
          value={field.value}
          disabled={formDepartmentId === 'all'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une commune" />
          </SelectTrigger>
          <SelectContent>
            {communesForForm.map((commune) => (
              <SelectItem key={commune.id} value={commune.id}>
                {commune.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Optimisation :**
- Si `communeId` est fourni en prop depuis Step2, pré-remplir automatiquement la hiérarchie complète (Province → Département → Commune) en désactivant les selects
- Sinon, permettre la navigation complète dans la hiérarchie

---

#### 5. AddQuarterModal ✅ (Déjà implémenté)

**Dépendances :** Arrondissement (districtId)

**Champs requis :**
- `districtId` : ID de l'arrondissement (sélection depuis liste)
- `name` : Nom du quartier (ex: "Glass")

**Structure :**
```tsx
interface AddQuarterModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newQuarter: Quarter) => void
  districtId?: string // Arrondissement pré-sélectionné depuis Step2
}
```

**Comportement :**
- Si `districtId` est fourni en prop, le select est pré-rempli et désactivé
- Sinon, afficher un select d'arrondissement (obligatoire)
- Modal simple, pas de hiérarchie complexe nécessaire

---

## 🔄 Gestion du Rafraîchissement des Données

### Principe
Après la création d'un nouvel élément, il faut :
1. Rafraîchir la liste correspondante
2. Sélectionner automatiquement le nouvel élément
3. Invalider le cache React Query si nécessaire
4. Gérer les dépendances hiérarchiques (ex: invalider les départements après création de province)

### Implémentation

**Dans les composants Step2 et Step3 :**

```tsx
// Utiliser useQueryClient pour invalider le cache
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const queryClient = useQueryClient()

// Exemple 1 : Création de province
const handleProvinceCreated = (newProvince: Province) => {
  // Invalider le cache des provinces
  queryClient.invalidateQueries({ queryKey: ['provinces'] })
  
  // Sélectionner automatiquement la nouvelle province
  setValue('address.provinceId', newProvince.id, { shouldValidate: true })
  
  // Toast de confirmation
  toast.success(`Province "${newProvince.name}" créée et sélectionnée`)
}

// Exemple 2 : Création de département (depuis AddCommuneModal)
const handleDepartmentCreated = (newDepartment: Department) => {
  // Invalider le cache des départements pour la province concernée
  queryClient.invalidateQueries({ queryKey: ['departments', newDepartment.provinceId] })
  queryClient.invalidateQueries({ queryKey: ['departments'] })
  
  // Sélectionner automatiquement le nouveau département dans le formulaire de commune
  setValue('departmentId', newDepartment.id, { shouldValidate: true })
  
  // Toast de confirmation
  toast.success(`Département "${newDepartment.name}" créé et sélectionné`)
}

// Exemple 3 : Création de commune
const handleCommuneCreated = (newCommune: Commune) => {
  // Invalider le cache des communes pour le département concerné
  queryClient.invalidateQueries({ queryKey: ['communes'] })
  queryClient.invalidateQueries({ queryKey: ['communes', newCommune.departmentId] })
  
  // Sélectionner automatiquement la nouvelle commune
  setValue('address.communeId', newCommune.id, { shouldValidate: true })
  
  // Toast de confirmation
  toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
}

// Exemple 4 : Création d'arrondissement
const handleDistrictCreated = (newDistrict: District) => {
  // Invalider le cache des arrondissements pour la commune concernée
  queryClient.invalidateQueries({ queryKey: ['districts'] })
  queryClient.invalidateQueries({ queryKey: ['districts', newDistrict.communeId] })
  
  // Sélectionner automatiquement le nouvel arrondissement
  setValue('address.districtId', newDistrict.id, { shouldValidate: true })
  
  // Toast de confirmation
  toast.success(`Arrondissement "${newDistrict.name}" créé et sélectionné`)
}

// Exemple 5 : Création de quartier
const handleQuarterCreated = (newQuarter: Quarter) => {
  // Invalider le cache des quartiers pour l'arrondissement concerné
  queryClient.invalidateQueries({ queryKey: ['quarters'] })
  queryClient.invalidateQueries({ queryKey: ['quarters', newQuarter.districtId] })
  
  // Sélectionner automatiquement le nouveau quartier
  setValue('address.quarterId', newQuarter.id, { shouldValidate: true })
  
  // Toast de confirmation
  toast.success(`Quartier "${newQuarter.name}" créé et sélectionné`)
}
```

### Gestion des Créations en Cascade

Quand un élément parent est créé depuis un modal enfant (ex: créer un département depuis `AddCommuneModal`), il faut :

1. **Fermer le modal parent temporairement** (ou garder ouvert selon UX)
2. **Ouvrir le modal enfant** (`AddDepartmentModal`)
3. **Après création réussie** :
   - Fermer le modal enfant
   - Rafraîchir les données dans le modal parent
   - Pré-sélectionner l'élément créé dans le modal parent
   - Revenir au modal parent pour continuer la création

**Exemple d'implémentation :**

```tsx
// Dans AddCommuneModal
const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false)

const handleDepartmentCreated = (newDepartment: Department) => {
  // Invalider le cache
  queryClient.invalidateQueries({ queryKey: ['departments'] })
  
  // Pré-sélectionner le département dans le formulaire de commune
  form.setValue('departmentId', newDepartment.id, { shouldValidate: true })
  
  // Fermer le modal de département
  setShowAddDepartmentModal(false)
  
  // Toast de confirmation
  toast.success(`Département "${newDepartment.name}" créé et sélectionné`)
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

#### 2.1 Modals de Base
- [x] Créer `AddProvinceModal.tsx` ✅
- [x] Créer `AddCommuneModal.tsx` ✅ (existe mais nécessite amélioration)
- [x] Créer `AddDistrictModal.tsx` ✅ (existe mais nécessite amélioration)
- [x] Créer `AddQuarterModal.tsx` ✅

#### 2.2 Améliorations Nécessaires
- [ ] **Créer `AddDepartmentModal.tsx`** (nouveau composant requis)
  - Permet de créer un département pour une province
  - Utilisé depuis `AddCommuneModal` quand aucun département n'existe
  - Structure similaire à `AddProvinceModal` avec sélection de province

- [ ] **Améliorer `AddCommuneModal.tsx`**
  - Ajouter un bouton "+" à côté du select de département
  - Intégrer `AddDepartmentModal` en cascade
  - Gérer le rafraîchissement après création de département
  - Pré-sélectionner automatiquement le département créé

- [ ] **Améliorer `AddDistrictModal.tsx`**
  - Implémenter la sélection en cascade complète : Province → Département → Commune
  - Suivre la même structure que dans `DistrictList.tsx` du module géographie
  - Si `communeId` est fourni en prop, pré-remplir automatiquement la hiérarchie
  - Permettre la création de commune/département en cascade si nécessaire

#### 2.3 Intégration dans les Formulaires
- [x] Intégrer les modals dans `Step2.tsx` ✅
- [x] Intégrer les modals dans `Step3.tsx` (adresse entreprise) ✅
- [ ] Vérifier que tous les boutons "+" sont fonctionnels
- [ ] Tester les créations en cascade (Province → Département → Commune → Arrondissement → Quartier)

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

## ⚠️ Points Critiques et Cohérence avec le Module Géographie

### Importance de la Documentation

**⚠️ ATTENTION :** Cette documentation sert de référence pour l'implémentation. Si elle est incomplète ou incorrecte, les fonctionnalités résultantes seront incohérentes et difficiles à maintenir.

### Règles de Cohérence

1. **Respect de la Hiérarchie Géographique**
   - La hiérarchie **Province → Département → Commune → Arrondissement → Quartier** doit être respectée partout
   - Les modals doivent suivre la même structure que dans le module géographie (`/geographie`)
   - Les validations doivent vérifier l'existence des parents dans la hiérarchie

2. **Cohérence avec `DistrictList.tsx`**
   - Le modal `AddDistrictModal` dans le formulaire register doit suivre la même structure que dans `DistrictList.tsx`
   - Sélection en cascade : Province → Département → Commune
   - Ne pas simplifier au point de perdre la cohérence avec le module géographie

3. **Gestion des Départements**
   - Les départements ne sont **pas affichés** dans `Step2.tsx` car non nécessaires pour la sélection
   - Mais ils sont **essentiels** pour créer une commune
   - Le modal `AddCommuneModal` doit permettre la création de département si nécessaire

4. **Créations en Cascade**
   - Permettre la création complète de la chaîne depuis n'importe quel niveau
   - Exemple : Créer Province → Département → Commune depuis le bouton "+" de Commune
   - Gérer correctement les rafraîchissements et sélections automatiques

### Checklist de Vérification Avant Implémentation

Avant d'implémenter chaque modal, vérifier :

- [ ] La structure correspond à celle du module géographie
- [ ] Toutes les dépendances hiérarchiques sont gérées
- [ ] Les créations en cascade sont possibles
- [ ] Les rafraîchissements de cache sont corrects
- [ ] Les sélections automatiques fonctionnent
- [ ] Les validations sont cohérentes avec les schémas Zod
- [ ] Les toasts de confirmation sont présents
- [ ] Les états de chargement sont gérés
- [ ] Les erreurs sont gérées proprement

### Exemple de Workflow Complet

**Scénario :** Créer un quartier pour une nouvelle commune qui n'existe pas encore

1. Admin clique sur "+" à côté de "Quartier" dans Step2
2. `AddQuarterModal` s'ouvre, mais aucun arrondissement n'existe
3. Admin clique sur "+" à côté de "Arrondissement" dans le modal
4. `AddDistrictModal` s'ouvre, mais aucune commune n'existe
5. Admin clique sur "+" à côté de "Commune" dans le modal
6. `AddCommuneModal` s'ouvre, mais aucun département n'existe pour la province
7. Admin clique sur "+" à côté de "Département" dans le modal
8. `AddDepartmentModal` s'ouvre avec la province pré-sélectionnée
9. Admin crée le département → retour automatique à `AddCommuneModal` avec département sélectionné
10. Admin crée la commune → retour automatique à `AddDistrictModal` avec commune sélectionnée
11. Admin crée l'arrondissement → retour automatique à `AddQuarterModal` avec arrondissement sélectionné
12. Admin crée le quartier → retour à Step2 avec quartier sélectionné

**Ce workflow doit être fluide et sans interruption.**

---

## 🚀 Conclusion

Ces améliorations permettront de :
- ✅ Réduire significativement le temps de création d'un membre
- ✅ Améliorer l'expérience utilisateur pour les administrateurs
- ✅ Éliminer les interruptions de workflow
- ✅ Rendre le processus plus intuitif et fluide
- ✅ Maintenir la cohérence avec le module géographie
- ✅ Permettre la création complète de la hiérarchie géographique depuis le formulaire

L'implémentation peut être faite de manière progressive, en commençant par le tri alphabétique (impact immédiat, faible effort), puis les modals de création rapide (impact majeur, effort modéré).

**⚠️ IMPORTANT :** Respecter scrupuleusement cette documentation pour garantir la cohérence et la maintenabilité du code.

