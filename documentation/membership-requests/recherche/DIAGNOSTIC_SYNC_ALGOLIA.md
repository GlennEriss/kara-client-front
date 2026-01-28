# Diagnostic et Résolution - Synchronisation Algolia

## 🔍 Problème

Les nouvelles membership requests ajoutées récemment ne sont pas trouvées lors de la recherche dans l'index Algolia `membership-requests-prod`.

**Symptôme typique :** Seuls les documents indexés la première fois sont disponibles dans Algolia, les nouveaux documents ajoutés après ne sont pas synchronisés automatiquement.

## 📋 Étapes de Diagnostic

### 1. Vérifier les Logs de la Cloud Function

La Cloud Function `syncToAlgolia` devrait automatiquement synchroniser les nouvelles données. Vérifions si elle fonctionne :

```bash
# Se connecter au projet Firebase PROD
firebase use kara-gabon

# Vérifier les logs récents
firebase functions:log --only syncToAlgolia --limit 50

# Vérifier uniquement les erreurs
firebase functions:log --only syncToAlgolia --min-severity=ERROR
```

**Ce qu'il faut chercher :**
- ✅ `✅ Document {id} synchronisé vers Algolia` → La fonction fonctionne
- ❌ `❌ Erreur lors de la synchronisation` → Il y a un problème
- ⚠️ `Algolia n'est pas configuré` → Variables d'environnement manquantes
- ⏭️ `Document {id} inchangé, ignoré` → Le document n'a pas changé (normal)

### 2. Vérifier que la Cloud Function est Déployée

```bash
# Lister toutes les fonctions déployées
firebase functions:list

# Vérifier spécifiquement syncToAlgolia
firebase functions:list | grep syncToAlgolia
```

**Si la fonction n'est pas listée :** Elle n'est pas déployée. Voir section "Déploiement" ci-dessous.

### 3. Vérifier la Configuration Algolia

```bash
# Vérifier les variables d'environnement configurées
firebase functions:config:get

# Vérifier que les secrets sont définis
firebase functions:secrets:access ALGOLIA_APP_ID
firebase functions:secrets:access ALGOLIA_WRITE_API_KEY
```

**Variables requises :**
- `ALGOLIA_APP_ID` ou `algolia.app_id`
- `ALGOLIA_WRITE_API_KEY` ou `algolia.write_api_key`
- `ALGOLIA_INDEX_NAME` ou `algolia.index_name` (optionnel, par défaut: `membership-requests-prod`)

### 4. Tester la Synchronisation Manuelle

1. **Créer un nouveau document test dans Firestore :**
   - Aller dans Firebase Console → Firestore
   - Collection : `membership-requests`
   - Créer un nouveau document avec les champs minimaux :
     ```json
     {
       "matricule": "TEST.001",
       "identity": {
         "firstName": "Test",
         "lastName": "User"
       },
       "status": "pending",
       "isPaid": false,
       "createdAt": [timestamp actuel],
       "updatedAt": [timestamp actuel]
     }
     ```

2. **Vérifier les logs immédiatement :**
   ```bash
   firebase functions:log --only syncToAlgolia --follow
   ```
   
   **Ce qu'il faut voir :**
   - ✅ `✅ Document {id} synchronisé vers Algolia` → La fonction fonctionne
   - ❌ Aucun log → La fonction ne se déclenche pas (problème de trigger)
   - ❌ `❌ Erreur lors de la synchronisation` → Il y a une erreur

