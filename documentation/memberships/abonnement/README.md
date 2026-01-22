# Gestion des Abonnements - Members

> Documentation sur l'affichage et la gestion des abonnements dans le module Members

## Vue d'ensemble

Les abonnements sont affichés dans plusieurs contextes :
- **Liste des membres** : Statut d'abonnement sur chaque carte (valide/expiré/aucun)
- **Page détails membre** : Carte d'abonnement avec détails complets
- **Page abonnements** : Liste complète des abonnements d'un membre (`/memberships/{id}/subscriptions`)

---

## Affichage des abonnements

### 1. Liste des membres (cartes)

**Composant** : `src/components/memberships/MemberCard.tsx`

**Affichage** :
- Badge de statut : "Abonnement valide" / "Abonnement expiré" / "Aucun abonnement"
- Détails (si abonnement présent) :
  - Date d'expiration
  - Montant et devise

**Code** :
```typescript
const getSubscriptionStatus = () => {
  if (!member.lastSubscription) {
    return { label: 'Aucun abonnement', ... }
  }
  if (member.isSubscriptionValid) {
    return { label: 'Abonnement valide', ... }
  }
  return { label: 'Abonnement expiré', ... }
}
```

### 2. Page détails membre

**Composant** : `src/domains/memberships/components/details/MemberSubscriptionCard.tsx`

**Affichage** :
- Statut de l'abonnement (badge)
- Date de début
- Date de fin
- Jours restants / jours depuis expiration
- Montant et devise

### 3. Page abonnements complète

**Route** : `/memberships/{id}/subscriptions`

**Composant** : `src/components/subscriptions/SubscriptionList.tsx`

**Fonctionnalités** :
- Liste de tous les abonnements du membre
- Statistiques (actifs, expirés)
- Renouvellement d'abonnement
- Upload PDF d'adhésion
- Enregistrement de paiement

---

## Récupération des données d'abonnement

### Fonction principale : `getMemberWithSubscription()`

**Fichier** : `src/db/member.db.ts`

**Fonctionnalité** : Enrichit un `User` avec `lastSubscription` et `isSubscriptionValid`

**Algorithme** :

1. **Récupérer le membre** depuis `users/{userId}`
2. **Requête sur `subscriptions`** :
   ```typescript
   query(
     collection(db, 'subscriptions'),
     where('userId', '==', userId)
   )
   ```
3. **Trier par `dateEnd` décroissant** (plus récent en premier)
4. **Prendre le premier** (dernier abonnement)
5. **Calculer `isSubscriptionValid`** : `dateEnd > new Date()`

**Fallback** : Si la requête échoue, utiliser `users.subscriptions[]` (ancienne méthode)

**Retour** : `MemberWithSubscription` avec :
- `lastSubscription?: Subscription | null`
- `isSubscriptionValid?: boolean`

### Utilisation dans `getMembers()`

**Fichier** : `src/db/member.db.ts`

Lors de la récupération de la liste des membres (Firestore) :

```typescript
// Paralléliser les appels getMemberWithSubscription pour améliorer les performances
const memberPromises = docsToProcess.map(doc => getMemberWithSubscription(doc.id))
const memberResults = await Promise.all(memberPromises)

const members: MemberWithSubscription[] = memberResults.filter(
  (member): member is MemberWithSubscription => member !== null
)
```

**⚠️ Problème identifié** : Cette logique n'est **pas appliquée** quand on utilise Algolia !

---

## 🐞 Problème identifié : Incohérence avec Algolia

### Symptôme

Quand on utilise les **filtres/recherche Algolia**, le statut d'abonnement disparaît et affiche "Aucun abonnement" alors que le membre a bien un abonnement.

### Cause racine

**Fichier** : `src/services/search/MembersAlgoliaSearchService.ts`

La méthode `fetchMembersFromFirestore()` retourne des `User[]` (pas `MemberWithSubscription[]`) :

```typescript
private async fetchMembersFromFirestore(memberIds: string[]): Promise<User[]> {
  // ...
  items.push(this.transformFirestoreDocument(docSnap.id, data))
  // ...
  return memberIds.map(id => itemsMap.get(id)).filter(...)
}
```

**Fichier** : `src/domains/memberships/repositories/MembersRepositoryV2.ts`

La méthode `getAllWithAlgolia()` retourne directement ces `User[]` sans enrichissement :

```typescript
return {
  data: searchResult.items,  // ❌ User[] au lieu de MemberWithSubscription[]
  pagination: { ... }
}
```

**Comparaison avec Firestore** :

```typescript
// Firestore (getMembers) - ✅ CORRECT
const memberPromises = docsToProcess.map(doc => getMemberWithSubscription(doc.id))
const members: MemberWithSubscription[] = await Promise.all(memberPromises)

// Algolia (getAllWithAlgolia) - ❌ INCORRECT
return { data: searchResult.items }  // User[] sans abonnements
```

### Impact

