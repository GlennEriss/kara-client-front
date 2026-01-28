# Solutions Proposées - Module Demandes Caisse Imprévue V2

> Document d'architecture, de design et d'implémentation pour la refonte complète du module Demandes Caisse Imprévue  
> **Approche Senior Dev / Senior Architecte / Senior Designer**

## 📋 Table des matières

1. [Architecture et Structure (Domains-Based)](#architecture-et-structure-domains-based)
2. [Solutions UX/UI](#solutions-uxui)
3. [Solutions Techniques](#solutions-techniques)
4. [Gestion du Cache et Performance](#gestion-du-cache-et-performance)
5. [Pagination Serveur et Recherche](#pagination-serveur-et-recherche)
6. [Responsive Design](#responsive-design)
7. [Problèmes Identifiés dans la Solution Initiale](#problèmes-identifiés-dans-la-solution-initiale)
8. [Plan d'Implémentation](#plan-dimplémentation)
9. [Composants à Créer](#composants-à-créer)

---

## 🏗️ Architecture et Structure (Domains-Based)

### 1. Nouvelle Structure de Fichiers

**Conformité avec `PLAN_MIGRATION_DOMAINS.md`** : Utilisation de la structure `domains/` pour respecter l'architecture DDD.

```
src/
├── app/(admin)/caisse-imprevue/demandes/
│   ├── page.tsx                    # Liste des demandes
│   ├── add/
│   │   └── page.tsx                # Page dédiée pour création (NOUVEAU)
│   └── [id]/
│       └── page.tsx                # Page de détails améliorée
│
├── domains/financial/caisse-imprevue/
│   ├── entities/
│   │   ├── demand.types.ts         # Types/interfaces CaisseImprevueDemand
│   │   ├── subscription.types.ts   # Types SubscriptionCI
│   │   └── demand-filters.types.ts # Types pour filtres et pagination
│   │
│   ├── repositories/
│   │   ├── DemandCIRepository.ts   # Repository pour les demandes (avec pagination serveur)
│   │   └── SubscriptionCIRepository.ts # Repository pour les forfaits (existant)
│   │
│   ├── services/
│   │   ├── CaisseImprevueService.ts # Service métier (existant, à étendre)
│   │   └── DemandSimulationService.ts # Service calculs simulation versements
│   │
│   ├── hooks/
│   │   ├── useCaisseImprevueDemands.ts # Hooks React Query (existant, à améliorer)
│   │   ├── useDemandForm.ts         # Hook gestion formulaire
│   │   ├── useDemandFormPersistence.ts # Hook persistance localStorage
│   │   ├── useSubscriptionsCICache.ts # Hook cache forfaits (NOUVEAU)
│   │   ├── useDemandSimulation.ts   # Hook calculs simulation
│   │   └── useDemandSearch.ts       # Hook recherche avec cache (NOUVEAU)
│   │
│   ├── components/
│   │   ├── demandes/
│   │   │   ├── ListDemandesV2.tsx   # Liste refactorisée (responsive)
│   │   │   ├── DemandCardV2.tsx    # Card améliorée (responsive)
│   │   │   ├── DemandTableV2.tsx    # Vraie vue liste (tableau responsive)
│   │   │   ├── DemandDetailV2.tsx   # Page de détails complète (responsive)
│   │   │   ├── StatisticsV2.tsx     # Stats uniformisées
│   │   │   ├── PaymentScheduleTable.tsx # Tableau récapitulatif versements (NOUVEAU)
│   │   │   └── filters/
│   │   │       ├── DemandFiltersV2.tsx # Filtres améliorés
│   │   │       ├── DemandSearchV2.tsx  # Recherche avec cache
│   │   │       └── DemandSortV2.tsx   # Tri (date, alphabétique)
│   │   │
│   │   ├── forms/
│   │   │   ├── CreateDemandFormV2.tsx # Formulaire multi-étapes (responsive)
│   │   │   └── steps/
│   │   │       ├── Step1Member.tsx  # Étape 1 : Membre + Motif
│   │   │       ├── Step2Forfait.tsx # Étape 2 : Forfait + Fréquence (avec cache)
│   │   │       └── Step3Contact.tsx # Étape 3 : Contact d'urgence (exclut membre)
│   │   │
│   │   └── modals/
│   │       ├── AcceptDemandModalV2.tsx # Modal amélioré (responsive)
│   │       ├── RejectDemandModalV2.tsx # Modal amélioré (responsive)
│   │       ├── ReopenDemandModalV2.tsx # Modal amélioré (responsive)
│   │       ├── DeleteDemandModalV2.tsx # Nouveau modal suppression
│   │       ├── EditDemandModalV2.tsx   # Nouveau modal édition
│   │       └── ConfirmContractModalV2.tsx # Modal confirmation création
│   │
│   └── schemas/
│       ├── caisse-imprevue.schema.ts # Schemas existants (à améliorer)
│       └── demand-steps.schema.ts    # Schemas par étape
│
├── shared/
│   ├── ui/                          # Composants UI réutilisables (shadcn)
│   ├── hooks/
│   │   └── usePagination.ts         # Hook pagination réutilisable
│   ├── components/
│   │   └── pagination/
│   │       └── PaginationWithEllipses.tsx # Composant pagination (réutiliser)
│   └── utils/
│       └── cache.ts                 # Utilitaires cache
│
└── contexts/
    └── DemandModalsContext.tsx      # Contexte gestion modals centralisée
```

### 2. Principes d'Architecture

#### 2.1. Domain-Driven Design (DDD)
- **Domaine** : `financial/caisse-imprevue`
- **Séparation des couches** : entities → repositories → services → hooks → components
- **Isolation** : Le domaine est autonome avec ses propres types, services et composants
- **Réutilisabilité** : Code partagé dans `shared/`

#### 2.2. Repository Pattern
- **Accès données** : Uniquement via les repositories
- **Abstraction** : Les services ne connaissent pas Firestore directement
- **Testabilité** : Facilite les mocks pour les tests

#### 2.3. Service Layer
- **Logique métier** : Centralisée dans les services
- **Orchestration** : Les services orchestrent les repositories
- **Validation** : Validation métier dans les services

---

## 🎨 Solutions UX/UI

### 1. Page Dédiée pour Création de Demande

#### Solution
**Créer `/caisse-imprevue/demandes/add` au lieu d'un modal**

**Avantages :**
- ✅ Pas de perte de données (navigation normale du navigateur)
- ✅ Plus d'espace pour le formulaire (responsive)
- ✅ Meilleure expérience utilisateur
- ✅ Possibilité d'utiliser le breadcrumb pour navigation
- ✅ URL partageable
- ✅ Historique de navigation

**Implémentation :**
```typescript
// app/(admin)/caisse-imprevue/demandes/add/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { CreateDemandFormV2 } from '@/domains/financial/caisse-imprevue/components/forms/CreateDemandFormV2'
import { useDemandForm } from '@/domains/financial/caisse-imprevue/hooks/useDemandForm'

export default function CreateDemandPage() {
  const router = useRouter()
  const { form, handleSubmit, handleReset } = useDemandForm()
  
  return (
    <div className="container mx-auto py-4 md:py-6 px-4 md:px-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/caisse-imprevue/demandes">
              Demandes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Nouvelle demande</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <CreateDemandFormV2 
        form={form}
        onSubmit={handleSubmit}
        onReset={handleReset}
        onCancel={() => router.push('/caisse-imprevue/demandes')}
      />
    </div>
  )
}
```

### 2. Persistance du Formulaire

#### Solution
**Implémenter localStorage avec hook dédié et expiration**

```typescript
// domains/financial/caisse-imprevue/hooks/useDemandFormPersistence.ts
import { useCallback, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { CaisseImprevueDemandFormInput } from '@/domains/financial/caisse-imprevue/schemas/caisse-imprevue.schema'
import { toast } from 'sonner'

const FORM_STORAGE_KEY = 'caisse-imprevue-demand-form'
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 heures

interface StoredFormData {
  data: Partial<CaisseImprevueDemandFormInput>
  timestamp: number
  version: string // Pour gérer les migrations de schéma
}

const CURRENT_VERSION = 'v2.0'

export function useDemandFormPersistence(
  form: UseFormReturn<CaisseImprevueDemandFormInput>,
  enabled: boolean = true
) {
  const saveFormData = useCallback((data: Partial<CaisseImprevueDemandFormInput>) => {
    if (!enabled) return
    
    try {
      const stored: StoredFormData = {
        data,
        timestamp: Date.now(),
        version: CURRENT_VERSION
      }
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(stored))
    } catch (error) {
      // localStorage peut être plein ou désactivé
      console.warn('Impossible de sauvegarder le formulaire:', error)
    }
  }, [enabled])

  const loadFormData = useCallback((): Partial<CaisseImprevueDemandFormInput> | null => {
    if (!enabled) return null
    
    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY)
      if (!stored) return null
      
      const parsed: StoredFormData = JSON.parse(stored)
      
      // Vérifier la version (gestion des migrations)
      if (parsed.version !== CURRENT_VERSION) {
        localStorage.removeItem(FORM_STORAGE_KEY)
        return null
      }
      
      // Vérifier l'expiration
      if (Date.now() - parsed.timestamp > STORAGE_EXPIRY_MS) {
        localStorage.removeItem(FORM_STORAGE_KEY)
        return null
      }
      
      return parsed.data
    } catch (error) {
      console.error('Erreur chargement formulaire:', error)
      localStorage.removeItem(FORM_STORAGE_KEY)
      return null
    }
  }, [enabled])

  const clearFormData = useCallback(() => {
    localStorage.removeItem(FORM_STORAGE_KEY)
  }, [])

  // Sauvegarder à chaque changement (debounced)
  useEffect(() => {
    if (!enabled) return
    
    const subscription = form.watch((data) => {
      // Debounce pour éviter trop d'écritures
      const timeoutId = setTimeout(() => {
        saveFormData(data)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    })
    
    return () => subscription.unsubscribe()
  }, [form, saveFormData, enabled])

  // Charger au montage
  useEffect(() => {
    if (!enabled) return
    
    const saved = loadFormData()
    if (saved) {
      form.reset(saved)
      toast.info('Données du formulaire restaurées', {
        description: 'Vos données précédentes ont été restaurées.',
        duration: 3000,
      })
    }
  }, []) // Une seule fois au montage

  return { saveFormData, loadFormData, clearFormData }
}
```

### 3. Exclusion du Membre dans le Contact d'Urgence

#### Solution
**Exclure automatiquement le membre sélectionné dans Step 1**

```typescript
// domains/financial/caisse-imprevue/components/forms/steps/Step3Contact.tsx
'use client'

import { UseFormReturn } from 'react-hook-form'
import { CaisseImprevueDemandFormInput } from '@/domains/financial/caisse-imprevue/schemas/caisse-imprevue.schema'
import EmergencyContactMemberSelector from '@/components/shared/EmergencyContactMemberSelector'
import { CAISSE_IMPREVUE_THEME } from '@/shared/constants/caisse-imprevue-theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step3ContactProps {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
}

export function Step3Contact({ form }: Step3ContactProps) {
  const emergencyContact = form.watch('emergencyContact')
  const memberId = form.watch('memberId') // ✅ Récupérer le membre sélectionné
  
  const handleUpdateField = useCallback((field: string, value: any) => {
    const currentEmergencyContact = form.getValues('emergencyContact') || {}
    const updatedEmergencyContact = {
      ...currentEmergencyContact,
      [field]: value
    }
    
    form.setValue('emergencyContact', updatedEmergencyContact, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    })
    form.trigger('emergencyContact')
  }, [form])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={cn("p-3 rounded-xl", CAISSE_IMPREVUE_THEME.steps.active.bg)}>
          <Phone className={cn("w-6 h-6", CAISSE_IMPREVUE_THEME.steps.active.text)} />
        </div>
        <div>
          <h3 className={cn("text-xl font-bold", CAISSE_IMPREVUE_THEME.primary.color)}>
            Contact d'urgence
          </h3>
          <p className="text-sm text-muted-foreground">
            Renseignez les informations du contact d'urgence
          </p>
        </div>
      </div>

      <Card className={cn(
        "border-2",
        CAISSE_IMPREVUE_THEME.cards.border,
        emergencyContact?.lastName && 
        emergencyContact?.phone1 && 
        emergencyContact?.relationship &&
        emergencyContact?.typeId &&
        emergencyContact?.idNumber &&
        emergencyContact?.documentPhotoUrl
          ? 'border-green-200 bg-green-50' 
          : 'border-gray-200 bg-white'
      )}>
        <CardContent className="pt-6">
          <EmergencyContactMemberSelector
            memberId={emergencyContact?.memberId}
            lastName={emergencyContact?.lastName || ''}
            firstName={emergencyContact?.firstName || ''}
            phone1={emergencyContact?.phone1 || ''}
            phone2={emergencyContact?.phone2 || ''}
            relationship={emergencyContact?.relationship || ''}
            idNumber={emergencyContact?.idNumber || ''}
            typeId={emergencyContact?.typeId || ''}
            documentPhotoUrl={emergencyContact?.documentPhotoUrl || ''}
            onUpdate={handleUpdateField}
            excludeMemberIds={memberId ? [memberId] : []} // ✅ Exclure le membre sélectionné
          />
        </CardContent>
      </Card>

      {/* Récapitulatif visuel */}
      {emergencyContact?.lastName && 
       emergencyContact?.phone1 && 
       emergencyContact?.relationship && 
       emergencyContact?.typeId && 
       emergencyContact?.idNumber && 
       emergencyContact?.documentPhotoUrl && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">
              Contact d&apos;urgence confirmé : {emergencyContact.lastName}
              {emergencyContact.firstName && ` ${emergencyContact.firstName}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 4. Cache des Forfaits dans Step 2

#### Solution
**Implémenter un cache React Query avec staleTime approprié**

```typescript
// domains/financial/caisse-imprevue/hooks/useSubscriptionsCICache.ts
import { useQuery } from '@tanstack/react-query'
import { SubscriptionCI } from '@/domains/financial/caisse-imprevue/entities/subscription.types'
import { ServiceFactory } from '@/shared/factories/ServiceFactory'

// Configuration du cache pour les forfaits
const SUBSCRIPTIONS_CI_CACHE = {
  QUERY_KEY: ['subscriptions-ci', 'active'],
  STALE_TIME_MS: 1000 * 60 * 30, // 30 minutes (données relativement stables)
  GC_TIME_MS: 1000 * 60 * 60,    // 1 heure (garde en cache 1h après inutilisation)
} as const

export function useSubscriptionsCICache() {
  return useQuery<SubscriptionCI[]>({
    queryKey: SUBSCRIPTIONS_CI_CACHE.QUERY_KEY,
    queryFn: async () => {
      const service = ServiceFactory.getCaisseImprevueService()
      const subscriptions = await service.getActiveSubscriptions()
      return subscriptions
    },
    staleTime: SUBSCRIPTIONS_CI_CACHE.STALE_TIME_MS,
    gcTime: SUBSCRIPTIONS_CI_CACHE.GC_TIME_MS,
    refetchOnWindowFocus: false, // Ne pas refetch au focus
    refetchOnReconnect: false,    // Ne pas refetch à la reconnexion
    // Les forfaits changent rarement, pas besoin de refetch automatique
  })
}

// Hook pour invalider le cache si nécessaire (après création/modification)
export function useInvalidateSubscriptionsCache() {
  const queryClient = useQueryClient()
  
  return useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: SUBSCRIPTIONS_CI_CACHE.QUERY_KEY 
    })
  }, [queryClient])
}
```

**Utilisation dans Step2Forfait :**
```typescript
// domains/financial/caisse-imprevue/components/forms/steps/Step2Forfait.tsx
export function Step2Forfait({ form }: { form: UseFormReturn<CaisseImprevueDemandFormInput> }) {
  // ✅ Utiliser le hook avec cache
  const { data: activeSubscriptions, isLoading, isError, error } = useSubscriptionsCICache()
  
  // Le cache est automatiquement géré par React Query
  // Pas besoin de refetch à chaque ouverture du formulaire
  // Les données sont récupérées une fois et mises en cache 30 minutes
}
```

### 5. Tableau Récapitulatif de Versements (Pas de Page Séparée)

#### Solution
**Créer un composant tableau dans la page de détails**

```typescript
// domains/financial/caisse-imprevue/components/demandes/PaymentScheduleTable.tsx
'use client'

import { CaisseImprevueDemand } from '@/domains/financial/caisse-imprevue/entities/demand.types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Calculator } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useDemandSimulation } from '@/domains/financial/caisse-imprevue/hooks/useDemandSimulation'

interface PaymentScheduleTableProps {
  demand: CaisseImprevueDemand
}

export function PaymentScheduleTable({ demand }: PaymentScheduleTableProps) {
  const simulation = useDemandSimulation(demand)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Récapitulatif des versements
        </CardTitle>
        <CardDescription>
          Calendrier des versements prévus selon le forfait sélectionné
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Date de versement</TableHead>
                <TableHead className="text-right">Montant versé</TableHead>
                <TableHead className="text-right">Cumul</TableHead>
                {demand.paymentFrequency === 'DAILY' && (
                  <TableHead className="text-right">Versements du mois</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {simulation.schedule.map((payment, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(payment.date), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {payment.amount.toLocaleString('fr-FR')} FCFA
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {payment.cumulative.toLocaleString('fr-FR')} FCFA
                  </TableCell>
                  {demand.paymentFrequency === 'DAILY' && (
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {payment.monthlyCount} versements
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {/* Ligne total */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={demand.paymentFrequency === 'DAILY' ? 4 : 3}>
                  Total ({simulation.totalMonths} mois)
                </TableCell>
                <TableCell className="text-right text-lg text-primary">
                  {simulation.totalAmount.toLocaleString('fr-FR')} FCFA
                </TableCell>
                {demand.paymentFrequency === 'DAILY' && (
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {simulation.totalPayments} versements
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        {/* Informations complémentaires */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-muted-foreground">Montant mensuel</p>
            <p className="text-lg font-bold text-blue-600">
              {demand.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-muted-foreground">Durée totale</p>
            <p className="text-lg font-bold text-green-600">
              {demand.subscriptionCIDuration} mois
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-muted-foreground">Fréquence</p>
            <Badge variant={demand.paymentFrequency === 'DAILY' ? 'default' : 'secondary'}>
              {demand.paymentFrequency === 'DAILY' ? 'Journalière' : 'Mensuelle'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 6. Scroll Automatique

#### Solution
**Implémenter scroll vers le haut à chaque changement d'étape**

```typescript
// domains/financial/caisse-imprevue/components/forms/CreateDemandFormV2.tsx
const stepRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  // Scroll vers le haut à chaque changement d'étape
  stepRef.current?.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  })
  
  // Focus sur le premier champ de l'étape (accessibilité)
  const firstInput = stepRef.current?.querySelector('input, textarea, select')
  if (firstInput instanceof HTMLElement) {
    setTimeout(() => {
      firstInput.focus()
      // Scroll supplémentaire si le champ est en bas de l'écran
      firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }
}, [currentStep])

return (
  <div ref={stepRef} className="space-y-6">
    {/* Contenu de l'étape */}
  </div>
)
```

### 7. Uniformisation du Design

#### Solution
**Créer un thème unifié et l'utiliser partout**

```typescript
// shared/constants/caisse-imprevue-theme.ts
export const CAISSE_IMPREVUE_THEME = {
  primary: {
    color: '#234D65',      // Bleu foncé (cohérent avec l'app)
    light: '#2c5a73',
    dark: '#1a3a4d',
    className: 'text-[#234D65]',
    bgClassName: 'bg-[#234D65]',
  },
  steps: {
    active: {
      bg: 'bg-[#234D65]',
      text: 'text-white',
      border: 'border-[#234D65]',
    },
    inactive: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-300',
    },
  },
  cards: {
    bg: 'bg-white',
    border: 'border-gray-200',
    shadow: 'shadow-md',
  },
} as const
```

---

## 🔧 Solutions Techniques

### 1. Refactorisation des Composants

#### Solution
**Extraire et organiser selon les principes SOLID**

```typescript
// domains/financial/caisse-imprevue/hooks/useDemandForm.ts
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { caisseImprevueDemandFormSchema, caisseImprevueDemandDefaultValues } from '@/domains/financial/caisse-imprevue/schemas/caisse-imprevue.schema'
import type { CaisseImprevueDemandFormInput } from '@/domains/financial/caisse-imprevue/schemas/caisse-imprevue.schema'
import { useDemandFormPersistence } from './useDemandFormPersistence'
import { useCallback } from 'react'

export function useDemandForm() {
  const form = useForm<CaisseImprevueDemandFormInput>({
    resolver: zodResolver(caisseImprevueDemandFormSchema),
    defaultValues: caisseImprevueDemandDefaultValues,
    mode: 'onChange', // Validation en temps réel
  })

  // Persistance automatique
  const { clearFormData } = useDemandFormPersistence(form, true)

  const handleReset = useCallback(() => {
    form.reset(caisseImprevueDemandDefaultValues)
    clearFormData()
  }, [form, clearFormData])

  const handleSubmit = useCallback(async (data: CaisseImprevueDemandFormInput) => {
    // Validation finale
    const isValid = await form.trigger()
    if (!isValid) {
      throw new Error('Le formulaire contient des erreurs')
    }
    
    // Soumission (sera géré par le composant parent)
    return data
  }, [form])

  return {
    form,
    handleReset,
    handleSubmit,
    clearFormData,
  }
}
```

---

## 💾 Gestion du Cache et Performance

### 1. Configuration du Cache React Query

#### Solution
**Créer des constantes de cache centralisées**

```typescript
// domains/financial/caisse-imprevue/constants/cache.ts
export const DEMAND_CI_CACHE = {
  // Clés de query
  QUERY_KEY: 'caisse-imprevue-demands',
  STATS_QUERY_KEY: 'caisse-imprevue-demands-stats',
  DETAIL_QUERY_KEY: 'caisse-imprevue-demand-detail',
  SEARCH_QUERY_KEY: 'caisse-imprevue-demand-search',
  SUBSCRIPTIONS_QUERY_KEY: 'subscriptions-ci-active',
  
  // Durées de cache (staleTime)
  STALE_TIME_MS: 1000 * 60 * 5,        // 5 minutes (liste des demandes)
  STATS_STALE_TIME_MS: 1000 * 60 * 15, // 15 minutes (stats)
  DETAIL_STALE_TIME_MS: 1000 * 60 * 10, // 10 minutes (détails)
  SEARCH_STALE_TIME_MS: 1000 * 60 * 2,  // 2 minutes (recherche)
  SUBSCRIPTIONS_STALE_TIME_MS: 1000 * 60 * 30, // 30 minutes (forfaits)
  
  // Durées de garbage collection (gcTime)
  GC_TIME_MS: 1000 * 60 * 10,           // 10 minutes
  STATS_GC_TIME_MS: 1000 * 60 * 30,     // 30 minutes
  DETAIL_GC_TIME_MS: 1000 * 60 * 20,   // 20 minutes
  SEARCH_GC_TIME_MS: 1000 * 60 * 5,    // 5 minutes
  SUBSCRIPTIONS_GC_TIME_MS: 1000 * 60 * 60, // 1 heure
} as const
```

### 2. Cache des Forfaits

#### Solution
**Hook dédié avec cache long terme**

```typescript
// domains/financial/caisse-imprevue/hooks/useSubscriptionsCICache.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SubscriptionCI } from '@/domains/financial/caisse-imprevue/entities/subscription.types'
import { ServiceFactory } from '@/shared/factories/ServiceFactory'
import { DEMAND_CI_CACHE } from '@/domains/financial/caisse-imprevue/constants/cache'
import { useCallback } from 'react'

export function useSubscriptionsCICache() {
  return useQuery<SubscriptionCI[]>({
    queryKey: [DEMAND_CI_CACHE.SUBSCRIPTIONS_QUERY_KEY],
    queryFn: async () => {
      const service = ServiceFactory.getCaisseImprevueService()
      return await service.getActiveSubscriptions()
    },
    staleTime: DEMAND_CI_CACHE.SUBSCRIPTIONS_STALE_TIME_MS,
    gcTime: DEMAND_CI_CACHE.SUBSCRIPTIONS_GC_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Les forfaits changent rarement, pas besoin de refetch automatique
  })
}

// Hook pour invalider le cache (après création/modification de forfait)
export function useInvalidateSubscriptionsCache() {
  const queryClient = useQueryClient()
  
  return useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: [DEMAND_CI_CACHE.SUBSCRIPTIONS_QUERY_KEY] 
    })
  }, [queryClient])
}
```

### 3. Cache des Listes de Demandes

#### Solution
**Cache avec invalidation intelligente**

```typescript
// domains/financial/caisse-imprevue/hooks/useCaisseImprevueDemands.ts (amélioré)
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DEMAND_CI_CACHE } from '@/domains/financial/caisse-imprevue/constants/cache'
import type { CaisseImprevueDemandFilters } from '@/domains/financial/caisse-imprevue/entities/demand-filters.types'

export function useCaisseImprevueDemands(
  filters: CaisseImprevueDemandFilters,
  page: number = 1,
  limit: number = 10
) {
  return useQuery({
    queryKey: [
      DEMAND_CI_CACHE.QUERY_KEY,
      filters,
      page,
      limit
    ],
    queryFn: async () => {
      const repository = RepositoryFactory.getDemandCIRepository()
      return await repository.getPaginated(filters, page, limit)
    },
    staleTime: DEMAND_CI_CACHE.STALE_TIME_MS,
    gcTime: DEMAND_CI_CACHE.GC_TIME_MS,
    // Refetch au focus seulement si les données sont stale
    refetchOnWindowFocus: 'always', // Mais avec staleTime, ça ne refetch que si stale
  })
}

// Hook pour invalider le cache après mutations
export function useInvalidateDemandsCache() {
  const queryClient = useQueryClient()
  
  return useCallback(() => {
    // Invalider toutes les pages de la liste
    queryClient.invalidateQueries({ 
      queryKey: [DEMAND_CI_CACHE.QUERY_KEY] 
    })
    // Invalider aussi les stats
    queryClient.invalidateQueries({ 
      queryKey: [DEMAND_CI_CACHE.STATS_QUERY_KEY] 
    })
  }, [queryClient])
}
```

### 4. Cache des Détails de Demande

#### Solution
**Cache avec préfetch depuis la liste**

```typescript
// domains/financial/caisse-imprevue/hooks/useCaisseImprevueDemand.ts (amélioré)
export function useCaisseImprevueDemand(demandId: string) {
  return useQuery({
    queryKey: [DEMAND_CI_CACHE.DETAIL_QUERY_KEY, demandId],
    queryFn: async () => {
      const repository = RepositoryFactory.getDemandCIRepository()
      return await repository.getById(demandId)
    },
    staleTime: DEMAND_CI_CACHE.DETAIL_STALE_TIME_MS,
    gcTime: DEMAND_CI_CACHE.DETAIL_GC_TIME_MS,
    enabled: !!demandId, // Ne pas fetch si pas d'ID
  })
}

// Fonction de préfetch (à utiliser dans la liste)
export function usePrefetchDemandDetail() {
  const queryClient = useQueryClient()
  
  return useCallback((demandId: string) => {
    queryClient.prefetchQuery({
      queryKey: [DEMAND_CI_CACHE.DETAIL_QUERY_KEY, demandId],
      queryFn: async () => {
        const repository = RepositoryFactory.getDemandCIRepository()
        return await repository.getById(demandId)
      },
      staleTime: DEMAND_CI_CACHE.DETAIL_STALE_TIME_MS,
    })
  }, [queryClient])
}
```

### 5. Cache des Résultats de Recherche

#### Solution
**Cache spécifique pour les recherches avec clé basée sur la query**

```typescript
// domains/financial/caisse-imprevue/hooks/useDemandSearch.ts
import { useQuery } from '@tanstack/react-query'
import { DEMAND_CI_CACHE } from '@/domains/financial/caisse-imprevue/constants/cache'
import { RepositoryFactory } from '@/shared/factories/RepositoryFactory'

export function useDemandSearch(
  searchQuery: string,
  filters: CaisseImprevueDemandFilters = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [
      DEMAND_CI_CACHE.SEARCH_QUERY_KEY,
      searchQuery.toLowerCase().trim(), // Normaliser la query
      filters
    ],
    queryFn: async () => {
      const repository = RepositoryFactory.getDemandCIRepository()
      return await repository.search(searchQuery, filters)
    },
    staleTime: DEMAND_CI_CACHE.SEARCH_STALE_TIME_MS,
    gcTime: DEMAND_CI_CACHE.SEARCH_GC_TIME_MS,
    enabled: enabled && searchQuery.trim().length >= 2, // Minimum 2 caractères
    // Si on recherche "Glenn" puis on revient rechercher "Glenn" dans les 2 minutes,
    // le cache est utilisé directement
  })
}
```

**Utilisation dans le composant de recherche :**
```typescript
// domains/financial/caisse-imprevue/components/demandes/filters/DemandSearchV2.tsx
export function DemandSearchV2({ onSearch }: { onSearch: (results: CaisseImprevueDemand[]) => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300) // Debounce 300ms
  
  // ✅ Cache automatique : si on recherche "Glenn" puis on revient, le cache est utilisé
  const { data: results, isLoading } = useDemandSearch(debouncedQuery, {}, !!debouncedQuery)
  
  useEffect(() => {
    if (results) {
      onSearch(results)
    }
  }, [results, onSearch])
  
  return (
    <Input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Rechercher par nom, prénom..."
    />
  )
}
```

---

## 📄 Pagination Serveur et Recherche

### 1. Pagination Serveur (Inspirée de membership-requests)

#### Solution
**Implémenter pagination serveur avec tri et ordre de priorité**

```typescript
// domains/financial/caisse-imprevue/repositories/DemandCIRepository.ts
import { collection, query, where, orderBy, limit, startAfter, getDocs, getCountFromServer, DocumentSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { CaisseImprevueDemand, CaisseImprevueDemandStatus } from '@/domains/financial/caisse-imprevue/entities/demand.types'
import type { CaisseImprevueDemandFilters } from '@/domains/financial/caisse-imprevue/entities/demand-filters.types'

export interface PaginatedDemands {
  items: CaisseImprevueDemand[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export class DemandCIRepository {
  private collectionRef = collection(db, 'caisseImprevueDemands')
  
  async getPaginated(
    filters: CaisseImprevueDemandFilters = {},
    page: number = 1,
    pageLimit: number = 10,
    sortBy: 'date' | 'alphabetical' = 'date',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedDemands> {
    const constraints: any[] = []
    
    // Filtres
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status))
    }
    
    if (filters.paymentFrequency && filters.paymentFrequency !== 'all') {
      constraints.push(where('paymentFrequency', '==', filters.paymentFrequency))
    }
    
    if (filters.memberId) {
      constraints.push(where('memberId', '==', filters.memberId))
    }
    
    // Tri selon le critère
    if (sortBy === 'date') {
      constraints.push(orderBy('createdAt', sortOrder))
    } else if (sortBy === 'alphabetical') {
      // Pour le tri alphabétique, on trie par nom puis prénom
      constraints.push(orderBy('memberLastName', sortOrder))
      constraints.push(orderBy('memberFirstName', sortOrder))
    }
    
    // Calculer le total AVANT la pagination
    const countQuery = query(this.collectionRef, ...constraints)
    const countSnapshot = await getCountFromServer(countQuery)
    const totalItems = countSnapshot.data().count
    
    // Pagination avec offset (pour navigation directe)
    if (page > 1) {
      const offset = (page - 1) * pageLimit
      const offsetQuery = query(this.collectionRef, ...constraints, limit(offset))
      const offsetSnapshot = await getDocs(offsetQuery)
      
      if (offsetSnapshot.docs.length > 0) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1]
        constraints.push(startAfter(lastDoc))
      } else {
        // Page vide
        return {
          items: [],
          pagination: {
            page,
            limit: pageLimit,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: page > 1,
          }
        }
      }
    }
    
    // Limite
    constraints.push(limit(pageLimit))
    
    // Exécuter la requête
    const q = query(this.collectionRef, ...constraints)
    const querySnapshot = await getDocs(q)
    
    const items: CaisseImprevueDemand[] = []
    querySnapshot.forEach((doc) => {
      items.push(this.transformDocument(doc.id, doc.data()))
    })
    
    const totalPages = Math.ceil(totalItems / pageLimit)
    
    return {
      items,
      pagination: {
        page,
        limit: pageLimit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }
  }
  
  // Recherche par nom/prénom (avec cache React Query)
  async search(
    searchQuery: string,
    filters: CaisseImprevueDemandFilters = {}
  ): Promise<CaisseImprevueDemand[]> {
    // Utiliser Algolia si disponible, sinon Firestore avec where
    // Pour l'instant, implémentation Firestore simple
    const constraints: any[] = []
    
    // Recherche par nom/prénom (nécessite index composite)
    // Note: Firestore ne supporte pas la recherche full-text native
    // On peut utiliser Algolia ou faire une recherche par préfixe
    
    // Pour l'instant, recherche simple par nom (nécessite index)
    if (searchQuery.trim().length >= 2) {
      // Utiliser where avec >= et <= pour recherche par préfixe
      const searchLower = searchQuery.toLowerCase()
      constraints.push(where('memberLastName', '>=', searchLower))
      constraints.push(where('memberLastName', '<=', searchLower + '\uf8ff'))
    }
    
    // Appliquer les autres filtres
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status))
    }
    
    constraints.push(orderBy('memberLastName', 'asc'))
    constraints.push(limit(50)) // Limite pour la recherche
    
    const q = query(this.collectionRef, ...constraints)
    const snapshot = await getDocs(q)
    
    const results: CaisseImprevueDemand[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      // Filtrer aussi par prénom côté client (si nécessaire)
      const matchesFirstName = !searchQuery || 
        data.memberFirstName?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesLastName = !searchQuery || 
        data.memberLastName?.toLowerCase().includes(searchQuery.toLowerCase())
      
      if (matchesFirstName || matchesLastName) {
        results.push(this.transformDocument(doc.id, data))
      }
    })
    
    return results
  }
}
```

### 2. Ordre de Priorité dans les Tabs

#### Solution
**Trier par statut puis par date**

```typescript
// domains/financial/caisse-imprevue/services/CaisseImprevueService.ts (extension)
async getDemandsWithPriority(
  filters: CaisseImprevueDemandFilters,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedDemands> {
  // Pour le tab "Toutes", ordre de priorité :
  // 1. PENDING (en attente) - par date décroissante
  // 2. APPROVED (acceptées) - par date décroissante
  // 3. REJECTED (refusées) - par date décroissante
  // 4. CONVERTED (converties) - par date décroissante
  // 5. REOPENED (réouvertes) - par date décroissante
  
  if (filters.status === 'all' || !filters.status) {
    // Récupérer toutes les demandes et les trier côté service
    const allDemands = await this.repository.getAll(filters)
    
    // Trier par priorité de statut puis par date
    const sorted = allDemands.sort((a, b) => {
      const statusPriority = {
        PENDING: 1,
        APPROVED: 2,
        REJECTED: 3,
        CONVERTED: 4,
        REOPENED: 5,
      }
      
      const priorityA = statusPriority[a.status] || 99
      const priorityB = statusPriority[b.status] || 99
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      
      // Même priorité : trier par date décroissante
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    
    // Pagination côté service (ou mieux : faire la pagination en base)
    const start = (page - 1) * limit
    const end = start + limit
    
    return {
      items: sorted.slice(start, end),
      pagination: {
        page,
        limit,
        totalItems: sorted.length,
        totalPages: Math.ceil(sorted.length / limit),
        hasNextPage: end < sorted.length,
        hasPrevPage: page > 1,
      }
    }
  }
  
  // Pour les tabs spécifiques, utiliser la pagination serveur normale
  return await this.repository.getPaginated(filters, page, limit, 'date', 'desc')
}
```

### 3. Composant Pagination (Réutiliser celui de membership-requests)

#### Solution
**Réutiliser PaginationWithEllipses en haut et en bas**

```typescript
// domains/financial/caisse-imprevue/components/demandes/ListDemandesV2.tsx
import { PaginationWithEllipses } from '@/shared/components/pagination/PaginationWithEllipses'

export function ListDemandesV2() {
  const { data, isLoading } = useCaisseImprevueDemands(filters, page, limit)
  
  return (
    <div className="space-y-6">
      {/* Pagination en haut */}
      <div className="flex justify-between items-center">
        <h2>Liste des demandes</h2>
        <PaginationWithEllipses
          currentPage={data?.pagination.page || 1}
          totalPages={data?.pagination.totalPages || 0}
          onPageChange={setPage}
          itemsPerPage={limit}
          onItemsPerPageChange={setLimit}
          totalItems={data?.pagination.totalItems || 0}
        />
      </div>
      
      {/* Liste/Grid */}
      {viewMode === 'grid' ? (
        <DemandGridV2 demands={data?.items || []} />
      ) : (
        <DemandTableV2 demands={data?.items || []} />
      )}
      
      {/* Pagination en bas */}
      <div className="flex justify-center">
        <PaginationWithEllipses
          currentPage={data?.pagination.page || 1}
          totalPages={data?.pagination.totalPages || 0}
          onPageChange={setPage}
          itemsPerPage={limit}
          onItemsPerPageChange={setLimit}
          totalItems={data?.pagination.totalItems || 0}
        />
      </div>
    </div>
  )
}
```

---

## 📱 Responsive Design

### 1. Breakpoints et Stratégie

#### Solution
**Utiliser les breakpoints Tailwind avec une approche mobile-first**

```typescript
// shared/constants/responsive.ts
export const BREAKPOINTS = {
  sm: 640,   // Mobile large
  md: 768,   // Tablette
  lg: 1024,  // Desktop
  xl: 1280,  // Desktop large
  '2xl': 1536, // Desktop très large
} as const

// Classes Tailwind à utiliser
export const RESPONSIVE_CLASSES = {
  // Grid responsive
  grid: {
    mobile: 'grid-cols-1',
    tablet: 'md:grid-cols-2',
    desktop: 'lg:grid-cols-3 xl:grid-cols-4',
  },
  // Espacement
  spacing: {
    mobile: 'space-y-4',
    tablet: 'md:space-y-6',
    desktop: 'lg:space-y-8',
  },
  // Padding
  padding: {
    mobile: 'p-4',
    tablet: 'md:p-6',
    desktop: 'lg:p-8',
  },
} as const
```

### 2. Formulaire Responsive

#### Solution
**Adapter le layout selon la taille d'écran**

```typescript
// domains/financial/caisse-imprevue/components/forms/CreateDemandFormV2.tsx
export function CreateDemandFormV2({ form, onSubmit, onReset, onCancel }: Props) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress indicator - Stack sur mobile, horizontal sur desktop */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-8 gap-4 md:gap-0">
        {/* Steps */}
      </div>
      
      {/* Formulaire - Full width sur mobile, centré sur desktop */}
      <Card className="w-full">
        <CardContent className="p-4 md:p-6 lg:p-8">
          {/* Contenu adaptatif */}
          <div className="space-y-6 md:space-y-8">
            {/* Step content */}
          </div>
        </CardContent>
      </Card>
      
      {/* Actions - Stack sur mobile, flex sur desktop */}
      <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-0 mt-6">
        <Button
          variant="outline"
          onClick={onCancel}
          className="w-full md:w-auto"
        >
          Annuler
        </Button>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          {/* Boutons navigation */}
        </div>
      </div>
    </div>
  )
}
```

### 3. Cards Grid Responsive

#### Solution
**Adapter le nombre de colonnes selon la taille d'écran**

```typescript
// domains/financial/caisse-imprevue/components/demandes/DemandCardV2.tsx
export function DemandGridV2({ demands }: { demands: CaisseImprevueDemand[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {demands.map((demand) => (
        <DemandCardV2 key={demand.id} demand={demand} />
      ))}
    </div>
  )
}

// Dans DemandCardV2
export function DemandCardV2({ demand }: { demand: CaisseImprevueDemand }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 md:p-6">
        {/* Header responsive */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-base md:text-lg font-semibold">
            {demand.memberFirstName} {demand.memberLastName}
          </h3>
          <Badge>{getStatusLabel(demand.status)}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 md:p-6 flex-1 space-y-3">
        {/* Contenu adaptatif */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {/* Informations */}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 md:p-6 flex flex-col gap-2">
        {/* Boutons - Full width sur mobile */}
        <Button className="w-full">Action</Button>
      </CardFooter>
    </Card>
  )
}
```

### 4. Tableau Responsive

#### Solution
**Scroll horizontal sur mobile, tableau complet sur desktop**

```typescript
// domains/financial/caisse-imprevue/components/demandes/DemandTableV2.tsx
export function DemandTableV2({ demands }: { demands: CaisseImprevueDemand[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[800px]"> {/* Largeur minimale pour le scroll */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden md:table-cell">Membre</TableHead>
              <TableHead className="hidden lg:table-cell">Téléphone</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead className="hidden sm:table-cell">Forfait</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demands.map((demand) => (
              <TableRow key={demand.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{demand.memberFirstName} {demand.memberLastName}</span>
                    <span className="text-xs text-muted-foreground md:hidden">
                      {demand.memberContacts?.[0]}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {demand.memberContacts?.[0] || '-'}
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="line-clamp-1 max-w-[150px] md:max-w-[200px]">
                        {demand.cause || 'Aucun motif'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      {demand.cause}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {demand.subscriptionCICode}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(demand.status)}>
                    {getStatusLabel(demand.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    {/* Menu actions */}
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

### 5. Modals Responsive

#### Solution
**Adapter la taille et le contenu selon l'écran**

```typescript
// domains/financial/caisse-imprevue/components/modals/AcceptDemandModalV2.tsx
export function AcceptDemandModalV2({ isOpen, onClose, demand, onSuccess }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">
            Accepter la demande
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {/* Cards avec grid responsive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Informations */}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button onClick={handleSubmit} className="w-full sm:w-auto">
            Accepter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🐛 Problèmes Identifiés dans la Solution Initiale

### 1. Exclusion du Membre dans Contact d'Urgence

#### Problème
**Le membre sélectionné dans Step 1 peut être sélectionné comme contact d'urgence**

#### Solution
✅ **Déjà implémenté** : Le prop `excludeMemberIds` est passé à `EmergencyContactMemberSelector` avec le `memberId` sélectionné.

**Vérification :**
```typescript
// Dans Step3Contact.tsx
<EmergencyContactMemberSelector
  excludeMemberIds={memberId ? [memberId] : []} // ✅ Correct
/>
```

**Amélioration suggérée :**
- Ajouter un message d'information si l'utilisateur essaie de rechercher son propre nom
- Afficher un toast si le membre sélectionné correspond au membre principal

### 2. Cache des Forfaits

#### Problème
**Les forfaits sont refetch à chaque ouverture du formulaire**

#### Solution
✅ **Implémenté** : Hook `useSubscriptionsCICache` avec `staleTime: 30 minutes`

**Configuration :**
- `staleTime: 30 minutes` : Les données sont considérées fraîches pendant 30 minutes
- `gcTime: 1 heure` : Garde en cache 1h après inutilisation
- Pas de refetch automatique au focus/reconnect

### 3. Simulation vs Tableau Récapitulatif

#### Problème
**Solution initiale proposait une "page de simulation" séparée**

#### Solution
✅ **Corrigé** : Composant `PaymentScheduleTable` intégré dans la page de détails

**Avantages :**
- Tout est visible en un seul endroit
- Pas de navigation supplémentaire
- Meilleure UX

### 4. Pagination Serveur

#### Problème
**Solution initiale ne mentionnait pas la pagination serveur**

#### Solution
✅ **Ajouté** : 
- Repository avec méthode `getPaginated` (inspirée de `membership-requests`)
- Tri par date et alphabétique
- Ordre de priorité dans le tab "Toutes"
- Pagination en haut et en bas

### 5. Cache des Listes et Détails

#### Problème
**Solution initiale ne détaillait pas la stratégie de cache**

#### Solution
✅ **Ajouté** :
- Configuration centralisée dans `constants/cache.ts`
- Cache différencié selon le type de données (liste, détails, recherche, stats)
- Invalidation intelligente après mutations
- Préfetch des détails depuis la liste

### 6. Responsive Design

#### Problème
**Solution initiale ne mentionnait pas la responsivité**

#### Solution
✅ **Ajouté** :
- Stratégie mobile-first
- Breakpoints définis
- Classes Tailwind responsive
- Adaptations pour formulaire, cards, tableaux, modals

### 7. Cache des Résultats de Recherche

#### Problème
**Solution initiale ne mentionnait pas le cache des recherches**

#### Solution
✅ **Ajouté** :
- Hook `useDemandSearch` avec cache dédié
- Clé de cache basée sur la query normalisée
- `staleTime: 2 minutes` pour les recherches
- Debounce pour éviter trop de requêtes

---

## 📅 Plan d'Implémentation

### Phase 1 : Fondations et Architecture (Semaine 1)

#### Jour 1-2 : Structure et Migration
- [ ] Créer la structure `domains/financial/caisse-imprevue/`
- [ ] Migrer les fichiers existants vers la nouvelle structure
- [ ] Mettre à jour tous les imports
- [ ] Créer les constantes de cache

#### Jour 3-4 : Hooks et Services
- [ ] Implémenter `useDemandFormPersistence`
- [ ] Implémenter `useSubscriptionsCICache`
- [ ] Créer la page `/add`
- [ ] Refactoriser `useDemandForm`

#### Jour 5 : Tests et Validation
- [ ] Tests de compilation
- [ ] Tests manuels de base
- [ ] Vérifier que la migration ne casse rien

### Phase 2 : Formulaire et UX Critique (Semaine 2)

#### Jour 1-2 : Formulaire Multi-Étapes
- [ ] Créer `CreateDemandFormV2` (responsive)
- [ ] Créer `Step1Member`, `Step2Forfait`, `Step3Contact`
- [ ] Implémenter scroll automatique
- [ ] Ajouter bouton réinitialisation
- [ ] Uniformiser le design (thème)

#### Jour 3 : Exclusion Membre
- [ ] Vérifier que `excludeMemberIds` fonctionne
- [ ] Ajouter message d'information si nécessaire
- [ ] Tests

#### Jour 4-5 : Cache Forfaits
- [ ] Implémenter `useSubscriptionsCICache`
- [ ] Tester que le cache fonctionne
- [ ] Vérifier qu'il n'y a pas de refetch inutile

### Phase 3 : Liste et Pagination (Semaine 3)

#### Jour 1-2 : Pagination Serveur
- [ ] Implémenter `getPaginated` dans `DemandCIRepository`
- [ ] Implémenter tri par date et alphabétique
- [ ] Implémenter ordre de priorité dans tab "Toutes"
- [ ] Créer les index Firestore nécessaires

#### Jour 3 : Composants Liste
- [ ] Créer `DemandCardV2` (responsive)
- [ ] Créer `DemandTableV2` (responsive)
- [ ] Intégrer `PaginationWithEllipses` (haut et bas)
- [ ] Réorganiser : Stats avant Tabs

#### Jour 4-5 : Cache Liste
- [ ] Implémenter cache avec `useCaisseImprevueDemands`
- [ ] Implémenter invalidation après mutations
- [ ] Tests de cache

### Phase 4 : Recherche et Filtres (Semaine 4)

#### Jour 1-2 : Recherche avec Cache
- [ ] Implémenter `useDemandSearch`
- [ ] Créer `DemandSearchV2` avec debounce
- [ ] Tester le cache des recherches
- [ ] Créer les index Firestore pour la recherche

#### Jour 3 : Filtres et Tri
- [ ] Créer `DemandFiltersV2`
- [ ] Créer `DemandSortV2`
- [ ] Intégrer dans `ListDemandesV2`

#### Jour 4-5 : Stats Uniformisées
- [ ] Créer `StatisticsV2` qui réutilise le composant existant
- [ ] Tester que le design est identique
- [ ] Intégrer dans la liste

### Phase 5 : Page Détails et Simulation (Semaine 5)

#### Jour 1-2 : Page Détails Complète
- [ ] Créer `DemandDetailV2` (responsive)
- [ ] Ajouter toutes les informations manquantes
- [ ] Ajouter section contact d'urgence
- [ ] Ajouter section motif

#### Jour 3 : Tableau Récapitulatif
- [ ] Créer `PaymentScheduleTable`
- [ ] Implémenter `useDemandSimulation`
- [ ] Calculer le calendrier des versements
- [ ] Distinguer DAILY vs MONTHLY

#### Jour 4 : Cache Détails
- [ ] Implémenter cache avec `useCaisseImprevueDemand`
- [ ] Implémenter préfetch depuis la liste
- [ ] Tests

#### Jour 5 : Tests et Validation
- [ ] Tests complets de la page détails
- [ ] Vérifier responsive
- [ ] Vérifier que toutes les infos s'affichent

### Phase 6 : Modals et Actions (Semaine 6)

#### Jour 1-2 : Modals Améliorés
- [ ] Améliorer `AcceptDemandModalV2` (responsive, toutes les infos)
- [ ] Améliorer `RejectDemandModalV2` (responsive, toutes les infos)
- [ ] Améliorer `ReopenDemandModalV2` (responsive, toutes les infos)

#### Jour 3 : Nouveaux Modals
- [ ] Créer `DeleteDemandModalV2`
- [ ] Créer `EditDemandModalV2`
- [ ] Créer `ConfirmContractModalV2`

#### Jour 4-5 : Intégration et Tests
- [ ] Intégrer tous les modals
- [ ] Tests complets
- [ ] Vérifier responsive

### Phase 7 : Tests et Documentation (Semaine 7)

#### Jour 1-3 : Tests
- [ ] Tests unitaires composants critiques
- [ ] Tests d'intégration flux principaux
- [ ] Tests E2E scénarios principaux

#### Jour 4-5 : Documentation
- [ ] Documentation composants
- [ ] Guide de migration V1 → V2
- [ ] Mettre à jour l'architecture

---

## 📦 Composants à Créer

### Nouveaux Composants (16)
1. `CreateDemandFormV2.tsx` - Formulaire principal (responsive)
2. `Step1Member.tsx` - Étape 1 (responsive)
3. `Step2Forfait.tsx` - Étape 2 (avec cache)
4. `Step3Contact.tsx` - Étape 3 (design uniforme, exclut membre)
5. `DemandCardV2.tsx` - Card améliorée (responsive, toutes les infos)
6. `DemandTableV2.tsx` - Tableau liste (responsive, vraie liste)
7. `DemandDetailV2.tsx` - Page détails complète (responsive)
8. `PaymentScheduleTable.tsx` - Tableau récapitulatif versements
9. `StatisticsV2.tsx` - Stats uniformisées
10. `DemandSearchV2.tsx` - Recherche avec cache
11. `DemandFiltersV2.tsx` - Filtres améliorés
12. `DemandSortV2.tsx` - Tri (date, alphabétique)
13. `AcceptDemandModalV2.tsx` - Modal amélioré (responsive, toutes les infos)
14. `RejectDemandModalV2.tsx` - Modal amélioré (responsive, toutes les infos)
15. `ReopenDemandModalV2.tsx` - Modal amélioré (responsive, toutes les infos)
16. `DeleteDemandModalV2.tsx` - Nouveau
17. `EditDemandModalV2.tsx` - Nouveau
18. `ConfirmContractModalV2.tsx` - Nouveau

### Nouveaux Hooks (5)
1. `useDemandFormPersistence.ts` - Persistance localStorage
2. `useDemandForm.ts` - Gestion formulaire
3. `useSubscriptionsCICache.ts` - Cache forfaits
4. `useDemandSimulation.ts` - Calculs simulation
5. `useDemandSearch.ts` - Recherche avec cache

### Nouveaux Contextes (1)
1. `DemandModalsContext.tsx` - Gestion modals centralisée

### Nouveaux Services (1)
1. `DemandSimulationService.ts` - Calculs simulation versements

### Nouveaux Constants (2)
1. `cache.ts` - Configuration cache React Query
2. `caisse-imprevue-theme.ts` - Thème unifié

---

## 🎯 Points d'Attention (Senior Dev)

### 1. Performance
- **Lazy loading** : Charger les composants lourds en lazy
- **Memoization** : Utiliser `useMemo` et `useCallback` pour éviter les re-renders
- **Virtualisation** : Pour les grandes listes (si > 100 items)

### 2. Accessibilité
- **ARIA labels** : Tous les éléments interactifs
- **Navigation clavier** : Gérer Tab, Enter, Escape
- **Focus management** : Focus visible et logique
- **Screen readers** : Textes alternatifs appropriés

### 3. Gestion d'Erreurs
- **Error boundaries** : Pour capturer les erreurs React
- **Retry logic** : Pour les requêtes qui échouent
- **Messages utilisateur** : Erreurs claires et actionnables

### 4. Tests
- **Tests unitaires** : Services, hooks, utilitaires
- **Tests d'intégration** : Flux utilisateur complets
- **Tests E2E** : Scénarios critiques avec Playwright

---

## 🎨 Points d'Attention (Senior Designer)

### 1. Design System
- **Cohérence** : Utiliser les mêmes composants que le reste de l'app
- **Couleurs** : Palette unifiée (pas d'orange dans Step 3)
- **Typographie** : Hiérarchie claire et lisible
- **Espacement** : Grille cohérente (4px, 8px, 16px, etc.)

### 2. Responsive Design
- **Mobile-first** : Concevoir d'abord pour mobile
- **Breakpoints** : Tester à chaque breakpoint
- **Touch targets** : Minimum 44x44px sur mobile
- **Contenu adaptatif** : Masquer/afficher selon l'écran

### 3. UX
- **Feedback visuel** : Loading states, success, errors
- **Progressive disclosure** : Ne pas tout afficher d'un coup
- **Affordances** : Boutons clairement identifiables
- **Micro-interactions** : Animations subtiles pour le feedback

---

## 🏛️ Points d'Attention (Senior Architecte)

### 1. Architecture
- **Séparation des couches** : Respecter entities → repositories → services → hooks → components
- **Dépendances** : Pas de dépendances circulaires
- **Abstraction** : Interfaces claires entre les couches
- **Testabilité** : Code facilement testable (injection de dépendances)

### 2. Scalabilité
- **Pagination** : Toujours paginer les grandes listes
- **Cache** : Stratégie de cache cohérente
- **Index Firestore** : Créer les index nécessaires
- **Optimisation requêtes** : Éviter les requêtes N+1

### 3. Maintenabilité
- **Documentation** : Commentaires JSDoc pour les fonctions complexes
- **Types** : Types stricts partout (pas de `any`)
- **Constantes** : Centraliser les constantes (magic numbers)
- **DRY** : Éviter la duplication de code

---

## 📚 Références

- **Architecture** : `documentation/architecture/PLAN_MIGRATION_DOMAINS.md`
- **Pagination** : Implémentation dans `src/domains/memberships/repositories/MembershipRepositoryV2.ts`
- **Cache** : Configuration dans `src/constantes/membership-requests.ts`
- **Design** : Composants dans `/caisse-speciale/demandes` et `/memberships`
- **Documentation V1** : `documentation/caisse-imprevue/V1/DEMANDES_CAISSE_IMPREVUE.md`

---

## 🔍 Analyse Détaillée des Problèmes et Solutions

### Problème 1 : Exclusion du Membre dans Contact d'Urgence

#### Analyse
**Symptôme** : Un membre peut être sélectionné comme son propre contact d'urgence, ce qui est logiquement incorrect.

**Cause racine** : Le composant `EmergencyContactMemberSelector` ne recevait pas l'information du membre sélectionné dans Step 1.

**Solution implémentée** :
```typescript
// ✅ Dans Step3Contact.tsx
const memberId = form.watch('memberId') // Récupérer le membre sélectionné

<EmergencyContactMemberSelector
  excludeMemberIds={memberId ? [memberId] : []} // ✅ Exclusion automatique
/>
```

**Améliorations supplémentaires** :
- Ajouter un message d'avertissement si l'utilisateur tape son propre nom
- Filtrer côté UI pour éviter même l'affichage du membre dans les résultats

```typescript
// Dans EmergencyContactMemberSelector
const filteredMembers = members.filter(m => {
  if (excludeMemberIds.includes(m.id || '')) return false // ✅ Exclusion
  // ... reste du filtre
})
```

### Problème 2 : Cache des Forfaits

#### Analyse
**Symptôme** : Les forfaits sont refetch à chaque ouverture du formulaire, même s'ils n'ont pas changé.

**Cause racine** : Le hook `useActiveSubscriptionsCI` existant a un `staleTime` de 5 minutes, mais il est peut-être invalide ou les données sont considérées comme stale trop rapidement.

**Solution implémentée** :
```typescript
// ✅ Nouveau hook avec cache optimisé
export function useSubscriptionsCICache() {
  return useQuery({
    queryKey: ['subscriptions-ci', 'active'],
    staleTime: 30 * 60 * 1000, // 30 minutes (données très stables)
    gcTime: 60 * 60 * 1000,     // 1 heure
    refetchOnWindowFocus: false, // Pas de refetch au focus
  })
}
```

**Stratégie de cache** :
- **staleTime: 30 min** : Les forfaits changent rarement, pas besoin de refetch fréquent
- **gcTime: 1h** : Garde en cache même après inutilisation
- **Pas de refetch automatique** : Les forfaits sont des données de référence

### Problème 3 : Tableau Récapitulatif vs Page Séparée

#### Analyse
**Symptôme** : Solution initiale proposait une page séparée pour la simulation, ce qui ajoute de la complexité.

**Cause racine** : Mauvaise compréhension du besoin utilisateur.

**Solution corrigée** :
- ✅ Composant `PaymentScheduleTable` intégré dans `DemandDetailV2`
- ✅ Affichage direct dans la page de détails
- ✅ Pas de navigation supplémentaire

**Avantages** :
- Tout est visible en un seul endroit
- Meilleure UX (pas de navigation)
- Moins de code à maintenir

### Problème 4 : Pagination Serveur

#### Analyse
**Symptôme** : Solution initiale ne mentionnait pas la pagination serveur, pourtant critique pour les performances.

**Cause racine** : Focus initial sur l'UX plutôt que sur les aspects techniques de performance.

**Solution implémentée** :
- ✅ Repository avec méthode `getPaginated` (inspirée de `membership-requests`)
- ✅ Utilisation de `startAfter` pour la pagination cursor-based
- ✅ Calcul du total avec `getCountFromServer`
- ✅ Support du tri (date, alphabétique)
- ✅ Ordre de priorité dans le tab "Toutes"

**Implémentation détaillée** :
```typescript
// Repository avec pagination serveur
async getPaginated(
  filters: CaisseImprevueDemandFilters,
  page: number,
  limit: number,
  sortBy: 'date' | 'alphabetical',
  sortOrder: 'asc' | 'desc'
): Promise<PaginatedDemands> {
  // 1. Construire les contraintes de filtre
  // 2. Ajouter le tri
  // 3. Calculer le total (avec getCountFromServer)
  // 4. Paginer avec startAfter
  // 5. Retourner les résultats + métadonnées de pagination
}
```

### Problème 5 : Ordre de Priorité dans les Tabs

#### Analyse
**Symptôme** : Dans le tab "Toutes", les demandes doivent être triées par priorité : PENDING → APPROVED → REJECTED → CONVERTED → REOPENED.

**Solution** :
- **Option A** : Tri côté serveur avec plusieurs requêtes (une par statut) puis merge
- **Option B** : Tri côté client après récupération (moins performant mais plus simple)
- **Option C** : Utiliser un champ calculé `priority` dans Firestore (meilleure performance)

**Recommandation** : Option C (champ calculé) pour de meilleures performances

```typescript
// Ajouter un champ priority lors de la création
const statusPriority = {
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
  CONVERTED: 4,
  REOPENED: 5,
}

// Dans le repository
const q = query(
  collectionRef,
  where('status', 'in', ['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED', 'REOPENED']),
  orderBy('priority', 'asc'), // Tri par priorité
  orderBy('createdAt', 'desc') // Puis par date
)
```

### Problème 6 : Responsive Design Absent

#### Analyse
**Symptôme** : Aucun composant n'est responsive, rendant l'application inutilisable sur mobile/tablette.

**Cause racine** : Focus initial uniquement sur desktop, pas de stratégie responsive.

**Solution complète** :
- ✅ Stratégie mobile-first
- ✅ Breakpoints définis
- ✅ Classes Tailwind responsive partout
- ✅ Tests sur différents devices

**Checklist responsive** :
- [ ] Formulaire : Stack vertical sur mobile, horizontal sur desktop
- [ ] Cards : 1 colonne mobile, 2 tablette, 3-4 desktop
- [ ] Tableaux : Scroll horizontal sur mobile, tableau complet desktop
- [ ] Modals : Full screen sur mobile, centré sur desktop
- [ ] Navigation : Menu hamburger sur mobile, sidebar sur desktop
- [ ] Touch targets : Minimum 44x44px sur mobile

### Problème 7 : Cache des Résultats de Recherche

#### Analyse
**Symptôme** : Rechercher "Glenn" puis rechercher à nouveau "Glenn" déclenche une nouvelle requête.

**Cause racine** : Pas de cache spécifique pour les recherches, ou cache mal configuré.

**Solution implémentée** :
```typescript
// Hook avec cache dédié
export function useDemandSearch(searchQuery: string, filters: CaisseImprevueDemandFilters) {
  return useQuery({
    queryKey: ['demand-search', searchQuery.toLowerCase().trim(), filters],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,     // 5 minutes
  })
}
```

**Stratégie** :
- Normaliser la query (lowercase, trim) pour éviter les doublons
- Cache court (2 min) car les recherches peuvent changer rapidement
- Debounce pour éviter trop de requêtes

---

## 🎯 Stratégies Avancées

### 1. Optimistic Updates

#### Solution
**Mettre à jour l'UI immédiatement avant la confirmation serveur**

```typescript
// Dans useCaisseImprevueDemandMutations
const approve = useMutation({
  mutationFn: async ({ demandId, reason }) => {
    return await service.approveDemand(demandId, reason)
  },
  onMutate: async ({ demandId }) => {
    // Annuler les requêtes en cours pour éviter les conflits
    await queryClient.cancelQueries({ queryKey: [DEMAND_CI_CACHE.QUERY_KEY] })
    
    // Snapshot de la valeur précédente
    const previousDemands = queryClient.getQueryData([DEMAND_CI_CACHE.QUERY_KEY])
    
    // Mise à jour optimiste
    queryClient.setQueryData([DEMAND_CI_CACHE.QUERY_KEY], (old: any) => {
      return old?.map((d: CaisseImprevueDemand) =>
        d.id === demandId ? { ...d, status: 'APPROVED' } : d
      )
    })
    
    return { previousDemands }
  },
  onError: (err, variables, context) => {
    // Rollback en cas d'erreur
    if (context?.previousDemands) {
      queryClient.setQueryData([DEMAND_CI_CACHE.QUERY_KEY], context.previousDemands)
    }
  },
  onSettled: () => {
    // Refetch pour s'assurer que les données sont à jour
    queryClient.invalidateQueries({ queryKey: [DEMAND_CI_CACHE.QUERY_KEY] })
  },
})
```

### 2. Prefetching Intelligent

#### Solution
**Précharger les données probables**

```typescript
// Préfetch des détails quand on survole une card
export function DemandCardV2({ demand }: { demand: CaisseImprevueDemand }) {
  const { prefetch } = usePrefetchDemandDetail()
  
  return (
    <Card
      onMouseEnter={() => {
        // Précharger les détails au survol
        prefetch(demand.id)
      }}
    >
      {/* ... */}
    </Card>
  )
}
```

### 3. Virtualisation pour Grandes Listes

#### Solution
**Utiliser react-window si > 100 items**

```typescript
import { FixedSizeList } from 'react-window'

export function DemandVirtualizedList({ demands }: { demands: CaisseImprevueDemand[] }) {
  if (demands.length < 100) {
    // Pas besoin de virtualisation
    return <DemandTableV2 demands={demands} />
  }
  
  // Virtualisation pour grandes listes
  return (
    <FixedSizeList
      height={600}
      itemCount={demands.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <DemandTableRow demand={demands[index]} />
        </div>
      )}
    </FixedSizeList>
  )
}
```

### 4. Gestion d'Erreurs Robuste

#### Solution
**Error boundaries et retry logic**

```typescript
// Error Boundary pour capturer les erreurs React
export class DemandErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Logger l'erreur
    console.error('Erreur dans le module Demandes:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}

// Retry logic dans les hooks
export function useCaisseImprevueDemands(...) {
  return useQuery({
    ...,
    retry: 3, // Retry 3 fois en cas d'échec
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })
}
```

### 5. Accessibilité (A11y)

#### Solution
**Implémenter les standards WCAG 2.1**

```typescript
// Exemple : Formulaire accessible
export function CreateDemandFormV2() {
  return (
    <form
      aria-label="Formulaire de création de demande Caisse Imprévue"
      noValidate
    >
      {/* Champs avec labels et descriptions */}
      <div role="group" aria-labelledby="step1-title">
        <h2 id="step1-title">Étape 1 : Sélection du membre</h2>
        <label htmlFor="member-search">
          Rechercher un membre
          <span className="sr-only">(obligatoire)</span>
        </label>
        <input
          id="member-search"
          aria-required="true"
          aria-describedby="member-search-help"
        />
        <p id="member-search-help" className="sr-only">
          Tapez le nom, prénom ou matricule du membre
        </p>
      </div>
      
      {/* Navigation au clavier */}
      <div role="navigation" aria-label="Navigation entre les étapes">
        <button
          type="button"
          aria-label="Étape précédente"
          onClick={handlePrev}
        >
          Précédent
        </button>
      </div>
    </form>
  )
}
```

---

## 📊 Métriques et Performance

### 1. Indicateurs de Performance

#### Objectifs
- **Time to Interactive (TTI)** : < 3 secondes
- **First Contentful Paint (FCP)** : < 1.5 secondes
- **Largest Contentful Paint (LCP)** : < 2.5 secondes
- **Cumulative Layout Shift (CLS)** : < 0.1

#### Mesures
```typescript
// Utiliser Web Vitals pour mesurer
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric: any) {
  // Envoyer les métriques à votre service d'analytics
  console.log(metric)
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)
```

### 2. Optimisations Performance

#### Code Splitting
```typescript
// Lazy load des composants lourds
const DemandDetailV2 = lazy(() => import('@/domains/financial/caisse-imprevue/components/demandes/DemandDetailV2'))
const PaymentScheduleTable = lazy(() => import('@/domains/financial/caisse-imprevue/components/demandes/PaymentScheduleTable'))

// Utilisation avec Suspense
<Suspense fallback={<Skeleton />}>
  <DemandDetailV2 demandId={id} />
</Suspense>
```

#### Memoization
```typescript
// Memoizer les composants coûteux
export const DemandCardV2 = React.memo(({ demand }: Props) => {
  // ...
}, (prevProps, nextProps) => {
  // Comparaison personnalisée
  return prevProps.demand.id === nextProps.demand.id &&
         prevProps.demand.status === nextProps.demand.status
})

// Memoizer les calculs coûteux
const sortedDemands = useMemo(() => {
  return demands.sort((a, b) => {
    // Tri complexe
  })
}, [demands])
```

---

## 🧪 Stratégie de Tests

### 1. Tests Unitaires

#### Services
```typescript
// domains/financial/caisse-imprevue/services/__tests__/DemandSimulationService.test.ts
describe('DemandSimulationService', () => {
  it('should calculate monthly schedule correctly', () => {
    const demand = createMockDemand({
      subscriptionCIAmountPerMonth: 10000,
      subscriptionCIDuration: 12,
      paymentFrequency: 'MONTHLY',
    })
    
    const simulation = DemandSimulationService.calculateSchedule(demand)
    
    expect(simulation.schedule).toHaveLength(12)
    expect(simulation.totalAmount).toBe(120000)
  })
})
```

#### Hooks
```typescript
// domains/financial/caisse-imprevue/hooks/__tests__/useDemandForm.test.ts
describe('useDemandForm', () => {
  it('should persist form data to localStorage', () => {
    const { result } = renderHook(() => useDemandForm())
    
    act(() => {
      result.current.form.setValue('memberId', 'test-member')
    })
    
    // Vérifier que les données sont dans localStorage
    const stored = localStorage.getItem('caisse-imprevue-demand-form')
    expect(stored).toContain('test-member')
  })
})
```

### 2. Tests d'Intégration

```typescript
// tests/integration/demandes/create-demand.test.ts
describe('Create Demand Flow', () => {
  it('should create a demand successfully', async () => {
    // 1. Remplir Step 1
    await userEvent.type(screen.getByLabelText('Rechercher un membre'), 'Glenn')
    await userEvent.click(screen.getByText('Glenn NDONG'))
    await userEvent.type(screen.getByLabelText('Motif'), 'Test motif de demande')
    
    // 2. Aller à Step 2
    await userEvent.click(screen.getByText('Suivant'))
    
    // 3. Sélectionner forfait
    await userEvent.click(screen.getByText('Forfait A'))
    
    // 4. Aller à Step 3
    await userEvent.click(screen.getByText('Suivant'))
    
    // 5. Remplir contact d'urgence (vérifier que Glenn est exclu)
    await userEvent.type(screen.getByLabelText('Rechercher un membre'), 'Glenn')
    expect(screen.queryByText('Glenn NDONG')).not.toBeInTheDocument() // ✅ Exclu
    
    // 6. Soumettre
    await userEvent.click(screen.getByText('Créer la demande'))
    
    // 7. Vérifier la création
    await waitFor(() => {
      expect(screen.getByText('Demande créée avec succès')).toBeInTheDocument()
    })
  })
})
```

### 3. Tests E2E

```typescript
// e2e/demandes/create-demand.spec.ts
import { test, expect } from '@playwright/test'

test('create demand flow', async ({ page }) => {
  await page.goto('/caisse-imprevue/demandes/add')
  
  // Step 1
  await page.fill('[placeholder="Nom, prénom ou matricule..."]', 'Glenn')
  await page.click('text=Glenn NDONG')
  await page.fill('textarea', 'Motif de test pour la demande')
  await page.click('text=Suivant')
  
  // Step 2
  await page.click('text=Forfait A')
  await page.click('text=Suivant')
  
  // Step 3
  await page.fill('[placeholder="Nom, prénom ou matricule..."]', 'Jean')
  await page.click('text=Jean DUPONT')
  // ... remplir les autres champs
  
  await page.click('text=Créer la demande')
  
  // Vérifier la redirection
  await expect(page).toHaveURL('/caisse-imprevue/demandes')
  await expect(page.locator('text=Demande créée avec succès')).toBeVisible()
})
```

---

## 🔐 Sécurité et Validation

### 1. Validation Côté Client et Serveur

#### Client (Zod)
```typescript
// Schemas avec validation stricte
export const caisseImprevueDemandFormSchema = z.object({
  memberId: z.string().min(1, 'Le membre est requis'),
  cause: z.string()
    .min(10, 'Le motif doit contenir au moins 10 caractères')
    .max(500, 'Le motif ne peut pas dépasser 500 caractères')
    .regex(/^[\s\S]*$/, 'Le motif contient des caractères invalides'),
  // ...
})
```

#### Serveur (Firestore Rules)
```javascript
// firestore.rules
match /caisseImprevueDemands/{demandId} {
  allow create: if isAdmin() && 
    request.resource.data.memberId is string &&
    request.resource.data.cause is string &&
    request.resource.data.cause.size() >= 10 &&
    request.resource.data.cause.size() <= 500 &&
    request.resource.data.emergencyContact is map &&
    request.resource.data.emergencyContact.lastName is string;
}
```

### 2. Sanitization des Données

```typescript
// Sanitizer pour les inputs utilisateur
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Pas de HTML
    ALLOWED_ATTR: [],
  })
}

// Utilisation
const sanitizedCause = sanitizeInput(form.getValues('cause'))
```

---

## 📈 Monitoring et Analytics

### 1. Tracking des Actions Utilisateur

```typescript
// Hook pour tracker les actions
export function useDemandAnalytics() {
  const trackEvent = useCallback((event: string, properties?: Record<string, any>) => {
    // Envoyer à votre service d'analytics (Google Analytics, Mixpanel, etc.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, properties)
    }
  }, [])
  
  return {
    trackDemandCreated: (demandId: string) => trackEvent('demand_created', { demandId }),
    trackDemandAccepted: (demandId: string) => trackEvent('demand_accepted', { demandId }),
    trackDemandRejected: (demandId: string) => trackEvent('demand_rejected', { demandId }),
    // ...
  }
}
```

### 2. Logging des Erreurs

```typescript
// Service de logging centralisé
export class Logger {
  static error(message: string, error: Error, context?: Record<string, any>) {
    console.error(message, error, context)
    
    // Envoyer à un service de logging (Sentry, LogRocket, etc.)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: { module: 'caisse-imprevue-demands' },
        extra: context,
      })
    }
  }
}

// Utilisation
try {
  await createDemand(data)
} catch (error) {
  Logger.error('Erreur création demande', error, { data })
  throw error
}
```

---

## 🚀 Déploiement et Migration

### 1. Plan de Migration V1 → V2

#### Étape 1 : Préparation
- [ ] Créer une branche `feature/caisse-imprevue-demands-v2`
- [ ] Créer la structure `domains/financial/caisse-imprevue/`
- [ ] Migrer les fichiers existants

#### Étape 2 : Implémentation Progressive
- [ ] Implémenter les nouveaux composants en parallèle des anciens
- [ ] Utiliser un feature flag pour basculer entre V1 et V2
- [ ] Tester en environnement de staging

#### Étape 3 : Migration des Données
- [ ] Vérifier que les données existantes sont compatibles
- [ ] Créer un script de migration si nécessaire
- [ ] Tester la migration sur un environnement de test

#### Étape 4 : Déploiement
- [ ] Déployer en preprod avec feature flag désactivé
- [ ] Activer pour un petit groupe d'utilisateurs (canary)
- [ ] Monitorer les erreurs et performances
- [ ] Activer pour tous les utilisateurs
- [ ] Désactiver V1 après validation

### 2. Feature Flags

```typescript
// shared/config/feature-flags.ts
export const FEATURE_FLAGS = {
  CAISSE_IMPREVUE_DEMANDS_V2: process.env.NEXT_PUBLIC_ENABLE_DEMANDS_V2 === 'true',
} as const

// Utilisation
export default function CaisseImprevueDemandesPage() {
  if (FEATURE_FLAGS.CAISSE_IMPREVUE_DEMANDS_V2) {
    return <ListDemandesV2 />
  }
  return <ListDemandes /> // V1
}
```

---

## 📝 Checklist de Validation

### Avant le Déploiement

#### Fonctionnel
- [ ] Tous les formulaires fonctionnent (création, édition)
- [ ] Tous les modals fonctionnent (accept, reject, reopen, delete)
- [ ] Pagination fonctionne (haut et bas)
- [ ] Recherche fonctionne avec cache
- [ ] Tri fonctionne (date, alphabétique)
- [ ] Filtres fonctionnent
- [ ] Exclusion du membre dans contact d'urgence fonctionne
- [ ] Cache des forfaits fonctionne
- [ ] Tableau récapitulatif s'affiche correctement

#### Technique
- [ ] Tous les tests passent
- [ ] Pas d'erreurs de compilation
- [ ] Pas d'erreurs de lint
- [ ] Performance acceptable (< 3s TTI)
- [ ] Responsive sur mobile, tablette, desktop
- [ ] Accessibilité (WCAG 2.1 niveau AA)

#### UX/UI
- [ ] Design uniforme (pas d'orange dans Step 3)
- [ ] Stats uniformisées avec autres modules
- [ ] Scroll automatique fonctionne
- [ ] Toutes les informations s'affichent
- [ ] Modals contiennent toutes les infos
- [ ] Cards contiennent toutes les infos
- [ ] Page détails contient toutes les infos

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Statut** : Solutions complètes et détaillées  
**Auteur** : Senior Dev / Senior Architecte / Senior Designer  
**Dernière mise à jour** : 2026-01-27

---

## 🔬 Détails d'Implémentation Avancés

### 1. Hook useDemandSimulation - Calculs Détaillés

#### Implémentation Complète
```typescript
// domains/financial/caisse-imprevue/hooks/useDemandSimulation.ts
import { useMemo } from 'react'
import { CaisseImprevueDemand } from '@/domains/financial/caisse-imprevue/entities/demand.types'
import { addMonths, addDays, startOfMonth, endOfMonth, format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PaymentScheduleItem {
  date: Date
  amount: number
  cumulative: number
  monthIndex: number
  monthlyCount?: number // Pour DAILY
}

interface DemandSimulation {
  schedule: PaymentScheduleItem[]
  totalAmount: number
  totalMonths: number
  totalPayments: number
  averageMonthlyAmount: number
}

export function useDemandSimulation(demand: CaisseImprevueDemand): DemandSimulation {
  return useMemo(() => {
    const startDate = new Date(demand.desiredDate)
    const schedule: PaymentScheduleItem[] = []
    let cumulative = 0
    let totalPayments = 0
    
    if (demand.paymentFrequency === 'MONTHLY') {
      // Versements mensuels
      for (let month = 0; month < demand.subscriptionCIDuration; month++) {
        const paymentDate = addMonths(startDate, month)
        const amount = demand.subscriptionCIAmountPerMonth
        cumulative += amount
        totalPayments++
        
        schedule.push({
          date: paymentDate,
          amount,
          cumulative,
          monthIndex: month,
        })
      }
    } else if (demand.paymentFrequency === 'DAILY') {
      // Versements quotidiens
      const dailyAmount = demand.subscriptionCIAmountPerMonth / 30 // Approximation
      let currentDate = startDate
      let monthIndex = 0
      let monthlyCount = 0
      let monthlyCumulative = 0
      
      for (let day = 0; day < demand.subscriptionCIDuration * 30; day++) {
        // Vérifier si on change de mois
        const currentMonth = currentDate.getMonth()
        const nextDate = addDays(currentDate, 1)
        const nextMonth = nextDate.getMonth()
        
        if (currentMonth !== nextMonth && monthlyCount > 0) {
          // Nouveau mois : réinitialiser le compteur mensuel
          monthIndex++
          monthlyCount = 0
          monthlyCumulative = 0
        }
        
        cumulative += dailyAmount
        monthlyCumulative += dailyAmount
        monthlyCount++
        totalPayments++
        
        schedule.push({
          date: currentDate,
          amount: dailyAmount,
          cumulative,
          monthIndex,
          monthlyCount,
        })
        
        currentDate = nextDate
      }
    }
    
    return {
      schedule,
      totalAmount: cumulative,
      totalMonths: demand.subscriptionCIDuration,
      totalPayments,
      averageMonthlyAmount: cumulative / demand.subscriptionCIDuration,
    }
  }, [demand])
}
```

### 2. Hook useDebounce pour la Recherche

#### Implémentation
```typescript
// shared/hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Utilisation dans DemandSearchV2
export function DemandSearchV2({ onSearch }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300) // Debounce 300ms
  
  const { data: results, isLoading } = useDemandSearch(debouncedQuery, {}, !!debouncedQuery)
  
  useEffect(() => {
    if (results) {
      onSearch(results)
    }
  }, [results, onSearch])
  
  return (
    <Input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Rechercher par nom, prénom..."
    />
  )
}
```

### 3. Repository avec Pagination Serveur Complète

#### Implémentation Détaillée
```typescript
// domains/financial/caisse-imprevue/repositories/DemandCIRepository.ts
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  getCountFromServer,
  DocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { CaisseImprevueDemand } from '@/domains/financial/caisse-imprevue/entities/demand.types'
import type { CaisseImprevueDemandFilters } from '@/domains/financial/caisse-imprevue/entities/demand-filters.types'

export interface PaginatedDemands {
  items: CaisseImprevueDemand[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export class DemandCIRepository {
  private collectionRef = collection(db, 'caisseImprevueDemands')
  
  async getPaginated(
    filters: CaisseImprevueDemandFilters = {},
    page: number = 1,
    pageLimit: number = 10,
    sortBy: 'date' | 'alphabetical' = 'date',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedDemands> {
    const constraints: QueryConstraint[] = []
    
    // ========== FILTRES ==========
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status))
    }
    
    if (filters.paymentFrequency && filters.paymentFrequency !== 'all') {
      constraints.push(where('paymentFrequency', '==', filters.paymentFrequency))
    }
    
    if (filters.memberId) {
      constraints.push(where('memberId', '==', filters.memberId))
    }
    
    if (filters.subscriptionCIID) {
      constraints.push(where('subscriptionCIID', '==', filters.subscriptionCIID))
    }
    
    if (filters.decisionMadeBy) {
      constraints.push(where('decisionMadeBy', '==', filters.decisionMadeBy))
    }
    
    // Filtres de date
    if (filters.createdAtFrom) {
      constraints.push(where('createdAt', '>=', filters.createdAtFrom))
    }
    
    if (filters.createdAtTo) {
      constraints.push(where('createdAt', '<=', filters.createdAtTo))
    }
    
    // ========== TRI ==========
    if (sortBy === 'date') {
      constraints.push(orderBy('createdAt', sortOrder))
    } else if (sortBy === 'alphabetical') {
      // Pour le tri alphabétique, on trie par nom puis prénom
      constraints.push(orderBy('memberLastName', sortOrder))
      constraints.push(orderBy('memberFirstName', sortOrder))
    }
    
    // ========== CALCUL DU TOTAL ==========
    // IMPORTANT: Même ordre que la requête principale pour correspondre aux index
    const countQuery = query(this.collectionRef, ...constraints)
    const countSnapshot = await getCountFromServer(countQuery)
    const totalItems = countSnapshot.data().count
    
    // ========== PAGINATION ==========
    if (page > 1) {
      const offset = (page - 1) * pageLimit
      const offsetQuery = query(this.collectionRef, ...constraints, limit(offset))
      const offsetSnapshot = await getDocs(offsetQuery)
      
      if (offsetSnapshot.docs.length > 0) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1]
        constraints.push(startAfter(lastDoc))
      } else {
        // Page vide
        return {
          items: [],
          pagination: {
            page,
            limit: pageLimit,
            totalItems: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: page > 1,
          }
        }
      }
    }
    
    // Limite
    constraints.push(limit(pageLimit))
    
    // ========== EXÉCUTION ==========
    const q = query(this.collectionRef, ...constraints)
    const querySnapshot = await getDocs(q)
    
    const items: CaisseImprevueDemand[] = []
    querySnapshot.forEach((doc) => {
      items.push(this.transformDocument(doc.id, doc.data()))
    })
    
    const totalPages = Math.ceil(totalItems / pageLimit)
    
    return {
      items,
      pagination: {
        page,
        limit: pageLimit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }
  }
  
  // Recherche avec support Algolia (si disponible) ou Firestore
  async search(
    searchQuery: string,
    filters: CaisseImprevueDemandFilters = {}
  ): Promise<CaisseImprevueDemand[]> {
    // Normaliser la query
    const normalizedQuery = searchQuery.toLowerCase().trim()
    
    if (normalizedQuery.length < 2) {
      return []
    }
    
    // Option 1 : Utiliser Algolia si disponible (meilleure performance)
    // Option 2 : Utiliser Firestore avec where (nécessite index)
    
    // Pour l'instant, implémentation Firestore simple
    const constraints: QueryConstraint[] = []
    
    // Recherche par nom (nécessite index composite)
    // Note: Firestore ne supporte pas la recherche full-text native
    // On utilise une recherche par préfixe
    constraints.push(where('memberLastName', '>=', normalizedQuery))
    constraints.push(where('memberLastName', '<=', normalizedQuery + '\uf8ff'))
    
    // Appliquer les autres filtres
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status))
    }
    
    constraints.push(orderBy('memberLastName', 'asc'))
    constraints.push(limit(50)) // Limite pour la recherche
    
    const q = query(this.collectionRef, ...constraints)
    const snapshot = await getDocs(q)
    
    const results: CaisseImprevueDemand[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      // Filtrer aussi par prénom côté client
      const matchesFirstName = data.memberFirstName?.toLowerCase().includes(normalizedQuery)
      const matchesLastName = data.memberLastName?.toLowerCase().includes(normalizedQuery)
      
      if (matchesFirstName || matchesLastName) {
        results.push(this.transformDocument(doc.id, data))
      }
    })
    
    return results
  }
  
  private transformDocument(id: string, data: any): CaisseImprevueDemand {
    return {
      id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    }
  }
}
```

### 4. Index Firestore Nécessaires

#### Configuration
```json
// firestore.indexes.json (à ajouter)
{
  "indexes": [
    {
      "collectionGroup": "caisseImprevueDemands",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "caisseImprevueDemands",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "paymentFrequency", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "caisseImprevueDemands",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "memberLastName", "order": "ASCENDING" },
        { "fieldPath": "memberFirstName", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "caisseImprevueDemands",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "memberLastName", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 5. Gestion d'État Avancée avec Zustand (Optionnel)

#### Alternative au Context
```typescript
// domains/financial/caisse-imprevue/stores/demandModalsStore.ts
import { create } from 'zustand'
import { CaisseImprevueDemand } from '@/domains/financial/caisse-imprevue/entities/demand.types'

interface DemandModalsState {
  accept: { isOpen: boolean; demand: CaisseImprevueDemand | null }
  reject: { isOpen: boolean; demand: CaisseImprevueDemand | null }
  reopen: { isOpen: boolean; demand: CaisseImprevueDemand | null }
  delete: { isOpen: boolean; demand: CaisseImprevueDemand | null }
  edit: { isOpen: boolean; demand: CaisseImprevueDemand | null }
  openModal: (type: keyof Omit<DemandModalsState, 'openModal' | 'closeModal'>, demand: CaisseImprevueDemand) => void
  closeModal: (type: keyof Omit<DemandModalsState, 'openModal' | 'closeModal'>) => void
}

export const useDemandModalsStore = create<DemandModalsState>((set) => ({
  accept: { isOpen: false, demand: null },
  reject: { isOpen: false, demand: null },
  reopen: { isOpen: false, demand: null },
  delete: { isOpen: false, demand: null },
  edit: { isOpen: false, demand: null },
  openModal: (type, demand) => set((state) => ({
    ...state,
    [type]: { isOpen: true, demand }
  })),
  closeModal: (type) => set((state) => ({
    ...state,
    [type]: { isOpen: false, demand: null }
  })),
}))
```

---

## 🎨 Design System et Composants Réutilisables

### 1. Thème Unifié

#### Fichier de Constantes
```typescript
// shared/constants/caisse-imprevue-theme.ts
export const CAISSE_IMPREVUE_THEME = {
  // Couleurs principales
  primary: {
    color: '#234D65',
    light: '#2c5a73',
    dark: '#1a3a4d',
    className: 'text-[#234D65]',
    bgClassName: 'bg-[#234D65]',
    hoverClassName: 'hover:bg-[#2c5a73]',
  },
  
  // États des étapes
  steps: {
    active: {
      bg: 'bg-[#234D65]',
      text: 'text-white',
      border: 'border-[#234D65]',
      icon: 'text-white',
    },
    inactive: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-300',
      icon: 'text-gray-400',
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300',
      icon: 'text-green-600',
    },
  },
  
  // Cards
  cards: {
    bg: 'bg-white',
    border: 'border-gray-200',
    shadow: 'shadow-md',
    hover: 'hover:shadow-lg',
  },
  
  // Statuts
  status: {
    PENDING: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
    },
    APPROVED: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
    },
    REJECTED: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    CONVERTED: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    REOPENED: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200',
    },
  },
} as const

// Helper pour obtenir les classes d'un statut
export function getStatusClasses(status: string) {
  return CAISSE_IMPREVUE_THEME.status[status as keyof typeof CAISSE_IMPREVUE_THEME.status] || 
         CAISSE_IMPREVUE_THEME.status.PENDING
}
```

### 2. Composants de Layout Réutilisables

#### StepIndicator
```typescript
// shared/components/StepIndicator.tsx
interface StepIndicatorProps {
  steps: Array<{ label: string; description: string }>
  currentStep: number
  completedSteps?: number[]
}

export function StepIndicator({ steps, currentStep, completedSteps = [] }: StepIndicatorProps) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = completedSteps.includes(stepNumber)
        const isInactive = !isActive && !isCompleted
        
        return (
          <div key={index} className="flex items-center gap-4">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
              isActive && CAISSE_IMPREVUE_THEME.steps.active.bg + ' ' + CAISSE_IMPREVUE_THEME.steps.active.border,
              isCompleted && CAISSE_IMPREVUE_THEME.steps.completed.bg + ' ' + CAISSE_IMPREVUE_THEME.steps.completed.border,
              isInactive && CAISSE_IMPREVUE_THEME.steps.inactive.bg + ' ' + CAISSE_IMPREVUE_THEME.steps.inactive.border,
            )}>
              {isCompleted ? (
                <CheckCircle2 className={cn("w-5 h-5", CAISSE_IMPREVUE_THEME.steps.completed.icon)} />
              ) : (
                <span className={cn(
                  "font-semibold",
                  isActive && CAISSE_IMPREVUE_THEME.steps.active.text,
                  isInactive && CAISSE_IMPREVUE_THEME.steps.inactive.text,
                )}>
                  {stepNumber}
                </span>
              )}
            </div>
            <div className="hidden md:block">
              <p className={cn(
                "font-semibold",
                isActive && CAISSE_IMPREVUE_THEME.primary.className,
                isInactive && "text-gray-600",
              )}>
                {step.label}
              </p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "hidden md:block w-16 h-0.5",
                isCompleted ? "bg-green-300" : "bg-gray-300"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

---

## 🔄 Workflow de Développement

### 1. Branches et PRs

#### Stratégie Git
```
main
  └── develop
      ├── feature/caisse-imprevue-demands-v2
      │   ├── feature/v2-form
      │   ├── feature/v2-list
      │   ├── feature/v2-details
      │   └── feature/v2-modals
      └── fix/demands-cache
```

#### Convention de Commits
```
feat(caisse-imprevue): add demand form v2 with persistence
fix(caisse-imprevue): exclude member from emergency contact
refactor(caisse-imprevue): migrate to domains structure
perf(caisse-imprevue): implement cache for subscriptions
test(caisse-imprevue): add unit tests for DemandSimulationService
```

### 2. Code Review Checklist

#### Checklist pour les PRs
- [ ] Code suit les conventions du projet
- [ ] Types TypeScript stricts (pas de `any`)
- [ ] Tests unitaires ajoutés/modifiés
- [ ] Tests d'intégration si nécessaire
- [ ] Documentation mise à jour
- [ ] Responsive testé (mobile, tablette, desktop)
- [ ] Accessibilité vérifiée
- [ ] Performance acceptable
- [ ] Pas de régressions

---

## 📚 Références et Ressources

### Documentation Interne
- `documentation/architecture/PLAN_MIGRATION_DOMAINS.md` - Structure domains
- `documentation/architecture/ARCHITECTURE_COMPARAISON.md` - Comparaison architectures
- `documentation/caisse-imprevue/V1/DEMANDES_CAISSE_IMPREVUE.md` - Documentation V1
- `documentation/caisse-imprevue/V2/demande/CRITIQUE_CODE_ET_DESIGN.md` - Critique détaillée

### Code de Référence
- `src/domains/memberships/repositories/MembershipRepositoryV2.ts` - Pagination serveur
- `src/components/ui/pagination/PaginationWithEllipses.tsx` - Composant pagination
- `src/domains/memberships/components/list/MembershipsListPagination.tsx` - Pagination haut/bas
- `src/components/caisse-speciale/StatisticsCaisseSpecialeDemandes.tsx` - Stats à réutiliser
- `src/domains/memberships/components/table/MembershipsTableView.tsx` - Tableau liste

### Standards et Bonnes Pratiques
- **React Query** : https://tanstack.com/query/latest
- **Tailwind CSS** : https://tailwindcss.com/docs
- **Accessibility** : https://www.w3.org/WAI/WCAG21/quickref/
- **Firestore** : https://firebase.google.com/docs/firestore

---

## 📊 Récapitulatif Exécutif

### Points Clés de la Solution V2

#### ✅ Architecture
- **Structure domains/** : Conformité avec `PLAN_MIGRATION_DOMAINS.md`
- **Séparation des couches** : entities → repositories → services → hooks → components
- **Réutilisabilité** : Code partagé dans `shared/`

#### ✅ UX/UI
- **Page dédiée** : `/caisse-imprevue/demandes/add` au lieu d'un modal
- **Persistance** : localStorage avec expiration 24h
- **Réinitialisation** : Bouton à chaque étape
- **Scroll automatique** : Vers le haut à chaque changement d'étape
- **Design uniforme** : Thème unifié (pas d'orange dans Step 3)
- **Stats avant Tabs** : Réorganisation de l'ordre
- **Stats uniformisées** : Réutilisation du composant existant

#### ✅ Fonctionnalités
- **Exclusion membre** : Le membre sélectionné ne peut pas être son propre contact d'urgence ✅
- **Cache forfaits** : 30 minutes de staleTime, pas de refetch inutile ✅
- **Tableau récapitulatif** : Intégré dans la page détails (pas de page séparée) ✅
- **Pagination serveur** : Inspirée de `membership-requests`, haut et bas ✅
- **Tri et recherche** : Par date, alphabétique, avec cache des résultats ✅
- **Ordre de priorité** : PENDING → APPROVED → REJECTED dans tab "Toutes" ✅

#### ✅ Performance
- **Cache React Query** : Configuration centralisée avec staleTime/gcTime adaptés
- **Cache recherches** : 2 minutes staleTime, normalisation des queries
- **Cache listes** : 5 minutes staleTime
- **Cache détails** : 10 minutes staleTime avec préfetch
- **Optimistic updates** : Mise à jour immédiate de l'UI

#### ✅ Responsive
- **Mobile-first** : Stratégie adaptative
- **Breakpoints** : sm, md, lg, xl, 2xl
- **Composants adaptatifs** : Formulaire, cards, tableaux, modals
- **Touch targets** : Minimum 44x44px

#### ✅ Qualité
- **Tests** : Unitaires, intégration, E2E
- **Accessibilité** : WCAG 2.1 niveau AA
- **Documentation** : JSDoc, commentaires, guides
- **Gestion d'erreurs** : Error boundaries, retry logic

### Comparaison V1 vs V2

| Aspect | V1 | V2 |
|--------|----|----|
| **Structure** | `components/caisse-imprevue/` | `domains/financial/caisse-imprevue/` ✅ |
| **Formulaire** | Modal | Page dédiée `/add` ✅ |
| **Persistance** | ❌ Aucune | ✅ localStorage 24h |
| **Cache forfaits** | 5 min | ✅ 30 min |
| **Exclusion membre** | ❌ Non | ✅ Automatique |
| **Pagination** | ❌ Client-side | ✅ Serveur avec tri |
| **Recherche** | ❌ Sans cache | ✅ Cache 2 min |
| **Responsive** | ❌ Non | ✅ Mobile/Tablette/Desktop |
| **Design** | ❌ Incohérent | ✅ Thème unifié |
| **Stats** | ❌ Design différent | ✅ Uniformisé |
| **Infos manquantes** | ❌ Beaucoup | ✅ Toutes affichées |
| **Tableau récap** | ❌ Page séparée | ✅ Intégré détails |

### Métriques de Succès

#### Performance
- **TTI** : < 3 secondes
- **FCP** : < 1.5 secondes
- **LCP** : < 2.5 secondes
- **CLS** : < 0.1

#### Qualité Code
- **Couverture tests** : > 80%
- **Types stricts** : 100% (pas de `any`)
- **Lint errors** : 0
- **Documentation** : 100% des composants publics

#### UX
- **Taux d'abandon formulaire** : < 5%
- **Temps de complétion** : < 5 minutes
- **Satisfaction utilisateur** : > 4/5

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Statut** : Solutions complètes et détaillées  
**Auteur** : Senior Dev / Senior Architecte / Senior Designer  
**Dernière mise à jour** : 2026-01-27  
**Pages** : ~100 pages de documentation technique complète
