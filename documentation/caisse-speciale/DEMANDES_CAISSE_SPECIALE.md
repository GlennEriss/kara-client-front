# Analyse fonctionnelle – Fonctionnalité "Demandes" – Module Caisse Spéciale

## 1. Contexte et périmètre

### 1.1. Objectif général

Ajouter une fonctionnalité de **gestion des demandes** au module Caisse Spéciale, permettant de suivre le cycle de vie complet d'une demande de contrat avant sa création effective. Cette fonctionnalité permettra de :

- Centraliser toutes les demandes de contrats de caisse spéciale
- Suivre le statut de chaque demande (en attente, acceptée, refusée)
- Traçabilité complète des décisions (qui a accepté/refusé, quand, pourquoi)
- Organiser la vue avec des onglets et des filtres
- Afficher des statistiques adaptées selon les filtres

### 1.2. Structure de navigation

Le module **Caisse Spéciale** dans le sidebar sera réorganisé avec deux sous-onglets :

```
Caisse Spéciale
├── Demandes (nouveau)
└── Contrats (existant)
```

**Routes** :
- `/caisse-speciale/demandes` - Liste des demandes
- `/caisse-speciale/demandes/[id]` - Détails d'une demande
- `/caisse-speciale/contrats` - Liste des contrats (existant)
- `/caisse-speciale/contrats/[id]` - Détails d'un contrat (existant)

## 2. Analyse du cycle de vie d'une demande

### 2.1. Statuts d'une demande

Une demande de contrat Caisse Spéciale peut avoir les statuts suivants :

- **`PENDING`** : Demande en attente de traitement
- **`APPROVED`** : Demande acceptée (peut être convertie en contrat)
- **`REJECTED`** : Demande refusée
- **`CONVERTED`** : Demande convertie en contrat (statut final)

### 2.2. Cycle de vie

```
PENDING → APPROVED → CONVERTED
    ↓
REJECTED (statut final)
```

