# Firebase – Anniversaires des membres (V2)

## 1. Collections / champs utilisés

### 1.1 Collection `users`

| Champ | Type | Description | Requis |
|-------|------|-------------|--------|
| `id` | string | Matricule (clé primaire) | ✅ |
| `firstName` | string | Prénom | ✅ |
| `lastName` | string | Nom | ✅ |
| `birthDate` | string | Date de naissance (ISO 8601) | ✅ |
| `birthMonth` | number | Mois de naissance (1-12) | ✅ V2 |
| `birthDay` | number | Jour de naissance (1-31) | ✅ V2 |
| `birthDayOfYear` | number | Jour de l'année (1-366) | ✅ V2 |
| `photoURL` | string | URL de la photo | ❌ |
| `membershipType` | string | Type de membre | ✅ |
| `roles` | string[] | Rôles (Adherant, Bienfaiteur, etc.) | ✅ |
| `isActive` | boolean | Membre actif | ✅ |

### 1.2 Collection `notifications`

| Champ | Type | Description |
|-------|------|-------------|
| `module` | string | `'memberships'` |
| `type` | string | `'birthday_reminder'` |
| `metadata.memberId` | string | Matricule du membre |
| `metadata.daysUntil` | number | Jours avant anniversaire |
| `createdAt` | Timestamp | Date de création |

## 2. Migration des données

### 2.1 Nouveaux champs à ajouter

Les champs `birthMonth`, `birthDay` et `birthDayOfYear` doivent être calculés à partir de `birthDate` existant.

### 2.2 Script de migration Firestore

✅ **SCRIPT CRÉÉ** : `scripts/migrate-birthdays-fields.ts`

Le script de migration est prêt à être utilisé. Il supporte les environnements dev, preprod et prod.

#### Utilisation

```bash
# Mode simulation (dry-run) - recommandé pour tester d'abord
npx tsx scripts/migrate-birthdays-fields.ts dev --dry-run

# Exécution réelle sur dev
npx tsx scripts/migrate-birthdays-fields.ts dev

# Exécution réelle sur preprod
npx tsx scripts/migrate-birthdays-fields.ts preprod

# Exécution réelle sur prod (avec confirmation)
npx tsx scripts/migrate-birthdays-fields.ts prod
```

#### Fonctionnalités du script

- ✅ **Pagination** : Traite les documents par pages de 1000 pour éviter de charger tout en mémoire
- ✅ **Batch updates** : Utilise des batches de 500 documents (limite Firestore)
- ✅ **Skip automatique** : Ignore les documents déjà migrés (qui ont `birthDayOfYear`)
- ✅ **Gestion des erreurs** : Gère les dates invalides et continue le traitement
- ✅ **Logs détaillés** : Affiche la progression tous les 100 documents
- ✅ **Support multi-environnements** : Dev, preprod, prod
- ✅ **Mode dry-run** : Permet de tester sans modifier les données

#### Résumé du script

Le script :
1. Lit tous les documents de la collection `users` par pagination
2. Pour chaque document avec `birthDate` :
   - Calcule `birthMonth` (1-12)
   - Calcule `birthDay` (1-31)
   - Calcule `birthDayOfYear` (1-366) avec gestion des années bissextiles
3. Met à jour les documents en batch (500 max)
4. Ignore les documents déjà migrés ou sans `birthDate`
5. Affiche un résumé détaillé à la fin

#### Exemple de sortie

```
🚀 Démarrage de la migration des champs d'anniversaire

📋 Environnement: dev (Développement)
📋 Projet: kara-gabon-dev
📋 Collection: users
📋 Mode: EXÉCUTION RÉELLE

✅ Firebase Admin initialisé pour le projet: kara-gabon-dev

📂 Récupération des documents de la collection "users"...

📄 Traitement de 1000 documents (total traité: 0)...
   ⏳ 100 documents traités... (85 mis à jour, 10 ignorés)
   ⏳ 200 documents traités... (170 mis à jour, 25 ignorés)
   ...
   ✅ Batch de 500 documents committé
   ✅ Dernier batch de 350 documents committé

📊 Résumé de la migration:
   ✅ 850 documents mis à jour
   ⏭️  100 documents ignorés (déjà migrés)
   ⚠️  50 documents sans birthDate
   📝 Total traité: 1000 documents

✨ Migration terminée avec succès!
```

### 2.3 Calcul automatique pour les nouveaux membres

✅ **IMPLÉMENTÉ** : La Cloud Function `approveMembershipRequest.ts` calcule automatiquement ces champs lors de la création d'un nouveau membre.

