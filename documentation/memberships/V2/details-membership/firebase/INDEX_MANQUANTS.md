# Index Firestore manquants - Page détails membre

## 🐞 Problème identifié

La page de détails d'un membre (`/memberships/{id}`) affiche uniquement des **skeletons** (éléments de chargement) et ne charge pas les données. Les erreurs dans la console du navigateur indiquent que **deux index Firestore sont manquants**.

### Erreurs dans la console

```
FirebaseError: [code=failed-precondition]: The query requires an index.
```

1. **Collection `documents`** :
   - Requête : `where('memberId', '==', X) + orderBy('type', 'asc') + orderBy('createdAt', 'desc')`
   - Index manquant : `memberId` (Ascending), `type` (Ascending), `createdAt` (Descending)

2. **Collection `subscriptions`** :
   - Requête : `where('userId', '==', X) + orderBy('createdAt', 'desc')`
   - Index manquant : `userId` (Ascending), `createdAt` (Descending)

## ✅ Solution appliquée

### Index ajoutés dans `firestore.indexes.json`

#### 1. Index pour `subscriptions`

```json
{
  "collectionGroup": "subscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "userId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

**Utilisation** : `getMemberSubscriptions(userId)` dans `src/db/member.db.ts`
- Requête : `where('userId', '==', userId) + orderBy('createdAt', 'desc')`

#### 2. Index pour `documents`

```json
{
  "collectionGroup": "documents",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "memberId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "type",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

**Utilisation** : `DocumentRepository.getDocuments()` dans `src/repositories/documents/DocumentRepository.ts`
- Requête : `where('memberId', '==', memberId) + orderBy('type', 'asc') + orderBy('createdAt', 'desc')`

## 📋 Actions à effectuer

### 1. Déployer les index Firestore

Les index ont été ajoutés dans `firestore.indexes.json`. Il faut maintenant les déployer sur Firebase :

```bash
# Pour DEV
firebase use kara-gabon-dev
firebase deploy --only firestore:indexes

# Pour PREPROD
firebase use kara-gabon-preprod
firebase deploy --only firestore:indexes

# Pour PROD
firebase use kara-gabon
firebase deploy --only firestore:indexes
```

### 2. Vérifier la création des index

Après le déploiement, vérifier dans la [Console Firebase](https://console.firebase.google.com/) :
- Aller dans **Firestore Database** → **Indexes**
- Vérifier que les deux nouveaux index sont en cours de création ou créés :
  - `subscriptions` : `userId` (Ascending), `createdAt` (Descending)
  - `documents` : `memberId` (Ascending), `type` (Ascending), `createdAt` (Descending)

**Note** : La création des index peut prendre quelques minutes.

### 3. Tester la page de détails

Une fois les index créés, tester la page de détails d'un membre :
- Naviguer vers `/memberships/{id-membre}` (ex: `/memberships/2663.MK.260925`)
- Vérifier que les données se chargent correctement (pas de skeletons infinis)
- Vérifier que les sections suivantes s'affichent :
  - Identité
  - Abonnements
  - Documents
  - Contrats
  - Filleuls

## 🔍 Pourquoi le module n'était pas vraiment "terminé" ?

Le module `details-membership/` était marqué comme **TERMINÉ** dans la documentation, mais il manquait :

1. **Index Firestore** : Les index nécessaires n'étaient pas créés, ce qui empêchait les requêtes de fonctionner
2. **Documentation incomplète** : Les index pour `documents` n'étaient pas documentés
3. **Configuration Firebase** : Les index doivent être déployés sur chaque environnement (dev, preprod, prod)

**Conclusion** : Un module n'est vraiment "terminé" que lorsque :
- ✅ Le code est écrit et testé
- ✅ Les index Firestore sont créés et déployés
- ✅ Les règles Firestore/Storage sont configurées
- ✅ La documentation est complète
- ✅ Les tests passent en environnement réel

## 📝 Documentation mise à jour

- ✅ `firestore.indexes.json` : Index ajoutés
- ✅ `documentation/memberships/V2/details-membership/firebase/README.md` : Section 2.1 et 2.4 mises à jour avec les index requis

## 🔗 Liens utiles

- [Console Firebase - Indexes](https://console.firebase.google.com/project/kara-gabon-dev/firestore/indexes)
- [Documentation Firebase - Indexes composites](https://firebase.google.com/docs/firestore/query-data/index-overview#composite_indexes)

---

**Date de correction** : 2026-01-22  
**Statut** : ✅ Index ajoutés dans `firestore.indexes.json` et **déployés sur dev et prod**

### Déploiement effectué

- ✅ **DEV** (`kara-gabon-dev`) : Index déployés le 2026-01-22
- ✅ **PROD** (`kara-gabon`) : Index déployés le 2026-01-22

**Note** : La création des index peut prendre quelques minutes. Vérifier dans la [Console Firebase](https://console.firebase.google.com/project/kara-gabon-dev/firestore/indexes) qu'ils sont bien créés et passent à l'état "Enabled".
