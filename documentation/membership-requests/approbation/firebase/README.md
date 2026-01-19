# Documentation Firebase - Approbation d'une Demande d'Adhésion

> Documentation des règles Firestore, Storage et index nécessaires pour l'approbation

---

## 📋 Vue d'ensemble

Cette documentation détaille les configurations Firebase nécessaires pour la fonctionnalité d'approbation :

- **Règles Firestore** : Permissions pour les collections concernées
- **Règles Storage** : Permissions pour l'upload du PDF d'adhésion
- **Index Firestore** : Index nécessaires pour les requêtes d'approbation

---

## 📚 Documents

- **[FIRESTORE_RULES.md](./FIRESTORE_RULES.md)** : Règles Firestore pour l'approbation
- **[STORAGE_RULES.md](./STORAGE_RULES.md)** : Règles Storage pour le PDF d'adhésion
- **[FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md)** : Index Firestore nécessaires

---

## ✅ État Actuel

### Règles Firestore
- ✅ **membership-requests** : Règles existantes (mise à jour nécessaire pour `approvedBy`/`approvedAt`)
- ✅ **users** : Règles existantes (admin uniquement pour écriture)
- ✅ **subscriptions** : Règles existantes (admin uniquement pour écriture)
- ✅ **documents** : Règles existantes (admin uniquement pour écriture)
- ✅ **notifications** : Règles existantes (admin pour création)
- ✅ **companies** : Règles existantes (admin pour écriture)
- ✅ **professions** : Règles existantes (admin pour écriture)

### Règles Storage
- ✅ **membership-adhesion-pdfs** : Règles existantes (admin uniquement, PDF max 10MB)

### Index Firestore
- ✅ **membership-requests** : Index existants (vérifier si `approvedBy`/`approvedAt` nécessitent des index)
- ✅ **documents** : Index existants (memberId, type)
- ✅ **subscriptions** : Index existants (userId, dateStart)

---

## 🔧 Modifications Nécessaires

### 1. Règles Firestore
- Vérifier que les règles `membership-requests` permettent la mise à jour de `approvedBy` et `approvedAt` par les admins
- S'assurer que les règles empêchent la modification de ces champs après approbation

### 2. Index Firestore
- Ajouter index pour `approvedBy` + `approvedAt` si nécessaire pour les requêtes de filtrage
- Vérifier si des index composites sont nécessaires pour les requêtes d'approbation

---

## 📖 Références

- **Fichiers de règles** :
  - `firestore.rules` : Règles Firestore complètes
  - `storage.rules` : Règles Storage complètes
  - `firestore.indexes.json` : Index Firestore complets

- **Documentation technique** :
  - `../functions/README.md` : Cloud Function d'approbation
  - `../functions/IMPLEMENTATION.md` : Implémentation détaillée
  - `../FLUX_APPROBATION.md` : Flux complet d'approbation
