# Configuration des Variables d'Environnement - Cloud Functions

## 🔍 Vérifier la Configuration Actuelle

### En Production (Firebase)

```bash
# Se connecter au projet
firebase use kara-gabon

# Vérifier la configuration actuelle
firebase functions:config:get
```

Vous devriez voir quelque chose comme :
```json
{
  "algolia": {
    "app_id": "IYE83A0LRH",
    "write_api_key": "...",
    "members_index_name": "members",
    "index_name": "membership-requests-prod"
  }
}
```

### Vérifier les Logs de la Fonction

```bash
# Vérifier les logs de syncMembersToAlgolia
firebase functions:log --only syncMembersToAlgolia --limit 50

# Chercher les messages de configuration
firebase functions:log --only syncMembersToAlgolia | grep "Algolia configuré"
```

Vous devriez voir :
```
🔍 Algolia configuré pour membres: prod
📊 Index utilisé: members-prod
```

## ⚙️ Configurer les Variables (Production)

### Option 1 : Firebase Functions Config (Recommandé)

```bash
# PROD
firebase use kara-gabon
firebase functions:config:set \
  algolia.app_id="IYE83A0LRH" \
  algolia.write_api_key="votre_admin_key" \
  algolia.members_index_name="members" \
  algolia.index_name="membership-requests-prod"

# Redéployer la fonction pour prendre en compte les changements
firebase deploy --only functions:syncMembersToAlgolia
```

### Option 2 : Firebase Secrets (Plus Sécurisé)

```bash
# PROD
firebase use kara-gabon

# Définir les secrets
echo "IYE83A0LRH" | firebase functions:secrets:set ALGOLIA_APP_ID --data-file -
echo "votre_admin_key" | firebase functions:secrets:set ALGOLIA_WRITE_API_KEY --data-file -
echo "members" | firebase functions:secrets:set ALGOLIA_MEMBERS_INDEX_NAME --data-file -

# Redéployer
firebase deploy --only functions:syncMembersToAlgolia
```

## 🐛 Problèmes Courants

### Erreur : "Algolia n'est pas configuré"

**Cause** : Les variables ne sont pas définies dans `functions.config()` ou `process.env`.

**Solution** : Configurer les variables comme indiqué ci-dessus.

### Les documents ne se synchronisent pas

**Causes possibles** :
1. La fonction n'est pas déployée → `firebase functions:list | grep syncMembersToAlgolia`
2. Les variables sont mal configurées → Vérifier avec `firebase functions:config:get`
3. Les documents n'ont pas les bons rôles → La fonction ignore les admins (seuls `Adherant`, `Bienfaiteur`, `Sympathisant` sont indexés)

**Solution** : Vérifier les logs et la configuration.

### Index incorrect (ex: `members-prod-prod`)

**Cause** : La variable `algolia.members_index_name` contient déjà le suffixe `-prod`.

**Solution** : Utiliser `members` (sans suffixe), la fonction ajoute automatiquement `-prod`.

## 📝 Variables Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `algolia.app_id` | ID de l'application Algolia | `IYE83A0LRH` |
| `algolia.write_api_key` | Clé API d'écriture (Admin) | `f37a6169...` |
| `algolia.members_index_name` | Nom de base de l'index membres | `members` (sans `-prod`) |
| `algolia.index_name` | Nom complet de l'index membership-requests | `membership-requests-prod` |

## 🔗 Documentation Complète

- `functions/README.md` : Documentation générale des Cloud Functions
- `memberships/V2/algolia/STATUS.md` : Configuration complète pour les membres
- `membership-requests/recherche/DEPLOIEMENT_CLOUD_FUNCTIONS.md` : Configuration pour membership-requests
