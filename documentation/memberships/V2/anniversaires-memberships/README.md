## V2 – Anniversaires des membres (`anniversaires-memberships`)

### 1. État actuel V1

- Composants :
  - `MemberBirthdaysList.tsx` (liste / widget d’anniversaires).
  - Utilitaires locaux (ex. `isBirthdayToday` dans `MembershipList.tsx`).
- Notifications anniversaires partiellement décrites dans `documentation/notifications/*`.
- UC7 décrite en détail dans `V1/ANALYSE_MEMBERSHIPS.md` et `V1/realisationAfaire.md`.
 - Intégration ponctuelle dans la liste principale (badge / surlignage des membres dont l’anniversaire est aujourd’hui).

### 2. UC7 – Objectifs fonctionnels

- Section / onglet **Anniversaires** dans le module memberships.
- Deux vues :
  - **Liste** : anniversaires proches, triés par date.
  - **Calendrier mensuel** : jours colorés, noms des membres.
- Exports PDF / Excel par mois (mois courant ou sélectionné).
- Notifications J‑2, J, J+1.

### 3. Objectifs V2

- Créer des hooks/services dédiés :
  - `useMemberBirthdays` (calcul des anniversaires proches, par mois, etc.).
  - Service de génération des données pour calendrier + exports.
- Intégrer avec le système de notifications global (types, jobs planifiés).
- Garder le design existant de `MemberBirthdaysList` mais le brancher sur la nouvelle couche de domaine.

### 4. Mapping V1 → V2 (brouillon)

- `MemberBirthdaysList.tsx` → composant présentatif V2, consommant un hook `useMemberBirthdays`.
- Calculs `isBirthdayToday` et dérivés → déplacés dans un utilitaire partagé du domaine `memberships`.
- Nouveaux écrans/onglets pour la vue **calendrier** et la page dédiée aux anniversaires.

