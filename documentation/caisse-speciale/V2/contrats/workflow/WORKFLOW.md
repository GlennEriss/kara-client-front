# Workflow d'implémentation – Contrats Caisse Spéciale V2

> Ce document organise les **tâches d'implémentation** par diagramme de séquence, dans l'ordre de réalisation, en respectant l'**architecture workflow hybride** du projet KARA.

**Référence obligatoire :** [documentation/general/WORKFLOW.md](../../../../general/WORKFLOW.md)

---

## Comment utiliser ce workflow

1. **Ce workflow est le guide** pour réaliser le projet. C'est à travers lui que l'implémentation est menée.
2. **Avant chaque phase** : consulter les **diagrammes de séquence** correspondants. L'implémentation doit suivre fidèlement les interactions décrites (Page → Composant → Hook → Service → Repository → Firestore).
3. **Skills** : pour chaque phase, activer les skills listés.
4. **Mettre à jour le workflow** au fur et à mesure : cocher les tâches réalisées.

---

## Répertoire des skills

| Skill | Chemin | Usage |
|-------|--------|-------|
| **security-review** | `.cursor/skills/security-review/SKILL.md` | Auth, validation entrées, uploads, règles Firestore |
| **shadcn-ui** | `.cursor/skills/shadcn-ui/SKILL.md` | Composants UI |
| **tailwind-design-system** | `.cursor/skills/tailwind-design-system/SKILL.md` | Design System |
| **tailwind-patterns** | `.cursor/skills/tailwind-patterns/SKILL.md` | Tailwind v4 |
| **react-pdf** | `.cursor/skills/react-pdf/SKILL.md` | Génération PDF |

---

## Table des matières

