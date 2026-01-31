# Workflow d'implémentation – Demandes Caisse Spéciale V2

> Ce document organise les **tâches d'implémentation** par diagramme de séquence, dans l'ordre de réalisation, en respectant l'**architecture workflow hybride** du projet KARA.

**Référence obligatoire :** [documentation/general/WORKFLOW.md](../../../../general/WORKFLOW.md)

---

## Comment utiliser ce workflow

1. **Ce workflow est le guide** pour réaliser le projet. C'est à travers lui que l'implémentation est menée.
2. **Avant chaque phase** : consulter les **diagrammes de séquence** correspondants. L'implémentation doit suivre fidèlement les interactions décrites (Page → Composant → Hook → Service → Repository → Firestore).
3. **Skills** : pour chaque phase, activer les skills listés (dossier `.cursor/skills/`).
4. **Mettre à jour le workflow** au fur et à mesure : cocher les tâches réalisées, corriger ou adapter ce qui a été fait si nécessaire.

---

## Répertoire des skills (`.cursor/skills/`)

| Skill | Chemin | Usage |
|-------|--------|-------|
| **security-review** | `.cursor/skills/security-review/SKILL.md` | Auth, validation entrées, uploads, règles Firestore, données sensibles |
| **shadcn-ui** | `.cursor/skills/shadcn-ui/SKILL.md` | Composants UI (Button, Card, Form, Table, etc.) |
| **tailwind-design-system** | `.cursor/skills/tailwind-design-system/SKILL.md` | Design System, tokens, responsive |
| **tailwind-patterns** | `.cursor/skills/tailwind-patterns/SKILL.md` | Tailwind v4, patterns CSS |
| **react-pdf** | `.cursor/skills/react-pdf/SKILL.md` | Génération PDF (@react-pdf/renderer) |

---

## Table des matières

