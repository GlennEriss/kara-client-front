# Tests unitaires – Simulation Caisse Spéciale (Standard)

> Plan des tests unitaires pour le service de simulation, le hook et la validation.

## Cibles

| Fichier / zone | Rôle | Priorité |
|----------------|------|----------|
| `CaisseSpecialeSimulationService.runSimulation()` | Calcul échéancier + bonus à partir de params et bonusTable | P0 |
| `useSimulationRun` (hook) | Appel service, retour rows/totals, gestion erreur | P0 |
| Schéma Zod (formulaire simulation) | montant > 0, durée 1–12, date valide | P1 |
| `SimulationExportService.exportToPDF` / `exportToExcel` | Construction du document à partir de rows/totals | P1 |
| `computeBonus` (engine) | Déjà testé ailleurs ; réutilisé par le service | P2 |

---

## CaisseSpecialeSimulationService

### runSimulation(params)

- **should return error and empty rows when no active settings for caisseType**  
  Mock repository retourne `null` → résultat `{ error: '...', rows: [] }`.

- **should return N rows when monthsPlanned is N and settings exist**  
  Paramètres avec durée 6 → 6 lignes (M1 à M6).

- **should set bonus rate 0 for months 1–3**  
  Vérifier que pour les 3 premières lignes, `bonusRate === 0` et `bonusAmount === 0`.

- **should set bonus rate from bonusTable for months 4–12**  
  Settings avec bonusTable M4=5, M5=10… → lignes 4+ avec taux et montant bonus cohérents (montant × taux / 100).

- **should compute due dates from desiredDate**  
  `desiredDate` = 1er février 2026 → M1 = 01/02/2026, M2 = 01/03/2026, etc. (même jour chaque mois).

- **should include totals (totalAmount, totalBonus) when rows are computed**  
  `totals.totalAmount === monthlyAmount * monthsPlanned`, `totals.totalBonus` = somme des bonus.

---

## useSimulationRun

- **should call service.runSimulation with form values**  
  Vérifier les arguments passés au service (caisseType, monthlyAmount, monthsPlanned, desiredDate).

- **should return rows and totals when service succeeds**  
  Service mock retourne `{ rows, totals }` → le hook retourne les mêmes données.

- **should return error when service returns no settings**  
  Service mock retourne `{ error, rows: [] }` → le hook expose error, rows vide.

---

## Schéma Zod (formulaire)

- **should accept valid data**  
  type, montant 50000, durée 6, date valide → pas d’erreur.

- **should reject monthlyAmount <= 0**  
  Erreur sur le champ montant.

- **should reject monthsPlanned < 1 or > 12**  
  Erreur sur le champ durée.

- **should reject invalid or missing date**  
  Erreur sur le champ date souhaitée.

---

## SimulationExportService

- **should generate PDF blob with table and totals**  
  `exportToPDF(rows, totals)` → Blob de type `application/pdf`, taille > 0.

- **should generate Excel blob with table and totals**  
  `exportToExcel(rows, totals)` → Blob (type XLSX), taille > 0.

- **should not call Firestore or any write**  
  Aucun mock Firestore/repository appelé pendant l’export.

---

## Couverture cible

- Service + hook : **80 %+**
- Schéma : **90 %+**
- Export service : **70 %+**
