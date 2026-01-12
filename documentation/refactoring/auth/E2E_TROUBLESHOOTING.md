# Dépannage des Tests E2E - Module Auth

## ✅ Problèmes Résolus

1. **Remplissage des champs du formulaire** : ✅ Résolu
   - Les champs sont maintenant correctement remplis via `evaluate()` qui cible le formulaire visible
   - Les valeurs sont correctement détectées : Matricule, Email, Password

2. **Soumission du formulaire** : ✅ Résolu
   - Le formulaire est correctement soumis
   - Les erreurs de validation sont détectées

## ⚠️ Problème Actuel

### Erreur : "Matricule incorrect | Ce matricule n'existe pas dans notre base de données"

**Cause probable** : L'utilisateur existe dans Firestore (`users`) mais n'est pas trouvé par `UserRepository.userExists()`.

### Vérifications à faire

1. **Collection Firestore**
   - Le script crée l'utilisateur dans `users`
   - Le code doit chercher dans `users`
   - Note: Chaque environnement (dev, preprod, prod) utilise sa propre base de données Firebase, donc les noms de collections sont identiques dans tous les environnements

2. **Configuration Firebase**
   - Vérifier que le projet Firebase utilisé par les tests E2E est le même que celui du script
   - Vérifier les règles Firestore (doivent permettre la lecture publique pour la connexion)

## 🔧 Solutions à Essayer

### 1. Vérifier la variable d'environnement
```bash
# Dans .env.local
NEXT_PUBLIC_APP_ENV=development
```

### 2. Vérifier que l'utilisateur existe dans Firestore
- Aller dans la console Firebase
- Vérifier la collection `users-dev`
- Vérifier que le document avec l'ID `0001.MK.110126` existe

### 3. Vérifier les règles Firestore
Les règles doivent permettre la lecture publique pour la connexion :
```javascript
match /users/{userId} {
  allow read: if true; // Permettre la lecture publique pour la connexion
  allow write: if isAdmin();
}
```

### 4. Ajouter des logs de débogage
Ajouter des `console.log` dans `UserRepository.userExists()` pour voir ce qui se passe.

## 📝 Identifiants Utilisés

- **Matricule** : `0001.MK.110126`
- **Email** : `glenneriss@gmail.com`
- **Mot de passe** : `0001.MK.110126`
- **Collection Firestore** : `users` (même nom dans tous les environnements)

## ✅ Tests Unitaires et d'Intégration

Tous les tests unitaires et d'intégration passent (55/55) ✅

Les tests E2E nécessitent une configuration Firebase correcte pour fonctionner.
