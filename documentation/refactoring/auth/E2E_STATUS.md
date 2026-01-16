# État des Tests E2E - Module Auth

## ✅ Problèmes Résolus

1. **Remplissage des champs du formulaire** : ✅ Résolu
   - Les champs sont maintenant correctement remplis via `evaluate()` qui cible le formulaire visible
   - Les valeurs sont correctement détectées : Matricule, Email, Password

2. **Soumission du formulaire** : ✅ Résolu
   - Le formulaire est correctement soumis
   - Les erreurs de validation sont détectées

3. **Règles Firestore** : ✅ Déployées
   - Les règles Firestore permettent maintenant la lecture publique de `users` pour la connexion
   - Déployé avec succès : `firebase deploy --only firestore:rules`

4. **Noms de collections** : ✅ Simplifiés
   - Suppression des suffixes `-dev` et `-preprod` des noms de collections
   - Chaque environnement (dev, preprod, prod) utilise sa propre base de données Firebase
   - Les collections utilisent maintenant les noms originaux : `users`, `provinces`, etc.

## ⚠️ Problème Actuel

### Erreur : "Matricule incorrect | Ce matricule n'existe pas dans notre base de données"

**État actuel** :
- ✅ Le document existe dans Firestore (`users`) avec l'ID `0001.MK.110126` (confirmé via Firebase Console)
- ✅ Les règles Firestore permettent la lecture publique de `users`
- ✅ Le code utilise `users` (même nom dans tous les environnements)
- ✅ L'utilisateur a été recréé dans la collection `users`

### Causes Possibles

1. **Configuration Firebase côté client**
   - Le projet Firebase utilisé par l'application peut être différent de celui utilisé par le script
   - Vérifier que `NEXT_PUBLIC_FIREBASE_PROJECT_ID` pointe vers le bon projet Firebase

2. **Timing**
   - Le document peut ne pas être immédiatement disponible après création
   - Solution : Attendre quelques secondes après `npm run create-dev-admin` avant de lancer les tests

3. **Cache/État de l'application**
   - L'application peut avoir mis en cache une ancienne configuration
   - Solution : Redémarrer le serveur de développement (`npm run dev`)

## 🔧 Actions à Essayer

### 1. Vérifier la configuration Firebase
```bash
# Vérifier que .env.local contient le bon projet Firebase
grep FIREBASE .env.local
```

### 2. Redémarrer le serveur de développement
```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

### 3. Recréer l'utilisateur et attendre
```bash
# Recréer l'utilisateur
npm run create-dev-admin

# Attendre 5 secondes
sleep 5

# Lancer les tests
npm run test:e2e -- e2e/auth.spec.ts --project=chromium
```

### 4. Vérifier les logs de la console
Les logs `[UserRepository.getUserByUid]` devraient apparaître dans la console du navigateur lors des tests E2E en mode `--headed`.

## 📝 Identifiants Utilisés

- **Matricule** : `0001.MK.110126`
- **Email** : `glenneriss@gmail.com`
- **Mot de passe** : `0001.MK.110126`
- **Collection Firestore** : `users` (même nom dans tous les environnements, chaque environnement a sa propre base de données)
- **Projet Firebase** : `kara-gabon-dev`

## ⚠️ Problème de Configuration Firebase

**Problème identifié** : L'application côté client et le script utilisent probablement des projets Firebase différents.

- **Script** : Crée l'utilisateur dans le projet détecté via service account (probablement `kara-gabon-dev`)
- **Application** : Utilise `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (peut être `kara-gabon` ou `kara-gabon-dev`)
- **CLI Firebase** : Projet actif = `kara-gabon` (production)

**Solution** : Vérifier que `NEXT_PUBLIC_FIREBASE_PROJECT_ID` dans `.env.local` correspond au projet où l'utilisateur est créé.

Voir `documentation/refactoring/auth/E2E_DEBUG.md` pour plus de détails.

## ✅ Tests Unitaires et d'Intégration

Tous les tests unitaires et d'intégration passent (55/55) ✅

Les tests E2E nécessitent que l'application et le script utilisent le même projet Firebase.
