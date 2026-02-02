# WORKFLOW.md — Workflow d'implémentation — Module Agents de Recouvrement

> Objectif : un workflow **solide**, reproductible, adapté au module **Agents de Recouvrement** (KARA Mutuelle).

> **Référence** : Ce workflow s'appuie sur le workflow général `documentation/general/WORKFLOW.md`. Les règles globales (branching, CI/CD, tests) s'appliquent. Ce document détaille les spécificités du module.

---

# PARTIE 1 — CONTEXTE DU MODULE AGENTS DE RECOUVREMENT

## Contexte Métier

Un **agent de recouvrement** est une personne chargée de collecter physiquement les paiements auprès des membres lors de l'enregistrement d'un versement. Il intervient sur trois types de contrats :

| Type de contrat | Point d'enregistrement |
|-----------------|-------------------------|
| **Crédit spéciale** | Enregistrement d'un paiement d'échéance |
| **Caisse spéciale** | Enregistrement d'une contribution |
| **Caisse imprévue** | Enregistrement d'un versement mensuel |

### Objectifs

- **Traçabilité** : Savoir qui a collecté chaque versement
- **Gestion** : Lister, créer, modifier, désactiver, supprimer les agents
- **Sélection** : Choisir l'agent lors de l'enregistrement d'un paiement/versement

### Accès

- **Page admin** : `/admin/agents-recouvrement` (authentification requise)
- **Sélection** : Intégrée dans les modals/formulaires de paiement (Crédit, Caisse Spéciale, Caisse Imprévue)

---

# PARTIE 2 — STRUCTURE DE LA DOCUMENTATION

## Dossier agent-de-recouvrement

```
documentation/agent-de-recouvrement/
├── README.md                    # Vue d'ensemble du module
├── WORKFLOW.md                  # Ce fichier (workflow spécifique)
├── ANALYSE_ALGOLIA_VS_FIRESTORE.md
│
├── use-case/                    # Cas d'utilisation
│   ├── README.md
│   └── UC_AgentRecouvrement.puml
│
├── activity/                    # Diagrammes d'activité
│   ├── README.md
│   ├── ListerAgents.puml
│   ├── StatsAgents.puml
│   ├── RechercherAgents.puml
│   ├── VoirDetailsAgent.puml
│   ├── CreerAgent.puml
│   ├── ModifierAgent.puml
│   ├── DesactiverAgent.puml
│   ├── SupprimerAgent.puml
│   ├── SelectionnerAgentCredit.puml
│   ├── SelectionnerAgentCaisse.puml
│   ├── SelectionnerAgentCI.puml
│   ├── NotificationsAgent.puml
│   ├── CloudFunctionNotificationsAgent.puml
│   └── GestionErreursAgents.puml
│
├── sequence/                    # Diagrammes de séquence
│   ├── README.md
│   ├── SEQ_ListerAgents.puml
│   ├── SEQ_StatsAgents.puml
│   ├── SEQ_RechercherAgents.puml
│   ├── SEQ_VoirDetailsAgent.puml
│   ├── SEQ_CreerAgent.puml
│   ├── SEQ_ModifierAgent.puml
│   ├── SEQ_DesactiverAgent.puml
│   ├── SEQ_SupprimerAgent.puml
│   ├── SEQ_SelectionnerAgent*.puml
│   ├── SEQ_NotificationsAgent.puml
│   ├── SEQ_CloudFunctionNotificationsAgent.puml
│   └── SEQ_GestionErreursAgents.puml
│
├── firebase/                    # Configuration Firebase
│   ├── README.md
│   ├── INDEXES.md               # Index Firestore
│   ├── FIRESTORE_RULES.md       # Règles Firestore
│   └── STORAGE_RULES.md         # Règles Storage (photos)
│
└── ui/                          # Wireframes
    ├── README.md
    ├── WIREFRAME_LISTE.md       # Liste des agents (stats, tabs, cards, pagination)
    ├── WIREFRAME_DETAILS.md     # Page détails d'un agent
    └── WIREFRAME_MODALS.md      # Modals Créer, Modifier, Désactiver, Supprimer, Select
```

