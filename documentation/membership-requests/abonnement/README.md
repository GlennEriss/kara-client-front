# Gestion des Abonnements - Membership Requests

> Documentation sur la création et la gestion des abonnements lors de l'approbation d'une demande d'adhésion

## Vue d'ensemble

Lorsqu'une demande d'adhésion est approuvée, un **abonnement d'un an** est automatiquement créé pour le nouveau membre. Cet abonnement est géré dans la collection Firestore `subscriptions`.

---

## Création de l'abonnement lors de l'approbation

### Cloud Function : `approveMembershipRequest`

**Fichier** : `functions/src/membership-requests/approveMembershipRequest.ts`

**Workflow** :

1. **Validation** : Vérification que la demande est payée et en statut `pending`
2. **Création utilisateur Firebase Auth** : Génération email/mot de passe
3. **Création document User** : Création du document dans `users`
4. **Création abonnement** : ⭐ **Création automatique d'un abonnement d'un an**
5. **Mise à jour User** : Ajout de l'ID de l'abonnement dans `users.subscriptions[]`
6. **Mise à jour statut** : Passage de la demande à `approved`

### Code de création de l'abonnement

```typescript
// ==================== 3. CRÉATION ABONNEMENT ====================
console.log(`[approveMembershipRequest] Création abonnement pour: ${matricule}`)

// Calculer les dates (1 an de validité)
const dateStart = Timestamp.now()
const dateEnd = new Date(dateStart.toDate())
dateEnd.setFullYear(dateEnd.getFullYear() + 1)

// Récupérer le montant réel du paiement depuis la demande
// Priorité : 1) Paiement de type 'Subscription', 2) Paiement de type 'Membership', 3) Premier paiement, 4) Montant par défaut
let subscriptionAmount: number | null = null
const payments = membershipRequest.payments || []

if (payments.length > 0) {
  // Chercher d'abord un paiement de type 'Subscription'
  const subscriptionPayment = payments.find((p: any) => p.paymentType === 'Subscription')
  if (subscriptionPayment && subscriptionPayment.amount) {
    subscriptionAmount = subscriptionPayment.amount
  } else {
    // Sinon, chercher un paiement de type 'Membership'
    const membershipPayment = payments.find((p: any) => p.paymentType === 'Membership')
    if (membershipPayment && membershipPayment.amount) {
      subscriptionAmount = membershipPayment.amount
    } else {
      // Sinon, prendre le premier paiement disponible
      const firstPayment = payments[0]
      if (firstPayment && firstPayment.amount) {
        subscriptionAmount = firstPayment.amount
      }
    }
  }
}

// Montants par défaut selon le type de membre (fallback si aucun paiement trouvé)
const defaultAmounts: Record<string, number> = {
  adherant: 10300,
  bienfaiteur: 10300,
  sympathisant: 10300,
}

// Utiliser le montant réel du paiement ou le montant par défaut
const finalAmount = subscriptionAmount !== null ? subscriptionAmount : (defaultAmounts[membershipType] || 10300)

const subscriptionData = {
  userId: matricule,                // ✅ ID du membre (= matricule = UID Firebase) - CORRIGÉ: utiliser userId
  type: membershipType,             // ✅ Type de membre (adherant, bienfaiteur, sympathisant) - CORRIGÉ: utiliser 'type'
  dateStart,                        // ✅ Date de début (maintenant) - CORRIGÉ: utiliser 'dateStart'
  dateEnd: Timestamp.fromDate(dateEnd), // ✅ Date de fin (1 an après) - CORRIGÉ: utiliser 'dateEnd'
  montant: finalAmount,             // ✅ Montant réel du paiement ou montant par défaut
  currency: 'XOF',                  // ✅ Devise
  createdBy: adminId,               // ✅ ID de l'admin qui a créé l'abonnement
  status: 'active',                 // Statut initial
  adhesionPdfURL,                   // URL du PDF d'adhésion (obligatoire)
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
}

// Créer l'abonnement dans la collection 'subscriptions'
subscriptionRef = await db.collection('subscriptions').add(subscriptionData)

// Mettre à jour le document users avec l'ID de l'abonnement
await db.collection('users').doc(matricule).update({
  subscriptions: admin.firestore.FieldValue.arrayUnion(subscriptionRef.id),
  updatedAt: Timestamp.now(),
})
```

