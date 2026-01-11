# ✅ Checklist de Configuration Firebase — Setup Rapide

> Checklist rapide pour configurer les projets Firebase après leur création

---

## 🎯 Projets à Créer

- [ ] **DEV** : `kara-mutuelle-dev`
- [ ] **PREPROD** : `kara-mutuelle-preprod`
- [ ] **PROD** : Garder `kara-gabon` (existant)

---

## 📝 Pour Chaque Projet (DEV et PREPROD)

### 1. Création du Projet

- [ ] Aller sur [Firebase Console](https://console.firebase.google.com/)
- [ ] Cliquer sur "Add project"
- [ ] Entrer le nom : `kara-mutuelle-dev` ou `kara-mutuelle-preprod`
- [ ] Activer Google Analytics (optionnel)
- [ ] Créer le projet

### 2. Activer les Services

Pour chaque projet (DEV et PREPROD) :

- [ ] **Authentication**
  - Aller dans "Authentication" > "Get started"
  - Activer "Email/Password"
  - Activer "Phone" (si nécessaire)

- [ ] **Firestore Database**
  - Aller dans "Firestore Database" > "Create database"
  - Choisir "Start in production mode"
  - Choisir une région (ex: `europe-west1`)
  - Créer la base

- [ ] **Storage**
  - Aller dans "Storage" > "Get started"
  - Choisir "Start in production mode"
  - Choisir la même région que Firestore
  - Créer le bucket

- [ ] **Cloud Functions** (optionnel pour l'instant)
  - Aller dans "Functions"
  - Activer (Blaze plan requis pour prod, Spark OK pour dev/preprod)

### 3. Récupérer la Configuration

Pour chaque projet :

1. Aller dans **Project Settings** (icône ⚙️ en haut à gauche)
2. Section **"Your apps"**
3. Cliquer sur l'icône Web (`</>`)
4. Donner un nom : `kara-web`
5. Ne pas cocher "Also set up Firebase Hosting"
6. Cliquer sur "Register app"
7. **Copier la configuration** :

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "kara-mutuelle-dev.firebaseapp.com",
  projectId: "kara-mutuelle-dev",
  storageBucket: "kara-mutuelle-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 4. Récupérer Service Account (pour Functions/Admin SDK)

Pour chaque projet :

1. Aller dans **Project Settings**
2. Onglet **"Service accounts"**
3. Cliquer sur "Generate new private key"
4. Télécharger le fichier JSON
5. Noter :
   - `project_id`
   - `client_email`
   - `private_key`

---

## 📋 Informations à Noter

### Projet DEV (`kara-mutuelle-dev`)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=kara-mutuelle-dev
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### Projet PREPROD (`kara-mutuelle-preprod`)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-mutuelle-preprod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=kara-mutuelle-preprod
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### Projet PROD (`kara-gabon` - existant)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kara-gabon
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=kara-gabon
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

---

## ⚡ Actions Après Création

Une fois les projets créés et les configurations récupérées :

1. **Mettre à jour `.firebaserc`** (voir étape suivante)
2. **Mettre à jour `.env.local`** avec les valeurs DEV
3. **Créer `.env.preview`** avec les valeurs PREPROD
4. **Tester en local** avec le projet DEV

---

## 📚 Guides Complets

- `FIREBASE_MIGRATION_URGENTE.md` : Guide complet de migration
- `FIREBASE_MULTI_ENVIRONNEMENT.md` : Configuration multi-environnement
- `WORKFLOW.md` : Section INIT-2 et INIT-3