## Diagramme de classes UML

- **Fichier** : `documentation/uml/classes/CLASSES_AGENTS_RECOUVREMENT.puml`
- **Entités** : AgentRecouvrement, PieceIdentite
- **Relations** : CreditPayment, VersementCI, PaymentContribution → AgentRecouvrement

---

# PARTIE 3 — FIREBASE (COLLECTION & STORAGE)

## Collection Firestore

```
agentsRecouvrement
```

### Champs principaux

| Champ | Type | Description |
|-------|------|-------------|
| nom, prenom | string | Identité |
| sexe | 'M' \| 'F' | Homme / Femme |
| pieceIdentite | object | Type, numéro, dates délivrance/expiration |
| dateNaissance | Timestamp | Date de naissance |
| birthMonth, birthDay | number | Dérivés (tab Anniversaires du mois) |
| lieuNaissance | string | Lieu de naissance |
| tel1, tel2 | string | Contacts |
| photoUrl, photoPath | string | Photo (optionnel, Storage) |
| actif | boolean | Statut actif/inactif |
| searchableText* | string | Champs de recherche (nom, prénom, numéro, tel) |
| createdBy, createdAt, updatedBy, updatedAt | — | Traçabilité |

### Storage

- **Chemin** : `agents-recouvrement/{agentId}/{fileName}`
- **Règles** : Voir `firebase/STORAGE_RULES.md`

### Indexes Firestore

- **Fichier** : `firebase/INDEXES.md`
- **Index composites** : actif + searchableText* + createdAt, actif + birthMonth + birthDay, etc.
- **Fichier projet** : `firestore.indexes.json` (racine)

---

# PARTIE 4 — WORKFLOW PAR FEATURE (AGENTS DE RECOUVREMENT)

## 0) Branching model

Depuis `develop` :
```bash
git checkout develop
git pull
git checkout -b feat/agents-recouvrement
```

**Convention** : `feat/agents-recouvrement` ou `feat/agents-recouvrement-<sous-feature>`

---

## 0.1) Référentiel des Skills disponibles

| Skill | Chemin | Usage |
|-------|--------|-------|
| **shadcn-ui** | `skills/shadcn-ui/SKILL.md` | Composants UI (Button, Card, Form, Modal, etc.) |
| **tailwind-design-system** | `skills/tailwind-design-system/SKILL.md` | Design tokens, responsive |
| **tailwind-patterns** | `skills/tailwind-patterns/SKILL.md` | Patterns Tailwind v4 |
| **security-review** | `skills/security-review/SKILL.md` | Validation formulaires, gestion des entrées, auth |

**Gestion des erreurs** : Consulter [activity/GestionErreursAgents.puml](./activity/GestionErreursAgents.puml) et [sequence/SEQ_GestionErreursAgents.puml](./sequence/SEQ_GestionErreursAgents.puml) pour les cas d'erreur (validation, 404, réseau).

---

## 1) Definition of Done (DoD) — Module Agents

### Documentation (obligatoire avant implémentation)

- [ ] Use case documenté : `use-case/UC_AgentRecouvrement.puml`
- [ ] Diagrammes d'activité : `activity/*.puml` (Lister, Créer, Modifier, Désactiver, Supprimer, etc.)
- [ ] Diagrammes de séquence : `sequence/SEQ_*.puml`
- [ ] Diagramme de classes : `documentation/uml/classes/CLASSES_AGENTS_RECOUVREMENT.puml`
- [ ] Wireframes : `ui/WIREFRAME_LISTE.md`, `WIREFRAME_DETAILS.md`, `WIREFRAME_MODALS.md`
- [ ] Firebase : `firebase/INDEXES.md`, `FIRESTORE_RULES.md`, `STORAGE_RULES.md` à jour

