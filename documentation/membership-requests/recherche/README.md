# Recherche - Membership Requests

## 📚 Documentation

Ce dossier contient toute la documentation relative à la fonctionnalité de recherche dans les demandes d'adhésion.

### Documents Disponibles

1. **[ANALYSE_RECHERCHE.md](./ANALYSE_RECHERCHE.md)**
   - Analyse de l'état actuel
   - Limitations de Firestore
   - Solutions possibles (searchableText, Algolia, etc.)
   - Comparaison des approches
   - Recommandations

2. **[ARCHITECTURE_RECHERCHE.md](./ARCHITECTURE_RECHERCHE.md)**
   - Architecture proposée (Clean Architecture)
   - Structure des fichiers
   - Interfaces et contrats
   - Flux de recherche
   - Tests

3. **[IMPLEMENTATION_ALGOLIA.md](./IMPLEMENTATION_ALGOLIA.md)**
   - Plan d'implémentation Algolia complet
   - Code source détaillé
   - Cloud Functions de synchronisation
   - Migration des données existantes
   - Tests

4. **[ALGOLIA_SETUP.md](./ALGOLIA_SETUP.md)**
   - Guide pas à pas de configuration Algolia
   - Création du compte et récupération des clés
   - Configuration de l'index
   - Tests de validation

5. **[MULTI_ENVIRONNEMENTS_ALGOLIA.md](./MULTI_ENVIRONNEMENTS_ALGOLIA.md)**
   - Gestion des 3 environnements (dev, preprod, prod)
   - Configuration des index séparés
   - Variables d'environnement par projet
   - Scripts de migration par environnement
   - Sécurité et isolation

6. **[SEARCHABLETEXT_ALGOLIA.md](./SEARCHABLETEXT_ALGOLIA.md)**
   - Rôle de `searchableText` avec Algolia
   - Comparaison avec/sans Algolia
   - Approches possibles
   - Recommandations

4. **[PERFORMANCE.md](./PERFORMANCE.md)** (à venir)
   - Métriques de performance
   - Optimisations
   - Monitoring

---

## 🎯 Objectif

Implémenter une recherche performante et maintenable pour les demandes d'adhésion, en tenant compte des limitations de Firestore et des besoins métier.

---

## 🚀 Quick Start

### Implémentation Algolia (Recommandé)

1. Lire [ANALYSE_RECHERCHE.md](./ANALYSE_RECHERCHE.md) pour comprendre les options
2. Suivre [ALGOLIA_SETUP.md](./ALGOLIA_SETUP.md) pour configurer Algolia
3. **Lire [MULTI_ENVIRONNEMENTS_ALGOLIA.md](./MULTI_ENVIRONNEMENTS_ALGOLIA.md) pour configurer les 3 environnements**
4. Suivre [IMPLEMENTATION_ALGOLIA.md](./IMPLEMENTATION_ALGOLIA.md) pour l'implémentation

---

## 📊 État Actuel

- ✅ Analyse complète des limitations
- ✅ Architecture définie
- ✅ Plan d'implémentation Algolia complet
- ✅ Guide de configuration Algolia
- ⏳ Implémentation en cours
- ⏳ Tests à créer
- ⏳ Migration des données à faire

---

## 🔗 Liens Utiles

- [Firestore Query Limitations](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations)
- [Algolia Documentation](https://www.algolia.com/doc/)
- [BaseGeographyRepository](../infrastructure/geography/repositories/BaseGeographyRepository.ts) - Exemple d'implémentation `searchableText`
