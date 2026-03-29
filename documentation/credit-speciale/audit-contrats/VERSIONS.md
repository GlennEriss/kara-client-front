# Recomposer un versement réel (exemple 300 000 FCFA @ 15 %)

Ce fichier fait le lien entre les colonnes du fichier `EXEMPLE.docx` (capital 300 000 FCFA, taux 15 %, commission 2 %) et les calculs/entités du code : il sert de fiche « reconstitution » pour comprendre ce qu’affiche l’UI (`CreditContractDetail`) et ce que recalculent les services (`CreditSpecialeService`).

| Colonne du reçu | Principe métier / formule | Fichier(s) clés |
| --- | --- | --- |
| Capital (montant sous-jacent de la mensualité) | C’est la base du paiement : pour Crédit Spéciale, on garde `contract.amount` et on soustrait les paiements au fur et à mesure (`CreditSpecialeService.createPayment`). Pour chaque ligne, la colonne `payment` de `calculateDueItems` ou `calculateActualSchedule` correspond au capital prévu. | `src/services/credit-speciale/CreditSpecialeService.ts:1012`, `src/components/credit-speciale/CreditContractDetail.tsx:576` |
| Taux (15 %) | Taux mensuel utilisé pour ajouter les intérêts avant le 7e mois. `monthlyRate = interestRate / 100`. | `src/utils/credit-speciale-calculations.ts:57`, `CreditContractDetail.tsx:576`, `CreditSpecialeService.ts:1012` |
| Commission (2 % du reste dû) | `guarantorRemunerationPercentage` appliqué sur le capital restant au début du mois (pas sur la mensualité totale). Calculé via `calculateSchedule` limitée à 7 mois et enregistré par `guarantorRemunerationRepository`. | `src/types/types.ts:1504`, `CreditSpecialeService.ts:1341`, `calculateSchedule` utilitaire |
| Intérêts | `interest = remaining * monthlyRate`, nuls après le 7e mois logique (`isAfterLogicalMonth7`). Les intérêts de chaque échéance apparaissent dans `calculateDueItems` et dans la suite de paiements réels. | `src/components/credit-speciale/CreditContractDetail.tsx:576`, `:873`, `src/utils/credit-speciale-rest-months.ts:24` |
| Montant global (capital + intérêts) | Dans les exemples réels, `montantGlobal` correspond au capital courant + les intérêts du mois. La commission du garant est affichée à part et n'entre pas dans ce total. Ce `montantGlobal` sert de base métier visible pour comprendre le dû mensuel et la suite du calcul. | `CreditContractDetail.tsx:576`, `CreditSpecialeService.ts:1767`, `calculateSchedule` |
| Date échéance / date remise | Date prévue = `contract.firstPaymentDate + monthNumber - 1` (ajustée par les mois de repos). Date remise = date du paiement réel sauvegardé. | `CreditSpecialeService.ts:1767`, `CreditContractDetail.tsx:576` |
| Moyen & montant remisé | Moyen = `payment.mode`; montant remisé = `payment.amount`. Les paiements de 0 ou de pénalités uniquement sont filtrés (`hasPaymentForMonth`). | `CreditSpecialeService.ts:1012`, `src/components/credit-speciale/CreditContractDetail.tsx:580` |
| Pénalités | Tolérance 3 jours puis règle de trois `(daysLate * installmentAmount)/30`, uniquement si > 0, pas rétros si `dueDate < 16/12/2025`. | `CreditSpecialeService.ts:1767`, `:2022`, `:2265` |
| Nouvelle base / nouveau capital | Après chaque paiement, `remaining` recalculé (`remaining = max(0, totalWithInterest - payment.amount)`), utilisé dans la ligne suivante pour déterminer la commission/intérêt. | `CreditSpecialeService.ts:1012`, `CreditContractDetail.tsx:576` |
| Note / Remarque | Champ `payment.comment` ou `payment.modificationReason` ; l’UI l’affiche dans l’onglet paiement pour justifier pénalité, mois de repos, etc. | `CreditSpecialeService.ts:1012`, `src/components/credit-speciale/PaymentSummaryModal.tsx` |