### Implémentation

- [ ] Architecture : Repositories → Services → Hooks → Components
- [ ] Design System : Couleurs KARA, composants shadcn
- [ ] Responsive : Mobile, Tablette, Desktop (wireframes)
- [ ] Composants réutilisés :
  - Stats Carousel : `MembershipsListStats`-like (`/memberships`)
  - Badges Carousel (tabs) : `StatusFilterBadgesCarousel`-like (`/caisse-speciale/demandes`)
- [ ] Validation : Schemas Zod pour formulaires
- [ ] Firestore : Indexes dans `firestore.indexes.json`, règles dans `firestore.rules`, `storage.rules`

### Tests

- [ ] Tests locaux : `pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`
- [ ] Tests E2E : flows critiques (liste, création, modification, sélection)
- [ ] CI : pipeline vert

---

## 2) Workflow complet — Implémentation

> **Règle** : Pour chaque tâche, consulter **avant implémentation** :
> 1. **Activité** (.puml) — Workflow métier
> 2. **Séquence** (SEQ_*.puml) — Interactions techniques
> 3. **Wireframes** (.md) — Maquettes UI
> 4. **Skills** (SKILL.md) — Patterns à appliquer (shadcn-ui, tailwind, security-review)

### Étape A — Consulter la documentation

**Obligatoire — Lire** (avant chaque tâche, consulter les références de la section 5) :

| Document | Usage |
|----------|-------|
| [README.md](./README.md) | Vue d'ensemble du module |
| [ui/WIREFRAME_LISTE.md](./ui/WIREFRAME_LISTE.md) | Layout liste (stats carousel, badges carousel, cards, pagination) |
| [ui/WIREFRAME_DETAILS.md](./ui/WIREFRAME_DETAILS.md) | Layout page détails (nom/prénom/âge, alertes) |
| [ui/WIREFRAME_MODALS.md](./ui/WIREFRAME_MODALS.md) | Modals Créer, Modifier, Désactiver, Supprimer, Select |
| [firebase/INDEXES.md](./firebase/INDEXES.md) | Index Firestore |
| [firebase/FIRESTORE_RULES.md](./firebase/FIRESTORE_RULES.md) | Règles Firestore |
| [documentation/general/WORKFLOW.md](../general/WORKFLOW.md) | Workflow global |

**Pour chaque tâche** : Consulter l'**Activité**, la **Séquence**, les **Wireframes** et les **Skills** associés (voir tableaux Étape C et section 5).

### Étape B — Créer la branche

```bash
git checkout develop
git pull
git checkout -b feat/agents-recouvrement
```

### Étape C — Implémenter (ordre recommandé)

Chaque tâche référence les diagrammes, wireframes et skills associés.

---

#### C.1 — Couche données

| Tâche | Activité | Séquence | Wireframes | Skills |
|-------|----------|----------|------------|--------|
| **Types** (AgentRecouvrement, AgentsFilters, AgentsStats) | `activity/CreerAgent.puml` | `sequence/SEQ_CreerAgent.puml` | `ui/WIREFRAME_MODALS.md` | `security-review` |
| **Repository** (CRUD, getAgentsWithFilters, getAgentsAnniversairesMois, getAgentsStats) | `activity/ListerAgents.puml`, `activity/StatsAgents.puml`, `activity/CreerAgent.puml`, etc. | `sequence/SEQ_ListerAgents.puml`, `SEQ_StatsAgents.puml`, `SEQ_CreerAgent.puml`, `SEQ_ModifierAgent.puml`, `SEQ_DesactiverAgent.puml`, `SEQ_SupprimerAgent.puml` | — | — |
| **Service** (logique métier) | Idem | Idem | — | `security-review` |
| **Factory** (injection) | — | — | — | — |

---

#### C.2 — Hooks React Query