1. [Contexte et ordre d'implémentation](#1-contexte-et-ordre-dimplémentation)
2. [Phase initiale – Créer la branche](#phase-initiale--créer-la-branche)
3. [Phase 0 – Infrastructure Firebase](#phase-0--infrastructure-firebase)
4. [Phase 1 – ListerContrats](#phase-1--listercontrats)
5. [Phase 2 – FiltrerContrats](#phase-2--filtrercontrats)
6. [Phase 3 – RechercherContrats](#phase-3--recherchercontrats)
7. [Phase 4 – VoirDetailsContrat](#phase-4--voirdetailscontrat)
8. [Phase 5 – CreerContrat](#phase-5--creercontrat)
9. [Phase 6 – TeleverserContratPDF](#phase-6--televersercontratpdf)
10. [Phase 7 – ConsulterVersements](#phase-7--consulterversements)
11. [Phase 8 – Exports](#phase-8--exports)
12. [Tests à réaliser](#tests-à-réaliser)
13. [Definition of Done](#definition-of-done)

---

## 1. Contexte et ordre d'implémentation

### Principe

Les diagrammes de séquence sont implémentés **dans l'ordre des dépendances** :

```
Phase 0 (Infra) → Phase 1 (Liste) → Phase 2 (Filtres) → Phase 3 (Recherche)
                                                        ↓
Phase 4 (Détails) → Phase 5 (Création) → Phase 6 (PDF) → Phase 7 (Versements) → Phase 8 (Exports)
```

### Diagrammes de séquence (ordre d'implémentation)

| Phase | Diagramme | Fichier | Dépendances |
|-------|-----------|---------|-------------|
| Initiale | — | Créer branche | — |
| 0 | Infrastructure | — | Branche créée |
| 1 | ListerContrats | [SEQ_ListerContrats.puml](../sequence/SEQ_ListerContrats.puml) | Phase 0 |
| 2 | FiltrerContrats | [SEQ_FiltrerContrats.puml](../sequence/SEQ_FiltrerContrats.puml) | Phase 1 |
| 3 | RechercherContrats | [SEQ_RechercherContrats.puml](../sequence/SEQ_RechercherContrats.puml) | Phase 2 |
| 4 | VoirDetailsContrat | [SEQ_VoirDetailsContrat.puml](../sequence/SEQ_VoirDetailsContrat.puml) | Phase 1 |
| 5 | CreerContrat | [SEQ_CreerContrat.puml](../sequence/SEQ_CreerContrat.puml) | Phase 0, 1 |
| 6 | TeleverserContratPDF | [SEQ_TeleverserContratPDF.puml](../sequence/SEQ_TeleverserContratPDF.puml) | Phase 4 |
| 7 | ConsulterVersements | [SEQ_ConsulterVersements.puml](../sequence/SEQ_ConsulterVersements.puml) | Phase 4 |
| 8 | Exports | [SEQ_ExporterListeContrats.puml](../sequence/SEQ_ExporterListeContrats.puml) + [SEQ_ExporterVersements.puml](../sequence/SEQ_ExporterVersements.puml) | Phase 1, 7 |

---

## Phase initiale – Créer la branche

**Référence :** [documentation/general/WORKFLOW.md](../../../../general/WORKFLOW.md) – Étape C

### Tâches

- [ ] **Init.1** `git checkout develop` puis `git pull`
- [ ] **Init.2** `git checkout -b refactor/caisse-speciale-contrats-v2`

---

## Phase 0 – Infrastructure Firebase

**Skills :** [security-review](../../../../../.cursor/skills/security-review/SKILL.md)

**Référence :** [firebase/FIREBASE.md](../firebase/FIREBASE.md)

### Tâches

- [ ] **0.1** Intégrer règles Firestore `caisseContracts` + sous-collections `payments`, `refunds`
- [ ] **0.2** Vérifier règles Storage (PDF contrats, remboursements, preuves paiement)
- [ ] **0.3** Ajouter index Firestore nécessaires

---

## Phase 1 – ListerContrats

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md), [tailwind-design-system](../../../../../.cursor/skills/tailwind-design-system/SKILL.md), [tailwind-patterns](../../../../../.cursor/skills/tailwind-patterns/SKILL.md)

**Référence :** [SEQ_ListerContrats.puml](../sequence/SEQ_ListerContrats.puml) | [ListerContrats.puml](../activite/ListerContrats.puml)

### Tâches

#### Repository / Service
- [ ] **1.1** `getContractsWithFilters` retourne `{ items, total }` (pagination Firestore)
- [ ] **1.2** `getContractsStats` côté repo (counts par statut/type)

#### Hooks
- [ ] **1.3** `useCaisseContracts` + `useCaisseContractsStats` (React Query)

#### UI
- [ ] **1.4** Stats affichées AVANT les tabs (C.1)
- [ ] **1.5** Pagination standard (Affichage 1-12 sur X)
- [ ] **1.6** Bouton Actualiser → invalidateQueries

---

## Phase 2 – FiltrerContrats

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md)

**Référence :** [SEQ_FiltrerContrats.puml](../sequence/SEQ_FiltrerContrats.puml)

### Tâches

- [ ] **2.1** Filtres statut / type / caisse / dates
- [ ] **2.2** `overdueOnly` dans les filtres (UC6)
- [ ] **2.3** Reset pagination à chaque changement de filtre

---

## Phase 3 – RechercherContrats

**Skills :** [security-review](../../../../../.cursor/skills/security-review/SKILL.md)

**Référence :** [SEQ_RechercherContrats.puml](../sequence/SEQ_RechercherContrats.puml)

### Tâches

- [ ] **3.1** Ajouter `searchableText*` sur `caisseContracts`
- [ ] **3.2** Recherche Firestore fusionnée (3 requêtes)
- [ ] **3.3** Débounce + min 2 caractères

---

## Phase 4 – VoirDetailsContrat

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md)

**Référence :** [SEQ_VoirDetailsContrat.puml](../sequence/SEQ_VoirDetailsContrat.puml)

### Tâches

- [ ] **4.1** Détails accessibles même sans PDF (bannière + CTA)
- [ ] **4.2** Cartes infos membre/groupe + contact d'urgence
- [ ] **4.3** Lien vers versements / exports

---

## Phase 5 – CreerContrat

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md), [security-review](../../../../../.cursor/skills/security-review/SKILL.md)

**Référence :** [SEQ_CreerContrat.puml](../sequence/SEQ_CreerContrat.puml)

### Tâches

- [ ] **5.1** Page `/caisse-speciale/contrats/nouveau` (wizard)
- [ ] **5.2** Validation Zod + création contrat
- [ ] **5.3** Génération versements planifiés

---

## Phase 6 – TeleverserContratPDF

**Skills :** [security-review](../../../../../.cursor/skills/security-review/SKILL.md)

**Référence :** [SEQ_TeleverserContratPDF.puml](../sequence/SEQ_TeleverserContratPDF.puml)

### Tâches

- [ ] **6.1** Upload PDF signé (Storage + metadata contractPdf)
- [ ] **6.2** Invalidation cache liste + détail

---

## Phase 7 – ConsulterVersements

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md)

**Référence :** [SEQ_ConsulterVersements.puml](../sequence/SEQ_ConsulterVersements.puml)

### Tâches

- [ ] **7.1** Liste versements (paiements) + détails
- [ ] **7.2** Badges bonus/pénalités

---

## Phase 8 – Exports

**Skills :** [react-pdf](../../../../../.cursor/skills/react-pdf/SKILL.md)

**Référence :** [SEQ_ExporterListeContrats.puml](../sequence/SEQ_ExporterListeContrats.puml), [SEQ_ExporterVersements.puml](../sequence/SEQ_ExporterVersements.puml)

### Tâches

- [ ] **8.1** Export liste contrats (CSV/Excel + PDF)
- [ ] **8.2** Export versements (PDF + Excel)

---

## Tests à réaliser

- [ ] Stats chargées une seule fois (cache)
- [ ] Pagination Firestore (page 1/2/3)
- [ ] Recherche par nom + matricule
- [ ] Filtres combinés (statut + dates + type)
- [ ] Détails accessibles sans PDF
- [ ] Upload PDF + refresh listes
- [ ] Exports PDF/Excel

---

## Definition of Done

- [ ] Diagrammes alignés avec l'implémentation
- [ ] Rules Firestore/Storage en place
- [ ] Tests essentiels OK
- [ ] Documentation mise à jour
