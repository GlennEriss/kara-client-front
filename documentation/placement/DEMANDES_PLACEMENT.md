# Analyse fonctionnelle – Fonctionnalité "Demandes" – Module Placement

## 1. Contexte et périmètre

### 1.1. Objectif général

Ajouter une fonctionnalité de **gestion des demandes** au module Placement, permettant de suivre le cycle de vie complet d'une demande de placement avant sa création effective. Cette fonctionnalité permettra de :

- Centraliser toutes les demandes de placements
- Suivre le statut de chaque demande (en attente, acceptée, refusée)
- Traçabilité complète des décisions (qui a accepté/refusé, quand, pourquoi)
- Organiser la vue avec des onglets et des filtres
- Afficher des statistiques adaptées selon les filtres
- Gérer les demandes de placements pour les bienfaiteurs

### 1.2. Structure de navigation

Le module **Bienfaiteur > Placements** dans le sidebar sera réorganisé avec deux sous-onglets :

```
Bienfaiteur
└── Placements
    ├── Demandes (nouveau)
    └── Placements (existant)
```

**Routes** :
- `/placements/demandes` - Liste des demandes
- `/placements/demandes/[id]` - Détails d'une demande
- `/placements` - Liste des placements (existant)
- `/placements/[id]` - Détails d'un placement (existant)

## 2. Analyse du cycle de vie d'une demande

### 2.1. Statuts d'une demande

Une demande de placement peut avoir les statuts suivants :

- **`PENDING`** : Demande en attente de traitement
- **`APPROVED`** : Demande acceptée (peut être convertie en placement)
- **`REJECTED`** : Demande refusée
- **`CONVERTED`** : Demande convertie en placement (statut final)

### 2.2. Cycle de vie

```
PENDING → APPROVED → CONVERTED
    ↓
REJECTED (statut final)
```

