# Code Entremetteur – Recherche avec Autocomplétion

## 1. Vue d'ensemble

Cette fonctionnalité améliore l'expérience utilisateur lors de la saisie du **Code Entremetteur** dans le formulaire d'ajout de membre (`/memberships/add`).

### Problématique V1
- Champ texte simple demandant un format spécifique (`XXXX.MK.XXXX`)
- L'admin doit naviguer vers la liste des membres pour trouver le code
- Risques d'erreurs de saisie et perte de temps

### Solution V2
- Composant de recherche avec autocomplétion (Combobox/AsyncSelect)
- Recherche en temps réel par nom/prénom parmi les membres existants
- Sélection automatique du code entremetteur

## 2. Architecture

### 2.1 Composants

```
src/domains/memberships/
├── components/
│   └── form/
│       └── IntermediaryCodeSearch.tsx    # Composant Combobox de recherche
├── hooks/
│   └── useIntermediaryCodeSearch.ts      # Hook pour recherche membres
├── services/
│   └── IntermediaryCodeService.ts        # Service métier (optionnel)
└── repositories/
    └── MembersRepositoryV2.ts            # Utilise Algolia/Firestore existant
```

### 2.2 Flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│                  CODE ENTREMETTEUR V2                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   SAISIE    │───▶│   ALGOLIA   │───▶│ Affichage résultats │ │
│  │ (nom/prénom)│    │ members-env  │    │ avec code formaté   │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ SÉLECTION   │───▶│   SERVICE   │───▶│ Remplissage auto    │ │
│  │  membre     │    │  Validation │    │ intermediaryCode    │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Fonctionnalités

### 3.1 Recherche en temps réel
- Déclenchement après 2 caractères minimum
- Recherche dans `firstName`, `lastName`, `matricule`
- Utilise l'index Algolia `members-{env}` existant
- Filtre automatique : `isActive: true`
- **Cache React Query** : Évite les recherches redondantes (voir [cache-strategy.md](./cache-strategy.md))

### 3.2 Affichage des résultats
- Format : `Nom Prénom (Code Entremetteur)`
- Exemple : `Dupont Jean (1228.MK.0058)`
- Maximum 10 résultats affichés

### 3.3 Sélection
- Clic sur un résultat → remplissage automatique de `intermediaryCode`
- Validation du format automatique
- Stockage optionnel de l'ID du membre entremetteur

### 3.4 Gestion du cache
- **Cache intelligent** : Les recherches identiques utilisent le cache (instantané)
- **StaleTime** : 5 minutes (données considérées fraîches)
- **GcTime** : 10 minutes (cache supprimé après inactivité)
- **Évite les recherches redondantes** : "Glenn" → Efface → "Glenn" = Cache HIT

## 4. Technologies

| Composant | Technologie |
|-----------|-------------|
| Recherche | **Algolia** (index `members-{env}`) |
| UI | **shadcn/ui Combobox** ou **AsyncSelect** |
| Hook | **React Query** (`useMembersSearch`) |
| Validation | **Zod** (schéma existant) |

## 5. Structure des fichiers

```
documentation/memberships/V2/form-membership/code-entremetteur/
├── README.md                    # Ce fichier
├── problem-solution.md          # Problématique et solution initiale
├── uml/
│   ├── README.md                # Documentation des diagrammes UML
│   ├── use-case-v1.puml         # Use case V1 (actuel)
│   ├── use-case-v2.puml         # Use case V2 (nouvelle solution)
│   ├── activite.puml            # Diagramme d'activité
│   └── sequence.puml            # Diagramme de séquence
├── ui/
│   ├── README.md                # Documentation UI/UX complète
│   ├── test-ids.md              # IDs de tests E2E
│   ├── wireframe-etat-initial.md      # Wireframe état initial
│   ├── wireframe-recherche-active.md  # Wireframe recherche active
│   └── wireframe-selectionne.md       # Wireframe état sélectionné
├── firebase/
│   ├── firestore-regles.md      # Règles de sécurité Firestore
│   └── firestore-indexes.md     # Index Firestore nécessaires
└── tests/
    └── README.md                 # Plan de tests (unitaires, intégration, E2E)
```

## 6. Documentation associée

| Document | Description |
|----------|-------------|
| **[WORKFLOW.md](./WORKFLOW.md)** | **🔄 Workflow d'implémentation complet** |
| [problem-solution.md](./problem-solution.md) | Problématique et solution initiale |
| [uml/README.md](./uml/README.md) | Diagrammes UML (use cases, activité, séquence) |
| [uml/use-case-v1.puml](./uml/use-case-v1.puml) | Use case V1 (actuel) |
| [uml/use-case-v2.puml](./uml/use-case-v2.puml) | Use case V2 (nouvelle solution) |
| [uml/activite.puml](./uml/activite.puml) | Diagramme d'activité |
| [uml/sequence.puml](./uml/sequence.puml) | Diagramme de séquence |
| [ui/README.md](./ui/README.md) | Documentation UI/UX complète |
| [ui/test-ids.md](./ui/test-ids.md) | IDs de tests E2E |
| [ui/wireframe-etat-initial.md](./ui/wireframe-etat-initial.md) | Wireframe état initial |
| [ui/wireframe-recherche-active.md](./ui/wireframe-recherche-active.md) | Wireframe recherche active |
| [ui/wireframe-selectionne.md](./ui/wireframe-selectionne.md) | Wireframe état sélectionné |
| [cache-strategy.md](./cache-strategy.md) | Stratégie de cache React Query |
| [firebase/firestore-regles.md](./firebase/firestore-regles.md) | Règles de sécurité |
| [firebase/firestore-indexes.md](./firebase/firestore-indexes.md) | Index Firestore |
| [tests/README.md](./tests/README.md) | Plan de tests (unitaires, intégration, E2E) |

## 7. Roadmap

- [x] Documentation V2
- [x] Documentation UML (use cases, activité, séquence)
- [x] Documentation UI/UX (wireframes, test-ids)
- [x] Documentation technique (cache, Firebase)
- [x] Plan de tests
- [x] **Workflow d'implémentation** ← **Suivre ce workflow pour l'implémentation**
- [ ] Création du composant `IntermediaryCodeSearch`
- [ ] Hook `useIntermediaryCodeSearch`
- [ ] Intégration dans `IdentityStepV2`
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests E2E Playwright
- [ ] Déploiement préprod
- [ ] Tests E2E préprod (OBLIGATOIRE)
- [ ] Déploiement prod

**📋 Pour commencer l'implémentation** : Suivre le [WORKFLOW.md](./WORKFLOW.md) étape par étape.
