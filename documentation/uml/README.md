# Documentation UML — KARA Mutuelle

> Index centralisé de tous les diagrammes UML du projet KARA

---

## Structure

```
documentation/uml/
├── README.md                    # Ce fichier (index)
│
├── use-cases/                   # Diagrammes de cas d'usage
│   └── USE_CASES_COMPLETS.puml  # Tous les use cases de l'application
│
├── classes/                     # Diagrammes de classes
│   ├── CLASSES_MEMBERSHIP.puml
│   ├── CLASSES_CAISSE_SPECIALE.puml
│   ├── CLASSES_CAISSE_IMPREVUE.puml
│   ├── CLASSES_CREDIT_SPECIALE.puml
│   ├── CLASSES_PLACEMENT.puml
│   ├── CLASSES_BIENFAITEUR.puml
│   ├── CLASSES_VEHICULE.puml
│   ├── CLASSES_GEOGRAPHIE.puml
│   └── CLASSES_SHARED.puml      # Classes partagées (User, Document, etc.)
│
└── sequences/                   # Diagrammes de séquence (optionnel)
    └── ...
```

---

## Modules Identifiés dans KARA

### 1. Membership (Gestion des Membres)
- **Diagramme de classes** : `classes/CLASSES_MEMBERSHIP.puml`
- **Use cases** : Inscription, validation des demandes, gestion des membres
- **Collections Firestore** : `members`, `membership-requests`, `groups`, `users`

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

### 8. Infrastructure — Géographie
- **Diagramme de classes** : `classes/CLASSES_GEOGRAPHIE.puml`
- **Use cases** : Gérer provinces, départements, communes, districts, quarters
- **Collections Firestore** : `provinces`, `departments`, `communes`, `districts`, `quarters`

### 9. Infrastructure — Shared
- **Diagramme de classes** : `classes/CLASSES_SHARED.puml`
- **Entités partagées** : `User`, `Document`, référentiels (companies, professions)
- **Collections Firestore** : `users`, `documents`, `companies`, `professions`, `notifications`

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

### ✅ À Faire

- [ ] Créer `use-cases/USE_CASES_COMPLETS.puml` (tous les use cases consolidés)
- [ ] Créer `classes/CLASSES_MEMBERSHIP.puml`
- [ ] Créer `classes/CLASSES_CAISSE_SPECIALE.puml`
- [ ] Créer `classes/CLASSES_CAISSE_IMPREVUE.puml`
- [ ] Créer `classes/CLASSES_CREDIT_SPECIALE.puml`
- [ ] Créer `classes/CLASSES_PLACEMENT.puml`
- [ ] Créer `classes/CLASSES_BIENFAITEUR.puml`
- [ ] Créer `classes/CLASSES_VEHICULE.puml`
- [ ] Créer `classes/CLASSES_GEOGRAPHIE.puml`
- [ ] Créer `classes/CLASSES_SHARED.puml`

### 📝 Notes

- Les diagrammes existants dans `documentation/placement/`, `documentation/credit-speciale/`, etc. doivent être consolidés dans cette structure
- Les diagrammes de classes doivent être cohérents avec les types TypeScript dans `src/types/types.ts`
- Les diagrammes de classes doivent refléter les relations Firestore (collections, sous-collections)

---

## Références

- `../WORKFLOW.md` : Workflow complet d'implémentation
- `documentation/architecture/ARCHITECTURE.md` : Architecture technique
- `src/types/types.ts` : Types TypeScript (entités)