## Utilisation
1. Utiliser `CreditContractDetail` pour retrouver la ligne concrète (statuts PAID/FUTURE/REST).  
2. Vérifier les paiements via `useCreditPaymentsByCreditId` pour voir `payment.amount`, `paymentDate`, `payment.id` (ex. `M1_…`).  
3. Recalculer les pénalités via `checkAndCreatePenalties` si la date dépasse de 3 jours (modelisé ci-dessus).  
4. Lire la table des rémunérations (`getRemunerationsByCreditId`) pour retrouver la commission mensuelle et confirmer `guarantorRemunerationPercentage`.

Ce document est la base de la prochaine section « détails de versements » de l’audit. On peut étendre chaque ligne par un petit snippet (ex. capture des `DueItem` correspondants) si nécessaire.

## Ce que confirme `IBOUANGA AMELIE.pdf`
1. La commission du garant est bien calculee separement du `montant global`.
2. Le `montant global` suit la formule `capital + interets` : par exemple `1 000 000 + 150 000 = 1 150 000`, puis `800 000 + 120 000 = 920 000`.
3. Le rajout de credit est visible dans le flux reel : apres un reste a payer de `655 500 FCFA`, un ajout de `2 000 000 FCFA` donne un nouveau capital de `2 655 500 FCFA`. C'est donc un tres bon cas pour documenter l'extension.
4. Le mois de repos y apparait tres clairement : `REPOS VERSEMENT : 2024-10-06`, `REMARQUE REPOS MALADIE`, `COMMISSION 0 FCFA`, capital inchange a `566 184 FCFA`, et montant du mois suivant conserve a `651 112 FCFA`.
5. La tolerance de retard de 3 jours est aussi confirmee : le versement du `2024-11-09` pour une echeance du `2024-11-06` ne montre pas de penalite.

## Ce que confirme `REVEGUE HUGUES PARISH.pdf`
1. Ce document illustre un cas de `compte fixe` a `0 %` : `capital = 143 240 FCFA`, `taux definis = 0 %`, `montant total = 143 240 FCFA`.
2. Dans ce cas, il n'y a ni interets, ni commission, ni montant global qui augmente avec le temps.
3. Le `montant actuel` reste strictement identique tant qu'aucun versement n'est effectue : on voit `63 240 FCFA` reporte sur plusieurs echeances sans variation.
4. Le solde baisse uniquement quand un paiement reel est saisi : `143 240 -> 93 240 -> 63 240 -> 0`.
5. Ce cas montre tres bien la logique cible d'une phase fixe : un reste stable, sans interets ni commission, jusqu'au paiement suivant.
6. Pour la refonte, ce PDF est une bonne reference pour distinguer clairement :
   - la logique `credit speciale` avant bascule ;
   - la logique `mois de repos` dans le speciale ;
   - la logique `partie fixe` ou `compte fixe`, ou le montant ne grossit plus tout seul.

## Ce que confirme `REVEGUE HUGUES.pdf`
1. Ce document montre un cas complet de `credit speciale` classique a `300 000 FCFA`, `15 %`, `commission 2 %`, avec penalites, mois de repos et baisse progressive du capital.
2. Les deux premiers versements confirment une regle metier importante : tant que le montant remis couvre seulement les interets du mois (`45 000 FCFA`), le `nouveau capital` reste a `300 000 FCFA`.
3. Les penalites observees confirment la regle de 3 sur le montant de l'echeance :
   - `45 000 FCFA` paye avec 4 jours de retard donne `6 000 FCFA` ;
   - `36 750 FCFA` paye avec 4 jours de retard donne `4 900 FCFA` ;
   - `36 750 FCFA` paye avec 6 jours de retard donne `7 350 FCFA`.
4. Le mois de repos `REPOS CAUSE VOYAGE` confirme que le capital reste reporte et que le contrat reprend ensuite sur la meme base.
5. Le point cle du document est la fin du 7e mois : on lit `nouveau capital = 143 240 FCFA` puis `montant total mois prochain = 143 240 FCFA`. Cela confirme qu'apres le 7e mois, le reste bascule en partie fixe pure, sans interets ni commission supplementaires.
6. Mis en regard de `REVEGUE HUGUES PARISH.pdf`, ce PDF constitue un excellent exemple de transition metier :
   - `REVEGUE HUGUES.pdf` montre la fin du `credit speciale` ;
   - `REVEGUE HUGUES PARISH.pdf` montre le debut de la `partie fixe` a `0 %` sur le restant exact.

