# Règles Firestore - Paramètres Caisse Imprévue

> Documentation des règles Firestore nécessaires pour la page de paramètres de la Caisse Imprévue (`/caisse-imprevue/settings`)

---

## 📋 Vue d'ensemble

La page de paramètres de la Caisse Imprévue permet aux administrateurs de gérer les forfaits disponibles pour les contrats de Caisse Imprévue. Cette page nécessite des règles Firestore pour la collection `subscriptionsCI`.

### Collections concernées

- **`subscriptionsCI`** : Collection principale contenant les forfaits de Caisse Imprévue (codes A à E)

---

## 🔐 Règles par Collection

### 1. subscriptionsCI

**Fichier** : `firestore.rules`

**Collection** : `subscriptionsCI`

**Description** : Forfaits de Caisse Imprévue disponibles pour la création de contrats.

#### Structure des données

```typescript
interface SubscriptionCI {
  // Identifiant unique du forfait (utilisé comme ID de document)
  id: string

  // Libellé du forfait (optionnel)
  label?: string

  // Code du forfait (A, B, C, D, E, etc.)
  code: string

  // Montant mensuel à cotiser (en FCFA)
  amountPerMonth: number

  // Somme nominale à atteindre (en FCFA)
  nominal: number

  // Durée du forfait en mois (généralement 12)
  durationInMonths: number

  // Taux de pénalité en pourcentage (ex: 0.5 pour 0.5%)
  penaltyRate: number

  // Nombre de jours de délai avant application des pénalités
  penaltyDelayDays: number

  // Montant minimum d'appui/aide possible (en FCFA)
  supportMin: number

  // Montant maximum d'appui/aide possible (en FCFA)
  supportMax: number

  // Statut du forfait
  status: 'ACTIVE' | 'INACTIVE'

  // Métadonnées
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy?: string
}
```

#### Règles de sécurité

**Règle recommandée** :

```javascript
match /subscriptionsCI/{subscriptionId} {
  // LECTURE : Admin uniquement
  // Les forfaits sont des données de configuration sensibles
  allow read: if isAdmin();
  
  // CRÉATION : Admin uniquement avec validation des champs requis
  allow create: if isAdmin() &&
    // Champs obligatoires présents
    request.resource.data.keys().hasAll([
      'id',
      'code',
      'amountPerMonth',
      'nominal',
      'durationInMonths',
      'penaltyRate',
      'penaltyDelayDays',
      'supportMin',
      'supportMax',
      'status',
      'createdBy',
      'createdAt',
      'updatedAt'
    ]) &&
    // Validation des types et valeurs
    request.resource.data.code is string &&
    request.resource.data.code.size() > 0 &&
    request.resource.data.code.size() <= 10 &&
    request.resource.data.amountPerMonth is number &&
    request.resource.data.amountPerMonth > 0 &&
    request.resource.data.nominal is number &&
    request.resource.data.nominal > 0 &&
    request.resource.data.durationInMonths is number &&
    request.resource.data.durationInMonths > 0 &&
    request.resource.data.penaltyRate is number &&
    request.resource.data.penaltyRate >= 0 &&
    request.resource.data.penaltyDelayDays is number &&
    request.resource.data.penaltyDelayDays >= 0 &&
    request.resource.data.supportMin is number &&
    request.resource.data.supportMin >= 0 &&
    request.resource.data.supportMax is number &&
    request.resource.data.supportMax >= request.resource.data.supportMin &&
    request.resource.data.status is string &&
    request.resource.data.status in ['ACTIVE', 'INACTIVE'] &&
    request.resource.data.createdBy is string &&
    request.resource.data.createdBy == request.auth.uid &&
    // L'ID du document doit correspondre à l'ID dans les données
    request.resource.data.id == subscriptionId &&
    // Timestamps serveur
    request.resource.data.createdAt is timestamp &&
    request.resource.data.updatedAt is timestamp;
  
  // MISE À JOUR : Admin uniquement avec validation
  allow update: if isAdmin() &&
    // Ne peut pas modifier l'ID
    request.resource.data.id == resource.data.id &&
    // Ne peut pas modifier le code (identifiant métier)
    request.resource.data.code == resource.data.code &&
    // Ne peut pas modifier createdBy et createdAt
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.createdAt == resource.data.createdAt &&
    // updatedBy doit être présent et correspondre à l'utilisateur
    request.resource.data.updatedBy is string &&
    request.resource.data.updatedBy == request.auth.uid &&
    // updatedAt doit être un timestamp serveur
    request.resource.data.updatedAt is timestamp &&
    // Validation des types et valeurs (même que pour create)
    request.resource.data.amountPerMonth is number &&
    request.resource.data.amountPerMonth > 0 &&
    request.resource.data.nominal is number &&
    request.resource.data.nominal > 0 &&
    request.resource.data.durationInMonths is number &&
    request.resource.data.durationInMonths > 0 &&
    request.resource.data.penaltyRate is number &&
    request.resource.data.penaltyRate >= 0 &&
    request.resource.data.penaltyDelayDays is number &&
    request.resource.data.penaltyDelayDays >= 0 &&
    request.resource.data.supportMin is number &&
    request.resource.data.supportMin >= 0 &&
    request.resource.data.supportMax is number &&
    request.resource.data.supportMax >= request.resource.data.supportMin &&
    request.resource.data.status is string &&
    request.resource.data.status in ['ACTIVE', 'INACTIVE'];
  
  // SUPPRESSION : Admin uniquement
  // Note: La suppression doit être effectuée avec précaution car les contrats existants
  // peuvent référencer ce forfait. Il est recommandé de désactiver (status='INACTIVE')
  // plutôt que de supprimer.
  allow delete: if isAdmin();
}
```

