# Documentation UML — KARA Mutuelle

> Index centralisé de tous les diagrammes UML du projet KARA

---

## Structure

```
documentation/uml/
├── README.md                        # Ce fichier (index)
│
├── use-cases/                       # Diagrammes de cas d'usage
│   ├── USE_CASE_LOGIN.puml          # Use case authentification
│   └── USE_CASES_COMPLETS.puml      # Tous les use cases de l'application
│
├── classes/                         # Diagrammes de classes
│   ├── CLASSES_MEMBERSHIP.puml      # Module Membership (demandes, membres)
│   ├── CLASSES_CAISSE_SPECIALE.puml # Module Caisse Spéciale
│   ├── CLASSES_CAISSE_IMPREVUE.puml # Module Caisse Imprévue
│   ├── CLASSES_CREDIT_SPECIALE.puml # Module Crédit Spéciale
│   ├── CLASSES_PLACEMENT.puml       # Module Placement
│   ├── CLASSES_BIENFAITEUR.puml     # Module Bienfaiteur
│   ├── CLASSES_VEHICULE.puml        # Module Véhicule
│   ├── CLASSES_AGENTS_RECOUVREMENT.puml  # Module Agents de Recouvrement
│   ├── CLASSES_GEOGRAPHIE.puml      # Infrastructure Géographie (V2)
│   ├── CLASSES_AUTH.puml            # Authentification
│   ├── CLASSES_SHARED.puml          # Classes partagées (User, Notification, etc.)
│   └── CLASSES_CLOUD_FUNCTIONS.puml # Cloud Functions Firebase (NEW)
│
└── sequences/                       # Diagrammes de séquence
    └── SEQUENCES_MEMBERSHIP.puml    # Séquences module Membership Requests
```

---

## Modules Identifiés dans KARA

### 1. Membership (Gestion des Membres)
- **Diagramme de classes** : `classes/CLASSES_MEMBERSHIP.puml`
- **Diagrammes de séquence** : `sequences/SEQUENCES_MEMBERSHIP.puml`
- **Documentation complète** : `../membership-requests/` (analyse, critique, refactoring)
- **Use cases** : Inscription, validation des demandes, gestion des membres
- **Collections Firestore** : `members`, `membership-requests`, `groups`, `users`

**Diagrammes de séquence disponibles (13) :**
- Consultation : Voir détails, Fiche adhésion, Pièce identité, Liste dossiers
- Actions admin : Approuver, Rejeter, Corrections, Payer, Renouveler code
- Navigation : Recherche, Filtres, Pagination
- Statistiques : Calcul optimisé serveur

### 2. Financial — Caisse Spéciale
- **Diagramme de classes** : `classes/CLASSES_CAISSE_SPECIALE.puml`
- **Use cases** : Créer contrat, gérer demandes, enregistrer versements
- **Collections Firestore** : `caisseContracts`, `caisseSpecialeDemands`, `caisseSettings`

### 3. Financial — Caisse Imprévue
- **Diagramme de classes** : `classes/CLASSES_CAISSE_IMPREVUE.puml`
- **Use cases** : Créer contrat, gérer souscriptions, gérer demandes
- **Collections Firestore** : `contractsCI`, `subscriptionsCI`, `caisseImprevueDemands`

### 4. Financial — Crédit Spéciale
- **Diagramme de classes** : `classes/CLASSES_CREDIT_SPECIALE.puml`
- **Use cases** : Créer demande, valider contrat, gérer échéances, enregistrer paiements
- **Collections Firestore** : `creditDemands`, `creditContracts`, `creditInstallments`, `creditPayments`, `creditPenalties`

### 5. Financial — Placement
- **Diagramme de classes** : `classes/CLASSES_PLACEMENT.puml`
- **Use cases** : Créer placement, gérer demandes, calculer commissions
- **Collections Firestore** : `placements`, `placementDemands`

### 6. Complementary — Bienfaiteur
- **Diagramme de classes** : `classes/CLASSES_BIENFAITEUR.puml`
- **Use cases** : Créer événement caritatif, gérer participants, enregistrer contributions
- **Collections Firestore** : `charityEvents`, `charityParticipants`, `charityContributions`

### 7. Complementary — Véhicule
- **Diagramme de classes** : `classes/CLASSES_VEHICULE.puml`
- **Use cases** : Gérer véhicules, créer assurances
- **Collections Firestore** : `vehicles`, `vehicleInsurances`