**Transitions possibles** :
- `PENDING` → `APPROVED` : Par un admin (avec raison d'acceptation)
- `PENDING` → `REJECTED` : Par un admin (avec raison de refus)
- `APPROVED` → `CONVERTED` : Automatique lors de la création du contrat depuis la demande

## 3. Structure des données

### 3.1. Interface `CaisseSpecialeDemand`

```typescript
export interface CaisseSpecialeDemand {
  id: string // Format: MK_DEMANDE_CS_{matricule}_{date}_{heure}
  
  // Informations du demandeur
  memberId?: string // Pour demande individuelle
  groupeId?: string // Pour demande de groupe
  contractType: 'INDIVIDUAL' | 'GROUP'
  
  // Informations de la demande
  caisseType: 'STANDARD' | 'JOURNALIERE' | 'LIBRE'
  monthlyAmount: number // Montant mensuel souhaité
  monthsPlanned: number // Durée souhaitée (en mois)
  desiredDate: string // Date souhaitée pour le début du contrat (format: YYYY-MM-DD)
  cause?: string // Raison de la demande (optionnel)
  
  // Statut et décision
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED'
  
  // Traçabilité de l'acceptation/refus
  decisionMadeAt?: Date // Date de la décision
  decisionMadeBy?: string // ID de l'agent qui a pris la décision
  decisionMadeByName?: string // Nom complet de l'agent (prénom + nom)
  decisionReason?: string // Raison de l'acceptation ou du refus
  
  // Lien vers le contrat créé (si convertie)
  contractId?: string // ID du contrat créé depuis cette demande
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'agent qui a créé la demande
  updatedBy?: string // ID de l'agent qui a modifié la demande
}
```

### 3.2. Filtres de recherche

```typescript
export interface CaisseSpecialeDemandFilters {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'all'
  contractType?: 'INDIVIDUAL' | 'GROUP' | 'all'
  caisseType?: 'STANDARD' | 'JOURNALIERE' | 'LIBRE' | 'all'
  memberId?: string
  groupeId?: string
  decisionMadeBy?: string // Filtrer par agent qui a pris la décision
  createdAtFrom?: Date // Filtre par date de création (début)
  createdAtTo?: Date // Filtre par date de création (fin)
  desiredDateFrom?: Date // Filtre par date souhaitée (début)
  desiredDateTo?: Date // Filtre par date souhaitée (fin)
  search?: string // Recherche textuelle (nom du membre, ID de la demande, etc.)
  page?: number
  limit?: number
}
```

### 3.3. Statistiques

```typescript
export interface CaisseSpecialeDemandStats {
  total: number // Total de toutes les demandes
  pending: number // Demandes en attente
  approved: number // Demandes acceptées
  rejected: number // Demandes refusées
  converted: number // Demandes converties en contrats
}
```

## 4. Cas d'utilisation (Use Cases)

### UC1 – Créer une demande de contrat Caisse Spéciale

**Acteur** : Admin

**Objectif** : Permettre à l'admin de créer une nouvelle demande de contrat pour un membre ou un groupe

**Préconditions** :
- L'admin est authentifié
- Le membre ou le groupe existe dans le système

**Scénario principal** :
1. L'admin accède à la page `/caisse-speciale/demandes`
2. L'admin clique sur le bouton "Nouvelle demande"
3. L'admin remplit le formulaire :
   - Sélection du type de contrat (Individuel ou Groupe)
   - Sélection du membre ou du groupe
   - Sélection du type de caisse (Standard, Journalière, Libre)
   - Montant mensuel souhaité
   - Durée souhaitée (en mois)
   - Date souhaitée pour le début du contrat (obligatoire)
   - Raison de la demande (optionnel)
4. L'admin valide le formulaire
5. Le système crée la demande avec le statut `PENDING`
6. Le système génère un ID unique au format `MK_DEMANDE_CS_{matricule}_{date}_{heure}`
7. Le système enregistre `createdBy` avec l'ID de l'admin
8. La demande apparaît dans la liste avec le statut "En attente"

**Scénarios alternatifs** :
- Si le formulaire est invalide, afficher les erreurs de validation
- Si le membre/groupe n'existe pas, afficher une erreur

**Postconditions** :
- Une nouvelle demande est créée avec le statut `PENDING`
- La demande est visible dans la liste des demandes

---

### UC2 – Accepter une demande

**Acteur** : Admin

**Objectif** : Permettre à l'admin d'accepter une demande en attente

**Préconditions** :
- La demande existe et a le statut `PENDING`
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande (`/caisse-speciale/demandes/[id]`)
2. L'admin clique sur le bouton "Accepter la demande"
3. Le système affiche un modal de confirmation avec :
   - Un champ obligatoire "Raison d'acceptation" (textarea)
   - Un bouton "Confirmer" et "Annuler"
4. L'admin saisit la raison d'acceptation (ex: "Membre à jour, demande justifiée")
5. L'admin clique sur "Confirmer"
6. Le système met à jour la demande :
   - `status` → `APPROVED`
   - `decisionMadeAt` → Date/heure actuelle
   - `decisionMadeBy` → ID de l'admin
   - `decisionMadeByName` → Prénom + Nom de l'admin (récupéré depuis la table `admins`)
   - `decisionReason` → Raison saisie
   - `updatedBy` → ID de l'admin
7. Le système affiche un message de succès
8. La demande apparaît maintenant avec le statut "Acceptée" et les informations de décision sont visibles

**Scénarios alternatifs** :
- Si la raison n'est pas saisie, afficher une erreur de validation
- Si la demande a déjà été acceptée/refusée, afficher un message d'erreur

**Postconditions** :
- La demande passe au statut `APPROVED`
- Les informations de décision sont enregistrées
- La demande peut maintenant être convertie en contrat

---

### UC3 – Refuser une demande

**Acteur** : Admin

**Objectif** : Permettre à l'admin de refuser une demande en attente

**Préconditions** :
- La demande existe et a le statut `PENDING`
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande
2. L'admin clique sur le bouton "Refuser la demande"
3. Le système affiche un modal de confirmation avec :
   - Un champ obligatoire "Raison du refus" (textarea)
   - Un bouton "Confirmer" et "Annuler"
4. L'admin saisit la raison du refus (ex: "Membre en retard sur ses paiements")
5. L'admin clique sur "Confirmer"
6. Le système met à jour la demande :
   - `status` → `REJECTED`
   - `decisionMadeAt` → Date/heure actuelle
   - `decisionMadeBy` → ID de l'admin
   - `decisionMadeByName` → Prénom + Nom de l'admin
   - `decisionReason` → Raison saisie
   - `updatedBy` → ID de l'admin
7. Le système affiche un message de succès
8. La demande apparaît maintenant avec le statut "Refusée" et les informations de décision sont visibles

**Scénarios alternatifs** :
- Si la raison n'est pas saisie, afficher une erreur de validation
- Si la demande a déjà été acceptée/refusée, afficher un message d'erreur

**Postconditions** :
- La demande passe au statut `REJECTED`
- Les informations de décision sont enregistrées
- La demande ne peut plus être modifiée (statut final)

---

### UC4 – Convertir une demande acceptée en contrat

**Acteur** : Admin

**Objectif** : Permettre à l'admin de créer un contrat à partir d'une demande acceptée

**Préconditions** :
- La demande existe et a le statut `APPROVED`
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande acceptée
2. L'admin clique sur le bouton "Créer le contrat"
3. Le système redirige vers le formulaire de création de contrat prérempli avec les informations de la demande :
   - Type de contrat (Individuel/Groupe)
   - Membre/Groupe sélectionné
   - Type de caisse
   - Montant mensuel
   - Durée
   - Date de début du contrat (préremplie avec la date souhaitée de la demande)
4. L'admin peut modifier les informations si nécessaire
5. L'admin valide la création du contrat
6. Le système crée le contrat
7. Le système met à jour la demande :
   - `status` → `CONVERTED`
   - `contractId` → ID du contrat créé
   - `updatedBy` → ID de l'admin
8. Le système redirige vers la page de détails du contrat créé

**Scénarios alternatifs** :
- Si la demande n'est pas acceptée, le bouton "Créer le contrat" n'est pas visible
- Si un contrat existe déjà pour cette demande, afficher un message d'erreur

**Postconditions** :
- Un contrat est créé à partir de la demande
- La demande passe au statut `CONVERTED`
- Un lien vers le contrat est disponible dans la demande

---

### UC5 – Consulter la liste des demandes avec filtres

**Acteur** : Admin

**Objectif** : Permettre à l'admin de consulter et filtrer les demandes

**Préconditions** :
- L'admin est authentifié
- Des demandes existent dans le système

**Scénario principal** :
1. L'admin accède à la page `/caisse-speciale/demandes`
2. Le système affiche :
   - **Onglets de statut** : "Toutes", "En attente", "Acceptées", "Refusées", "Converties"
   - **Cartes de statistiques** : Total, En attente, Acceptées, Refusées, Converties
   - **Section de filtres** :
     - Recherche textuelle (nom du membre, ID de la demande)
     - Filtre par type de contrat (Individuel/Groupe)
     - Filtre par type de caisse (Standard/Journalière/Libre)
     - Filtre par membre/groupe
     - Filtre par agent décisionnaire
     - Filtre par date de création (de/début à fin)
     - Filtre par date souhaitée (de/début à fin)
   - **Liste des demandes** (grille ou tableau) avec pagination
3. L'admin sélectionne un onglet (ex: "Acceptées")
4. Le système filtre automatiquement les demandes selon l'onglet sélectionné
5. Les statistiques s'adaptent pour afficher uniquement les demandes de l'onglet sélectionné
6. L'admin peut combiner les filtres avec l'onglet
7. L'admin peut rechercher une demande spécifique
8. L'admin peut cliquer sur une demande pour voir les détails

**Scénarios alternatifs** :
- Si aucun résultat ne correspond aux filtres, afficher "Aucune demande trouvée"
- Les filtres peuvent être réinitialisés avec un bouton "Réinitialiser"

**Postconditions** :
- Les demandes sont affichées selon les filtres et l'onglet sélectionné
- Les statistiques sont mises à jour en temps réel

---

### UC6 – Consulter les détails d'une demande

**Acteur** : Admin

**Objectif** : Permettre à l'admin de consulter toutes les informations d'une demande

**Préconditions** :
- La demande existe
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande (`/caisse-speciale/demandes/[id]`)
2. Le système affiche :
   - **Informations générales** :
     - ID de la demande
     - Statut (avec badge coloré)
     - Date de création
     - Créateur de la demande
   - **Informations du demandeur** :
     - Type de contrat (Individuel/Groupe)
     - Nom du membre ou du groupe
     - Informations de contact
   - **Informations de la demande** :
     - Type de caisse
     - Montant mensuel souhaité
     - Durée souhaitée
     - Date souhaitée pour le début du contrat
     - Raison de la demande (si renseignée)
   - **Informations de décision** (si la demande a été acceptée/refusée) :
     - Date de la décision
     - Agent décisionnaire (nom complet)
     - Raison de la décision
   - **Lien vers le contrat** (si la demande a été convertie) :
     - ID du contrat
     - Bouton pour accéder au contrat
   - **Actions disponibles** :
     - Si `PENDING` : Boutons "Accepter" et "Refuser"
     - Si `APPROVED` : Bouton "Créer le contrat"
     - Si `REJECTED` ou `CONVERTED` : Aucune action (lecture seule)

**Postconditions** :
- L'admin a accès à toutes les informations de la demande
- Les actions appropriées sont disponibles selon le statut

---

### UC7 – Exporter les demandes

**Acteur** : Admin

**Objectif** : Permettre à l'admin d'exporter la liste des demandes filtrées

**Préconditions** :
- L'admin est sur la page de liste des demandes
- Des demandes sont affichées (filtrées ou non)

**Scénario principal** :
1. L'admin applique les filtres souhaités (optionnel)
2. L'admin clique sur le bouton "Exporter Excel" ou "Exporter PDF"
3. Le système génère un fichier avec :
   - Les demandes actuellement affichées (selon les filtres)
   - Toutes les colonnes visibles dans la liste
   - Les informations de décision (agent, raison, date)
4. Le fichier est téléchargé automatiquement

**Postconditions** :
- Un fichier Excel ou PDF est généré et téléchargé

## 5. Organisation de la vue

### 5.1. Structure de la page de liste

```
┌─────────────────────────────────────────────────────────┐
│  Titre: "Demandes de Caisse Spéciale"                   │
│  Sous-titre: "Gestion des demandes de contrats"          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Onglets: [Toutes] [En attente] [Acceptées] [Refusées] │
│                          [Converties]                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Statistiques (carrousel)                               │
│  [TOTAL] [EN ATTENTE] [ACCEPTÉES] [REFUSÉES] [CONVERTIES]│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Filtres                                                 │
│  [Recherche] [Type contrat] [Type caisse] [Membre]     │
│  [Agent] [Date début] [Date fin] [Réinitialiser]         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Actions: [Vue grille/Liste] [Actualiser] [Exporter]    │
│           [Nouvelle demande]                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Liste des demandes (cartes ou tableau)                 │
│  [Carte 1] [Carte 2] [Carte 3] ...                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Pagination                                              │
└─────────────────────────────────────────────────────────┘
```

### 5.2. Design et alignement

Le design doit être **aligné avec le design existant** du module Crédit Spéciale :

- **Couleurs** : Utiliser la palette de couleurs existante (`#234D65`, `#2c5a73`)
- **Composants** : Réutiliser les composants UI existants (Cards, Badges, Tables, Buttons, etc.)
- **Layout** : Même structure que `/credit-speciale/demandes`
- **Onglets** : Même style que les onglets de crédit spéciale
- **Statistiques** : Même carrousel que dans les autres modules
- **Filtres** : Même section de filtres avec le même style

### 5.3. Carte de demande (vue grille)

Chaque carte affiche :
- **En-tête** :
  - ID de la demande (format court)
  - Badge de statut (coloré)
  - Badge du type de contrat (Individuel/Groupe)
- **Corps** :
  - Nom du demandeur (membre ou groupe)
  - Type de caisse
  - Montant mensuel souhaité
  - Durée souhaitée
  - Date souhaitée pour le début du contrat
  - Date de création
- **Pied** :
  - Si acceptée/refusée : Nom de l'agent décisionnaire et date
  - Si convertie : Lien vers le contrat
  - Actions : Boutons selon le statut

### 5.4. Tableau de demandes (vue liste)

Colonnes :
- ID
- Demandeur (membre/groupe)
- Type de contrat
- Type de caisse
- Montant mensuel
- Durée
- Date souhaitée
- Statut
- Agent décisionnaire (si applicable)
- Date de création
- Actions

## 6. Statistiques

### 6.1. Calcul des statistiques

Les statistiques doivent être calculées **globalement** (sans filtre de statut) pour les compteurs des onglets, mais **filtrées** pour les cartes de statistiques selon l'onglet sélectionné.

**Exemple** :
- Onglet "Toutes" : Statistiques globales (toutes les demandes)
- Onglet "En attente" : Statistiques filtrées (uniquement les demandes `PENDING`)
- Onglet "Acceptées" : Statistiques filtrées (uniquement les demandes `APPROVED`)

### 6.2. Cartes de statistiques

Chaque carte affiche :
- **Icône** représentative
- **Label** (TOTAL, EN ATTENTE, ACCEPTÉES, etc.)
- **Valeur** (nombre de demandes)
- **Couleur** distinctive selon le type

## 7. Règles métier

### 7.1. Génération de l'ID

Format : `MK_DEMANDE_CS_{matricule}_{date}_{heure}`

- `matricule` : 4 premiers chiffres du matricule du membre (ou "GRP" pour un groupe)
- `date` : Format `DDMMYY` (jour, mois, année sur 2 chiffres)
- `heure` : Format `HHMM` (heures, minutes)

Exemple : `MK_DEMANDE_CS_2663_040126_1415`

### 7.2. Traçabilité

- **Création** : `createdBy` = ID de l'admin créateur
- **Décision** : `decisionMadeBy` = ID de l'admin qui a accepté/refusé
- **Décision** : `decisionMadeByName` = Prénom + Nom de l'admin (récupéré depuis la table `admins`)
- **Modification** : `updatedBy` = ID de l'admin qui a modifié

### 7.3. Validation

- Une demande `REJECTED` ne peut plus être modifiée
- Une demande `CONVERTED` ne peut plus être modifiée
- Une demande `APPROVED` peut être convertie en contrat
- Une demande `PENDING` peut être acceptée ou refusée

### 7.4. Conversion en contrat

- Lors de la conversion, le système préremplit le formulaire de création de contrat avec les informations de la demande
- La date souhaitée (`desiredDate`) est utilisée comme date de début du contrat (`contractStartAt`)
- L'admin peut modifier les informations (y compris la date de début) avant de créer le contrat
- Une fois le contrat créé, la demande passe au statut `CONVERTED` et un lien vers le contrat est créé

### 7.5. Date souhaitée

- La date souhaitée (`desiredDate`) indique quand le demandeur souhaite que le contrat commence
- Cette date peut être dans le futur (ex: demande créée le 4 janvier, date souhaitée le 10 janvier)
- Cette date peut également être dans le passé (pour des cas particuliers)
- Lors de la conversion en contrat, cette date devient la date de début du contrat (`contractStartAt`)
- Si l'admin modifie la date lors de la création du contrat, la date modifiée est utilisée

## 8. Architecture technique

### 8.1. Structure des fichiers

```
src/
├── components/
│   └── caisse-speciale/
│       ├── ListDemandes.tsx (nouveau)
│       ├── DemandDetail.tsx (nouveau)
│       ├── CreateDemandModal.tsx (nouveau)
│       ├── AcceptDemandModal.tsx (nouveau)
│       ├── RejectDemandModal.tsx (nouveau)
│       └── StatisticsCaisseSpecialeDemandes.tsx (nouveau)
├── repositories/
│   └── caisse-speciale/
│       ├── ICaisseSpecialeDemandRepository.ts (nouveau)
│       └── CaisseSpecialeDemandRepository.ts (nouveau)
├── services/
│   └── caisse-speciale/
│       ├── ICaisseSpecialeService.ts (étendu)
│       └── CaisseSpecialeService.ts (étendu)
├── hooks/
│   └── caisse-speciale/
│       └── useCaisseSpecialeDemands.ts (nouveau)
├── schemas/
│   └── caisse-speciale.schema.ts (étendu)
├── types/
│   └── types.ts (ajout de CaisseSpecialeDemand)
└── app/
    └── (admin)/
        └── caisse-speciale/
            ├── demandes/
            │   ├── page.tsx (nouveau)
            │   └── [id]/
            │       └── page.tsx (nouveau)
            └── contrats/ (existant)
```

### 8.2. Repository

**Interface** : `ICaisseSpecialeDemandRepository`

Méthodes :
- `createDemand(data, customId?)` : Créer une demande
- `getDemandById(id)` : Récupérer une demande par ID
- `getDemandsWithFilters(filters?)` : Récupérer les demandes avec filtres
- `getDemandsStats(filters?)` : Récupérer les statistiques
- `updateDemandStatus(id, status, adminId, reason, adminName)` : Mettre à jour le statut
- `updateDemand(id, data)` : Mettre à jour une demande

### 8.3. Service

**Interface** : `ICaisseSpecialeService` (étendu)

Nouvelles méthodes :
- `createDemand(data, adminId)` : Créer une demande
- `getDemandById(id)` : Récupérer une demande
- `getDemandsWithFilters(filters?)` : Récupérer les demandes filtrées
- `getDemandsStats(filters?)` : Récupérer les statistiques
- `approveDemand(demandId, adminId, reason)` : Accepter une demande
- `rejectDemand(demandId, adminId, reason)` : Refuser une demande
- `convertDemandToContract(demandId, adminId, contractData?)` : Convertir en contrat

### 8.4. Hooks React Query

**Fichier** : `src/hooks/caisse-speciale/useCaisseSpecialeDemands.ts`

Hooks :
- `useCaisseSpecialeDemands(filters?)` : Liste des demandes
- `useCaisseSpecialeDemand(id)` : Détails d'une demande
- `useCaisseSpecialeDemandsStats(filters?)` : Statistiques
- `useCaisseSpecialeDemandMutations()` : Mutations (create, approve, reject, convert)

## 9. Navigation sidebar

### 9.1. Modification du menu

Dans `src/components/layout/AppSidebar.tsx`, modifier l'entrée "Caisse Spéciale" :

```typescript
{
  title: "Caisse Spéciale",
  icon: Wallet,
  children: [
    {
      title: "Demandes",
      url: routes.admin.caisseSpecialeDemandes,
      icon: FileText,
    },
    {
      title: "Contrats",
      url: routes.admin.caisseSpeciale,
      icon: CreditCard,
    },
  ],
}
```

### 9.2. Routes

Dans `src/constantes/routes.ts`, ajouter :

```typescript
caisseSpecialeDemandes: '/caisse-speciale/demandes',
caisseSpecialeDemandDetails: (id: string) => `/caisse-speciale/demandes/${id}`,
```

## 10. Alignement avec le design existant

### 10.1. Réutilisation des composants

- **ListDemandes.tsx** : S'inspirer de `src/components/credit-speciale/ListDemandes.tsx`
- **StatisticsCaisseSpecialeDemandes.tsx** : S'inspirer de `src/components/credit-speciale/StatisticsCreditDemandes.tsx`
- **DemandDetail.tsx** : S'inspirer de `src/components/credit-speciale/CreditDemandDetail.tsx`
- **CreateDemandModal.tsx** : S'inspirer de `src/components/credit-speciale/CreateCreditDemandModal.tsx`

### 10.2. Styles et couleurs

- Utiliser les mêmes classes CSS que le module Crédit Spéciale
- Palette de couleurs : `#234D65`, `#2c5a73`, etc.
- Badges de statut : Mêmes couleurs que Crédit Spéciale
- Cartes : Même style de cartes avec ombres et bordures

### 10.3. Responsive

- Design responsive identique au module Crédit Spéciale
- Grille adaptative selon la taille d'écran
- Tableau avec scroll horizontal sur mobile

## 11. Notifications et Cloud Functions

### 11.1. Notifications directes (créées dans les services)

Les notifications suivantes sont créées **directement** lors des actions dans les services :

#### 11.1.1. Notification de création de demande

**Déclencheur** : Lors de la création d'une demande (`createDemand`)

**Destinataires** :
- Tous les admins (notification globale)

**Structure** :
```typescript
{
  module: 'caisse_speciale',
  entityId: demandId,
  type: 'demand_created',
  title: 'Nouvelle demande de contrat Caisse Spéciale',
  message: `Une nouvelle demande a été créée par ${adminName} pour ${memberName || groupName}`,
  metadata: {
    demandId: string,
    contractType: 'INDIVIDUAL' | 'GROUP',
    memberId?: string,
    groupeId?: string,
    caisseType: 'STANDARD' | 'JOURNALIERE' | 'LIBRE',
    monthlyAmount: number,
    desiredDate: string,
    createdBy: string,
  }
}
```

#### 11.1.2. Notification d'acceptation de demande

**Déclencheur** : Lors de l'acceptation d'une demande (`approveDemand`)

**Destinataires** :
- Le membre ou le groupe demandeur (si membre connecté)
- L'admin qui a créé la demande (si différent de celui qui accepte)

**Structure** :
```typescript
{
  module: 'caisse_speciale',
  entityId: demandId,
  type: 'demand_approved',
  title: 'Demande acceptée',
  message: `Votre demande de contrat Caisse Spéciale a été acceptée. Raison : ${reason}`,
  metadata: {
    demandId: string,
    decisionMadeBy: string,
    decisionMadeByName: string,
    decisionReason: string,
    decisionMadeAt: Date,
    memberId?: string,
    groupeId?: string,
  }
}
```

#### 11.1.3. Notification de refus de demande

**Déclencheur** : Lors du refus d'une demande (`rejectDemand`)

**Destinataires** :
- Le membre ou le groupe demandeur (si membre connecté)
- L'admin qui a créé la demande (si différent de celui qui refuse)

**Structure** :
```typescript
{
  module: 'caisse_speciale',
  entityId: demandId,
  type: 'demand_rejected',
  title: 'Demande refusée',
  message: `Votre demande de contrat Caisse Spéciale a été refusée. Raison : ${reason}`,
  metadata: {
    demandId: string,
    decisionMadeBy: string,
    decisionMadeByName: string,
    decisionReason: string,
    decisionMadeAt: Date,
    memberId?: string,
    groupeId?: string,
  }
}
```

#### 11.1.4. Notification de conversion en contrat

**Déclencheur** : Lors de la conversion d'une demande en contrat (`convertDemandToContract`)

**Destinataires** :
- Le membre ou le groupe demandeur (si membre connecté)
- Tous les admins (notification globale)

**Structure** :
```typescript
{
  module: 'caisse_speciale',
  entityId: contractId,
  type: 'demand_converted',
  title: 'Contrat créé depuis votre demande',
  message: `Votre demande a été convertie en contrat. Le contrat ${contractId} est maintenant actif.`,
  metadata: {
    demandId: string,
    contractId: string,
    memberId?: string,
    groupeId?: string,
    convertedBy: string,
  }
}
```

### 11.2. Cloud Functions planifiées

#### 11.2.1. Rappel des demandes en attente

**Objectif** : Rappeler aux admins les demandes en attente depuis plusieurs jours

**Fichier** : `functions/src/scheduled/caisseSpecialeDemandReminders.ts`

**Fréquence** : Quotidienne à 9h00 (heure locale Gabon, UTC+1)

**Logique** :
- Récupérer toutes les demandes avec `status: 'PENDING'`
- Calculer le nombre de jours depuis la création (`createdAt`)
- Créer une notification pour les admins si :
  - La demande est en attente depuis **3 jours** (premier rappel)
  - La demande est en attente depuis **7 jours** (deuxième rappel)
  - La demande est en attente depuis **14 jours** (rappel urgent)

**Structure de la notification** :
```typescript
{
  module: 'caisse_speciale',
  entityId: demandId,
  type: 'demand_pending_reminder',
  title: `Demande en attente depuis ${daysPending} jour(s)`,
  message: `La demande ${demandId} de ${memberName || groupName} est en attente depuis ${daysPending} jour(s).`,
  metadata: {
    demandId: string,
    daysPending: number,
    createdAt: Date,
    memberId?: string,
    groupeId?: string,
    reminderLevel: 'normal' | 'warning' | 'urgent', // 3j, 7j, 14j
  }
}
```

**Code de la Cloud Function** :
```typescript
import * as functions from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import { NotificationService } from '../services/NotificationService'

/**
 * Job planifié qui s'exécute quotidiennement à 9h00
 * Rappelle aux admins les demandes en attente depuis plusieurs jours
 */
export const remindPendingCaisseSpecialeDemands = functions
  .region('us-central1')
  .pubsub.schedule('0 9 * * *') // Tous les jours à 9h00 UTC
  .timeZone('Africa/Libreville') // Fuseau horaire du Gabon
  .onRun(async (context) => {
    const db = admin.firestore()
    const notificationService = new NotificationService()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    console.log(`[CS Demand Reminders] Début du job - ${today.toISOString()}`)

    try {
      // Récupérer toutes les demandes en attente
      const demandsSnapshot = await db
        .collection('caisseSpecialeDemands')
        .where('status', '==', 'PENDING')
        .get()

      console.log(`[CS Demand Reminders] ${demandsSnapshot.size} demandes en attente trouvées`)

      let notificationsCreated = 0

      for (const demandDoc of demandsSnapshot.docs) {
        const demand = demandDoc.data()
        const createdAt = demand.createdAt?.toDate() || new Date(demand.createdAt)
        const daysPending = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

        // Créer une notification si la demande est en attente depuis 3, 7 ou 14 jours
        if (daysPending === 3 || daysPending === 7 || daysPending === 14) {
          const reminderLevel = daysPending === 3 ? 'normal' : daysPending === 7 ? 'warning' : 'urgent'
          
          // Récupérer le nom du membre ou du groupe
          let memberName = 'Membre inconnu'
          if (demand.contractType === 'INDIVIDUAL' && demand.memberId) {
            const memberDoc = await db.collection('members').doc(demand.memberId).get()
            if (memberDoc.exists) {
              const member = memberDoc.data()
              memberName = `${member?.firstName || ''} ${member?.lastName || ''}`.trim()
            }
          } else if (demand.contractType === 'GROUP' && demand.groupeId) {
            const groupDoc = await db.collection('groups').doc(demand.groupeId).get()
            if (groupDoc.exists) {
              const group = groupDoc.data()
              memberName = group?.name || 'Groupe inconnu'
            }
          }

          // Vérifier si une notification existe déjà pour ce rappel
          const existingNotifications = await db
            .collection('notifications')
            .where('module', '==', 'caisse_speciale')
            .where('entityId', '==', demandDoc.id)
            .where('type', '==', 'demand_pending_reminder')
            .where('metadata.daysPending', '==', daysPending)
            .get()

          if (existingNotifications.empty) {
            // Créer la notification pour tous les admins
            await notificationService.createNotification({
              module: 'caisse_speciale',
              entityId: demandDoc.id,
              type: 'demand_pending_reminder',
              title: `Demande en attente depuis ${daysPending} jour(s)`,
              message: `La demande ${demandDoc.id} de ${memberName} est en attente depuis ${daysPending} jour(s).`,
              metadata: {
                demandId: demandDoc.id,
                daysPending,
                createdAt: createdAt.toISOString(),
                memberId: demand.memberId,
                groupeId: demand.groupeId,
                reminderLevel,
              },
            })

            notificationsCreated++
            console.log(`[CS Demand Reminders] Notification créée pour la demande ${demandDoc.id} (${daysPending} jours)`)
          }
        }
      }

      console.log(`[CS Demand Reminders] ${notificationsCreated} notifications créées`)
      return { success: true, notificationsCreated }
    } catch (error) {
      console.error('[CS Demand Reminders] Erreur:', error)
      throw error
    }
  })
```

#### 11.2.2. Rappel des demandes acceptées non converties

**Objectif** : Rappeler aux admins les demandes acceptées qui n'ont pas encore été converties en contrat

**Fichier** : `functions/src/scheduled/caisseSpecialeDemandReminders.ts` (même fichier, fonction supplémentaire)

**Fréquence** : Quotidienne à 10h00 (heure locale Gabon, UTC+1)

**Logique** :
- Récupérer toutes les demandes avec `status: 'APPROVED'` et sans `contractId`
- Calculer le nombre de jours depuis l'acceptation (`decisionMadeAt`)
- Créer une notification pour les admins si :
  - La demande est acceptée depuis **7 jours** sans être convertie (premier rappel)
  - La demande est acceptée depuis **14 jours** sans être convertie (rappel urgent)

**Structure de la notification** :
```typescript
{
  module: 'caisse_speciale',
  entityId: demandId,
  type: 'demand_approved_not_converted',
  title: `Demande acceptée non convertie depuis ${daysSinceApproval} jour(s)`,
  message: `La demande ${demandId} de ${memberName || groupName} a été acceptée il y a ${daysSinceApproval} jour(s) mais n'a pas encore été convertie en contrat.`,
  metadata: {
    demandId: string,
    daysSinceApproval: number,
    approvedAt: Date,
    memberId?: string,
    groupeId?: string,
    reminderLevel: 'warning' | 'urgent', // 7j, 14j
  }
}
```

### 11.3. Intégration dans les services

Les notifications doivent être créées dans les méthodes suivantes :

**Service** : `src/services/caisse-speciale/CaisseSpecialeService.ts`

- `createDemand()` : Créer notification `demand_created`
- `approveDemand()` : Créer notification `demand_approved`
- `rejectDemand()` : Créer notification `demand_rejected`
- `convertDemandToContract()` : Créer notification `demand_converted`

**Exemple d'intégration** :
```typescript
// Dans approveDemand()
await this.notificationService.createNotification({
  module: 'caisse_speciale',
  entityId: demandId,
  type: 'demand_approved',
  title: 'Demande acceptée',
  message: `Votre demande de contrat Caisse Spéciale a été acceptée. Raison : ${reason}`,
  metadata: {
    demandId,
    decisionMadeBy: adminId,
    decisionMadeByName: adminName,
    decisionReason: reason,
    decisionMadeAt: new Date(),
    memberId: demand.memberId,
    groupeId: demand.groupeId,
  },
})
```

### 11.4. Déploiement des Cloud Functions

**Fichier** : `functions/src/index.ts`

```typescript
import { remindPendingCaisseSpecialeDemands } from './scheduled/caisseSpecialeDemandReminders'
import { remindApprovedNotConvertedCaisseSpecialeDemands } from './scheduled/caisseSpecialeDemandReminders'

