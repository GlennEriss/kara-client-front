# Demande d'aide – Caisse Imprévue V2

> Documentation de la fonctionnalité **Demander une aide** sur la page détail d’un contrat CI, et alignement avec le PDF **Reconnaissance d’accompagnement** à téléverser.

## Contexte

- **Page concernée** : `/caisse-imprevue/contrats/[contractId]` (ex. `http://localhost:3000/caisse-imprevue/contrats/MK_CI_CONTRACT_9143.MK.050226_050226_1819`).
- **Composants** : `MonthlyCIContract` / `DailyCIContract`, `RequestSupportCIModal`, `SupportRecognitionPDFModal`, `SupportRecognitionPDF`.

Lors d’une **demande d’aide**, l’utilisateur doit téléverser un **PDF signé**. Ce PDF doit être celui qu’on obtient en cliquant sur **« Reconnaissance d’accompagnement »**, prérempli avec les bonnes données (dates et forfait). Ce document décrit l’état actuel, les écarts et une proposition de mise en œuvre.

---

## 1. Flux actuel

### 1.1 Page contrat

- Onglet **Versements** avec grille des mois (M1…M12) et échéances.
- Bouton **« Reconnaissance d’accompagnement »** → ouvre `SupportRecognitionPDFModal` et permet de **télécharger** un PDF.
- Bouton **« Demander une aide »** → ouvre `RequestSupportCIModal` : saisie du montant + **téléversement d’un PDF** (document signé).

### 1.2 PDF « Reconnaissance d’accompagnement » (`SupportRecognitionPDF`)

- **« en date du »** : rempli avec `supportDate` (actuellement : `support?.approvedAt` si un support existe, sinon `contract.firstPaymentDate`, sinon `contract.createdAt`).
- **« le paiement de la prochaine contribution prévu en date du »** : rempli avec `dueDate` = `supportDate + 30 jours`.
- **Type d’accompagnement** : tableau forfaits A à E fixe, sans surlignage ni ligne personnalisée ; forfait sélectionné indiqué en texte sous le tableau.

### 1.3 Modal « Demander une aide » (`RequestSupportCIModal`)

- Montant (entre `subscriptionCISupportMin` et `subscriptionCISupportMax`).
- Champ **fichier PDF** obligatoire : « Téléversez le document de demande signé par le membre ».
- Aucune précision sur *quel* document ni sur le fait que ce doit être le PDF « Reconnaissance d’accompagnement ».

---

## 2. Problèmes identifiés

| Attendu pour la demande d’aide | Actuel |
|--------------------------------|--------|
| **« en date du »** = **date de la prise d’aide** (date de la demande) | `supportDate` = date du premier paiement ou création du contrat (ou date d’approbation d’un support existant) → pas la date de la demande. |
| **« le paiement de la prochaine contribution prévu en date du »** = **prochaine échéance à payer** (prochain mois DUE) | `dueDate` = `supportDate + 30 jours` → pas lié à l’échéance réelle du contrat. |
| Document à téléverser = PDF téléchargé via « Reconnaissance d’accompagnement » | L’interface ne le dit pas ; le PDF téléchargé n’est pas prérempli avec les bonnes dates ni le bon forfait visuel. |
| Tableau forfait : surligner la ligne du forfait + ligne dynamique si hors A–E (comme dans le contrat CI) | Tableau fixe A–E uniquement, pas de surlignage ni de ligne pour forfait personnalisé. |

Conséquence : le PDF téléchargé aujourd’hui ne correspond pas au document attendu pour une demande d’aide (dates et forfait), et l’utilisateur ne sait pas explicitement qu’il doit utiliser ce PDF.

---

## 3. Spécifications du PDF attendu pour la demande d’aide

Le PDF **Reconnaissance d’accompagnement** utilisé pour **Demander une aide** doit être prérempli comme suit :

### 3.1 Dates

- **« en date du »**  
  - **Date de la prise d’aide** = date à laquelle l’accompagnement est souscrit / demandé.  
  - En pratique : **date du jour** au moment où on génère le PDF pour une nouvelle demande (ou date choisie si on ajoute un sélecteur).

