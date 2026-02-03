# Tests d'intégration – Simulation Caisse Spéciale (Standard)

> Plan des tests d’intégration pour le flux formulaire → hook → service → repository → tableau.

## Scénarios

### 1. Flux complet – Paramètres actifs (STANDARD)

- **Arrange** : Mock `CaisseSettingsRepository.getActiveSettings('STANDARD')` retourne un document avec `bonusTable` (M4–M12).
- **Act** : Remplir le formulaire (Standard, 50 000 FCFA, 12 mois, date fixe), soumettre « Lancer la simulation ».
- **Assert** :  
  - Service reçoit les bons paramètres.  
  - Repository est appelé avec `caisseType = 'STANDARD'`.  
  - Résultat : 12 lignes, colonnes remplies (N° échéance, date, montant, taux bonus, bonus FCFA), totaux cohérents.  
  - Aucun appel Firestore en écriture.

### 2. Flux complet – Paramètres actifs (STANDARD_CHARITABLE)

- Même principe avec `caisseType = 'STANDARD_CHARITABLE'`.
- Vérifier que les lignes et bonus reflètent la `bonusTable` du type charitable (valeurs potentiellement différentes).

### 3. Aucun paramètre actif

- **Arrange** : Mock `getActiveSettings(type)` retourne `null`.
- **Act** : Soumettre le formulaire.
- **Assert** :  
  - Service retourne `{ error: '...', rows: [] }`.  
  - Composant affiche un message d’erreur type « Aucun paramètre actif pour ce type de caisse ».  
  - Aucun tableau affiché.

### 4. Export PDF après simulation

- **Arrange** : État avec `rows` et `totals` déjà calculés (mock ou flux 1).
- **Act** : Déclencher « Exporter en PDF » (clic sur le bouton dans le composant).
- **Assert** :  
  - `SimulationExportService.exportToPDF(rows, totals)` est appelé.  
  - Un Blob PDF est produit.  
  - Aucun appel Firestore.

### 5. Export Excel après simulation

- Même principe que 4 pour `exportToExcel(rows, totals)`.

### 6. Partager WhatsApp après simulation

- **Arrange** : État avec `rows` et `totals` disponibles.
- **Act** : Clic sur « Partager sur WhatsApp ».
- **Assert** :  
  - Construction d’un texte ou d’une URL `wa.me/?text=...` (ou équivalent).  
  - `window.open` ou navigation vers cette URL (mockable).  
  - Aucun appel Firestore.

---

## Composants à tester (intégration)

- **SimulationForm** : soumission → appel du hook → affichage du tableau ou du message d’erreur.
- **SimulationTableView** (ou zone tableau dans le form) : réception `rows` / `totals` → rendu des lignes et des totaux, boutons Export / WhatsApp actifs.

---

## Mocks recommandés

- `CaisseSettingsRepository.getActiveSettings` : retourner un document avec `bonusTable` ou `null`.
- `window.open` / `location.href` pour le partage WhatsApp (pour ne pas ouvrir une vraie fenêtre).
- Pas de mock Firestore en écriture (aucun appel attendu).

---

## Couverture cible

- Flux principal (run simulation + affichage) : **70 %+**
- Exports et partage : **60 %+**
