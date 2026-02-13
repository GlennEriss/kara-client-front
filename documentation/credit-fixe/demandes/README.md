# Credit Fixe – Sous-module Demandes

> Gestion de la creation, du traitement et du suivi des demandes de credit de type **FIXE**.

## Objectif

Permettre a l'admin de :

1. **Creer** une demande Credit Fixe pour un membre (avec garant obligatoire)
2. **Consulter** la liste des demandes avec filtres et statistiques
3. **Traiter** chaque demande (approuver, rejeter, reouvrir)
4. **Convertir** une demande approuvee en contrat Credit Fixe (relation 1:1)
5. **Exporter** la liste en Excel ou PDF

### Point d'alignement simulation -> contrat

Le bouton **Creer le contrat** dans les demandes FIXE ouvre `CreditFixeSimulationModal`, qui reutilise `CreditFixeSimulationSection` (meme logique que `/credit-fixe/simulation`).  
Le flux de creation de contrat ne doit pas utiliser `CreditSimulationModal` (module credit speciale).
Dans ce flux, **`Montant emprunte` est verrouille** et pre-rempli avec `demand.amount` (non modifiable) pour garantir la coherence demande -> contrat.

## Regles metier

| Regle | Valeur |
|---|---|
| Type de credit | `FIXE` (obligatoire, non modifiable) |
| Montant demande | `1 000` – `10 000 000` FCFA |
| Garant | Obligatoire (membre ou externe) |
| Motif | 10 a 500 caracteres |
| Statuts | `PENDING` → `APPROVED` → contrat / `PENDING` → `REJECTED` → `PENDING` (reouverture) |
| Relation demande-contrat | 1:1 via `contractId` |
| Score | 0-10, calcule automatiquement depuis l'historique credit |
| Suppression | Uniquement si `PENDING` et aucun contrat lie |

## Cycle de vie d'une demande

```
               ┌─────────┐
    Creation → │ PENDING │ ← Reouverture
               └────┬────┘
                    │
          ┌────────┴────────┐
          ▼                 ▼
   ┌──────────┐      ┌──────────┐
   │ APPROVED │      │ REJECTED │
   └────┬─────┘      └──────────┘
        │
        ▼
  Creation contrat
  (contractId lie)
```

## Documentation technique

| Dossier | Contenu |
|---|---|
| `activite/` | Diagramme d'activite PlantUML du workflow complet |
| `architecture/` | Architecture domains-first (entities, schemas, services, repos, hooks, components) |
| `sequence/` | Diagrammes de sequence (creation + traitement) |
| `wireframes/` | Maquettes desktop et mobile |
| `firebase/` | Regles Firestore, indexes composites |

## Structure des fichiers

```
documentation/credit-fixe/demandes/
├── README.md                              ← Ce fichier
├── activite/
│   └── DemandesCreditFixe.puml            # Workflow complet
├── architecture/
│   └── README.md                          # Architecture domains-first
├── sequence/
│   ├── README.md                          # Index des diagrammes
│   ├── SEQ_CreerDemandeCreditFixe.puml    # Sequence : creation
│   └── SEQ_TraiterDemandeCreditFixe.puml  # Sequence : traitement
├── wireframes/
│   ├── desktop.md                         # Wireframe >= 1024px
│   └── mobile.md                          # Wireframe 320-767px
└── firebase/
    ├── README.md                          # Vue d'ensemble Firebase
    ├── firestore-rules.md                 # Regles securite creditDemands
    └── firestore-indexes.md               # Index composites
```

---

## Taches d'implementation

### Phase 1 : Fondations domaine

#### 1.1 — Creer l'arborescence domaine

- [ ] Creer `src/domains/financial/credit-speciale/fixe/demandes/` avec les sous-dossiers `entities/`, `schemas/`, `services/`, `repositories/`, `hooks/`, `components/`, `exports/`

> **Documentation** :
> - Architecture : `architecture/README.md` → section **1. Arborescence cible**

---

