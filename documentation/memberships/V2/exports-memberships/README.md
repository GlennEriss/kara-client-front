## V2 – Exports membres (`exports-memberships`)

### 1. État actuel V1

- **UI principale** : `src/components/memberships/ExportMembershipModal.tsx`
  - Ouverture depuis la liste des membres (`MembershipList.tsx`).
  - Permet de choisir :
    - **Format** : `csv`, `excel`, `pdf`.
    - **Période** : `dateStart` / `dateEnd` (filtre sur `createdAt`).
    - **Quantité** : nombre de membres (`quantity` ou `all`).
    - **Ordre** : `A-Z` / `Z-A` (tri nom/prénom).
    - **Filtre véhicule** : `all` / `with` / `without` via `VehicleFilter`.
    - Utilise aussi les `UserFilters` déjà appliqués sur la liste (types, abonnement, géographie, etc.).

- **Logique d’export** (dans `ExportMembershipModal`) :
  - Récupère les membres par pages via `getMembers(baseFilters, page, pageSize)` (pageSize = 100).
  - Applique en **front** :
    - Filtre de date (`isWithinRange(createdAt, start, end)`).
    - Limitation de quantité (`targetCount`).
    - Tri alphabétique nom/prénom.
  - Pour chaque membre :
    - Récupère le dossier complet via `getMembershipRequestById(dossierId)`.
    - Construit une ligne d’export via `buildRow(member, dossier)` :
      - Identité, contacts, adresse, entreprise, pièces d’identité, paiements, etc.
  - Génère :
    - CSV (Blob + téléchargement direct).
    - Excel (via `xlsx`).
    - PDF (via `jsPDF` + `jspdf-autotable`).

- **Problèmes V1** :
  - Calculs lourds côté client (boucle de pagination + N appels `getMembershipRequestById`).
  - Risque de lenteur / freeze navigateur pour de gros exports.
  - Couplage fort UI ↔ data (toute la logique dans le composant React).
  - Pas de notion de jobs d’export ni d’historique d’exports.

### 2. UC6 – Exports PDF / Excel (doc V1)

- **Modes fonctionnels** :
  1. Membres **avec au moins un véhicule**.
  2. Membres **sans véhicule**.
  3. **Tous les membres**.
- **Exigences de la doc V1** :
  - Fichiers PDF / Excel avec colonnes cohérentes :
    - Identité (nom, prénom, matricule, contact).
    - Statut d’abonnement.
    - Informations véhicule (oui/non, détails véhicules si disponibles).
  - Gestion des cas vides :
    - Message clair \"Aucun membre à exporter selon les critères\".
  - Gestion des erreurs :
    - Erreur d’export (PDF/Excel) → message explicite.

### 3. Objectifs V2

- **Séparer clairement l’UI et la logique d’export** :
  - `ExportMembershipModal` devient un composant **présentatif** (choix du format + critères).
  - La logique d’export est déplacée dans :
    - Un **service** `MembershipExportService` (`domains/memberships/services`).
    - Un éventuel **hook** `useMembershipExport`.
- **Améliorer les performances et la robustesse** :
  - Option A : optimiser au maximum côté client (meilleur usage des filtres Firestore, pagination, etc.).
  - Option B : déléguer les exports volumineux à une **Cloud Function** (voir `exports-memberships/functions/README.md`).
- **Aligner les exports avec les autres modules** :
  - Mutualiser une partie de la logique avec les exports des modules Bienfaiteur, Caisse, Placement, etc.
  - Avoir une convention commune pour les colonnes, formats, noms de fichiers, etc.

### 4. Plan des sous‑composants / services V2

#### 4.1 Service d’export

- **`MembershipExportService`** (`src/domains/memberships/services/MembershipExportService.ts`) :
  - Méthodes possibles :
    - `exportMembersToCsv(options)` → Blob ou URL.
    - `exportMembersToExcel(options)` → Blob ou téléchargement direct.
    - `exportMembersToPdf(options)` → Blob ou téléchargement direct.
  - `options` contient :
    - `filters: UserFilters` (y compris filtre véhicule).
    - `dateRange`, `quantity`, `sortOrder`.
    - `format: 'csv' | 'excel' | 'pdf'`.
  - Utilise :
    - Un repository V2 (`MembershipRepositoryV2`) pour récupérer les membres et leurs dossiers.
    - Des utilitaires de formatage (nationalité, dates, montants).

#### 4.2 Hook d’export (orchestration côté UI)

- **`useMembershipExport`** (`src/domains/memberships/hooks/useMembershipExport.ts`) :
  - Gère l’état `isExporting`, les erreurs, et déclenche le bon format via `MembershipExportService`.
  - Interface possible :
    - `exportMembers(options)` → Promise<void | Error>.
    - `isExporting`, `error`.

#### 4.3 Composant modal

- **`ExportMembershipModal`** V2 :
  - UI très similaire à V1 (on garde la même UX).
  - Ne contient plus la logique de pagination / mapping des lignes ; appelle seulement `useMembershipExport`.

### 5. Mapping V1 → V2

- **Composant UI** :
  - **V1** : `ExportMembershipModal.tsx` = UI + logique d’export + appels DB.
  - **V2** :
    - `ExportMembershipModal` = UI seulement.
    - `useMembershipExport` + `MembershipExportService` = logique métier.

- **Récupération des données** :
  - **V1** :
    - `getMembers` (avec filtres) + filtrage date en front.
    - N appels à `getMembershipRequestById` pour enrichir chaque ligne.
  - **V2** :
    - Repository V2 (ou Cloud Function) qui renvoie déjà des objets agrégés (membre + dossier) prêts à être exportés, ou du moins réduit le N+1.

- **Génération des fichiers** :
  - **V1** :
    - CSV/Excel/PDF générés uniquement côté client.
  - **V2** :
    - Petits exports : conservés côté client (UX rapide).
    - Exports volumineux : confiés à une Cloud Function (génération en backend + URL de téléchargement), voir `functions/README.md`.

> Ce README servira de base aux fichiers `workflow/README.md`, `firebase/README.md`, `tests/README.md`, `functions/README.md` et `notifications/README.md` pour la fonctionnalité `exports-memberships`.

