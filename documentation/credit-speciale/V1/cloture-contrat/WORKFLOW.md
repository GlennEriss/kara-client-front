# WORKFLOW — Clôture de contrat (Crédit spéciale)

> Guide d'implémentation complet du use case de clôture de contrat

---

## ⚠️ RÈGLE FONDAMENTALE — Avant chaque tâche

**Avant de commencer une tâche**, consulter obligatoirement :

1. **Diagramme de cas d'utilisation** : [`use-case/UC_ClotureContrat.puml`](./use-case/UC_ClotureContrat.puml)  
   → Comprendre les 4 UC, préconditions, postconditions, acteurs

2. **Diagramme d'activité** : [`activity/UC_ClotureContrat_activity.puml`](./activity/UC_ClotureContrat_activity.puml)  
   → Comprendre le flux détaillé UI → Service → Storage

3. **Diagramme de séquence** : [`sequence/UC_ClotureContrat_sequence.puml`](./sequence/UC_ClotureContrat_sequence.puml)  
   → Comprendre les interactions Page ↔ Hook ↔ Service ↔ Repo ↔ Storage

**Pour les tâches Firebase** (règles, index, storage), consulter le dossier [`firebase/`](./firebase/) :

- [`firebase/README.md`](./firebase/README.md) — Vue d'ensemble
- [`firebase/FIRESTORE_RULES.md`](./firebase/FIRESTORE_RULES.md) — Règles Firestore
- [`firebase/STORAGE_RULES.md`](./firebase/STORAGE_RULES.md) — Règles Storage
- [`firebase/INDEXES.md`](./firebase/INDEXES.md) — Index Firestore

---

## Branche GitHub

```bash
git checkout develop
git pull
git checkout -b feat/credit-speciale-cloture-contrat
```

**Convention** : `feat/<module>-<feature>`

---

## Références UML et architecture

| Document | Chemin | Usage |
|----------|--------|-------|
| Analyse | [`ANALYSE_CLOTURE_CONTRAT.md`](./ANALYSE_CLOTURE_CONTRAT.md) | Contexte, flux, règles métier |
| Use case | [`use-case/UC_ClotureContrat.puml`](./use-case/UC_ClotureContrat.puml) | 4 UC, pré/postconditions |
| Activité | [`activity/UC_ClotureContrat_activity.puml`](./activity/UC_ClotureContrat_activity.puml) | Flux détaillé |
| Séquence | [`sequence/UC_ClotureContrat_sequence.puml`](./sequence/UC_ClotureContrat_sequence.puml) | Architecture domains |
| Classes | [`documentation/uml/classes/CLASSES_CREDIT_SPECIALE.puml`](../../../uml/classes/CLASSES_CREDIT_SPECIALE.puml) | CreditContract, services, hooks |
| Firebase | [`firebase/`](./firebase/) | Règles Firestore, Storage, index |

---

# Tâches d'implémentation

---

## Tâche 1 — Vérifier les types et le modèle de données

**Diagrammes à consulter** : Use case, Activité, Séquence, Classes

**Partie du diagramme de séquence** : Toutes les phases (1 à 4) — les champs `dischargeMotif`, `dischargedBy`, `dischargedAt`, `signedQuittanceUrl`, `signedQuittanceDocumentId`, `closedAt`, `closedBy`, `motifCloture` apparaissent dans les appels `updateContract` (Phase 1 lignes 54-55, Phase 3 lignes 107, Phase 4 lignes 133).

### Objectif

Vérifier que le type `CreditContract` et les types liés incluent tous les champs du flux de clôture.

### Actions

- [ ] Vérifier dans `src/types/types.ts` : `dischargeMotif`, `dischargedBy`, `dischargedAt`, `signedQuittanceUrl`, `signedQuittanceDocumentId`, `closedAt`, `closedBy`, `motifCloture`
- [ ] Vérifier l'énumération `DocumentType` : `CREDIT_SPECIALE_QUITTANCE`, `CREDIT_SPECIALE_QUITTANCE_SIGNED`
- [ ] Ajouter les champs manquants si nécessaire

### Fichiers concernés

- `src/types/types.ts`

### Cursor Skills

- Aucun skill spécifique (types TypeScript)

---

## Tâche 2 — Étendre CreditContractRepository

**Diagrammes à consulter** : Séquence (Phase 1, 3, 4), Classes

