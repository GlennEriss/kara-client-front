## Tests – Exports membres (V2)

### 1. Tests unitaires

#### 1.1 `MembershipExportService`

- [ ] Sélection des membres selon `UserFilters` + `VehicleFilter` :
  - Cas "tous les membres".
  - Cas "avec véhicule".
  - Cas "sans véhicule".
- [ ] Filtre de période (`dateStart` / `dateEnd`).
- [ ] Limitation `quantity` et tri A‑Z / Z‑A.
- [ ] Construction des lignes (`buildRow`) :
  - Présence de toutes les colonnes exigées par UC6.
  - Gestion des valeurs manquantes (vides plutôt qu’erreurs).
- [ ] Gestion des erreurs :
  - Erreur de récupération des membres.
  - Erreur de récupération des dossiers.

#### 1.2 `useMembershipExport`

- [ ] `exportMembers` appelle bien le service avec les bonnes options.
- [ ] `isExporting` est géré correctement (true pendant, false après).
- [ ] Gestion des erreurs (remontée vers le composant, déclenchement éventuel de toasts).

### 2. Tests d’intégration

Fichier cible : `src/domains/memberships/__tests__/integration/membership-exports.integration.test.tsx`

- [ ] **INT-EXPORT-01 – Export Excel simple**
  - Ouvrir le modal depuis la liste.
  - Choisir Excel + filtres par défaut.
  - Vérifier que `MembershipExportService.exportToExcel` est appelé avec les options attendues.

- [ ] **INT-EXPORT-02 – Export PDF avec filtre véhicule**
  - Choisir "Membres avec véhicule" + PDF.
  - Vérifier que seuls les membres avec `hasCar = true` sont passés au service.

- [ ] **INT-EXPORT-03 – Aucun membre à exporter**
  - Simuler `MembershipExportService` retournant un tableau vide.
  - Vérifier l’affichage du message "Aucun membre à exporter selon les critères".

- [ ] **INT-EXPORT-04 – Erreur d’export**
  - Simuler une erreur du service.
  - Vérifier qu’un toast d’erreur est affiché.

### 3. Tests E2E (Playwright – à planifier)

- [ ] Parcours complet :
  - Aller sur la liste des membres.
  - Ouvrir le modal d’export.
  - Lancer un export (petit volume).
  - Vérifier que le navigateur déclenche un téléchargement.

### 4. Attributs `data-testid` recommandés

- `data-testid="membership-export-modal"` : conteneur du modal.
- `data-testid="membership-export-format"` : sélecteur de format.
- `data-testid="membership-export-vehicle-filter"` : sélecteur filtre véhicule.
- `data-testid="membership-export-submit"` : bouton lancer export.
- `data-testid="membership-export-error"` : message d’erreur éventuel.

### 5. Couverture cible

- **Service** : ≥80% (logique de filtrage/tri/limitation + `buildRow`).
- **Hook** : ≥80%.
- **Intégration** : scénarios INT-EXPORT-01 à 04 couverts.
- **E2E** : au moins 1 parcours d’export complet.
