# Corrections - Membres

> Liste des problèmes identifiés et corrections apportées pour la fonctionnalité Membres

---

## 📍 Page : `/memberships`

### Fonctionnalité : Affichage et Pagination

#### Problèmes identifiés

- [x] **Affichage en liste n'est pas un tableau**
  - **Description** : Lorsqu'on sélectionne la vue "Liste", les membres sont affichés sous forme de cartes étirées (grid super étirée) au lieu d'un tableau traditionnel avec colonnes. Ce n'est pas une vraie liste.
  - **Fichier concerné** : `src/domains/memberships/components/list/MembershipsListLayout.tsx`
  - **Cause** : Le composant `MembershipsListLayout` utilise toujours `MemberCard` même en mode liste, avec seulement `space-y-6` pour l'espacement vertical. Il faut créer un composant de tableau pour la vue liste.
  - **Solution appliquée** : 
    - Création d'un composant `MembershipsTableView` qui affiche les membres dans un tableau avec colonnes (Photo, Nom, Matricule, Type, Abonnement, Contact, Actions)
    - Modification de `MembershipsListLayout` pour utiliser le tableau en mode liste et les cartes en mode grid

- [x] **Pagination uniquement en bas et sans ellipses**
  - **Description** : La pagination est uniquement affichée en bas de la page. De plus, le système de pagination n'affiche pas les ellipses (`...`) pour les pages éloignées, ce qui pose problème quand il y a beaucoup de pages.
  - **Fichier concerné** : 
    - `src/domains/memberships/components/list/MembershipsListHeader.tsx`
    - `src/domains/memberships/components/list/MembershipsListPagination.tsx`
  - **Solution appliquée** : 
    - Ajout de la pagination en haut dans le header, à côté du titre "Liste des Membres", alignée à droite
    - Remplacement de `MembershipPagination` par `PaginationWithEllipses` dans `MembershipsListPagination` pour avoir le système d'ellipses intelligent
    - Pagination en haut en mode compact, pagination en bas en mode complet avec ellipses

---

## 📝 Notes

- La vue liste doit afficher un vrai tableau avec colonnes, pas des cartes étirées
- Le système de pagination avec ellipses doit être cohérent avec celui des demandes d'adhésion
- La pagination en haut doit être compacte pour ne pas prendre trop de place

---

## 🔄 Historique des corrections

### 2026-01-27 - Correction de l'affichage liste et amélioration de la pagination
- ✅ Problème : Affichage en liste n'est pas un tableau
- ✅ Problème : Pagination uniquement en bas et sans ellipses
- **Solutions appliquées** : 
  - Création d'un composant `MembershipsTableView` pour la vue liste avec colonnes (Photo, Nom, Matricule, Type, Abonnement, Contact, Actions)
  - Modification de `MembershipsListLayout` pour utiliser le tableau en mode liste et les cartes en mode grid
  - Ajout de la pagination en haut dans le header, alignée à droite sur la même ligne que le titre "Liste des Membres" (mode compact)
  - Remplacement de `MembershipPagination` par `PaginationWithEllipses` dans `MembershipsListPagination` pour avoir le système d'ellipses intelligent
  - Mise à jour du skeleton pour afficher un tableau en mode liste
  - Pagination en haut (compacte) et en bas (complète avec ellipses)
- **Fichiers modifiés** : 
  - `src/domains/memberships/components/list/MembershipsListLayout.tsx` (affichage conditionnel tableau/cartes)
  - `src/domains/memberships/components/list/MembershipsListHeader.tsx` (ajout pagination en haut)
  - `src/domains/memberships/components/list/MembershipsListPagination.tsx` (utilisation de PaginationWithEllipses)
  - `src/domains/memberships/components/list/MembershipsListSkeleton.tsx` (skeleton tableau pour vue liste)
  - `src/domains/memberships/components/page/MembershipsListPage.tsx` (passage de pagination au header)
  - `src/domains/memberships/components/table/MembershipsTableView.tsx` (nouveau - tableau pour vue liste)
