# Analyse – Mois de repos (Crédit Spéciale)

## 1. Objectif de la fonctionnalité

Permettre à un membre de **reporter une échéance** sans paiement et **sans pénalité** (maladie, cas de force majeure), avec :

- Un bouton **Mois de repos** sous « Payer cette échéance » dans l’échéancier.
- Saisie d’un **motif** et enregistrement par un **admin** (id, nom, prénom, date et heure).

Sémantique métier : le mois de repos équivaut à **décaler** l’échéance concernée sur la suivante — « comme si le mois N n’avait jamais existé » pour le calcul des intérêts, des pénalités et de la règle des 7 mois.

---

## 2. Contraintes actuelles du système

### 2.1 Échéancier de paiement (Échéancier actuel)

- **Source de vérité :** Les échéances sont **calculées** à partir du contrat (`contract.amount`, `contract.interestRate`, `contract.firstPaymentDate`, `contract.monthlyPaymentAmount`, `contract.duration`) et des **paiements réels** (`payments`), sans s’appuyer sur la collection `creditInstallments` pour l’affichage principal (voir `CreditContractDetail.tsx`, `calculateDueItems` et boucle `actualSchedule`).
- **Règle des 7 mois :** Pour un crédit **SPECIALE**, à partir du **mois 8** (index `monthIndex >= 7`), les **intérêts sont à 0** :
  - `const isAfterMonth7 = monthIndex >= 7`
  - `const interest = isAfterMonth7 ? 0 : resteDuPrecedent * monthlyRate`
- **Pénalités :** Calculées automatiquement en cas de **retard** (règle : montant mensuel / 30 × jours de retard). Déclenchées à l’enregistrement d’un paiement (voir `CreditSpecialeService.checkAndCreatePenalties`).
- **Séquentialité :** On ne peut payer l’échéance N que si les échéances 1 à N-1 sont payées (ou considérées comme telles). La « prochaine échéance payable » est la première dont le statut est `DUE`.

### 2.2 Simulation (onglet Simulation)

- **Échéance calculée :** Représente l’échéancier **théorique** (avec intérêts jusqu’au mois 7, puis 0). Utilise les mêmes formules (capital restant, intérêts, mensualité) et la même logique `isAfterMonth7`.
- **Échéancier actuel :** Représente l’échéancier **réel** basé sur les paiements enregistrés par mois (`paymentsByMonthMap`, `hasPaymentForMonth`). Un mois sans paiement est soit `DUE` (si tous les précédents sont payés), soit `FUTURE`.
- **Pertes (intérêts) :** `calculateLosses` parcourt l’échéancier actuel et additionne les intérêts des mois où le capital restant > 0 (donc les mois non payés ou partiellement payés sont pris en compte).
- **Transformation à 7 mois :** Un job planifié (`transformCreditSpeciale.ts`) transforme les crédits spéciaux **actifs** dont la **date de référence** (activatedAt / firstPaymentDate / createdAt) est **il y a plus de 7 mois** et qui ne sont **pas entièrement remboursés**, en crédit **fixe** (suppression des intérêts, statut `TRANSFORMED`).

### 2.3 Règle métier « 7e échéance »

- **Dans le calcul :** Les intérêts ne courent que sur les **7 premiers mois** (indices 0 à 6). À partir du mois 8 (indice 7), `interest = 0`.
- **Dans le job :** La transformation spéciale → fixe se fait **7 mois après la date de référence**, pas « après la 7e échéance payée ». Donc si un membre prend un mois de repos au mois 7, **7 mois calendaires après le début**, le job peut quand même transformer le contrat (car basé sur la date, pas sur le nombre d’échéances payées).

### 2.4 Données existantes