### 8. Infrastructure — Agents de Recouvrement
- **Diagramme de classes** : `classes/CLASSES_AGENTS_RECOUVREMENT.puml`
- **Use cases** : Lister, créer, modifier, désactiver agents ; sélectionner agent lors des versements (Crédit, Caisse Spéciale, Caisse Imprévue)
- **Collections Firestore** : `agentsRecouvrement`
- **Storage** : `agents-recouvrement/{agentId}/{fileName}` (photos)
- **Documentation** : `../agent-de-recouvrement/`

### 9. Infrastructure — Géographie
- **Diagramme de classes** : `classes/CLASSES_GEOGRAPHIE.puml`
- **Use cases** : Gérer provinces, départements, communes, districts, quarters
- **Collections Firestore** : `provinces`, `departments`, `communes`, `districts`, `quarters`

### 10. Infrastructure — Shared
- **Diagramme de classes** : `classes/CLASSES_SHARED.puml`
- **Entités partagées** : `User`, `Document`, `Notification`, référentiels (companies, professions)
- **Services** : `NotificationService`, `NotificationRepository`
- **Hooks** : `useNotifications`, `useUnreadCount`, `useMarkNotificationAsRead`, etc.
- **Collections Firestore** : `users`, `documents`, `companies`, `professions`, `notifications`

### 11. Infrastructure — Cloud Functions
- **Diagramme de classes** : `classes/CLASSES_CLOUD_FUNCTIONS.puml`
- **Fonctions Callable** : `approveMembershipRequest`, `deleteMembershipRequest`, `verifySecurityCode`, `submitCorrections`, `renewSecurityCode`, `syncToAlgolia`
- **Fonctions Scheduled (Cron)** :
  - Anniversaires : `dailyBirthdayNotifications` (08:00)
  - Notifications programmées : `hourlyScheduledNotifications` (*/1h)
  - Placement : `dailyOverdueCommissions` (09:00)
  - Crédit Spéciale : `dailyCreditPaymentDue` (09:30), `dailyTransformCreditSpeciale` (11:00)
  - Caisse Imprévue : `dailyCIPaymentDue` (10:00), reminders (11:00, 11:30)
  - Caisse Spéciale : reminders (09:00, 10:00)
  - Véhicule : `dailyVehicleInsuranceExpiring` (10:30)
  - Agents de Recouvrement : `dailyAgentRecouvrementNotifications` (08:30)
- **Documentation** : `../functions/README.md`

---

## Relations entre Modules

### Dépendances principales

- **Membership** → Utilisé par tous les autres modules (référence aux membres)
- **Financial (tous)** → Utilise Membership (membres), Infrastructure (documents, géographie)
- **Complementary** → Utilise Membership (membres), Infrastructure (documents, géographie)
- **Infrastructure** → Utilisé par tous les autres modules (géographie, documents, référentiels)

### Règle pour les diagrammes de classes

Les diagrammes de classes doivent refléter ces relations :
- Utiliser `package` pour organiser les modules
- Créer des liens entre diagrammes (références)
- Documenter les cardinalités (1:N, N:N, composition, agrégation)

---

## Conventions de Nommage

### Fichiers .puml

- **Use cases** : `USE_CASES_COMPLETS.puml` (tous les use cases)
- **Classes** : `CLASSES_<MODULE>.puml` (un fichier par module)
- **Séquences** : `SEQUENCE_<FEATURE>.puml` (optionnel, par feature si nécessaire)

### Use Cases

Format : `UC-<MODULE>-<NUMERO>: <Description>`

Exemples :
- `UC-MEM-001: S'inscrire à la mutuelle`
- `UC-CS-001: Créer un contrat de caisse spéciale`
- `UC-CREDIT-001: Créer une demande de crédit`

---

## Workflow de Création/Mise à Jour

Voir `../WORKFLOW.md` pour le processus complet. En résumé :

### Pour une nouvelle fonctionnalité
1. Ajouter le use case dans `use-cases/USE_CASES_COMPLETS.puml`
2. Créer/mettre à jour le diagramme de classes si nouvelle entité

### Pour un refactoring
1. **Créer le diagramme de use case complet** dans `use-cases/USE_CASES_COMPLETS.puml`
2. **Créer/Améliorer le diagramme de classes** dans `classes/CLASSES_<MODULE>.puml`
3. Vérifier la cohérence avec Firestore
4. Documenter les relations avec les autres modules

