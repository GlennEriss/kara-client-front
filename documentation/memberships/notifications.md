# Notifications – Module Memberships

Ce document décrit les **notifications spécifiques** au module memberships et s’appuie sur :

- L’analyse globale des notifications : [`../notifications/ANALYSE_NOTIFICATIONS.md`](../notifications/ANALYSE_NOTIFICATIONS.md)  
- L’analyse fonctionnelle du module : [`./ANALYSE_MEMBERSHIPS.md`](./ANALYSE_MEMBERSHIPS.md)

## 1. Types de notifications Memberships

### 1.1. Notifications liées aux demandes (existant)

- Type `MembershipNotification` dans `src/types/types.ts` :
  - `type: 'new_request' | 'status_update' | 'reminder'`
  - Utilisé pour notifier l’admin :
    - Lorsqu’une **nouvelle demande d’adhésion** est créée.
    - Lorsqu’un **statut** de demande change (approuvée, rejetée, en revue, etc.).
    - Pour des **rappels** liés au traitement des demandes.

### 1.2. Notifications liées aux anniversaires (à venir)

- Objectif : notifier l’admin :
  - **J‑2** avant l’anniversaire d’un membre.
  - **J** (jour J) de l’anniversaire.
  - **J+1** après l’anniversaire (rattrapage / suivi).
- Ces notifications seront basées sur :
  - La date de naissance (`birthDate`) des membres.
  - Une logique de planification (jobs) décrite dans `../notifications/realisationAfaire.md`.

## 2. Use cases de notifications Memberships

- Voir les use cases détaillés dans `ANALYSE_MEMBERSHIPS.md`, en particulier :
  - UC liés aux demandes (existants).
  - UC sur les **anniversaires des membres** (liste, onglet dédié, exports, notifications).

## 3. Références

- **Architecture globale** : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)  
- **Système de notifications global** : [`../notifications/ANALYSE_NOTIFICATIONS.md`](../notifications/ANALYSE_NOTIFICATIONS.md), [`../notifications/realisationAfaire.md`](../notifications/realisationAfaire.md)  
- **Analyse module memberships** : [`./ANALYSE_MEMBERSHIPS.md`](./ANALYSE_MEMBERSHIPS.md)  
- **Plan d’implémentation memberships** : [`./realisationAfaire.md`](./realisationAfaire.md)