- **Paiements :** `CreditPayment` avec `creditId`, `installmentId` / `installmentNumber`, `amount`, `paymentDate`, lien échéance, etc.
- **Échéances (installments) :** `CreditInstallment` (optionnel pour l’affichage actuel) : `installmentNumber`, `dueDate`, `status` (PENDING, DUE, PARTIAL, PAID, OVERDUE), `paidAmount`, `remainingAmount`, etc.
- **Pénalités :** Entité dédiée, liée au crédit / au paiement, créée automatiquement en cas de retard.

---

## 3. Points de casse identifiés

### 3.1 Numérotation des mois (calendrier vs logique métier)

- Aujourd’hui : le **mois 1** = premier mois après `firstPaymentDate`, le **mois 7** = 7e mois calendaire, le **mois 8** = plus d’intérêts.
- Avec un mois de repos au **mois 7** :
  - On ne paie pas le mois 7 ; on le « saute ».
  - La prochaine échéance à payer devient en pratique celle qui était « mois 8 » en calendrier, mais dont le **montant** et les **intérêts** doivent rester ceux du **mois 7** (car on a juste décalé, pas avancé dans le temps métier).
- **Casse :** Si on ne modifie pas la logique, le système verra « mois 8 » et appliquera `interest = 0`, alors que métier on est encore sur « 7e échéance » (avec intérêts). Inversement, la **date d’échéance** affichée peut rester celle du mois 8 (calendrier), mais le **calcul** (intérêts, montant dû) doit rester celui du 7e mois logique.

### 3.2 Simulation : échéance calculée vs échéancier actuel

- **Échéance calculée :** Liste fixe de 7 mois (ou plus si durée custom) avec intérêts jusqu’au mois 7. Si on introduit un mois de repos, il faut soit :
  - Afficher un **8e mois** (avec les montants du 7e mois logique), soit
  - Garder 7 lignes mais avec un « décalage » explicite (mois 7 = repos, mois 8 affiché comme « 7e échéance décalée »).
- **Échéancier actuel :** Aujourd’hui il est dérivé de `paymentsByMonthMap` (mois 1, 2, … N). Un mois de repos ne doit **pas** être traité comme « mois non payé avec pénalité », mais comme « mois ignoré pour le décompte des intérêts et pour la séquence ».

### 3.3 Pénalités

- Aujourd’hui : pas de paiement à la date d’échéance → retard → pénalités.
- Avec mois de repos : **aucune pénalité** pour ce mois. Il ne faut pas créer de pénalité pour l’échéance en repos, et les calculs de retard ne doivent pas inclure ce mois comme « retard ».

### 3.4 Job de transformation (7 mois → crédit fixe)

- Le job utilise une **date de référence** + 7 mois. Si on décale l’échéance 7 à l’échéance 8 (calendrier), le membre paie plus tard ; mais le job peut déjà avoir transformé le contrat à « date + 7 mois ».
- **Casse :** Transformation alors que le membre a un mois de repos au mois 7 : le contrat passerait en fixe alors que, métier, on considère qu’il est encore au 7e mois (avec intérêts). Il faut soit :
  - Décaler la **date de référence** du contrat d’un mois quand on enregistre un mois de repos au mois 7, soit
  - Faire que le job tienne compte des **mois de repos** (ex. « nombre de mois calendaires depuis le début moins nombre de mois de repos ») pour décider si on a dépassé les 7 mois.

### 3.5 Rémunération du garant

- Les commissions garant sont liées aux **paiements** effectués (M1, M2, …). Un mois de repos = pas de paiement pour ce mois. Il faut décider si le garant a une commission pour le mois de repos (souvent non) et s’assurer que le décalage n’entraîne pas de doublon ou de mois manquant dans le tableau des rémunérations.

### 3.6 Prochaine échéance payable

- Aujourd’hui : première échéance avec statut `DUE` (toutes les précédentes payées).
- Avec mois de repos : après un repos au mois 7, la « prochaine échéance » doit être celle dont le **montant** et les **intérêts** correspondent au 7e mois logique, même si sa **date** est celle du 8e mois calendaire. L’UI et le calcul de `nextDueAt` / prochaine échéance doivent refléter ce décalage.

