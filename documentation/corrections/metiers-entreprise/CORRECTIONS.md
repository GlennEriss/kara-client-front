# Corrections - Métiers/Entreprises

> Liste des problèmes identifiés et corrections apportées pour la fonctionnalité Métiers/Entreprises

---

## 📍 Page : `/metiers` et `/companies`

### Fonctionnalité : Navigation dans la sidebar

#### Problèmes identifiés

- [x] **Deux boutons séparés dans la sidebar pour la même page**
  - **Description** : La sidebar (`AppSidebar.tsx`) affiche deux boutons séparés "Métiers" et "Entreprises" alors que les deux pointent vers la même page avec des onglets différents. Il serait préférable d'avoir un seul bouton "Métiers/Entreprises" dans la sidebar.
  - **Fichier concerné** : `src/components/layout/AppSidebar.tsx`
  - **Cause** : Les deux routes (`/jobs` et `/companies`) sont définies séparément dans `systemMenuItems` alors qu'elles utilisent le même composant `ReferencesManagement` avec des onglets différents.
  - **Lignes concernées** : 
    - Lignes 186-189 : Bouton "Métiers" avec route `routes.admin.jobs`
    - Lignes 190-194 : Bouton "Entreprises" avec route `routes.admin.companies`
  - **Solution appliquée** : 
    - Fusion des deux boutons en un seul bouton "Métiers/Entreprises"
    - Utilisation d'une seule route (par exemple `/metiers` ou `/companies`)
    - Mise à jour de la fonction `isActiveRoute` pour considérer les deux routes comme actives pour ce bouton unique
    - Utilisation d'une icône combinée ou d'une icône représentative (Briefcase pour Métiers)

---

## 📝 Notes

- Les deux pages (`/metiers` et `/companies`) utilisent le même composant `ReferencesManagement` avec des onglets différents
- L'onglet par défaut peut être défini via la prop `defaultTab` du composant
- Il est préférable d'avoir une seule entrée dans la sidebar pour éviter la confusion

---

## 🔄 Historique des corrections

### 2026-01-27 - Fusion des boutons Métiers et Entreprises dans la sidebar
- ✅ Problème : Deux boutons séparés dans la sidebar pour la même page
- **Solution appliquée** : 
  - Suppression du bouton "Entreprises" séparé
  - Renommage du bouton "Métiers" en "Métiers/Entreprises"
  - Mise à jour de la fonction `isActiveRoute` pour gérer les deux routes (`/jobs` et `/companies`) comme actives pour ce bouton
  - Le bouton pointe vers `/metiers` (ou `/companies`) qui affiche les deux onglets
- **Fichiers modifiés** : `src/components/layout/AppSidebar.tsx`
- **Lignes modifiées** : 186-194 (fusion des deux entrées en une seule)