export { remindPendingCaisseSpecialeDemands, remindApprovedNotConvertedCaisseSpecialeDemands }
```

**Commandes de déploiement** :
```bash
# Déployer toutes les fonctions
npm run deploy --only functions

# Déployer une fonction spécifique
npm run deploy --only functions:remindPendingCaisseSpecialeDemands
npm run deploy --only functions:remindApprovedNotConvertedCaisseSpecialeDemands
```

### 11.5. Index Firestore nécessaires

Pour optimiser les requêtes des Cloud Functions, créer les index suivants :

```
Collection: caisseSpecialeDemands
- status (Ascending), createdAt (Ascending)
- status (Ascending), decisionMadeAt (Ascending), contractId (Ascending)

Collection: notifications
- module (Ascending), entityId (Ascending), type (Ascending), metadata.daysPending (Ascending)
```

## 12. Implémentation prévue

Voir le fichier [`realisationAfaire.md`](./realisationAfaire.md) pour la liste détaillée des tâches d'implémentation.

## 13. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Analyse Caisse Spéciale** : [`./ANALYSE_CAISSE_SPECIALE.md`](./ANALYSE_CAISSE_SPECIALE.md)
- **Réalisation** : [`./realisationAfaire.md`](./realisationAfaire.md)
- **Référence Crédit Spéciale** : [`../credit-speciale/ANALYSE_CREDIT_SPECIALE.md`](../credit-speciale/ANALYSE_CREDIT_SPECIALE.md)

