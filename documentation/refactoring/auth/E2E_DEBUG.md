# Debug Tests E2E - Module Auth

## Problème Actuel

Les tests E2E échouent avec l'erreur : "Matricule incorrect | Ce matricule n'existe pas dans notre base de données"

## État des Configurations

### Script `create-dev-admin-user.ts`
- ✅ Crée l'utilisateur dans le projet Firebase détecté via service account
- ✅ Collection utilisée : `users` (sans suffixe)
- ✅ Utilisateur créé avec succès : `0001.MK.110126`

### Application Côté Client
- Utilise `NEXT_PUBLIC_FIREBASE_PROJECT_ID` pour se connecter à Firebase
- Collection utilisée : `users` (via `firebaseCollectionNames.users`)

### Projet Firebase Actif (CLI)
- Projet actif : `kara-gabon` (production)

## Problème Identifié

**Hypothèse** : L'application côté client utilise un projet Firebase différent de celui où l'utilisateur a été créé.

- Le script crée l'utilisateur dans le projet détecté via service account (probablement `kara-gabon-dev`)
- L'application côté client utilise `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (peut être `kara-gabon` ou `kara-gabon-dev`)
- Si les deux projets sont différents, l'utilisateur ne sera pas trouvé

## Solutions à Vérifier

### 1. Vérifier la Configuration Firebase Côté Client

Vérifier dans `.env.local` (ou variables d'environnement) :
```bash
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-gabon-dev  # Doit correspondre au projet où l'utilisateur est créé
```

### 2. Vérifier le Projet Utilisé par le Script

Le script utilise :
- Variables d'environnement : `FIREBASE_PROJECT_ID`
- Ou fichier service account dans `service-accounts/` contenant "kara-gabon-dev"

### 3. Créer l'Utilisateur dans le Bon Projet

Si l'application utilise `kara-gabon` (production), créer l'utilisateur dans ce projet :
```bash
# Changer le projet Firebase actif
firebase use kara-gabon

# Ou créer l'utilisateur dans kara-gabon-dev
firebase use kara-gabon-dev
npm run create-dev-admin
```

### 4. Vérifier les Règles Firestore

Les règles Firestore doivent être déployées dans le même projet que celui utilisé par l'application :
```bash
firebase deploy --only firestore:rules
```

## Actions Recommandées

1. **Vérifier quel projet Firebase est utilisé par l'application** :
   - Regarder les variables d'environnement `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - Vérifier dans la console du navigateur lors des tests E2E

2. **Créer l'utilisateur dans le même projet** :
   - Utiliser `firebase use <project-id>` pour sélectionner le bon projet
   - Relancer `npm run create-dev-admin`

3. **Vérifier que les règles Firestore sont déployées dans le bon projet** :
   - `firebase deploy --only firestore:rules`

## Logs de Débogage

Les logs suivants ont été ajoutés pour déboguer :
- `[UserRepository.getUserByUid]` : Affiche la collection et l'UID recherchés
- `[UserRepository.userExists]` : Affiche le résultat de la vérification

Ces logs apparaissent dans la console du navigateur lors des tests E2E.