**Partie du diagramme de séquence** :
- **Phase 1** (lignes 50-55) : `Repo.getContractById` → `Repo.updateContract(contractId, { status, dischargeMotif, dischargedAt, dischargedBy })`
- **Phase 3** (lignes 107-108) : `Repo.updateContract(contractId, { signedQuittanceUrl, signedQuittanceDocumentId })`
- **Phase 4** (lignes 128-133) : `Repo.getContractById` → `Repo.updateContract(contractId, { status, closedAt, closedBy, motifCloture })`

### Objectif

Le repository doit supporter les mises à jour partielles pour les champs de clôture. Vérifier que `updateContract` accepte les nouveaux champs.

### Actions

- [ ] Vérifier que `CreditContractRepository.updateContract()` accepte les champs : `status`, `dischargeMotif`, `dischargedBy`, `dischargedAt`, `signedQuittanceUrl`, `signedQuittanceDocumentId`, `closedAt`, `closedBy`, `motifCloture`
- [ ] Vérifier le mapping des timestamps (`dischargedAt`, `closedAt`) dans `getContractById` / `mapContractData`

### Fichiers concernés

- `src/repositories/credit-speciale/CreditContractRepository.ts`

### Cursor Skills

- Aucun skill spécifique

---

## Tâche 3 — Implémenter CreditSpecialeService (Phase 1 : validateDischarge)

**Diagrammes à consulter** : Séquence Phase 1, Activité Phase 1

**Partie du diagramme de séquence** : **Phase 1** (lignes 49-65) — flux complet : `Hook.validateFinalRepayment` → `Service.validateDischarge` → `Repo.getContractById` → `alt Montant restant = 0` → `Repo.updateContract` → `Hook.invalidateQueries` ; branche `else` : `throw Error`.

### Objectif

Implémenter `validateDischarge(contractId, motif, adminId)` dans `CreditSpecialeService`.

### Actions

- [ ] Vérifier montant restant = 0 avant mise à jour
- [ ] Mettre à jour le contrat : `status: 'DISCHARGED'`, `dischargeMotif`, `dischargedAt`, `dischargedBy`
- [ ] Lever une erreur si montant restant > 0

### Fichiers concernés

- `src/services/credit-speciale/CreditSpecialeService.ts`
- `src/services/credit-speciale/ICreditSpecialeService.ts`

### Cursor Skills

- **security-review** : Validation des entrées (motif, adminId), règles métier

---

## Tâche 4 — Implémenter CreditSpecialeService (Phase 2 : generateQuittancePDF)

**Diagrammes à consulter** : Séquence Phase 2, Activité Phase 2

**Partie du diagramme de séquence** : **Phase 2** (lignes 70-84) — flux complet : `Hook.downloadQuittance` → `Service.generateQuittancePDF` → `Repo.getContractById` → `Service` (remplir template) → `DocService.uploadDocument` → `DocRepo.createDocument` → `Storage.uploadFile` → retour `{ url, blob }` jusqu'à Page.

### Objectif

Implémenter `generateQuittancePDF(contractId)` : générer un PDF à partir du template `QUITTANCE_CREDIT_SPECIALE.docx` prérempli avec les infos du contrat.

### Actions

- [ ] Récupérer le contrat via `CreditContractRepository`
- [ ] Remplir le template avec les données du contrat (client, montant, dates, etc.)
- [ ] Générer le PDF (docx → PDF ou @react-pdf/renderer)
- [ ] Créer le document dans la collection `documents` (type `CREDIT_SPECIALE_QUITTANCE`)
- [ ] Uploader vers Storage si nécessaire (chemin `contracts-ci/{clientId}/{fileName}`)
- [ ] Retourner `{ url, blob }` pour proposer le téléchargement

### Fichiers concernés

- `src/services/credit-speciale/CreditSpecialeService.ts`
- `documentation/credit-speciale/QUITTANCE_CREDIT_SPECIALE.docx` (template)

### Cursor Skills

- **react-pdf** : Génération PDF avec @react-pdf/renderer (ou conversion docx → PDF)

---

## Tâche 5 — Implémenter CreditSpecialeService (Phase 3 : uploadSignedQuittance)

**Diagrammes à consulter** : Séquence Phase 3, Activité Phase 3

**Partie du diagramme de séquence** : **Phase 3** (lignes 97-117) — flux complet : `Hook.uploadSignedQuittance` → `Service.uploadSignedQuittance` → `Service` (valide fichier) → `alt Fichier valide` : `DocService.uploadDocument` → `DocRepo.createDocument` → `Storage.uploadFile` → `Repo.updateContract` → `Hook.invalidateQueries` ; branche `else` : `throw Error`.

