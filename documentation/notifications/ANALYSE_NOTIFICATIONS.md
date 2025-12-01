# Analyse fonctionnelle – Système de notifications

## 1. Contexte et périmètre

- Les notifications concernent **plusieurs modules** : `memberships`, `vehicule`, `caisse-speciale`, `bienfaiteur`, etc.
- L’objectif est d’avoir :
  - Un **modèle de base unique** pour toutes les notifications.
  - Des **spécialisations par module** (ex. `MembershipNotification`, notifications de renouvellement de contrat, rappels de paiement, etc.).
  - Une façon cohérente de déclencher, stocker et afficher les notifications côté admin.
- Les types existants (ex. `MembershipNotification` dans `src/types/types.ts`) servent de point de départ pour le diagramme de classes.

## 2. Modèle conceptuel (diagramme de classes global)

> À formaliser plus tard en UML, l’idée générale est :

- `Notification` (classe abstraite / concept de base)
  - `id: string`
  - `module: 'memberships' | 'vehicule' | 'caisse_speciale' | 'bienfaiteur' | ...`
  - `entityId: string` (id de la ressource cible : membre, contrat, véhicule, etc.)
  - `type: string` (code fonctionnel du type de notification, ex. `birthday_reminder`, `new_request`, `status_update`)
  - `title: string`
  - `message: string`
  - `isRead: boolean`
  - `createdAt: Date`
  - `scheduledAt?: Date` (pour les notifications programmées)
  - `sentAt?: Date`
  - `metadata?: Record<string, any>` (paramètres spécifiques par module)

- `MembershipNotification` (existant dans `src/types/types.ts`)
  - Champs actuels :
    - `id: string`
    - `requestId: string`
    - `type: 'new_request' | 'status_update' | 'reminder'`
    - `title: string`
    - `message: string`
    - `isRead: boolean`
    - `createdAt: Date`
  - Pour les futures fonctionnalités (ex. anniversaires), on pourra :
    - Soit enrichir ce type,
    - Soit introduire un autre type `MemberEventNotification` en s’alignant sur le modèle global ci‑dessus.

- À terme, chaque module pourra avoir un **sous‑diagramme de classes** dérivé de `Notification` :
  - `VehicleNotification`
  - `CaisseSpecialeNotification`
  - `CharityNotification`

## 3. Règles transverses

- **Stockage** :
  - Notifications stockées dans une collection dédiée (par exemple `notifications`) ou par sous‑collection module si nécessaire.
  - Toujours conserver `module` et `entityId` pour pouvoir filtrer facilement.
- **Déclenchement** :
  - Par les services métier (ex. service memberships pour les demandes, anniversaires, etc.).
  - Éventuellement via des jobs planifiés (Cloud Functions / cron) pour les notifications programmées (J‑2, J, J+1).
- **Lecture / affichage** :
  - Hooks dédiés par module pour récupérer les notifications pertinentes (ex. `useMembershipNotifications`).
  - Possibilité de vue globale “Centre de notifications” pour l’admin.

## 4. Notifications par module

- Pour chaque module (`documentation/memberships`, `documentation/vehicule`, `documentation/caisse-speciale`, `documentation/bienfaiteur`, …), on créera un fichier :
  - `notifications.md`
  - Contenant :
    - Les use cases de notifications spécifiques au module.
    - Les types ou sous‑classes de notification utilisés.
    - Les règles métier propres au module (quand déclencher, qui notifier, canaux, etc.).
- Ces fichiers référenceront toujours :
  - Le présent document : [`ANALYSE_NOTIFICATIONS.md`](./ANALYSE_NOTIFICATIONS.md)
  - L’architecture globale : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)

## 5. Référence croisée

- **Architecture globale** : [`documentation/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)  
- **Types** : `src/types/types.ts` (ex. `MembershipNotification`)  
- **Réalisation** : voir [`realisationAfaire.md`](./realisationAfaire.md) pour le backlog d’implémentation du système de notifications.


