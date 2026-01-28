# Guide de Déploiement - Configuration Firebase V2

> Guide complet pour déployer les index, règles Firestore et règles Storage pour le module Demandes Caisse Imprévue V2

## 📋 Checklist de Déploiement

### Avant le Déploiement

- [ ] Vérifier que tous les index sont définis dans `firestore.indexes.json`
- [ ] Vérifier que les règles Firestore sont complètes dans `firestore.rules`
- [ ] Vérifier que les règles Storage sont complètes dans `storage.rules`
- [ ] Tester localement avec les émulateurs Firebase
- [ ] Vérifier les permissions admin dans Firebase Console

---

## 🔍 Étape 1 : Vérifier les Index Existants

### Vérifier dans firestore.indexes.json

```bash
# Vérifier les index existants
cat firestore.indexes.json | grep -A 10 "caisseImprevueDemands"
```

### Index Déjà Présents

✅ Les index suivants sont déjà présents :
- Statut + Date (ligne 926-937)
- Statut + Fréquence + Date (ligne 940-969)
- Membre + Date (ligne 972-983)
- Forfait + Date (ligne 986-997)
- Décideur + Date (ligne 999-1011)
- Fréquence + Date (ligne 940-951)

### Index à Ajouter

❌ Les index suivants doivent être ajoutés :

1. **Tri alphabétique** (nom + prénom)
2. **Recherche avec statut** (statut + nom + date)
3. **Priority** (optionnel, si on ajoute le champ priority)

---

## 📝 Étape 2 : Ajouter les Index Manquants

### Modifier firestore.indexes.json

Ajouter les index suivants dans le tableau `indexes` :