### Stratégie de récupération du montant

Le montant de l'abonnement est récupéré depuis les paiements enregistrés dans la demande d'adhésion (`membershipRequest.payments[]`). La stratégie suit un ordre de priorité :

1. **Paiement de type 'Subscription'** : Si un paiement avec `paymentType === 'Subscription'` existe, son montant est utilisé
2. **Paiement de type 'Membership'** : Sinon, si un paiement avec `paymentType === 'Membership'` existe, son montant est utilisé
3. **Premier paiement disponible** : Sinon, le montant du premier paiement dans le tableau est utilisé
4. **Montant par défaut** : Si aucun paiement n'est trouvé, un montant par défaut est utilisé selon le type de membre :
   - `adherant` : 10 300 XOF
   - `bienfaiteur` : 10 300 XOF
   - `sympathisant` : 10 300 XOF

**Note importante** : Cette stratégie garantit que le montant réel payé par le membre est utilisé pour créer l'abonnement, assurant la cohérence entre le paiement enregistré et l'abonnement créé.

### Structure de l'abonnement créé

```typescript
{
  id: string,                    // Auto-généré par Firestore
  userId: string,                // ✅ Matricule du membre (= ID User) - CORRIGÉ: utiliser userId
  type: MembershipType,           // ✅ 'adherant' | 'bienfaiteur' | 'sympathisant' - CORRIGÉ: utiliser 'type'
  dateStart: Timestamp,           // ✅ Date de début (maintenant) - CORRIGÉ: utiliser 'dateStart'
  dateEnd: Timestamp,             // ✅ Date de fin (1 an après) - CORRIGÉ: utiliser 'dateEnd'
  montant: number,                 // ✅ Montant réel du paiement ou montant par défaut
  currency: string,                // ✅ Devise (ex: 'XOF')
  createdBy: string,               // ✅ ID de l'admin qui a créé l'abonnement
  status: 'active',               // Statut initial
  adhesionPdfURL: string,          // URL du PDF d'adhésion validé
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### Durée de l'abonnement

- **Durée** : **1 an** (12 mois)
- **Date de début** : Date d'approbation (maintenant)
- **Date de fin** : Date de début + 1 an

**Exemple** :
- Approbation le 15/01/2025
- Date de début : 15/01/2025
- Date de fin : 15/01/2026

### Rollback en cas d'erreur

Si une erreur survient après la création de l'abonnement, la Cloud Function effectue un rollback automatique :

```typescript
rollbackActions.push(async () => {
  if (subscriptionRef) {
    await subscriptionRef.delete() // Supprime l'abonnement créé
  }
})
```

---

## Collection Firestore

### Collection : `subscriptions`

**Structure** :
```
subscriptions/
  {subscriptionId}/
    - userId: string              // ✅ ID du membre (= matricule) - CORRIGÉ: utiliser userId
    - type: MembershipType        // ✅ Type de membre - CORRIGÉ: utiliser 'type'
    - dateStart: Timestamp         // ✅ Date de début - CORRIGÉ: utiliser 'dateStart'
    - dateEnd: Timestamp           // ✅ Date de fin - CORRIGÉ: utiliser 'dateEnd'
    - montant: number              // ✅ Montant réel du paiement
    - currency: string             // ✅ Devise (ex: 'XOF')
    - createdBy: string            // ✅ ID de l'admin qui a créé
    - status: 'active' | 'expired' | 'cancelled'
    - adhesionPdfURL: string
    - createdAt: Timestamp
    - updatedAt: Timestamp
```

**Index recommandés** :
- `userId` (pour récupérer les abonnements d'un membre) - ✅ CORRIGÉ: utiliser userId au lieu de memberId
- `dateEnd` (pour filtrer les abonnements expirés) - ✅ CORRIGÉ: utiliser dateEnd au lieu de endDate
- `status` (pour filtrer par statut)

### Relation avec User

Le document `users` contient un tableau `subscriptions[]` qui référence les IDs des abonnements :

```typescript
users/
  {matricule}/
    - subscriptions: string[]  // IDs des abonnements
    - ...