## Cas pratiques simules
Les cas ci-dessous servent de base de validation metier. Ils reprennent les regles que nous avons fixe ensemble :
- `montant global = capital + interets`
- `commission garant = capital x taux commission`
- `penalite = interet du mois x nombre de jours de retard / 30`
- la commission est affichee a part du `montant global`
- apres le 7e mois, le reste bascule en `partie fixe` sans interets ni commission

### Cas 1 - Cas simple, remboursement en 3 mois
Hypothese :
- capital `420 000 FCFA`
- taux `10 %`
- mensualite visee `200 000 FCFA`
- commission garant `2 %`

```text
HISTORIQUE DES VERSEMENTS

Informations Du Crédit
Capital : 420000 FCFA
Taux : 10%
Commission : 2%
Mensualité prévue : 200000 FCFA

PREMIER VERSEMENT : M1
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 200000 FCFA
PENALITE 0 FCFA
REMARQUE RAS
NOUVEAU CAPITAL 262000 FCFA
MONTANT TOTAL MOIS PROCHAIN 288200 FCFA

DEUXIEME VERSEMENT : M2
CAPITAL 262000 FCFA
COMMISSION 5240 FCFA
INTERETS 26200 FCFA
MONTANT GLOBAL 288200 FCFA
MONTANT REMIS 200000 FCFA
PENALITE 0 FCFA
REMARQUE RAS
NOUVEAU CAPITAL 88200 FCFA
MONTANT TOTAL MOIS PROCHAIN 97020 FCFA

TROISIEME VERSEMENT : M3
CAPITAL 88200 FCFA
COMMISSION 1764 FCFA
INTERETS 8820 FCFA
MONTANT GLOBAL 97020 FCFA
MONTANT REMIS 97020 FCFA
PENALITE 0 FCFA
REMARQUE RAS
NOUVEAU CAPITAL 0 FCFA
MONTANT TOTAL MOIS PROCHAIN 0 FCFA
```

### Cas 2 - Deux echeances de repos et un retard de 5 jours
Hypothese :
- repos en `M2` et `M4`
- retard de `5 jours` en `M5`

```text
HISTORIQUE DES VERSEMENTS

Informations Du Crédit
Capital : 420000 FCFA
Taux : 10%
Commission : 2%
Mensualité prévue : 200000 FCFA

PREMIER VERSEMENT : M1
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 200000 FCFA
PENALITE 0 FCFA
REMARQUE RAS
NOUVEAU CAPITAL 262000 FCFA
MONTANT TOTAL MOIS PROCHAIN 288200 FCFA

REPOS VERSEMENT : M2
CAPITAL 262000 FCFA
COMMISSION 0 FCFA
INTERETS 26200 FCFA
MONTANT GLOBAL 288200 FCFA
MONTANT REMIS 0 FCFA
PENALITE 0 FCFA
REMARQUE REPOS
NOUVEAU CAPITAL 262000 FCFA
MONTANT TOTAL MOIS PROCHAIN 288200 FCFA

DEUXIEME VERSEMENT : M3
CAPITAL 262000 FCFA
COMMISSION 5240 FCFA
INTERETS 26200 FCFA
MONTANT GLOBAL 288200 FCFA
MONTANT REMIS 200000 FCFA
PENALITE 0 FCFA
REMARQUE RAS
NOUVEAU CAPITAL 88200 FCFA
MONTANT TOTAL MOIS PROCHAIN 97020 FCFA

REPOS VERSEMENT : M4
CAPITAL 88200 FCFA
COMMISSION 0 FCFA
INTERETS 8820 FCFA
MONTANT GLOBAL 97020 FCFA
MONTANT REMIS 0 FCFA
PENALITE 0 FCFA
REMARQUE REPOS
NOUVEAU CAPITAL 88200 FCFA
MONTANT TOTAL MOIS PROCHAIN 97020 FCFA

TROISIEME VERSEMENT : M5
CAPITAL 88200 FCFA
COMMISSION 1764 FCFA
INTERETS 8820 FCFA
MONTANT GLOBAL 97020 FCFA
MONTANT REMIS 97020 FCFA
PENALITE 1470 FCFA
REMARQUE RETARD DE 5 JOURS
NOUVEAU CAPITAL 0 FCFA
MONTANT TOTAL MOIS PROCHAIN 0 FCFA
```