---

## 4. Proposition de conception

### 4.1 Modèle de données « Mois de repos »

Introduire une entité (ou un champ structuré) pour tracer les mois de repos :

- **creditId**
- **monthNumber** : numéro du mois **calendaire** (1 à 7 ou plus) mis en repos
- **reason** : motif (texte libre ou liste prédéfinie : maladie, décès, etc.)
- **recordedBy** : adminId
- **recordedByName** : nom + prénom de l’admin (affichage)
- **recordedAt** : date et heure d’enregistrement

**Dates (début / fin) du mois de repos :** Pas besoin de les stocker en base. Pour le PDF et l’affichage, on les calcule à partir de `firstPaymentDate` et de `monthNumber` (voir §8.2).

Stockage possible : sous-collection `creditContracts/{id}/restMonths` ou champ `restMonths: Array<{ monthNumber, reason, recordedBy, recordedByName, recordedAt }>` sur le contrat.

### 4.2 Règle de calcul « mois logique »

- Définir un **index de mois logique** : pour chaque mois calendaire N, si le mois N est en repos, alors le « mois logique » pour N est le même que pour N-1 (on n’avance pas).
- **Nombre de mois logiques écoulés** = nombre de mois calendaires depuis la date de référence **moins** le nombre de mois de repos parmi ces mois.
- **Intérêts :** Appliquer les intérêts si et seulement si `moisLogique <= 7`. Ainsi, si le mois 7 (calendaire) est en repos, la prochaine échéance (mois 8 calendaire) est encore la « 7e échéance logique » et garde des intérêts.

- **Piège à éviter :** Avec un repos au **mois 2**, l’**échéance 8** (calendaire) devient la **7e échéance** (logique) → les intérêts s’appliquent encore à l’échéance 8. Ils ne disparaissent qu’à l’**échéance 9** (calendaire). Donc la condition « plus d’intérêts après le 7e mois » doit impérativement être basée sur le **mois logique**, pas sur le mois calendaire. Voir [SIMULATION_EXEMPLE.md §5–6](./SIMULATION_EXEMPLE.md) pour le détail chiffré (ex. non-paiement à l’échéance 7 → intérêts à l’échéance 8, puis plus d’intérêts à l’échéance 9).
- **Intérêts pendant le mois de repos lui-même :** À trancher en règle métier. **Option A** : pas d’intérêts (le capital ne bouge pas pendant le repos). **Option B** : les intérêts courent quand même (capital × (1 + taux) pour le mois suivant). Dans les deux cas, la **mensualité** à la prochaine échéance reste la même ; seul le **reste dû** change. Voir [SIMULATION_EXEMPLE.md](./SIMULATION_EXEMPLE.md).
- **Transformation (job) :** Utiliser « 7 mois **logiques** écoulés » au lieu de « 7 mois calendaires ». Ex. : si un mois de repos a été pris au mois 7, la transformation n’a lieu qu’après 8 mois calendaires (7 mois logiques).

### 4.3 Échéancier affiché

- **Option A – Décalage visuel :** Afficher une ligne « Mois 7 – Mois de repos » (sans montant à payer, avec motif + admin + date), puis « Échéance 8 » avec le montant et les intérêts du 7e mois logique (et la date du 8e mois).
- **Option B – Renumérotation :** Ne pas afficher de ligne « mois 7 » ; afficher « Échéance 7 (décalée) » à la date du mois 8, avec le montant du 7e mois. Les mois suivants sont renumerotés (8 → 7, 9 → 8 pour l’affichage).

Recommandation : **Option A** pour garder les numéros de mois alignés avec le calendrier et éviter la confusion dans les pièces comptables (dates réelles).

### 4.4 Simulation (onglet Simulation)

