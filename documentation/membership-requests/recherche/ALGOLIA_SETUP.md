# Configuration Algolia - Guide Pas à Pas

## 🚀 Étape 1 : Créer un Compte Algolia

1. Aller sur [algolia.com](https://www.algolia.com)
2. Cliquer sur "Start free" ou "Sign up"
3. Remplir le formulaire d'inscription
4. Vérifier votre email

---

## 🔑 Étape 2 : Récupérer les Clés API

1. Se connecter à Algolia Dashboard
2. Aller dans **Settings** → **API Keys**
3. Noter :
   - **Application ID** (ex: `ABCD1234EF`)
   - **Search-Only API Key** (pour le client - peut être publique)
   - **Admin API Key** (pour l'indexation - **NE JAMAIS EXPOSER**)

---

## 📦 Étape 3 : Créer l'Index

1. Aller dans **Indices** → **Create Index**
2. Nom de l'index : `membership-requests`
3. Cliquer sur **Create**

---

## ⚙️ Étape 4 : Configurer l'Index

### 4.1 Attributs de Recherche

Aller dans **Configuration** → **Searchable attributes**

Ajouter dans cet ordre (priorité décroissante) :
1. `searchableText` (principal)
2. `matricule`
3. `firstName`
4. `lastName`
5. `email`

### 4.2 Attributs pour Filtres (Facets)

Aller dans **Configuration** → **Facets**

Ajouter :
- `isPaid` (type: `filterOnly`)
- `status` (type: `filterOnly`)

### 4.3 Ranking

Aller dans **Configuration** → **Ranking and Sorting**

**Custom Ranking** :
- `desc(createdAt)` (les plus récents en premier)

**Replicas** (optionnel) :
- Créer un replica pour tri par nom : `membership-requests_name_asc`

### 4.4 Configuration JSON

Aller dans **Configuration** → **JSON Editor**

Coller cette configuration :

```json
{
  "searchableAttributes": [
    "searchableText",  // Principal : contient ID, matricule, nom, email, téléphones normalisés
    "matricule",       // Secondaire : pour recherche spécifique
    "firstName",       // Secondaire
    "lastName",        // Secondaire
    "email"            // Secondaire
  ],
  "attributesForFaceting": [
    "filterOnly(isPaid)",
    "filterOnly(status)"
  ],
  "customRanking": [
    "desc(createdAt)"
  ],
  "highlightPreTag": "<mark>",
  "highlightPostTag": "</mark>",
  "minWordSizefor1Typo": 4,
  "minWordSizefor2Typos": 8,
  "typoTolerance": true,
  "ignorePlurals": true,
  "removeStopWords": false,
  "distinct": false,
  "maxValuesPerFacet": 100
}
```

---

## 🔧 Étape 5 : Configuration Firebase

### 5.1 Variables d'Environnement Client

**`.env.local`** :
```env
NEXT_PUBLIC_ALGOLIA_APP_ID=ABCD1234EF
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=search_only_key_here
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests
```

### 5.2 Variables d'Environnement Functions

**`functions/.env`** (pour emulators) :
```env
ALGOLIA_APP_ID=ABCD1234EF
ALGOLIA_ADMIN_API_KEY=admin_key_here
ALGOLIA_INDEX_NAME=membership-requests
```

### 5.3 Configuration Firebase Functions

```bash
firebase functions:config:set \
  algolia.app_id="ABCD1234EF" \
  algolia.admin_api_key="admin_key_here" \
  algolia.index_name="membership-requests"
```

---

## 🧪 Étape 6 : Tester la Configuration

### 6.1 Test Manuel dans Algolia Dashboard

1. Aller dans **Indices** → `membership-requests` → **Browse**
2. Cliquer sur **Add record manually**
3. Ajouter un objet de test :
```json
{
  "objectID": "test-123",
  "matricule": "1234.MK.5678",
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean@example.com",
  "searchableText": "test-123 1234.mk.5678 jean dupont jean dupont jean@example.com",
  "isPaid": false,
  "status": "pending",
  "createdAt": 1704067200000
}
```
4. Cliquer sur **Save**
5. Aller dans **Search** et tester une recherche : "jean"

### 6.2 Test depuis le Code

Créer un script de test :

**`scripts/test-algolia.ts`** :
```typescript
import algoliasearch from 'algoliasearch'

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
)

const index = client.initIndex('membership-requests')

async function testSearch() {
  try {
    const { hits } = await index.search('jean')
    console.log('✅ Recherche réussie:', hits)
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
}

testSearch()
```

Exécuter :
```bash
npx tsx scripts/test-algolia.ts
```

---

## 📊 Étape 7 : Monitoring

### 7.1 Analytics Algolia

Aller dans **Analytics** pour voir :
- Nombre de recherches
- Taux de clics
- Temps de réponse moyen
- Top recherches

### 7.2 Logs Firebase Functions

```bash
# Voir les logs de synchronisation
firebase functions:log --only syncToAlgolia

# Filtrer par erreurs
firebase functions:log --only syncToAlgolia | grep ERROR
```

---

## ⚠️ Sécurité

### ⚠️ IMPORTANT : Ne jamais exposer l'Admin API Key

- ✅ **Search-Only API Key** : Peut être dans le code client (préfixé `NEXT_PUBLIC_`)
- ❌ **Admin API Key** : Uniquement dans Firebase Functions (variables d'environnement serveur)

### Vérification

Vérifier que l'Admin API Key n'est pas dans :
- `.env.local` (client)
- Code source commité
- Variables d'environnement publiques

---

## 🎯 Prochaines Étapes

Une fois la configuration terminée :

1. Suivre `IMPLEMENTATION_ALGOLIA.md` pour l'implémentation
2. Exécuter le script de migration
3. Tester avec des données réelles
4. Monitorer les coûts et performances

---

## 📞 Support

- **Documentation Algolia** : [algolia.com/doc](https://www.algolia.com/doc)
- **Support Algolia** : support@algolia.com
- **Community** : [algolia.com/community](https://www.algolia.com/community)