```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "memberLastName", "order": "ASCENDING" },
    { "fieldPath": "memberFirstName", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "memberLastName", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Optionnel** (si on ajoute le champ `priority`) :
```json
{
  "collectionGroup": "caisseImprevueDemands",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "priority", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 🔒 Étape 3 : Mettre à Jour les Règles Firestore

### Vérifier les Règles Existantes

```bash
# Vérifier les règles caisseImprevueDemands
grep -A 70 "caisseImprevueDemands" firestore.rules
```

### Améliorations à Apporter

Les règles existantes doivent être **améliorées** pour V2 :

1. ✅ **Ajouter validation `cause`** (motif) : min 10, max 500 caractères
2. ✅ **Ajouter validation `emergencyContact`** : Tous les champs obligatoires
3. ✅ **Améliorer transitions de statut** : Ajouter REOPENED et CONVERTED
4. ✅ **Ajouter restriction suppression** : Seulement REJECTED

### Code à Ajouter/Modifier

Voir `FIRESTORE_RULES.md` pour les règles complètes.

---

## 📦 Étape 4 : Ajouter les Règles Storage

### Vérifier les Règles Existantes

```bash
# Vérifier les règles storage
cat storage.rules | grep -A 20 "caisse-imprevue"
```

### Ajouter les Règles

Si les règles n'existent pas, ajouter dans `storage.rules` :

```javascript
// ============================================
// CAISSE IMPRÉVUE - DOCUMENTS CONTACTS D'URGENCE
// ============================================
match /caisse-imprevue-documents/{demandId}/{contactId}/{fileName} {
  function isValidImage() {
    return request.resource.contentType.matches('image/(jpeg|jpg|png|webp)');
  }
  
  function isValidSize() {
    return request.resource.size < 5 * 1024 * 1024; // 5 MB
  }
  
  function isValidFileName() {
    return fileName.matches('^document-photo\\.(jpg|jpeg|png|webp)$');
  }
  
  allow read: if true;
  allow write: if isValidImage() && isValidSize() && isValidFileName();
  allow delete: if true;
}
```

---

## 🧪 Étape 5 : Tester Localement

### Démarrer les Émulateurs

```bash
# Démarrer tous les émulateurs
firebase emulators:start

# Ou seulement Firestore et Storage
firebase emulators:start --only firestore,storage
```

### Tester les Règles Firestore

```bash
# Utiliser les tests unitaires (si disponibles)
npm run test:firestore-rules

# Ou tester manuellement via l'UI des émulateurs
# http://localhost:4000
```

### Tester les Règles Storage

```bash
# Tester l'upload d'une image
# Via l'application ou via un script de test
```

---

## 🚀 Étape 6 : Déployer en Préprod

### Déployer les Index

```bash
# Déployer uniquement les index
firebase deploy --only firestore:indexes --project <preprod-project-id>
```

**Temps d'attente** : 2-15 minutes selon le nombre d'index et la quantité de données.

### Déployer les Règles Firestore

```bash
# Déployer uniquement les règles Firestore
firebase deploy --only firestore:rules --project <preprod-project-id>
```

### Déployer les Règles Storage

```bash
# Déployer uniquement les règles Storage
firebase deploy --only storage --project <preprod-project-id>
```

### Déployer Tout

```bash
# Déployer index + règles Firestore + règles Storage
firebase deploy --only firestore,storage --project <preprod-project-id>
```

---

## ✅ Étape 7 : Vérifier le Déploiement

### Vérifier les Index

1. Accéder à Firebase Console → Firestore → Indexes
2. Vérifier que tous les index sont en statut "Enabled"
3. Si un index est en "Building", attendre la fin de la création

### Vérifier les Règles Firestore

1. Accéder à Firebase Console → Firestore → Règles
2. Vérifier que les règles sont bien déployées
3. Tester la création d'une demande via l'application

### Vérifier les Règles Storage

1. Accéder à Firebase Console → Storage → Règles
2. Vérifier que les règles sont bien déployées
3. Tester l'upload d'une photo de document via l'application

---

## 🚀 Étape 8 : Déployer en Production

### Checklist Avant Production

- [ ] Tous les tests passent en préprod
- [ ] Aucune erreur dans les logs Firebase
- [ ] Les index sont tous "Enabled"
- [ ] Les règles fonctionnent correctement
- [ ] Validation manuelle des fonctionnalités

### Déploiement

```bash
# Déployer en production
firebase deploy --only firestore,storage --project <prod-project-id>
```

### Vérification Post-Déploiement

- [ ] Vérifier que l'application fonctionne correctement
- [ ] Tester la création d'une demande
- [ ] Tester l'upload d'une photo de document
- [ ] Vérifier les logs pour les erreurs

---

## 🔄 Rollback (Si Nécessaire)

### Rollback des Index

Les index ne peuvent pas être "rollbackés" directement. Si un index pose problème :
1. Supprimer l'index dans Firebase Console
2. Attendre la suppression
3. Recréer l'index correct

### Rollback des Règles

```bash
# Restaurer depuis Git
git checkout HEAD~1 firestore.rules storage.rules

# Redéployer
firebase deploy --only firestore:rules,storage --project <project-id>
```

---

## 📊 Monitoring Post-Déploiement

### Métriques à Surveiller

1. **Erreurs Firestore** : Vérifier les logs pour les erreurs de permissions
2. **Erreurs Storage** : Vérifier les logs pour les erreurs d'upload
3. **Performance** : Vérifier que les requêtes sont rapides
4. **Coûts** : Surveiller l'utilisation de Firestore et Storage

### Logs à Consulter

- Firebase Console → Firestore → Usage
- Firebase Console → Storage → Usage
- Firebase Console → Logs

---

## ⚠️ Points d'Attention

### Index

- **Temps de création** : Les index peuvent prendre plusieurs minutes
- **Coûts** : Chaque index a un coût de stockage
- **Ordre des champs** : L'ordre doit correspondre exactement à la requête

### Règles

- **Validation stricte** : Toutes les règles doivent valider les données
- **Permissions** : Seuls les admins peuvent créer/modifier/supprimer
- **Transitions de statut** : Seules les transitions logiques sont autorisées

### Storage

- **Taille maximale** : 5 MB pour les images
- **Types de fichiers** : Images uniquement (jpeg, jpg, png, webp)
- **Sécurité** : Double validation (Storage + Application)

---

## 📚 Commandes Utiles

### Vérifier l'État des Index

```bash
# Lister les index
firebase firestore:indexes

# Vérifier les index en cours de création
firebase firestore:indexes --project <project-id>
```

### Tester les Règles

```bash
# Démarrer les émulateurs
firebase emulators:start --only firestore,storage

# Tester avec les tests
npm run test:firestore-rules
npm run test:storage-rules
```

### Déployer

```bash
# Déployer tout
firebase deploy --only firestore,storage

# Déployer uniquement les index
firebase deploy --only firestore:indexes

# Déployer uniquement les règles
firebase deploy --only firestore:rules,storage
```

---

## 🆘 Dépannage

### Erreur : "The query requires an index"

**Solution** :
1. Cliquer sur l'URL fournie dans l'erreur
2. Firebase Console s'ouvre avec l'index pré-rempli
3. Cliquer sur "Créer l'index"
4. Attendre la création (quelques minutes)

### Erreur : "Permission denied"

**Solution** :
1. Vérifier que l'utilisateur est authentifié
2. Vérifier que l'utilisateur a le rôle admin
3. Vérifier les règles Firestore/Storage
4. Vérifier les logs Firebase pour plus de détails

### Erreur : "File too large"

**Solution** :
1. Vérifier que le fichier fait moins de 5 MB
2. Compresser l'image avant upload
3. Vérifier les règles Storage

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior Dev
