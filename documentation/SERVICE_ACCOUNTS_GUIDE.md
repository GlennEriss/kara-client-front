# 🔑 Guide de Récupération des Service Accounts

> Instructions pour récupérer les Service Accounts Firebase pour DEV et PREPROD

---

## 📋 Projets Concernés

Vous devez récupérer les Service Accounts pour **2 projets** :

1. ✅ **DEV** : `kara-gabon-dev`
2. ✅ **PREPROD** : `kara-gabon-preprod`

❌ **PROD** : Pas besoin, il est déjà configuré (c'était l'ancien `.env.local`)

---

## 🎯 Étape 1 : Récupérer le Service Account DEV (`kara-gabon-dev`)

### Instructions

1. **Aller sur Firebase Console** : https://console.firebase.google.com/

2. **Sélectionner le projet DEV** :
   - Cliquer sur le sélecteur de projet en haut à gauche
   - Chercher et sélectionner : **`kara-gabon-dev`**

3. **Accéder aux Service Accounts** :
   - Cliquer sur l'icône **⚙️ (Settings)** en haut à gauche
   - Sélectionner **"Project settings"**
   - Aller dans l'onglet **"Service accounts"**

4. **Générer la clé privée** :
   - Dans la section **"Firebase Admin SDK"**
   - Cliquer sur le bouton **"Generate new private key"**
   - ⚠️ Une alerte de sécurité s'affichera, cliquer sur **"Generate key"**
   - Le fichier JSON sera téléchargé automatiquement (nom: `kara-gabon-dev-xxxxx.json`)

5. **Sauvegarder le fichier JSON** :
   - Déplacer le fichier JSON téléchargé dans le dossier `service-accounts/`
   - Renommer-le en `kara-gabon-dev-service-account.json` (optionnel, pour plus de clarté)
   - ⚠️ Ce dossier est dans `.gitignore`, les fichiers JSON ne seront jamais commités

6. **Extraire les informations** :
   - Ouvrir le fichier JSON dans `service-accounts/kara-gabon-dev-service-account.json`
   - Noter les 3 valeurs suivantes :
     - `project_id` → `kara-gabon-dev`
     - `client_email` → Ex: `firebase-adminsdk-xxxxx@kara-gabon-dev.iam.gserviceaccount.com`
     - `private_key` → La clé complète (commence par `-----BEGIN PRIVATE KEY-----`)

7. **Ajouter dans `.env.local`** :
   - Ouvrir le fichier `.env.local`
   - Remplacer les lignes :
     ```bash
     FIREBASE_CLIENT_EMAIL=<à récupérer depuis Service Account kara-gabon-dev>
     FIREBASE_PRIVATE_KEY=<à récupérer depuis Service Account kara-gabon-dev>
     ```
   - Par :
     ```bash
     FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kara-gabon-dev.iam.gserviceaccount.com
     FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
     ```

   ⚠️ **IMPORTANT** : 
   - La `private_key` doit être sur **une seule ligne**
   - Les retours à la ligne dans la clé doivent être remplacés par `\n`
   - Garder les `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`

---

## 🎯 Étape 2 : Récupérer le Service Account PREPROD (`kara-gabon-preprod`)

### Instructions

1. **Retourner sur Firebase Console** : https://console.firebase.google.com/

2. **Sélectionner le projet PREPROD** :
   - Cliquer sur le sélecteur de projet en haut à gauche
   - Chercher et sélectionner : **`kara-gabon-preprod`**

3. **Accéder aux Service Accounts** :
   - Cliquer sur l'icône **⚙️ (Settings)** en haut à gauche
   - Sélectionner **"Project settings"**
   - Aller dans l'onglet **"Service accounts"**

4. **Générer la clé privée** :
   - Dans la section **"Firebase Admin SDK"**
   - Cliquer sur le bouton **"Generate new private key"**
   - ⚠️ Une alerte de sécurité s'affichera, cliquer sur **"Generate key"**
   - Le fichier JSON sera téléchargé automatiquement (nom: `kara-gabon-preprod-xxxxx.json`)

5. **Sauvegarder le fichier JSON** :
   - Déplacer le fichier JSON téléchargé dans le dossier `service-accounts/`
   - Renommer-le en `kara-gabon-preprod-service-account.json` (optionnel, pour plus de clarté)
   - ⚠️ Ce dossier est dans `.gitignore`, les fichiers JSON ne seront jamais commités

6. **Extraire les informations** :
   - Ouvrir le fichier JSON dans `service-accounts/kara-gabon-preprod-service-account.json`
   - Noter les 3 valeurs suivantes :
     - `project_id` → `kara-gabon-preprod`
     - `client_email` → Ex: `firebase-adminsdk-xxxxx@kara-gabon-preprod.iam.gserviceaccount.com`
     - `private_key` → La clé complète (commence par `-----BEGIN PRIVATE KEY-----`)

7. **Ajouter dans `.env.preview`** :
   - Ouvrir le fichier `.env.preview`
   - Remplacer les lignes :
     ```bash
     FIREBASE_CLIENT_EMAIL=<à récupérer depuis Service Account kara-gabon-preprod>
     FIREBASE_PRIVATE_KEY=<à récupérer depuis Service Account kara-gabon-preprod>
     ```
   - Par :
     ```bash
     FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kara-gabon-preprod.iam.gserviceaccount.com
     FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
     ```

   ⚠️ **IMPORTANT** : 
   - La `private_key` doit être sur **une seule ligne**
   - Les retours à la ligne dans la clé doivent être remplacés par `\n`
   - Garder les `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`

---

## 📝 Format des Fichiers JSON

Le fichier JSON téléchargé ressemble à ceci :

```json
{
  "type": "service_account",
  "project_id": "kara-gabon-dev",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@kara-gabon-dev.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40kara-gabon-dev.iam.gserviceaccount.com"
}
```

Vous devez extraire :
- `project_id` (pour vérification)
- `client_email` (à copier tel quel)
- `private_key` (à copier en remplaçant les vrais `\n` par `\n` littéral dans le fichier `.env`)

---

## ⚠️ Sécurité

**IMPORTANT** :
- ❌ Ne jamais commiter les fichiers `.env.local` et `.env.preview`
- ❌ Ne jamais commiter les fichiers JSON des Service Accounts
- ❌ Ne jamais partager les clés privées
- ✅ Le dossier `service-accounts/` est dans `.gitignore`, les fichiers JSON ne seront jamais commités
- ✅ Les fichiers JSON peuvent être conservés dans `service-accounts/` pour référence locale (déjà protégés par `.gitignore`)

---

## ✅ Checklist

- [ ] Service Account DEV (`kara-gabon-dev`) récupéré
- [ ] Fichier JSON DEV sauvegardé dans `service-accounts/`
- [ ] `FIREBASE_CLIENT_EMAIL` DEV ajouté dans `.env.local`
- [ ] `FIREBASE_PRIVATE_KEY` DEV ajouté dans `.env.local`
- [ ] Service Account PREPROD (`kara-gabon-preprod`) récupéré
- [ ] Fichier JSON PREPROD sauvegardé dans `service-accounts/`
- [ ] `FIREBASE_CLIENT_EMAIL` PREPROD ajouté dans `.env.preview`
- [ ] `FIREBASE_PRIVATE_KEY` PREPROD ajouté dans `.env.preview`

---

## 🔗 Références

- `documentation/FIREBASE_CONFIGURATIONS.md` : Toutes les configurations Firebase
- `documentation/ACTION_IMMEDIATE.md` : Guide complet d'action immédiate
- Firebase Console : https://console.firebase.google.com/
