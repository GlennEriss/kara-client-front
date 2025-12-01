# Réalisation à faire – Système de notifications

Ce document décrit **les fonctionnalités à implémenter** pour le système de notifications global et fait le lien entre :

- L’architecture globale : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)  
- L’analyse des notifications : [`./ANALYSE_NOTIFICATIONS.md`](./ANALYSE_NOTIFICATIONS.md)

## 1. Objectifs

- Centraliser la logique de notifications pour tous les modules (memberships, véhicules, caisse spéciale, bienfaiteur, …).
- Offrir un modèle unique, extensible, pour les différents types de notifications (demandes, anniversaires, échéances de contrats, contributions, etc.).
- Permettre à l’admin d’être notifié de manière fiable (centre de notifications, éventuellement emails / autres canaux plus tard).

## 2. Backlog de fonctionnalités globales

- [ ] **NF1 – Modèle unifié de notification**  
  - Définir un type `Notification` générique (ou un équivalent dans `src/types/types.ts`) aligné sur le modèle décrit dans `ANALYSE_NOTIFICATIONS.md`.  
  - Identifier / refactoriser les types existants (`MembershipNotification`, futurs types véhicules, caisse spéciale, etc.) pour qu’ils adhèrent à ce modèle.

- [ ] **NF2 – Stockage et accès aux notifications**  
  - Créer une ou plusieurs collections Firestore pour stocker les notifications (structure à préciser : collection globale, sous‑collections par module, etc.).  
  - Exposer des repositories & services pour la création, la lecture, la mise à jour (`isRead`, etc.).

- [ ] **NF3 – Planification / jobs de notifications**  
  - Mettre en place un mécanisme de planification (Cloud Functions, cron, ou équivalent) pour :
    - Générer des notifications **programmées** (ex. anniversaires J‑2, J, J+1).  
    - Gérer les rappels récurrents (renouvellement, échéances…).

- [ ] **NF4 – Intégration par module**  
  - Pour chaque module, documenter et implémenter ses propres règles de notifications dans :
    - `documentation/<module>/notifications.md` (spécification fonctionnelle).
    - Les services/hooks correspondants (`src/services/<module>`, `src/hooks/<module>`).  
  - Exemple (memberships) : notifications pour nouvelles demandes, changements de statut, anniversaires.

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


