# Restructuration Complète de l'Architecture et de l'Analyse UML

## 🎯 Objectifs de la restructuration

1. **Clarifier la vision métier** : Passer d'une organisation technique (modules) à une organisation par domaines métier
2. **Simplifier la documentation UML** : Réduire la fragmentation (137 fichiers .puml pour crédit spéciale)
3. **Unifier la base de données** : Clarifier les collections et leurs relations
4. **Définir les frontières** : Délimiter clairement chaque domaine et ses interactions
5. **Faciliter les tests** : Architecture claire permettant des tests isolés par domaine

---

## 📊 Vue d'ensemble du système KARA

### Contexte métier
KARA est une **mutuelle au Gabon** qui gère :
- L'adhésion de membres (adhérents, bienfaiteurs, sympathisants)
- Des services financiers (caisses, crédits, placements)
- Des services complémentaires (assurances véhicules, événements caritatifs)
- La gestion administrative (géographie, documents, notifications)

---

## 🏗️ Architecture par Domaines Métier (DDD)

### Domaine 1 : Gestion des Membres (Membership)
**Responsabilité** : Gérer le cycle de vie des membres de la mutuelle

**Entités principales** :
- `Member` (Membre)
- `MembershipRequest` (Demande d'adhésion)
- `Group` (Groupe de membres)
- `Filleul` (Parrainage)

**Collections Firestore** :
- `members`
- `membership-requests`
- `groups`
- `users` (authentification)

**Services** :
- `MembershipService` : Gestion des adhésions, validation, statuts

**Cas d'usage principaux** :
- Création de demande d'adhésion
- Validation/Rejet de demande
- Gestion des groupes
- Parrainage

---

### Domaine 2 : Services Financiers

#### 2.1 Sous-domaine : Caisse Spéciale
**Responsabilité** : Gérer les contrats et demandes de la caisse spéciale

**Entités principales** :
- `CaisseSpecialeContract` (Contrat)
- `CaisseSpecialeDemand` (Demande)

**Collections Firestore** :
- `caisseContracts`
- `caisseSpecialeDemands`
- `caisseSettings`
- `caisseAdminNotes`

**Services** :
- `CaisseSpecialeService` : Gestion des contrats, échéances, paiements

#### 2.2 Sous-domaine : Caisse Imprévue
**Responsabilité** : Gérer les contrats et souscriptions de la caisse imprévue

**Entités principales** :
- `ContractCI` (Contrat)
- `SubscriptionCI` (Souscription)
- `PaymentCI` (Paiement)
- `SupportCI` (Soutien/Aide)
- `EarlyRefundCI` (Remboursement anticipé)

**Collections Firestore** :
- `contractsCI`
- `subscriptionsCI`
- `caisseImprevueDemands`
- (paiements et supports dans sous-collections)

**Services** :
- `CaisseImprevueService` : Gestion complète du cycle de vie

#### 2.3 Sous-domaine : Crédit Spéciale
**Responsabilité** : Gérer les crédits accordés aux membres

**Entités principales** :
- `CreditDemand` (Demande de crédit)
- `CreditContract` (Contrat de crédit)
- `CreditInstallment` (Échéance)
- `CreditPayment` (Paiement)
- `CreditPenalty` (Pénalité)

**Collections Firestore** :
- `creditDemands`
- `creditContracts`
- `creditInstallments`
- `creditPayments`
- `creditPenalties`

**Services** :
- `CreditSpecialeService` : Gestion du cycle de crédit complet

#### 2.4 Sous-domaine : Placement
**Responsabilité** : Gérer les placements financiers des bienfaiteurs

**Entités principales** :
- `Placement` (Placement)
- `PlacementDemand` (Demande de placement)
- `Commission` (Commission)

**Collections Firestore** :
- `placements`
- `placementDemands`

**Services** :
- `PlacementService` : Gestion des placements, commissions, retraits

---

### Domaine 3 : Services Complémentaires

#### 3.1 Sous-domaine : Assurance Véhicule
**Responsabilité** : Gérer les assurances véhicules des membres

**Entités principales** :
- `Vehicle` (Véhicule)
- `VehicleInsurance` (Assurance)

**Collections Firestore** :
- `vehicles`
- `vehicleInsurances`

**Services** :
- `VehicleInsuranceService` : Gestion des assurances, échéances

#### 3.2 Sous-domaine : Bienfaiteur (Charity)
**Responsabilité** : Gérer les événements caritatifs et collectes

**Entités principales** :
- `CharityEvent` (Événement)
- `CharityParticipant` (Participant)
- `CharityContribution` (Contribution)
- `CharityMedia` (Média)

**Collections Firestore** :
- `charityEvents`
- `charityParticipants`
- `charityContributions`
- `charityMedia`

**Services** :
- `CharityEventService`
- `CharityContributionService`
- `CharityParticipantService`
- `CharityMediaService`

---

### Domaine 4 : Infrastructure et Référentiels

#### 4.1 Sous-domaine : Géographie
**Responsabilité** : Gérer les référentiels géographiques du Gabon

**Entités principales** :
- `Province`
- `Department`
- `Commune`
- `District`
- `Quarter`

**Collections Firestore** :
- `provinces`
- `departments`
- `communes`
- `districts`
- `quarters`

**Services** :
- `GeographieService` : CRUD complet des référentiels

#### 4.2 Sous-domaine : Référentiels Métier
**Responsabilité** : Gérer les référentiels partagés

**Entités principales** :
- `Company` (Entreprise)
- `Profession` (Profession)

**Collections Firestore** :
- `companies`
- `professions`

**Services** :
- `CompanySuggestionsService`

#### 4.3 Sous-domaine : Documents
**Responsabilité** : Gérer les documents (contrats, pièces d'identité, etc.)

**Entités principales** :
- `Document`

**Collections Firestore** :
- `documents`

**Services** :
- `DocumentService` : Upload, stockage, récupération

#### 4.4 Sous-domaine : Notifications
**Responsabilité** : Gérer les notifications système

**Entités principales** :
- `Notification`

**Collections Firestore** :
- `notifications`

**Services** :
- `NotificationService` : Création, envoi, gestion des notifications

---

## 📐 Diagramme de Contexte Système

```
┌─────────────────────────────────────────────────────────────┐
│                      SYSTÈME KARA                           │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Domaines   │  │ Infrastructure│  │  Référentiels│     │
│  │   Métier     │  │               │  │              │     │
│  │              │  │  - Documents  │  │  - Géographie│     │
│  │  - Membres   │  │  - Notifs     │  │  - Companies │     │
│  │  - Financier │  │  - Auth       │  │  - Professions│    │
│  │  - Complément│  │               │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Firebase    │    │  Photon API  │    │  Payment     │
│  (Firestore  │    │  (Géocoding) │    │  Gateway     │
│   Storage    │    │              │    │  (Future)    │
│   Auth)      │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 🗂️ Structure de Packages Proposée

### Organisation par Domaines (au lieu de par couche technique)

```
src/
├── domains/
│   ├── membership/
│   │   ├── entities/          # Types/Interfaces (Member, MembershipRequest, etc.)
│   │   ├── repositories/      # Accès données
│   │   ├── services/          # Logique métier
│   │   ├── hooks/             # Hooks React Query
│   │   ├── components/        # Composants UI
│   │   └── schemas/           # Schemas Zod
│   │
│   ├── financial/
│   │   ├── caisse-speciale/
│   │   ├── caisse-imprevue/
│   │   ├── credit-speciale/
│   │   └── placement/
│   │       (même structure : entities, repositories, services, hooks, components, schemas)
│   │
│   ├── complementary/
│   │   ├── vehicle/
│   │   └── charity/
│   │
│   └── infrastructure/
│       ├── geography/
│       ├── documents/
│       ├── notifications/
│       └── references/        # Companies, Professions
│
├── shared/                    # Code partagé entre domaines
│   ├── ui/                    # Composants UI (shadcn)
│   ├── factories/             # ServiceFactory, RepositoryFactory
│   ├── providers/             # Contextes React globaux
│   ├── constants/             # Routes, collection names, etc.
│   ├── types/                 # Types partagés (User, Payment, etc.)
│   └── utils/                 # Utilitaires généraux
│
├── app/                       # Next.js App Router
│   ├── (admin)/               # Routes admin
│   └── (public)/              # Routes publiques
│
└── firebase/                  # Configuration Firebase
```

**Avantages** :
- ✅ Cohésion forte : tout ce qui concerne un domaine est ensemble
- ✅ Découplage : chaque domaine peut évoluer indépendamment
- ✅ Tests facilités : tests isolés par domaine
- ✅ Compréhension : structure reflète la logique métier

---

## 🗄️ Architecture de Base de Données Unifiée

### Collections Principales (par domaine)

```typescript
// DOMAINE MEMBERSHIP
members                    // Membres actifs
membership-requests        // Demandes d'adhésion
groups                     // Groupes de membres
users                      // Authentification

// DOMAINE FINANCIER - CAISSE SPÉCIALE
caisseContracts            // Contrats caisse spéciale
caisseSpecialeDemands      // Demandes
caisseSettings             // Paramètres
caisseAdminNotes           // Notes admin

// DOMAINE FINANCIER - CAISSE IMPRÉVUE
contractsCI                // Contrats
subscriptionsCI            // Souscriptions
caisseImprevueDemands      // Demandes
// (Payments et Supports en sous-collections)

// DOMAINE FINANCIER - CRÉDIT SPÉCIALE
creditDemands              // Demandes
creditContracts            // Contrats
creditInstallments         // Échéances
creditPayments             // Paiements
creditPenalties            // Pénalités

// DOMAINE FINANCIER - PLACEMENT
placements                 // Placements
placementDemands           // Demandes

// DOMAINE COMPLÉMENTAIRE - VÉHICULE
vehicles                   // Véhicules
vehicleInsurances          // Assurances

// DOMAINE COMPLÉMENTAIRE - BIENFAITEUR
charityEvents              // Événements
charityParticipants        // Participants
charityContributions       // Contributions
charityMedia               // Médias

// INFRASTRUCTURE
provinces                  // Référentiel géographique
departments
communes
districts
quarters

companies                  // Référentiels métier
professions

documents                  // Documents (contrats, PI, etc.)
notifications              // Notifications système

admins                     // Administration
settings                   // Paramètres globaux
categories                 // Catégories (si nécessaire)
```

### Règles de Nommage Unifiées
- **Collections** : camelCase, pluriel (`members`, `creditContracts`)
- **Sous-collections** : camelCase, singulier ou pluriel selon contexte
- **Champs communs** : `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

---

## 📊 Diagrammes UML Simplifiés

### 1. Diagramme de Classes Global (Vue Simplifiée)

```
┌─────────────────────────────────────────────────────────────┐
│                      DOMAINE MEMBERSHIP                     │
├─────────────────────────────────────────────────────────────┤
│ Member                                                      │
│ + id: string                                                │
│ + matricule: string                                         │
│ + firstName: string                                         │
│ + lastName: string                                          │
│ + membershipType: MembershipType                            │
│ + status: MemberStatus                                      │
│                                                             │
│ MembershipRequest                                           │
│ + id: string                                                │
│ + matricule: string                                         │
│ + status: MembershipRequestStatus                           │
│ + identity: IdentityData                                    │
│ + address: AddressData                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DOMAINE FINANCIER                        │
├─────────────────────────────────────────────────────────────┤
│ CaisseSpecialeContract                                      │
│ + id: string                                                │
│ + memberId: string                                          │
│ + amount: number                                            │
│ + status: ContractStatus                                    │
│                                                             │
│ CreditContract                                              │
│ + id: string                                                │
│ + memberId: string                                          │
│ + amount: number                                            │
│ + installments: CreditInstallment[]                         │
│                                                             │
│ Placement                                                   │
│ + id: string                                                │
│ + bienfaiteurId: string                                     │
│ + amount: number                                            │
│ + commissions: Commission[]                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE                             │
├─────────────────────────────────────────────────────────────┤
│ Province ──1:N──> Department                                │
│ Department ──1:N──> Commune                                 │
│ Commune ──1:N──> District                                   │
│ District ──1:N──> Quarter                                   │
│                                                             │
│ Document                                                    │
│ + id: string                                                │
│ + type: DocumentType                                        │
│ + url: string                                               │
│                                                             │
│ Notification                                                │
│ + id: string                                                │
│ + module: string                                            │
│ + type: string                                              │
│ + isRead: boolean                                           │
└─────────────────────────────────────────────────────────────┘
```

### 2. Diagramme de Séquence Unifié (Création de Contrat)

```
Admin -> UI: Créer contrat
UI -> Hook: useCreateContract()
Hook -> Service: createContract(data)
Service -> Repository: create(contractData)
Repository -> Firestore: addDoc()
Firestore -> Repository: contractId
Repository -> Service: Contract
Service -> NotificationService: createNotification()
Service -> Hook: Contract
Hook -> UI: Success + Invalidate queries
```

---

## 🔄 Plan de Migration (Proposition)

### Phase 1 : Réorganisation de la Documentation UML

1. **Consolider les diagrammes** :
   - Créer un fichier UML principal par domaine (au lieu de 137 fichiers)
   - Structure proposée :
     ```
     documentation/
     ├── domains/
     │   ├── membership/
     │   │   ├── DOMAIN_OVERVIEW.md          # Vue d'ensemble
     │   │   ├── CLASS_DIAGRAM.puml          # Diagramme de classes
     │   │   ├── SEQUENCE_DIAGRAMS.puml      # Diagrammes de séquence principaux
     │   │   └── USE_CASES.md                # Cas d'usage
     │   │
     │   ├── financial/
     │   │   ├── caisse-speciale/
     │   │   │   ├── DOMAIN_OVERVIEW.md
     │   │   │   └── CLASS_DIAGRAM.puml
     │   │   ├── credit-speciale/
     │   │   │   ├── DOMAIN_OVERVIEW.md      # Remplace les 137 fichiers
     │   │   │   ├── CLASS_DIAGRAM.puml
     │   │   │   └── SEQUENCE_DIAGRAMS.puml  # Consolidation
     │   │   └── ...
     │   │
     │   └── ...
     │
     └── architecture/
         ├── ARCHITECTURE.md                 # Architecture technique
         ├── DOMAIN_OVERVIEW.md              # Vue d'ensemble des domaines
         └── DATABASE_SCHEMA.md              # Schéma base de données
     ```

### Phase 2 : Refactoring Progressif du Code

**Option A : Refactoring Big Bang (non recommandé)**
- Tout réorganiser d'un coup
- Risque élevé de casser le système

**Option B : Refactoring Incrémental (recommandé)**

1. **Étape 1** : Créer la nouvelle structure `src/domains/` en parallèle
2. **Étape 2** : Migrer domaine par domaine (commencer par le plus isolé)
3. **Étape 3** : Adapter les imports progressivement
4. **Étape 4** : Supprimer l'ancienne structure une fois migration complète

**Ordre de migration suggéré** :
1. Infrastructure (géographie, documents) - le plus isolé
2. Membership - domaine central mais bien défini
3. Complémentaire (charity, vehicle)
4. Financier (le plus complexe, faire en dernier)

---

## 📋 Structure de Documentation Proposée

### Fichier Principal par Domaine

**Template `DOMAIN_OVERVIEW.md`** :

```markdown
# Domaine : [Nom du Domaine]

## Vue d'ensemble
[Description du domaine et de ses responsabilités]

## Entités Principales
[Liste des entités avec description courte]

## Collections Firestore
[Liste des collections]

## Services
[Liste des services avec responsabilités]

## Cas d'usage principaux
[Liste des UC]

## Diagrammes
- [CLASS_DIAGRAM.puml](./CLASS_DIAGRAM.puml)
- [SEQUENCE_DIAGRAMS.puml](./SEQUENCE_DIAGRAMS.puml)

## Dependencies
[Domaines dont ce domaine dépend]

## API Publique
[Liste des hooks/services exposés]
```

---

## ✅ Actions Immédiates Recommandées

### 1. Documentation (Cette semaine)

- [ ] Créer la structure `documentation/domains/`
- [ ] Créer `DOMAIN_OVERVIEW.md` pour chaque domaine
- [ ] Consolider les diagrammes UML (réduire de 137 à ~10 fichiers)
- [ ] Créer `DATABASE_SCHEMA.md` unifié

### 2. Analyse (Semaine suivante)

- [ ] Valider la structure avec l'équipe
- [ ] Identifier les dépendances entre domaines
- [ ] Documenter les APIs publiques de chaque domaine
- [ ] Créer un glossaire des termes métier

### 3. Migration Code (Par la suite)

- [ ] Décider de la stratégie (incrémental vs big bang)
- [ ] Commencer par le domaine le plus isolé
- [ ] Migrer progressivement

---

## 🎯 Bénéfices Attendus

1. **Clarté** : Structure reflète la logique métier
2. **Maintenabilité** : Chaque domaine est isolé et testable
3. **Scalabilité** : Nouveaux domaines s'ajoutent facilement
4. **Documentation** : UML consolidé et clair
5. **Tests** : Tests isolés par domaine, mocks faciles
6. **Onboarding** : Nouveaux développeurs comprennent rapidement

---

## 📚 Références

- [Domain-Driven Design (DDD)](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- Architecture technique actuelle : `documentation/architecture/ARCHITECTURE.md`

---

**Note** : Ce document est une proposition. Il doit être validé et adapté selon les contraintes et besoins spécifiques du projet.