#### 1.2 — Definir l'entite `CreditFixeDemand`

- [ ] Creer `entities/CreditFixeDemand.ts` avec l'interface et les constantes metier

> **Documentation** :
> - Architecture : `architecture/README.md` → section **entities/** (interface complete + `CREDIT_FIXE_DEMAND_CONSTRAINTS`)
> - Regles Firestore : `firebase/firestore-rules.md` → champs requis dans la regle `create` (valider la coherence interface ↔ regles)
>
> **Skills** :
> - `.agents/skills/vercel-react-best-practices/AGENTS.md` — typage strict TypeScript

---

#### 1.3 — Creer le schema de validation Zod

- [ ] Creer `schemas/creditFixeDemandSchema.ts` avec les contraintes de validation FIXE

> **Documentation** :
> - Architecture : `architecture/README.md` → section **schemas/** (schema Zod complet)
> - Activite : `activite/DemandesCreditFixe.puml` → lignes 20-30 (validations montant 1k-10M, motif 10-500 car.)
> - Regles Firestore : `firebase/firestore-rules.md` → regles `create` (les contraintes Zod doivent couvrir au minimum les memes validations que Firestore)
>
> **Skills** :
> - `.agents/skills/vercel-react-best-practices/AGENTS.md` — validation cote client

---

#### 1.4 — Implementer le Repository Firestore

- [ ] Creer `repositories/CreditFixeDemandRepository.ts` (CRUD sur `creditDemands`, filtre `creditType = 'FIXE'`)

> **Documentation** :
> - Architecture : `architecture/README.md` → section **repositories/** (methodes CRUD + tableau des filtres)
> - Indexes Firestore : `firebase/firestore-indexes.md` → les 7 index composites (chaque methode de filtre depend d'un index specifique) :
>   - `getWithFilters(status)` → Index #1 (`status` + `createdAt`)
>   - `getWithFilters(creditType)` → Index #2 (`creditType` + `createdAt`)
>   - `getByClientId()` → Index #3 (`clientId` + `createdAt`)
>   - `getByGuarantorId()` → Index #4 (`guarantorId` + `createdAt`)
>   - `getWithFilters(status + creditType)` → Index #5 (`status` + `creditType` + `createdAt`)
>   - `getWithFilters(status + clientId)` → Index #6 (`status` + `clientId` + `createdAt`)
>   - `getWithFilters(status + guarantorId)` → Index #7 (`status` + `guarantorId` + `createdAt`)
> - Regles Firestore : `firebase/firestore-rules.md` → permissions read/create/update/delete
>
> **Skills** :
> - `.cursor/skills/security-review/SKILL.md` — securisation des acces Firestore

---

#### 1.5 — Implementer le Service metier

- [ ] Creer `services/CreditFixeDemandService.ts` avec toutes les methodes metier :

##### 1.5.1 — `createDemand()`

- [ ] Generation d'ID `MK_DEMANDE_CF_{matricule}_{date}_{heure}`
- [ ] Calcul du score initial
- [ ] Creation en base avec `status = 'PENDING'`
- [ ] Envoi de notification

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → section **== Creation de la demande ==** (lignes 9-59 : selection membre → validation → generation ID → score → notification)
> - Sequence : `sequence/SEQ_CreerDemandeCreditFixe.puml` → flux complet Page → Component → Hook → Service → Repository → Firestore
> - Architecture : `architecture/README.md` → section **services/** (signature `createDemand`)
> - Regles Firestore : `firebase/firestore-rules.md` → regle `create` (le service doit fournir tous les champs requis, `createdBy == auth.uid`, `status == 'PENDING'`)

##### 1.5.2 — `getDemandsWithFilters()`

- [ ] Filtrage par statut, type, client, garant, dates
- [ ] Recherche texte cote client

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → section **== Consultation et filtrage ==** (lignes 61-75 : filtres disponibles)
> - Architecture : `architecture/README.md` → section **repositories/** tableau des filtres
> - Indexes Firestore : `firebase/firestore-indexes.md` → Index #1 a #7 selon la combinaison de filtres utilisee

##### 1.5.3 — `getDemandsStats()`

- [ ] Total, par statut, compteur FIXE

> **Documentation** :
> - Architecture : `architecture/README.md` → section **services/** (signature `getDemandsStats`)

##### 1.5.4 — `updateDemandStatus()`

- [ ] Transitions valides : PENDING→APPROVED, PENDING→REJECTED, REJECTED→PENDING
- [ ] Ajout commentaire admin (pour rejet)
- [ ] Envoi de notification

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → section **== Traitement de la demande ==** (lignes 77-126 : actions possibles selon statut)
> - Sequence : `sequence/SEQ_TraiterDemandeCreditFixe.puml` → **Cas 1 : Approbation** et **Cas 2 : Rejet**
> - Regles Firestore : `firebase/firestore-rules.md` → regle `update` (admin uniquement)

##### 1.5.5 — `updateDemandDetails()`

- [ ] Modification uniquement si statut `PENDING`

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → lignes 86-88 (Action = Modifier)
> - Regles Firestore : `firebase/firestore-rules.md` → regle `update`

##### 1.5.6 — `deleteDemand()`

- [ ] Suppression uniquement si `PENDING` et aucun `contractId`

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → lignes 98-104 (Action = Supprimer avec verification contrat)
> - Regles Firestore : `firebase/firestore-rules.md` → regle `delete` (`status == 'PENDING'` ET `contractId == null`)

##### 1.5.7 — `calculateInitialScore()`

- [ ] Score 0-10 calcule depuis l'historique credit du membre

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → lignes 51-52 (score initial calcule)
> - Sequence : `sequence/SEQ_CreerDemandeCreditFixe.puml` → etape `calculateInitialScore(clientId)`
> - Architecture : `architecture/README.md` → section **entities/** (champ `score: 0-10`)

---

### Phase 2 : Hooks React Query

#### 2.1 — Creer les hooks de query

- [ ] `useCreditFixeDemands(filters?)` — liste filtree avec pagination
- [ ] `useCreditFixeDemand(id)` — detail d'une demande unique
- [ ] `useCreditFixeDemandsStats(filters?)` — statistiques agregees

> **Documentation** :
> - Architecture : `architecture/README.md` → section **hooks/** (signatures des queries + configuration React Query : staleTime 2min, cache keys)
> - Sequence : `sequence/SEQ_TraiterDemandeCreditFixe.puml` → etape `useCreditFixeDemand(id)` pour le chargement du detail
>
> **Skills** :
> - `.agents/skills/vercel-react-best-practices/AGENTS.md` — hooks custom, separation des concerns

#### 2.2 — Creer les mutations

- [ ] `useCreditFixeDemandMutations()` — create, updateStatus, updateDemand, deleteDemand
- [ ] Configurer l'invalidation automatique du cache apres chaque mutation

> **Documentation** :
> - Architecture : `architecture/README.md` → section **hooks/** (tableau d'invalidation par mutation)
> - Sequence : `sequence/SEQ_CreerDemandeCreditFixe.puml` → etape `invalidateQueries(['creditDemands', 'creditDemandsStats'])`
> - Sequence : `sequence/SEQ_TraiterDemandeCreditFixe.puml` → etapes `invalidateQueries()` apres chaque action
>
> **Skills** :
> - `.agents/skills/vercel-react-best-practices/AGENTS.md` — gestion d'etat serveur avec React Query

---

### Phase 3 : Composants UI

#### 3.1 — `CreditFixeDemandList.tsx`

- [ ] Onglets (Tout / En attente / Approuvees / Rejetees)
- [ ] Barre de filtres (recherche, type, date)
- [ ] Vue grille + vue liste avec bascule
- [ ] Pagination
- [ ] Statistiques (carrousel)

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → section **== Consultation et filtrage ==** (lignes 61-75 : filtres et vues)
> - Wireframe desktop : `wireframes/desktop.md` → section **1. Page Liste des Demandes** (layout toolbar + grille + liste + pagination)
> - Wireframe mobile : `wireframes/mobile.md` → section **1. Page Liste des Demandes** (cartes empilees, FAB, scroll horizontal stats)
> - Architecture : `architecture/README.md` → section **components/** (role `CreditFixeDemandList`)
>
> **Skills** :
> - `.cursor/skills/shadcn-ui/SKILL.md` — composants Tabs, Table, Card, Badge, Button, Pagination
> - `.cursor/skills/tailwind-patterns/SKILL.md` — responsive design, container queries
> - `.agents/skills/vercel-composition-patterns/AGENTS.md` — composition de composants React

#### 3.2 — `CreditFixeDemandDetail.tsx`

- [ ] Affichage complet (client, garant, montant, statut, score)
- [ ] Actions contextuelles (approuver, rejeter, modifier, supprimer) selon le statut
- [ ] Lien vers contrat lie (ou bouton creation)

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → section **== Traitement de la demande ==** (lignes 77-126 : actions par statut)
> - Sequence : `sequence/SEQ_TraiterDemandeCreditFixe.puml` → section **== Consultation du detail ==** (chargement) + **Cas 1/2/3** (actions)
> - Wireframe desktop : `wireframes/desktop.md` → section **2. Page Detail Demande** (layout 2 colonnes : infos + actions)
> - Wireframe mobile : `wireframes/mobile.md` → section **2. Page Detail Demande** (sections empilees + sticky bottom actions)
> - Architecture : `architecture/README.md` → section **components/** (role `CreditFixeDemandDetail`)
>
> **Skills** :
> - `.cursor/skills/shadcn-ui/SKILL.md` — composants Card, Badge, Button, Dialog
> - `.cursor/skills/tailwind-patterns/SKILL.md` — layout responsive 2 colonnes → empilees
> - `.agents/skills/vercel-composition-patterns/AGENTS.md` — pattern compound components pour les actions conditionnelles

#### 3.3 — `CreateCreditFixeDemandModal.tsx`

- [ ] Etape 1 : Recherche et selection du membre
- [ ] Etape 2 : Saisie details (type FIXE pre-selectionne, montant, date, motif)
- [ ] Etape 3 : Recherche et selection du garant
- [ ] Validation Zod a chaque etape

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → section **== Creation de la demande ==** (lignes 9-58 : flux complet selection membre → saisie → garant → validation → creation)
> - Sequence : `sequence/SEQ_CreerDemandeCreditFixe.puml` → flux complet de la modal (Etapes 1 a 4)
> - Wireframe desktop : `wireframes/desktop.md` → section **3. Modal Creation Demande** (layout 3 etapes)
> - Wireframe mobile : `wireframes/mobile.md` → section **3. Modal Creation** (fullscreen mobile)
> - Architecture : `architecture/README.md` → section **schemas/** (schema Zod pour validation)
> - Regles Firestore : `firebase/firestore-rules.md` → regle `create` (les champs envoyes doivent satisfaire les regles)
>
> **Skills** :
> - `.cursor/skills/shadcn-ui/SKILL.md` — composants Dialog, Input, Select, Button, Form
> - `.agents/skills/vercel-react-best-practices/AGENTS.md` — formulaires multi-etapes, validation Zod + react-hook-form
> - `.cursor/skills/security-review/SKILL.md` — validation des entrees utilisateur

#### 3.4 — `EditCreditFixeDemandModal.tsx`

- [ ] Edition des champs modifiables (PENDING uniquement)

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → lignes 86-88 (Action = Modifier, PENDING uniquement)
> - Architecture : `architecture/README.md` → section **components/** (role `EditCreditFixeDemandModal`)
> - Regles Firestore : `firebase/firestore-rules.md` → regle `update` (admin uniquement)
>
> **Skills** :
> - `.cursor/skills/shadcn-ui/SKILL.md` — composants Dialog, Form, Input

#### 3.5 — `ValidateDemandModal.tsx`

- [ ] Approbation avec confirmation
- [ ] Rejet avec saisie de commentaire obligatoire

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → lignes 89-97 (Approuver / Rejeter)
> - Sequence : `sequence/SEQ_TraiterDemandeCreditFixe.puml` → **Cas 1 : Approbation** et **Cas 2 : Rejet**
> - Architecture : `architecture/README.md` → section **components/** (role `ValidateDemandModal`)
>
> **Skills** :
> - `.cursor/skills/shadcn-ui/SKILL.md` — composants Dialog, Textarea, Button

#### 3.6 — `StatisticsCreditFixeDemandes.tsx`

- [ ] Dashboard carrousel avec statistiques (total, par statut)

> **Documentation** :
> - Wireframe desktop : `wireframes/desktop.md` → section **1. Page Liste** → bloc STATISTIQUES (carrousel horizontal, 4 cartes)
> - Wireframe mobile : `wireframes/mobile.md` → section **1. Page Liste** → STATISTIQUES (scroll horizontal, 1 carte visible)
> - Architecture : `architecture/README.md` → section **components/** (role `StatisticsCreditFixeDemandes`)
>
> **Skills** :
> - `.cursor/skills/shadcn-ui/SKILL.md` — composants Card, Badge
> - `.cursor/skills/tailwind-patterns/SKILL.md` — carrousel responsive

---

### Phase 4 : Export

#### 4.1 — `demandExcelExport.ts`

- [ ] Export de la liste filtree en `.xlsx` (colonnes : ID, Client, Montant, Statut, Date, Garant)

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → section **== Export ==** (lignes 128-132 : Excel + PDF)
> - Architecture : `architecture/README.md` → section **exports/** (tableau format + contenu)

#### 4.2 — `demandPdfExport.ts`

- [ ] Export de la liste filtree en `.pdf`

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` → section **== Export ==** (lignes 128-132)
> - Architecture : `architecture/README.md` → section **exports/** (tableau format + contenu)
>
> **Skills** :
> - `.cursor/skills/react-pdf/SKILL.md` — generation PDF avec @react-pdf/renderer

---

### Phase 5 : Pages et routing

#### 5.1 — Page liste

- [ ] `app/(admin)/credit-fixe/demandes/page.tsx` — integrer `CreditFixeDemandList`

> **Documentation** :
> - Architecture : `architecture/README.md` → section **4. Flux de donnees** (Pages en haut du flux)
> - Wireframe desktop : `wireframes/desktop.md` → section **1. Page Liste** (layout complet)
> - Wireframe mobile : `wireframes/mobile.md` → section **1. Page Liste** (layout mobile)

#### 5.2 — Page detail

- [ ] `app/(admin)/credit-fixe/demandes/[id]/page.tsx` — integrer `CreditFixeDemandDetail`

> **Documentation** :
> - Architecture : `architecture/README.md` → section **4. Flux de donnees** (Pages en haut du flux)
> - Wireframe desktop : `wireframes/desktop.md` → section **2. Page Detail Demande** (layout 2 colonnes)
> - Wireframe mobile : `wireframes/mobile.md` → section **2. Page Detail Demande** (sections empilees)

---

### Phase 6 : Firebase

#### 6.1 — Deployer les regles Firestore

- [ ] Verifier que les regles `creditDemands` sont deployees et conformes

> **Documentation** :
> - Regles Firestore : `firebase/firestore-rules.md` — regles completes avec tableau permissions (read, create, update, delete) et tableau comparatif validations regles vs service
> - Fichier source : `firestore.rules` lignes 696-733

#### 6.2 — Deployer les index composites

- [ ] Verifier que les 7 index composites sont deployes

> **Documentation** :
> - Indexes Firestore : `firebase/firestore-indexes.md` — les 7 index avec JSON exact et cas d'usage :
>   - Index #1 : `status` + `createdAt` (onglets statut)
>   - Index #2 : `creditType` + `createdAt` (filtre par type FIXE)
>   - Index #3 : `clientId` + `createdAt` (historique d'un membre)
>   - Index #4 : `guarantorId` + `createdAt` (demandes d'un garant)
>   - Index #5 : `status` + `creditType` + `createdAt` (filtre combine)
>   - Index #6 : `status` + `clientId` + `createdAt` (filtre combine)
>   - Index #7 : `status` + `guarantorId` + `createdAt` (filtre combine)
> - Fichier source : `firestore.indexes.json` lignes 3211-3320
>
> **Skills** :
> - `.cursor/skills/security-review/SKILL.md` — verification des regles d'acces

---

### Phase 7 : Tests

#### 7.1 — Tests unitaires (Service)

- [ ] `createDemand()` — generation ID, score, statut PENDING
- [ ] `updateDemandStatus()` — transitions valides et invalides
- [ ] `deleteDemand()` — refus si contrat lie ou statut != PENDING
- [ ] `calculateInitialScore()` — calcul correct depuis l'historique

> **Documentation** :
> - Architecture : `architecture/README.md` → section **services/** (toutes les methodes a tester)
> - Activite : `activite/DemandesCreditFixe.puml` — flux complet pour identifier les cas limites (validations, erreurs, conditions)

#### 7.2 — Tests integration (Hooks)

- [ ] Queries : chargement liste, detail, stats
- [ ] Mutations : creation, update statut, suppression
- [ ] Cache : invalidation correcte apres chaque mutation

> **Documentation** :
> - Architecture : `architecture/README.md` → section **hooks/** (cache keys, invalidation par mutation)

#### 7.3 — Tests E2E

- [ ] Creation d'une demande FIXE complete (membre → details → garant → validation)
- [ ] Approbation puis creation de contrat
- [ ] Rejet puis reouverture
- [ ] Modification d'une demande PENDING
- [ ] Suppression d'une demande PENDING sans contrat
- [ ] Interdiction de suppression si contrat lie
- [ ] Export Excel et PDF
- [ ] Filtres et pagination

> **Documentation** :
> - Activite : `activite/DemandesCreditFixe.puml` — workflow complet (chaque branche du diagramme = un scenario E2E)
> - Sequence : `sequence/SEQ_CreerDemandeCreditFixe.puml` — scenario creation (E2E : creation complete)
> - Sequence : `sequence/SEQ_TraiterDemandeCreditFixe.puml` — scenarios traitement (E2E : approbation, rejet, contrat)
> - Wireframe desktop : `wireframes/desktop.md` — verifier que l'UI finale correspond aux maquettes
> - Wireframe mobile : `wireframes/mobile.md` — verifier le responsive
> - Regles Firestore : `firebase/firestore-rules.md` → regle `delete` (tester le refus de suppression avec contrat lie)

---

## Impacts techniques (code existant)

Les fichiers suivants sont concernes par la migration vers l'architecture domaines :

| Fichier existant | Action |
|---|---|
| `src/components/credit-speciale/CreateCreditDemandModal.tsx` | Migrer → `domains/.../demandes/components/` |
| `src/components/credit-speciale/ListDemandes.tsx` | Migrer → `domains/.../demandes/components/` |
| `src/components/credit-speciale/CreditDemandDetail.tsx` | Migrer → `domains/.../demandes/components/` |
| `src/services/credit-speciale/CreditSpecialeService.ts` | Extraire methodes demandes → `domains/.../demandes/services/` |
| `src/repositories/credit-speciale/CreditDemandRepository.ts` | Migrer → `domains/.../demandes/repositories/` |
| `src/hooks/useCreditSpeciale.ts` | Extraire hooks demandes → `domains/.../demandes/hooks/` |
| `src/schemas/credit-speciale.schema.ts` | Extraire schema demande → `domains/.../demandes/schemas/` |
| `src/types/types.ts` | Extraire `CreditDemand` → `domains/.../demandes/entities/` |

> **Documentation** : `architecture/README.md` → section **3. Migration depuis le code existant** (tableau complet + strategie en 3 phases)
