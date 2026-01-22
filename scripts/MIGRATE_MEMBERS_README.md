# Script de Migration des Membres vers Algolia

> Guide d'utilisation du script `migrate-members-to-algolia.ts`

## Prérequis

1. **Variables d'environnement Algolia** :
   ```bash
   export ALGOLIA_APP_ID=VOTRE_APP_ID
   export ALGOLIA_WRITE_API_KEY=votre_admin_key
   ```

2. **Accès Firebase** :
   - Soit via variables d'environnement :
     ```bash
     export FIREBASE_PROJECT_ID=kara-gabon-dev
     export FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@xxx.iam.gserviceaccount.com
     export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
     ```
   - Soit via fichier service account dans `service-accounts/` :
     - `kara-gabon-dev-xxx.json` pour dev
     - `kara-gabon-xxx.json` pour prod

## Utilisation

### Migration DEV → members-dev

```bash
# 1. Définir les variables d'environnement
export ALGOLIA_APP_ID=VOTRE_APP_ID
export ALGOLIA_WRITE_API_KEY=votre_admin_key

# 2. Exécuter le script
npx tsx scripts/migrate-members-to-algolia.ts dev
```

### Migration PROD → members-prod

```bash
# 1. Définir les variables d'environnement
export ALGOLIA_APP_ID=VOTRE_APP_ID
export ALGOLIA_WRITE_API_KEY=votre_admin_key

# 2. Exécuter le script
npx tsx scripts/migrate-members-to-algolia.ts prod
```

### Options disponibles

#### Mode Dry-Run (test sans indexation)

Teste la migration sans indexer dans Algolia :

```bash
npx tsx scripts/migrate-members-to-algolia.ts dev --dry-run
```

Utile pour :
- Vérifier que les données sont correctement formatées
- Estimer le nombre de membres qui seront indexés
- Tester sans risque

#### Vider l'index avant migration

Vide l'index Algolia avant de commencer la migration :

```bash
npx tsx scripts/migrate-members-to-algolia.ts dev --clear-index
```

⚠️ **Attention** : Cette option supprime tous les documents existants dans l'index avant la migration.

#### Combinaison d'options

```bash
# Test avec vidage (dry-run ignore clear-index)
npx tsx scripts/migrate-members-to-algolia.ts dev --dry-run --clear-index
```

## Ce que fait le script

1. **Lit tous les documents** de la collection `users` dans Firestore
2. **Filtre les membres** : ne garde que les utilisateurs avec rôles `Adherant`, `Bienfaiteur` ou `Sympathisant` (exclut les admins)
3. **Génère searchableText** : crée le texte de recherche normalisé pour chaque membre
4. **Indexe par batch** : envoie les données à Algolia par batch de 1000 documents
5. **Affiche la progression** : montre le nombre de documents traités et indexés

## Structure des données indexées

Chaque membre est indexé avec les champs suivants :

```typescript
{
  objectID: string,              // Matricule (= ID Firestore)
  searchableText: string,         // Texte de recherche généré
  matricule: string,
  firstName: string,
  lastName: string,
  email: string,
  contacts: string[],
  companyId: string | null,
  companyName: string,
  professionId: string | null,
  profession: string,
  province: string,
  city: string,
  district: string,
  arrondissement: string,
  membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant',
  roles: string[],
  isActive: boolean,
  gender: 'M' | 'F',
  hasCar: boolean,
  createdAt: number,             // Timestamp en millisecondes
  updatedAt: number,
}
```

## Exemple de sortie

```
🚀 Démarrage de la migration des membres vers Algolia
📊 Environnement: dev
📊 Index Algolia: members-dev
📊 Collection Firestore: users
📊 Rôles membres: Adherant, Bienfaiteur, Sympathisant

📊 Total de documents dans users: 1250

✅ Batch indexé: 1000 membres | Total traité: 1000/1250 (80%) | Indexés: 1000
✅ Batch indexé: 250 membres | Total traité: 1250/1250 (100%) | Indexés: 1250

============================================================
📊 STATISTIQUES DE MIGRATION
============================================================
✅ Membres indexés avec succès: 1250
⏭️  Documents ignorés (non-membres): 15
❌ Documents en erreur: 0
📊 Total traité: 1250
📊 Index Algolia: members-dev
============================================================

🎉 Migration terminée avec succès ! 1250 membres indexés dans Algolia.
✅ Script terminé avec succès
```

## Vérification dans Algolia

Après la migration, vérifiez dans le [Dashboard Algolia](https://dashboard.algolia.com) :

1. Aller dans **Indices** → `members-dev` (ou `members-prod`)
2. Cliquer sur **Browse**
3. Vérifier que les documents sont présents
4. Tester une recherche (ex: "jean dupont")

## Dépannage

### Erreur : "Variables d'environnement manquantes"
- Vérifiez que `ALGOLIA_APP_ID` et `ALGOLIA_WRITE_API_KEY` sont définis

### Erreur : "Fichier service account non trouvé"
- Placez le fichier service account dans `service-accounts/`
- Ou utilisez les variables d'environnement Firebase

### Erreur : "Environnement invalide"
- Utilisez `dev` ou `prod` uniquement

### Documents non indexés
- Vérifiez les logs pour les erreurs détaillées
- Vérifiez que les documents ont bien les rôles de membre

## Notes importantes

- ⚠️ **Le script indexe uniquement les membres** (pas les admins)
- ⚠️ **searchableText est généré dynamiquement** (n'existe pas dans Firestore)
- ⚠️ **Les batchs sont de 1000 documents** (limite Algolia)
- ⚠️ **Le script peut prendre du temps** pour de grandes collections
