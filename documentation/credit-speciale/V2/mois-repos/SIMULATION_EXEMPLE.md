# Simulation numérique – Mois de repos

Exemple concret : prêt de **1 000 000 FCFA** à **10 %** (taux mensuel), **7 échéances**, avec l’échéance 2 en **mois de repos**.

---

## 0. Règle pendant le mois de repos : pas d’intérêts (Option A)

**Question :** Si le mois est au repos, est-ce qu’on ajoute des intérêts ou pas ?

**Réponse (implémentation retenue) :** Pendant un mois de repos, **on n’ajoute pas d’intérêts**. Le capital restant **reste inchangé**. Tout ce que tu devais payer au mois mis au repos (mensualité + intérêts de ce mois) est simplement **reporté** à l’échéance suivante : tu dois toujours le **même capital** au prochain mois.

- **Option A** (retenue) : **pas d’intérêts pendant le repos** → le capital reste inchangé. Ce qui était dû au mois N (repos) est décalé au mois N+1.
- Option B (non retenue) : intérêts pendant le repos → capital suivant = capital × (1 + taux).

Exemple : après le mois 1 il te reste **105 000 FCFA**. Les mois 2 et 3 sont au repos. En début de mois 4 tu dois **toujours 105 000 FCFA** (aucun intérêt ajouté pendant les repos).

---

## 1. Sans mois de repos : mensualité

Formule utilisée dans le code (crédit spéciale) :

- **Montant global** = capital × (1 + taux)^7  
  = 1 000 000 × (1,10)^7  
  = 1 000 000 × 1,948717…  
  ≈ **1 948 717 FCFA**

- **Mensualité** = montant global / 7  
  = 1 948 717 / 7  
  ≈ **278 388 FCFA** (arrondi à l’entier inférieur car 0,157 < 0,5)

Donc : **environ 278 388 FCFA par mois** sur 7 échéances.

Vérification rapide (ordre de grandeur) :  
7 × 278 388 = 1 948 716 FCFA ≈ montant global.

---

## 2. Avec mois de repos : échéance 2 au repos, combien à l’échéance 3 ?

On garde la **même mensualité** : **278 388 FCFA**.  
À l’échéance 3 (mois calendaire 3), on paie donc **278 388 FCFA** comme à l’échéance 1.

Ce qui change, c’est le **reste dû** et le **calendrier** :

- **Mois 1 (échéance 1) – payée**  
  - Capital en début de mois : 1 000 000  
  - Intérêts (10 %) : 100 000  
  - Montant dû : 1 100 000  
  - Versement : 278 388  
  - **Reste dû après échéance 1 : 821 612 FCFA**

- **Mois 2 (échéance 2) – mois de repos**  
  - Aucun versement.  
  - Deux options métier possibles (à trancher dans les règles) :  
    - **Option A – Pas d’intérêts pendant le repos** : le capital reste **821 612** pour le mois suivant (le mois 2 est “gelé”).  
    - **Option B – Intérêts pendant le repos** : 821 612 × 1,10 = **903 773** en début de mois 3.

- **Mois 3 (échéance 3) – on paie**  
  - **Si option A** (pas d’intérêts au repos) :  
    - Capital en début de mois : 821 612  
    - Intérêts : 82 161  
    - Montant dû : 903 773  
    - Versement : **278 388**  
    - Reste dû : 625 385  
  - **Si option B** (intérêts pendant le repos) :  
    - Capital en début de mois : 903 773  
    - Intérêts : 90 377  
    - Montant dû : 994 150  
    - Versement : **278 388**  
    - Reste dû : 715 762  

Dans les deux cas, **le montant à payer à l’échéance 3 est le même : 278 388 FCFA** (la mensualité du contrat).

---

## 3. Résumé

| Question | Réponse |
|----------|--------|
| Remboursement par mois (environ) | **278 388 FCFA** (7 échéances, 1 M, 10 %) |
| Contrat basé sur ce remboursement | Oui : 7 échéances × 278 388 ≈ 1 948 716 FCFA (capital + intérêts) |
| Échéance 1 payée, échéance 2 au repos → combien à l’échéance 3 ? | **278 388 FCFA** (même mensualité) |

