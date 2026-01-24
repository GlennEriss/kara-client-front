# Configuration Algolia pour les Anniversaires

## Vue d'ensemble

Ce guide explique comment configurer les index Algolia pour la fonctionnalité d'anniversaires des membres.

## Prérequis

- Accès à la console Algolia (https://www.algolia.com/)
- Identifiants pour les environnements : dev, preprod, prod
- Les index `members-{env}` doivent déjà exister

## Index concernés

| Environnement | Nom de l'index |
|---------------|----------------|
| Développement | `members-dev` |
| Préprod | `members-preprod` |
| Production | `members-prod` |

## Étapes de configuration

### 1. Accéder à la console Algolia

1. Connectez-vous à https://www.algolia.com/
2. Sélectionnez votre application
3. Allez dans **Indices** > **members-dev** (ou preprod/prod)

### 2. Configurer les attributs filtrables (attributesForFaceting)

1. Allez dans **Configuration** > **Facets**
2. Dans **Attributes for faceting**, ajoutez les attributs suivants :

```
filterOnly(birthMonth)
filterOnly(birthDay)
filterOnly(birthDayOfYear)
filterOnly(membershipType)
filterOnly(isActive)
roles
```

**Note :** Si certains attributs existent déjà, ne les ajoutez pas en double.

### 3. Vérifier les attributs recherchables (searchableAttributes)

1. Allez dans **Configuration** > **Search behavior**
2. Vérifiez que **Searchable attributes** contient :

```
firstName
lastName
matricule
searchableText
```

### 4. Vérifier les attributs à récupérer (attributesToRetrieve)

1. Dans **Configuration** > **Search behavior**
2. Vérifiez que **Attributes to retrieve** contient au minimum :

```
objectID
birthMonth
birthDay
birthDayOfYear
firstName
lastName
matricule
photoURL
```

Ou laissez vide pour récupérer tous les attributs.

### 5. Répéter pour chaque environnement

Répétez les étapes 2 à 4 pour :
- `members-preprod`
- `members-prod`

## Vérification

### Test manuel dans la console Algolia

1. Allez dans **Browse** de l'index
2. Vérifiez que les documents contiennent les champs :
   - `birthMonth` (number, 1-12)
   - `birthDay` (number, 1-31)
   - `birthDayOfYear` (number, 1-366)
   - `photoURL` (string ou null)

### Test via l'API

```bash
# Remplacer par vos identifiants
curl -X POST \
  'https://YOUR_APP_ID-dsn.algolia.net/1/indexes/members-dev/search' \
  -H 'X-Algolia-Application-Id: YOUR_APP_ID' \
  -H 'X-Algolia-API-Key: YOUR_SEARCH_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "test",
    "filters": "isActive:true AND birthMonth:1",
    "attributesToRetrieve": ["objectID", "birthMonth", "birthDay", "firstName", "lastName"]
  }'
```

## Synchronisation automatique

Les champs `birthMonth`, `birthDay`, `birthDayOfYear` et `photoURL` sont automatiquement synchronisés vers Algolia via la Cloud Function `syncMembersToAlgolia.ts` lorsque :

- Un nouveau membre est créé (via `approveMembershipRequest`)
- Un membre existant est mis à jour (modification de `birthDate` ou `photoURL`)

## Migration des données existantes

Si vous avez déjà des données dans Algolia avant la migration Firestore :

1. Attendez que la migration Firestore soit terminée
2. La Cloud Function `syncMembersToAlgolia` mettra automatiquement à jour les documents lors de la prochaine modification
3. Pour forcer la synchronisation, vous pouvez :
   - Modifier manuellement un document dans Firestore
   - Ou exécuter un script de migration Algolia (voir `documentation/memberships/V2/anniversaires-memberships/algolia/README.md`)

## Dépannage

### Les attributs filtrables ne fonctionnent pas

- Vérifiez que les attributs sont bien dans `attributesForFaceting`
- Vérifiez que les valeurs sont du bon type (number pour birthMonth, birthDay, birthDayOfYear)
- Attendez quelques minutes après la configuration (propagation)

### Les données ne sont pas à jour

- Vérifiez que la Cloud Function `syncMembersToAlgolia` est déployée
- Vérifiez les logs de la Cloud Function
- Vérifiez que les documents Firestore ont bien les champs `birthMonth`, `birthDay`, `birthDayOfYear`

### Erreur "Attribute not found"

- Vérifiez que les attributs existent dans les documents Algolia
- Vérifiez que la synchronisation a bien eu lieu
- Utilisez l'onglet **Browse** pour inspecter un document

## Support

Pour toute question, consultez :
- La documentation Algolia : https://www.algolia.com/doc/
- Le README principal : `documentation/memberships/V2/anniversaires-memberships/algolia/README.md`
