# Architecture – Demandes Credit Fixe

> Architecture cible **domains-first** pour le sous-module Demandes du Credit Fixe.

## 1. Arborescence cible

```
src/domains/financial/credit-speciale/fixe/demandes/
├── entities/
│   └── CreditFixeDemand.ts          # Interface metier + constantes
├── schemas/
│   └── creditFixeDemandSchema.ts     # Validation Zod specifique FIXE
├── services/
│   └── CreditFixeDemandService.ts    # Logique metier (creation, validation, statuts)
├── repositories/
│   └── CreditFixeDemandRepository.ts # Acces Firestore (creditDemands)
├── hooks/
│   └── useCreditFixeDemands.ts       # React Query hooks (queries + mutations)
├── components/
│   ├── CreditFixeDemandList.tsx       # Liste filtrable avec statistiques
│   ├── CreditFixeDemandDetail.tsx     # Detail d'une demande
│   ├── CreateCreditFixeDemandModal.tsx # Modal de creation
│   ├── EditCreditFixeDemandModal.tsx   # Modal d'edition (PENDING uniquement)
│   ├── ValidateDemandModal.tsx         # Approbation / Rejet
│   └── StatisticsCreditFixeDemandes.tsx # Statistiques
└── exports/
    ├── demandExcelExport.ts           # Export liste en Excel
    └── demandPdfExport.ts             # Export liste en PDF
```

## 2. Responsabilites par couche

### `entities/`

Definit les interfaces metier propres aux demandes FIXE.

```typescript
// CreditFixeDemand.ts
export interface CreditFixeDemand {
  id: string                          // MK_DEMANDE_CF_{matricule}_{date}_{heure}
  clientId: string
  clientFirstName: string
  clientLastName: string
  clientContacts: string[]
  creditType: 'FIXE'                  // Toujours FIXE
  amount: number                      // 1 000 – 10 000 000 FCFA
  monthlyPaymentAmount?: number
  desiredDate: string
  cause: string                       // 10 – 500 caracteres
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  guarantorId: string
  guarantorFirstName: string
  guarantorLastName: string
  guarantorRelation: string
  guarantorIsMember: boolean
  eligibilityOverride?: {
    overriddenBy: string
    overriddenAt: Date
    reason: string
  }
  adminComments?: string
  score?: number                      // 0-10, calcule a partir de l'historique
  scoreUpdatedAt?: Date
  contractId?: string                 // Relation 1:1 avec le contrat
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}

export const CREDIT_FIXE_DEMAND_CONSTRAINTS = {
  AMOUNT_MIN: 1_000,
  AMOUNT_MAX: 10_000_000,
  CAUSE_MIN_LENGTH: 10,
  CAUSE_MAX_LENGTH: 500,
  SCORE_MIN: 0,
  SCORE_MAX: 10,
}
```

### `schemas/`

Validation Zod pour le formulaire de creation / edition.

```typescript
// creditFixeDemandSchema.ts
import { z } from 'zod'

export const creditFixeDemandFormSchema = z.object({
  clientId: z.string().min(1, 'Le membre est obligatoire'),
  creditType: z.literal('FIXE'),
  amount: z.number()
    .min(1_000, 'Minimum 1 000 FCFA')
    .max(10_000_000, 'Maximum 10 000 000 FCFA'),
  monthlyPaymentAmount: z.number().optional(),
  desiredDate: z.string().min(1, 'La date souhaitee est obligatoire'),
  cause: z.string()
    .min(10, 'Le motif doit contenir au moins 10 caracteres')
    .max(500, 'Le motif ne doit pas depasser 500 caracteres'),
  guarantorId: z.string().min(1, 'Le garant est obligatoire'),
  guarantorFirstName: z.string().min(1),
  guarantorLastName: z.string().min(1),
  guarantorRelation: z.string().min(1, 'La relation avec le garant est obligatoire'),
  guarantorIsMember: z.boolean(),
})
```

### `services/`

Logique metier : creation, transitions de statut, score, notifications.

```typescript
// CreditFixeDemandService.ts
export class CreditFixeDemandService {
  // Creation avec generation d'ID personnalise
  async createDemand(data: CreateDemandInput): Promise<CreditFixeDemand>

  // Recuperation avec filtres
  async getDemandsWithFilters(filters: DemandFilters): Promise<PaginatedResult>

  // Statistiques (total, par statut, par type)
  async getDemandsStats(filters?: DemandFilters): Promise<DemandStats>

  // Transitions de statut avec validation
  async updateDemandStatus(id: string, newStatus: string, comment?: string): Promise<void>

  // Edition des details (PENDING uniquement)
  async updateDemandDetails(id: string, data: Partial<CreditFixeDemand>): Promise<void>

  // Suppression (PENDING + aucun contrat lie)
  async deleteDemand(id: string): Promise<void>

  // Calcul du score initial
  private calculateInitialScore(clientId: string): Promise<number>

  // Generation de l'ID
  private generateDemandId(matricule: string): string
  // Format : MK_DEMANDE_CF_{matricule}_{DDMMYY}_{HHMMSS}
}
```

### `repositories/`

Acces a la collection Firestore `creditDemands`.

```typescript
// CreditFixeDemandRepository.ts
export class CreditFixeDemandRepository {
  private collection = 'creditDemands'

  async create(demand: CreditFixeDemand): Promise<void>
  async getById(id: string): Promise<CreditFixeDemand | null>
  async getAll(): Promise<CreditFixeDemand[]>
  async getWithFilters(filters: DemandFilters): Promise<CreditFixeDemand[]>
  async getByClientId(clientId: string): Promise<CreditFixeDemand[]>
  async getByGuarantorId(guarantorId: string): Promise<CreditFixeDemand[]>
  async update(id: string, data: Partial<CreditFixeDemand>): Promise<void>
  async delete(id: string): Promise<void>
  async getStats(): Promise<DemandStats>
}
```