- **Échéance calculée :** Rester sur l’échéancier théorique à 7 mois (sans mois de repos). Optionnel : une note « En cas de mois de repos, l’échéancier réel peut compter un mois de plus. »
- **Échéancier actuel :** Recalculer en prenant en compte les mois de repos :
  - Pour chaque mois calendaire, si le mois est en repos, ne pas compter d’intérêt pour ce mois et considérer que le « mois logique » n’a pas avancé.
  - Afficher les lignes « Mois de repos » comme dans l’échéancier principal.
- **Pertes (intérêts) :** Ne pas ajouter d’intérêt pour un mois en repos ; utiliser le mois logique pour savoir si on applique encore des intérêts (≤ 7).

### 4.5 Pénalités

- Lors de l’enregistrement d’un **mois de repos**, ne pas créer de pénalité pour ce mois.
- Dans `checkAndCreatePenalties`, ignorer les mois qui sont en repos (ne pas considérer comme retard).

### 4.6 UI

- Sous le bouton **« Payer cette échéance »** (pour une échéance DUE), ajouter un lien ou bouton **« Mois de repos »**.
- Ouvrir un modal : **motif** (champ texte ou liste), rappel de l’échéance (mois, date), et après enregistrement afficher qui a enregistré (id, nom, prénom, date/heure).
- Contraintes : n’autoriser le mois de repos que pour l’échéance **courante** (prochaine à payer), pas pour une échéance future arbitraire.

---

## 5. Plan d’intégration (ordre suggéré)

1. **Données**
   - Ajouter le stockage des mois de repos (sous-collection ou champ sur le contrat).
   - Adapter les types TypeScript (contrat, éventuellement CreditInstallment si utilisé).

2. **Calcul « mois logique »**
   - Introduire une fonction `getLogicalMonthIndex(contract, calendarMonthIndex, restMonths)` (ou équivalent) utilisée partout où on fait `monthIndex >= 7` ou où on compte les mois écoulés.
   - Remplacer les usages de `monthIndex` par le mois logique dans :
     - `CreditContractDetail` (calculateDueItems, actualSchedule, calculateLosses, referenceSchedule si besoin),
     - `CreditSpecialeService` (calculs de pénalités, montants d’échéance),
     - `transformCreditSpeciale` (date / mois logiques pour la transformation).

3. **Pénalités**
   - Dans la création des pénalités, exclure les mois en repos (pas de pénalité pour un mois de repos).

4. **UI**
   - Bouton « Mois de repos » + modal (motif, admin, date/heure) et enregistrement en base.

5. **Simulation**
   - Adapter l’onglet Simulation pour afficher l’échéancier actuel avec mois de repos et mois logiques (et pertes cohérentes).

6. **Job de transformation**
   - Remplacer « 7 mois calendaires » par « 7 mois logiques » (en comptant les mois de repos) pour décider de la transformation spéciale → fixe.

7. **Garant**
   - Vérifier que les rémunérations garant ne sont pas créées pour un mois de repos, et que le décalage n’introduit pas d’incohérence (pas de doublon, pas de mois manquant).

8. **Tests et recette**
   - Scénarios : mois de repos au mois 7 (vérifier intérêts conservés, pas de transformation avant 8 mois calendaires), mois de repos au mois 3 (vérifier échéancier et simulation), pas de pénalité, traçabilité admin.

---

## 6. Résumé des contraintes et corrections