```typescript
// Dans functions/src/membership-requests/approveMembershipRequest.ts

function calculateBirthdayFields(birthDateStr: string | undefined): {
  birthMonth: number | null
  birthDay: number | null
  birthDayOfYear: number | null
} {
  if (!birthDateStr) {
    return { birthMonth: null, birthDay: null, birthDayOfYear: null }
  }

  try {
    const birthDate = new Date(birthDateStr)
    if (isNaN(birthDate.getTime())) {
      return { birthMonth: null, birthDay: null, birthDayOfYear: null }
    }

    const birthMonth = birthDate.getMonth() + 1 // 1-12
    const birthDay = birthDate.getDate()        // 1-31
    
    // Calculer le jour de l'année (1-366)
    const start = new Date(birthDate.getFullYear(), 0, 0)
    const diff = birthDate.getTime() - start.getTime()
    const oneDay = 1000 * 60 * 60 * 24
    const birthDayOfYear = Math.floor(diff / oneDay)

    return { birthMonth, birthDay, birthDayOfYear }
  } catch (error) {
    return { birthMonth: null, birthDay: null, birthDayOfYear: null }
  }
}

// Utilisé lors de la création du document users
const birthdayFields = calculateBirthdayFields(membershipRequest.identity?.birthDate)
const userData = {
  // ... autres champs ...
  birthDate: membershipRequest.identity?.birthDate || '',
  birthMonth: birthdayFields.birthMonth,
  birthDay: birthdayFields.birthDay,
  birthDayOfYear: birthdayFields.birthDayOfYear,
  // ...
}
```

**Résultat** : Tous les nouveaux membres approuvés ont automatiquement `birthMonth`, `birthDay` et `birthDayOfYear` calculés et stockés dans Firestore.

## 3. Index Firestore

### 3.1 Index requis pour les anniversaires

Ajouter ces index dans `firestore.indexes.json` :

```json
{
  "indexes": [
    // Index 1 : Liste paginée par jour de l'année (anniversaire proche)
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
        { "fieldPath": "birthDayOfYear", "order": "ASCENDING" }
      ]
    },
    // Index 2 : Filtrage par mois + tri par jour
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
        { "fieldPath": "birthMonth", "order": "ASCENDING" },
        { "fieldPath": "birthDay", "order": "ASCENDING" }
      ]
    },
    // Index 3 : Calendrier (par mois spécifique)
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "birthMonth", "order": "ASCENDING" },
        { "fieldPath": "birthDay", "order": "ASCENDING" }
      ]
    },
    // Index 4 : Filtrage par mois avec rôles (multi-mois)
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
        { "fieldPath": "birthMonth", "order": "ASCENDING" },
        { "fieldPath": "birthDayOfYear", "order": "ASCENDING" }
      ]
    },
    // Index 5 : Anniversaires avec isActive
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "birthDayOfYear", "order": "ASCENDING" }
      ]
    },
    // Index 6 : Comptage par mois et rôle
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
        { "fieldPath": "birthMonth", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 3.2 Commande de déploiement

```bash
# Déployer sur dev
firebase deploy --only firestore:indexes --project kara-dev

