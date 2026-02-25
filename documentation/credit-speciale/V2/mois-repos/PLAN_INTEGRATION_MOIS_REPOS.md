# Plan d’intégration – Mois de repos (Crédit Spéciale)

Ce document décrit le plan d’intégration **global** de la fonctionnalité « Mois de repos » pour les contrats Crédit Spéciale. Référence métier : [ANALYSE_MOIS_REPOS.md](./ANALYSE_MOIS_REPOS.md) et [SIMULATION_EXEMPLE.md](./SIMULATION_EXEMPLE.md).

---

## 1. Périmètre

- **Objectif :** Permettre de mettre une échéance en « mois de repos » (report sans paiement, sans pénalité), avec motif et traçabilité admin.
- **Règle des 7 mois :** Les intérêts s’appliquent jusqu’au **7e mois logique** (7e échéance due). Avec des mois de repos, le **mois logique** = mois calendaire − nombre de mois de repos parmi les mois précédents. La transformation spéciale → fixe se fait après **7 mois logiques** écoulés.
- **Option métier retenue pour les intérêts pendant le repos :** Option A (pas d’intérêts pendant le repos). Le capital restant reste inchangé ; tout ce qui était dû au mois mis au repos est simplement reporté au mois suivant.

---

## 2. Ordre d’implémentation

| Étape | Lot | Description |
|-------|-----|-------------|
| 1 | Données | Type `RestMonth` et champ `restMonths` sur `CreditContract`. Lecture/écriture dans `CreditContractRepository`. |
| 2 | Utils | `getLogicalMonthIndex(calendarMonth, restMonths)`, `isRestMonth(monthNumber, restMonths)`. Utilisation partout où `monthIndex >= 7`. |
| 3 | Échéancier | `CreditContractDetail` : `calculateDueItems` et `calculateActualSchedule` avec mois de repos et mois logique (lignes « Mois de repos », intérêts si mois logique ≤ 7). |
| 4 | UI | Bouton « Mois de repos » (uniquement pour la prochaine échéance DUE), modal (motif, enregistrement admin), appel service `recordRestMonth`. |
| 5 | Pénalités | Dans `checkAndCreatePenalties`, ne pas créer de pénalité si le mois concerné est en repos. |
| 6 | Job transformation | `transformCreditSpeciale` : transformation après **7 mois logiques** (mois calendaires − mois de repos ≥ 7). |
| 7 | PDF (optionnel) | Afficher les lignes « Mois de repos » dans le PDF contrat avec dates calculées, motif, admin. |
| 8 | Stats (optionnel) | Indicateurs « nombre de mois de repos », « contrats avec au moins 1 mois de repos ». |

---

## 3. Détail par lot

### 3.1 Données

- **Types** (`src/types/types.ts`) :
  - `RestMonth`: `{ monthNumber: number, reason: string, recordedBy: string, recordedByName: string, recordedAt: Date }`
  - `CreditContract`: ajouter `restMonths?: RestMonth[]`
- **Repository** : `getContractById` doit désérialiser `restMonths` (dates Firestore → Date). `updateContract` accepte `restMonths` (tableau sérialisable).

### 3.2 Utils mois logique

- **Fichier** : `src/utils/credit-speciale-rest-months.ts` (ou dans `credit-speciale-calculations.ts`).
- **Fonctions :**
  - `isRestMonth(monthNumber: number, restMonths: RestMonth[] | undefined): boolean`
  - `getLogicalMonthIndex(calendarMonthNumber: number, restMonths: RestMonth[] | undefined): number`  
    Formule : pour le mois calendaire N, mois logique = N − (nombre de mois de repos parmi 1..N).  
    Ex. : mois 3 avec repos aux mois 1 et 2 → mois logique = 3 − 2 = 1.
  - `isAfterLogicalMonth7(calendarMonthNumber: number, restMonths: RestMonth[] | undefined): boolean`  
    Retourne `getLogicalMonthIndex(calendarMonthNumber, restMonths) >= 7`.

### 3.3 Échéancier (CreditContractDetail)

- **calculateDueItems** (crédit spéciale / aide) :
  - Parcourir les **mois calendaires** de 1 à `duration + restMonths.length` (au plus 20).
  - Pour chaque mois calendaire :
    - Si **repos** : ajouter une ligne de type « Mois de repos » (month, date, pas de payment/interest/remaining, statut REST ou affichage dédié). Appliquer intérêts au capital (Option B) : `resteDuPrecedent *= (1 + taux)`.
    - Sinon : calculer `logicalIndex = getLogicalMonthIndex(month, restMonths)`, `isAfterMonth7 = logicalIndex >= 7`, puis intérêts et mensualité comme aujourd’hui. Incrémenter le capital selon paiement ou théorique.
  - Déterminer PAID/DUE/FUTURE : un mois est DUE si tous les mois calendaires précédents sont soit payés soit en repos.