| Zone | Contrainte actuelle | Casse avec mois de repos | Correction proposée |
|------|----------------------|---------------------------|----------------------|
| Intérêts | Intérêts uniquement sur mois 1–7 (index 0–6) | Mois 8 (calendaire) traité sans intérêts alors qu’on est encore au 7e logique | Utiliser un « mois logique » ; intérêts si mois logique ≤ 7 |
| Pénalités | Retard = pénalité | Mois en repos ne doit pas générer de pénalité | Ne pas créer de pénalité pour un mois en repos |
| Simulation (échéancier actuel) | Basé sur paiements par mois calendaire | Mois non payé = DUE + intérêts/pertes possibles | Recalcul avec mois de repos et mois logique |
| Job transformation | 7 mois **calendaires** depuis référence | Transformation trop tôt si repos au mois 7 | 7 **mois logiques** (exclure mois de repos) |
| Prochaine échéance | Première DUE | Doit pointer vers la bonne échéance (montant 7e logique) | Calcul de la prochaine échéance en tenant compte des repos |
| Garant | Commission par mois payé | Pas de paiement = pas de commission pour ce mois | Pas de commission pour un mois de repos (déjà le cas si pas de paiement) |

---

## 7. Références code

- **Échéancier / calcul des échéances :** `src/components/credit-speciale/CreditContractDetail.tsx` (calculateDueItems, actualSchedule, `isAfterMonth7`, `monthIndex`).
- **Pénalités :** `src/services/credit-speciale/CreditSpecialeService.ts` (`checkAndCreatePenalties`).
- **Simulation :** `CreditContractDetail.tsx` (onglet Simulation), `CreditSpecialeService.calculateStandardSimulation`, `src/utils/credit-speciale-calculations.ts`.
- **Transformation 7 mois :** `functions/src/scheduled/transformCreditSpeciale.ts`.
- **Types échéances / paiements :** `src/types/types.ts` (`CreditInstallment`, `CreditPayment`), `src/repositories/credit-speciale/CreditInstallmentRepository.ts`.
- **Documentation métier :** `documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md` (UC transformation, pénalités, etc.).

---

## 8. PDF / Export : faire sortir toutes les échéances (avec mois de repos)

### 8.1 Besoin

Dans un PDF qui liste **toutes les échéances**, le mois de repos doit **apparaître** comme une ligne à part, avec **date de début** et **date de fin** (période du mois calendaire concerné). Ce qui change par rapport à une échéance « normale », c’est uniquement que cette ligne ne porte pas de montant à payer et qu’elle affiche le motif + l’admin qui a enregistré le repos. L’échéancier passe de **7 lignes** à **7 + nombre de mois de repos** (ex. 1 repos → 8 lignes, 2 repos → 9 lignes), la dernière ligne restant la « 7e échéance logique » (éventuellement décalée au mois 8 ou 9 calendaire).

### 8.2 Comment savoir qu’un mois est en repos dans le PDF ?

- **Source de vérité :** La liste des mois de repos stockée sur le contrat (`restMonths`, voir §4.1). Chaque entrée contient au minimum : `monthNumber` (mois **calendaire**), `reason`, `recordedBy`, `recordedByName`, `recordedAt`.
- **Dates du mois calendaire :** Pour un `monthNumber` donné, on peut calculer :
  - **Date de début** = `firstPaymentDate` + (monthNumber - 1) mois
  - **Date de fin** = dernier jour de ce mois (ou `firstPaymentDate` + monthNumber mois - 1 jour), selon la règle métier des échéances (ex. échéance le 9 de chaque mois → période 9 du mois N au 8 du mois N+1, ou « tout le mois »).
- Le PDF n’a pas besoin de stocker les dates en base pour les mois de repos : il les **recalcule** à partir de `firstPaymentDate` et de `monthNumber`.

### 8.3 Structure de la timeline pour le PDF

Construire une **timeline** (tableau ordonné) qui représente l’échéancier réel :

1. Parcourir les **mois calendaires** dans l’ordre (1, 2, 3, … jusqu’à 7 + nombre de mois de repos).
2. Pour chaque mois calendaire, déterminer s’il s’agit :
   - d’un **mois de repos** : si `restMonths` contient une entrée avec ce `monthNumber` → ligne « Mois de repos » avec date début, date fin, motif, admin (id, nom, prénom), date/heure d’enregistrement.
   - d’une **échéance à payer** : sinon → ligne « Échéance X » (X = numéro d’échéance **logique**, 1 à 7) avec date début, date fin, montant, intérêts, etc.

