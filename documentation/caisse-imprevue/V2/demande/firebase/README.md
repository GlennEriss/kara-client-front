# Documentation Firebase - Module Demandes Caisse Imprévue V2

> Documentation complète des configurations Firebase nécessaires pour le module Demandes Caisse Imprévue V2

## 📋 Table des matières

1. [Index Firestore](#index-firestore)
2. [Règles Firestore](#règles-firestore)
3. [Règles Storage](#règles-storage)
4. [Déploiement](#déploiement)

## 📁 Fichiers de Documentation

- **README.md** : Ce fichier (vue d'ensemble)
- **INDEXES.md** : Tous les index Firestore nécessaires pour les requêtes
- **FIRESTORE_RULES.md** : Règles de sécurité Firestore pour les collections
- **STORAGE_RULES.md** : Règles de sécurité Storage pour les fichiers
- **DEPLOYMENT.md** : Guide de déploiement étape par étape

## 🎯 Collections Concernées

### Firestore
- `caisseImprevueDemands` : Demandes de contrats Caisse Imprévue
- `contractsCI` : Contrats Caisse Imprévue créés depuis les demandes
- `subscriptionsCI` : Forfaits Caisse Imprévue (lecture)

### Storage
- `caisse-imprevue-documents/` : Documents d'identité des contacts d'urgence
- `caisse-imprevue-photos/` : Photos des documents d'identité

## ⚠️ Points d'Attention

### Index Firestore
- **Création automatique** : Firestore propose de créer les index manquants, mais il est préférable de les définir explicitement
- **Temps de création** : Les index peuvent prendre plusieurs minutes à être créés
- **Coûts** : Chaque index a un coût de stockage et de maintenance

### Règles Firestore
- **Validation stricte** : Toutes les règles doivent valider les données
- **Permissions** : Seuls les admins peuvent créer/modifier/supprimer
- **Lecture** : Les admins et utilisateurs authentifiés peuvent lire

### Règles Storage
- **Taille maximale** : 5 MB pour les images, 10 MB pour les PDFs
- **Types de fichiers** : Images (jpeg, jpg, png, webp) et PDFs uniquement
- **Sécurité** : Upload public avec validation, lecture publique

## 🚀 Déploiement

Voir les sections dédiées dans chaque fichier pour les instructions de déploiement.

---

**Date de création** : 2026-01-27  
**Version** : V2  
**Auteur** : Senior Dev