**Transitions possibles** :
- `PENDING` → `APPROVED` : Par un admin (avec raison d'acceptation)
- `PENDING` → `REJECTED` : Par un admin (avec raison de refus)
- `APPROVED` → `CONVERTED` : Automatique lors de la création du placement depuis la demande
- `REJECTED` → `PENDING` : Réouverture possible avec motif de réouverture

## 3. Structure des données

### 3.1. Interface `PlacementDemand`

```typescript
export interface PlacementDemand {
  id: string // Format: MK_DEMANDE_PL_{matriculeBienfaiteur}_{date}_{heure}
  
  // Informations du bienfaiteur
  benefactorId: string // User.id avec rôle Bienfaiteur (obligatoire)
  benefactorName?: string // Nom complet du bienfaiteur (prérempli)
  benefactorPhone?: string // Téléphone du bienfaiteur (prérempli)
  
  // Informations de la demande
  amount: number // Montant du placement souhaité (FCFA)
  rate: number // Taux de commission souhaité (0-100)
  periodMonths: number // Durée souhaitée (1-7 mois)
  payoutMode: 'MonthlyCommission_CapitalEnd' | 'CapitalPlusCommission_End' // Mode de paiement souhaité
  desiredDate: string // Date souhaitée pour le début du placement (format: YYYY-MM-DD)
  cause?: string // Raison de la demande (optionnel)
  
  // Contact d'urgence (optionnel)
  urgentContact?: {
    name: string
    firstName?: string
    phone: string
    phone2?: string
    relationship?: string
    idNumber?: string
    typeId?: string
    documentPhotoUrl?: string
    memberId?: string
  }
  
  // Statut et décision
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED'
  
  // Traçabilité de l'acceptation/refus
  decisionMadeAt?: Date // Date de la décision
  decisionMadeBy?: string // ID de l'agent qui a pris la décision
  decisionMadeByName?: string // Nom complet de l'agent (prénom + nom)
  decisionReason?: string // Raison de l'acceptation ou du refus
  
  // Traçabilité de la réouverture (si refusée puis réouverte)
  reopenedAt?: Date // Date de la réouverture
  reopenedBy?: string // ID de l'agent qui a réouvert la demande
  reopenedByName?: string // Nom complet de l'agent qui a réouvert (prénom + nom)
  reopenReason?: string // Motif de la réouverture
  
  // Lien vers le placement créé (si convertie)
  placementId?: string // ID du placement créé depuis cette demande
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string // ID de l'agent qui a créé la demande
  updatedBy?: string // ID de l'agent qui a modifié la demande
}
```

### 3.2. Filtres de recherche

```typescript
export interface PlacementDemandFilters {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'all'
  benefactorId?: string // Filtrer par bienfaiteur
  payoutMode?: 'MonthlyCommission_CapitalEnd' | 'CapitalPlusCommission_End' | 'all'
  decisionMadeBy?: string // Filtrer par agent qui a pris la décision
  createdAtFrom?: Date // Filtre par date de création (début)
  createdAtTo?: Date // Filtre par date de création (fin)
  desiredDateFrom?: Date // Filtre par date souhaitée (début)
  desiredDateTo?: Date // Filtre par date souhaitée (fin)
  search?: string // Recherche textuelle (nom du bienfaiteur, ID de la demande, etc.)
  page?: number
  limit?: number
}
```

### 3.3. Statistiques

```typescript
export interface PlacementDemandStats {
  total: number // Total de toutes les demandes
  pending: number // Demandes en attente
  approved: number // Demandes acceptées
  rejected: number // Demandes refusées
  converted: number // Demandes converties en placements
  totalAmount: number // Montant total des demandes (toutes statuts confondus)
  pendingAmount: number // Montant total des demandes en attente
}
```

## 4. Cas d'utilisation (Use Cases)

### UC1 – Créer une demande de placement

**Acteur** : Admin

**Objectif** : Permettre à l'admin de créer une nouvelle demande de placement pour un bienfaiteur

**Préconditions** :
- L'admin est authentifié
- Le bienfaiteur existe dans le système (User avec rôle Bienfaiteur)

**Scénario principal** :
1. L'admin accède à la page `/placements/demandes`
2. L'admin clique sur le bouton "Nouvelle demande"
3. L'admin remplit le formulaire :
   - Recherche et sélection du bienfaiteur (obligatoire)
   - Montant du placement souhaité (FCFA, minimum 1000)
   - Taux de commission souhaité (0-100%)
   - Durée souhaitée (1-7 mois)
   - Mode de paiement (Commission mensuelle + Capital en fin / Capital + Commission en fin)
   - Date souhaitée pour le début du placement (obligatoire)
   - Contact d'urgence (optionnel, peut être un membre ou un nouveau contact)
   - Raison de la demande (optionnel)
4. L'admin valide le formulaire
5. Le système crée la demande avec le statut `PENDING`
6. Le système génère un ID unique au format `MK_DEMANDE_PL_{matriculeBienfaiteur}_{date}_{heure}`
7. Le système enregistre `createdBy` avec l'ID de l'admin
8. Le système préremplit `benefactorName` et `benefactorPhone` depuis les informations du bienfaiteur
9. La demande apparaît dans la liste avec le statut "En attente"

**Scénarios alternatifs** :
- Si le formulaire est invalide, afficher les erreurs de validation
- Si le bienfaiteur n'existe pas, afficher une erreur
- Si le montant est inférieur au minimum, afficher une erreur
- Si la durée est hors limites (1-7 mois), afficher une erreur

**Postconditions** :
- Une nouvelle demande est créée avec le statut `PENDING`
- La demande est visible dans la liste des demandes
- Une notification est envoyée à tous les admins

---

### UC2 – Accepter une demande

**Acteur** : Admin

**Objectif** : Permettre à l'admin d'accepter une demande en attente

**Préconditions** :
- La demande existe et a le statut `PENDING`
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande (`/placements/demandes/[id]`)
2. L'admin clique sur le bouton "Accepter la demande"
3. Le système affiche un modal de confirmation avec :
   - Un champ obligatoire "Raison d'acceptation" (textarea, 10-500 caractères)
   - Un bouton "Confirmer" et "Annuler"
4. L'admin saisit la raison d'acceptation (ex: "Bienfaiteur fiable, montant raisonnable")
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
9. Une notification est envoyée au bienfaiteur (si connecté) et à l'admin créateur (si différent)

**Scénarios alternatifs** :
- Si la raison n'est pas saisie, afficher une erreur de validation
- Si la demande a déjà été acceptée/refusée, afficher un message d'erreur

**Postconditions** :
- La demande passe au statut `APPROVED`
- Les informations de décision sont enregistrées
- La demande peut maintenant être convertie en placement

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
   - Un champ obligatoire "Raison du refus" (textarea, 10-500 caractères)
   - Un bouton "Confirmer" et "Annuler"
4. L'admin saisit la raison du refus (ex: "Montant trop élevé, bienfaiteur non fiable")
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
9. Une notification est envoyée au bienfaiteur (si connecté) et à l'admin créateur (si différent)

**Scénarios alternatifs** :
- Si la raison n'est pas saisie, afficher une erreur de validation
- Si la demande a déjà été acceptée/refusée, afficher un message d'erreur

**Postconditions** :
- La demande passe au statut `REJECTED`
- Les informations de décision sont enregistrées
- La demande peut être réouverte ultérieurement

---

### UC4 – Réouvrir une demande refusée

**Acteur** : Admin

**Objectif** : Permettre à l'admin de réouvrir une demande refusée

**Préconditions** :
- La demande existe et a le statut `REJECTED`
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande refusée
2. L'admin clique sur le bouton "Réouvrir la demande"
3. Le système affiche un modal avec :
   - Un champ obligatoire "Motif de réouverture" (textarea, 10-500 caractères)
   - Un bouton "Confirmer" et "Annuler"
4. L'admin saisit le motif de réouverture (ex: "Nouvelles informations reçues, demande justifiée")
5. L'admin clique sur "Confirmer"
6. Le système met à jour la demande :
   - `status` → `PENDING`
   - `reopenedAt` → Date/heure actuelle
   - `reopenedBy` → ID de l'admin
   - `reopenedByName` → Prénom + Nom de l'admin
   - `reopenReason` → Motif saisie
   - `updatedBy` → ID de l'admin
7. Le système affiche un message de succès
8. La demande apparaît maintenant avec le statut "En attente" et les informations de réouverture sont visibles
9. Une notification est envoyée au bienfaiteur (si connecté) et à tous les admins

**Postconditions** :
- La demande passe au statut `PENDING`
- Les informations de réouverture sont enregistrées
- La demande peut maintenant être acceptée ou refusée à nouveau

---

### UC5 – Convertir une demande acceptée en placement

**Acteur** : Admin

**Objectif** : Permettre à l'admin de créer un placement à partir d'une demande acceptée

**Préconditions** :
- La demande existe et a le statut `APPROVED`
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande acceptée
2. L'admin clique sur le bouton "Créer le placement"
3. Le système redirige vers le formulaire de création de placement prérempli avec les informations de la demande :
   - Bienfaiteur sélectionné
   - Montant
   - Taux de commission
   - Durée (periodMonths)
   - Mode de paiement (payoutMode)
   - Date de début du placement (préremplie avec la date souhaitée de la demande)
   - Contact d'urgence (si renseigné)
4. L'admin peut modifier les informations si nécessaire
5. L'admin valide la création du placement
6. Le système crée le placement avec le statut `Draft`
7. Le système met à jour la demande :
   - `status` → `CONVERTED`
   - `placementId` → ID du placement créé
   - `updatedBy` → ID de l'admin
8. Le système redirige vers la page de détails du placement créé
9. Une notification est envoyée au bienfaiteur (si connecté) et à tous les admins

**Scénarios alternatifs** :
- Si la demande n'est pas acceptée, le bouton "Créer le placement" n'est pas visible
- Si un placement existe déjà pour cette demande, afficher un message d'erreur

**Postconditions** :
- Un placement est créé à partir de la demande
- La demande passe au statut `CONVERTED`
- Un lien vers le placement est disponible dans la demande

---

### UC6 – Consulter la liste des demandes avec filtres

**Acteur** : Admin

**Objectif** : Permettre à l'admin de consulter et filtrer les demandes

**Préconditions** :
- L'admin est authentifié
- Des demandes existent dans le système

**Scénario principal** :
1. L'admin accède à la page `/placements/demandes`
2. Le système affiche :
   - **Onglets de statut** : "Toutes", "En attente", "Acceptées", "Refusées", "Converties"
   - **Cartes de statistiques** : Total, En attente, Acceptées, Refusées, Converties, Montant total
   - **Section de filtres** :
     - Recherche textuelle (nom du bienfaiteur, ID de la demande)
     - Filtre par bienfaiteur
     - Filtre par mode de paiement
     - Filtre par agent décisionnaire
     - Filtre par date de création (de/début à fin)
     - Filtre par date souhaitée (de/début à fin)
   - **Liste des demandes** (grille ou tableau) avec pagination
3. L'admin sélectionne un onglet (ex: "Acceptées")
4. Le système filtre automatiquement les demandes selon l'onglet sélectionné
5. Les statistiques affichent toujours les totaux globaux (non filtrés)
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

### UC7 – Consulter les détails d'une demande

**Acteur** : Admin

**Objectif** : Permettre à l'admin de consulter toutes les informations d'une demande

**Préconditions** :
- La demande existe
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande (`/placements/demandes/[id]`)
2. Le système affiche :
   - **Informations générales** :
     - ID de la demande
     - Statut (avec badge coloré)
     - Date de création
     - Créateur de la demande
   - **Informations du bienfaiteur** :
     - Nom complet
     - Téléphone
     - Matricule
   - **Informations de la demande** :
     - Montant souhaité
     - Taux de commission
     - Durée souhaitée
     - Mode de paiement
     - Date souhaitée pour le début du placement
     - Contact d'urgence (si renseigné)
     - Raison de la demande (si renseignée)
   - **Informations de décision** (si la demande a été acceptée/refusée) :
     - Date de la décision
     - Agent décisionnaire (nom complet)
     - Raison de la décision
   - **Informations de réouverture** (si la demande a été réouverte) :
     - Date de réouverture
     - Agent qui a réouvert (nom complet)
     - Motif de réouverture
   - **Lien vers le placement** (si la demande a été convertie) :
     - ID du placement
     - Bouton pour accéder au placement
   - **Actions disponibles** :
     - Si `PENDING` : Boutons "Accepter" et "Refuser"
     - Si `APPROVED` : Bouton "Créer le placement"
     - Si `REJECTED` : Bouton "Réouvrir"
     - Si `CONVERTED` : Aucune action (lecture seule)

**Postconditions** :
- L'admin a accès à toutes les informations de la demande
- Les actions appropriées sont disponibles selon le statut

---

### UC8 – Exporter les demandes

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
   - Les informations de réouverture (si applicable)
4. Le fichier est téléchargé automatiquement

**Postconditions** :
- Un fichier Excel ou PDF est généré et téléchargé

## 5. Organisation de la vue

### 5.1. Structure de la page de liste

```
┌─────────────────────────────────────────────────────────┐
│  Titre: "Demandes de Placement"                          │
│  Sous-titre: "Gestion des demandes de placements"         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Onglets: [Toutes] [En attente] [Acceptées] [Refusées] │
│                          [Converties]                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Statistiques (carrousel)                               │
│  [TOTAL] [EN ATTENTE] [ACCEPTÉES] [REFUSÉES] [CONVERTIES]│
│  [MONTANT TOTAL]                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Filtres                                                 │
│  [Recherche] [Bienfaiteur] [Mode paiement] [Agent]     │
│  [Date début] [Date fin] [Réinitialiser]                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Actions: [Vue grille/Liste] [Actualiser] [Exporter]     │
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

Le design doit être **aligné avec le design existant** du module Placement et Caisse Spéciale :

- **Couleurs** : Utiliser la palette de couleurs existante (`#234D65`, `#2c5a73`)
- **Composants** : Réutiliser les composants UI existants (Cards, Badges, Tables, Buttons, etc.)
- **Layout** : Même structure que `/caisse-speciale/demandes` et `/credit-speciale/demandes`
- **Onglets** : Même style que les onglets des autres modules
- **Statistiques** : Même carrousel que dans les autres modules
- **Filtres** : Même section de filtres avec le même style

### 5.3. Carte de demande (vue grille)

Chaque carte affiche :
- **En-tête** :
  - ID de la demande (format court)
  - Badge de statut (coloré)
  - Badge du mode de paiement
- **Corps** :
  - Nom du bienfaiteur
  - Montant souhaité
  - Taux de commission
  - Durée souhaitée
  - Date souhaitée pour le début du placement
  - Date de création
- **Pied** :
  - Si acceptée/refusée : Nom de l'agent décisionnaire et date
  - Si convertie : Lien vers le placement
  - Actions : Boutons selon le statut

### 5.4. Tableau de demandes (vue liste)

Colonnes :
- ID
- Bienfaiteur
- Montant
- Taux
- Durée
- Mode de paiement
- Date souhaitée
- Statut
- Agent décisionnaire (si applicable)
- Date de création
- Actions

## 6. Statistiques

### 6.1. Calcul des statistiques

Les statistiques doivent être calculées **globalement** (sans filtre de statut) pour afficher les totaux réels, indépendamment de l'onglet sélectionné.

**Exemple** :
- Onglet "Toutes" : Statistiques globales (toutes les demandes)
- Onglet "En attente" : Statistiques globales (toutes les demandes, pas seulement celles en attente)
- Onglet "Acceptées" : Statistiques globales (toutes les demandes, pas seulement celles acceptées)

### 6.2. Cartes de statistiques

Chaque carte affiche :
- **Icône** représentative
- **Label** (TOTAL, EN ATTENTE, ACCEPTÉES, etc.)
- **Valeur** (nombre de demandes ou montant)
- **Couleur** distinctive selon le type

## 7. Règles métier

### 7.1. Génération de l'ID

Format : `MK_DEMANDE_PL_{matriculeBienfaiteur}_{date}_{heure}`

- `matriculeBienfaiteur` : 4 premiers chiffres du matricule du bienfaiteur (padding avec zéros)
- `date` : Format `DDMMYY` (jour, mois, année sur 2 chiffres)
- `heure` : Format `HHMM` (heures, minutes)

Exemple : `MK_DEMANDE_PL_0001_040126_1415`

### 7.2. Traçabilité

- **Création** : `createdBy` = ID de l'admin créateur
- **Décision** : `decisionMadeBy` = ID de l'admin qui a accepté/refusé
- **Décision** : `decisionMadeByName` = Prénom + Nom de l'admin (récupéré depuis la table `admins`)
- **Réouverture** : `reopenedBy` = ID de l'admin qui a réouvert
- **Réouverture** : `reopenedByName` = Prénom + Nom de l'admin
- **Modification** : `updatedBy` = ID de l'admin qui a modifié

### 7.3. Validation

- Une demande `REJECTED` peut être réouverte
- Une demande `CONVERTED` ne peut plus être modifiée
- Une demande `APPROVED` peut être convertie en placement
- Une demande `PENDING` peut être acceptée ou refusée
- Le montant doit être >= 1000 FCFA
- La durée doit être entre 1 et 7 mois
- Le taux de commission doit être entre 0 et 100%

### 7.4. Conversion en placement

- Lors de la conversion, le système préremplit le formulaire de création de placement avec les informations de la demande
- La date souhaitée (`desiredDate`) est utilisée comme date de début du placement (`startDate`)
- L'admin peut modifier les informations (y compris la date de début) avant de créer le placement
- Une fois le placement créé, la demande passe au statut `CONVERTED` et un lien vers le placement est créé
- Le placement est créé avec le statut `Draft` (brouillon)

### 7.5. Date souhaitée

- La date souhaitée (`desiredDate`) indique quand le demandeur souhaite que le placement commence
- Cette date peut être dans le futur (ex: demande créée le 4 janvier, date souhaitée le 10 janvier)
- Cette date peut également être dans le passé (pour des cas particuliers)
- Lors de la conversion en placement, cette date devient la date de début du placement (`startDate`)
- Si l'admin modifie la date lors de la création du placement, la date modifiée est utilisée

### 7.6. Contact d'urgence

- Le contact d'urgence est optionnel
- Il peut être :
  - Un membre existant (recherche par nom, prénom ou matricule)
  - Un nouveau contact (saisie manuelle)
- Si un membre est sélectionné, les informations sont préremplies depuis son dossier (`membership-request`)
- Les informations du contact d'urgence sont conservées dans la demande et transférées au placement lors de la conversion

## 8. Architecture technique

### 8.1. Structure des fichiers

```
src/
├── components/
│   └── placement/
│       ├── ListDemandes.tsx (nouveau)
│       ├── DemandDetail.tsx (nouveau)
│       ├── CreateDemandModal.tsx (nouveau)
│       ├── AcceptDemandModal.tsx (nouveau)
│       ├── RejectDemandModal.tsx (nouveau)
│       ├── ReopenDemandModal.tsx (nouveau)
│       └── StatisticsPlacementDemandes.tsx (nouveau)
├── repositories/
│   └── placement/
│       ├── IPlacementDemandRepository.ts (nouveau)
│       └── PlacementDemandRepository.ts (nouveau)
├── services/
│   └── placement/
│       ├── IPlacementService.ts (étendu)
│       └── PlacementService.ts (étendu)
├── hooks/
│   └── placement/
│       └── usePlacementDemands.ts (nouveau)
├── schemas/
│   └── placement.schema.ts (étendu)
├── types/
│   └── types.ts (ajout de PlacementDemand)
└── app/
    └── (admin)/
        └── placements/
            ├── demandes/
            │   ├── page.tsx (nouveau)
            │   └── [id]/
            │       └── page.tsx (nouveau)
            └── [id]/ (existant)
```

### 8.2. Repository

**Interface** : `IPlacementDemandRepository`

Méthodes :
- `createDemand(data, customId?)` : Créer une demande
- `getDemandById(id)` : Récupérer une demande par ID
- `getDemandsWithFilters(filters?)` : Récupérer les demandes avec filtres
- `getDemandsStats(filters?)` : Récupérer les statistiques
- `updateDemandStatus(id, status, adminId, reason, adminName)` : Mettre à jour le statut
- `updateDemand(id, data)` : Mettre à jour une demande

### 8.3. Service

**Interface** : `IPlacementService` (étendu)

Nouvelles méthodes :
- `createDemand(data, adminId)` : Créer une demande
- `getDemandById(id)` : Récupérer une demande
- `getDemandsWithFilters(filters?)` : Récupérer les demandes filtrées
- `getDemandsStats(filters?)` : Récupérer les statistiques
- `approveDemand(demandId, adminId, reason)` : Accepter une demande
- `rejectDemand(demandId, adminId, reason)` : Refuser une demande
- `reopenDemand(demandId, adminId, reason)` : Réouvrir une demande refusée
- `convertDemandToPlacement(demandId, adminId, placementData?)` : Convertir en placement

### 8.4. Hooks React Query

**Fichier** : `src/hooks/placement/usePlacementDemands.ts`

Hooks :
- `usePlacementDemands(filters?)` : Liste des demandes
- `usePlacementDemand(id)` : Détails d'une demande
- `usePlacementDemandsStats(filters?)` : Statistiques
- `usePlacementDemandMutations()` : Mutations (create, approve, reject, reopen, convert)

## 9. Navigation sidebar

### 9.1. Modification du menu

Dans `src/components/layout/AppSidebar.tsx`, modifier l'entrée "Placements" sous "Bienfaiteur" :

```typescript
{
  title: "Placements",
  icon: FileText,
  children: [
    {
      title: "Demandes",
      url: routes.admin.placementDemandes,
      icon: FileText,
    },
    {
      title: "Placements",
      url: routes.admin.placements,
      icon: CreditCard,
    },
  ],
}
```

### 9.2. Routes

Dans `src/constantes/routes.ts`, ajouter :

```typescript
placementDemandes: '/placements/demandes',
placementDemandDetails: (id: string) => `/placements/demandes/${id}`,
```

## 10. Alignement avec le design existant

### 10.1. Réutilisation des composants

- **ListDemandes.tsx** : S'inspirer de `src/components/caisse-speciale/ListDemandes.tsx`
- **StatisticsPlacementDemandes.tsx** : S'inspirer de `src/components/caisse-speciale/StatisticsCaisseSpecialeDemandes.tsx`
- **DemandDetail.tsx** : S'inspirer de `src/components/caisse-speciale/DemandDetail.tsx`
- **CreateDemandModal.tsx** : S'inspirer de `src/components/caisse-speciale/CreateDemandModal.tsx`
- **ReopenDemandModal.tsx** : S'inspirer de `src/components/caisse-speciale/ReopenDemandModal.tsx`

### 10.2. Styles et couleurs

- Utiliser les mêmes classes CSS que le module Caisse Spéciale
- Palette de couleurs : `#234D65`, `#2c5a73`, etc.
- Badges de statut : Mêmes couleurs que Caisse Spéciale
- Cartes : Même style de cartes avec ombres et bordures

### 10.3. Responsive

- Design responsive identique au module Caisse Spéciale
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
  module: 'placement',
  entityId: demandId,
  type: 'demand_created',
  title: 'Nouvelle demande de placement',
  message: `Une nouvelle demande a été créée par ${adminName} pour ${benefactorName}`,
  metadata: {
    demandId: string,
    benefactorId: string,
    amount: number,
    rate: number,
    periodMonths: number,
    payoutMode: string,
    desiredDate: string,
    createdBy: string,
  }
}
```

#### 11.1.2. Notification d'acceptation de demande

**Déclencheur** : Lors de l'acceptation d'une demande (`approveDemand`)

**Destinataires** :
- Le bienfaiteur demandeur (si connecté)
- L'admin qui a créé la demande (si différent de celui qui accepte)

**Structure** :
```typescript
{
  module: 'placement',
  entityId: demandId,
  type: 'demand_approved',
  title: 'Demande acceptée',
  message: `Votre demande de placement a été acceptée. Raison : ${reason}`,
  metadata: {
    demandId: string,
    decisionMadeBy: string,
    decisionMadeByName: string,
    decisionReason: string,
    decisionMadeAt: Date,
    benefactorId: string,
  }
}
```

#### 11.1.3. Notification de refus de demande

**Déclencheur** : Lors du refus d'une demande (`rejectDemand`)

**Destinataires** :
- Le bienfaiteur demandeur (si connecté)
- L'admin qui a créé la demande (si différent de celui qui refuse)

**Structure** :
```typescript
{
  module: 'placement',
  entityId: demandId,
  type: 'demand_rejected',
  title: 'Demande refusée',
  message: `Votre demande de placement a été refusée. Raison : ${reason}`,
  metadata: {
    demandId: string,
    decisionMadeBy: string,
    decisionMadeByName: string,
    decisionReason: string,
    decisionMadeAt: Date,
    benefactorId: string,
  }
}
```

#### 11.1.4. Notification de réouverture de demande

**Déclencheur** : Lors de la réouverture d'une demande (`reopenDemand`)

**Destinataires** :
- Le bienfaiteur demandeur (si connecté)
- Tous les admins (notification globale)

**Structure** :
```typescript
{
  module: 'placement',
  entityId: demandId,
  type: 'demand_reopened',
  title: 'Demande réouverte',
  message: `Votre demande de placement a été réouverte. Motif : ${reason}`,
  metadata: {
    demandId: string,
    reopenedBy: string,
    reopenedByName: string,
    reopenReason: string,
    reopenedAt: Date,
    benefactorId: string,
  }
}
```

#### 11.1.5. Notification de conversion en placement

**Déclencheur** : Lors de la conversion d'une demande en placement (`convertDemandToPlacement`)

**Destinataires** :
- Le bienfaiteur demandeur (si connecté)
- Tous les admins (notification globale)

**Structure** :
```typescript
{
  module: 'placement',
  entityId: placementId,
  type: 'demand_converted',
  title: 'Placement créé depuis votre demande',
  message: `Votre demande a été convertie en placement. Le placement ${placementId} est maintenant actif.`,
  metadata: {
    demandId: string,
    placementId: string,
    benefactorId: string,
    convertedBy: string,
  }
}
```

### 11.2. Cloud Functions planifiées

#### 11.2.1. Rappel des demandes en attente

**Objectif** : Rappeler aux admins les demandes en attente depuis plusieurs jours

**Fichier** : `functions/src/scheduled/placementDemandReminders.ts`

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
  module: 'placement',
  entityId: demandId,
  type: 'demand_pending_reminder',
  title: `Demande en attente depuis ${daysPending} jour(s)`,
  message: `La demande ${demandId} de ${benefactorName} est en attente depuis ${daysPending} jour(s).`,
  metadata: {
    demandId: string,
    daysPending: number,
    createdAt: Date,
    benefactorId: string,
    reminderLevel: 'normal' | 'warning' | 'urgent', // 3j, 7j, 14j
  }
}
```