**Filtres supportes** :

| Filtre | Champ Firestore | Type |
|---|---|---|
| Statut | `status` | `PENDING` / `APPROVED` / `REJECTED` / `all` |
| Type credit | `creditType` | `FIXE` (filtre pre-applique) |
| Client | `clientId` | string |
| Garant | `guarantorId` | string |
| Date debut | `createdAt` | timestamp (>= dateFrom) |
| Date fin | `createdAt` | timestamp (<= dateTo) |
| Recherche texte | client-side | sur nom, prenom, matricule |

### `hooks/`

Hooks React Query pour les queries et mutations.

```typescript
// useCreditFixeDemands.ts

// Queries
export function useCreditFixeDemands(filters?: DemandFilters)
// -> useQuery(['creditDemands', 'FIXE', filters], ...)

export function useCreditFixeDemand(id?: string)
// -> useQuery(['creditDemand', id], ...)

export function useCreditFixeDemandsStats(filters?: DemandFilters)
// -> useQuery(['creditDemandsStats', 'FIXE', filters], ...)

// Mutations (avec invalidation automatique du cache)
export function useCreditFixeDemandMutations() {
  return {
    create,          // invalidate: ['creditDemands', 'creditDemandsStats']
    updateStatus,    // invalidate: ['creditDemands', 'creditDemand', 'creditDemandsStats']
    updateDemand,    // invalidate: ['creditDemands', 'creditDemand']
    deleteDemand,    // invalidate: ['creditDemands', 'creditDemandsStats']
  }
}
```

**Configuration React Query** :

| Parametre | Valeur |
|---|---|
| `staleTime` | `2 min` |
| `refetchOnWindowFocus` | `true` |
| Cache keys | `['creditDemands']`, `['creditDemand', id]`, `['creditDemandsStats']` |

### `components/`

| Composant | Role |
|---|---|
| `CreditFixeDemandList` | Liste filtrable avec onglets (Tout / En attente / Approuvees / Rejetees), vue grille/liste, pagination, export |
| `CreditFixeDemandDetail` | Detail complet : infos membre, garant, statut, actions, historique, lien contrat |
| `CreateCreditFixeDemandModal` | Formulaire multi-etapes : selection membre → details credit → selection garant → validation |
| `EditCreditFixeDemandModal` | Edition des champs modifiables (PENDING uniquement) |
| `ValidateDemandModal` | Approbation ou rejet avec commentaire |
| `StatisticsCreditFixeDemandes` | Dashboard statistiques avec carrousel |

### `exports/`

| Module | Format | Contenu |
|---|---|---|
| `demandExcelExport.ts` | `.xlsx` | Liste des demandes filtrees avec colonnes : ID, Client, Montant, Statut, Date, Garant |
| `demandPdfExport.ts` | `.pdf` | Meme contenu en format PDF |

## 3. Migration depuis le code existant

Le code actuel est dans les fichiers partages `credit-speciale` :

| Fichier actuel | Cible domaine |
|---|---|
| `src/components/credit-speciale/CreateCreditDemandModal.tsx` | `domains/.../demandes/components/CreateCreditFixeDemandModal.tsx` |
| `src/components/credit-speciale/ListDemandes.tsx` | `domains/.../demandes/components/CreditFixeDemandList.tsx` |
| `src/components/credit-speciale/CreditDemandDetail.tsx` | `domains/.../demandes/components/CreditFixeDemandDetail.tsx` |
| `src/services/credit-speciale/CreditSpecialeService.ts` (methodes demandes) | `domains/.../demandes/services/CreditFixeDemandService.ts` |
| `src/repositories/credit-speciale/CreditDemandRepository.ts` | `domains/.../demandes/repositories/CreditFixeDemandRepository.ts` |
| `src/hooks/useCreditSpeciale.ts` (hooks demandes) | `domains/.../demandes/hooks/useCreditFixeDemands.ts` |
| `src/schemas/credit-speciale.schema.ts` | `domains/.../demandes/schemas/creditFixeDemandSchema.ts` |

### Strategie de migration

1. **Phase 1** : Creer les fichiers domaine en copiant la logique existante, en filtrant pour `creditType = 'FIXE'`
2. **Phase 2** : Adapter les pages pour importer depuis le domaine
3. **Phase 3** : Retirer les references aux fichiers partages une fois tous les types migres

## 4. Flux de donnees

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Pages (app/(admin)/...)                          │
│  /credit-fixe/demandes              /credit-fixe/demandes/[id]         │
└────────────────┬───────────────────────────────┬────────────────────────┘
                 │                               │
                 ▼                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Domain Components                                        │
│  CreditFixeDemandList    CreditFixeDemandDetail   CreateModal  ...   │
└────────────────┬──────────────────────────┬───────────────────────────┘
                 │                          │
                 ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Domain Hooks (React Query)                                │
│  useCreditFixeDemands    useCreditFixeDemand    useMutations          │
└────────────────┬──────────────────────────┬───────────────────────────┘
                 │                          │
                 ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Domain Service                                           │
│  CreditFixeDemandService  (logique metier, score, notifications)     │
└────────────────┬─────────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Domain Repository                                        │
│  CreditFixeDemandRepository  (Firestore CRUD)                        │
└────────────────┬─────────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Firestore                                                 │
│  Collection : creditDemands   (filtrage creditType = 'FIXE')         │
└──────────────────────────────────────────────────────────────────────┘
```
