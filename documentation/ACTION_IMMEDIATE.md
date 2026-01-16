# 🚨 Action Immédiate — Configuration Firebase

> **PRIORITÉ CRITIQUE** : Finaliser la configuration Firebase avant toute continuation du développement

---

## ⚠️ Situation Actuelle

- ✅ Projets Firebase créés (dev, preprod, prod)
- ✅ Configurations récupérées
- ✅ `.firebaserc` mis à jour
- ✅ `.env.local` mis à jour avec DEV (kara-gabon-dev)
- ✅ `.env.preview` créé avec PREPROD (kara-gabon-preprod)
- ✅ Code adapté pour préfixes de collections (`src/constantes/firebase-collection-names.ts`)
- ⚠️ Service Accounts à récupérer depuis Firebase Console

---

## ✅ Actions Accomplies

### 1. Mettre à jour `.firebaserc` ✅ (FAIT)

Le fichier a été mis à jour avec les 3 projets :
- `default`: `kara-gabon-dev`
- `dev`: `kara-gabon-dev`
- `preprod`: `kara-gabon-preprod`
- `prod`: `kara-gabon`

---

### 2. Mettre à jour `.env.local` avec DEV ✅ (FAIT)

Le fichier `.env.local` a été mis à jour avec les valeurs DEV (`kara-gabon-dev`).

**⚠️ IMPORTANT** : Les valeurs de production ont été remplacées par les valeurs DEV.

**Note** : Les Service Account credentials doivent être ajoutés manuellement (voir étape 4).

---

### 3. Créer `.env.preview` avec PREPROD ✅ (FAIT)

Le fichier `.env.preview` a été créé avec les valeurs PREPROD (`kara-gabon-preprod`).

**Note** : Les Service Account credentials doivent être ajoutés manuellement (voir étape 4).

---

### 4. Adapter le code pour les préfixes de collections ✅ (FAIT)

Le fichier `src/constantes/firebase-collection-names.ts` a été modifié pour :

- ✅ Ajouter la logique de préfixes selon l'environnement :
  - `production` : pas de préfixe
  - `preprod` : suffixe `-preprod`
  - `development` : suffixe `-dev`

- ✅ Toutes les collections utilisent maintenant `createCollectionName()` qui ajoute automatiquement le préfixe

- ✅ Les exports `FIREBASE_COLLECTION_NAMES` utilisent maintenant les valeurs de `firebaseCollectionNames`

**Résultat** : Tous les repositories qui utilisent `FIREBASE_COLLECTION_NAMES` ou `firebaseCollectionNames` bénéficient automatiquement des préfixes selon l'environnement.

---

## ✅ Actions Terminées

### 4. Récupérer les Service Accounts ✅ (FAIT)

Les Service Accounts ont été récupérés et les valeurs ont été ajoutées dans :
- ✅ `.env.local` (DEV)
- ✅ `.env.preview` (PREPROD)

---

## ⚠️ Actions Restantes

### 5. Tester en local avec DEV (À FAIRE)

Pour chaque projet (DEV et PREPROD) :

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner le projet (`kara-gabon-dev` ou `kara-gabon-preprod`)
3. Aller dans **Project Settings** (⚙️ en haut à gauche)
4. Onglet **"Service accounts"**
5. Cliquer sur **"Generate new private key"**
6. Télécharger le fichier JSON
7. Ouvrir le JSON et noter :
   - `project_id`
   - `client_email`
   - `private_key` (la clé complète avec `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`)

**Action** :
- [ ] Service Account DEV récupéré
- [ ] Service Account PREPROD récupéré
- [ ] Valeurs ajoutées dans `.env.local` (DEV) - remplacer les `<à récupérer...>`
- [ ] Valeurs ajoutées dans `.env.preview` (PREPROD) - remplacer les `<à récupérer...>`

**Format dans `.env.local` et `.env.preview`** :
```bash
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kara-gabon-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
```

⚠️ **IMPORTANT** : La clé privée doit être sur une seule ligne avec `\n` pour les retours à la ligne.

---

### 5. Tester en local avec DEV (À FAIRE)

Une fois les Service Accounts ajoutés :

1. Vérifier que `.env.local` utilise bien les valeurs DEV
2. Démarrer l'application : `npm run dev`
3. Vérifier que l'application se connecte au projet DEV
4. Tester quelques fonctionnalités (login, navigation)
5. Vérifier dans Firebase Console DEV que les collections utilisent le préfixe `-dev`

**Action** :
- [ ] Application démarre sans erreur
- [ ] Connexion au projet DEV confirmée
- [ ] Collections avec préfixe `-dev` créées/consultées (vérifier dans Firebase Console)

---

## 📋 Checklist Complète

- [x] `.firebaserc` mis à jour
- [x] `.env.local` mis à jour avec DEV (kara-gabon-dev)
- [x] `.env.preview` créé avec PREPROD (kara-gabon-preprod)
- [x] Code adapté pour préfixes de collections
- [x] Service Account DEV récupéré et ajouté dans `.env.local`
- [x] Service Account PREPROD récupéré et ajouté dans `.env.preview`
- [ ] Tests locaux avec DEV OK

---

## ⏱️ Durée Estimée

- ✅ Étapes 1-3 : Terminé
- ✅ Étape 4 (Code préfixes) : Terminé
- ⏳ Étape 5 (Service Accounts) : 10-15 minutes
- ⏳ Étape 6 (Tests) : 30 minutes

**Total restant** : ~45 minutes

---

## 🔗 Références

- `documentation/FIREBASE_CONFIGURATIONS.md` : Toutes les configurations
- `documentation/FIREBASE_MIGRATION_URGENTE.md` : Guide complet
- `documentation/FIREBASE_MULTI_ENVIRONNEMENT.md` : Section 2 pour les préfixes
- `src/constantes/firebase-collection-names.ts` : Code des préfixes

---

## ✅ Après cette étape

Une fois la configuration Firebase finalisée :

1. ✅ Environnements sécurisés
2. ✅ Plus de risque de polluer la production
3. ✅ Base solide pour continuer
4. ✅ Suivre `NEXT_STEPS.md` pour les prochaines étapes (diagrammes UML, migration)

---

## 📝 Notes Techniques

### Comment fonctionnent les préfixes

Le fichier `src/constantes/firebase-collection-names.ts` utilise `process.env.NEXT_PUBLIC_APP_ENV` pour déterminer le préfixe :

- `development` → `-dev` (ex: `members-dev`)
- `preprod` → `-preprod` (ex: `members-preprod`)
- `production` → pas de préfixe (ex: `members`)

Tous les repositories qui importent `FIREBASE_COLLECTION_NAMES` ou `firebaseCollectionNames` bénéficient automatiquement de cette logique.

### Collections affectées

Toutes les collections listées dans `firebaseCollectionNames` bénéficient des préfixes :
- Membership (members, membership-requests, users, groups, etc.)
- Caisse Spéciale (caisseContracts, caisseSpecialeDemands, etc.)
- Caisse Imprévue (contractsCI, subscriptionsCI, etc.)
- Crédit Spéciale (creditDemands, creditContracts, etc.)
- Placement (placements, placementDemands)
- Géographie (provinces, departments, communes, districts, quarters)
- Documents, Notifications, Settings, etc.