#### 11.2.2. Rappel des demandes acceptées non converties

**Objectif** : Rappeler aux admins les demandes acceptées qui n'ont pas encore été converties en placement

**Fichier** : `functions/src/scheduled/placementDemandReminders.ts` (même fichier, fonction supplémentaire)

**Fréquence** : Quotidienne à 10h00 (heure locale Gabon, UTC+1)

**Logique** :
- Récupérer toutes les demandes avec `status: 'APPROVED'` et sans `placementId`
- Calculer le nombre de jours depuis l'acceptation (`decisionMadeAt`)
- Créer une notification pour les admins si :
  - La demande est acceptée depuis **7 jours** sans être convertie (premier rappel)
  - La demande est acceptée depuis **14 jours** sans être convertie (rappel urgent)

**Structure de la notification** :
```typescript
{
  module: 'placement',
  entityId: demandId,
  type: 'demand_approved_not_converted',
  title: `Demande acceptée non convertie depuis ${daysSinceApproval} jour(s)`,
  message: `La demande ${demandId} de ${benefactorName} a été acceptée il y a ${daysSinceApproval} jour(s) mais n'a pas encore été convertie en placement.`,
  metadata: {
    demandId: string,
    daysSinceApproval: number,
    approvedAt: Date,
    benefactorId: string,
    reminderLevel: 'warning' | 'urgent', // 7j, 14j
  }
}
```

### 11.3. Intégration dans les services

Les notifications doivent être créées dans les méthodes suivantes :

**Service** : `src/services/placement/PlacementService.ts`

- `createDemand()` : Créer notification `demand_created`
- `approveDemand()` : Créer notification `demand_approved`
- `rejectDemand()` : Créer notification `demand_rejected`
- `reopenDemand()` : Créer notification `demand_reopened`
- `convertDemandToPlacement()` : Créer notification `demand_converted`

### 11.4. Déploiement des Cloud Functions

**Fichier** : `functions/src/index.ts`

```typescript
import { remindPendingPlacementDemands } from './scheduled/placementDemandReminders'
import { remindApprovedNotConvertedPlacementDemands } from './scheduled/placementDemandReminders'