La mensualité est **fixe** sur tout le contrat ; le mois de repos décale simplement le calendrier. **Option A retenue** : pas d’intérêts pendant le repos, donc le reste dû ne change pas (voir §0).

---

## 4. Échéances avec repos au mois 2 (option A : pas d’intérêts pendant le repos)

On garde le même cas : **1 M**, **10 %**, **échéance 2 au repos**, **pas d’intérêts pendant le repos** (option A). Mensualité de référence : **278 388 FCFA**.

| Mois calendaire | Mois logique | Capital début | Intérêts (10 %) | Montant dû | Versement | Reste dû |
|-----------------|--------------|---------------|-----------------|------------|-----------|-----------|
| 1 | 1 | 1 000 000 | 100 000 | 1 100 000 | 278 388 | 821 612 |
| 2 | repos | 821 612 | 0 | — | 0 | **821 612** |
| 3 | 2 | 821 612 | 82 161 | 903 773 | 278 388 | 625 385 |
| 4 | 3 | 625 385 | 62 539 | 687 924 | 278 388 | 409 536 |
| 5 | 4 | 409 536 | 40 954 | 450 490 | 278 388 | 172 102 |
| 6 | 5 | 172 102 | 17 210 | **189 312** | **189 312** | 0 |

Avec l’option A, le capital ne bouge pas pendant le repos (mois 2). La dernière échéance est le **mois 6** : montant dû 189 312 FCFA (capital 172 102 + intérêts 17 210), on paie tout le solde. Il n’y a pas d’échéance 7 ou 8 à payer si tout est réglé à l’échéance 6.

---

## 5. Règle des 7 mois : mois **logique**, pas calendaire (piège à éviter)

La règle du crédit spéciale « **plus d’intérêts après le 7e mois** » doit s’appliquer au **7e mois logique** (i.e. à la **7e échéance due**), pas au 7e mois calendaire.

Avec un **repos au mois 2** :
- L’**échéance 8** (mois calendaire 8) est la **7e échéance** (7e mois logique) → **les intérêts s’appliquent encore** à l’échéance 8.
- C’est seulement à partir de l’**échéance 9** (mois calendaire 9) que les intérêts disparaissent (au-delà du 7e mois logique).

Donc : **échéance 8 = dernière échéance avec intérêts** ; **échéance 9 = plus d’intérêts**.

---

## 6. Si on ne paie pas (ou pas assez) à l’échéance 7 → combien à l’échéance 8 puis 9 ?

- **À l’échéance 7** (6e mois logique) : le montant dû est **34 337 FCFA**. Si tu ne payes pas ou que tu payes moins, le solde restant est reporté.

- **À l’échéance 8** (7e mois logique) : on est **encore dans les 7 mois avec intérêts**. Le solde reporté **courra donc des intérêts** (10 %) :
  - Si tu n’as rien payé à l’échéance 7 : solde 34 337 × 1,10 = **37 771 FCFA** à payer à l’échéance 8.
  - Si tu as payé 10 000 à l’échéance 7 : solde 24 337 × 1,10 = **26 771 FCFA** à payer à l’échéance 8.

- **À l’échéance 9** (au-delà du 7e mois logique) : **plus d’intérêts**. On paie uniquement le capital restant (sans intérêt supplémentaire).

Exemples :

| Cas | À l’échéance 7 | À l’échéance 8 (avec intérêts 10 %) | À l’échéance 9 (sans intérêts) |
|-----|----------------|-------------------------------------|-------------------------------|
| Tu ne payes rien à l’échéance 7 | 0 | **37 771 FCFA** (34 337 × 1,10) | Si tu ne payes pas à l’échéance 8 : 37 771 à l’échéance 9 |
| Tu payes 10 000 à l’échéance 7 | 10 000 | **26 771 FCFA** (24 337 × 1,10) | — |
| Tu payes 34 337 à l’échéance 7 | 34 337 | Rien (contrat soldé) | — |

En résumé :

- **À l’échéance 7**, tu paies normalement **34 337 FCFA**.
- **Si tu ne payes pas (ou pas assez) à l’échéance 7**, à l’**échéance 8** tu paies **le solde restant + intérêts** (car l’échéance 8 = 7e mois logique = encore des intérêts). Ex. rien payé à 7 → **37 771 FCFA** à l’échéance 8.
- **C’est à l’échéance 9** que les intérêts disparaissent : tu ne paies plus que le capital restant.