- **« le paiement de la prochaine contribution prévu en date du »**  
  - **Prochaine échéance à payer** = date du **prochain** versement mensuel **à payer** (statut DUE).  
  - Règle : à partir de `contract.firstPaymentDate`, calculer les dates d’échéance de chaque mois (M0, M1, …) ; retenir la première échéance **≥ date du jour** dont le mois est encore **DUE** (non payé).  
  - Pour un contrat **mensuel** :  
    - `firstPaymentDate` = date de la 1ère échéance (M0).  
    - Échéance du mois `monthIndex` = `firstPaymentDate + monthIndex` mois.  
  - Si tous les mois sont déjà payés, on peut utiliser la dernière échéance du contrat ou une règle métier à définir.

### 3.2 Tableau « Type d’accompagnement sollicité »

- **Comportement identique** au tableau « Catégorie des forfaits » du contrat CI (`CaisseImprevuePDFV3.tsx`, lignes 525–559) :
  - **Lignes fixes** : A (10 000), B (20 000), C (30 000), D (40 000), E (50 000) avec montant et plage d’appui si nécessaire.
  - **Surlignage** : la ligne du forfait du contrat (`contract.subscriptionCICode`) est mise en évidence (ex. fond `#E8F4FC`).
  - **Forfait hors A–E** : si `subscriptionCICode` n’est pas A, B, C, D ou E, **ajouter une 6ᵉ ligne** avec :
    - Forfait : `subscriptionCICode - subscriptionCIAmountPerMonth` (formaté fr-FR).
    - Nominal : `subscriptionCINominal`.
    - Appui : `[subscriptionCISupportMin ; subscriptionCISupportMax]`.
  - Cette 6ᵉ ligne est alors la ligne surlignée.

Cela garantit que le document signé et téléversé reflète exactement le forfait du contrat (y compris forfaits personnalisés).

---

## 4. Proposition de mise en œuvre

### 4.1 `SupportRecognitionPDF.tsx`

- **Props** :
  - Conserver / renommer pour clarté :
    - `supportDate` → **`datePriseAide`** (Date) : « en date du ».
    - `dueDate` → **`dateProchaineEcheance`** (Date) : « le paiement de la prochaine contribution prévu en date du ».
  - Étendre `contract` pour inclure au minimum :  
    `subscriptionCICode`, `subscriptionCIAmountPerMonth`, `subscriptionCINominal`, `subscriptionCISupportMin`, `subscriptionCISupportMax`.
- **Tableau forfait** :
  - Réutiliser la logique du tableau forfait de `CaisseImprevuePDFV3` (lignes 525–559) : lignes fixes A–E, surlignage de la ligne du forfait, ajout d’une ligne dynamique si forfait hors A–E.
  - Adapter les styles (ex. `forfaitRowHighlight`, `forfaitCellHighlight`) pour correspondre au rendu du PDF Reconnaissance.

### 4.2 `SupportRecognitionPDFModal.tsx`

- **Calcul des dates** lorsqu’on ouvre le modal **en vue d’une demande d’aide** (ou par défaut) :
  - **Date de prise d’aide** : `new Date()` (date du jour) — ou, si besoin, prop optionnelle `datePriseAide` (ex. pour tests ou saisie manuelle).
  - **Date prochaine échéance** :
    - Si le contrat a une `firstPaymentDate` et (si dispo) la liste des paiements : calculer la **prochaine échéance DUE** (premier mois non payé à partir d’aujourd’hui).
    - Sinon : fallback raisonnable (ex. `datePriseAide + 30 jours` ou premier jour du mois suivant), à documenter comme règle métier.
- Passer au PDF : `datePriseAide`, `dateProchaineEcheance`, et un objet `contract` enrichi (avec `subscriptionCINominal`, `subscriptionCISupportMin`, `subscriptionCISupportMax`).
- **Option** : accepter une prop du type `mode: 'demande-aide' | 'consultation'` pour forcer le calcul « demande d’aide » (date du jour + prochaine échéance) même quand un support existe déjà.

### 4.3 Contrat (MonthlyCIContract / DailyCIContract)