export { remindPendingPlacementDemands, remindApprovedNotConvertedPlacementDemands }
```

**Commandes de déploiement** :
```bash
# Déployer toutes les fonctions
npm run deploy --only functions

# Déployer une fonction spécifique
npm run deploy --only functions:remindPendingPlacementDemands
npm run deploy --only functions:remindApprovedNotConvertedPlacementDemands
```

### 11.5. Index Firestore nécessaires

Pour optimiser les requêtes des Cloud Functions, créer les index suivants :

```
Collection: placementDemands
- status (Ascending), createdAt (Ascending)
- status (Ascending), decisionMadeAt (Ascending), placementId (Ascending)

Collection: notifications
- module (Ascending), entityId (Ascending), type (Ascending), metadata.daysPending (Ascending)
```

## 12. Implémentation prévue

Voir le fichier [`realisationAfaire.md`](./realisationAfaire.md) pour la liste détaillée des tâches d'implémentation.

## 13. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Analyse Placement** : [`./placement.md`](./placement.md)
- **Réalisation** : [`./realisationAfaire.md`](./realisationAfaire.md)
- **Référence Caisse Spéciale** : [`../caisse-speciale/DEMANDES_CAISSE_SPECIALE.md`](../caisse-speciale/DEMANDES_CAISSE_SPECIALE.md)

