# Firebase - Fonctionnalité Rejet

## 📋 Vue d'ensemble

Ce dossier contient la documentation des règles de sécurité et des index Firebase nécessaires pour la fonctionnalité de rejet d'une demande d'adhésion et les actions post-rejet.

## 📁 Fichiers

### 1. [FIRESTORE_RULES.md](./FIRESTORE_RULES.md)
Règles de sécurité Firestore pour :
- Admin : Rejeter une demande, réouvrir un dossier, supprimer un dossier
- Validation des champs de traçabilité (processedBy, processedAt, motifReject)
- Validation des champs de réouverture (reopenedBy, reopenedAt, reopenReason)

### 2. [STORAGE_RULES.md](./STORAGE_RULES.md)
Règles de sécurité Firebase Storage pour :
- Suppression de documents uploadés (photos, pièces d'identité)
- Note : La suppression Storage nécessite des privilèges admin (via Cloud Function)

### 3. [FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md)
Index Firestore nécessaires pour optimiser :
- Liste des demandes rejetées
- Statistiques des demandes rejetées
- Recherche avec filtres (status: 'rejected')
- Requêtes combinées (status + isPaid + createdAt)

## 🔐 Sécurité

### Principe de sécurité

La fonctionnalité de rejet utilise plusieurs niveaux de sécurité :

1. **Authentification** : Seuls les admins peuvent rejeter/réouvrir/supprimer
2. **Validation** : Motif de rejet obligatoire (10-500 caractères)
3. **Traçabilité** : Enregistrement obligatoire de qui/quoi/quand
4. **Suppression** : Validation par matricule (double confirmation)

### Accès admin uniquement

- **Rejet** : Admin uniquement
- **Réouverture** : Admin uniquement
- **Suppression** : Admin uniquement (Cloud Function avec privilèges admin pour Storage)

## 📊 Collections et champs utilisés

### Collection : `membership-requests`

**Champs liés au rejet :**
- `status` : `'rejected'` quand demande rejetée
- `motifReject` : Motif de rejet (obligatoire, 10-500 caractères)
- `processedBy` : ID de l'admin qui a rejeté (obligatoire pour traçabilité)
- `processedAt` : Date de rejet (obligatoire pour traçabilité)
- `updatedAt` : Date de mise à jour

**Champs liés à la réouverture :**
- `status` : `'under_review'` après réouverture
- `reopenedBy` : ID de l'admin qui a réouvert (obligatoire)
- `reopenedAt` : Date de réouverture (obligatoire)
- `reopenReason` : Motif de réouverture (obligatoire, 10-500 caractères)
- `motifReject` : Conservé pour historique (ne pas supprimer)

**Champs liés à la suppression :**
- Suppression complète du document (via Cloud Function)

### Collection : `notifications`

**Champs liés aux notifications de rejet :**
- `type` : `'membership_rejected'`, `'membership_reopened'`, `'membership_deleted'`
- `module` : `'memberships'`
- `entityId` : `requestId`
- `metadata` : Métadonnées (adminName, memberName, motifReject, etc.)

### Collection : `audit-logs` (pour suppression)

**Champs liés à l'audit :**
- `action` : `'membership_request_deleted'`
- `requestId` : ID de la demande supprimée
- `matricule` : Matricule de la demande
- `deletedBy` : ID de l'admin qui a supprimé
- `deletedAt` : Date de suppression
- `metadata` : Métadonnées de la demande avant suppression

## 🚀 Déploiement

### 1. Règles Firestore

Copier les règles dans `firestore.rules` :

```bash
# Voir FIRESTORE_RULES.md pour les règles complètes
```

### 2. Règles Storage

Copier les règles dans `storage.rules` :

```bash
# Voir STORAGE_RULES.md pour les règles complètes
```

**Note** : La suppression Storage nécessite des privilèges admin (via Cloud Function), donc les règles Storage ne sont pas modifiées.

### 3. Index Firestore

Ajouter les index dans `firestore.indexes.json` :

```bash
# Voir FIRESTORE_INDEXES.md pour la liste complète
```

### 4. Déploiement

```bash
# Déployer les règles Firestore
firebase deploy --only firestore:rules

# Déployer les règles Storage
firebase deploy --only storage

# Déployer les index
firebase deploy --only firestore:indexes
```

## ⚠️ Notes importantes

1. **Sécurité côté application :**
   - Les règles Firebase sont une couche supplémentaire
   - La validation principale se fait côté application (motif, longueur, etc.)

2. **Index obligatoires :**
   - Les index sont nécessaires pour les requêtes avec plusieurs `where()`
   - Sans index, Firestore retournera une erreur

3. **Performance :**
   - Les index améliorent significativement les performances
   - Créer les index avant de déployer en production

4. **Tests :**
   - Tester les règles avec l'émulateur Firebase
   - Vérifier que les requêtes fonctionnent avec les index

5. **Suppression définitive :**
   - La suppression Storage nécessite des privilèges admin
   - Utiliser une Cloud Function pour la suppression (voir `functions/deleteMembershipRequest.md`)

## 📚 Références

- **Règles Firestore** : `FIRESTORE_RULES.md`
- **Règles Storage** : `STORAGE_RULES.md`
- **Index Firestore** : `FIRESTORE_INDEXES.md`
- **Cloud Functions** : `../functions/README.md`
- **Flux de rejet** : `../FLUX_REJET.md`
- **Actions post-rejet** : `../ACTIONS_POST_REJET.md`
- [Documentation Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Documentation Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