### Cas 3 - Versements irreguliers jusqu'au solde
Hypothese :
- `M1 = 100 000 FCFA`
- `M2 = 150 000 FCFA` avec `8 jours` de retard
- `M3 = 0 FCFA`
- `M4 = 100 000 FCFA` avec `4 jours` de retard
- `M5 = 0 FCFA`
- puis reprise a `200 000 FCFA` jusqu'au solde

```text
HISTORIQUE DES VERSEMENTS

Informations Du Crédit
Capital : 420000 FCFA
Taux : 10%
Commission : 2%
Mensualité prévue : 200000 FCFA

PREMIER VERSEMENT : M1
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 100000 FCFA
PENALITE 0 FCFA
REMARQUE RAS
NOUVEAU CAPITAL 362000 FCFA
MONTANT TOTAL MOIS PROCHAIN 398200 FCFA

DEUXIEME VERSEMENT : M2
CAPITAL 362000 FCFA
COMMISSION 7240 FCFA
INTERETS 36200 FCFA
MONTANT GLOBAL 398200 FCFA
MONTANT REMIS 150000 FCFA
PENALITE 9653 FCFA
REMARQUE RETARD DE 8 JOURS
NOUVEAU CAPITAL 248200 FCFA
MONTANT TOTAL MOIS PROCHAIN 273020 FCFA

TROISIEME VERSEMENT : M3
CAPITAL 248200 FCFA
COMMISSION 4964 FCFA
INTERETS 24820 FCFA
MONTANT GLOBAL 273020 FCFA
MONTANT REMIS 0 FCFA
PENALITE 0 FCFA
REMARQUE AUCUN VERSEMENT
NOUVEAU CAPITAL 273020 FCFA
MONTANT TOTAL MOIS PROCHAIN 300322 FCFA

QUATRIEME VERSEMENT : M4
CAPITAL 273020 FCFA
COMMISSION 5460 FCFA
INTERETS 27302 FCFA
MONTANT GLOBAL 300322 FCFA
MONTANT REMIS 100000 FCFA
PENALITE 3640 FCFA
REMARQUE RETARD DE 4 JOURS
NOUVEAU CAPITAL 200322 FCFA
MONTANT TOTAL MOIS PROCHAIN 220354 FCFA

CINQUIEME VERSEMENT : M5
CAPITAL 200322 FCFA
COMMISSION 4006 FCFA
INTERETS 20032 FCFA
MONTANT GLOBAL 220354 FCFA
MONTANT REMIS 0 FCFA
PENALITE 0 FCFA
REMARQUE AUCUN VERSEMENT
NOUVEAU CAPITAL 220354 FCFA
MONTANT TOTAL MOIS PROCHAIN 242389 FCFA

SIXIEME VERSEMENT : M6
CAPITAL 220354 FCFA
COMMISSION 4407 FCFA
INTERETS 22035 FCFA
MONTANT GLOBAL 242389 FCFA
MONTANT REMIS 200000 FCFA
PENALITE 0 FCFA
REMARQUE RAS
NOUVEAU CAPITAL 42389 FCFA
MONTANT TOTAL MOIS PROCHAIN 46628 FCFA

SEPTIEME VERSEMENT : M7
CAPITAL 42389 FCFA
COMMISSION 848 FCFA
INTERETS 4239 FCFA
MONTANT GLOBAL 46628 FCFA
MONTANT REMIS 46628 FCFA
PENALITE 0 FCFA
REMARQUE SOLDE FINAL
NOUVEAU CAPITAL 0 FCFA
MONTANT TOTAL MOIS PROCHAIN 0 FCFA
```

### Cas 4 - La personne ne rembourse que les interets pendant 7 mois
Hypothese :
- pendant `M1` a `M7`, la personne paie seulement les interets du mois
- le capital reste donc stable pendant toute la phase `credit speciale`
- apres `M7`, le reste bascule en `partie fixe`