# Déployer sur prod
firebase deploy --only firestore:indexes --project kara-prod
```

## 4. Requêtes Firestore

### 4.1 Liste paginée par anniversaire proche

```typescript
// Stratégie : 2 requêtes pour pagination circulaire
async function getBirthdaysPaginated(
  pageSize: number,
  cursor?: DocumentSnapshot
): Promise<PaginatedBirthdays> {
  const todayDayOfYear = calculateDayOfYear(new Date())
  const usersRef = collection(db, 'users')
  
  // Query 1 : Du jour courant à fin d'année
  let q1 = query(
    usersRef,
    where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
    where('birthDayOfYear', '>=', todayDayOfYear),
    orderBy('birthDayOfYear', 'asc'),
    limit(pageSize)
  )
  
  // Query 2 : Du début d'année au jour courant
  let q2 = query(
    usersRef,
    where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
    where('birthDayOfYear', '<', todayDayOfYear),
    orderBy('birthDayOfYear', 'asc'),
    limit(pageSize)
  )
  
  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(q1),
    getDocs(q2)
  ])
  
  // Merger les résultats : à venir d'abord, puis passés
  const combined = [...snapshot1.docs, ...snapshot2.docs]
  
  return {
    data: combined.slice(0, pageSize).map(transformToBirthdayMember),
    pagination: { /* ... */ }
  }
}
```

### 4.2 Calendrier par mois

```typescript
async function getBirthdaysByMonth(
  month: number, // 1-12
  year: number
): Promise<BirthdayMember[]> {
  const usersRef = collection(db, 'users')
  
  const q = query(
    usersRef,
    where('birthMonth', '==', month),
    where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
    orderBy('birthDay', 'asc')
  )
  
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => transformToBirthdayMember(doc, year))
}
```

### 4.3 Filtrage par plusieurs mois

```typescript
async function getBirthdaysByMonths(
  months: number[] // ex: [1, 2, 3] pour Jan, Fév, Mars
): Promise<BirthdayMember[]> {
  const usersRef = collection(db, 'users')
  
  // Limite Firestore : max 10 valeurs pour 'in'
  if (months.length > 10) {
    // Diviser en plusieurs requêtes
    const chunks = chunkArray(months, 10)
    const results = await Promise.all(
      chunks.map(chunk => getBirthdaysByMonths(chunk))
    )
    return results.flat()
  }
  
  const q = query(
    usersRef,
    where('birthMonth', 'in', months),
    where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
    orderBy('birthDay', 'asc')
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(transformToBirthdayMember)
}
```

### 4.4 Comptage total

```typescript
async function getTotalBirthdaysCount(): Promise<number> {
  const usersRef = collection(db, 'users')
  
  const q = query(
    usersRef,
    where('roles', 'array-contains-any', ['Adherant', 'Bienfaiteur', 'Sympathisant']),
    where('birthDate', '!=', null)
  )
  
  const countSnapshot = await getCountFromServer(q)
  return countSnapshot.data().count
}
```

## 5. Règles de sécurité Firestore

### 5.1 Règles pour `users`

```javascript
// Dans firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Collection users
    match /users/{userId} {
      // Lecture : admins uniquement (pour liste anniversaires)
      allow read: if isAdmin();
      
      // Écriture : système uniquement (Cloud Functions)
      allow write: if false;
      
      function isAdmin() {
        return request.auth != null && 
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.roles.hasAny(['Admin', 'SuperAdmin']);
      }
    }
  }
}
```

### 5.2 Vérification des règles

Les règles actuelles devraient déjà couvrir la lecture par les admins. Vérifier que :
- Les admins peuvent lire la collection `users`
- Les nouveaux champs (`birthMonth`, `birthDay`, `birthDayOfYear`) ne nécessitent pas de règles supplémentaires

## 6. Jobs planifiés existants

### 6.1 `birthdayNotifications.ts`

Le job existant dans `functions/src/scheduled/birthdayNotifications.ts` :
- Utilise déjà `birthDate` pour calculer les anniversaires
- Peut être optimisé pour utiliser `birthDayOfYear` 

```typescript
// Optimisation possible
const todayDayOfYear = calculateDayOfYear(new Date())

// Anniversaires aujourd'hui (J-0)
const todayQuery = query(
  usersRef,
  where('birthDayOfYear', '==', todayDayOfYear),
  where('isActive', '==', true)
)

// Anniversaires dans 2 jours (J-2)
const in2DaysQuery = query(
  usersRef,
  where('birthDayOfYear', '==', (todayDayOfYear + 2) % 366),
  where('isActive', '==', true)
)
```

## 7. Checklist de déploiement

### 7.1 Développement

- [ ] Exécuter le script de migration sur `kara-dev`
- [ ] Déployer les index Firestore sur `kara-dev`
- [ ] Mettre à jour la Cloud Function `approveMembershipRequest`
- [ ] Mettre à jour la Cloud Function `syncMembersToAlgolia`
- [ ] Tester les requêtes

### 7.2 Production

- [ ] Exécuter le script de migration sur `kara-prod`
- [ ] Déployer les index Firestore sur `kara-prod`
- [ ] Déployer les Cloud Functions sur `kara-prod`
- [ ] Vérifier les performances

## 8. Performances

### 8.1 Estimations

| Opération | Reads estimés | Coût |
|-----------|--------------|------|
| Liste paginée (20 items) | 20-40 | Faible |
| Calendrier (1 mois) | ~100-500 | Moyen |
| Comptage total | 1 (aggregation) | Très faible |
| Recherche Algolia | 0 Firestore | Algolia quota |

### 8.2 Optimisations

1. **Cache React Query** : Évite les re-fetch
2. **Pagination serveur** : Limite les reads par page
3. **getCountFromServer** : Un seul read pour le comptage
4. **Index composites** : Requêtes efficaces