### Objectif

Implémenter `uploadSignedQuittance(contractId, file, adminId)` : valider le fichier, uploader, créer le document, mettre à jour le contrat.

### Actions

- [ ] Valider le fichier : type PDF, taille max (voir `firebase/STORAGE_RULES.md`)
- [ ] Uploader via `DocumentRepository.uploadDocumentFile` (type `CREDIT_SPECIALE_QUITTANCE_SIGNED`)
- [ ] Créer le document dans la collection `documents`
- [ ] Mettre à jour le contrat : `signedQuittanceUrl`, `signedQuittanceDocumentId`

### Fichiers concernés

- `src/services/credit-speciale/CreditSpecialeService.ts`
- `src/repositories/documents/DocumentRepository.ts` (vérifier `uploadDocumentFile`)

### Cursor Skills

- **security-review** : Validation fichier (type, taille), chemins Storage

---

## Tâche 6 — Implémenter CreditSpecialeService (Phase 4 : closeContract)

**Diagrammes à consulter** : Séquence Phase 4, Activité Phase 4

**Partie du diagramme de séquence** : **Phase 4** (lignes 127-143) — flux complet : `Hook.closeContract` → `Service.closeContract` → `Repo.getContractById` → `alt Contrat DISCHARGED et quittance signée` : `Repo.updateContract` → `Hook.invalidateQueries` ; branche `else` : `throw Error`.

### Objectif

Implémenter `closeContract(contractId, { closedAt, closedBy, motifCloture })`.

### Actions

- [ ] Vérifier que le contrat est `DISCHARGED`
- [ ] Vérifier que `signedQuittanceUrl` est renseigné
- [ ] Mettre à jour le contrat : `status: 'CLOSED'`, `closedAt`, `closedBy`, `motifCloture`
- [ ] Lever une erreur si conditions non remplies

### Fichiers concernés

- `src/services/credit-speciale/CreditSpecialeService.ts`
- `src/services/credit-speciale/ICreditSpecialeService.ts`

### Cursor Skills

- **security-review** : Validation des préconditions, motif obligatoire

---

## Tâche 7 — Créer/étendre le hook useClotureContrat

**Diagrammes à consulter** : Séquence (toutes phases), Classes

**Partie du diagramme de séquence** : Toutes les phases — interactions **Hook** :
- **Phase 1** (lignes 48-59) : `validateFinalRepayment` → `validateDischarge` → `invalidateQueries(['creditContract', contractId])`
- **Phase 2** (lignes 70-82) : `downloadQuittance` → `generateQuittancePDF`
- **Phase 3** (lignes 97-112) : `uploadSignedQuittance` → `uploadSignedQuittance` → `invalidateQueries(['creditContract', contractId])`
- **Phase 4** (lignes 127-137) : `closeContract` → `closeContract` → `invalidateQueries(['creditContract', 'creditContracts'])`

### Objectif

Créer un hook `useClotureContrat` (ou étendre `useCreditSpeciale`) exposant les mutations : `validateFinalRepayment`, `downloadQuittance`, `uploadSignedQuittance`, `closeContract`.

### Actions

- [ ] Exposer les mutations React Query pour chaque opération
- [ ] Invalider les caches : `['creditContract', contractId]`, `['creditContracts']` selon les phases
- [ ] Gérer les états loading, error, success

### Fichiers concernés

- `src/hooks/useCreditSpeciale.ts` (ou nouveau `useClotureContrat.ts`)

### Cursor Skills

- Aucun skill spécifique (React Query)

---

## Tâche 8 — Créer FinalRepaymentModal (Phase 1)

**Diagrammes à consulter** : Use case UC_ValiderRemboursementFinal, Activité Phase 1, Séquence Phase 1

**Partie du diagramme de séquence** : **Phase 1** (lignes 42-60) — interactions **Page** : Admin clique « Remboursement final » → Page ouvre `FinalRepaymentModal` → Modal affiche message → Admin saisit motif et valide → `Page.validateFinalRepayment` → onSuccess : ferme modal, affiche section Déchargé.

### Objectif

Modal de validation du remboursement final avec champ motif obligatoire.

### Actions