1. [Contexte et ordre d'implémentation](#1-contexte-et-ordre-dimplémentation)
2. [Phase initiale – Créer la branche](#phase-initiale--créer-la-branche)
3. [Phase 0 – Infrastructure Firebase](#phase-0--infrastructure-firebase)
3. [Phase 1 – ListerDemandes](#phase-1--listerdemandes)
4. [Phase 2 – FiltrerDemandes](#phase-2--filtrerdemandes)
5. [Phase 3 – VoirDetails](#phase-3--voirdetails)
6. [Phase 4 – CreerDemande](#phase-4--creerdemande)
7. [Phase 5 – Actions (Accepter, Refuser, Réouvrir, Convertir)](#phase-5--actions-accepter-refuser-réouvrir-convertir)
8. [Phase 6 – ExporterDetailsDemande](#phase-6--exporterdetailsdemande)
9. [Tests à réaliser](#9-tests-à-réaliser)
10. [Definition of Done](#10-definition-of-done)

---

## 1. Contexte et ordre d'implémentation

### Principe

Les diagrammes de séquence sont implémentés **dans l'ordre des dépendances** :

```
Phase 0 (Infra) → Phase 1 (Liste) → Phase 2 (Filtres) → Phase 3 (Détails)
                                                              ↓
Phase 6 (Export) ← Phase 5 (Actions) ← Phase 4 (Création)
```

### Diagrammes de séquence (ordre d'implémentation)

| Phase | Diagramme | Fichier | Dépendances |
|-------|-----------|---------|-------------|
| Initiale | — | Créer branche | — |
| 0 | Infrastructure | — | Branche créée |
| 1 | ListerDemandes | [SEQ_ListerDemandes.puml](../sequence/SEQ_ListerDemandes.puml) | Phase 0 |
| 2 | FiltrerDemandes | [SEQ_FiltrerDemandes.puml](../sequence/SEQ_FiltrerDemandes.puml) | Phase 1 |
| 3 | VoirDetails | [SEQ_VoirDetails.puml](../sequence/SEQ_VoirDetails.puml) | Phase 1 |
| 4 | CreerDemande | [SEQ_CreerDemande.puml](../sequence/SEQ_CreerDemande.puml) | Phase 0, 1 |
| 5 | AccepterDemande | [SEQ_AccepterDemande.puml](../sequence/SEQ_AccepterDemande.puml) | Phase 3 |
| 5 | RefuserDemande | [SEQ_RefuserDemande.puml](../sequence/SEQ_RefuserDemande.puml) | Phase 3 |
| 5 | ReouvrirDemande | [SEQ_ReouvrirDemande.puml](../sequence/SEQ_ReouvrirDemande.puml) | Phase 3 |
| 5 | ConvertirContrat | [SEQ_ConvertirContrat.puml](../sequence/SEQ_ConvertirContrat.puml) | Phase 3 |
| 6 | ExporterDetailsDemande | [SEQ_ExporterDetailsDemande.puml](../sequence/SEQ_ExporterDetailsDemande.puml) | Phase 3 |

---

## Phase initiale – Créer la branche

**Skills :** — (aucun)

**Référence :** [documentation/general/WORKFLOW.md](../../../../general/WORKFLOW.md) – Étape C

> ⚠️ **Première étape obligatoire** : créer la branche avant toute implémentation.

### Tâches

- [ ] **Init.1** Depuis `develop` : `git checkout develop` puis `git pull`
- [ ] **Init.2** Créer la branche : `git checkout -b refactor/caisse-speciale-demandes-v2`
- [ ] **Init.3** Convention de nommage : `refactor/<module>` ou `feat/<feature>` selon le cas

### Exemple

```bash
git checkout develop
git pull
git checkout -b refactor/caisse-speciale-demandes-v2
```

---

## Phase 0 – Infrastructure Firebase

**Skills :** [security-review](../../../../../.cursor/skills/security-review/SKILL.md) — Règles Firestore/Storage, validation des champs, accès admin uniquement

**Référence :** [firebase/FIREBASE.md](../firebase/FIREBASE.md) – Règles et index à intégrer.

### Tâches

- [ ] **0.1** Intégrer les règles Firestore `caisseSpecialeDemands` dans `firestore.rules`
- [ ] **0.2** Vérifier les règles Storage `emergency-contacts` (réutilisées pour photos contact d'urgence)
- [ ] **0.3** Ajouter les index Firestore dans `firestore.indexes.json` (voir FIREBASE.md section 3)
- [ ] **0.4** Déployer et vérifier : `firebase deploy --only firestore`
- [ ] **0.5** Attendre que les index soient construits (Firebase Console > Firestore > Indexes)

### Tests

- [ ] Règles Firestore : lecture/écriture admin uniquement
- [ ] Index : requêtes `status` + `createdAt`, `searchableText*` + `createdAt` fonctionnent

---

## Phase 1 – ListerDemandes

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md), [tailwind-design-system](../../../../../.cursor/skills/tailwind-design-system/SKILL.md), [tailwind-patterns](../../../../../.cursor/skills/tailwind-patterns/SKILL.md), [react-pdf](../../../../../.cursor/skills/react-pdf/SKILL.md) — Tableau, cards, pagination, exports PDF/Excel

**Avant implémentation :** consulter le diagramme de séquence pour comprendre les interactions (Page → Composant → Hook → Service → Repository → Firestore).

**Référence :** [SEQ_ListerDemandes.puml](../sequence/SEQ_ListerDemandes.puml) | [ListerDemandes.puml](../activite/ListerDemandes.puml)

### Tâches

#### Repository

- [ ] **1.1** Modifier `getDemandsWithFilters` pour retourner `{ items: Demand[], total: number }` (pagination côté Firestore)
- [ ] **1.2** Implémenter `getCountFromServer` ou requête dédiée pour le total
- [ ] **1.3** Optimiser `getDemandsStats` : requêtes Firestore dédiées par statut (éviter `getDemandsWithFilters({})`)

#### Hooks

- [ ] **1.4** Adapter `useCaisseSpecialeDemands` : `{ data: { items, total }, isLoading }`
- [ ] **1.5** Adapter `useCaisseSpecialeDemandsStats` : cache 2 min, chargement unique
- [ ] **1.6** Implémenter `queryClient.invalidateQueries` sur "Actualiser"

#### Composants

- [ ] **1.7** Inverser l'ordre : **StatisticsCaisseSpecialeDemandes** AVANT les onglets (C.1)
- [ ] **1.8** Implémenter vue **tableau** (colonnes : Matricule, Nom, Prénom, Contacts demandeur, Montant, Durée, Date souhaitée, Statut, Contact d'urgence, Actions) (C.5)
- [ ] **1.9** Afficher **contacts du demandeur** (téléphone, email) via `useMember(demand.memberId)` sur cards et tableau (1.3)
- [ ] **1.10** Afficher **contact d'urgence** sur cards et tableau via `demand.emergencyContact` (1.4)
- [ ] **1.11** Bouton "Nouvelle Demande" → `router.push('/caisse-speciale/demandes/nouvelle')` (C.6)
- [ ] **1.12** Boutons "Exporter PDF" et "Exporter Excel" (barre d'actions) (1.6)
- [ ] **1.13** Pagination : "Affichage 1-12 sur X", Précédent/Suivant
- [ ] **1.14** Breadcrumbs : `/caisse-speciale/demandes` → "Demandes"

### Tests

- [ ] `getDemandsWithFilters` retourne `{ items, total }`
- [ ] `getDemandsStats` n'appelle pas `getDemandsWithFilters` avec toutes les demandes
- [ ] Stats affichées avant les onglets
- [ ] Changement d'onglet ne recharge pas les stats
- [ ] Bouton "Actualiser" invalide cache et refetch

---

## Phase 2 – FiltrerDemandes

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md), [tailwind-design-system](../../../../../.cursor/skills/tailwind-design-system/SKILL.md), [tailwind-patterns](../../../../../.cursor/skills/tailwind-patterns/SKILL.md), [security-review](../../../../../.cursor/skills/security-review/SKILL.md) — Barre de filtres, recherche, validation entrées

**Avant implémentation :** consulter le diagramme de séquence.

**Référence :** [SEQ_FiltrerDemandes.puml](../sequence/SEQ_FiltrerDemandes.puml) | [FiltrerDemandes.puml](../activite/FiltrerDemandes.puml) | [RechercherDemandes.puml](../activite/RechercherDemandes.puml)

### Tâches

#### Repository

- [ ] **2.1** Implémenter `getPaginatedWithSearchMerge` : 3 requêtes parallèles sur `searchableText`, `searchableTextFirstNameFirst`, `searchableTextMatriculeFirst` (C.8)
- [ ] **2.2** Fusionner et dédupliquer les résultats des 3 requêtes
- [ ] **2.3** Appliquer filtres Firestore : `status`, `caisseType`, `createdAt` (range), `desiredDate` (range si possible)
- [ ] **2.4** Pagination : `limit`, `startAfter` / `startAt`

#### Hooks

- [ ] **2.5** Adapter `useCaisseSpecialeDemands` pour passer `search` aux filtres
- [ ] **2.6** Debounce 300 ms sur le champ de recherche
- [ ] **2.7** Reset `page = 1` à chaque changement de filtre ou recherche

#### Composants

- [ ] **2.8** Barre de filtres : recherche (placeholder "Rechercher par nom, prénom ou matricule..."), statut, dates (création, souhaitée), type caisse
- [ ] **2.9** Recherche : minimum 2 caractères pour lancer
- [ ] **2.10** Badge "X filtres actifs" si filtres appliqués
- [ ] **2.11** Bouton "Réinitialiser filtres"

### Tests

- [ ] Recherche "Bernadette" retourne les demandes du membre (3 searchableText)
- [ ] Filtre statut + recherche combinés
- [ ] Filtre date création + statut
- [ ] Pagination reset à 1 lors d'un changement de filtre
- [ ] Debounce évite les requêtes à chaque frappe

---

## Phase 3 – VoirDetails

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md), [tailwind-design-system](../../../../../.cursor/skills/tailwind-design-system/SKILL.md), [tailwind-patterns](../../../../../.cursor/skills/tailwind-patterns/SKILL.md) — Cartes, tableau versements, boutons d'action

**Avant implémentation :** consulter le diagramme de séquence.

**Référence :** [SEQ_VoirDetails.puml](../sequence/SEQ_VoirDetails.puml) | [VoirDetails.puml](../activite/VoirDetails.puml)

### Tâches

#### Page

- [ ] **3.1** Créer page `/caisse-speciale/demandes/[id]`
- [ ] **3.2** Breadcrumbs : `/caisse-speciale/demandes/[id]` → "Détails"

#### Composants

- [ ] **3.3** Carte "Informations du membre" : nom, prénom, matricule, contacts via `useMember(demand.memberId)` (2.1, 2.2)
- [ ] **3.4** Carte "Contact d'urgence" : nom, prénom, téléphones, lien de parenté depuis `demand.emergencyContact` (2.3)
- [ ] **3.5** Tableau récapitulatif des versements (Mois, Date, Montant FCFA, Cumulé, Total) calculé depuis `monthlyAmount`, `monthsPlanned`, `desiredDate`
- [ ] **3.6** Affichage traçabilité : "Accepté par X le DD/MM/YYYY", "Refusé par Y le DD/MM/YYYY", etc.
- [ ] **3.7** Boutons d'action : Accepter, Refuser, Réouvrir, Convertir (selon statut)
- [ ] **3.8** Bouton "Exporter en PDF" (détails complets)

### Tests

- [ ] Page détails affiche membre et contact d'urgence
- [ ] Tableau versements calculé correctement
- [ ] Traçabilité affichée pour les demandes traitées

---

## Phase 4 – CreerDemande

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md), [tailwind-design-system](../../../../../.cursor/skills/tailwind-design-system/SKILL.md), [tailwind-patterns](../../../../../.cursor/skills/tailwind-patterns/SKILL.md), [security-review](../../../../../.cursor/skills/security-review/SKILL.md) — Formulaire multi-étapes, validation Zod, upload photo contact d'urgence

**Avant implémentation :** consulter le diagramme de séquence.

**Référence :** [SEQ_CreerDemande.puml](../sequence/SEQ_CreerDemande.puml) | [CreerDemande.puml](../activite/CreerDemande.puml)

### Tâches

#### Page

- [ ] **4.1** Créer page `/caisse-speciale/demandes/nouvelle` (C.6)
- [ ] **4.2** Référence : `caisse-imprevue/demandes/add/page.tsx`

#### Formulaire

- [ ] **4.3** Formulaire 3 étapes : (1) Sélection membre, (2) Infos demande, (3) Contact d'urgence (C.0)
- [ ] **4.4** Étape 3 : `EmergencyContactMemberSelector` (réutiliser Caisse Imprévue)
- [ ] **4.5** Validation `emergencyContactCISchema` et `caisseSpecialeDemandFormSchema`
- [ ] **4.6** Persistance localStorage (éviter perte si fermeture accidentelle)

#### Service & Repository

- [ ] **4.7** `createDemand` : enregistrer `createdBy: adminId` (C.7)
- [ ] **4.8** `createDemand` : calculer et stocker `searchableText`, `searchableTextFirstNameFirst`, `searchableTextMatriculeFirst` via `generateAllDemandSearchableTexts()` (C.8)
- [ ] **4.9** Générer ID custom : `MK_DEMANDE_CS_{matricule}_{DDMMYY}_{HHMM}`

#### Post-création

- [ ] **4.10** Notification : `createNotification(module: 'caisse_speciale', type: 'new_request')`
- [ ] **4.11** Redirection vers `/caisse-speciale/demandes` + toast succès
- [ ] **4.12** Invalidation cache : `invalidateQueries(['caisseSpecialeDemands', 'caisseSpecialeDemandsStats'])`

### Tests

- [ ] Création avec contact d'urgence obligatoire
- [ ] `createdBy` enregistré dans Firestore
- [ ] 3 searchableText générés et stockés
- [ ] Redirection et invalidation cache après création

---

## Phase 5 – Actions (Accepter, Refuser, Réouvrir, Convertir)

**Skills :** [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md), [tailwind-design-system](../../../../../.cursor/skills/tailwind-design-system/SKILL.md), [security-review](../../../../../.cursor/skills/security-review/SKILL.md) — Modals confirmation, validation motif (min 10 caractères), traçabilité

**Avant implémentation :** consulter les diagrammes de séquence de chaque action.

**Références :** [SEQ_AccepterDemande.puml](../sequence/SEQ_AccepterDemande.puml) | [SEQ_RefuserDemande.puml](../sequence/SEQ_RefuserDemande.puml) | [SEQ_ReouvrirDemande.puml](../sequence/SEQ_ReouvrirDemande.puml) | [SEQ_ConvertirContrat.puml](../sequence/SEQ_ConvertirContrat.puml)

### Tâches communes

- [ ] **5.0** Traçabilité : enregistrer **qui** (adminId, adminName) et **quand** (timestamp) pour chaque action

### AccepterDemande

- [ ] **5.1** Enregistrer `approvedBy`, `approvedAt`, `approvedByName`, `approveReason`
- [ ] **5.2** Créer contrat via `subscribe()` (Caisse Spéciale)
- [ ] **5.3** Mettre à jour demande : `status: 'CONVERTED'`, `contractId`
- [ ] **5.4** Notification membre et admin créateur

### RefuserDemande

- [ ] **5.5** Enregistrer `rejectedBy`, `rejectedAt`, `rejectedByName`, `rejectReason`
- [ ] **5.6** Mettre à jour `status: 'REJECTED'`
- [ ] **5.7** Validation : motif min 10 caractères

### ReouvrirDemande

- [ ] **5.8** Vérifier `status === 'REJECTED'`
- [ ] **5.9** Enregistrer `reopenedBy`, `reopenedAt`, `reopenedByName`, `reopenReason`
- [ ] **5.10** Mettre à jour `status: 'PENDING'`

### ConvertirContrat

- [ ] **5.11** Vérifier `status === 'APPROVED'` et pas de `contractId`
- [ ] **5.12** Créer contrat via `subscribe()`
- [ ] **5.13** Enregistrer `convertedBy`, `convertedAt`, `convertedByName`, `contractId`
- [ ] **5.14** Mettre à jour `status: 'CONVERTED'`

### Tests

- [ ] Accepter : traçabilité + contrat créé
- [ ] Refuser : traçabilité + motif validé
- [ ] Réouvrir : uniquement si REJECTED
- [ ] Convertir : uniquement si APPROVED sans contractId

---

## Phase 6 – ExporterDetailsDemande

**Skills :** [react-pdf](../../../../../.cursor/skills/react-pdf/SKILL.md), [shadcn-ui](../../../../../.cursor/skills/shadcn-ui/SKILL.md) — Génération PDF avec @react-pdf/renderer (détails + tableau versements)

**Avant implémentation :** consulter le diagramme de séquence.

**Référence :** [SEQ_ExporterDetailsDemande.puml](../sequence/SEQ_ExporterDetailsDemande.puml) | [ExporterDetailsDemande.puml](../activite/ExporterDetailsDemande.puml)

### Tâches

- [ ] **6.1** Service `DemandExportService.exportDemandDetailsToPDF` (détails + tableau versements)
- [ ] **6.2** Export PDF du tableau versements (optionnel : Excel)
- [ ] **6.3** Référence : Caisse Imprévue `DemandExportService`

### Tests

- [ ] Export PDF génère un fichier valide
- [ ] Contenu : infos membre, contact urgence, tableau versements

---

## 9. Tests à réaliser

### Tests unitaires (Vitest)

| Module | Fichier | Couverture minimale |
|--------|---------|---------------------|
| Repository | `CaisseSpecialeDemandRepository` | 80% |
| Service | `CaisseSpecialeService` | 80% |
| Hooks | `useCaisseSpecialeDemands`, `useCaisseSpecialeDemandsStats` | 80% |
| Utils | `demandSearchableText.ts` | 90% |
| Schemas | `caisseSpecialeDemandFormSchema`, `emergencyContactCISchema` | 90% |

### Tests composants (React Testing Library)

- [ ] `ListDemandes` : affichage stats, onglets, tableau
- [ ] `CreateDemandFormV2` : validation étapes, soumission
- [ ] `DemandDetail` : affichage membre, contact urgence, actions

### Tests E2E (Playwright)

- [ ] Parcours complet : Liste → Détails → Accepter
- [ ] Parcours : Liste → Nouvelle Demande → Création → Liste
- [ ] Parcours : Liste → Recherche → Filtres → Résultats

### Commandes (voir [WORKFLOW.md général](../../../general/WORKFLOW.md))

```bash
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build
pnpm test:e2e
```

---

## 10. Definition of Done

Pour chaque phase, avant passage à la suivante :

- [ ] Code respecte l'architecture : Page → Composant → Hook → Service → Repository → Firestore
- [ ] Design System KARA (couleurs, shadcn UI)
- [ ] Responsive (mobile, tablette, desktop)
- [ ] Validation Zod pour formulaires
- [ ] Tests locaux passent (`pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`)
- [ ] Tests E2E passent pour les flows critiques (Phase 1, 4, 5)
- [ ] Rules et indexes Firebase à jour (Phase 0)
- [ ] Aucune régression sur les fonctionnalités existantes

---

## Références

- [documentation/general/WORKFLOW.md](../../../../general/WORKFLOW.md) – Workflow hybride KARA
- [firebase/FIREBASE.md](../firebase/FIREBASE.md) – Règles et index
- [points-problematiques/POINTS_PROBLEMATIQUES.md](../points-problematiques/POINTS_PROBLEMATIQUES.md) – Points critiques
- [sequence/README.md](../sequence/README.md) – Index des diagrammes de séquence