#### Opérations effectuées par la page

1. **Lecture de tous les forfaits** (`getAllSubscriptions`)
   - Requête : `collection('subscriptionsCI').orderBy('code', 'asc')`
   - Index nécessaire : `code` (ASCENDING)

2. **Lecture des forfaits actifs** (`getActiveSubscriptions`)
   - Requête : `collection('subscriptionsCI').where('status', '==', 'ACTIVE').orderBy('code', 'asc')`
   - Index nécessaire : `status` (ASCENDING) + `code` (ASCENDING)

3. **Lecture d'un forfait par ID** (`getSubscriptionById`)
   - Requête : `doc('subscriptionsCI/{id}')`
   - Aucun index nécessaire (lecture directe par ID)

4. **Création d'un forfait** (`createSubscription`)
   - Utilise `setDoc` avec un ID personnalisé
   - Validation des champs requis

5. **Mise à jour d'un forfait** (`updateSubscription`)
   - Utilise `updateDoc`
   - Met à jour `updatedAt` et `updatedBy`

6. **Suppression d'un forfait** (`deleteSubscription`)
   - Utilise `deleteDoc`
   - ⚠️ **Attention** : Vérifier qu'aucun contrat n'utilise ce forfait avant suppression

---

## 📊 Index Firestore nécessaires

### Index pour la requête `getActiveSubscriptions`

**Collection** : `subscriptionsCI`

**Requête** :
```javascript
query(
  collection(db, 'subscriptionsCI'),
  where('status', '==', 'ACTIVE'),
  orderBy('code', 'asc')
)
```

**Index requis** :

```json
{
  "collectionGroup": "subscriptionsCI",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "code",
      "order": "ASCENDING"
    }
  ]
}
```

**Fichier** : `firestore.indexes.json`

**État actuel** : ⚠️ **À ajouter** - Cet index n'est pas présent dans le fichier actuel.

### Index pour la requête `getAllSubscriptions`

**Collection** : `subscriptionsCI`

**Requête** :
```javascript
query(
  collection(db, 'subscriptionsCI'),
  orderBy('code', 'asc')
)
```

**Index requis** : Aucun index composite nécessaire (tri simple sur un seul champ).

**Note** : Firestore crée automatiquement un index simple pour `code` lors de la première utilisation.

---

## 🔒 Sécurité - Protection contre les Modifications Non Autorisées

### Protection des Champs Immutables

**Champs qui ne doivent pas être modifiés après création** :
- `id` : Identifiant unique du forfait
- `code` : Code du forfait (identifiant métier)
- `createdBy` : Auteur de la création
- `createdAt` : Date de création

**Solution** : Les règles de mise à jour vérifient que ces champs ne sont pas modifiés.

### Validation des Valeurs Métier

**Contraintes métier** :
- `amountPerMonth` > 0
- `nominal` > 0
- `durationInMonths` > 0
- `penaltyRate` >= 0
- `penaltyDelayDays` >= 0
- `supportMin` >= 0
- `supportMax` >= `supportMin`
- `status` in ['ACTIVE', 'INACTIVE']

**Solution** : Les règles de création et de mise à jour valident ces contraintes.

### Protection contre la Suppression Accidentelle

**Recommandation** : Avant de supprimer un forfait, vérifier qu'aucun contrat actif ne l'utilise. Il est préférable de désactiver un forfait (`status='INACTIVE'`) plutôt que de le supprimer.

---

## 📝 Résumé des Modifications Nécessaires

### ✅ À Ajouter dans `firestore.rules`

Ajouter la section suivante dans `firestore.rules` (après la section `caisseContracts`, avant la règle par défaut) :