| Tâche | Activité | Séquence | Wireframes | Skills |
|-------|----------|----------|------------|--------|
| `useAgentsRecouvrement` | `activity/ListerAgents.puml`, `activity/RechercherAgents.puml` | `sequence/SEQ_ListerAgents.puml`, `SEQ_RechercherAgents.puml` | `ui/WIREFRAME_LISTE.md` | — |
| `useAgentsRecouvrementStats` | `activity/StatsAgents.puml` | `sequence/SEQ_StatsAgents.puml` | `ui/WIREFRAME_LISTE.md` | — |
| `useAgentRecouvrement` | `activity/VoirDetailsAgent.puml` | `sequence/SEQ_VoirDetailsAgent.puml` | `ui/WIREFRAME_DETAILS.md` | — |
| `useCreateAgentRecouvrement` | `activity/CreerAgent.puml` | `sequence/SEQ_CreerAgent.puml` | `ui/WIREFRAME_MODALS.md` | — |
| `useUpdateAgentRecouvrement` | `activity/ModifierAgent.puml` | `sequence/SEQ_ModifierAgent.puml` | `ui/WIREFRAME_MODALS.md` | — |
| `useDeactivateAgentRecouvrement` | `activity/DesactiverAgent.puml` | `sequence/SEQ_DesactiverAgent.puml` | `ui/WIREFRAME_MODALS.md` | — |
| `useDeleteAgentRecouvrement` | `activity/SupprimerAgent.puml` | `sequence/SEQ_SupprimerAgent.puml` | `ui/WIREFRAME_MODALS.md` | — |

---

#### C.3 — Composants UI

| Tâche | Activité | Séquence | Wireframes | Skills |
|-------|----------|----------|------------|--------|
| **Page liste** (stats carousel, badges carousel, cards, pagination) | `activity/ListerAgents.puml`, `activity/StatsAgents.puml` | `sequence/SEQ_ListerAgents.puml`, `SEQ_StatsAgents.puml` | `ui/WIREFRAME_LISTE.md` | `shadcn-ui`, `tailwind-design-system`, `tailwind-patterns` |
| **Page détails** (nom/prénom/âge, alertes, actions) | `activity/VoirDetailsAgent.puml`, `activity/NotificationsAgent.puml` | `sequence/SEQ_VoirDetailsAgent.puml`, `SEQ_NotificationsAgent.puml` | `ui/WIREFRAME_DETAILS.md` | `shadcn-ui`, `tailwind-design-system` |
| **CreateAgentModal** | `activity/CreerAgent.puml` | `sequence/SEQ_CreerAgent.puml` | `ui/WIREFRAME_MODALS.md` | `shadcn-ui`, `security-review` |
| **EditAgentModal** | `activity/ModifierAgent.puml` | `sequence/SEQ_ModifierAgent.puml` | `ui/WIREFRAME_MODALS.md` | `shadcn-ui`, `security-review` |
| **DesactiverAgentModal** | `activity/DesactiverAgent.puml` | `sequence/SEQ_DesactiverAgent.puml` | `ui/WIREFRAME_MODALS.md` | `shadcn-ui` |
| **SupprimerAgentModal** | `activity/SupprimerAgent.puml` | `sequence/SEQ_SupprimerAgent.puml` | `ui/WIREFRAME_MODALS.md` | `shadcn-ui`, `security-review` |
| **AgentRecouvrementSelect** | `activity/SelectionnerAgentCredit.puml`, `SelectionnerAgentCaisse.puml`, `SelectionnerAgentCI.puml` | `sequence/SEQ_SelectionnerAgent*.puml` | `ui/WIREFRAME_MODALS.md` | `shadcn-ui` |

---

#### C.4 — Intégration modules existants