- **calculateActualSchedule** : même logique (mois calendaire, repos, mois logique pour intérêts).
- **DueItem** : étendre avec `isRest?: boolean` et éventuellement `restReason?`, `restRecordedAt?` pour l’affichage des lignes repos.
- **calculateLosses** : utiliser l’échéancier actuel avec mois logique (pertes = intérêts « manqués » après le 7e mois logique).

### 3.4 UI

- **Bouton « Mois de repos »** : affiché à côté de « Payer cette échéance » pour la **première** échéance DUE (même ligne que le bouton de paiement). Désactivé si l’échéance n’est pas DUE ou si ce n’est pas la prochaine à payer.
- **Modal RestMonthModal** : champs motif (texte), rappel du mois concerné. À la soumission : appeler `recordRestMonth(contractId, monthNumber, reason, user)`, puis invalider les queries contrat/paiements et fermer le modal.
- **Affichage des lignes repos** : dans le tableau de l’échéancier, une ligne « M2 – Mois de repos » avec motif + « Enregistré par X le … » (optionnel en tooltip ou sous la ligne).

### 3.5 Service

- **recordRestMonth(creditId, monthNumber, reason, recordedBy, recordedByName)** :
  - Charger le contrat, vérifier que le mois N est bien la prochaine échéance DUE (pas de paiement pour N, tous les mois précédents payés ou en repos).
  - Ajouter `{ monthNumber, reason, recordedBy, recordedByName, recordedAt: new Date() }` à `contract.restMonths`.
  - `updateContract(creditId, { restMonths: [...(contract.restMonths ?? []), newEntry] })`.
- **checkAndCreatePenalties** : au début, si `restMonths` contient le `monthNumber` du paiement, faire `return` sans créer de pénalité.

### 3.6 Job transformation

- Dans `transformCreditSpeciale.ts` :
  - Pour chaque contrat, calculer `monthsSinceStart = diff en mois entre today et referenceDate`.
  - `restCount = (contract.restMonths ?? []).filter(r => r.monthNumber <= monthsSinceStart).length` (mois de repos déjà « passés »).
  - `logicalMonthsElapsed = monthsSinceStart - restCount`.
  - Transformer si `logicalMonthsElapsed >= 7` (et non plus `monthsSinceStart >= 7`).

### 3.7 PDF (optionnel)

- Construire une timeline : pour chaque mois calendaire 1..(7 + restMonths.length), soit ligne « Mois de repos » (dates calculées depuis `firstPaymentDate` + monthNumber), soit ligne « Échéance X » avec montant. Utiliser `getLogicalMonthIndex` pour savoir si on affiche des intérêts.

### 3.8 Garant

- Pas de changement fonctionnel : un mois de repos = pas de paiement = pas de commission pour ce mois. Les rémunérations restent liées aux paiements réels.

---

## 4. Fichiers impactés

| Fichier | Modification |
|---------|--------------|
| `src/types/types.ts` | `RestMonth`, `CreditContract.restMonths` |
| `src/utils/credit-speciale-rest-months.ts` | Nouveau : `isRestMonth`, `getLogicalMonthIndex`, `isAfterLogicalMonth7` |
| `src/repositories/credit-speciale/CreditContractRepository.ts` | Désérialiser `restMonths` dans `getContractById` |
| `src/components/credit-speciale/CreditContractDetail.tsx` | calculateDueItems, calculateActualSchedule, calculateLosses, affichage lignes repos, bouton + modal |
| `src/components/credit-speciale/RestMonthModal.tsx` | Nouveau : modal motif + enregistrement |
| `src/services/credit-speciale/ICreditSpecialeService.ts` | `recordRestMonth` |
| `src/services/credit-speciale/CreditSpecialeService.ts` | `recordRestMonth`, `checkAndCreatePenalties` (exclure mois repos) |
| `functions/src/scheduled/transformCreditSpeciale.ts` | 7 mois logiques |

---

## 5. Récapitulatif des règles métier

- **Mois logique** : pour le mois calendaire N, mois logique = N − (nombre de mois de repos dans 1..N).
- **Intérêts** : appliqués si et seulement si mois logique ≤ 7. Après le 7e mois logique, plus d’intérêts.
- **Pendant le mois de repos** : pas d’intérêts (Option A). Capital suivant = capital (inchangé).
- **Pénalités** : aucune pour un mois en repos.
- **Transformation** : après 7 **mois logiques** depuis la date de référence.
- **Dernière échéance** : avec 2 repos (ex. mois 2 et 4), les 7 paiements tombent aux mois 1, 3, 5, 6, 7, 8, 9 → dernière échéance = mois 9.