Le **numéro d’échéance logique** pour une ligne de paiement se calcule ainsi : pour le mois calendaire M, nombre d’échéances logiques = M - (nombre de mois de repos parmi les mois 1..M-1). Donc on sait toujours quelle est la « 7e échéance » (la dernière ligne de paiement) même si elle apparaît au mois 8 ou 9 calendaire.

Le PDF affiche donc :
- soit une ligne **Échéance N** (N logique) avec dates (début–fin), montant, intérêts si N ≤ 7 ;
- soit une ligne **Mois de repos** avec dates (début–fin), motif, enregistré par (nom, prénom), le (date/heure).

Ainsi, en lisant le PDF on voit clairement quels mois étaient au repos et sur quelles périodes, et que l’échéancier « sur 7 échéances » est bien étalé sur 8 (ou 9) périodes calendaires.

---

## 9. Mise à jour des contrats déjà en base (migration)

### 9.1 Objectif

Les contrats **déjà créés** n’ont aujourd’hui aucun champ « mois de repos ». Il faut pouvoir déployer la fonctionnalité sans casser l’existant et sans migration de données lourde.

### 9.2 Solution proposée : rétrocompatibilité sans script de migration

- **Ajouter** un champ optionnel sur le contrat : `restMonths?: RestMonth[]` (ou une sous-collection `restMonths`).
- **Côté lecture :** Partout où le code utilise les mois de repos, faire :
  - `const restMonths = contract.restMonths ?? []`
  - Si le champ est absent (contrats anciens), on considère qu’il n’y a **aucun** mois de repos.
- **Côté écriture :** Lorsqu’un admin enregistre un mois de repos, on met à jour le contrat avec `restMonths: [...(contract.restMonths ?? []), newRestMonth]`.
- **Aucun script de migration** n’est obligatoire : les anciens contrats se comportent comme aujourd’hui (0 mois de repos) ; seuls les contrats pour lesquels un admin enregistre un mois de repos auront le tableau rempli.
- Si on utilise une **sous-collection** `creditContracts/{id}/restMonths/{restMonthId}` au lieu d’un champ, les contrats existants n’ont simplement aucune entrée dans cette sous-collection → même effet, 0 mois de repos.

### 9.3 Recommandation

- **Champ sur le contrat** `restMonths: Array<RestMonth>` : plus simple pour les lectures (un seul document), et pas besoin de migrer les anciens contrats (champ absent = tableau vide).
- **Sous-collection** : utile si on prévoit beaucoup d’historique ou des pièces jointes par mois de repos ; sinon le champ tableau suffit.

---

## 10. Statistiques : nombre de mois de repos

### 10.1 Indicateurs à ajouter

- **Au niveau global (tableau de bord / stats crédit spéciale) :**
  - **Nombre total de mois de repos** : somme, sur tous les contrats (ou sur une période), du nombre de mois de repos enregistrés.
  - **Nombre de contrats ayant au moins un mois de repos** : nombre de contrats pour lesquels `(restMonths?.length ?? 0) >= 1`.

- **Au niveau d’un contrat (fiche contrat) :**
  - Afficher **« Mois de repos : X »** (X = nombre de mois de repos pour ce contrat), par exemple à côté du résumé (prochaine échéance, montant restant, etc.).

### 10.2 Implémentation

- **Source :** Pour les contrats avec champ `restMonths`, compter `contract.restMonths.length`. Pour les contrats sans champ, 0.
- **Agrégation :** Selon l’architecture actuelle des stats (Firestore agrégations, ou calcul côté client à partir de la liste des contrats), ajouter soit un champ dérivé (ex. `totalRestMonths` mis à jour à l’enregistrement d’un repos), soit un calcul à la volée en parcourant les contrats. Pour éviter des lectures coûteuses, on peut maintenir un compteur global (ex. dans une collection `creditSpecialeStats` ou dans les stats existantes) incrémenté à chaque ajout de mois de repos.