| Tâche | Activité | Séquence | Wireframes | Skills |
|-------|----------|----------|------------|--------|
| **Crédit spéciale** (agentRecouvrementId + select) | `activity/SelectionnerAgentCredit.puml` | `sequence/SEQ_SelectionnerAgentCredit.puml` | `ui/WIREFRAME_MODALS.md` (Select) | `shadcn-ui`, `security-review` |
| **Caisse spéciale** (agentRecouvrementId + select) | `activity/SelectionnerAgentCaisse.puml` | `sequence/SEQ_SelectionnerAgentCaisse.puml` | `ui/WIREFRAME_MODALS.md` (Select) | `shadcn-ui`, `security-review` |
| **Caisse imprévue** (agentRecouvrementId + select) | `activity/SelectionnerAgentCI.puml` | `sequence/SEQ_SelectionnerAgentCI.puml` | `ui/WIREFRAME_MODALS.md` (Select) | `shadcn-ui`, `security-review` |

---

#### C.5 — Cloud Function (optionnel)

| Tâche | Activité | Séquence | Wireframes | Skills |
|-------|----------|----------|------------|--------|
| `agentRecouvrementNotifications` (anniversaire, pièce expirée) | `activity/CloudFunctionNotificationsAgent.puml` | `sequence/SEQ_CloudFunctionNotificationsAgent.puml` | `ui/WIREFRAME_DETAILS.md` (alertes) | `security-review` |

### Étape D — Firebase

| Tâche | Référence documentation | Fichier projet |
|-------|-------------------------|----------------|
| Index Firestore | [firebase/INDEXES.md](./firebase/INDEXES.md) | `firestore.indexes.json` |
| Règles Firestore | [firebase/FIRESTORE_RULES.md](./firebase/FIRESTORE_RULES.md) | `firestore.rules` |
| Règles Storage | [firebase/STORAGE_RULES.md](./firebase/STORAGE_RULES.md) | `storage.rules` |

- [ ] Ajouter les index dans `firestore.indexes.json` (voir `firebase/INDEXES.md`)
- [ ] Ajouter les règles dans `firestore.rules` (voir `firebase/FIRESTORE_RULES.md`)
- [ ] Ajouter les règles Storage dans `storage.rules` (voir `firebase/STORAGE_RULES.md`)
- [ ] Déployer en dev : `firebase deploy --only firestore:rules,firestore:indexes,storage`

### Étape E — Tests locaux

```bash
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build
pnpm test:e2e  # Si flows critiques
```

### Étape F — PR vers develop

- [ ] Documentation complète
- [ ] Tests passent
- [ ] CI vert
- [ ] Indexes déployés et construits

---

## 3) Références UI (composants à réutiliser)

| Composant | Référence | Usage |
|-----------|-----------|-------|
| **Stats Carousel** | `src/domains/memberships/components/list/MembershipsListStats.tsx` | Stats Total, Actifs, Inactifs, Hommes, Femmes |
| **Badges Carousel (tabs)** | `src/components/caisse-speciale/StatusFilterBadgesCarousel.tsx` | Tabs Actifs, Tous, Inactifs, Anniversaires (mobile/tablette) |
| **Pagination** | Pattern `/memberships`, `/membership-requests` | Pagination en haut ET en bas de la liste |

---

## 4) Checklist "go/no-go" avant prod

- [ ] Préprod OK (smoke test manuel)
- [ ] Tests E2E passent (flows agents)
- [ ] Build Next.js réussi
- [ ] Indexes Firestore construits
- [ ] Rules Firestore/Storage testées
- [ ] Sélection agent fonctionne dans Crédit, Caisse Spéciale, Caisse Imprévue
- [ ] Wireframes respectés (layout cards, disposition nom/prénom/âge, pagination haut+bas)

---

## 5) Use Cases du module — Références complètes

