# Enregistrer le paiement au garant – Crédit Spéciale V2

> Documentation de la fonctionnalité **Enregistrer le paiement au garant** sur la page détail d’un contrat crédit spéciale (`/credit-speciale/contrats/[id]`), onglet **Commission du garant**.  
> **Statut :** réflexion / spécification (implémentation à faire après validation).

---

## Sommaire

- [1. Objectif](#1-objectif)
- [2. Contexte actuel](#2-contexte-actuel)
- [3. Règles métier](#3-règles-métier)
- [4. Parcours utilisateur](#4-parcours-utilisateur)
- [5. Options de conception](#5-options-de-conception)
- [6. Architecture technique proposée](#6-architecture-technique-proposée)
- [7. Firestore et Storage](#7-firestore-et-storage)
- [8. Checklist avant implémentation](#8-checklist-avant-implémentation)
- [9. Références](#9-références)

---

## 1. Objectif

Permettre à l’administrateur d’**enregistrer la preuve du paiement effectué au garant** (commission) pour un contrat crédit spéciale. À la fin de l’onglet **Commission du garant**, l’équipe doit pouvoir :

- Voir le **total des commissions** dues au garant (déjà affiché).
- **Enregistrer un paiement** qui prouve que la mutuelle a payé le garant : **date**, **montant**, **moyen de paiement** (Airtel Money, Mobicash, Espèce, Virement bancaire), **preuve** (fichier image/PDF), éventuellement **référence** ou **commentaire**.

Cela répond au besoin de **traçabilité** : « J’ai payé le garant, voici la preuve. »

---

## 2. Contexte actuel

### 2.1 Page et onglet concernés

- **Page :** `/credit-speciale/contrats/[id]` (ex. `/credit-speciale/contrats/MK_CSP_8941_150226_2359`).
- **Onglet :** **Commission du garant** (visible uniquement pour les contrats **crédit spéciale**, pas pour crédit fixe ni crédit aide).

### 2.2 Ce qui existe déjà

- **Données :** Les **rémunérations du garant** (`GuarantorRemuneration`) sont créées automatiquement à chaque paiement client d’échéance (si garant membre et taux > 0). Chaque enregistrement contient : `creditId`, `guarantorId`, `paymentId`, `amount`, `month`, dates, etc.
- **UI :** Dans l’onglet Garant, on affiche :
  - Les infos du garant et le taux de commission.
  - Un **tableau** des commissions par mois (M1, M2, …) : reste dû, %, somme due.
  - Le **total des commissions** en bas.
- **Manque :** Aucun moyen actuel d’enregistrer **le fait que la mutuelle a payé le garant** (date, montant, preuve, mode de paiement). Il n’existe ni champ « payé au garant » ni entité dédiée.

### 2.3 Type `GuarantorRemuneration` actuel

```ts
interface GuarantorRemuneration {
  id: string
  creditId: string
  guarantorId: string
  paymentId: string   // Lien vers le paiement client qui a généré cette commission
  amount: number
  month: number
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}
```

Aucun champ `paidAt`, `paymentProofUrl`, `paidBy`, etc.

---

## 3. Règles métier

### 3.1 Qui peut enregistrer le paiement au garant ?

- **Rôle :** Administrateur (accès à la page détail contrat crédit spéciale).
- **Condition :** Le contrat doit avoir un **garant membre** avec un **taux de commission > 0** et au moins **une commission** (rémunération) enregistrée.

### 3.2 Quand peut-on enregistrer ?

- **Disponible** dès qu’il existe au moins une rémunération garant pour ce contrat (onglet Garant affiche déjà le tableau et le total).
- On peut enregistrer **plusieurs paiements au garant** pour un même contrat (ex. : paiement partiel après M1, puis paiement du solde après M3). La conception doit le permettre si on choisit l’option « paiement par enregistrement » (voir §5).

### 3.3 Données à saisir (proposition)

| Champ              | Obligatoire | Description |
|--------------------|-------------|-------------|
| **Date du paiement** | Oui         | Date à laquelle la mutuelle a payé le garant. |
| **Heure**            | Oui         | Heure du paiement (HH:mm). |
| **Montant (FCFA)**   | Oui         | Montant versé au garant (peut être le total des commissions ou un acompte). |
| **Moyen de paiement** | Oui         | Airtel Money, Mobicash, Espèce, Virement bancaire (aligné caisse spéciale / crédit spéciale). |
| **Preuve**           | Recommandé  | Fichier image ou PDF (capture virement, reçu, etc.). |
| **Référence**        | Optionnel   | N° de transaction, référence virement, etc. |
| **Commentaire**      | Optionnel   | Note libre. |

### 3.4 Ce qu’on ne fait pas (dans un premier temps)

- Pas de **lien automatique** obligatoire entre un enregistrement « paiement au garant » et les lignes de commission individuelles (M1, M2, …). On enregistre un **paiement global** (ou un paiement par lot) avec preuve ; le rapprochement montant / total des commissions peut rester manuel ou faire l’objet d’une évolution (ex. cocher les mois couverts).
- Pas de **notification au garant** déclenchée par l’enregistrement du paiement (à envisager plus tard si besoin).

---

## 4. Parcours utilisateur

1. **Navigation :** Admin ouvre `/credit-speciale/contrats/[id]`, onglet **Commission du garant**.
2. **Contexte :** Le tableau des commissions et le total sont affichés (comportement actuel).
3. **Nouveau bloc (en bas de l’onglet) :**
   - Titre : **Paiement au garant**
   - Sous-titre : « Enregistrer la preuve du versement effectué au garant. »
   - Bouton : **Enregistrer un paiement au garant**.
4. **Clic sur le bouton** → ouverture d’un **modal** avec :
   - Date du paiement (date picker).
   - Heure (input HH:mm).
   - Montant en FCFA (number).
   - Moyen de paiement (select ou radio : Airtel Money, Mobicash, Espèce, Virement bancaire).
   - Preuve (upload fichier image/PDF, optionnel mais recommandé).
   - Référence (texte, optionnel).
   - Commentaire (textarea, optionnel).
   - Boutons : **Annuler** / **Enregistrer**.
5. **À la soumission :** Enregistrement en base (Firestore + upload preuve dans Storage si fichier), toast succès, fermeture du modal, rafraîchissement des données. Affichage sous le tableau d’une **section « Historique des paiements au garant »** listant les enregistrements (date, montant, moyen, preuve cliquable si présente).

---

## 5. Options de conception

### Option A – Une seule « preuve de paiement » par contrat

- **Idée :** Ajouter sur le **contrat** (ou sur une entité 1–1 avec le contrat) des champs du type :  
  `guarantorPaymentDate`, `guarantorPaymentAmount`, `guarantorPaymentMode`, `guarantorPaymentProofUrl`, `guarantorPaymentReference`, `guarantorPaymentComment`, `guarantorPaymentBy`, `guarantorPaymentAt`.
- **Avantage :** Simple, pas de nouvelle collection.
- **Inconvénient :** Un seul enregistrement par contrat ; impossible de tracer plusieurs versements (ex. paiement après M1, puis après M3).

### Option B – Nouvelle collection « Paiements au garant » (recommandé)

- **Idée :** Créer une collection **`guarantorPayments`** (ou `creditGuarantorPayments`) avec des documents du type :

  ```ts
  interface GuarantorPayment {
    id: string
    creditId: string
    guarantorId: string
    paymentDate: Date
    paymentTime: string
    amount: number
    mode: 'airtel_money' | 'mobicash' | 'cash' | 'bank_transfer'
    proofUrl?: string
    proofPath?: string
    reference?: string
    comment?: string
    createdBy: string
    createdAt: Date
    updatedAt: Date
  }
  ```

- **Avantage :** Plusieurs paiements possibles par contrat ; historique clair ; requêtes par `creditId` ou `guarantorId` faciles.
- **Inconvénient :** Une nouvelle collection + règles Firestore + index éventuel.

### Option C – Marquer chaque `GuarantorRemuneration` comme « payée » + preuve globale

- **Idée :** Ajouter sur **chaque** `GuarantorRemuneration` : `paidAt?`, `paymentProofUrl?`, `paidBy?`. Lors de l’enregistrement « paiement au garant », on choisit quelles lignes (mois) sont couvertes et on met à jour ces champs + une preuve partagée (ou une par ligne).
- **Avantage :** Lien explicite commission ↔ paiement.
- **Inconvénient :** Plus complexe (plusieurs documents à mettre à jour, gestion des preuves multiples ou partagées).

**Recommandation :** **Option B** pour la V2 : une collection dédiée **paiements au garant**, avec un historique affiché dans l’onglet Garant. Si besoin ultérieur, on pourra ajouter un champ optionnel `remunerationIds[]` sur chaque `GuarantorPayment` pour lier explicitement aux commissions couvertes.

---

## 6. Architecture technique proposée (domains)

L’implémentation **suit l’architecture domains** (même approche que `modifier-contrat-pdf-televerser` et `modifier-demande`).  
Le code métier (entités, service, hooks) vit sous **`src/domains/financial/credit-speciale/contrats/`**.  
Les composants UI restent dans **`src/components/credit-speciale`** et **importent les hooks du domaine**.  
Les repositories restent dans **`src/repositories/credit-speciale/`** et sont utilisés par le service du domaine (via factory ou injection).

### 6.1 Chemins (domains)

| Rôle | Chemin |
|------|--------|
| **Entities** (type `GuarantorPayment`) | `src/domains/financial/credit-speciale/contrats/entities/guarantor-payment.types.ts` |
| **Service** (méthode `recordGuarantorPayment`) | `src/domains/financial/credit-speciale/contrats/services/CreditContractService.ts` (ou `GuarantorPaymentService.ts` dans le même dossier) |
| **Hooks** (queries + mutation) | `src/domains/financial/credit-speciale/contrats/hooks/useGuarantorPayments.ts` (ou extension de `useCreditContractMutations.ts`) |
| **Repository** (utilisé par le service) | `src/repositories/credit-speciale/GuarantorPaymentRepository.ts` |
| **Repository documents / Storage** (upload preuve) | `src/domains/infrastructure/documents/repositories/DocumentRepository.ts` ou service Storage existant |
| **UI modal** | `src/components/credit-speciale/GuarantorPaymentModal.tsx` |
| **UI détail contrat (onglet Garant)** | `src/components/credit-speciale/CreditContractDetail.tsx` |

**Note :** Le repository **GuarantorPaymentRepository** reste dans `src/repositories/credit-speciale/` ; le **service du domaine** l’utilise (via `RepositoryFactory` ou injection). Aucun déplacement des repositories existants.

### 6.2 Entité et repository

- **Type (domaine) :** `GuarantorPayment` défini dans `contrats/entities/guarantor-payment.types.ts` (voir §5 Option B). On peut réexporter ou étendre le type depuis `src/types/types.ts` si besoin de cohérence globale.
- **Repository (infra) :** `IGuarantorPaymentRepository` / `GuarantorPaymentRepository` dans `src/repositories/credit-speciale/` :
  - `createGuarantorPayment(data, proofFile?)`
  - `getGuarantorPaymentsByCreditId(creditId)`
  - `getGuarantorPaymentsByGuarantorId(guarantorId)` (optionnel)

### 6.3 Service (domaine)

- **Fichier :** `src/domains/financial/credit-speciale/contrats/services/CreditContractService.ts` (ou `GuarantorPaymentService.ts`).
- **Méthode :** `recordGuarantorPayment(creditId, data: { paymentDate, paymentTime, amount, mode, reference?, comment? }, proofFile?: File, adminId: string): Promise<GuarantorPayment>`
- **Rôle :** validation métier, récupération du contrat/garant, upload preuve (Storage), appel au `GuarantorPaymentRepository.createGuarantorPayment`.

### 6.4 Hooks (domaine)

- **Fichier :** `src/domains/financial/credit-speciale/contrats/hooks/useGuarantorPayments.ts` (ou intégré dans un hook existant).
- **Query :** `useGuarantorPaymentsByCreditId(creditId)` → appelle le repository (via service ou directement selon convention du projet) et retourne la liste des paiements au garant.
- **Mutation :** `useRecordGuarantorPayment()` → appelle le service domaine `recordGuarantorPayment`, puis invalide les queries `guarantorPayments`, `creditContract`, etc.

### 6.5 UI (composants)

- **Modal :** **`GuarantorPaymentModal`** dans `src/components/credit-speciale/` : formulaire date, heure, montant, mode, preuve, référence, commentaire ; utilise le hook de mutation du domaine.
- **Emplacement dans le détail :** **`CreditContractDetail.tsx`**, onglet **Commission du garant** :
  - Bloc « Paiement au garant » avec bouton **Enregistrer un paiement au garant**.
  - Section **Historique des paiements au garant** utilisant `useGuarantorPaymentsByCreditId(contract.id)` (hook du domaine).

### 6.6 Stockage de la preuve

- **Storage :** Même approche que les preuves de paiement client (crédit/caisse) : dossier dédié, ex. `credit/{creditId}/guarantor-payments/{paymentId}_proof.{ext}`. Peut passer par le `DocumentRepository` du domaine infrastructure si déjà utilisé pour les preuves crédit.
- **Compression image :** Réutiliser le même mécanisme que pour les preuves de versement client (WebP, taille raisonnable).

---

## 7. Firestore et Storage

### 7.1 Nouvelle collection (Option B)

- **Nom proposé :** `guarantorPayments` (à ajouter dans `firebase-collection-names.ts`).
- **Champs stockés :** `creditId`, `guarantorId`, `paymentDate`, `paymentTime`, `amount`, `mode`, `proofUrl`, `proofPath`, `reference`, `comment`, `createdBy`, `createdAt`, `updatedAt`.
- **Index Firestore :**  
  - Requête par `creditId` (liste des paiements au garant pour un contrat).  
  - Optionnel : `guarantorId` si on veut lister par garant.

### 7.2 Règles de sécurité

- **Lecture / écriture :** Réservées aux utilisateurs authentifiés avec rôle admin (ou même règle que les autres collections crédit).
- **Storage :** Règles pour le chemin `credit/{creditId}/guarantor-payments/*` : upload et lecture par admin uniquement.

---

## 8. Checklist avant implémentation

- [ ] Valider l’option de conception (A, B ou C) avec l’équipe.
- [ ] **Domains :** Créer ou compléter `src/domains/financial/credit-speciale/contrats/` (entities, services, hooks) si la structure n’existe pas encore.
- [ ] Créer le type `GuarantorPayment` dans `contrats/entities/guarantor-payment.types.ts` et la collection Firestore `guarantorPayments`.
- [ ] Implémenter `GuarantorPaymentRepository` dans `src/repositories/credit-speciale/` (create + getByCreditId).
- [ ] Ajouter la méthode `recordGuarantorPayment` dans le **service du domaine** `contrats/services/` (upload preuve + create via repository).
- [ ] Créer les **hooks du domaine** dans `contrats/hooks/` : `useGuarantorPaymentsByCreditId`, mutation d’enregistrement + invalidation des queries.
- [ ] Créer le modal **GuarantorPaymentModal** dans `src/components/credit-speciale/` (formulaire date, heure, montant, mode, preuve, référence, commentaire) ; il utilise les hooks du domaine.
- [ ] Dans **CreditContractDetail.tsx**, onglet Commission du garant : ajouter le bloc « Paiement au garant » + bouton + section « Historique des paiements au garant » (données via hook du domaine).
- [ ] Règles Firestore et Storage pour `guarantorPayments` et le chemin Storage des preuves.
- [ ] Tests manuels : enregistrer un paiement avec/sans preuve, vérifier l’affichage de l’historique.

---

## 9. Références

- **Architecture domains (référence) :** `documentation/credit-speciale/V2/modifier-contrat-pdf-televerser/README.md` — structure de doc et **chemins domains** (`contrats/entities`, `contrats/services`, `contrats/hooks`, UI dans `components/credit-speciale`).
- **Onglet Commission du garant :** `src/components/credit-speciale/CreditContractDetail.tsx` (TabsContent `value="guarantor"`, lignes ~2256–2422).
- **Rémunérations garant :** `GuarantorRemuneration`, `useGuarantorRemunerationsByCreditId`, `GuarantorRemunerationRepository`, `CreditSpecialeService` (création des rémunérations à chaque paiement client).
- **Moyens de paiement (alignement) :** Crédit spéciale utilise `airtel_money`, `mobicash`, `cash`, `bank_transfer` (voir `CreditPaymentModal`, `CreditPaymentMode`).
- **Upload preuve (existant) :** Voir `CreditSpecialeService.createPayment` (upload preuve paiement client) et Storage paths pour crédit.
- **Analyse métier garant :** `documentation/credit-speciale/ANALYSE_CREDIT_SPECIALE.md` (points 20–21 : rémunération garant, consultation historique).
