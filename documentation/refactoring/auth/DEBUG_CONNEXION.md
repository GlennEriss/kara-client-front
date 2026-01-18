# Guide de Débogage - Problème de Connexion

## 🔍 Étapes de Débogage

### 1. Vérifier la Configuration Firebase Admin

**Route de débogage** : `GET /api/auth/check-user/debug`

Ouvrez cette URL dans votre navigateur ou utilisez curl :

```bash
curl https://votre-domaine.com/api/auth/check-user/debug
```

**Vérifications à faire** :
- ✅ `adminApp.initialized` doit être `true`
- ✅ `adminAuth.available` doit être `true`
- ✅ `adminFirestore.available` doit être `true`
- ✅ `config.hasProjectId`, `hasClientEmail`, `hasPrivateKey` doivent être `true`
- ✅ `env.hasFirebaseProjectId`, `hasFirebaseClientEmail`, `hasFirebasePrivateKey` doivent être `true`

**Si un des éléments est `false`** :
- Vérifiez que les variables d'environnement sont bien définies en production
- Vérifiez que `FIREBASE_PRIVATE_KEY` contient bien `\n` (retours à la ligne) et non des `\\n` littéraux

---

### 2. Vérifier les Logs Serveur

**En production (Vercel)** :
1. Allez dans votre dashboard Vercel
2. Ouvrez les logs de votre déploiement
3. Recherchez les logs commençant par `[check-user]` ou `[UserRepository.userExists]`

**Logs attendus lors d'une tentative de connexion** :
```
[admin.ts] Configuration Firebase Admin: { ... }
[admin.ts] Firebase Admin initialisé avec succès
[check-user] Début de la vérification
[check-user] adminAuth disponible: true
[check-user] adminFirestore disponible: true
[check-user] Recherche de l'utilisateur: 7748.MK.011025
[check-user] Vérification Firebase Auth...
[check-user] Utilisateur trouvé dans Firebase Auth: 7748.MK.011025
[check-user] Résultat final: { found: true, inAuth: true, ... }
```

**Si vous voyez des erreurs** :
- `Firebase Admin non configuré` → Vérifiez les variables d'environnement
- `Erreur Firebase Auth` → Vérifiez que l'utilisateur existe dans Firebase Auth
- `Erreur Firestore users` → Vérifiez les permissions Firestore

---

### 3. Vérifier les Logs Client (Console Navigateur)

**Ouvrez la console du navigateur** et recherchez les logs :

```
[UserRepository.userExists] Vérification de l'utilisateur: 7748.MK.011025
[UserRepository.userExists] Appel API: { apiUrl: '/api/auth/check-user', ... }
[UserRepository.userExists] Réponse API: { status: 200, ok: true, ... }
[UserRepository.userExists] Résultat: { found: true, inAuth: true, ... }
```

**Erreurs possibles** :
- `Erreur API: 503` → Firebase Admin non configuré (voir étape 1)
- `Erreur API: 400` → UID invalide
- `Erreur API: 500` → Erreur serveur (voir logs serveur)
- `Network error` → Problème de connexion réseau

---

### 4. Tester l'API Route Directement

**Test avec curl** :

```bash
curl -X POST https://votre-domaine.com/api/auth/check-user \
  -H "Content-Type: application/json" \
  -d '{"uid": "7748.MK.011025"}'
```

**Réponse attendue** :
```json
{
  "found": true,
  "inAuth": true,
  "inUsers": false,
  "inAdmins": false
}
```

**Si `found: false`** :
- L'utilisateur n'existe pas dans Firebase Auth, Firestore `users`, ni Firestore `admins`
- Vérifiez que le matricule est correct
- Vérifiez que l'utilisateur existe bien dans la base de données

---

### 5. Vérifier les Variables d'Environnement en Production

**Variables requises** :
- `FIREBASE_PROJECT_ID` : ID du projet Firebase (ex: `kara-gabon`)
- `FIREBASE_CLIENT_EMAIL` : Email du service account (ex: `firebase-adminsdk-xxx@xxx.iam.gserviceaccount.com`)
- `FIREBASE_PRIVATE_KEY` : Clé privée du service account (doit contenir `\n` pour les retours à la ligne)

