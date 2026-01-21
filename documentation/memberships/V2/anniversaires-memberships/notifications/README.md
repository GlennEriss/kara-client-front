## Notifications – Anniversaires membres (V2)

### 1. Notifications système existantes

- Notifications `birthday_reminder` créées par la Cloud Function `dailyBirthdayNotifications` :
  - J‑2 : "L'anniversaire de X est dans 2 jours".
  - J   : "Aujourd'hui est l'anniversaire de X".
  - J+1 : "L'anniversaire de X était hier".

### 2. Intégration avec la vue Anniversaires

- La vue peut :
  - Afficher un badge ou un indicateur pour les membres ayant une notification active.
  - Proposer un lien vers le centre de notifications pour voir tous les rappels.

### 3. Toasts UI

- Toasts pour :
  - Erreur de chargement des membres pour la vue Anniversaires.
  - Erreur d’export Excel/PDF.
  - Message "Aucun anniversaire pour cette période".

### 4. À faire

- [ ] Vérifier la cohérence des messages de notifications avec les textes affichés dans l’UI.
- [ ] Ajouter les toasts manquants dans `MemberBirthdaysList` lors de la refacto V2.
