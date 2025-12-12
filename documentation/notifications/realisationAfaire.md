# Réalisation à faire – Système de notifications

Ce document décrit **les fonctionnalités à implémenter** pour le système de notifications global et fait le lien entre :

- L’architecture globale : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)  
- L’analyse des notifications : [`./ANALYSE_NOTIFICATIONS.md`](./ANALYSE_NOTIFICATIONS.md)

## 1. Objectifs

- Centraliser la logique de notifications pour tous les modules (memberships, véhicules, caisse spéciale, bienfaiteur, …).
- Offrir un modèle unique, extensible, pour les différents types de notifications (demandes, anniversaires, échéances de contrats, contributions, etc.).
- Permettre à l’admin d’être notifié de manière fiable (centre de notifications, éventuellement emails / autres canaux plus tard).

## 2. Backlog de fonctionnalités globales

> **Important** : Avant toute implémentation, consulter [`ARCHITECTURE_NOTIFICATIONS.md`](./ARCHITECTURE_NOTIFICATIONS.md) pour les détails techniques complets.

- [ ] **NF1 – Modèle unifié de notification**  
  - Définir un type `Notification` générique dans `src/types/types.ts` (voir section 8 de `ARCHITECTURE_NOTIFICATIONS.md`).  
  - Identifier / refactoriser les types existants (`MembershipNotification`, futurs types véhicules, caisse spéciale, etc.) pour qu'ils adhèrent à ce modèle.
  - Créer les types `NotificationFilters`, `PaginatedNotifications`, etc.

- [ ] **NF2 – Repositories**  
  - Créer `src/repositories/notifications/INotificationRepository.ts` (interface)
  - Créer `src/repositories/notifications/NotificationRepository.ts` (implémentation)
  - Implémenter toutes les méthodes : `create()`, `getById()`, `getUnreadNotifications()`, `markAsRead()`, etc.
  - Configurer les indexes Firestore nécessaires (voir section 1.2 de `ARCHITECTURE_NOTIFICATIONS.md`)

- [ ] **NF3 – Services**  
  - Créer `src/services/notifications/NotificationService.ts`
  - Implémenter la logique métier : création de notifications, formatage des messages, validation
  - Créer les méthodes spécialisées : `createBirthdayNotification()`, `createMembershipRequestNotification()`, etc.
  - Intégrer dans `ServiceFactory`

- [ ] **NF4 – Hooks React**  
  - Créer `src/hooks/notifications/useNotifications.ts`
  - Créer `src/hooks/notifications/useUnreadNotifications.ts`
  - Créer `src/hooks/notifications/useUnreadCount.ts`
  - Créer `src/hooks/notifications/useMarkNotificationAsRead.ts`
  - Créer `src/hooks/notifications/useMarkAllNotificationsAsRead.ts`
  - Tous les hooks utilisent React Query et appellent `NotificationService` via `ServiceFactory`

- [ ] **NF5 – Composant UI NotificationBell**  
  - Créer `src/components/layout/NotificationBell.tsx`
  - Utiliser les hooks créés dans NF4
  - Intégrer dans `LayoutDashboard.tsx` (header)
  - Implémenter l'affichage, les interactions (marquer comme lu), le badge avec compteur

- [ ] **NF6 – Jobs planifiés (Cloud Functions)**  
  - Créer `functions/src/scheduled/birthdayNotifications.ts` (job quotidien pour anniversaires J-2, J, J+1)
  - Créer `functions/src/scheduled/scheduledNotifications.ts` (job horaire pour notifications programmées)
  - Configurer les triggers cron dans Firebase
  - Tester les jobs en environnement de développement
  - **Documentation** : Voir [`NF6_JOBS_PLANIFIES.md`](./NF6_JOBS_PLANIFIES.md) pour les détails d'implémentation

- [ ] **NF7 – Intégration par module**  
  - **Memberships** :
    - Modifier `MembershipService` pour créer des notifications lors de la création/mise à jour de demandes
    - Tester le flux complet
    - **Documentation** : Voir [`NF7_INTEGRATION_MEMBERSHIP_SERVICE.md`](./NF7_INTEGRATION_MEMBERSHIP_SERVICE.md) pour les détails d'implémentation
  - **Placement** :
    - Voir la documentation dédiée : [`../placement/placement.md`](../placement/placement.md) et la note d'intégration : [`NF8_INTEGRATION_PLACEMENT_SERVICE.md`](./NF8_INTEGRATION_PLACEMENT_SERVICE.md)
    - Implémenter les notifications : activation placement, rappel échéance commission (due/overdue), sortie anticipée, clôture
    - Traçabilité : createdBy/updatedBy, IDs placement/commission, canal utilisé
  - **Véhicules** : (à venir)
  - **Caisse Spéciale** : (à venir)
  - **Bienfaiteur** : (à venir)

## 3. Impacts architecturaux

- Repositories dédiés dans `src/repositories/notifications/*` (ou équivalent).
- Services transverses dans `src/services/notifications/*`.
- Hooks : `src/hooks/notifications/*` pour la consommation côté React (centre de notifications, badges, etc.).
- Types centralisés dans `src/types/types.ts`.

## 4. Lien avec les modules

- **Members / Memberships** :
  - Voir `documentation/memberships/notifications.md` (anniversaires, demandes…).  
- **Caisse spéciale, Véhicules, Bienfaiteur** :
  - À compléter progressivement avec leurs propres `notifications.md`.


