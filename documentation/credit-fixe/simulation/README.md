# Crédit Fixe – Sous-module Simulation

> Documentation détaillée du sous-module **simulation** pour Crédit Fixe.

---

## 1. Objectif du sous-module

Permettre à l'admin de simuler rapidement un prêt Crédit Fixe à partir des informations fournies par le membre :

- montant à emprunter
- date du 1er versement
- taux d'intérêt saisi par l'admin (entre `0%` et `50%`)

La simulation doit produire un échéancier de remboursement sur **14 échéances maximum**.

---

## 2. Parcours utilisateur attendu

### 2.1 Saisie initiale

Le membre communique à l'admin :

- le montant à emprunter
- la date du premier versement

L'admin saisit ensuite :

- le taux d'intérêt (`0` à `50`)
- le type de simulation (`standard` ou `personnalisée`)

Puis clique sur **Calculer la simulation**.

### 2.2 Résultat attendu

Le système affiche :

- le montant emprunté
- le montant total à rembourser
- l'échéancier détaillé
- le montant de chaque échéance
- le cumul remboursé et le reste à rembourser

---

## 3. Règles de calcul communes

Variables :

- `C` = capital emprunté
- `T` = taux (%)
- `M` = montant global à rembourser

Formules :

- `interetUnique = C * (T / 100)`
- `M = C + interetUnique`

Exemple :

- `C = 2 000 000`
- `T = 30`
- `interetUnique = 600 000`
- `M = 2 600 000`

Règles globales :

