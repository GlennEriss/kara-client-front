# Analyse fonctionnelle – Fonctionnalité "Demandes" – Module Caisse Imprévue

## 1. Contexte et périmètre

### 1.1. Objectif général

Ajouter une fonctionnalité de **gestion des demandes** au module Caisse Imprévue, permettant de suivre le cycle de vie complet d'une demande de contrat avant sa création effective. Cette fonctionnalité permettra de :

- Centraliser toutes les demandes de contrats de caisse imprévue
- Suivre le statut de chaque demande (en attente, acceptée, refusée)
- Traçabilité complète des décisions (qui a accepté/refusé, quand, pourquoi)
- Organiser la vue avec des onglets et des filtres
- Afficher des statistiques adaptées selon les filtres
- Gérer les demandes pour les contrats journaliers (DAILY) et mensuels (MONTHLY)

### 1.2. Structure de navigation

Le module **Caisse Imprévue** dans le sidebar sera réorganisé avec deux sous-onglets :

```
Caisse Imprévue
├── Demandes (nouveau)
└── Contrats (existant)
```

**Routes** :
- `/caisse-imprevue/demandes` - Liste des demandes
- `/caisse-imprevue/demandes/[id]` - Détails d'une demande
- `/caisse-imprevue/contrats` - Liste des contrats (existant)
- `/caisse-imprevue/contrats/[id]` - Détails d'un contrat (existant)

## 2. Analyse du cycle de vie d'une demande

### 2.1. Statuts d'une demande

Une demande de contrat Caisse Imprévue peut avoir les statuts suivants :

- **`PENDING`** : Demande en attente de traitement
- **`APPROVED`** : Demande acceptée (peut être convertie en contrat)
- **`REJECTED`** : Demande refusée
- **`CONVERTED`** : Demande convertie en contrat (statut final)
- **`REOPENED`** : Demande refusée puis réouverte (retour à `PENDING`)

### 2.2. Cycle de vie

```
PENDING → APPROVED → CONVERTED
    ↓
REJECTED → REOPENED → PENDING
```