- ❌ Les cartes de membres affichent "Aucun abonnement" après filtrage
- ❌ Les statistiques sont incorrectes (actifs/expirés)
- ❌ Les filtres par statut d'abonnement ne fonctionnent pas correctement
- ❌ Incohérence visuelle : même membre, deux statuts différents

---

## Défauts de l'implémentation actuelle

### 1. ✅ CORRIGÉ : Enrichissement manquant avec Algolia

**Problème** : `MembersAlgoliaSearchService` ne récupère que les données `User` de base, sans enrichir avec les abonnements.

**Solution appliquée** : Enrichir les résultats Algolia avec `getMemberWithSubscription()` après récupération depuis Firestore.

**Fichier modifié** : `src/domains/memberships/repositories/MembersRepositoryV2.ts`

```typescript
// ✅ ENRICHIR avec les abonnements
const membersWithSubscriptions = await Promise.all(
  searchResult.items.map(user => getMemberWithSubscription(user.id))
)

const enrichedMembers = membersWithSubscriptions.filter(
  (member): member is NonNullable<typeof member> => member !== null
)

return {
  data: enrichedMembers,  // ✅ MemberWithSubscription[] au lieu de User[]
  pagination: { ... }
}
```

### 2. Calcul du statut côté client

**Problème** : Le statut `isSubscriptionValid` est calculé côté client à chaque affichage, ce qui peut être incohérent.

**Impact** : 
- Calcul répété inutilement
- Risque d'incohérence si la date change entre deux calculs
- Performance dégradée (calcul pour chaque membre)

**Solution recommandée** : Normaliser le statut côté backend et l'exposer comme champ calculé dans Firestore.

**Exemple** :
```typescript
// Cloud Function ou trigger qui met à jour isValid automatiquement
subscription.isValid = subscription.dateEnd > Timestamp.now()
subscription.status = subscription.isValid ? 'active' : 'expired'
```

### 3. Requête subscriptions inefficace

**Problème** : `getMemberWithSubscription()` fait une requête Firestore pour chaque membre, ce qui peut être lent.

**Impact** :
- N requêtes Firestore pour N membres (N+1 problem)
- Temps de réponse dégradé avec beaucoup de membres
- Coût Firestore augmenté

**Solution recommandée** : 
- Batch les requêtes de subscriptions
- Utiliser `where('userId', 'in', [...])` avec des batches de 10
- Créer une fonction `getSubscriptionsBatch(userIds: string[])`

**Exemple** :
```typescript
async function getSubscriptionsBatch(userIds: string[]): Promise<Map<string, Subscription>> {
  const batches = chunk(userIds, 10) // Firestore limite 'in' à 10
  const allSubscriptions = await Promise.all(
    batches.map(batch => 
      query(collection(db, 'subscriptions'), where('userId', 'in', batch))
    )
  )
  // Grouper par userId et prendre le plus récent
  // Retourner Map<userId, lastSubscription>
}
```

### 4. Pas de cache des abonnements

**Problème** : Les abonnements sont récupérés à chaque requête, même si rien n'a changé.

**Impact** :
- Requêtes Firestore répétées inutilement
- Performance dégradée
- Coût Firestore augmenté

**Solution recommandée** : Utiliser React Query avec un `staleTime` approprié (ex: 5 minutes).

### 5. ⚠️ CRITIQUE : Incohérence de nommage de champ

**Problème** : 
- Cloud Function utilise `memberId` dans `subscriptions` (ligne 224 de `approveMembershipRequest.ts`)
- Frontend utilise `userId` dans les requêtes (`getMemberWithSubscription`, `getMemberSubscriptions`)
- Interface TypeScript `Subscription` définit `userId: string`

**Impact** :
- ⚠️ **CRITIQUE** : Les requêtes frontend ne trouvent pas les abonnements créés par la Cloud Function !
- Les abonnements créés lors de l'approbation ne sont pas visibles dans l'interface
- Le statut d'abonnement affiche toujours "Aucun abonnement" même après approbation
- Confusion dans le code et documentation incohérente

**État actuel** :
- Cloud Function crée : `subscriptions.memberId = matricule` ❌
- Frontend cherche : `where('userId', '==', userId)` ✅
- Interface TypeScript : `userId: string` ✅
- **Résultat** : Les abonnements ne sont pas trouvés !

**Solution recommandée** : Harmoniser les noms de champs (`userId` partout).

**Action requise** : 
1. ✅ **URGENT** : Mettre à jour la Cloud Function pour utiliser `userId` au lieu de `memberId`
2. Migrer les abonnements existants (script de migration pour renommer `memberId` → `userId`)
3. Vérifier que toutes les requêtes utilisent `userId`
4. Mettre à jour les index Firestore si nécessaire

**Fichier à modifier** : `functions/src/membership-requests/approveMembershipRequest.ts` (ligne 224)

---

## Page `/memberships/{id}/subscriptions`

### Fonctionnalités

**Composant** : `src/components/subscriptions/SubscriptionList.tsx`

1. **Affichage des abonnements** :
   - Liste chronologique (plus récent en premier)
   - Badge de statut (Actif/Expiré)
   - Détails complets (dates, montant, PDF)