- Le taux est appliqué **une seule fois** (pas d'intérêt composé mensuel).
- Maximum `14` échéances.
- Pas de tableau "référence 7 mois" dans Crédit Fixe.

---

## 4. Simulation standard

### 4.1 Principe

La simulation standard répartit le montant global `M` sur `14` échéances maximum.

### 4.2 Calcul

- `mensualiteStandard = M / 14`
- Arrondir les 13 premières échéances à l'unité FCFA.
- Ajuster la dernière échéance pour que la somme des 14 échéances = `M`.

### 4.3 Résultat

Le tableau affiche 14 lignes (ou moins si décision métier ultérieure), avec :

- numéro d'échéance
- date d'échéance
- montant échéance
- cumul remboursé
- reste à rembourser

---

## 5. Simulation personnalisée

### 5.1 Principe

Le membre décide des montants à rembourser par mois, et l'admin les saisit.

Exemple :

- Mois 1 : `300 000`
- Mois 2 : `400 000`
- Mois 3 : `250 000`
- etc.

### 5.2 Contraintes

- Nombre de mois saisis : `<= 14`.
- Montant mensuel : `>= 0`.
- La somme saisie doit couvrir `M` (ou afficher le restant dû à compléter).

### 5.3 Comportement attendu

- Si la somme des mensualités < `M`, afficher clairement le **reste à planifier**.
- Si la somme des mensualités > `M`, ajuster/alerter la dernière ligne.
- Si une ligne vaut `0`, elle reste valide dans la simulation (utile pour mois sans paiement).

---

## 6. Export, impression et partage

Les deux types de simulation doivent supporter les actions suivantes :

- Export **PDF**
- Export **Excel**
- **Impression**
- Envoi via **WhatsApp**

### 6.1 Export PDF

Le PDF inclut :

- résumé simulation (montant, taux, date 1er versement, type de simulation)
- montant total à rembourser
- tableau des échéances

### 6.2 Export Excel

Le fichier Excel inclut les colonnes :

- `Mois`
- `Date échéance`
- `Montant échéance`
- `Cumul remboursé`
- `Reste`

### 6.3 Impression

- Version imprimable propre (sans éléments UI inutiles).
- Le rendu imprimé doit reprendre le même contenu que le PDF.

### 6.4 WhatsApp

Deux modes possibles (à cadrer à l'implémentation) :

- ouverture WhatsApp avec message prérempli (résumé simulation)
- ajout du lien du PDF exporté dans le message

---

## 7. Liste des taches harmonisee

### 7.1 Documentation realisee

- [x] Specification fonctionnelle de la simulation (standard + personnalisee).
- [x] Documentation des regles de calcul (`0-50%`, max `14` echeances).
- [x] Documentation des sorties (PDF, Excel, impression, WhatsApp).
- [x] Diagramme d'activite cree : `documentation/credit-fixe/simulation/activite/SimulationCreditFixe.puml`.
- [x] Diagramme de sequence cree : `documentation/credit-fixe/simulation/sequence/SEQ_LancerSimulationCreditFixe.puml`.
- [x] Architecture domains detaillee : `documentation/credit-fixe/simulation/architecture/README.md`.
- [x] Wireframes responsive crees : `documentation/credit-fixe/simulation/wireframes/mobile.md` et `documentation/credit-fixe/simulation/wireframes/desktop.md`.
- [x] Referencement de tous les artefacts dans ce README.

### 7.2 Implementation a faire

- [x] Ajouter/adapter les validations Credit Fixe dans le code (`0-50%`, max `14` mois).
- [x] Implementer le calcul standard sur 14 echeances avec ajustement final.
- [x] Implementer le calcul personnalise (max 14 lignes, gestion reste/depassement).
- [x] Afficher clairement les ecarts (reste a planifier / depassement).
- [x] Implementer les actions d'export PDF et Excel.
- [x] Implementer l'action d'impression.
- [x] Implementer l'action de partage WhatsApp.

---

## 8. Impacts techniques

- `src/schemas/credit-speciale.schema.ts`
- `src/components/credit-speciale/CreditSimulationPage.tsx`
- `src/services/credit-speciale/CreditSpecialeService.ts`
- `src/utils/credit-speciale-calculations.ts`
- `src/domains/financial/credit-speciale/fixe/` (cible domains)

---

## 9. Tests minimum

### 9.1 Unitaires

- Taux accepté à `0`, `30`, `50`.
- Taux rejeté à `50.01`.
- Durée rejetée au-delà de `14`.
- Calcul correct de `M = C + (C*T/100)`.

### 9.2 Intégration

- Simulation standard avec génération d'échéancier.
- Simulation personnalisée avec montants variables.
- Vérification du contrôle `<= 14` mois.
- Vérification des exports PDF/Excel.

### 9.3 E2E

- Parcours complet admin : saisie -> calcul -> export PDF -> impression -> partage WhatsApp.

---

## 10. Diagramme d'activite

Le diagramme d'activite de la simulation est documente ici :

- `documentation/credit-fixe/simulation/activite/SimulationCreditFixe.puml`

Il couvre :

- le flux de saisie
- le branchement simulation standard / personnalisee
- les controles de bornes (`taux` et `max 14 mois`)
- les actions de sortie (PDF, Excel, impression, WhatsApp)

---

## 11. Architecture (Domains)

L'architecture cible de cette partie est detaillee ici :

- `documentation/credit-fixe/simulation/architecture/README.md`

Ce document precise :

- la structure domains a implementer,
- le role de chaque couche (entities, schemas, services, hooks, components, exports),
- la strategie de migration depuis l'existant,
- les choix techniques pour PDF, Excel, impression et WhatsApp.

---

## 12. Diagramme de sequence

Le diagramme de sequence de la simulation est documente ici :

- `documentation/credit-fixe/simulation/sequence/SEQ_LancerSimulationCreditFixe.puml`

Dossier associe :

- `documentation/credit-fixe/simulation/sequence/README.md`

Ce diagramme decrit :

- le flux de bout en bout depuis la page jusqu'aux services domains,
- la branche standard vs personnalisee,
- les actions post-simulation (PDF, Excel, impression, WhatsApp).

---

## 13. Wireframes (UI responsive)

La specification wireframe de la page simulation est documentee ici :

- `documentation/credit-fixe/simulation/wireframes/mobile.md`
- `documentation/credit-fixe/simulation/wireframes/desktop.md`

Ces wireframes couvrent :

- le design mobile et desktop,
- le comportement responsive,
- l'alignement au theme couleur KARA existant,
- une direction visuelle moderne et coherente avec le projet.
