# Critique : modification d’un versement (journalier / journalier charitable)

**Contexte** : page détail contrat caisse spéciale journalier/journalier charitable  
`/caisse-speciale/contrats/[id]` (composant `DailyContract.tsx`).  
Bouton « Modifier » dans le modal « Détails du versement ».

---

## 1. Problèmes identifiés

### 1.1 États éparpillés et duplication

- Une quinzaine de `useState` pilotent modals, formulaire d’édition et sélection :  
  `selectedDate`, `paymentDetails`, `showPaymentModal`, `showPaymentDetailsModal`, `showEditPaymentModal`, `editingContribution`, `paymentAmount`, `paymentTime`, `paymentMode`, `paymentFile`, `editModificationReason`, `isEditing`, etc.
- **Conséquences** :
  - Risque de désynchronisation (ex. `paymentDetails` ne reflète plus les données après un `refetch()`).
  - Réinitialisation incomplète : après modification réussie, seuls les champs du formulaire d’édition sont remis à zéro ; `selectedDate` et `paymentDetails` restent sur l’ancienne valeur jusqu’au prochain clic sur le calendrier.
  - Comportement différent selon la façon de fermer le modal d’édition :
    - **Annuler** : réinitialise `editingContribution`, montant, heure, motif, etc.
    - **Fermeture par X ou clic extérieur** (`onOpenChange` du `Dialog`) : seul `showEditPaymentModal` passe à `false`, le reste du state (dont `editingContribution`) n’est pas nettoyé → state « sale » pour les prochaines actions.

### 1.2 Comportement après modification réussie

- Suite à « Modifier le versement » réussi :
  - `invalidateQueries` + `await refetch()` mettent bien à jour les données du contrat côté cache/requête.
  - En revanche, **aucun reset** de `selectedDate` ni de `paymentDetails`.
- L’utilisateur se retrouve avec :
  - Un jour toujours « sélectionné » dans l’UI (ex. panneau latéral / contexte).
  - **`paymentDetails` = ancien objet paiement** (avant la modif), alors que les données affichées par le calendrier (ex. `daysWithStatus`) viennent déjà des données fraîches du hook.
- Résultat : incohérence entre ce que montre le calendrier (à jour) et ce que contient encore le state (ancien). Si l’utilisateur ne reclique pas sur le même jour, il peut avoir l’impression que « après modif on ne peut plus cliquer » ou que l’interface ne réagit pas comme prévu (par exemple à cause d’un overlay résiduel ou d’un focus mal géré après fermeture du modal).

### 1.3 Calendrier et versement modifié

- Les statuts des jours (`daysWithStatus`) sont calculés dans `useContractCalendar` à partir de `data.payments` (données du contrat).
- Après `refetch()`, ces statuts sont à jour. En revanche :
  - La **sélection courante** (`selectedDate` + `paymentDetails`) n’est pas mise à jour.
  - Aucune logique ne « resynchronise » `paymentDetails` avec le paiement correspondant à `selectedDate` après un refetch (pas de dérivation `paymentDetails = f(data, selectedDate)`).
- Donc : le calendrier reflète bien la modification, mais le state local (détails affichés, contexte du jour sélectionné) peut rester sur l’ancienne version du versement.

### 1.4 Modal d’édition et fermeture

- `Dialog` d’édition : `onOpenChange={setShowEditPaymentModal}`.
- Quand l’utilisateur ferme sans enregistrer (X ou clic dehors), seul le booléen change ; **aucun reset** des champs d’édition ni de `editingContribution`.
- Conséquence : à la prochaine ouverture du flux « Modifier », des valeurs ou une contribution précédente peuvent encore être présentes si le code ne les réinitialise pas à l’ouverture.

### 1.5 Risque « plus de clic » après modif

- Causes possibles du sentiment « on ne peut plus cliquer » :
  1. **Overlay / focus** : le `Dialog` (Radix/shadcn) peut laisser temporairement le focus ou un overlay qui intercepte les clics.
  2. **State incohérent** : `paymentDetails` et `selectedDate` restent figés ; l’utilisateur ne voit pas la modification reflétée dans le détail tant qu’il ne reclique pas sur le jour.
  3. **Réinitialisation partielle** : en ne remettant pas à zéro la « sélection » (date + détails) après succès, l’UI donne l’impression que l’écran est encore en mode détail/édition ou bloqué.