---

## 11. Plusieurs mois de repos (2 ou plus) : contraintes et solutions

### 11.1 Contexte

Un membre peut avoir **plusieurs** mois de repos (ex. accident grave → repos au mois 4 puis au mois 5). L’échéancier se décale d’autant : **7 échéances logiques** s’étalent sur **7 + 2 = 9 mois calendaires**. Il faut encadrer ce comportement pour éviter des durées de contrat trop longues et des incohérences.

### 11.2 Contraintes à définir

| Contrainte | Option | Avantage / Inconvénient |
|------------|--------|--------------------------|
| **Nombre max de mois de repos par contrat** | Ex. max 2 (ou 3) | Limite simple ; au-delà, refus d’enregistrer un nouveau mois de repos ou message d’avertissement. |
| **Durée calendaire max du contrat** | Ex. 12 mois depuis firstPaymentDate | Même avec plusieurs repos, le contrat ne dépasse pas 12 mois ; au-delà, appliquer la règle (transformation en fixe ou clôture selon les règles métier). |
| **Cumul des deux** | Max 2 repos **et** max 12 mois | Contrôle fin ; évite les cas extrêmes (ex. 5 mois de repos → 12 mois calendaires). |

### 11.3 Recommandation

1. **Plafond du nombre de mois de repos par contrat** (ex. **2**), configurable (paramètre métier ou config). Lors de l’enregistrement d’un nouveau mois de repos, vérifier : `(contract.restMonths ?? []).length < MAX_REST_MONTHS`. Si la limite est atteinte, afficher un message du type : « Nombre maximum de mois de repos atteint pour ce contrat. »
2. **Optionnel : durée calendaire max** (ex. 12 mois). Lors du calcul de la « prochaine échéance » et du job de transformation, si la date dépasse firstPaymentDate + 12 mois, appliquer les mêmes règles que pour la fin du crédit spéciale (transformation en fixe ou clôture). Cela évite des contrats qui s’étirent indéfiniment en cas d’abus.
3. **UI / message** : Si le membre (ou l’admin) demande un 3e mois de repos, expliquer que la limite est atteinte et proposer éventuellement un autre dispositif (rééchelonnement, avenant, etc.) selon la politique métier.

### 11.4 Impact sur le reste du système

- **PDF :** Déjà prévu : timeline avec 7 + N lignes (N = nombre de mois de repos), chaque mois de repos avec date début–fin et motif/admin (§8).
- **Job de transformation :** Transformation après **7 mois logiques** = 7 + N mois **calendaires** (N = nombre de mois de repos déjà enregistrés jusqu’à la date du job). Pas de changement de logique si N = 2 : on attend simplement 9 mois calendaires.
- **Échéancier affiché / Simulation :** Même logique de mois logique ; le nombre de lignes (paiement + repos) augmente avec le nombre de repos. Vérifier que les composants (tableaux, PDF) supportent un nombre variable de lignes (pas de limite codée en dur à 7).
- **Garant :** Toujours aucune commission pour un mois de repos ; avec 2 repos, il y a 2 mois sans commission. Pas de doublon si on lie bien les commissions aux **paiements** effectués (M1, M2, … logiques).

### 11.5 Résumé

- **Limite recommandée :** 2 mois de repos par contrat (configurable).
- **Optionnel :** Durée calendaire max (ex. 12 mois) pour éviter les contrats trop longs.
- **Stats :** Afficher le nombre total de mois de repos et le nombre de contrats avec au moins 1 mois de repos (§10).
- **PDF et échéancier :** Toujours 7 échéances « à payer », mais réparties sur 7 + N périodes calendaires, avec N lignes « Mois de repos » affichant date début–fin, motif et admin.
