# Algolia – Anniversaires des membres (V2)

## 1. Vue d'ensemble

La recherche d'anniversaires utilise **Algolia** pour permettre une recherche full-text rapide par nom, prénom et matricule. L'index `members-{env}` existant est enrichi avec les champs nécessaires aux anniversaires.

## 2. Index Algolia utilisé

| Environnement | Nom de l'index |
|---------------|----------------|
| Développement | `members-dev` |
| Préprod | `members-preprod` |
| Production | `members-prod` |

> **Note :** L'index est déjà configuré et synchronisé via la Cloud Function `syncMembersToAlgolia.ts`.

## 3. Attributs indexés pour les anniversaires

Les attributs suivants doivent être présents dans l'index Algolia :

| Attribut | Type | Description | Indexé pour recherche | Filtrable |
|----------|------|-------------|----------------------|-----------|
| `objectID` | string | Matricule du membre (clé primaire) | ❌ | ❌ |
| `firstName` | string | Prénom | ✅ | ❌ |
| `lastName` | string | Nom | ✅ | ❌ |
| `matricule` | string | Matricule | ✅ | ✅ |
| `birthDate` | string | Date de naissance (ISO 8601) | ❌ | ❌ |
| `birthMonth` | number | Mois de naissance (1-12) | ❌ | ✅ |
| `birthDay` | number | Jour de naissance (1-31) | ❌ | ✅ |
| `birthDayOfYear` | number | Jour de l'année (1-366) | ❌ | ✅ |
| `photoURL` | string | URL de la photo de profil | ❌ | ❌ |
| `membershipType` | string | Type de membre | ❌ | ✅ |
| `isActive` | boolean | Membre actif | ❌ | ✅ |

## 4. Configuration de l'index

### 4.1 Attributs recherchables (searchableAttributes)

```json
[
  "firstName",
  "lastName", 
  "matricule",
  "searchableText"
]
```

### 4.2 Attributs filtrables (attributesForFaceting)

```json
[
  "filterOnly(birthMonth)",
  "filterOnly(birthDay)",
  "filterOnly(birthDayOfYear)",
  "filterOnly(membershipType)",
  "filterOnly(isActive)",
  "roles"
]
```

### 4.3 Attributs à récupérer (attributesToRetrieve)

Pour les anniversaires, on récupère uniquement les IDs puis on fetch depuis Firestore pour les données complètes :

```json
["objectID"]
```

## 5. Cas d'usage

### 5.1 Recherche par nom/prénom/matricule

```typescript
// Service : BirthdaysAlgoliaService
async searchBirthdays(query: string): Promise<BirthdaySearchResult> {
  const result = await algoliaClient.search({
    requests: [{
      indexName: getMembersIndexName(),
      query,
      filters: 'isActive:true AND (roles:"Adherant" OR roles:"Bienfaiteur" OR roles:"Sympathisant")',
      attributesToRetrieve: ['objectID', 'birthMonth', 'birthDay', 'firstName', 'lastName'],
      hitsPerPage: 10,
    }],
  })
  
  return {
    hits: result.results[0].hits,
    // Le mois d'anniversaire du premier résultat pour navigation
    targetMonth: result.results[0].hits[0]?.birthMonth || null,
  }
}
```

### 5.2 Navigation vers le mois d'anniversaire

Quand l'utilisateur recherche un membre et sélectionne un résultat :

1. Algolia retourne le `birthMonth` du membre
2. Le calendrier navigue automatiquement vers ce mois
3. Le membre est mis en surbrillance dans le calendrier

```typescript
// Dans le composant
const handleSearchSelect = (member: AlgoliaHit) => {
  if (member.birthMonth) {
    setSelectedMonth(member.birthMonth - 1) // 0-indexed
    setHighlightedMemberId(member.objectID)
  }
}
```

## 6. Migration des données

### 6.1 Script de migration

Pour ajouter `birthMonth`, `birthDay` et `birthDayOfYear` aux enregistrements existants :

```typescript
// scripts/migrate-birthdays-to-algolia.ts
import { adminDb } from '../firebase-admin'
import { algoliasearch } from 'algoliasearch'

async function migrateBirthdaysToAlgolia() {
  const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY)
  const usersRef = adminDb.collection('users')
  const snapshot = await usersRef.get()
  
  const updates: any[] = []
  
  snapshot.docs.forEach(doc => {
    const data = doc.data()
    if (data.birthDate) {
      const date = new Date(data.birthDate)
      const birthMonth = date.getMonth() + 1 // 1-12
      const birthDay = date.getDate() // 1-31
      const birthDayOfYear = calculateDayOfYear(date) // 1-366
      
      updates.push({
        objectID: doc.id,
        birthMonth,
        birthDay,
        birthDayOfYear,
      })
    }
  })
  
  // Mise à jour partielle dans Algolia
  await client.partialUpdateObjects({
    indexName: 'members-dev',
    objects: updates,
  })
}

function calculateDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}
```

### 6.2 Synchronisation automatique via Cloud Function

✅ **IMPLÉMENTÉ** : La Cloud Function `syncMembersToAlgolia.ts` synchronise automatiquement les champs anniversaires vers Algolia.

Lorsqu'un membre est créé ou mis à jour dans Firestore :
- Les champs `birthDate`, `birthMonth`, `birthDay`, `birthDayOfYear` et `photoURL` sont automatiquement synchronisés vers Algolia
- La synchronisation se fait en temps réel via le trigger Firestore `onDocumentWritten`

```typescript
// Dans functions/src/members/syncMembersToAlgolia.ts

const algoliaObject = {
  objectID: userId,
  // ... autres champs ...
  // Anniversaires (pour fonctionnalité anniversaires)
  birthDate: afterData.birthDate || null,
  birthMonth: afterData.birthMonth || null,
  birthDay: afterData.birthDay || null,
  birthDayOfYear: afterData.birthDayOfYear || null,
  photoURL: afterData.photoURL || null,
  // ...
}
```

**Note** : Les champs `birthMonth`, `birthDay` et `birthDayOfYear` sont calculés automatiquement lors de l'approbation d'une demande d'adhésion (voir `approveMembershipRequest.ts`), puis synchronisés vers Algolia.

## 7. Replicas (optionnel)

Si nécessaire, créer un replica pour le tri par anniversaire le plus proche :

| Index | Tri |
|-------|-----|
| `members-{env}` | createdAt DESC (par défaut) |
| `members-{env}_birthday_asc` | birthDayOfYear ASC |

## 8. Quotas et limites

| Limite | Valeur |
|--------|--------|
| Recherches/mois (gratuit) | 10,000 |
| Recherches/mois (payant) | selon plan |
| Hits par page max | 1,000 |
| Filtres max par requête | 1,000 |

## 9. Tests

### 9.1 Test unitaire de recherche

```typescript
describe('BirthdaysAlgoliaService', () => {
  it('devrait trouver un membre par nom et retourner son mois d\'anniversaire', async () => {
    const result = await service.searchBirthdays('Dupont')
    
    expect(result.hits.length).toBeGreaterThan(0)
    expect(result.hits[0]).toHaveProperty('birthMonth')
    expect(result.targetMonth).toBe(result.hits[0].birthMonth)
  })
})
```

## 10. Dépendances

- `algoliasearch/lite` (client frontend)
- `algoliasearch` (admin, Cloud Functions)
- Variables d'environnement :
  - `NEXT_PUBLIC_ALGOLIA_APP_ID`
  - `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY`
  - `ALGOLIA_ADMIN_API_KEY` (Cloud Functions uniquement)