- [ ] Message : « Acceptez-vous de valider le remboursement final de l'emprunt du membre [nom prénom] ? »
- [ ] Champ motif (obligatoire, min 10, max 500 caractères)
- [ ] Bouton « Valider le remboursement final »
- [ ] Appel à `validateFinalRepayment` via le hook
- [ ] Fermeture et callback onSuccess

### Fichiers concernés

- `src/components/credit-speciale/FinalRepaymentModal.tsx` (nouveau)

### Cursor Skills

- **shadcn-ui** : Dialog, Button, Input, Label, Form
- **tailwind-design-system** : Styles cohérents avec le Design System KARA
- **tailwind-patterns** : Responsive, spacing

---

## Tâche 9 — Intégrer la section « Remboursement final » dans CreditContractDetail

**Diagrammes à consulter** : Use case, Activité, Séquence Phase 1

**Partie du diagramme de séquence** : **Phase 1** (lignes 31-60) — flux complet Page : `useCreditContract` → affiche bouton « Remboursement final » (montant restant = 0) → au clic ouvre `FinalRepaymentModal` → après validation affiche section Déchargé (motif, admin, date) et désactive « Augmenter le crédit ».

### Objectif

Afficher le bouton « Remboursement final » lorsque `amountRemaining === 0`, juste avant la section Documents.

### Actions

- [ ] Calculer `amountRemaining` (ou le récupérer du hook/service)
- [ ] Afficher le bouton si `amountRemaining === 0` et statut non DISCHARGED/CLOSED
- [ ] Au clic : ouvrir `FinalRepaymentModal`
- [ ] Après succès : afficher la section « Déchargé » (motif, admin déchargeur, date décharge)

### Fichiers concernés

- `src/components/credit-speciale/CreditContractDetail.tsx`

### Cursor Skills

- **shadcn-ui** : Card, Button, Badge
- **tailwind-design-system** : Layout, couleurs KARA

---

## Tâche 10 — Intégrer la section « Déchargé » (Phase 2, 3, 4)

**Diagrammes à consulter** : Activité Phase 2–4, Séquence Phase 2–4

**Partie du diagramme de séquence** :
- **Phase 2** (lignes 70-84) : Page → `downloadQuittance` → téléchargement PDF proposé
- **Phase 3** (lignes 93-113) : Page ouvre dialogue upload → Admin sélectionne fichier → `uploadSignedQuittance` → affiche bouton « Quittance signée » dans Documents
- **Phase 4** (lignes 120-139) : Page formulaire (date, heure, motif) → modal double validation → `closeContract` → affiche infos clôture, désactive « Augmenter le crédit »

### Objectif

Afficher le formulaire de la section « Déchargé » : télécharger quittance, téléverser quittance signée, formulaire de clôture.

### Actions