```javascript
// ==========================================
// FORFAITS CAISSE IMPRÉVUE (SUBSCRIPTIONS CI)
// ==========================================

match /subscriptionsCI/{subscriptionId} {
  // LECTURE : Admin uniquement
  allow read: if isAdmin();
  
  // CRÉATION : Admin uniquement avec validation
  allow create: if isAdmin() &&
    request.resource.data.keys().hasAll([
      'id', 'code', 'amountPerMonth', 'nominal', 'durationInMonths',
      'penaltyRate', 'penaltyDelayDays', 'supportMin', 'supportMax',
      'status', 'createdBy', 'createdAt', 'updatedAt'
    ]) &&
    request.resource.data.code is string &&
    request.resource.data.code.size() > 0 &&
    request.resource.data.amountPerMonth is number &&
    request.resource.data.amountPerMonth > 0 &&
    request.resource.data.nominal is number &&
    request.resource.data.nominal > 0 &&
    request.resource.data.durationInMonths is number &&
    request.resource.data.durationInMonths > 0 &&
    request.resource.data.penaltyRate is number &&
    request.resource.data.penaltyRate >= 0 &&
    request.resource.data.penaltyDelayDays is number &&
    request.resource.data.penaltyDelayDays >= 0 &&
    request.resource.data.supportMin is number &&
    request.resource.data.supportMin >= 0 &&
    request.resource.data.supportMax is number &&
    request.resource.data.supportMax >= request.resource.data.supportMin &&
    request.resource.data.status is string &&
    request.resource.data.status in ['ACTIVE', 'INACTIVE'] &&
    request.resource.data.createdBy is string &&
    request.resource.data.createdBy == request.auth.uid &&
    request.resource.data.id == subscriptionId &&
    request.resource.data.createdAt is timestamp &&
    request.resource.data.updatedAt is timestamp;
  
  // MISE À JOUR : Admin uniquement avec validation
  allow update: if isAdmin() &&
    request.resource.data.id == resource.data.id &&
    request.resource.data.code == resource.data.code &&
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.createdAt == resource.data.createdAt &&
    request.resource.data.updatedBy is string &&
    request.resource.data.updatedBy == request.auth.uid &&
    request.resource.data.updatedAt is timestamp &&
    request.resource.data.amountPerMonth is number &&
    request.resource.data.amountPerMonth > 0 &&
    request.resource.data.nominal is number &&
    request.resource.data.nominal > 0 &&
    request.resource.data.durationInMonths is number &&
    request.resource.data.durationInMonths > 0 &&
    request.resource.data.penaltyRate is number &&
    request.resource.data.penaltyRate >= 0 &&
    request.resource.data.penaltyDelayDays is number &&
    request.resource.data.penaltyDelayDays >= 0 &&
    request.resource.data.supportMin is number &&
    request.resource.data.supportMin >= 0 &&
    request.resource.data.supportMax is number &&
    request.resource.data.supportMax >= request.resource.data.supportMin &&
    request.resource.data.status is string &&
    request.resource.data.status in ['ACTIVE', 'INACTIVE'];
  
  // SUPPRESSION : Admin uniquement
  allow delete: if isAdmin();
}
```

### ⚠️ À Ajouter dans `firestore.indexes.json`

Ajouter l'index suivant dans le tableau `indexes` :

```json
{
  "collectionGroup": "subscriptionsCI",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "code",
      "order": "ASCENDING"
    }
  ]
}
```

---

## 🧪 Tests des Règles

### Scénarios à Tester

1. **Lecture réussie** :
   - Admin authentifié peut lire tous les forfaits
   - Admin authentifié peut lire un forfait par ID
   - Utilisateur non admin ne peut pas lire les forfaits

2. **Création réussie** :
   - Admin authentifié peut créer un forfait avec tous les champs requis
   - Admin authentifié ne peut pas créer un forfait avec des valeurs invalides
   - Utilisateur non admin ne peut pas créer de forfait

3. **Mise à jour réussie** :
   - Admin authentifié peut mettre à jour un forfait
   - Admin authentifié ne peut pas modifier `id`, `code`, `createdBy`, `createdAt`
   - Admin authentifié doit fournir `updatedBy` et `updatedAt`
   - Utilisateur non admin ne peut pas mettre à jour un forfait

4. **Suppression réussie** :
   - Admin authentifié peut supprimer un forfait
   - Utilisateur non admin ne peut pas supprimer un forfait

5. **Validation des contraintes** :
   - Impossible de créer un forfait avec `amountPerMonth <= 0`
   - Impossible de créer un forfait avec `supportMax < supportMin`
   - Impossible de créer un forfait avec `status` différent de 'ACTIVE' ou 'INACTIVE'

---

## 📖 Références

- **Fichier de règles** : `firestore.rules`
- **Fichier d'index** : `firestore.indexes.json`
- **Repository** : `src/repositories/caisse-imprevu/SubscriptionCIRepository.ts`
- **Service** : `src/services/caisse-imprevue/CaisseImprevueService.ts`
- **Page** : `src/app/(admin)/caisse-imprevue/settings/page.tsx`
- **Composant** : `src/components/caisse-imprevue/ListSubscriptionCISection.tsx`
- **Types** : `src/types/types.ts` (interface `SubscriptionCI`)

---

## 📌 Notes Importantes

1. **ID personnalisé** : Les forfaits utilisent un ID personnalisé (généralement le code du forfait) plutôt qu'un ID généré automatiquement par Firestore.

2. **Désactivation vs Suppression** : Il est recommandé de désactiver un forfait (`status='INACTIVE'`) plutôt que de le supprimer, car des contrats existants peuvent le référencer.

3. **Index composite** : L'index `status + code` est nécessaire pour la requête `getActiveSubscriptions`. Sans cet index, Firestore retournera une erreur lors de l'exécution de la requête.

4. **Sécurité** : Toutes les opérations sont réservées aux administrateurs uniquement, car les forfaits sont des données de configuration sensibles.