**Transitions possibles** :
- `PENDING` → `APPROVED` : Par un admin (avec raison d'acceptation)
- `PENDING` → `REJECTED` : Par un admin (avec raison de refus)
- `APPROVED` → `CONVERTED` : Automatique lors de la création du contrat depuis la demande
- `REJECTED` → `REOPENED` → `PENDING` : Réouverture possible avec motif de réouverture

## 3. Structure des données

### 3.1. Interface `CaisseImprevueDemand`

```typescript
export interface CaisseImprevueDemand {
  id: string // Format: MK_DEMANDE_CI_{matricule}_{date}_{heure}
  
  // Informations du demandeur
  memberId: string // ID du membre (obligatoire)
  memberFirstName?: string // Prénom du membre (prérempli)
  memberLastName?: string // Nom du membre (prérempli)
  memberContacts?: string[] // Contacts du membre (prérempli)
  memberEmail?: string // Email du membre (prérempli)
  
  // Informations du forfait souhaité (Step 2)
  subscriptionCIID: string // ID du forfait Caisse Imprévue
  subscriptionCICode: string // Code du forfait (ex: "CI_DAILY_1000")
  subscriptionCILabel?: string // Libellé du forfait (prérempli)
  subscriptionCIAmountPerMonth: number // Montant mensuel du forfait
  subscriptionCINominal: number // Montant nominal du forfait
  subscriptionCIDuration: number // Durée du forfait (en mois)
  subscriptionCISupportMin?: number // Montant minimum de support
  subscriptionCISupportMax?: number // Montant maximum de support
  
  // Fréquence de paiement souhaitée
  paymentFrequency: 'DAILY' | 'MONTHLY' // Fréquence de paiement souhaitée
  
  // Date souhaitée pour le début du contrat
  desiredDate: string // Date souhaitée pour le début du contrat (format: YYYY-MM-DD)
  firstPaymentDate?: string // Date du premier paiement (calculée ou définie)
  
  // Contact d'urgence (Step 3)
  emergencyContact?: {
    name: string
    firstName?: string
    phone: string
    phone2?: string
    relationship?: string
    idNumber?: string
    typeId?: string
    documentPhotoUrl?: string
    memberId?: string // Si le contact est un membre de la mutuelle
  }
  
  // Raison de la demande (optionnel)
  cause?: string // Raison de la demande (optionnel)
  
  // Statut et décision
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'REOPENED'
  
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
export interface CaisseImprevueDemandFilters {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'REOPENED' | 'all'
  paymentFrequency?: 'DAILY' | 'MONTHLY' | 'all' // Filtrer par fréquence de paiement
  subscriptionCIID?: string // Filtrer par forfait
  memberId?: string // Filtrer par membre
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
export interface CaisseImprevueDemandStats {
  total: number // Total de toutes les demandes
  pending: number // Demandes en attente
  approved: number // Demandes acceptées
  rejected: number // Demandes refusées
  converted: number // Demandes converties en contrats
  reopened: number // Demandes réouvertes
  daily: number // Demandes avec fréquence DAILY
  monthly: number // Demandes avec fréquence MONTHLY
  totalAmount: number // Montant total des forfaits demandés (toutes statuts confondus)
  pendingAmount: number // Montant total des forfaits en attente
}
```

## 4. Cas d'utilisation (Use Cases)

### UC1 – Créer une demande de contrat Caisse Imprévue

**Acteur** : Admin

**Objectif** : Permettre à l'admin de créer une nouvelle demande de contrat pour un membre

**Préconditions** :
- L'admin est authentifié
- Le membre existe dans le système
- Les forfaits Caisse Imprévue sont configurés

**Scénario principal** :
1. L'admin accède à la page `/caisse-imprevue/demandes`
2. L'admin clique sur le bouton "Nouvelle demande"
3. L'admin remplit le formulaire en 3 étapes :
   - **Étape 1 - Informations du membre** :
     - Recherche et sélection du membre (obligatoire)
     - Les informations du membre sont préremplies automatiquement
   - **Étape 2 - Informations du forfait** :
     - Sélection du forfait Caisse Imprévue (obligatoire)
     - Sélection de la fréquence de paiement : DAILY ou MONTHLY (obligatoire)
     - Date souhaitée pour le début du contrat (obligatoire)
     - Date du premier paiement (optionnel, calculée par défaut)
     - Raison de la demande (optionnel)
   - **Étape 3 - Contact d'urgence** :
     - Sélection d'un membre de la mutuelle comme contact d'urgence (optionnel)
     - OU saisie manuelle des informations du contact d'urgence
     - Si membre sélectionné, les informations sont préremplies depuis son dossier
4. L'admin valide le formulaire
5. La demande est créée avec le statut `PENDING`
6. Une notification est envoyée à tous les admins
7. L'admin est redirigé vers la liste des demandes

**Scénarios alternatifs** :
- Si le membre n'existe pas, afficher une erreur
- Si le forfait n'existe pas, afficher une erreur
- Si la date souhaitée est dans le passé, afficher un avertissement

**Postconditions** :
- Une nouvelle demande est créée avec le statut `PENDING`
- Les admins reçoivent une notification de nouvelle demande
- La demande apparaît dans la liste avec le statut "En attente"

---

### UC2 – Accepter une demande

**Acteur** : Admin

**Objectif** : Permettre à l'admin d'accepter une demande de contrat

**Préconditions** :
- L'admin est authentifié
- La demande existe et a le statut `PENDING`

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande en attente
2. L'admin clique sur le bouton "Accepter"
3. Un modal s'ouvre demandant :
   - La raison de l'acceptation (obligatoire, texte libre)
4. L'admin saisit la raison et valide
5. La demande passe au statut `APPROVED`
6. Les informations suivantes sont enregistrées :
   - `decisionMadeAt` : Date actuelle
   - `decisionMadeBy` : ID de l'admin
   - `decisionMadeByName` : Nom complet de l'admin
   - `decisionReason` : Raison saisie
7. Une notification est envoyée :
   - Au membre concerné (si possible)
   - À tous les admins
8. Le modal se ferme et la page se met à jour

**Scénarios alternatifs** :
- Si la demande n'est plus en attente, afficher une erreur
- Si la raison n'est pas saisie, empêcher la validation

**Postconditions** :
- La demande passe au statut `APPROVED`
- Les informations de décision sont enregistrées
- Les notifications sont envoyées
- Le bouton "Créer le contrat" devient disponible

---

### UC3 – Refuser une demande

**Acteur** : Admin

**Objectif** : Permettre à l'admin de refuser une demande de contrat

**Préconditions** :
- L'admin est authentifié
- La demande existe et a le statut `PENDING`

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande en attente
2. L'admin clique sur le bouton "Refuser"
3. Un modal s'ouvre demandant :
   - La raison du refus (obligatoire, texte libre)
4. L'admin saisit la raison et valide
5. La demande passe au statut `REJECTED`
6. Les informations suivantes sont enregistrées :
   - `decisionMadeAt` : Date actuelle
   - `decisionMadeBy` : ID de l'admin
   - `decisionMadeByName` : Nom complet de l'admin
   - `decisionReason` : Raison saisie
7. Une notification est envoyée :
   - Au membre concerné (si possible)
   - À tous les admins
8. Le modal se ferme et la page se met à jour

**Scénarios alternatifs** :
- Si la demande n'est plus en attente, afficher une erreur
- Si la raison n'est pas saisie, empêcher la validation

**Postconditions** :
- La demande passe au statut `REJECTED`
- Les informations de décision sont enregistrées
- Les notifications sont envoyées
- Le bouton "Réouvrir" devient disponible

---

### UC4 – Réouvrir une demande refusée

**Acteur** : Admin

**Objectif** : Permettre à l'admin de réouvrir une demande refusée

**Préconditions** :
- L'admin est authentifié
- La demande existe et a le statut `REJECTED`

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande refusée
2. L'admin clique sur le bouton "Réouvrir"
3. Un modal s'ouvre demandant :
   - Le motif de la réouverture (obligatoire, texte libre)
4. L'admin saisit le motif et valide
5. La demande passe au statut `REOPENED` puis `PENDING`
6. Les informations suivantes sont enregistrées :
   - `reopenedAt` : Date actuelle
   - `reopenedBy` : ID de l'admin
   - `reopenedByName` : Nom complet de l'admin
   - `reopenReason` : Motif saisie
   - `status` : `PENDING`
7. Les anciennes informations de décision sont conservées (pour traçabilité)
8. Une notification est envoyée :
   - Au membre concerné (si possible)
   - À tous les admins
9. Le modal se ferme et la page se met à jour

**Scénarios alternatifs** :
- Si la demande n'est pas refusée, afficher une erreur
- Si le motif n'est pas saisi, empêcher la validation

**Postconditions** :
- La demande passe au statut `PENDING`
- Les informations de réouverture sont enregistrées
- Les notifications sont envoyées
- La demande peut à nouveau être acceptée ou refusée

---

### UC5 – Convertir une demande acceptée en contrat

**Acteur** : Admin

**Objectif** : Permettre à l'admin de créer un contrat à partir d'une demande acceptée

**Préconditions** :
- L'admin est authentifié
- La demande existe et a le statut `APPROVED`
- La demande n'a pas encore été convertie (`contractId` est vide)

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande acceptée
2. L'admin clique sur le bouton "Créer le contrat"
3. Le système crée automatiquement un contrat `ContractCI` avec :
   - Les informations du membre de la demande
   - Le forfait sélectionné dans la demande
   - La fréquence de paiement sélectionnée
   - La date souhaitée comme `firstPaymentDate`
   - Le contact d'urgence de la demande
   - Le statut `ACTIVE`
4. La demande est mise à jour :
   - `status` : `CONVERTED`
   - `contractId` : ID du contrat créé
5. Une notification est envoyée :
   - Au membre concerné (si possible)
   - À tous les admins
6. L'admin est redirigé vers la page de détails du contrat créé

**Scénarios alternatifs** :
- Si la demande n'est pas acceptée, afficher une erreur
- Si la demande a déjà été convertie, afficher une erreur
- Si la création du contrat échoue, afficher une erreur et ne pas modifier la demande

**Postconditions** :
- Un nouveau contrat `ContractCI` est créé avec le statut `ACTIVE`
- La demande passe au statut `CONVERTED`
- Le lien entre la demande et le contrat est établi
- Les notifications sont envoyées
- L'admin est redirigé vers le contrat créé

---

### UC6 – Lister les demandes

**Acteur** : Admin

**Objectif** : Permettre à l'admin de visualiser toutes les demandes avec filtres et recherche

**Préconditions** :
- L'admin est authentifié

**Scénario principal** :
1. L'admin accède à la page `/caisse-imprevue/demandes`
2. La page affiche :
   - Des statistiques globales (carousel)
   - Des onglets pour filtrer par statut : Toutes, En attente, Acceptées, Refusées, Converties, Réouvertes
   - Une barre de recherche
   - Des filtres avancés (date, fréquence de paiement, forfait)
   - Une liste paginée des demandes (vue grille ou liste)
3. L'admin peut :
   - Cliquer sur un onglet pour filtrer par statut
   - Utiliser la barre de recherche pour chercher par nom, ID, etc.
   - Utiliser les filtres avancés
   - Changer de page
   - Changer de vue (grille/liste)
   - Exporter les résultats (Excel/PDF)
4. Chaque carte de demande affiche :
   - L'ID de la demande (tronqué)
   - Le statut (badge coloré)
   - Le nom du membre
   - Le forfait sélectionné
   - La fréquence de paiement (DAILY/MONTHLY)
   - La date souhaitée
   - L'agent qui a pris la décision (si applicable)
   - Des boutons d'action selon le statut

**Scénarios alternatifs** :
- Si aucune demande ne correspond aux filtres, afficher un message approprié
- Si la recherche ne retourne aucun résultat, afficher un message

**Postconditions** :
- Les demandes sont affichées selon les filtres sélectionnés
- Les statistiques sont mises à jour selon les filtres

---

### UC7 – Voir les détails d'une demande

**Acteur** : Admin

**Objectif** : Permettre à l'admin de visualiser tous les détails d'une demande

**Préconditions** :
- L'admin est authentifié
- La demande existe

**Scénario principal** :
1. L'admin accède à la page de détails d'une demande (`/caisse-imprevue/demandes/[id]`)
2. La page affiche :
   - **En-tête** :
     - ID de la demande
     - Statut (badge)
     - Date de création
     - Date de dernière mise à jour
   - **Informations du membre** :
     - Nom complet
     - Contacts
     - Email
     - Photo (si disponible)
   - **Informations du forfait** :
     - Code et libellé du forfait
     - Montant mensuel
     - Montant nominal
     - Durée
     - Fréquence de paiement
     - Date souhaitée
     - Date du premier paiement
   - **Contact d'urgence** :
     - Nom complet
     - Téléphones
     - Relation
     - Pièce d'identité (si disponible)
   - **Raison de la demande** (si renseignée)
   - **Historique des décisions** :
     - Date et agent de la décision
     - Raison de la décision
     - Date et agent de réouverture (si applicable)
     - Motif de réouverture (si applicable)
   - **Actions disponibles** :
     - Accepter (si `PENDING`)
     - Refuser (si `PENDING`)
     - Réouvrir (si `REJECTED`)
     - Créer le contrat (si `APPROVED` et non convertie)
     - Voir le contrat (si `CONVERTED`)
3. L'admin peut effectuer les actions disponibles selon le statut

**Scénarios alternatifs** :
- Si la demande n'existe pas, afficher une erreur 404
- Si l'admin n'a pas les permissions, afficher une erreur

**Postconditions** :
- Tous les détails de la demande sont affichés
- Les actions disponibles sont proposées selon le statut

---

### UC8 – Exporter les demandes

**Acteur** : Admin

**Objectif** : Permettre à l'admin d'exporter la liste des demandes filtrées

**Préconditions** :
- L'admin est authentifié
- Des demandes existent (éventuellement filtrées)

**Scénario principal** :
1. L'admin accède à la page `/caisse-imprevue/demandes`
2. L'admin applique éventuellement des filtres
3. L'admin clique sur le bouton "Exporter"
4. Un menu déroulant propose :
   - Exporter en Excel
   - Exporter en PDF
5. L'admin sélectionne un format
6. Le fichier est généré avec :
   - Toutes les demandes correspondant aux filtres
   - Les colonnes : ID, Statut, Membre, Forfait, Fréquence, Date souhaitée, Date de création, Agent décision, Raison
7. Le fichier est téléchargé

**Scénarios alternatifs** :
- Si aucune demande ne correspond aux filtres, afficher un message
- Si la génération échoue, afficher une erreur

**Postconditions** :
- Un fichier Excel ou PDF est téléchargé avec les demandes filtrées

---

## 5. Organisation de la vue

### 5.1. Page de liste (`/caisse-imprevue/demandes`)

**Structure** :
```
┌─────────────────────────────────────────────────────────┐
│ Statistiques (carousel)                                  │
├─────────────────────────────────────────────────────────┤
│ Onglets: Toutes | En attente | Acceptées | Refusées |   │
│          Converties | Réouvertes                         │
├─────────────────────────────────────────────────────────┤
│ Barre d'actions: [Recherche] [Filtres] [Vue] [Exporter] │
│                    [Nouvelle demande]                    │
├─────────────────────────────────────────────────────────┤
│ Liste des demandes (grille ou liste)                     │
│ ┌──────┐ ┌──────┐ ┌──────┐                              │
│ │Carte │ │Carte │ │Carte │                              │
│ └──────┘ └──────┘ └──────┘                              │
├─────────────────────────────────────────────────────────┤
│ Pagination                                                │
└─────────────────────────────────────────────────────────┘
```

**Cartes de demande** :
- ID tronqué (avec tooltip pour l'ID complet)
- Badge de statut (coloré)
- Nom du membre
- Forfait (code et libellé)
- Fréquence de paiement (DAILY/MONTHLY)
- Date souhaitée
- Agent décision (si applicable)
- Boutons d'action selon le statut :
  - `PENDING` : Accepter, Refuser, Voir détails
  - `APPROVED` : Créer le contrat, Voir détails
  - `REJECTED` : Réouvrir, Voir détails
  - `CONVERTED` : Badge "Contrat créé", Voir détails, Voir le contrat
  - `REOPENED` : Accepter, Refuser, Voir détails

### 5.2. Page de détails (`/caisse-imprevue/demandes/[id]`)

**Structure** :
```
┌─────────────────────────────────────────────────────────┐
│ En-tête: ID | Statut | Dates                            │
├─────────────────────────────────────────────────────────┤
│ Informations du membre                                   │
├─────────────────────────────────────────────────────────┤
│ Informations du forfait                                  │
├─────────────────────────────────────────────────────────┤
│ Contact d'urgence                                        │
├─────────────────────────────────────────────────────────┤
│ Raison de la demande                                     │
├─────────────────────────────────────────────────────────┤
│ Historique des décisions                                 │
├─────────────────────────────────────────────────────────┤
│ Actions: [Accepter] [Refuser] [Réouvrir] [Créer contrat]│
└─────────────────────────────────────────────────────────┘
```

## 6. Règles métier

### 6.1. Génération de l'ID

L'ID d'une demande suit le format :
```
MK_DEMANDE_CI_{matriculeMembre}_{date}_{heure}
```

Exemple : `MK_DEMANDE_CI_2663_040126_1329`

### 6.2. Validation des données

- Le membre est obligatoire
- Le forfait est obligatoire et doit exister dans le système
- La fréquence de paiement est obligatoire (DAILY ou MONTHLY)
- La date souhaitée est obligatoire et ne peut pas être dans le passé
- Le contact d'urgence est optionnel mais recommandé

### 6.3. Conversion en contrat

- Seules les demandes avec le statut `APPROVED` peuvent être converties
- Une demande ne peut être convertie qu'une seule fois
- Lors de la conversion, toutes les informations de la demande sont copiées dans le contrat
- Le contrat créé a le statut `ACTIVE` par défaut

### 6.4. Réouverture

- Seules les demandes avec le statut `REJECTED` peuvent être réouvertes
- La réouverture nécessite un motif obligatoire
- La réouverture conserve l'historique des décisions précédentes
- Après réouverture, la demande repasse au statut `PENDING`

## 7. Architecture technique

### 7.1. Collection Firestore

**Collection** : `caisseImprevueDemands`

**Structure d'un document** :
```typescript
{
  id: string
  memberId: string
  memberFirstName?: string
  memberLastName?: string
  memberContacts?: string[]
  memberEmail?: string
  subscriptionCIID: string
  subscriptionCICode: string
  subscriptionCILabel?: string
  subscriptionCIAmountPerMonth: number
  subscriptionCINominal: number
  subscriptionCIDuration: number
  subscriptionCISupportMin?: number
  subscriptionCISupportMax?: number
  paymentFrequency: 'DAILY' | 'MONTHLY'
  desiredDate: string
  firstPaymentDate?: string
  emergencyContact?: EmergencyContactCI
  cause?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'REOPENED'
  decisionMadeAt?: Timestamp
  decisionMadeBy?: string
  decisionMadeByName?: string
  decisionReason?: string
  reopenedAt?: Timestamp
  reopenedBy?: string
  reopenedByName?: string
  reopenReason?: string
  contractId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy?: string
}
```

### 7.2. Repository

**Interface** : `ICaisseImprevueDemandRepository`

**Méthodes** :
- `createDemand(data: Partial<CaisseImprevueDemand>): Promise<CaisseImprevueDemand>`
- `getDemandById(id: string): Promise<CaisseImprevueDemand | null>`
- `getDemandsWithFilters(filters: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemand[]>`
- `updateDemand(id: string, data: Partial<CaisseImprevueDemand>): Promise<void>`
- `updateDemandStatus(id: string, status: CaisseImprevueDemandStatus, decisionInfo?: DecisionInfo, reopenInfo?: ReopenInfo): Promise<void>`
- `getDemandsStats(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemandStats>`

### 7.3. Service

**Interface** : `ICaisseImprevueService` (extension)

**Méthodes** :
- `createDemand(data: CaisseImprevueDemandFormData, adminId: string): Promise<CaisseImprevueDemand>`
- `getDemandById(id: string): Promise<CaisseImprevueDemand | null>`
- `getDemandsWithFilters(filters: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemand[]>`
- `approveDemand(demandId: string, adminId: string, reason: string): Promise<CaisseImprevueDemand>`
- `rejectDemand(demandId: string, adminId: string, reason: string): Promise<CaisseImprevueDemand>`
- `reopenDemand(demandId: string, adminId: string, reason: string): Promise<CaisseImprevueDemand>`
- `convertDemandToContract(demandId: string, adminId: string, contractData?: Partial<ContractCI>): Promise<{ demand: CaisseImprevueDemand; contract: ContractCI } | null>`
- `getDemandsStats(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemandStats>`

### 7.4. Hooks React Query

**Fichier** : `src/hooks/caisse-imprevue/useCaisseImprevueDemands.ts`

**Hooks** :
- `useCaisseImprevueDemands(filters: CaisseImprevueDemandFilters)`
- `useCaisseImprevueDemand(id: string)`
- `useCaisseImprevueDemandsStats(filters?: CaisseImprevueDemandFilters)`
- `useCaisseImprevueDemandMutations()`

### 7.5. Composants UI

**Composants** :
- `ListDemandes.tsx` - Liste des demandes avec filtres et pagination
- `DemandDetail.tsx` - Détails d'une demande
- `CreateDemandModal.tsx` - Modal de création (3 étapes)
- `AcceptDemandModal.tsx` - Modal d'acceptation
- `RejectDemandModal.tsx` - Modal de refus
- `ReopenDemandModal.tsx` - Modal de réouverture
- `StatisticsCaisseImprevueDemandes.tsx` - Carousel de statistiques

### 7.6. Schémas Zod

**Fichier** : `src/schemas/caisse-imprevue.schema.ts` (extension)

**Schémas** :
- `caisseImprevueDemandStatusEnum`
- `caisseImprevueDemandSchema`
- `caisseImprevueDemandFormSchema`
- `approveDemandSchema`
- `rejectDemandSchema`
- `reopenDemandSchema`

## 8. Notifications

### 8.1. Types de notifications

Les notifications suivantes seront créées pour les demandes de Caisse Imprévue :

- **`demand_created`** : Nouvelle demande créée (tous les admins)
- **`demand_approved`** : Demande acceptée (membre concerné + tous les admins)
- **`demand_rejected`** : Demande refusée (membre concerné + tous les admins)
- **`demand_converted`** : Demande convertie en contrat (membre concerné + tous les admins)
- **`demand_reopened`** : Demande réouverte (tous les admins)

### 8.2. Cloud Functions (notifications planifiées)

**Fichier** : `functions/src/scheduled/caisseImprevueDemandReminders.ts`

**Fonctions** :
- `remindPendingCaisseImprevueDemands` : Rappels pour les demandes en attente
  - J+3 : Rappel si demande en attente depuis 3 jours
  - J+7 : Rappel si demande en attente depuis 7 jours
  - J+14 : Rappel si demande en attente depuis 14 jours
- `remindApprovedNotConvertedCaisseImprevueDemands` : Rappels pour les demandes acceptées non converties
  - J+7 : Rappel si demande acceptée depuis 7 jours et non convertie
  - J+14 : Rappel si demande acceptée depuis 14 jours et non convertie

**Planification** :
- Exécution quotidienne à 8h00 (heure locale)

## 9. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- **Analyse des contrats CI** : [`ANALYSE_CAISSE_IMPREVUE_CONTRATS.md`](./ANALYSE_CAISSE_IMPREVUE_CONTRATS.md)
- **Documentation Caisse Spéciale Demandes** : [`../caisse-speciale/DEMANDES_CAISSE_SPECIALE.md`](../caisse-speciale/DEMANDES_CAISSE_SPECIALE.md)
- **Documentation Placement Demandes** : [`../placement/DEMANDES_PLACEMENT.md`](../placement/DEMANDES_PLACEMENT.md)

