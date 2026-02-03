# Firebase – Simulation Caisse Spéciale (Standard) V2

> Ce document décrit l’usage de Firebase pour le module Simulation. **Aucune nouvelle collection, règle ni index n’est requis** : le module ne fait que lire les paramètres existants.

**Références :**
- Diagrammes : `documentation/caisse-speciale/V2/simulation/standard/activite/`, `sequence/`
- Fichiers projet : `firestore.rules`, `firestore.indexes.json`

---

## 1. Règles Firestore

### 1.1 Collection utilisée : `caisseSettings`

Le module Simulation a besoin **uniquement de lire** les paramètres actifs par type de caisse (`STANDARD`, `STANDARD_CHARITABLE`) pour récupérer la `bonusTable` (M4–M12).

- **Lecture** : Admin uniquement (déjà couvert par les règles existantes de la Caisse Spéciale / Paramètres).
- **Création / Mise à jour / Suppression** : Aucune. La simulation ne modifie pas Firestore.

#### Requête côté application

- Type : **query**
- Collection : `caisseSettings`
- Contraintes : `caisseType == <STANDARD | STANDARD_CHARITABLE>` et `isActive == true`
- Limite : 1 document (paramètre actif pour le type)

Les règles Firestore existantes pour `caisseSettings` (accès admin en lecture) suffisent. Aucune règle supplémentaire à ajouter pour la simulation.

---

## 2. Règles Firebase Storage

**Aucune.** Le module Simulation n’utilise pas Firebase Storage (pas d’upload, pas de stockage de fichiers).

---

## 3. Index Firestore

**Aucun nouvel index requis** pour la simulation. La requête sur `caisseSettings` avec `caisseType` et `isActive` est simple et peut être couverte par un index composite existant ou par l’index automatique Firestore selon la configuration actuelle du projet.

Si des index pour `caisseSettings` existent déjà (ex. pour la page Paramètres Caisse Spéciale), les réutiliser. Sinon, créer uniquement si Firestore le demande explicitement (message d’erreur avec lien de création d’index).

---

## 4. Résumé

| Élément | Simulation |
|--------|------------|
| **Nouvelles collections** | Aucune |
| **Nouvelles règles Firestore** | Aucune (lecture `caisseSettings` déjà autorisée pour admin) |
| **Nouvelles règles Storage** | Aucune |
| **Nouveaux index** | Aucun (requête simple sur `caisseSettings`) |

---

## Références

- [Paramètres Caisse Spéciale (settings)](../../../V1/settings/README.md) – Structure `caisseSettings`, `bonusTable`
- [contrats/firebase/FIREBASE.md](../../contrats/firebase/FIREBASE.md) – Règles Caisse Spéciale
