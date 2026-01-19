# Variables d'Environnement Algolia à Ajouter

## 📝 Variables à Ajouter dans les Fichiers .env

### Variables Algolia

- **App ID** : `IYE83A0LRH`
- **Search API Key** : `dae9bfff3f1e612d0c0f872f5681131c` (pour le client)
- **Write API Key** : `f37a6169f18864759940d3a3125625f2` (pour les Cloud Functions)

---

## 🔧 Configuration par Fichier

### `.env.dev` (Développement Local)

Ajouter à la fin du fichier :

```env
# Algolia Configuration
NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-dev
ALGOLIA_APP_ID=IYE83A0LRH
ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2
```

### `.env.preview` (Preprod)

Ajouter à la fin du fichier :

```env
# Algolia Configuration
NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-preprod
ALGOLIA_APP_ID=IYE83A0LRH
ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2
```

### `.env.prod` (Production)

Ajouter à la fin du fichier :

```env
# Algolia Configuration
NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-prod
ALGOLIA_APP_ID=IYE83A0LRH
ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2
```

---

## 📋 Explication des Variables

### Variables `NEXT_PUBLIC_*` (Client - Next.js)

- `NEXT_PUBLIC_ALGOLIA_APP_ID` : ID de l'application Algolia (accessible côté client)
- `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` : Clé API de recherche uniquement (sécurisée pour le client)
- `NEXT_PUBLIC_ALGOLIA_INDEX_NAME` : Nom de l'index Algolia à utiliser (différent par environnement)

### Variables sans `NEXT_PUBLIC_` (Serveur - Cloud Functions)

- `ALGOLIA_APP_ID` : ID de l'application Algolia (pour les Cloud Functions)
- `ALGOLIA_WRITE_API_KEY` : Clé API d'écriture (pour indexer les documents, **NE JAMAIS EXPOSER AU CLIENT**)

---

## ⚠️ Sécurité

### ⚠️ IMPORTANT

- ✅ **Search API Key** : Peut être dans les fichiers `.env` avec `NEXT_PUBLIC_` (accessible côté client)
- ❌ **Write API Key** : Ne doit **JAMAIS** être exposée côté client (pas de `NEXT_PUBLIC_`)
- ✅ Les fichiers `.env.*` ne doivent **JAMAIS** être commités dans Git (déjà dans `.gitignore`)

---

## 🚀 Commandes pour Ajouter les Variables

### Option 1 : Ajout Manuel

Ouvrir chaque fichier et ajouter les variables à la fin.

### Option 2 : Via Terminal

```bash
# Dev
echo "" >> .env.dev
echo "# Algolia Configuration" >> .env.dev
echo "NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH" >> .env.dev
echo "NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c" >> .env.dev
echo "NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-dev" >> .env.dev
echo "ALGOLIA_APP_ID=IYE83A0LRH" >> .env.dev
echo "ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2" >> .env.dev

# Preview
echo "" >> .env.preview
echo "# Algolia Configuration" >> .env.preview
echo "NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH" >> .env.preview
echo "NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c" >> .env.preview
echo "NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-preprod" >> .env.preview
echo "ALGOLIA_APP_ID=IYE83A0LRH" >> .env.preview
echo "ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2" >> .env.preview

# Prod
echo "" >> .env.prod
echo "# Algolia Configuration" >> .env.prod
echo "NEXT_PUBLIC_ALGOLIA_APP_ID=IYE83A0LRH" >> .env.prod
echo "NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=dae9bfff3f1e612d0c0f872f5681131c" >> .env.prod
echo "NEXT_PUBLIC_ALGOLIA_INDEX_NAME=membership-requests-prod" >> .env.prod
echo "ALGOLIA_APP_ID=IYE83A0LRH" >> .env.prod
echo "ALGOLIA_WRITE_API_KEY=f37a6169f18864759940d3a3125625f2" >> .env.prod
```

---

## ✅ Vérification

Après avoir ajouté les variables, vérifier qu'elles sont bien présentes :

```bash
# Vérifier .env.dev
grep "ALGOLIA" .env.dev

# Vérifier .env.preview
grep "ALGOLIA" .env.preview

# Vérifier .env.prod
grep "ALGOLIA" .env.prod
```

Vous devriez voir 5 variables par fichier.

---

## 📝 Note pour Vercel

Pour les déploiements Vercel, ces variables doivent également être configurées dans le dashboard Vercel :

1. Aller dans **Settings** → **Environment Variables**
2. Ajouter les variables pour chaque environnement (Preview et Production)
3. Utiliser les mêmes valeurs que dans les fichiers `.env.*`

---

## 🔗 Prochaines Étapes

Une fois les variables ajoutées :

1. Vérifier que les index Algolia existent :
   - `membership-requests-dev`
   - `membership-requests-preprod`
   - `membership-requests-prod`

2. Configurer les Cloud Functions Firebase :
   ```bash
   firebase use dev
   firebase functions:config:set algolia.app_id="IYE83A0LRH" algolia.admin_api_key="f37a6169f18864759940d3a3125625f2" algolia.index_name="membership-requests-dev"
   ```

3. Tester la configuration (voir `ALGOLIA_SETUP.md`)