```text
HISTORIQUE DES VERSEMENTS

Informations Du Crédit
Capital : 420000 FCFA
Taux : 10%
Commission : 2%
Mensualité prévue : 200000 FCFA

PREMIER VERSEMENT : M1
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 42000 FCFA
PENALITE 0 FCFA
REMARQUE REMBOURSEMENT DES INTERETS UNIQUEMENT
NOUVEAU CAPITAL 420000 FCFA
MONTANT TOTAL MOIS PROCHAIN 462000 FCFA

DEUXIEME VERSEMENT : M2
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 42000 FCFA
PENALITE 0 FCFA
REMARQUE REMBOURSEMENT DES INTERETS UNIQUEMENT
NOUVEAU CAPITAL 420000 FCFA
MONTANT TOTAL MOIS PROCHAIN 462000 FCFA

TROISIEME VERSEMENT : M3
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 42000 FCFA
PENALITE 0 FCFA
REMARQUE REMBOURSEMENT DES INTERETS UNIQUEMENT
NOUVEAU CAPITAL 420000 FCFA
MONTANT TOTAL MOIS PROCHAIN 462000 FCFA

QUATRIEME VERSEMENT : M4
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 42000 FCFA
PENALITE 0 FCFA
REMARQUE REMBOURSEMENT DES INTERETS UNIQUEMENT
NOUVEAU CAPITAL 420000 FCFA
MONTANT TOTAL MOIS PROCHAIN 462000 FCFA

CINQUIEME VERSEMENT : M5
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 42000 FCFA
PENALITE 0 FCFA
REMARQUE REMBOURSEMENT DES INTERETS UNIQUEMENT
NOUVEAU CAPITAL 420000 FCFA
MONTANT TOTAL MOIS PROCHAIN 462000 FCFA

SIXIEME VERSEMENT : M6
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 42000 FCFA
PENALITE 0 FCFA
REMARQUE REMBOURSEMENT DES INTERETS UNIQUEMENT
NOUVEAU CAPITAL 420000 FCFA
MONTANT TOTAL MOIS PROCHAIN 462000 FCFA

SEPTIEME VERSEMENT : M7
CAPITAL 420000 FCFA
COMMISSION 8400 FCFA
INTERETS 42000 FCFA
MONTANT GLOBAL 462000 FCFA
MONTANT REMIS 42000 FCFA
PENALITE 0 FCFA
REMARQUE REMBOURSEMENT DES INTERETS UNIQUEMENT
NOUVEAU CAPITAL 420000 FCFA
MONTANT TOTAL MOIS PROCHAIN 420000 FCFA

PARTIE FIXE : M8
CAPITAL 420000 FCFA
TAUX DEFINIS 0%
MONTANT TOTAL 420000 FCFA
MONTANT REMIS 200000 FCFA
PENALITE 0 FCFA
REMARQUE BASCULE EN PARTIE FIXE
NOUVEAU CAPITAL 220000 FCFA
MONTANT TOTAL MOIS PROCHAIN 220000 FCFA

PARTIE FIXE : M9
CAPITAL 220000 FCFA
TAUX DEFINIS 0%
MONTANT TOTAL 220000 FCFA
MONTANT REMIS 200000 FCFA
PENALITE 0 FCFA
REMARQUE RAS
NOUVEAU CAPITAL 20000 FCFA
MONTANT TOTAL MOIS PROCHAIN 20000 FCFA

PARTIE FIXE : M10
CAPITAL 20000 FCFA
TAUX DEFINIS 0%
MONTANT TOTAL 20000 FCFA
MONTANT REMIS 20000 FCFA
PENALITE 0 FCFA
REMARQUE SOLDE FINAL
NOUVEAU CAPITAL 0 FCFA
MONTANT TOTAL MOIS PROCHAIN 0 FCFA
```

### Cas 5 - Verification isolee de la formule officielle des penalites
Cas de reference :
- interets du mois `8 820 FCFA`
- retard `5 jours`
- formule officielle : `interet du mois x nombre de jours de retard / 30`

```text
PENALITE = 8820 x 5 / 30
PENALITE = 1470 FCFA
```

Ce cas sert de controle rapide pour verifier que les penalites sont bien calculees sur les interets du mois et non sur le montant global ni sur la commission du garant.