| UC | Description | Activité | Séquence | Wireframes | Skills |
|----|-------------|----------|----------|------------|--------|
| UC-AR-001 | Lister les agents (pagination, filtres, vue cards/liste) | [ListerAgents.puml](./activity/ListerAgents.puml), [StatsAgents.puml](./activity/StatsAgents.puml), [RechercherAgents.puml](./activity/RechercherAgents.puml) | [SEQ_ListerAgents](./sequence/SEQ_ListerAgents.puml), [SEQ_StatsAgents](./sequence/SEQ_StatsAgents.puml), [SEQ_RechercherAgents](./sequence/SEQ_RechercherAgents.puml) | [WIREFRAME_LISTE](./ui/WIREFRAME_LISTE.md) | shadcn-ui, tailwind-design-system, tailwind-patterns |
| UC-AR-002 | Créer un agent | [CreerAgent.puml](./activity/CreerAgent.puml) | [SEQ_CreerAgent](./sequence/SEQ_CreerAgent.puml) | [WIREFRAME_MODALS](./ui/WIREFRAME_MODALS.md) | shadcn-ui, security-review |
| UC-AR-003 | Modifier un agent | [ModifierAgent.puml](./activity/ModifierAgent.puml) | [SEQ_ModifierAgent](./sequence/SEQ_ModifierAgent.puml) | [WIREFRAME_MODALS](./ui/WIREFRAME_MODALS.md) | shadcn-ui, security-review |
| UC-AR-004 | Désactiver un agent | [DesactiverAgent.puml](./activity/DesactiverAgent.puml) | [SEQ_DesactiverAgent](./sequence/SEQ_DesactiverAgent.puml) | [WIREFRAME_MODALS](./ui/WIREFRAME_MODALS.md) | shadcn-ui |
| UC-AR-010 | Supprimer un agent | [SupprimerAgent.puml](./activity/SupprimerAgent.puml) | [SEQ_SupprimerAgent](./sequence/SEQ_SupprimerAgent.puml) | [WIREFRAME_MODALS](./ui/WIREFRAME_MODALS.md) | shadcn-ui, security-review |
| UC-AR-008 | Voir les détails d'un agent | [VoirDetailsAgent.puml](./activity/VoirDetailsAgent.puml), [NotificationsAgent.puml](./activity/NotificationsAgent.puml) | [SEQ_VoirDetailsAgent](./sequence/SEQ_VoirDetailsAgent.puml), [SEQ_NotificationsAgent](./sequence/SEQ_NotificationsAgent.puml) | [WIREFRAME_DETAILS](./ui/WIREFRAME_DETAILS.md) | shadcn-ui, tailwind-design-system |
| UC-AR-009 | Consulter les stats | [StatsAgents.puml](./activity/StatsAgents.puml) | [SEQ_StatsAgents](./sequence/SEQ_StatsAgents.puml) | [WIREFRAME_LISTE](./ui/WIREFRAME_LISTE.md) | shadcn-ui |
| UC-AR-005 | Sélectionner agent (Crédit) | [SelectionnerAgentCredit.puml](./activity/SelectionnerAgentCredit.puml) | [SEQ_SelectionnerAgentCredit](./sequence/SEQ_SelectionnerAgentCredit.puml) | [WIREFRAME_MODALS](./ui/WIREFRAME_MODALS.md) | shadcn-ui, security-review |
| UC-AR-006 | Sélectionner agent (Caisse spéciale) | [SelectionnerAgentCaisse.puml](./activity/SelectionnerAgentCaisse.puml) | [SEQ_SelectionnerAgentCaisse](./sequence/SEQ_SelectionnerAgentCaisse.puml) | [WIREFRAME_MODALS](./ui/WIREFRAME_MODALS.md) | shadcn-ui, security-review |
| UC-AR-007 | Sélectionner agent (Caisse imprévue) | [SelectionnerAgentCI.puml](./activity/SelectionnerAgentCI.puml) | [SEQ_SelectionnerAgentCI](./sequence/SEQ_SelectionnerAgentCI.puml) | [WIREFRAME_MODALS](./ui/WIREFRAME_MODALS.md) | shadcn-ui, security-review |

---

**Note** : Ce workflow doit être suivi en complément du workflow général `documentation/general/WORKFLOW.md`. Les règles de branching, commits, CI/CD et tests s'appliquent sans exception.