```

**Note** : Cette relation est bidirectionnelle :
- `users.subscriptions[]` → IDs des abonnements
- `subscriptions.userId` → ID du membre (✅ CORRIGÉ: utiliser userId au lieu de memberId)

### Récupération du montant depuis les paiements

Le montant de l'abonnement est automatiquement récupéré depuis les paiements enregistrés dans la demande d'adhésion. Cette stratégie garantit que :

1. ✅ Le montant réel payé par le membre est utilisé
2. ✅ La cohérence entre paiement et abonnement est assurée
3. ✅ Un fallback existe si aucun paiement n'est trouvé (montants par défaut)

**Ordre de priorité** :
1. Paiement de type `'Subscription'`
2. Paiement de type `'Membership'`
3. Premier paiement disponible
4. Montant par défaut selon le type de membre

---

## Fonctions utilitaires

### `createDefaultSubscription()` (Frontend)

**Fichier** : `src/db/subscription.db.ts`

Fonction utilitaire pour créer un abonnement par défaut (utilisée dans certains cas spécifiques) :

```typescript
export async function createDefaultSubscription(
  userId: string, 
  membershipType: MembershipType,
  createdBy: string
): Promise<Subscription>
```

**Montants par défaut** (utilisés uniquement en fallback si aucun paiement n'est trouvé) :
- `adherant` : 10 300 XOF
- `bienfaiteur` : 10 300 XOF
- `sympathisant` : 10 300 XOF

**Note** : Cette fonction n'est **pas utilisée** lors de l'approbation standard. La Cloud Function crée directement l'abonnement avec les données spécifiques, en récupérant le montant réel depuis les paiements enregistrés.

---

## Validation et vérifications

### Vérifications avant création

La Cloud Function vérifie :
1. ✅ La demande est en statut `pending`
2. ✅ La demande est payée (`isPaid === true`)
3. ✅ Le PDF d'adhésion est fourni (`adhesionPdfURL` obligatoire)
4. ✅ Les permissions admin sont valides

### Validation après création

Après création, l'abonnement est :
- ✅ Créé dans la collection `subscriptions`
- ✅ Référencé dans `users.subscriptions[]`
- ✅ Retourné dans la réponse de la Cloud Function (`subscriptionId`)

---

## Gestion des erreurs

### Erreurs possibles

1. **Erreur lors de la création de l'abonnement**
   - Rollback automatique de toutes les opérations
   - L'utilisateur Firebase Auth et le document User sont supprimés
   - La demande reste en statut `pending`

2. **Erreur lors de la mise à jour de `users.subscriptions[]`**
   - L'abonnement est créé mais non référencé dans User
   - ⚠️ **Incohérence** : L'abonnement existe mais n'est pas lié au membre
   - Solution : Vérifier manuellement et corriger si nécessaire

### Logs et traçabilité

La Cloud Function log toutes les étapes :
```
[approveMembershipRequest] Création abonnement pour: {matricule}
[approveMembershipRequest] Abonnement créé: {subscriptionId}
```

---

## Tests

### Tests unitaires

- [ ] Tester la création d'abonnement avec différents `membershipType`
- [ ] Tester le calcul des dates (début/fin)
- [ ] Tester le rollback en cas d'erreur
- [ ] Tester la mise à jour de `users.subscriptions[]`

### Tests d'intégration

- [ ] Tester le workflow complet : approbation → création abonnement
- [ ] Vérifier que l'abonnement est bien créé dans Firestore
- [ ] Vérifier que `users.subscriptions[]` contient l'ID de l'abonnement
- [ ] Vérifier le rollback en cas d'erreur après création

---

## Évolutions futures

### Améliorations possibles

1. ✅ **Montants depuis paiements** : **IMPLÉMENTÉ** - Le montant est maintenant récupéré automatiquement depuis les paiements enregistrés
2. **Durée personnalisée** : Permettre de définir une durée autre que 1 an
3. **Abonnements multiples** : Gérer plusieurs abonnements actifs simultanément
4. **Renouvellement automatique** : Système de renouvellement automatique avant expiration

---

## Références

- [Cloud Function approveMembershipRequest](../../../../functions/src/membership-requests/approveMembershipRequest.ts)
- [Documentation abonnements Members](../memberships/abonnement/README.md)
- [Diagramme UML - Subscription](../../../uml/classes/CLASSES_MEMBERSHIP.puml)
