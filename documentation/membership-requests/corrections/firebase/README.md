# Firebase - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce dossier contient la documentation des règles de sécurité et des index Firebase nécessaires pour la fonctionnalité de demande de correction des demandes d'adhésion.

## 📁 Fichiers

### 1. [FIRESTORE_RULES.md](./FIRESTORE_RULES.md)
Règles de sécurité Firestore pour :
- Admin : Demander des corrections, renouveler le code
- Demandeur : Lire sa demande, soumettre les corrections

### 2. [STORAGE_RULES.md](./STORAGE_RULES.md)
Règles de sécurité Firebase Storage pour :
- Upload de photos (profil, pièce d'identité)
- Upload de documents

### 3. [FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md)
Index Firestore nécessaires pour optimiser :
- Liste des demandes en correction
- Statistiques
- Recherche avec filtres

## 🔐 Sécurité

### Principe de sécurité

La fonctionnalité utilise un **code de sécurité à 6 chiffres** pour protéger l'accès aux corrections :

1. **Génération** : Code aléatoire (1 000 000 de combinaisons)
2. **Expiration** : 48 heures après génération
3. **Usage unique** : Le code est marqué comme utilisé après la première soumission
4. **Vérification** : Côté application (code, expiration, usage)

### Accès public contrôlé

- **Lecture Firestore** : Publique mais protégée par le code de sécurité
- **Écriture Firestore** : Contrôlée par validation du code côté application
- **Storage** : Publique mais protégée par le code (impossible de deviner le `requestId`)

## 📊 Collections et champs utilisés

### Collection : `membership-requests`

**Champs liés aux corrections :**
- `status` : `'under_review'` quand corrections demandées
- `reviewNote` : Liste des corrections demandées
- `securityCode` : Code à 6 chiffres
- `securityCodeExpiry` : Date d'expiration (48h)
- `securityCodeUsed` : Indicateur d'utilisation
- `processedBy` : ID de l'admin qui a demandé les corrections

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
   - La validation principale se fait côté application (code, expiration, usage)

2. **Index obligatoires :**
   - Les index sont nécessaires pour les requêtes avec plusieurs `where()`
   - Sans index, Firestore retournera une erreur

3. **Performance :**
   - Les index améliorent significativement les performances
   - Créer les index avant de déployer en production

4. **Tests :**
   - Tester les règles avec l'émulateur Firebase
   - Vérifier que les requêtes fonctionnent avec les index

## 📚 Références

- [Documentation Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Documentation Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Diagrammes de séquence](../sequence/) : Voir les interactions détaillées
- [Diagrammes d'activité](../activite/) : Voir les workflows complets
