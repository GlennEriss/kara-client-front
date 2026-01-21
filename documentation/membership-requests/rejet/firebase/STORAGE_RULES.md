# Règles Storage - Fonctionnalité Rejet

## 📋 Vue d'ensemble

Ce document définit les règles de sécurité Firebase Storage pour la fonctionnalité de rejet d'une demande d'adhésion et les actions post-rejet.

---

## 🔐 Principe de Sécurité

### Suppression de Documents Storage

**Important** : La suppression de documents Storage nécessite des **privilèges admin** qui ne sont pas disponibles côté client. Par conséquent :

1. **Suppression Storage** : Doit être effectuée via **Cloud Function** (`deleteMembershipRequest`)
2. **Règles Storage** : Ne nécessitent pas de modification (la suppression se fait via Admin SDK dans Cloud Function)
3. **Lecture/Upload** : Les règles existantes suffisent

---

## 📊 Fichiers Concernés

### Documents Uploadés

Les fichiers suivants peuvent être supprimés lors de la suppression d'un dossier rejeté :

1. **Photo de profil** : `membership-photos/{userId}/{photoId}`
2. **Photo recto pièce d'identité** : `membership-documents/{userId}/document-front.jpg`
3. **Photo verso pièce d'identité** : `membership-documents/{userId}/document-back.jpg`

**Note** : Ces fichiers ne sont **pas automatiquement supprimés** lors du rejet (conforme aux règles métier pour l'audit). Ils peuvent être supprimés lors de la **suppression définitive** du dossier.

---

## 🔒 Règles Storage Actuelles

### État Actuel

Les règles Storage existantes permettent déjà :
- ✅ **Lecture** : Publique ou authentifiée (selon configuration)
- ✅ **Upload** : Authentifiée (lors de la création/soumission de la demande)
- ✅ **Suppression** : Admin uniquement (mais via Admin SDK, pas via règles client)

### Règles Recommandées

**Aucune modification nécessaire** car :
- La suppression Storage se fait via **Cloud Function** avec privilèges admin
- Les règles Storage ne gèrent pas les suppressions via Admin SDK
- La lecture/upload continue de fonctionner normalement

---

## 🗑️ Suppression via Cloud Function

### Privilèges Admin

La suppression Storage nécessite des privilèges admin qui sont disponibles uniquement dans les **Cloud Functions** via l'**Admin SDK**.

### Implémentation

**Fichier** : `functions/src/membership-requests/deleteMembershipRequest.ts`

```typescript
import { getStorage } from 'firebase-admin/storage'

const storage = getStorage()
const bucket = storage.bucket()

// Supprimer un fichier
const file = bucket.file(filePath)
const [exists] = await file.exists()

if (exists) {
  await file.delete()
  console.log(`Fichier Storage supprimé: ${filePath}`)
}
```

**Avantages** :
- ✅ Privilèges admin natifs
- ✅ Pas besoin de règles Storage complexes
- ✅ Sécurité garantie (code serveur)
- ✅ Logging d'audit possible

---

## 📋 Chemin des Fichiers

### Structure des Chemins

Les fichiers sont stockés selon la structure suivante :

```
membership-photos/
  {userId}/
    {photoId}.jpg

membership-documents/
  {userId}/
    document-front.jpg
    document-back.jpg
```

### Récupération des Chemins

Les chemins sont stockés dans le document Firestore :

```typescript
{
  identity: {
    photo: string | null  // Chemin Storage pour la photo de profil
  },
  documents: {
    documentPhotoFront: string | null  // Chemin Storage pour photo recto
    documentPhotoBack: string | null   // Chemin Storage pour photo verso
  }
}
```

### Suppression lors de la Suppression du Dossier

Lors de la suppression définitive d'un dossier rejeté, la Cloud Function `deleteMembershipRequest` :

1. Récupère les chemins depuis le document Firestore
2. Supprime les fichiers Storage correspondants
3. Supprime le document Firestore

---

## 🔒 Sécurité

### Protection contre Suppression Accidentelle

1. **Double confirmation** : Validation par matricule obligatoire
2. **Cloud Function** : Suppression via code serveur (non bypassable côté client)
3. **Log d'audit** : Enregistrement de toutes les suppressions

### Accès aux Fichiers

- **Lecture** : Protégée par les règles Storage existantes
- **Upload** : Protégée par les règles Storage existantes
- **Suppression** : Uniquement via Cloud Function (privilèges admin)

---

## 📝 Notes Importantes

1. **Pas de modification nécessaire** : Les règles Storage existantes suffisent car la suppression se fait via Cloud Function.

2. **Documents conservés lors du rejet** : Les documents uploadés ne sont **pas supprimés** lors du rejet (conforme aux règles métier pour l'audit).

3. **Suppression définitive** : Les documents peuvent être supprimés lors de la **suppression définitive** du dossier via Cloud Function.

4. **Libération d'espace** : La suppression des documents Storage libère l'espace Storage, mais peut aussi être conservée pour l'audit (selon règles métier).

---

## 📚 Références

- **Cloud Function Suppression** : `../functions/deleteMembershipRequest.md`
- **Actions Post-Rejet** : `../ACTIONS_POST_REJET.md`
- **Flux de rejet** : `../FLUX_REJET.md`
- [Documentation Firebase Storage Admin SDK](https://firebase.google.com/docs/storage/admin/start)
- [Documentation Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)
