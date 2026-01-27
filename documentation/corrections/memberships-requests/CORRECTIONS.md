# Corrections - Demandes d'Adhésion

> Liste des problèmes identifiés et corrections apportées pour la fonctionnalité Demandes d'Adhésion

---

## 📍 Page : `/membership-requests`

### Fonctionnalité : Pagination et Affichage

#### Problèmes identifiés

- [x] **Pagination uniquement en bas de page**
  - **Description** : La pagination est actuellement uniquement affichée en bas de la page. Il serait préférable d'avoir également la pagination en haut, à côté du titre "Liste des demandes", tout à droite où il y a de l'espace blanc.
  - **Fichier concerné** : `src/domains/memberships/components/page/MembershipRequestsPageV2.tsx`
  - **Solution appliquée** : Ajout d'un composant de pagination compact en haut, à côté du titre "Liste des demandes", aligné à droite. La pagination est maintenant disponible en haut et en bas de la liste.

- [x] **Système de pagination sans ellipses intelligentes**
  - **Description** : Le système de pagination actuel affiche tous les numéros de page (jusqu'à 5 maximum). Si il y a 30 pages, il afficherait 30 boutons, ce qui n'est pas optimal. Il faut un système avec des ellipses (`...`) qui affiche intelligemment les pages : 3 pages autour de la page courante, avec des ellipses pour les pages éloignées.
  - **Exemple** : Si on est à la page 4 sur 30 pages, afficher : `1 ... 4 5 6 ... 30`
  - **Fichier concerné** : `src/domains/memberships/components/page/MembershipRequestsPageV2.tsx`
  - **Lignes concernées** : 1247-1278 (pagination actuelle)
  - **Solution appliquée** : Création d'un composant `PaginationWithEllipses` avec système d'ellipses intelligent qui affiche :
    - Toujours la première page
    - 3 pages autour de la page courante (page courante - 1, page courante, page courante + 1)
    - Toujours la dernière page
    - Des ellipses (`...`) pour les pages éloignées
    - Mode compact pour la pagination en haut (boutons précédent/suivant + numéro de page)
    - Mode complet pour la pagination en bas (tous les boutons avec ellipses)

- [x] **Pas de système de vue grid/liste**
  - **Description** : La liste des demandes n'a qu'un seul mode d'affichage (tableau sur desktop, cartes sur mobile). Il faut ajouter deux modes d'affichage : Grid et Liste, avec un bouton pour switcher entre les deux. Par défaut, l'affichage en Grid avec 4 demandes par ligne.
  - **Fichier concerné** : `src/domains/memberships/components/page/MembershipRequestsPageV2.tsx`
  - **Solution appliquée** : 
    - Ajout d'un état pour gérer le mode d'affichage (grid/liste) avec persistance dans localStorage
    - Création d'un composant `MembershipRequestsGridView` qui affiche 4 demandes par ligne sur desktop, 2 sur tablette, 1 sur mobile
    - Ajout d'un bouton de switch (icônes Grid3x3/List) pour changer entre grid et liste, placé à côté de la pagination en haut
    - Par défaut : vue grid
    - La vue liste utilise le tableau existant sur desktop et les cartes sur mobile

---

## 📝 Notes

- Le système de pagination avec ellipses doit être réutilisable pour d'autres pages
- La vue grid doit être responsive (4 colonnes sur desktop, 2 sur tablette, 1 sur mobile)
- Le mode d'affichage doit être sauvegardé dans le localStorage pour persister entre les sessions

---

## 🔄 Historique des corrections

### 2026-01-27 - Amélioration de la pagination et ajout de la vue grid/liste
- ✅ Problème : Pagination uniquement en bas
- ✅ Problème : Système de pagination sans ellipses intelligentes
- ✅ Problème : Pas de système de vue grid/liste
- **Solutions appliquées** : 
  - Création d'un composant `PaginationWithEllipses` avec système d'ellipses intelligent (3 pages autour de la page courante)
    - Mode compact pour la pagination en haut (boutons précédent/suivant + numéro de page)
    - Mode complet pour la pagination en bas (tous les boutons avec ellipses)
  - Création d'un composant `MembershipRequestsGridView` pour l'affichage en grid (4 colonnes sur desktop, 2 sur tablette, 1 sur mobile)
  - Ajout d'un bouton de switch grid/liste (icônes Grid3x3/List) dans le header, à côté de la pagination en haut
  - Persistance du mode d'affichage dans localStorage
  - Pagination en haut et en bas de la liste
- **Fichiers modifiés** : 
  - `src/domains/memberships/components/page/MembershipRequestsPageV2.tsx` (lignes modifiées : ajout état viewMode, handler handleViewModeChange, pagination en haut, switch grid/liste, affichage conditionnel)
  - `src/domains/memberships/components/grid/MembershipRequestsGridView.tsx` (nouveau)
  - `src/components/ui/pagination/PaginationWithEllipses.tsx` (nouveau)
