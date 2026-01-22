## Workflow d’implémentation – Anniversaires membres (V2)

### Objectif
Refondre la fonctionnalité UC7 (anniversaires) en s’appuyant sur `MemberBirthdaysList` et les jobs de notifications, avec :
- une vue dédiée (liste + calendrier),
- une intégration propre avec le système de notifications,
- des exports par mois.

### Séquence d'implémentation (ordre recommandé)

#### Phase 1 : Cartographie & contrats de données ⏳ **À FAIRE**
1. **Cartographier V1**
   - [ ] Analyser `MemberBirthdaysList.tsx` (logique actuelle : chargement de tous les membres, calcul des anniversaires, vue liste/calendrier, exports XLS/PDF).
   - [ ] Analyser l’usage de `isBirthdayToday` dans `MembershipList.tsx` (badges anniversaires).
   - [ ] Relire la doc V1 (UC7) et la doc notifications anniversaires.
2. **Définir les contrats V2**
   - [ ] Type `MemberBirthday` / `MemberBirthdayViewModel` (membre + birthDate + nextBirthday + daysUntil + age).
   - [ ] API du hook `useMemberBirthdays`.
   - [ ] API du service d’export d’anniversaires (peut réutiliser `MembershipExportService`).

#### Phase 2 : Hook `useMemberBirthdays` ⏳ **À FAIRE**
3. **Créer le hook** (`src/domains/memberships/hooks/useMemberBirthdays.ts`)
   - [ ] Entrées : `month`, `year`, éventuels filtres (searchQuery, type membre…).
   - [ ] Implémentation V1.5 : extraire la logique de `MemberBirthdaysList` (chargement de tous les membres + calcul). 
   - [ ] Implémentation V2 : si nécessaire, optimiser côté Firestore (ne charger que les membres concernés).
   - [ ] Retourne : liste de `MemberBirthday` + états `isLoading`, `isError`.
4. **Tests unitaires**
   - [ ] Cas membres avec dates valides.
   - [ ] Cas membres sans birthDate ou dates invalides (ignorés proprement).
   - [ ] Cas tri par `daysUntil`.

#### Phase 3 : Composants UI V2 ⏳ **À FAIRE**
5. **Adapter `MemberBirthdaysList`**
   - [ ] Le transformer en composant présentatif consommant `useMemberBirthdays`.
   - [ ] Garder le design actuel (liste + calendrier, filtres mois/année/recherche).
   - [ ] Éventuellement l’extraire vers `domains/memberships/components/anniversaires/`.
6. **Créer un onglet/page dédiée `Anniversaires`**
   - [ ] Ajouter un onglet ou une page `/memberships/anniversaires` (selon design).
   - [ ] Afficher `MemberBirthdaysList` + éventuels résumés (nombre d’anniversaires dans le mois, etc.).

#### Phase 4 : Intégration notifications ⏳ **À FAIRE**
7. **Aligner avec les jobs de notifications anniversaires**
   - [ ] Vérifier le fonctionnement actuel de `dailyBirthdayNotifications` (job planifié) et `NotificationService`.
   - [ ] S’assurer que les notifications `birthday_reminder` utilisent les mêmes calculs que `useMemberBirthdays`.
   - [ ] (Optionnel) Afficher dans la vue Anniversaires un indicateur pour les membres ayant une notification en cours.

#### Phase 5 : Exports anniversaires ⏳ **À FAIRE**
8. **Factoriser les exports**
   - [ ] Extraire la logique d’export XLS/PDF aujourd’hui dans `MemberBirthdaysList` vers un petit service `MemberBirthdaysExportService` (ou utiliser `MembershipExportService`).
   - [ ] Permettre l’export par mois (mois/année sélectionnés).
9. **Tests unitaires exports**
   - [ ] Vérifier que seules les lignes du mois/année sélectionnés sont exportées.
   - [ ] Vérifier les colonnes (nom, prénom, matricule, date de naissance, prochain anniversaire, jours restants, âge).

#### Phase 6 : Tests d’intégration & E2E ⏳ **À FAIRE**
10. **Tests d’intégration** (`membership-birthdays.integration.test.tsx`)
    - [ ] Scénario liste : affichage des anniversaires à venir.
    - [ ] Scénario calendrier : navigation mois/année, affichage des jours avec anniversaires.
    - [ ] Scénario export : export Excel/PDF pour un mois donné.
11. **Tests E2E**
    - [ ] Parcours complet : aller sur onglet/section Anniversaires, changer de mois, lancer un export.

### Priorités
- **Critique** : Phase 2 (hook `useMemberBirthdays`) + Phase 3 (UI).
- **Important** : Phase 4 (notifications) + Phase 5 (exports).
- **Finalisation** : Phase 6 (tests intégration/E2E).

### Suivi
- Utiliser cette checklist comme base pour le chantier UC7.