2. **Statistiques** :
   - Nombre d'abonnements actifs
   - Nombre d'abonnements expirés

3. **Renouvellement d'abonnement** :
   - Modal de renouvellement
   - Upload PDF d'adhésion
   - Enregistrement de paiement
   - Création d'un nouvel abonnement

4. **Gestion des paiements** :
   - Enregistrement de paiement pour un abonnement
   - Mise à jour du statut de paiement

### Défauts identifiés

1. **Pas de validation côté serveur** : Le renouvellement est fait côté client uniquement
2. **Pas de Cloud Function dédiée** : Le renouvellement devrait passer par une Cloud Function pour garantir la cohérence
3. **Pas de gestion des erreurs robuste** : En cas d'échec, l'état peut être incohérent

---

## Structure des données

### Interface `Subscription`

```typescript
interface Subscription {
  id: string
  userId: string              // ID du membre (= matricule)
  dateStart: Date            // Date de début
  dateEnd: Date              // Date de fin
  montant: number            // Montant en XOF
  currency: string           // 'XOF'
  type: MembershipType      // Type de membre
  isValid?: boolean          // Calculé (dateEnd > maintenant)
  adhesionPdfURL?: string   // URL du PDF d'adhésion
  adhesionPdfPath?: string  // Chemin dans Storage
  createdAt: Date
  updatedAt: Date
  createdBy: string
}
```

### Interface `MemberWithSubscription`

```typescript
interface MemberWithSubscription extends User {
  lastSubscription?: Subscription | null  // Dernier abonnement
  isSubscriptionValid?: boolean         // Calculé (dateEnd > maintenant)
}
```

---

## Diagramme UML

Les abonnements sont documentés dans le diagramme UML :

**Fichier** : `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`

**Classe `Subscription`** (lignes 247-263) :
```plantuml
class Subscription {
  + id: string
  + userId: string
  + dateStart: Date
  + dateEnd: Date
  + montant: number
  + currency: string
  + type: MembershipType
  + isValid?: boolean
  + adhesionPdfURL?: string
  + adhesionPdfPath?: string
  + createdAt: Date
  + updatedAt: Date
  + createdBy: string
}
```

**Relation** :
```plantuml
User "1" --> "*" Subscription : has
```

**Classe `MemberWithSubscription`** (lignes 1068-1082) :
```plantuml
class MemberWithSubscription {
  + id: string
  + firstName: string
  + lastName: string
  + matricule: string
  + email?: string
  + gender: string
  + membershipType: MembershipType
  + isSubscriptionValid: boolean
  + lastSubscription?: Subscription
  + address?: AddressData
  + company?: CompanyData
  + createdAt: Date
}
```

---

## Solutions recommandées

### ✅ Solution immédiate : CORRIGÉ

**Fichier** : `src/domains/memberships/repositories/MembersRepositoryV2.ts`

L'enrichissement avec les abonnements a été ajouté dans `getAllWithAlgolia()`. Les résultats Algolia sont maintenant cohérents avec les résultats Firestore.

### Solution optimisée : Batch les requêtes

```typescript
// Récupérer tous les abonnements en batch
const userIds = searchResult.items.map(u => u.id)
const subscriptionsMap = await getSubscriptionsBatch(userIds)

// Enrichir les membres
const membersWithSubscriptions = searchResult.items.map(user => ({
  ...user,
  lastSubscription: subscriptionsMap.get(user.id)?.lastSubscription,
  isSubscriptionValid: subscriptionsMap.get(user.id)?.isValid
}))
```

### Solution long terme : Normaliser le statut

1. **Ajouter un champ calculé** dans `subscriptions` :
   ```typescript
   {
     ...subscriptionData,
     isValid: endDate > Timestamp.now(),  // Calculé côté serveur
     status: 'active' | 'expired' | 'cancelled'  // Statut normalisé
   }
   ```

2. **Synchroniser avec Cloud Function** : Mettre à jour `isValid` et `status` lors des changements

3. **Indexer dans Algolia** : Ajouter `isActive` (basé sur `isValid`) dans l'index Algolia pour filtrage

---

## Tests

### Tests à créer

1. **Test d'enrichissement Algolia** :
   - Vérifier que `getAllWithAlgolia()` retourne des `MemberWithSubscription[]`
   - Vérifier que `lastSubscription` est présent
   - Vérifier que `isSubscriptionValid` est correct

2. **Test de cohérence** :
   - Même membre avec Firestore et Algolia doit avoir le même statut
   - Vérifier que les filtres par statut fonctionnent correctement

3. **Test de performance** :
   - Vérifier que le batch des requêtes subscriptions est efficace
   - Vérifier que le cache React Query fonctionne

---

## Références

- [Documentation création abonnements](../membership-requests/abonnement/README.md)
- [Cloud Function approveMembershipRequest](../../../functions/src/membership-requests/approveMembershipRequest.ts)
- [getMemberWithSubscription](../../../src/db/member.db.ts)
- [Diagramme UML](../../uml/classes/CLASSES_MEMBERSHIP.puml)