- Passer au modal **Reconnaissance d’accompagnement** un `contract` complet (avec `subscriptionCINominal`, `subscriptionCISupportMin`, `subscriptionCISupportMax`, etc.) pour que le PDF puisse afficher le tableau forfait et la 6ᵉ ligne si besoin.
- Pour le **calcul de la prochaine échéance** :
  - Soit le modal reçoit déjà les `payments` (sous-collection `payments` du contrat) et calcule en interne le premier mois DUE à partir d’aujourd’hui.
  - Soit le parent calcule cette date (ex. dans `MonthlyCIContract`) et la passe en prop au modal (ex. `nextDueDate?: Date`).

### 4.4 `RequestSupportCIModal.tsx`

- **Texte d’aide** à côté du champ « Document signé (PDF) » :
  - Indiquer explicitement : « Téléversez le PDF **Reconnaissance d’accompagnement** signé par le membre. Vous pouvez le générer via le bouton « Reconnaissance d’accompagnement » sur cette page ; ce PDF sera prérempli avec la date de prise d’aide et la prochaine échéance. »
- **Option** : bouton **« Télécharger le formulaire de reconnaissance »** qui :
  - soit ouvre `SupportRecognitionPDFModal` avec les mêmes données (date du jour + prochaine échéance),
  - soit génère directement le PDF avec ces paramètres et le télécharge, sans ouvrir le modal.

Cela clarifie le flux : **télécharger le bon PDF → le faire signer → le téléverser dans « Demander une aide »**.

---

## 5. Règle métier : prochaine échéance

- **Contrat mensuel** : pour chaque `monthIndex` (0 à `subscriptionCIDuration - 1`), l’échéance du mois est :  
  `echeance(monthIndex) = firstPaymentDate + monthIndex` (en mois).
- **Prochaine échéance à payer** : première date `echeance(monthIndex)` telle que :
  - `echeance(monthIndex) >= date du jour` (ou date de prise d’aide),
  - et le paiement du mois `monthIndex` est **DUE** (non payé).
- Si tous les mois sont payés : à définir (ex. ne pas autoriser la demande, ou utiliser la fin du contrat).

Cette règle devra être implémentée une seule fois (dans le modal ou dans un hook/util partagé) et réutilisée pour le PDF et, si besoin, pour d’autres écrans.

---

## 6. Fichiers à modifier (résumé)

| Fichier | Modification |
|--------|----------------|
| `SupportRecognitionPDF.tsx` | Props `datePriseAide` / `dateProchaineEcheance`, contrat étendu ; tableau forfait avec surlignage et ligne dynamique (comme CaisseImprevuePDFV3). |
| `SupportRecognitionPDFModal.tsx` | Calcul date du jour + prochaine échéance (avec payments ou prop du parent) ; passage des nouvelles props et du contrat complet au PDF. |
| `MonthlyCIContract.tsx` / `DailyCIContract.tsx` | Passer un `contract` complet au modal Reconnaissance ; optionnel : calculer `nextDueDate` et le passer au modal. |
| `RequestSupportCIModal.tsx` | Texte explicite sur le PDF à téléverser ; optionnel : bouton « Télécharger le formulaire de reconnaissance ». |

---

## 7. Référence de code – tableau forfait (CaisseImprevuePDFV3)

La logique à répliquer pour le tableau forfait dans `SupportRecognitionPDF` est celle de `CaisseImprevuePDFV3.tsx` (lignes 525–559) :

- `code = contract.subscriptionCICode` (normalisé en majuscule).
- Lignes fixes A à E.
- Si `code` ∉ { A, B, C, D, E }, ajouter une 6ᵉ ligne avec `subscriptionCICode - subscriptionCIAmountPerMonth`, `subscriptionCINominal`, `[subscriptionCISupportMin ; subscriptionCISupportMax]`.
- Surligner la ligne correspondant au forfait du contrat (index 0–4 pour A–E, index 5 pour la ligne personnalisée).

Cela assure la cohérence entre le contrat CI et le document de reconnaissance d’accompagnement utilisé pour la demande d’aide.
