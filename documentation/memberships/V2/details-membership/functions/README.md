## Cloud Functions – Détails membre (V2)

### 1. Fonctions existantes pertinentes (contexte)

Même si la fiche détail membre consomme surtout des données Firestore en lecture, plusieurs **Cloud Functions existantes** impactent indirectement ce qui est affiché :

- **`dailyBirthdayNotifications`** (`functions/src/index.ts` → `scheduled/birthdayNotifications.ts`) :
  - Calcule les notifications d’anniversaires pour les membres actifs.
  - Utile pour afficher des badges/indicateurs \"Anniversaire aujourd’hui\" sur la fiche.

- **Jobs planifiés caisse / contrats** (`functions/src/scheduled/*.ts`) :
  - `creditPaymentDue`, `ciPaymentDue`, `overdueCommissions`, etc.
  - Peuvent être utilisés pour enrichir la fiche avec des indicateurs (paiements en retard, commissions à venir, etc.) si on expose ces données dans le domaine.

### 2. Fonctions à créer (recommandations V2)

#### 2.1 `syncMemberAggregates` (trigger ou scheduled) ⏳ **À CRÉER**

**Objectif** : Pré‑calculer et maintenir des **champs agrégés** sur le document `users/{memberId}` pour éviter des agrégations lourdes côté client à chaque ouverture de fiche.

- **Champs dérivés possibles sur `users`** :
  - `lastSubscription` (résumé de la dernière subscription).
  - `isSubscriptionValid` (booléen).
  - `contractsCount` (nombre total de contrats).
  - `contractsTotals` (montants agrégés par type de contrat).
  - `filleulsCount` (nombre de filleuls).
- **Déclenchement** :
  - Trigger `onWrite` sur `subscriptions`, `caisseContracts`, `sponsorships`.
  - Ou job `onSchedule` quotidien qui recalcule les agrégats.
- **Avantages** :
  - `useMembershipDetails` peut lire ces champs directement sur `users` sans recalculer à chaque fois.
  - Simplifie le code côté client, surtout pour la section \"résumés\" (paiements, contrats, filleuls).

#### 2.2 `recalculateMemberFinancialSummary` (callable ou scheduled) ⏳ **À CRÉER**

**Objectif** : Générer / recalculer un résumé financier par membre (contrats, paiements) qui peut être affiché dans la section Paiements/Contrats.

- **Signature proposée** :
  ```ts
  recalculateMemberFinancialSummary(data: { memberId: string }): Promise<{
    contractsCount: number
    totalAmount: number
    byType: Record<string, { count: number; total: number }>
  }>
  ```
- **Utilisation** :
  - Appel ponctuel depuis l’admin (bouton \"Recalculer les agrégats\" sur la fiche).
  - Ou déclenché par un job planifié (quotidien) pour tous les membres.

#### 2.3 `syncMemberFromMembershipRequest` (trigger) ⏳ **À CRÉER**

**Objectif** : Assurer que les modifications sur la **demande d’adhésion** (`membershipRequests`) sont bien répercutées sur le document `users` affiché dans la fiche.

- **Déclenchement** :
  - Trigger `onUpdate` / `onWrite` sur `membershipRequests/{dossierId}`.
- **Logique** :
  - Quand la demande est approuvée / mise à jour :
    - Mettre à jour les champs d’identité / contacts / adresse sur `users/{memberId}`.
  - Garantir la cohérence entre ce qui est visible dans `MembershipRequestDetails` et dans la fiche membre V2.

### 3. Architecture d’intégration avec le domaine `memberships`

- Le hook `useMembershipDetails` doit idéalement :
  - **Lire** les champs agrégés pré‑calculés (ex. `lastSubscription`, `contractsCount`) directement sur `users`.
  - **Compléter** les détails fins (liste des contrats, historique complet d’abonnements) via des requêtes Firestore classiques.
- Les Cloud Functions ci‑dessus :
  - Ne sont **pas appelées directement** par le front.
  - Travaillent en arrière‑plan pour garder les données cohérentes et performantes pour la fiche détail.

### 4. Checklist d’implémentation (Cloud Functions liées à `details-membership`)

- [ ] Concevoir le schéma des champs agrégés à ajouter sur `users` (spécifié dans `firebase/README.md`).
- [ ] Implémenter `syncMemberAggregates` (trigger/scheduled) pour :
  - [ ] Mettre à jour `lastSubscription` et `isSubscriptionValid`.
  - [ ] Mettre à jour `contractsCount` / `contractsTotals`.
  - [ ] Mettre à jour `filleulsCount`.
- [ ] Implémenter `recalculateMemberFinancialSummary` (callable ou scheduled) si besoin d’un recalcul manuel / complet.
- [ ] Implémenter `syncMemberFromMembershipRequest` (trigger) pour maintenir la cohérence `membershipRequests` → `users`.
- [ ] Mettre à jour la doc `firebase/README.md` et `notifications` si certaines fonctions créent aussi des notifications.

