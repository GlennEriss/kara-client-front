# Tests E2E – Simulation Caisse Spéciale (Standard)

> Plan des tests end-to-end (Playwright) pour le parcours simulation et les actions associées.

## Préconditions

- Admin connecté.
- Au moins un paramètre actif pour STANDARD (ou STANDARD_CHARITABLE) dans `caisseSettings` (fixture ou environnement de test).

---

## Scénarios

### P0-SIM-01 : Accès à la page Simulation

- **Action** : Navigation vers `/caisse-speciale/simulation`.
- **Attendu** :  
  - Titre « Simulation Caisse Spéciale » (ou équivalent).  
  - Breadcrumbs « Caisse Spéciale > Simulation ».  
  - Formulaire visible (Type de caisse, Montant, Durée, Date souhaitée).  
  - Bouton « Lancer la simulation » présent (désactivé ou activé selon validation).

---

### P0-SIM-02 : Lancement d’une simulation avec succès

- **Action** :  
  - Choisir type « Standard ».  
  - Saisir montant (ex. 50 000), durée (ex. 6), date souhaitée.  
  - Cliquer « Lancer la simulation ».
- **Attendu** :  
  - Indicateur de chargement bref (optionnel).  
  - Tableau récapitulatif affiché avec 6 lignes (M1–M6).  
  - Colonnes : N° Échéance, Date d’échéance, Montant, Taux bonus, Bonus gagné.  
  - Ligne ou bloc totaux visible.  
  - Boutons « Exporter en PDF », « Exporter en Excel », « Partager sur WhatsApp » visibles et cliquables.

---

### P0-SIM-03 : Message lorsqu’aucun paramètre actif

- **Précondition** : Aucun paramètre actif pour le type choisi (environnement ou mock).
- **Action** : Choisir un type, remplir les champs, cliquer « Lancer la simulation ».
- **Attendu** :  
  - Message d’erreur type « Aucun paramètre actif pour ce type de caisse ».  
  - Pas de tableau affiché.

---

### P0-SIM-04 : Validation du formulaire

- **Action** :  
  - Montant 0 ou négatif → soumission bloquée ou message d’erreur.  
  - Durée 0 ou 13 → soumission bloquée ou message d’erreur.  
  - Date invalide ou vide → message d’erreur.
- **Attendu** : Les champs invalides affichent une erreur, le tableau ne s’affiche pas (ou le bouton reste désactivé).

---

### P1-SIM-05 : Export PDF

- **Précondition** : Tableau récapitulatif déjà affiché (après P0-SIM-02).
- **Action** : Cliquer « Exporter en PDF ».
- **Attendu** :  
  - Un fichier PDF est téléchargé (nom type `simulation_caisse_speciale_*.pdf`).  
  - Pas d’erreur visible (toast succès ou pas de toast erreur).

---

### P1-SIM-06 : Partager sur WhatsApp

- **Précondition** : Tableau récapitulatif affiché.
- **Action** : Cliquer « Partager sur WhatsApp ».
- **Attendu** :  
  - Ouverture d’un nouvel onglet ou redirection vers une URL contenant `wa.me` ou `api.whatsapp.com` (vérification d’URL possible sans ouvrir réellement WhatsApp).  
  - Ou message / toast indiquant que le partage est prêt.

---

### P2-SIM-07 : Responsive (mobile)

- **Action** : Passer en viewport mobile (ex. 375px), répéter P0-SIM-02.
- **Attendu** :  
  - Formulaire utilisable (champs empilés ou lisibles).  
  - Tableau scroll horizontal si nécessaire, ou carte par ligne.  
  - Boutons accessibles (stack ou wrap).

---

## Données de test (data-testid)

Recommandation : ajouter des `data-testid` pour :

- `simulation-form`
- `simulation-type-select`
- `simulation-monthly-amount`
- `simulation-months-planned`
- `simulation-desired-date`
- `simulation-submit-button`
- `simulation-table`
- `simulation-export-pdf`
- `simulation-export-excel`
- `simulation-share-whatsapp`
- `simulation-error-message`

---

## Références

- [README.md](./README.md) – Vue d’ensemble des tests
- [WORKFLOW.md](../workflow/WORKFLOW.md) – Definition of Done
- [WIREFRAME_SIMULATION.md](../ui/WIREFRAME_SIMULATION.md) – Structure de la page
