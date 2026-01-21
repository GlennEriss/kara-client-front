## V2 – Formulaire membre (`form-membership`)

### 1. État actuel V1

- **Page / étapes**
  - Route admin `/memberships/add`.
  - Composants Step (ex. `Step2.tsx`, `Step3.tsx` dans les composants registration/memberships).
- **Problèmes majeurs (doc V1 `AMELIORATION_WORKFLOW_ADMIN.md`)**
  - Pour créer **province / ville / arrondissement / quartier**, l’admin doit quitter le formulaire pour aller dans `/geographie`, puis revenir → perte de contexte.
  - Même problème pour **entreprise** (`/companies`) et **profession** (`/jobs`).
  - Absence de combobox évoluées (recherche, tri alphabétique systématique) pour certaines entités.

### 2. Objectifs V2

- Conserver le **look & feel** actuel du formulaire.
- Implémenter les **modals de création rapide** décrits en V1 :
  - `AddProvinceModal`, `AddDepartmentModal`, `AddCommuneModal`, `AddDistrictModal`, `AddQuarterModal`.
  - `AddCompanyModal`, `AddProfessionModal`.
  - `ProfessionCombobox` (combobox avec tri + recherche).
- Intégrer un hook `useIsAdminContext` pour n’afficher ces modals que dans le contexte admin.
- Centraliser la logique de **rafraîchissement React Query** et de sélection automatique après création.

### 3. Mapping V1 → V2 (brouillon)

- Step2/Step3 actuels → composants formulaire V2 (dans un sous‑dossier `domains/memberships/components/form`).
- Hooks géographie / entreprises / professions → utilisés via services de domaine et non directement dans les composants.
- Logique de cascade Province → Département → Commune → Arrondissement → Quartier alignée avec le module `geographie`.

> À compléter : liste exhaustive des modals et des hooks à créer/refactorer, plus la checklist d’implémentation par phase (tri, modals, tests).

