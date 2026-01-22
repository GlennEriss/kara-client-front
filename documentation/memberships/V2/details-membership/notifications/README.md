## Notifications – Détails membre (V2)

### 1. Toasts UI (feedback immédiat)

Les toasts sont utilisés pour informer l’admin lors d’actions sur la fiche membre.

#### 1.1 Scénarios de toasts recommandés

- **Chargement / erreur de chargement**
  - `toast.error` si `useMembershipDetails` renvoie une erreur (membre introuvable, problème réseau).
- **Navigation vers vues liées**
  - Optionnel : `toast.info` lors de la redirection vers des modules externes (caisse, véhicules, filleuls) si l’action peut être lente.
- **Actions sur les abonnements / contrats**
  - `toast.success` après une action validée dans une modal liée (par ex. mise à jour d’un abonnement, selon ce qui sera implémenté).

> Les toasts restent locaux à la page et ne créent pas de documents `notifications` en base.

### 2. Notifications système (Firestore `notifications`)

Ces notifications sont stockées en base et visibles dans le centre de notifications global. Elles ne sont pas déclenchées directement depuis la fiche, mais **influencent ce que l’admin va consulter dans la fiche**.

#### 2.1 Types d’événements pertinents pour `details-membership`

- **Abonnements**
  - `subscription_expired` : abonnement arrivé à échéance.
  - `subscription_expiring_soon` : abonnement qui va expirer (par ex. dans 7 jours).
  - Effet attendu : l’admin clique la notification → ouvre la fiche membre pour voir les détails d’abonnement.

- **Contrats / caisse**
  - `contract_payment_due` : échéance à venir sur un contrat caisse.
  - `contract_overdue` : paiement en retard.
  - Effet attendu : l’admin se rend sur la fiche membre, puis suit les liens vers les modules caisse concernés.

- **Filleuls / parrainage** (si déjà modélisé dans le système de notifications)
  - `new_filleul_linked` : nouveau filleul rattaché à ce membre.
  - Effet attendu : consulter la section \"Filleuls\" de la fiche membre.

> Les types exacts (`NotificationType`) devront être ajoutés dans `src/types/types.ts` si non existants.

### 3. Déclencheurs des notifications (backend)

Les événements suivants peuvent déclencher des notifications système, via Cloud Functions (décrites dans `functions/README.md` et la doc globale notifications) :

- **Changement de statut d’abonnement**
  - Quand une subscription passe de \"active\" à \"expired\" ou approche sa date de fin.
  - Cloud Function côté `subscriptions` qui crée une notification `subscription_expired` / `subscription_expiring_soon`.

- **Échéances de contrats caisse**
  - Jobs planifiés existants (`creditPaymentDue`, `ciPaymentDue`, `overdueCommissions`, etc.) peuvent créer des notifications liées à `memberId`.

- **Mise à jour de la demande d’adhésion**
  - Déjà couvert par les notifications `membership_approved`, `membership_rejected`, etc.
  - L’admin peut ensuite ouvrir la fiche membre pour voir l’impact de ces changements.

### 4. Intégration dans la fiche détails membre

Même si la fiche ne crée pas elle‑même de notifications système, elle peut :

- **Afficher des indicateurs visuels** basés sur les données pré‑calculées :
  - Badge \"Abonnement expiré\" sur la section abonnement.
  - Badge \"Paiement en retard\" sur la section contrats/paiements.
  - Badge \"N filleuls\" si nouveau filleul rattaché.
- **Offrir un point d’entrée depuis une notification** :
  - Une notification peut contenir `memberId` dans son `metadata`.
  - Le centre de notifications ouvre `/memberships/{memberId}` → la fiche s’affiche avec les sections déjà mises en avant.

### 5. Checklist d’alignement avec le système de notifications global

- [ ] Vérifier dans `documentation/notifications/*` que les types suivants existent (ou les ajouter) :
  - `subscription_expired`, `subscription_expiring_soon`.
  - `contract_payment_due`, `contract_overdue`.
  - (Optionnel) `new_filleul_linked`.
- [ ] S’assurer que les Cloud Functions liées remplissent bien `memberId` dans `metadata` pour permettre une navigation directe vers la fiche.
- [ ] Ajouter, si besoin, de petits indicateurs visuels sur la fiche pour refléter l’état signalé par ces notifications.

