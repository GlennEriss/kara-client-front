## Notifications – Liste des membres (V2)

### 1. Toasts UI (feedback utilisateur immédiat)

Les toasts sont utilisés pour donner un feedback immédiat à l'utilisateur lors d'actions sur la liste des membres. Ils sont implémentés via `sonner` (`toast.success`, `toast.error`, `toast.info`).

#### 1.1 Toasts existants (V1)

| Action | Type | Message | Durée |
|--------|------|---------|-------|
| **Réinitialisation filtres** | `success` | "🔄 Filtres réinitialisés" | 3000ms |
| **Actualisation données** | `success` | "✅ Données actualisées" | 3000ms |
| **Erreur actualisation** | `error` | "❌ Erreur lors de l'actualisation" | 4000ms |
| **Export réussi (CSV)** | `success` | "Export CSV généré" | - |
| **Export réussi (Excel)** | `success` | "Export Excel généré" | - |
| **Export réussi (PDF)** | `success` | "Export PDF généré" | - |
| **Erreur export** | `error` | "Erreur lors de l'export" | - |
| **Aucun membre à exporter** | `info` | "Aucun membre à exporter selon les critères" | - |
| **PDF adhésion non disponible** | `info` | "Aucune fiche d'adhésion disponible pour ce membre" | - |

#### 1.2 Toasts à ajouter (V2)

| Action | Type | Message proposé | Contexte |
|--------|------|------------------|----------|
| **Changement de tab** | `info` | "Affichage des {tabName}" | Optionnel, pour feedback UX |
| **Filtres appliqués** | `success` | "{count} filtres actifs" | Quand filtres avancés appliqués |
| **Export en cours** | `info` | "Génération de l'export en cours..." | Pour exports volumineux (Cloud Function) |
| **Export terminé (Cloud Function)** | `success` | "Export terminé. Téléchargement disponible." | Avec URL de téléchargement |

### 2. Notifications système (NotificationService)

Les notifications système sont stockées dans Firestore (`notifications` collection) et affichées dans le centre de notifications de l'application.

#### 2.1 Notifications existantes (liées aux membres)

Actuellement, le système de notifications gère principalement les **demandes d'adhésion** (`membership_approved`, `membership_rejected`, etc.), pas directement la liste des membres.

#### 2.2 Notifications à créer (V2 - recommandations)

##### 2.2.1 Rappels abonnements expirés

- **Type** : `subscription_expired` ou `subscription_expiring_soon`
- **Déclenchement** : Scheduled Cloud Function (quotidien) qui scanne les abonnements expirés/expirant bientôt
- **Cible** : Admins
- **Message** : "X membres ont un abonnement expiré" ou "X membres ont un abonnement expirant dans 7 jours"
- **Action** : Lien vers le tab "Abonnement invalide" de la liste
- **Fichier** : `functions/src/scheduled/subscriptionExpiryReminders.ts` (à créer)

##### 2.2.2 Statistiques quotidiennes

- **Type** : `daily_members_stats` (optionnel)
- **Déclenchement** : Scheduled Cloud Function (quotidien à 7h00)
- **Cible** : Admins
- **Message** : "Rapport quotidien : X nouveaux membres, Y abonnements expirés, Z anniversaires aujourd'hui"
- **Action** : Lien vers la liste des membres
- **Fichier** : `functions/src/scheduled/dailyMembersStats.ts` (à créer)

##### 2.2.3 Export terminé (Cloud Function)

- **Type** : `export_completed`
- **Déclenchement** : Après génération d'un export via Cloud Function `exportMembersList`
- **Cible** : Admin qui a lancé l'export
- **Message** : "Votre export de {format} ({count} membres) est prêt"
- **Action** : Lien de téléchargement (URL signée Storage)
- **Métadonnées** : `{ exportId, format, count, downloadUrl }`

### 3. Intégration avec anniversaires

Le tab "Anniversaires" de la liste des membres s'intègre avec le système de notifications d'anniversaires :

