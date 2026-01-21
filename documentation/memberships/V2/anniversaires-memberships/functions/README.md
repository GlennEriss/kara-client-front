## Cloud Functions – Anniversaires membres (V2)

### 1. Jobs planifiés existants

- `dailyBirthdayNotifications` (`functions/src/index.ts` → `scheduled/birthdayNotifications.ts`) :
  - Scanne les membres actifs avec `birthDate`.
  - Calcule `daysUntil` et crée des notifications `birthday_reminder` pour J‑2, J, J+1.

### 2. Besoins complémentaires éventuels

- (Optionnel) Fonction pour recalculer les anniversaires à la demande (par ex. job manuel d’admin) :
  - Utile si on modifie massivement des dates de naissance.

### 3. Intégration avec la vue Anniversaires

- La vue (hook `useMemberBirthdays`) doit utiliser la même logique de calcul que la Cloud Function (J‑2, J, J+1) pour rester cohérente.

### 4. À faire

- [ ] Vérifier la couverture de tests de `birthdayNotifications.ts`.
- [ ] Documenter précisément les types de notifications anniversaires dans la doc notifications globale.
