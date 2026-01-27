# Corrections - Géographie

> Liste des problèmes identifiés et corrections apportées pour la fonctionnalité Géographie

---

## 📍 Page : `/geographie`

### Fonctionnalité : Navigation dans la sidebar

#### Problèmes identifiés

- [x] **Géographie dans le menu principal au lieu de la partie système**
  - **Description** : Dans la sidebar (`AppSidebar.tsx`), "Géographie" est actuellement dans le "Menu Principal" alors qu'elle devrait être dans la section "Système" avec les autres fonctionnalités administratives comme "Administration", "Groupes", "Métiers/Entreprises", etc.
  - **Fichier concerné** : `src/components/layout/AppSidebar.tsx`
  - **Cause** : "Géographie" a été ajoutée dans `adminMenuItems` (Menu Principal) au lieu de `systemMenuItems` (Système).
  - **Lignes concernées** : 
    - Lignes 152-156 : "Géographie" dans `adminMenuItems`
  - **Solution appliquée** : 
    - Retrait de "Géographie" de `adminMenuItems`
    - Ajout de "Géographie" dans `systemMenuItems` pour qu'elle apparaisse dans la section "Système"

---

## 📝 Notes

- La section "Système" contient les fonctionnalités administratives et de configuration :
  - Administration
  - Groupes
  - Métiers/Entreprises
  - Paramètres Caisse
  - Paramètres Caisse Imprévue
  - Géographie (après correction)

---

## 🔄 Historique des corrections

### 2026-01-27 - Déplacement de Géographie vers la section Système
- ✅ Problème : Géographie dans le menu principal au lieu de la partie système
- **Solution appliquée** : 
  - Retrait de "Géographie" de `adminMenuItems` (Menu Principal)
  - Ajout de "Géographie" dans `systemMenuItems` (Système)
- **Fichiers modifiés** : `src/components/layout/AppSidebar.tsx`
- **Lignes modifiées** : 
  - Suppression : lignes 152-156 dans `adminMenuItems`
  - Ajout : dans `systemMenuItems` (après "Métiers/Entreprises")