---

## Outils de Visualisation

### PlantUML

Les fichiers `.puml` peuvent être visualisés avec :
- **Extension VS Code** : "PlantUML" (par jebbs)
- **En ligne** : http://www.plantuml.com/plantuml/uml/
- **CLI** : `plantuml documentation/uml/classes/CLASSES_*.puml`

### Génération d'images

```bash
# Installer PlantUML (si pas déjà installé)
# macOS
brew install plantuml

# Générer les images PNG
plantuml documentation/uml/use-cases/USE_CASES_COMPLETS.puml
plantuml documentation/uml/classes/CLASSES_*.puml
```

---

## État Actuel

### ✅ Créé / Mis à jour

- [x] `classes/CLASSES_MEMBERSHIP.puml` - Diagramme de classes Membership (complet)
- [x] `classes/CLASSES_SHARED.puml` - Classes partagées (User, Document, Notification, NotificationService, etc.)
- [x] `classes/CLASSES_CAISSE_SPECIALE.puml` - Classes Caisse Spéciale
- [x] `classes/CLASSES_CAISSE_IMPREVUE.puml` - Classes Caisse Imprévue
- [x] `classes/CLASSES_CREDIT_SPECIALE.puml` - Classes Crédit Spéciale
- [x] `classes/CLASSES_PLACEMENT.puml` - Classes Placement
- [x] `classes/CLASSES_BIENFAITEUR.puml` - Classes Bienfaiteur
- [x] `classes/CLASSES_VEHICULE.puml` - Classes Véhicule
- [x] `classes/CLASSES_AGENTS_RECOUVREMENT.puml` - Classes Agents de Recouvrement
- [x] `classes/CLASSES_GEOGRAPHIE.puml` - Classes Géographie (V2 avec Hooks + Combobox)
- [x] `classes/CLASSES_AUTH.puml` - Classes Authentification
- [x] `classes/CLASSES_CLOUD_FUNCTIONS.puml` - **NEW** Cloud Functions (Callable + Scheduled)
- [x] `sequences/SEQUENCES_MEMBERSHIP.puml` - Séquences Membership Requests (13 diagrammes)

### 📅 Dernière mise à jour

- **2025-02-02** : Création de CLASSES_AGENTS_RECOUVREMENT.puml ; mise à jour CLASSES_CREDIT_SPECIALE, CLASSES_CAISSE_SPECIALE, CLASSES_CAISSE_IMPREVUE, CLASSES_CLOUD_FUNCTIONS (agentRecouvrementId)
- **2025-01-22** : Mise à jour de CLASSES_SHARED.puml (ajout NotificationService, hooks notifications)
- **2025-01-22** : Création de CLASSES_CLOUD_FUNCTIONS.puml (callable + scheduled functions)

### 📋 À Faire

- [ ] Créer `use-cases/USE_CASES_COMPLETS.puml` (tous les use cases consolidés)
- [ ] Créer `sequences/SEQUENCES_CAISSE_SPECIALE.puml`
- [ ] Créer `sequences/SEQUENCES_CAISSE_IMPREVUE.puml`
- [ ] Créer `sequences/SEQUENCES_CREDIT_SPECIALE.puml`
- [ ] Créer `sequences/SEQUENCES_PLACEMENT.puml`
- [ ] Créer `sequences/SEQUENCES_NOTIFICATIONS.puml`

### 📝 Notes

- Les diagrammes existants dans `documentation/placement/`, `documentation/credit-speciale/`, etc. doivent être consolidés dans cette structure
- Les diagrammes de classes doivent être cohérents avec les types TypeScript dans `src/types/types.ts`
- Les diagrammes de classes doivent refléter les relations Firestore (collections, sous-collections)
- **CLASSES_GEOGRAPHIE.puml** : Reflète maintenant l'architecture V2 avec hooks React Query et composants Combobox
- **CLASSES_CLOUD_FUNCTIONS.puml** : Nouveau diagramme documentant toutes les Cloud Functions (callable et scheduled)

---

## Références

- `../WORKFLOW.md` : Workflow complet d'implémentation
- `documentation/architecture/ARCHITECTURE.md` : Architecture technique
- `src/types/types.ts` : Types TypeScript (entités)
