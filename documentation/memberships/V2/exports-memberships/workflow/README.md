## Workflow d’implémentation – Exports membres (V2)

### Objectif
Refondre l’export des membres (CSV/Excel/PDF) en séparant clairement **UI** et **logique métier**, en améliorant les performances sur les gros volumes et en préparant, si nécessaire, un export côté backend (Cloud Function).

### Séquence d’implémentation (ordre recommandé)

#### Phase 1 : Cartographie & design du service ⏳ **À FAIRE**
1. **Cartographier V1**
   - [ ] Relire `ExportMembershipModal.tsx` et noter tous les paramètres disponibles (dates, quantité, tri, filtre véhicule, UserFilters).
   - [ ] Confirmer les besoins UC6 (avec véhicule / sans véhicule / tous les membres) dans la doc V1.
   - [ ] Lister les colonnes effectivement exportées dans CSV/Excel/PDF (`buildRow`).
2. **Concevoir l’API du service V2**
   - [ ] Définir `MembershipExportOptions` (type partagé) :
     - `filters: UserFilters`, `dateRange`, `quantity`, `sortOrder`, `vehicleFilter`, `format`.
   - [ ] Définir les signatures de `MembershipExportService` :
     - `exportToCsv(options)`, `exportToExcel(options)`, `exportToPdf(options)`.

#### Phase 2 : Service `MembershipExportService` ⏳ **À FAIRE**
3. **Créer le service** (`src/domains/memberships/services/MembershipExportService.ts`)
   - [ ] Extraire la logique de :
     - Pagination sur `getMembers` (ou repository V2).
     - Filtrage date.
     - Limitation de quantité.
     - Tri alphabétique.
     - Construction des lignes (`buildRow`).
   - [ ] Fournir des fonctions pures qui retournent :
     - soit un tableau d’objets exportables (`rows`),
     - soit directement un Blob (pour CSV/Excel/PDF).
4. **Tests unitaires du service**
   - [ ] Vérifier la sélection correcte des membres selon `VehicleFilter` et `UserFilters`.
   - [ ] Vérifier la gestion de la période (`dateStart` / `dateEnd`).
   - [ ] Vérifier la limitation `quantity` et le tri.
   - [ ] Vérifier la structure des lignes (colonnes attendues UC6).

#### Phase 3 : Hook `useMembershipExport` ⏳ **À FAIRE**
5. **Créer le hook** (`src/domains/memberships/hooks/useMembershipExport.ts`)
   - [ ] Gérer l’état :
     - `isExporting`, `error`.
   - [ ] Exposer :
     - `exportMembers(options: MembershipExportOptions)` qui appelle `MembershipExportService`.
   - [ ] Intégrer les toasts (`toast.success/error/info`) au niveau du hook ou du composant.
6. **Tests unitaires du hook**
   - [ ] Cas succès (CSV, Excel, PDF).
   - [ ] Cas erreur (erreur service, aucun membre, etc.).

#### Phase 4 : Refactor de `ExportMembershipModal` ⏳ **À FAIRE**
7. **Adapter `ExportMembershipModal` pour utiliser le hook**
   - [ ] Remplacer la logique interne par des appels à `useMembershipExport`.
   - [ ] Ne plus dépendre directement de `getMembers` et `getMembershipRequestById`.
   - [ ] Garder strictement le même design (UX inchangée).
8. **Tests d’intégration UI**
   - [ ] Vérifier que l’ouverture/fermeture du modal fonctionne comme avant.
   - [ ] Vérifier que l’export se déclenche avec les bons paramètres (via mocks du service/hook).

#### Phase 5 : Option Cloud Function (gros exports) ⏳ **À FAIRE**
9. **Décider de la stratégie pour les gros exports**
   - [ ] Si besoin d’exporter des milliers de membres :
     - Créer une Cloud Function `exportMembersList` (voir `exports-memberships/functions/README.md`).
     - Adapter `MembershipExportService` pour déléguer les gros exports au backend.
10. **Tests backend**
    - [ ] Tester la Cloud Function avec des volumes réalistes.
    - [ ] Vérifier le format des fichiers générés et la cohérence avec les exports côté client.

#### Phase 6 : Tests d’intégration et E2E ⏳ **À FAIRE**
11. **Tests d’intégration** (`src/domains/memberships/__tests__/integration/membership-exports.integration.test.tsx`)
    - [ ] Scénario **INT-EXPORT-01** : export Excel sur une petite sélection (UI + service).
    - [ ] Scénario **INT-EXPORT-02** : export PDF avec filtre véhicule (avec/sans véhicule).
    - [ ] Scénario **INT-EXPORT-03** : aucun membre correspondant (message \"Aucun membre à exporter\").\n    - [ ] Scénario **INT-EXPORT-04** : erreur d’export (toast erreur).\n12. **Tests E2E** (Playwright)\n    - [ ] Cliquer sur \"Exporter\" depuis la liste.\n    - [ ] Choisir un format et des filtres, lancer un export.\n    - [ ] Vérifier le téléchargement d’un fichier (au moins présence du fichier côté navigateur/test).\n\n#### Phase 7 : Documentation & finalisation ⏳ **À FAIRE**\n13. **Mettre à jour la documentation**\n    - [ ] Compléter `firebase/README.md` (règles/index si Cloud Function ajoutée).\n    - [ ] Compléter `tests/README.md` (checklist détaillée des scénarios INT/E2E).\n    - [ ] Compléter `functions/README.md` (si Cloud Function créée).\n    - [ ] Compléter `notifications/README.md` (notification facultative \"export terminé\" si backend).\n    - [ ] Ajouter/mettre à jour les diagrammes `activite/*.puml` et `sequence/*.puml` pour UC6.\n\n### Priorités\n- **Critique** : Phase 2 (service) + Phase 3 (hook) + Phase 4 (refactor modal).\n- **Important** : Phase 6 (tests intégration/E2E).\n- **Optionnel mais recommandé** : Phase 5 (Cloud Function) si volumétrie importante.\n\n### Suivi\n- Utiliser cette checklist comme référence pendant l’implémentation.\n- Découper idéalement par PR : service → hook → refactor modal → éventuellement Cloud Function → tests.\n*** End Patch】"}]*/
