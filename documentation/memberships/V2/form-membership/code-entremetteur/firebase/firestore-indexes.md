# Index Firestore – Code Entremetteur

## 1. Vue d'ensemble

La fonctionnalité de recherche du code entremetteur utilise principalement **Algolia** pour la recherche en temps réel. Cependant, un **fallback Firestore** peut être nécessaire si Algolia est indisponible.

## 2. Stratégie de recherche

### 2.1 Recherche principale : Algolia

- **Index utilisé** : `members-{env}` (ex: `members-dev`, `members-prod`)
- **Avantages** : Recherche full-text optimisée, pas besoin d'index Firestore
- **Champs recherchés** : `firstName`, `lastName`, `matricule`
- **Filtres** : `isActive: true`

### 2.2 Fallback : Firestore

Si Algolia est indisponible, le système peut utiliser Firestore directement. Dans ce cas, des **index composites** sont nécessaires pour les requêtes avec filtres.

## 3. Index Firestore nécessaires (fallback)

### 3.1 Recherche par prénom avec filtre actif

**Requête** :
```typescript
query(
  collection(db, 'users'),
  where('isActive', '==', true),
  where('firstName', '>=', query),
  where('firstName', '<=', query + '\uf8ff'),
  limit(10)
)
```

**Index requis** :
```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "firstName", "order": "ASCENDING" }
  ]
}
```

### 3.2 Recherche par nom avec filtre actif

**Requête** :
```typescript
query(
  collection(db, 'users'),
  where('isActive', '==', true),
  where('lastName', '>=', query),
  where('lastName', '<=', query + '\uf8ff'),
  limit(10)
)
```

**Index requis** :
```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "lastName", "order": "ASCENDING" }
  ]
}
```

### 3.3 Recherche par matricule avec filtre actif

**Requête** :
```typescript
query(
  collection(db, 'users'),
  where('isActive', '==', true),
  where('matricule', '>=', query),
  where('matricule', '<=', query + '\uf8ff'),
  limit(10)
)
```

**Index requis** :
```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "matricule", "order": "ASCENDING" }
  ]
}
```

## 4. Index composites recommandés

### 4.1 Index combiné (recommandé)

Si le fallback Firestore doit supporter la recherche sur **plusieurs champs simultanément**, créer un index composite :

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "firstName", "order": "ASCENDING" },
    { "fieldPath": "lastName", "order": "ASCENDING" }
  ]
}
```

**Note** : Cet index permet des requêtes sur `firstName` OU `lastName` avec le filtre `isActive`.

## 5. Fichier `firestore.indexes.json`

### 5.1 Ajout des index

Ajouter ces index dans `firestore.indexes.json` :

```json
{
  "indexes": [
    // ... autres index existants ...
    
    // Index pour recherche code entremetteur (fallback Firestore)
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "firstName", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "lastName", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "matricule", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## 6. Déploiement des index

### 6.1 Commande de déploiement

```bash
# Déployer sur dev
firebase deploy --only firestore:indexes --project kara-gabon-dev

# Déployer sur preprod
firebase deploy --only firestore:indexes --project kara-gabon-preprod

# Déployer sur prod
firebase deploy --only firestore:indexes --project kara-gabon-prod
```

### 6.2 Vérification

Après le déploiement, vérifier dans la console Firebase :
1. Aller dans **Firestore Database** → **Indexes**
2. Vérifier que les nouveaux index sont **créés** et **actifs**
3. Le statut doit être **Enabled** (vert)

## 7. Performance et coûts

### 7.1 Utilisation Algolia (recommandé)

- **Coût** : Utilise le quota Algolia (gratuit jusqu'à 10K requêtes/mois)
- **Performance** : Recherche instantanée (< 100ms)
- **Pas d'index Firestore nécessaire** : Algolia gère l'indexation

### 7.2 Fallback Firestore

- **Coût** : 1 read par document retourné (max 10 reads par recherche)
- **Performance** : Dépend de la taille de la collection (peut être plus lent)
- **Index requis** : Les index composites ci-dessus

### 7.3 Recommandation

**Prioriser Algolia** et utiliser Firestore uniquement en fallback. Les index Firestore sont donc **optionnels** mais recommandés pour la résilience.

## 8. Checklist de déploiement

### 8.1 Avant le déploiement

- [ ] Vérifier que l'index Algolia `members-{env}` existe et est à jour
- [ ] Vérifier que les champs `firstName`, `lastName`, `matricule` sont indexés dans Algolia
- [ ] Décider si le fallback Firestore est nécessaire

### 8.2 Si fallback Firestore nécessaire

- [ ] Ajouter les index dans `firestore.indexes.json`
- [ ] Déployer les index sur dev
- [ ] Tester la recherche Firestore (désactiver Algolia temporairement)
- [ ] Vérifier les performances
- [ ] Déployer sur preprod puis prod

### 8.3 Après le déploiement

- [ ] Vérifier que les index sont actifs dans la console Firebase
- [ ] Monitorer les coûts Firestore (reads)
- [ ] Monitorer les performances de recherche

## 9. Notes importantes

### 9.1 Index Algolia existants

Les index Algolia pour les membres existent déjà et sont utilisés par la liste des membres. **Aucune modification Algolia n'est nécessaire** pour cette fonctionnalité.

### 9.2 Index Firestore optionnels

Si Algolia est toujours disponible et que le fallback Firestore n'est pas implémenté, **les index Firestore ne sont pas nécessaires**. Ils sont recommandés pour la résilience du système.

### 9.3 Limites Firestore

- **Limite de requêtes avec `in`** : 10 valeurs maximum
- **Limite de résultats** : 10 résultats par recherche (défini dans le code)
- **Coût** : 1 read par document retourné