**Implémentation à prévoir** : dans le code, la condition « plus d’intérêts après le 7e mois » doit être basée sur le **numéro du mois logique** (ordre de l’échéance due), pas sur l’index du mois calendaire, dès qu’il existe des mois de repos.

---

## 7. Deux mois de repos (échéances 2 et 4) : quelle est la dernière échéance ?

Scénario : **7 échéances** au total, avec **repos à l’échéance 2** et **repos à l’échéance 4**. Tu paies : échéance 1, (2 = repos), échéance 3, (4 = repos), échéance 5, échéance 6, échéance 7.

Les **7 paiements logiques** doivent tomber sur des **mois calendaires** ; les mois 2 et 4 sont « vides » (repos). Donc :

| Mois calendaire | Échéance (calendrier) | Mois logique | À payer ? |
|-----------------|------------------------|--------------|-----------|
| 1 | Échéance 1 | 1 | Oui (1er paiement) |
| 2 | Échéance 2 | — | **Repos** |
| 3 | Échéance 3 | 2 | Oui (2e paiement) |
| 4 | Échéance 4 | — | **Repos** |
| 5 | Échéance 5 | 3 | Oui (3e paiement) |
| 6 | Échéance 6 | 4 | Oui (4e paiement) |
| 7 | Échéance 7 | 5 | Oui (5e paiement) |
| 8 | Échéance 8 | 6 | Oui (6e paiement) |
| 9 | Échéance 9 | 7 | Oui (**7e et dernier** paiement) |

**Réponse :** la **dernière échéance à payer** est l’**échéance 9** (mois calendaire 9). C’est la 7e échéance **logique** ; il n’y a **pas d’échéance 10 ni 11** : le contrat comporte toujours **7 paiements**, répartis sur **9 mois calendaires** (2 mois étant en repos).

En résumé : **nombre d’échéances à payer = 7** ; **dernier mois calendaire où tu paies = 9** → **dernière échéance = échéance 9**.

---

## 8. Après l’échéance 9 : non-paiement ou paiement partiel (2 repos)

Supposons le même cas (repos aux échéances 2 et 4) : la **dernière échéance prévue** est l’**échéance 9** (7e paiement logique).  
Si tu **ne paies pas** à l’échéance 9, le solde est reporté. Les mois **10 et 11** (calendrier) sont **au-delà du 7e mois logique** → **plus d’intérêts**.

Donc :
- **À l’échéance 10** : tu paies le **solde restant** (ou une partie). **Aucun intérêt** n’est ajouté (déjà passé le 7e mois logique).
- **À l’échéance 11** : si tu as payé **partiellement** au 10, il reste du capital. À l’échéance 11 tu paies ce **capital restant**, **sans intérêt** : il n’y a **pas d’intérêts au 11**.

**Règle générale :** dès que le **7e mois logique** est passé (ici après l’échéance 9), tous les reports (échéances 10, 11, etc.) sont **sans intérêts** — on ne facture que le capital restant jusqu’à solde complet.

---

## 9. Exemple : mensualité 60 000, mois 2 et 3 au repos → combien au mois 4 ?

Données :
- **Mois 1** : tu paies **60 000 FCFA**. Intérêts du mois : 15 000. Montant global : 165 000. **Reste dû après le mois 1 : 105 000 FCFA.**
- Mensualité convenue : **60 000 FCFA** par échéance.
- Taux 10 %.

**Mois 2 au repos :** aucun versement, **pas d’intérêts**. Le capital reste **105 000 FCFA**.

**Mois 3 au repos :** aucun versement, **pas d’intérêts**. Le capital reste **105 000 FCFA**.

**À l’échéance 4 (mois 4) :**
- Capital en début de mois : **105 000 FCFA** (tu dois toujours 105 000)
- Intérêts du mois 4 (10 %) : **10 500 FCFA**
- Montant global dû : **115 500 FCFA**
- Tu paies la mensualité convenue : **60 000 FCFA**
- **Reste dû après l’échéance 4 : 55 500 FCFA**

Donc **au mois 4 tu paies 60 000 FCFA** et il te reste **55 500 FCFA** à rembourser. Le capital n’a pas augmenté pendant les mois de repos.