---

## 2. Pistes d’amélioration

### 2.1 Reset complet après modification réussie

- Après succès de la modification :
  - Fermer le modal d’édition (déjà fait).
  - **Réinitialiser** : `setPaymentDetails(null)`, `setSelectedDate(null)`, et tous les champs du formulaire d’édition (`editingContribution`, `paymentAmount`, `paymentTime`, `paymentMode`, `paymentFile`, `editModificationReason`).
- Variante plus douce : garder `selectedDate` mais **recalculer** `paymentDetails` à partir des données fraîches (voir 2.2).

### 2.2 Une seule source de vérité pour les détails du jour

- Ne pas garder `paymentDetails` comme state indépendant qui peut devenir obsolète.
- Dériver les détails du versement affichés à partir de **`data` (contrat refetch)** et **`selectedDate`** :
  - Par exemple : `paymentDetailsForSelected = selectedDate ? getPaymentForDate(selectedDate) : null`, et utiliser `paymentDetailsForSelected` partout où on affiche les détails (modal Détails, préremplissage du formulaire d’édition).
- Ainsi, après `refetch()`, le prochain rendu affiche automatiquement le bon versement pour le jour sélectionné, sans state dupliqué.

### 2.3 Reset à la fermeture du modal d’édition (tous les chemins)

- Dans le `onOpenChange` du `Dialog` d’édition, quand `open` devient `false`, appeler une fonction qui :
  - remet `editingContribution` à `null`,
  - réinitialise tous les champs du formulaire (montant, heure, mode, fichier, motif),
  - et éventuellement `paymentDetails` / `selectedDate` selon la stratégie choisie (2.1 ou 2.2).
- Garder la même logique dans le bouton « Annuler » pour éviter deux comportements différents (Annuler vs X).

### 2.4 Réduire la quantité de state local

- Regrouper les états liés au flux « détail + édition » dans un seul objet ou un `useReducer` (ex. `{ selectedDate, editingContributionId, editForm, modals }`) avec des transitions claires (ouvrir détail, ouvrir édition, annuler, succès).
- Ou extraire le flux dans un composant/hook dédié (« détail du jour sélectionné » + « édition d’une contribution ») pour limiter les états dans `DailyContract`.

### 2.5 Comportement du calendrier après modification

- Après une modification réussie, soit :
  - **Option A** : tout désélectionner (reset `selectedDate` + `paymentDetails`) pour que l’utilisateur voie le calendrier « neutre » et puisse recliquer sur le jour pour revoir les détails à jour.
  - **Option B** : garder `selectedDate`, dériver `paymentDetails` de `getPaymentForDate(selectedDate)` (2.2), et s’assurer que le modal Détails n’est plus ouvert après édition ; au prochain rendu, si on rouvre le détail pour ce jour, les infos seront déjà à jour.

### 2.6 Vérifications techniques « plus de clic »

- S’assurer qu’après fermeture du modal d’édition, aucun élément (overlay, trap de focus) ne reste actif (vérifier avec les devtools ou tests E2E).
- Après `refetch()`, ne pas bloquer le thread trop longtemps ; si besoin, afficher un court état de chargement sur le calendrier ou le panneau de détail pour éviter l’impression de freeze.

---

## 3. Résumé

| Problème | Impact | Amélioration proposée |
|----------|--------|------------------------|
| State éparpillé, reset partiel après modif | Détails obsolètes, confusion, impression de blocage | Reset complet ou dérivation `paymentDetails = f(data, selectedDate)` |
| Fermeture modal (X / extérieur) ne reset pas | State sale, réouverture avec anciennes valeurs | Reset dans `onOpenChange` quand `open === false` |
| `paymentDetails` non synchronisé après refetch | Calendrier à jour, détail non | Dériver les détails du jour depuis les données du contrat |
| Beaucoup de `useState` pour un même flux | Bugs subtils, maintenance difficile | Regrouper en objet / reducer ou extraire un hook dédié |

En priorité : **reset cohérent à la fermeture du modal d’édition** (tous chemins) et **resynchronisation des détails du jour avec les données refetch** (reset ou dérivation) après modification d’un versement.
