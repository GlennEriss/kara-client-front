# Correction du Bug : Statut d'abonnement disparaît avec les filtres

> Analyse et correction du bug où le statut d'abonnement disparaît après application de filtres/recherche

## 🐞 Bug identifié

### Symptôme

Sur la page **Membres (vue grille)**, après application de filtres ou recherche :
- Le statut d'abonnement disparaît
- Affichage "Aucun abonnement" alors que le membre a un abonnement
- Incohérence : même membre, deux statuts différents selon filtrage

### Cause racine

**Fichier** : `src/domains/memberships/repositories/MembersRepositoryV2.ts`

Quand on utilise **Algolia** (recherche textuelle), la méthode `getAllWithAlgolia()` retournait des `User[]` au lieu de `MemberWithSubscription[]`, donc **sans** `lastSubscription` et `isSubscriptionValid`.

**Comparaison** :

| Source | Type retourné | Enrichissement abonnements |
|--------|---------------|---------------------------|
| Firestore (`getMembers`) | ✅ `MemberWithSubscription[]` | ✅ Oui (via `getMemberWithSubscription()`) |
| Algolia (`getAllWithAlgolia`) | ❌ `User[]` | ❌ Non (avant correction) |

---

## ✅ Correction appliquée

### Fichier modifié

`src/domains/memberships/repositories/MembersRepositoryV2.ts`

### Changement

**Avant** :
```typescript
// Recherche Algolia
const searchResult = await algoliaService.search({ ... })

// ❌ Retourne directement User[] sans enrichissement
return {
  data: searchResult.items,  // User[]
  pagination: { ... }
}
```

**Après** :
```typescript
// Recherche Algolia
const searchResult = await algoliaService.search({ ... })

// ✅ Enrichir avec les abonnements (comme dans getMembers)
const membersWithSubscriptions = await Promise.all(
  searchResult.items.map(user => getMemberWithSubscription(user.id))
)

const enrichedMembers = membersWithSubscriptions.filter(
  (member): member is NonNullable<typeof member> => member !== null
)

// ✅ Retourne MemberWithSubscription[] avec abonnements
return {
  data: enrichedMembers,  // MemberWithSubscription[]
  pagination: { ... }
}
```

### Résultat

- ✅ Les résultats Algolia sont maintenant cohérents avec Firestore
- ✅ Le statut d'abonnement s'affiche correctement après filtrage
- ✅ Les statistiques (actifs/expirés) sont correctes
- ✅ Les filtres par statut d'abonnement fonctionnent

---

## ⚠️ Problème critique identifié : Incohérence de nommage

### Problème

**Cloud Function** (`approveMembershipRequest.ts`) crée les abonnements avec :
```typescript
{
  memberId: matricule,  // ❌ Utilise 'memberId'
  ...
}
```

**Frontend** cherche les abonnements avec :
```typescript
where('userId', '==', userId)  // ✅ Utilise 'userId'
```

**Interface TypeScript** définit :
```typescript
interface Subscription {
  userId: string  // ✅ Utilise 'userId'
}
```

### Impact

- ⚠️ **CRITIQUE** : Les abonnements créés lors de l'approbation ne sont **jamais trouvés** par le frontend !
- Les requêtes `getMemberWithSubscription()` ne retournent pas les abonnements créés par la Cloud Function
- Le statut affiche toujours "Aucun abonnement" même après approbation

### Solution requise

**Action urgente** : Corriger la Cloud Function pour utiliser `userId` au lieu de `memberId`.

**Fichier** : `functions/src/membership-requests/approveMembershipRequest.ts`

**Ligne 224** :
```typescript
// ❌ AVANT
const subscriptionData = {
  memberId: matricule,  // ❌
  ...
}

// ✅ APRÈS
const subscriptionData = {
  userId: matricule,  // ✅
  ...
}
```

**Migration requise** : Script pour renommer `memberId` → `userId` dans tous les abonnements existants.

---

## Autres défauts identifiés

### 1. Performance : Requêtes N+1

**Problème** : `getMemberWithSubscription()` fait une requête Firestore par membre.

**Solution recommandée** : Batch les requêtes avec `where('userId', 'in', [...])` (batches de 10).

### 2. Calcul du statut côté client

**Problème** : `isSubscriptionValid` est calculé côté client à chaque affichage.

**Solution recommandée** : Calculer et stocker `isValid` et `status` dans Firestore (Cloud Function trigger).

### 3. Pas de cache

**Problème** : Les abonnements sont récupérés à chaque requête.

**Solution recommandée** : Utiliser React Query avec `staleTime` approprié.

---

## Tests à effectuer

### Tests manuels

1. ✅ Créer une demande d'adhésion et l'approuver
2. ✅ Vérifier que l'abonnement est créé dans Firestore
3. ✅ Vérifier que le statut s'affiche correctement dans la liste (sans filtres)
4. ✅ Appliquer des filtres/recherche
5. ✅ Vérifier que le statut reste cohérent après filtrage
6. ✅ Vérifier les statistiques (actifs/expirés)

### Tests automatisés

- [ ] Test d'enrichissement Algolia avec abonnements
- [ ] Test de cohérence Firestore vs Algolia
- [ ] Test de performance (batch des requêtes)

---

## Références

- [Documentation abonnements Members](./README.md)
- [Documentation création abonnements](../../membership-requests/abonnement/README.md)
- [Code corrigé](../../../src/domains/memberships/repositories/MembersRepositoryV2.ts)

---

**Date de correction** : $(date +%Y-%m-%d)
**Statut** : ✅ Bug corrigé (enrichissement Algolia) | ⚠️ Action requise (incohérence memberId/userId)