**Format de `FIREBASE_PRIVATE_KEY`** :
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
```

**⚠️ IMPORTANT** :
- Les `\n` doivent être des caractères de retour à la ligne réels, pas des chaînes littérales `\n`
- Si vous copiez depuis un fichier JSON, les `\n` sont déjà échappés, donc c'est correct
- Si vous copiez depuis un fichier `.pem`, vous devez remplacer les retours à la ligne par `\n`

---

### 6. Vérifier que l'Utilisateur Existe

**Dans Firebase Console** :
1. Allez dans **Authentication** → Vérifiez que l'utilisateur existe avec l'UID `7748.MK.011025`
2. Allez dans **Firestore** → Collection `users` → Vérifiez que le document `7748.MK.011025` existe
3. Allez dans **Firestore** → Collection `admins` → Vérifiez que le document `7748.MK.011025` existe (si ancien compte)

**Si l'utilisateur n'existe pas** :
- Créez-le dans Firebase Auth avec l'email et le mot de passe
- Créez-le dans Firestore collection `users` avec le même UID

---

## 🐛 Problèmes Courants

### Problème 1 : "Firebase Admin non configuré"

**Cause** : Variables d'environnement manquantes ou incorrectes

**Solution** :
1. Vérifiez que les 3 variables sont définies dans Vercel
2. Vérifiez que `FIREBASE_PRIVATE_KEY` contient bien les retours à la ligne (`\n`)
3. Redéployez l'application

---

### Problème 2 : "Utilisateur non trouvé" mais l'utilisateur existe

**Cause** : L'utilisateur existe dans une collection mais pas dans Firebase Auth

**Solution** :
1. Vérifiez que l'utilisateur existe dans Firebase Auth avec l'UID exact (matricule)
2. Si l'utilisateur existe seulement dans Firestore, créez-le aussi dans Firebase Auth

---

### Problème 3 : Erreur 503 "Firebase Admin non configuré"

**Cause** : `adminApp` est `null` au moment de l'appel

**Solution** :
1. Vérifiez les logs serveur pour voir pourquoi `adminApp` est `null`
2. Vérifiez que `firebaseAdminConfig` contient bien les valeurs
3. Vérifiez que l'initialisation ne lève pas d'erreur

---

### Problème 4 : Erreur CORS ou Network Error

**Cause** : Problème de réseau ou de configuration CORS

**Solution** :
1. Vérifiez que l'URL de l'API est correcte
2. Vérifiez que le domaine est bien configuré dans Vercel
3. Vérifiez les logs serveur pour voir si la requête arrive

---

## 📝 Checklist de Débogage

- [ ] Route `/api/auth/check-user/debug` retourne `adminApp.initialized: true`
- [ ] Variables d'environnement définies dans Vercel
- [ ] `FIREBASE_PRIVATE_KEY` contient bien `\n` (retours à la ligne)
- [ ] Logs serveur montrent "Firebase Admin initialisé avec succès"
- [ ] Logs serveur montrent "adminAuth disponible: true"
- [ ] Logs serveur montrent "adminFirestore disponible: true"
- [ ] Utilisateur existe dans Firebase Auth avec l'UID exact
- [ ] Utilisateur existe dans Firestore collection `users` ou `admins`
- [ ] Test curl de l'API route retourne `found: true`
- [ ] Logs client montrent "Résultat: { found: true, ... }"

---

## 🔧 Commandes Utiles

### Tester l'API route localement

```bash
# Avec les variables d'environnement locales
curl -X POST http://localhost:3000/api/auth/check-user \
  -H "Content-Type: application/json" \
  -d '{"uid": "7748.MK.011025"}'
```

### Vérifier la configuration

```bash
# Route de débogage
curl http://localhost:3000/api/auth/check-user/debug
```

---

## 📞 Support

Si le problème persiste après avoir suivi toutes ces étapes :

1. **Collectez les logs** :
   - Logs serveur (Vercel)
   - Logs client (console navigateur)
   - Réponse de `/api/auth/check-user/debug`

2. **Vérifiez** :
   - Version de Node.js en production
   - Variables d'environnement dans Vercel
   - Configuration Firebase (projet, service account)

3. **Testez** :
   - L'API route directement avec curl
   - La connexion avec un autre utilisateur
   - La connexion en local avec les mêmes credentials