3. **Vérifier dans Algolia Dashboard :**
   - Aller sur [Algolia Dashboard](https://www.algolia.com/apps)
   - Ouvrir l'index `membership-requests-prod`
   - Rechercher le document créé par son ID ou par "Test User"
   - Si le document n'apparaît pas, la synchronisation n'a pas fonctionné

### 5. Vérifier si les Nouveaux Documents Déclenchent la Fonction

Si les nouveaux documents ne sont pas synchronisés, vérifiez :

1. **Vérifier que la fonction est active :**
   ```bash
   firebase functions:list | grep syncToAlgolia
   ```
   
   La fonction doit être listée avec le statut `ACTIVE`.

2. **Vérifier les logs récents pour voir si la fonction est déclenchée :**
   ```bash
   firebase functions:log --only syncToAlgolia --limit 100
   ```
   
   Si vous ne voyez aucun log récent, la fonction ne se déclenche pas.

3. **Vérifier les permissions Firestore :**
   - La Cloud Function doit avoir les permissions pour lire Firestore
   - Vérifier dans Firebase Console → Functions → syncToAlgolia → Permissions

## 🔧 Solutions

### Solution 1 : Synchroniser uniquement les Documents Manquants (Recommandé)

Si la Cloud Function fonctionne mais que certains documents ne sont pas synchronisés, utilisez le script de synchronisation qui compare Firestore et Algolia :

```bash
# 1. Exporter les variables d'environnement Algolia
export ALGOLIA_APP_ID="IYE83A0LRH"
export ALGOLIA_WRITE_API_KEY="votre_admin_key"

# 2. Lancer le script de synchronisation pour PROD
npx tsx scripts/sync-missing-to-algolia.ts prod
```

**Ce script va :**
- Comparer Firestore et Algolia pour identifier les documents manquants
- Indexer uniquement les documents manquants (plus rapide que la migration complète)
- Afficher la progression et les erreurs éventuelles

**Avantages :**
- Plus rapide que la migration complète (ne traite que les documents manquants)
- Idempotent : peut être relancé sans problème
- Affiche un rapport détaillé des documents manquants

### Solution 1bis : Réindexer Toutes les Données

Si vous préférez réindexer toutes les données (utile si vous suspectez des incohérences), utilisez le script de migration complet :

```bash
# 1. Exporter les variables d'environnement Algolia
export ALGOLIA_APP_ID="IYE83A0LRH"
export ALGOLIA_WRITE_API_KEY="votre_admin_key"

# 2. Lancer le script de migration pour PROD
npx tsx scripts/migrate-to-algolia.ts prod
```

**Ce script va :**
- Lire toutes les membership requests depuis Firestore
- Les indexer dans Algolia (index `membership-requests-prod`)
- Afficher la progression et les erreurs éventuelles

**Note :** Le script est idempotent : il peut être relancé sans problème (il mettra à jour les documents existants).

### Solution 2 : Redéployer la Cloud Function

Si la fonction n'est pas déployée ou a des problèmes :

```bash
# 1. Se connecter au projet PROD
firebase use kara-gabon

# 2. Compiler les functions
cd functions
npm run build
cd ..

# 3. Déployer uniquement syncToAlgolia
firebase deploy --only functions:syncToAlgolia
```

### Solution 3 : Configurer les Variables d'Environnement

Si les variables d'environnement ne sont pas définies :

#### Option A : Firebase Functions Config (Recommandé)

```bash
firebase use kara-gabon

firebase functions:config:set \
  algolia.app_id="IYE83A0LRH" \
  algolia.write_api_key="votre_admin_key" \
  algolia.index_name="membership-requests-prod"
```

#### Option B : Firebase Secrets (Plus Sécurisé)

```bash
firebase use kara-gabon

# Définir les secrets
echo "IYE83A0LRH" | firebase functions:secrets:set ALGOLIA_APP_ID --data-file -
echo "votre_admin_key" | firebase functions:secrets:set ALGOLIA_WRITE_API_KEY --data-file -
echo "membership-requests-prod" | firebase functions:secrets:set ALGOLIA_INDEX_NAME --data-file -

# Redéployer la fonction pour utiliser les secrets
firebase deploy --only functions:syncToAlgolia
```

**Note :** La fonction `syncToAlgolia.ts` utilise `functions.config()` en priorité, puis `process.env` en fallback.

### Solution 4 : Vérifier les Permissions Algolia

1. **Vérifier que la clé Admin a les bonnes permissions :**
   - Aller sur [Algolia Dashboard](https://www.algolia.com/apps)
   - API Keys → Admin API Key
   - Vérifier que les permissions incluent : `Add records`, `Delete records`, `Settings`

2. **Vérifier que l'index existe :**
   - Aller sur Algolia Dashboard
   - Vérifier que l'index `membership-requests-prod` existe
   - Si l'index n'existe pas, il sera créé automatiquement lors de la première indexation

## 🎯 Vérification Finale

Après avoir appliqué une solution, vérifiez que tout fonctionne :

1. **Créer un nouveau document test dans Firestore**
2. **Vérifier les logs :** `firebase functions:log --only syncToAlgolia --follow`
3. **Vérifier dans Algolia :** Rechercher le document dans l'index `membership-requests-prod`
4. **Tester la recherche dans l'application :** Vérifier que le nouveau document apparaît dans les résultats de recherche

## 📝 Notes Importantes

- **La Cloud Function `syncToAlgolia` est déclenchée automatiquement** lors de :
  - Création d'un nouveau document (`onCreate`)
  - Modification d'un document (`onUpdate`)
  - Suppression d'un document (`onDelete`)

- **Les documents créés avant le déploiement de la fonction** ne sont pas automatiquement synchronisés. Utilisez le script de migration pour les indexer.

- **Le champ `searchableText` n'existe pas dans Firestore**, il est généré dynamiquement lors de la synchronisation vers Algolia.

- **La fonction ignore les documents inchangés** pour éviter les boucles infinies (comparaison des champs pertinents).

## 🚨 Problèmes Courants

### Erreur : "Algolia n'est pas configuré"

**Cause :** Les variables d'environnement ne sont pas définies.

**Solution :** Voir "Solution 3" ci-dessus.

### Erreur : "Unreachable hosts"

**Cause :** Problème de connexion réseau ou clé API invalide.

**Solution :**
1. Vérifier que la clé API est correcte
2. Vérifier la connexion réseau
3. Vérifier que l'Application ID est correct

### Les documents ne se synchronisent pas

**Causes possibles :**
1. La Cloud Function n'est pas déployée
2. La Cloud Function a des erreurs (vérifier les logs)
3. Les documents ont été créés avant le déploiement de la fonction
4. La Cloud Function ne se déclenche pas (problème de trigger Firestore)
5. Les documents sont créés via un batch write qui ne déclenche pas le trigger

**Solution :**
1. Vérifier les logs (voir "Étape 1")
2. Tester la création d'un nouveau document (voir "Étape 4")
3. Redéployer la fonction si nécessaire
4. Utiliser le script `sync-missing-to-algolia.ts` pour réindexer les documents manquants

### Les nouveaux documents ne déclenchent pas la fonction

**Cause :** Le trigger `onDocumentWritten` ne se déclenche pas pour certains types d'opérations.

**Solutions :**
1. **Vérifier comment les documents sont créés :**
   - Si créés via batch write, le trigger peut ne pas se déclencher immédiatement
   - Si créés via transaction, le trigger se déclenche après la transaction

2. **Utiliser le script de synchronisation :**
   ```bash
   npx tsx scripts/sync-missing-to-algolia.ts prod
   ```
   Ce script identifie et indexe tous les documents manquants.

3. **Redéployer la fonction :**
   Parfois, redéployer la fonction résout les problèmes de trigger :
   ```bash
   firebase use kara-gabon
   firebase deploy --only functions:syncToAlgolia
   ```