- [ ] Bouton « Télécharger la quittance » → `downloadQuittance` → proposer téléchargement PDF
- [ ] Bouton « Téléverser la quittance signée » → ouvrir dialogue upload (PDF)
- [ ] Formulaire de clôture : date (défaut aujourd'hui), heure (défaut actuelle), motif (obligatoire)
- [ ] Bouton « Clôturer le contrat » → modal double validation
- [ ] Après clôture : afficher infos clôture (admin, date), bouton « Quittance signée » dans Documents

### Fichiers concernés

- `src/components/credit-speciale/CreditContractDetail.tsx`
- `src/components/credit-speciale/CloseContractModal.tsx` (nouveau, optionnel)
- `src/components/credit-speciale/SignedQuittanceUploadModal.tsx` (nouveau, optionnel)

### Cursor Skills

- **shadcn-ui** : Dialog, Button, Input, Form, DatePicker (si utilisé)
- **tailwind-design-system** : Layout section Déchargé
- **tailwind-patterns** : Responsive

---

## Tâche 11 — Désactiver le bouton « Augmenter le crédit »

**Diagrammes à consulter** : Use case (note règle métier), Activité

**Partie du diagramme de séquence** : **Phase 1** (ligne 60) et **Phase 4** (ligne 138) — `Page -> Page : Désactive bouton "Augmenter le crédit"` après succès décharge et après clôture.

### Objectif

Désactiver le bouton « Augmenter le crédit » lorsque le contrat est `DISCHARGED` ou `CLOSED`.

### Actions

- [ ] Vérifier l’emplacement du bouton dans `CreditContractDetail`
- [ ] Ajouter `disabled={contract.status === 'DISCHARGED' || contract.status === 'CLOSED'}`

### Fichiers concernés

- `src/components/credit-speciale/CreditContractDetail.tsx`

### Cursor Skills

- **shadcn-ui** : Button disabled state

---

## Tâche 12 — Afficher le bouton « Quittance signée » dans la section Documents

**Diagrammes à consulter** : Use case UC_CloturerContrat, Activité Phase 3–4

**Partie du diagramme de séquence** : **Phase 3** (ligne 112) et **Phase 4** (ligne 137) — `Page -> Admin : Affiche bouton "Quittance signée" dans section Documents` / `Bouton "Quittance signée" après "Contrat signé"`.

### Objectif

Afficher le bouton « Quittance signée » après « Contrat signé » dans la section Documents lorsque la quittance est téléversée.

### Actions

- [ ] Vérifier la structure de la section Documents dans `CreditContractDetail`
- [ ] Afficher le bouton si `signedQuittanceUrl` est renseigné
- [ ] Lien vers le PDF (téléchargement ou ouverture)

### Fichiers concernés

- `src/components/credit-speciale/CreditContractDetail.tsx`

### Cursor Skills

- **shadcn-ui** : Button, lien document

---

## Tâche 13 — Vérifier et appliquer les règles Firebase

**Documentation à consulter** : [`firebase/`](./firebase/)

**Partie du diagramme de séquence** : **Phase 2** (lignes 77-78) et **Phase 3** (lignes 103-105) — interactions `DocRepo` → `Storage.uploadFile` (chemins `contracts-ci/{memberId}/{fileName}`) ; **Phase 1, 3, 4** — écritures Firestore `creditContracts` et `documents`.

### Objectif

Vérifier que les règles Firestore et Storage couvrent le flux de clôture. Appliquer les règles renforcées si souhaité.

### Actions

- [ ] Lire [`firebase/FIRESTORE_RULES.md`](./firebase/FIRESTORE_RULES.md)
- [ ] Vérifier que `creditContracts` et `documents` sont couverts dans `firestore.rules`
- [ ] Lire [`firebase/STORAGE_RULES.md`](./firebase/STORAGE_RULES.md)
- [ ] Vérifier que le chemin `contracts-ci/{memberId}/{fileName}` accepte les PDF (max 5 MB)
- [ ] Optionnel : appliquer les règles renforcées (transitions DISCHARGED, CLOSED)

### Fichiers concernés

- `firestore.rules`
- `storage.rules`

### Cursor Skills

- **security-review** : Règles Firestore, validation des transitions, règles Storage

---

## Tâche 14 — Vérifier les index Firestore

**Documentation à consulter** : [`firebase/INDEXES.md`](./firebase/INDEXES.md)

**Partie du diagramme de séquence** : **Phase 1** (lignes 50-51), **Phase 4** (lignes 128-129) — `Repo.getContractById` ; requêtes `getContractsWithFilters` (liste contrats par status) hors séquence mais liées au flux.

### Objectif

Vérifier que les index existants couvrent les requêtes du flux. Aucun nouvel index n’est requis pour le flux actuel.

### Actions

- [ ] Lire [`firebase/INDEXES.md`](./firebase/INDEXES.md)
- [ ] Confirmer que les index `creditContracts` (status, createdAt, etc.) sont présents dans `firestore.indexes.json`
- [ ] Tester les requêtes en dev (getContractById, getContractsWithFilters)

### Fichiers concernés

- `firestore.indexes.json`

### Cursor Skills

- Aucun skill spécifique

---

## Tâche 15 — Schémas de validation (Zod)

**Diagrammes à consulter** : Use case (motif obligatoire), Activité

**Partie du diagramme de séquence** : **Phase 1** (lignes 46-48) — Admin saisit motif avant `validateFinalRepayment` ; **Phase 4** (lignes 120-126) — Admin remplit formulaire (date, heure, motif) avant `closeContract`.

### Objectif

Créer les schémas Zod pour les formulaires : motif décharge, motif clôture, formulaire de clôture.

### Actions

- [ ] Schéma `finalRepaymentSchema` : motif (string, min 10, max 500)
- [ ] Schéma `closeContractSchema` : date, heure, motifCloture (min 10, max 500)
- [ ] Intégrer dans les modals/formulaires

### Fichiers concernés

- `src/schemas/credit-speciale.schema.ts` (ou fichier dédié)

### Cursor Skills

- **security-review** : Validation des entrées utilisateur

---

## Tâche 16 — Tests unitaires et d’intégration

**Diagrammes à consulter** : Séquence, Activité

**Partie du diagramme de séquence** : Toutes les phases — utiliser la séquence comme référence pour mocker les interactions (Hook→Service→Repo, Service→DocService→DocRepo→Storage) et valider les flux.

### Objectif

Ajouter des tests pour le service, le hook et les composants critiques.

### Actions

- [ ] Tests `CreditSpecialeService` : validateDischarge, uploadSignedQuittance, closeContract (mocks)
- [ ] Tests du hook useClotureContrat (ou useCreditSpeciale)
- [ ] Tests des modals (FinalRepaymentModal, CloseContractModal) si composants isolés
- [ ] Tests d’intégration du flux complet (optionnel)

### Fichiers concernés

- `src/services/credit-speciale/__tests__/CreditSpecialeService.cloture.test.ts`
- `src/hooks/__tests__/useClotureContrat.test.ts` (ou équivalent)
- `src/components/credit-speciale/__tests__/FinalRepaymentModal.test.tsx`

### Cursor Skills

- Aucun skill spécifique (Vitest, React Testing Library)

---

## Tâche 17 — Tests E2E (optionnel mais recommandé)

**Diagrammes à consulter** : Use case, Activité (flux complet)

**Partie du diagramme de séquence** : Flux complet Admin→Page pour les 4 phases — Phase 1 (accès fiche, clic bouton, saisie motif, validation), Phase 2 (clic télécharger quittance), Phase 3 (upload fichier), Phase 4 (formulaire, modal confirmation, clôture).

### Objectif

Tester le flux de clôture de bout en bout avec un contrat dont le montant restant = 0.

### Actions

- [ ] Créer un scénario E2E : accès fiche contrat → clic Remboursement final → saisie motif → validation
- [ ] Scénario : téléchargement quittance, upload quittance signée, clôture
- [ ] Vérifier l’affichage des sections Déchargé et Documents

### Fichiers concernés

- `e2e/credit-speciale/cloture-contrat.spec.ts` (nouveau)

### Cursor Skills

- Aucun skill spécifique (Playwright)

---

## Tâche 18 — Vérification finale et Definition of Done

### Checklist

- [ ] Tous les diagrammes (use case, activité, séquence) ont été consultés pendant l’implémentation
- [ ] Le dossier [`firebase/`](./firebase/) a été utilisé pour les règles et index
- [ ] `pnpm lint` OK
- [ ] `pnpm typecheck` OK
- [ ] `pnpm test --run` OK
- [ ] `pnpm build` OK
- [ ] Tests E2E passent (si implémentés)
- [ ] Documentation à jour (ANALYSE_CLOTURE_CONTRAT.md, réalisationAfaire.md)

---

## Récapitulatif des Cursor Skills par tâche

| Tâche | Skills |
|-------|--------|
| 1. Types | — |
| 2. Repository | — |
| 3. validateDischarge | security-review |
| 4. generateQuittancePDF | react-pdf |
| 5. uploadSignedQuittance | security-review |
| 6. closeContract | security-review |
| 7. Hook | — |
| 8. FinalRepaymentModal | shadcn-ui, tailwind-design-system, tailwind-patterns |
| 9. Section Remboursement final | shadcn-ui, tailwind-design-system |
| 10. Section Déchargé | shadcn-ui, tailwind-design-system, tailwind-patterns |
| 11. Désactiver Augmenter crédit | shadcn-ui |
| 12. Bouton Quittance signée | shadcn-ui |
| 13. Règles Firebase | security-review |
| 14. Index Firestore | — |
| 15. Schémas Zod | security-review |
| 16. Tests unitaires | — |
| 17. Tests E2E | — |

---

## Référence au workflow général

Ce workflow s’inscrit dans le workflow général du projet : [`documentation/general/WORKFLOW.md`](../../general/WORKFLOW.md).

- **Branche** : `feat/credit-speciale-cloture-contrat` → `develop`
- **Merge** : Squash merge
- **CI** : Lint, typecheck, tests, build, E2E
- **Déploiement** : Préprod puis prod via pipelines

---

**Date** : 2026-02-01  
**Use case** : Clôture de contrat (Crédit spéciale)  
**Documentation** : [`ANALYSE_CLOTURE_CONTRAT.md`](./ANALYSE_CLOTURE_CONTRAT.md)