- **Fonction existante** : `dailyBirthdayNotifications` (scheduled, 8h00 quotidien)
- **Fichier** : `functions/src/scheduled/birthdayNotifications.ts`
- **Notifications créées** : Une notification par membre ayant un anniversaire aujourd'hui
- **Type** : `birthday_today` (déjà existant dans le système)
- **Affichage dans liste** : Le tab "Anniversaires" affiche les membres avec anniversaire aujourd'hui (calculé côté client ou via données pré-calculées)

> Voir `../anniversaires-memberships/notifications/README.md` pour plus de détails.

### 4. Architecture d'implémentation V2

#### 4.1 Toasts UI

- **Conserver** : Utilisation de `sonner` (`toast.success`, `toast.error`, `toast.info`)
- **Localisation** : Dans les composants V2 (`MembershipsListPage`, `MembershipsListFilters`, `ExportMembershipModal`)
- **Pattern** : Toasts pour actions immédiates (filtres, actualisation, erreurs)

#### 4.2 Notifications système

- **Service** : `NotificationService` (`src/services/notifications/NotificationService.ts`)
- **Repository** : `NotificationRepository` (`src/repositories/notifications/NotificationRepository.ts`)
- **Types** : Ajouter dans `src/types/types.ts` :
  ```typescript
  | 'subscription_expired'
  | 'subscription_expiring_soon'
  | 'daily_members_stats'
  | 'export_completed'
  ```
- **Création** :
  - **Scheduled** : Via Cloud Functions (rappels quotidiens)
  - **Callable** : Via Cloud Function `exportMembersList` (export terminé)
  - **Trigger** : Éventuellement via triggers Firestore (si besoin de notifications en temps réel)

### 5. Checklist d'implémentation

#### Phase 1 : Toasts UI (déjà fait en V1)
- [x] Toasts pour filtres, actualisation, erreurs
- [x] Toasts pour exports (CSV/Excel/PDF)
- [ ] Toasts pour changement de tab (optionnel)
- [ ] Toasts pour exports Cloud Function (quand fonction créée)

#### Phase 2 : Notifications système
- [ ] Créer Cloud Function `subscriptionExpiryReminders` (scheduled)
- [ ] Créer Cloud Function `dailyMembersStats` (scheduled, optionnel)
- [ ] Ajouter types de notifications dans `src/types/types.ts`
- [ ] Intégrer création de notification dans `exportMembersList` (quand fonction créée)

#### Phase 3 : Intégration UI
- [ ] Afficher badge de notifications non lues dans header de la liste (si applicable)
- [ ] Lien depuis notifications vers tabs spécifiques (ex. "Abonnement invalide")
- [ ] Afficher notifications d'anniversaires dans le tab "Anniversaires"

### 6. Exemples de code

#### 6.1 Toast pour changement de tab (V2)

```typescript
// Dans MembershipsListTabs.tsx
const handleTabChange = (tab: TabType) => {
  setActiveTab(tab)
  toast.info(`Affichage des ${TAB_LABELS[tab]}`, {
    duration: 2000,
  })
}
```

#### 6.2 Notification système pour export terminé (Cloud Function)

```typescript
// Dans functions/src/memberships/exportMembersList.ts
import { NotificationService } from '@/services/notifications/NotificationService'

// Après génération du fichier
await notificationService.create({
  module: 'memberships',
  entityId: exportId,
  type: 'export_completed',
  title: 'Export terminé',
  message: `Votre export ${format} (${count} membres) est prêt`,
  metadata: {
    exportId,
    format,
    count,
    downloadUrl,
  },
})
```

#### 6.3 Notification pour abonnements expirés (Scheduled)

```typescript
// Dans functions/src/scheduled/subscriptionExpiryReminders.ts
const expiredCount = await countExpiredSubscriptions()
if (expiredCount > 0) {
  await notificationService.create({
    module: 'memberships',
    type: 'subscription_expired',
    title: 'Abonnements expirés',
    message: `${expiredCount} membres ont un abonnement expiré`,
    metadata: {
      count: expiredCount,
      linkToTab: 'abonnement-invalide',
    },
  })
}
```

