# Réalisation à faire – Module Memberships

Ce document décrit **les fonctionnalités à implémenter** pour le module memberships et fait le lien entre :

- L’architecture globale : [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)  
- L’analyse UML / fonctionnelle du module : [`./ANALYSE_MEMBERSHIPS.md`](./ANALYSE_MEMBERSHIPS.md)

## 1. Rappels module existant

- Pages : `src/app/(admin)/memberships/*`
- Composants : `src/components/memberships/*`
- Types et modèles : `src/types/types.ts` (modèles `Member`, `Membership`, etc.)

Ce fichier doit rester cohérent avec :

- Les règles d’architecture décrites dans [`ARCHITECTURE.md`](../architecture/ARCHITECTURE.md)
- L’analyse fonctionnelle dans [`ANALYSE_MEMBERSHIPS.md`](./ANALYSE_MEMBERSHIPS.md)

## 2. Backlog de fonctionnalités à implémenter

> À compléter en fonction des futures demandes (nouveaux écrans, nouvelles relations avec d’autres modules, exports, statistiques, etc.).

- [ ] **UC5 – Recherche de membre dans l’onglet Véhicules de la fiche membre**  
  - **Description métier** : permettre à l’admin, depuis l’onglet Véhicules d’un membre, de filtrer/chercher par nom ou matricule afin de retrouver rapidement les véhicules liés à un membre donné.  
  - **Impact UI/UX** :
    - Ajouter un champ de recherche (nom/matricule) dans l’onglet Véhicules (section véhicules de la fiche membre).
    - Afficher les résultats filtrés de manière claire (tableau ou grille) avec indication du critère de recherche.
  - **Impact technique** :
    - Adapter les hooks/services utilisés par l’onglet Véhicules pour accepter des paramètres de recherche (nom, matricule, memberId).
    - Vérifier la structure des données côté Firestore pour optimiser la recherche (index sur `matricule`, éventuellement sur le nom complet).
  - **Alignement architecture** :
    - Recherche implémentée côté services/hooks (jamais directement dans les composants).
    - Types et éventuels nouveaux champs centralisés dans `src/types/types.ts`.
    - Composants UI réutilisant les patterns de recherche déjà présents dans les autres modules (ex. listes de membres).

- [ ] **UC6 – Export de la liste des membres en PDF / Excel (avec filtres véhicules)**  
  - **Description métier** : offrir à l’admin la possibilité d’exporter la liste des membres en PDF ou Excel selon trois modes :
    - seulement les membres **ayant au moins un véhicule** ;
    - seulement les membres **sans véhicule** ;
    - **tous les membres** (avec et sans véhicule).  
  - **Impact UI/UX** :
    - Ajouter un bouton ou un menu d’export sur la page de liste des membres (`MembershipList`).
    - Permettre le choix du **format** (PDF / Excel) et du **filtre** (avec véhicule / sans véhicule / tous).
  - **Impact technique** :
    - Étendre les hooks/services de récupération des membres pour exposer l’information “a des véhicules / n’a pas de véhicule” (ou fournir un helper qui la dérive proprement).
    - Ajouter une logique d’export réutilisable (basée sur ce qui existe déjà pour d’autres modules : bienfaiteur, véhicules, caisse spéciale) pour générer PDF et Excel.
    - Gérer les cas vides et les éventuelles erreurs de génération (toasts, logs).
  - **Alignement architecture** :
    - Génération PDF / Excel centralisée au niveau services/hooks ou utilitaires dédiés (pas de logique lourde dans les composants).
    - Types/DTO d’export définis dans `src/types/types.ts` si nécessaire.
    - Respect des conventions de formatage (notamment pour les montants, dates, etc.) déjà utilisées dans le projet.

- [ ] **UC7 – Anniversaires des membres (liste, notifications, exports, calendrier)**  
  - **Description métier** : fournir à l’admin une vue complète des anniversaires des membres, avec :
    - une **section / onglet “Anniversaires”** dans le module memberships ;
    - la possibilité d’être **notifié** J‑2, J et J+1 ;
    - des **exports PDF / Excel** par mois ;
    - une **vue calendrier** des anniversaires.  
  - **Impact UI/UX** :
    - Ajouter un **onglet “Anniversaires”** (ou une section dédiée) dans l’interface memberships.
    - Prévoir deux vues :
      - **Liste** triée par anniversaires les plus proches ;
      - **Calendrier mensuel** avec coloration des jours d’anniversaire (ex. rose) et affichage des noms des membres.
    - Ajouter des contrôles de filtrage par **mois** et des boutons d’export PDF / Excel pour le mois courant ou un mois sélectionné.
  - **Impact technique** :
    - S’appuyer sur les dates de naissance (`birthDate`) des membres ; valider/normaliser ce champ si nécessaire.
    - Créer un service/hook pour calculer :
      - Les anniversaires à venir (ordre par distance à aujourd’hui).
      - Les anniversaires par mois (pour la liste et le calendrier).
    - Intégrer le système de notifications :
      - Définir les types de notifications anniversaire (en cohérence avec `MembershipNotification` / modèle global de `Notification`).
      - Mettre en place des jobs (cf. `documentation/notifications/realisationAfaire.md`) pour générer les notifications J‑2, J, J+1.
    - Ajouter la logique d’export PDF / Excel pour les listes d’anniversaires (réutiliser les patterns d’export existants).
  - **Alignement architecture** :
    - Calculs et logique métier dans les **services** et **hooks**, pas dans les composants.
    - Types et modèles d’export/notifications centralisés dans `src/types/types.ts` si besoin.
    - Respect de l’architecture des notifications ([`documentation/notifications/ANALYSE_NOTIFICATIONS.md`](../notifications/ANALYSE_NOTIFICATIONS.md)).

## 3. Impacts architecturaux

Pour chaque nouvelle fonctionnalité :

- Vérifier l’impact sur :
  - `src/repositories/memberships/*`
  - `src/services/memberships/*`
  - `src/hooks/memberships/*`
  - `src/components/memberships/*`
- S’assurer de :
  - La centralisation des types dans `src/types/types.ts`
  - L’usage de `react-hook-form` + Zod pour tout nouveau formulaire (`src/schemas/*`).

## 4. Lien avec l’analyse

- Avant d’implémenter une nouvelle fonctionnalité, **documenter / mettre à jour** :
  - Les cas d’utilisation dans [`ANALYSE_MEMBERSHIPS.md`](./ANALYSE_MEMBERSHIPS.md)
  - Les diagrammes UML (classe, séquence si besoin).

Ce fichier est le **plan d’action** concret du module memberships, toujours relié à :

- L’architecture globale (`../architecture/ARCHITECTURE.md`)
- L’analyse détaillée (`./ANALYSE_MEMBERSHIPS.md`)


