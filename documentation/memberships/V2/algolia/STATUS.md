# État d'avancement - Intégration Algolia pour Members

> Récapitulatif de ce qui a été fait et ce qui reste à faire

## ✅ Ce qui a été fait (Code & Tests)

### 1. Configuration Algolia
- [x] Documentation de la configuration (`index-setting.json`)
- [x] Structure des index définie (members-dev, members-preprod, members-prod)
- [x] Configuration des facets, searchableAttributes, customRanking
- [x] Documentation complète dans `README.md`

### 2. Code Frontend
- [x] **Utilitaires** : `src/utils/memberSearchableText.ts`
  - `generateMemberSearchableText()` - Génération du texte de recherche
  - `normalizeText()` - Normalisation des textes
  - `extractMemberSearchableData()` - Extraction depuis Firestore

- [x] **Service de recherche** : `src/services/search/MembersAlgoliaSearchService.ts`
  - Détection automatique de l'environnement
  - Recherche avec filtres et pagination
  - Récupération des données complètes depuis Firestore

- [x] **Repository V2** : `src/domains/memberships/repositories/MembersRepositoryV2.ts`
  - Stratégie hybride Algolia/Firestore
  - Mapping intelligent des filtres

- [x] **Hook React Query** : `src/domains/memberships/hooks/useMembersSearch.ts`
  - `useMembersSearch()` - Hook principal
  - `useMembersSearchWithUserFilters()` - Compatibilité avec UserFilters

- [x] **Composants** : `src/components/memberships/MemberFilters.tsx`
  - Placeholder amélioré pour la recherche
  - Tous les filtres fonctionnels

### 3. Code Backend (Cloud Functions)
- [x] **Cloud Function** : `functions/src/members/syncMembersToAlgolia.ts`
  - Trigger `onDocumentWritten` sur `users/{userId}`
  - Génération automatique de `searchableText`
  - Synchronisation automatique (création, modification, suppression)
  - Gestion des changements de rôle (admin → membre)

- [x] **Export** : `functions/src/index.ts`
  - Cloud Function exportée et prête au déploiement

### 4. Scripts de migration
- [x] **Script de migration** : `scripts/migrate-members-to-algolia.ts`
  - Migration par batch (1000 documents)
  - Options `--dry-run` et `--clear-index`
  - Gestion robuste des timestamps
  - Statistiques détaillées

- [x] **Documentation** : `scripts/MIGRATE_MEMBERS_README.md`
  - Guide d'utilisation complet
  - Instructions pour dev et prod

### 5. Tests
- [x] **Tests utilitaires** : `src/utils/__tests__/memberSearchableText.test.ts`
  - Tests de normalisation
  - Tests de génération de searchableText
  - Tests d'extraction depuis Firestore

- [x] **Tests service** : `src/services/search/__tests__/MembersAlgoliaSearchService.test.ts`
  - Tests de disponibilité Algolia
  - Tests de recherche et filtres
  - Tests de pagination

- [x] **Tests hook** : `src/domains/memberships/hooks/__tests__/useMembersSearch.test.tsx`
  - Tests d'intégration React Query
  - Tests de conditions d'activation
  - Tests de mapping UserFilters

### 6. Documentation
- [x] **Documentation principale** : `documentation/memberships/V2/algolia/README.md`
  - Vue d'ensemble, architecture, configuration
  - Guide d'utilisation

- [x] **Documentation d'implémentation** : `documentation/memberships/V2/algolia/IMPLEMENTATION.md`
  - Détails techniques complets
  - Guide de migration
  - Guide de dépannage
  - Bonnes pratiques

---

## ⏳ Ce qui reste à faire (Actions manuelles)

### 1. Configuration Algolia (Dashboard)

#### Créer les index Algolia
- [ ] **DEV** : Créer l'index `members-dev` dans Algolia Dashboard
- [ ] **PREPROD** : Créer l'index `members-preprod` dans Algolia Dashboard
- [ ] **PROD** : Créer l'index `members-prod` dans Algolia Dashboard

#### Appliquer la configuration
- [ ] Appliquer `index-setting.json` sur chaque index (dev, preprod, prod)
- [ ] Vérifier que les facets sont bien configurés
- [ ] Vérifier que les searchableAttributes incluent `searchableText`
- [ ] Créer les replicas pour le tri (optionnel) : `members-{env}_name_asc`

#### Variables d'environnement
- [ ] Vérifier que `NEXT_PUBLIC_ALGOLIA_APP_ID` est défini
- [ ] Vérifier que `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` est défini
- [ ] Vérifier que `NEXT_PUBLIC_ALGOLIA_MEMBERS_INDEX_NAME` est défini (optionnel)

### 2. Migration des données (Scripts)

#### Environnement DEV
```bash
# 1. Test (dry-run)
npx tsx scripts/migrate-members-to-algolia.ts dev --dry-run

# 2. Migration réelle
export ALGOLIA_APP_ID=...
export ALGOLIA_WRITE_API_KEY=...
npx tsx scripts/migrate-members-to-algolia.ts dev
```

- [ ] Exécuter le script de migration pour DEV
- [ ] Vérifier les données dans Algolia Dashboard (members-dev)
- [ ] Tester la recherche dans l'application DEV

#### Environnement PREPROD
```bash
# 1. Test (dry-run)
npx tsx scripts/migrate-members-to-algolia.ts preprod --dry-run

# 2. Migration réelle
export ALGOLIA_APP_ID=...
export ALGOLIA_WRITE_API_KEY=...
npx tsx scripts/migrate-members-to-algolia.ts preprod
```

- [ ] Exécuter le script de migration pour PREPROD
- [ ] Vérifier les données dans Algolia Dashboard (members-preprod)
- [ ] Tester la recherche dans l'application PREPROD

#### Environnement PROD
```bash
# 1. Test (dry-run)
npx tsx scripts/migrate-members-to-algolia.ts prod --dry-run

# 2. Migration réelle
export ALGOLIA_APP_ID=...
export ALGOLIA_WRITE_API_KEY=...
npx tsx scripts/migrate-members-to-algolia.ts prod
```

- [ ] Exécuter le script de migration pour PROD
- [ ] Vérifier les données dans Algolia Dashboard (members-prod)
- [ ] Tester la recherche dans l'application PROD

### 3. Déploiement Cloud Functions

#### Prérequis
- [ ] Vérifier que Firebase CLI est installé et configuré
- [ ] Vérifier que les variables d'environnement Algolia sont définies dans Firebase Functions
- [ ] Vérifier que les service accounts ont les bonnes permissions

#### Déploiement DEV
```bash
# Se connecter au projet Firebase DEV
firebase use kara-gabon-dev

# Déployer la Cloud Function
firebase deploy --only functions:syncMembersToAlgolia

# Vérifier le déploiement
firebase functions:list
```

- [ ] Déployer `syncMembersToAlgolia` sur DEV
- [ ] Vérifier les logs : `firebase functions:log --only syncMembersToAlgolia`
- [ ] Tester la synchronisation (créer/modifier un membre et vérifier dans Algolia)

#### Déploiement PREPROD
```bash
# Se connecter au projet Firebase PREPROD
firebase use kara-gabon-preprod

# Déployer la Cloud Function
firebase deploy --only functions:syncMembersToAlgolia

# Vérifier le déploiement
firebase functions:list
```

- [ ] Déployer `syncMembersToAlgolia` sur PREPROD
- [ ] Vérifier les logs
- [ ] Tester la synchronisation

#### Déploiement PROD
```bash
# Se connecter au projet Firebase PROD
firebase use kara-gabon

# Déployer la Cloud Function
firebase deploy --only functions:syncMembersToAlgolia

# Vérifier le déploiement
firebase functions:list
```

- [ ] Déployer `syncMembersToAlgolia` sur PROD
- [ ] Vérifier les logs
- [ ] Tester la synchronisation

### 4. Configuration des variables d'environnement Firebase Functions

La Cloud Function `syncMembersToAlgolia.ts` utilise `functions.config()` en priorité, puis `process.env` en fallback.

#### Option 1 : Firebase Functions Config (Recommandé)

Pour chaque environnement, configurer les variables d'environnement dans Firebase Functions :

```bash
# DEV
firebase use kara-gabon-dev
firebase functions:config:set algolia.app_id="VOTRE_APP_ID"
firebase functions:config:set algolia.write_api_key="VOTRE_ADMIN_KEY"
firebase functions:config:set algolia.members_index_name="members"  # Optionnel

# PREPROD
firebase use kara-gabon-preprod
firebase functions:config:set algolia.app_id="VOTRE_APP_ID"
firebase functions:config:set algolia.write_api_key="VOTRE_ADMIN_KEY"
firebase functions:config:set algolia.members_index_name="members"  # Optionnel

# PROD
firebase use kara-gabon
firebase functions:config:set algolia.app_id="VOTRE_APP_ID"
firebase functions:config:set algolia.write_api_key="VOTRE_ADMIN_KEY"
firebase functions:config:set algolia.members_index_name="members"  # Optionnel
```

#### Option 2 : Variables d'environnement (process.env)

Alternativement, définir les variables d'environnement dans `.env` ou via Firebase Functions secrets :

```bash
# Via Firebase Functions secrets (recommandé pour la production)
firebase functions:secrets:set ALGOLIA_APP_ID
firebase functions:secrets:set ALGOLIA_WRITE_API_KEY
firebase functions:secrets:set ALGOLIA_MEMBERS_INDEX_NAME  # Optionnel
```

- [ ] Configurer les variables d'environnement pour DEV
- [ ] Configurer les variables d'environnement pour PREPROD
- [ ] Configurer les variables d'environnement pour PROD

**Note** : La Cloud Function détecte automatiquement l'environnement depuis le `projectId` Firebase :
- `kara-gabon-dev` → `dev` → index `members-dev`
- `kara-gabon-preprod` → `preprod` → index `members-preprod`
- `kara-gabon` → `prod` → index `members-prod`

### 5. Tests d'intégration

#### Tests manuels
- [ ] Tester la recherche dans l'interface (DEV)
- [ ] Tester les filtres (membershipType, isActive, hasCar, etc.)
- [ ] Tester la pagination
- [ ] Tester la synchronisation automatique (créer/modifier un membre)
- [ ] Vérifier que les nouveaux membres sont indexés automatiquement
- [ ] Vérifier que les modifications sont synchronisées
- [ ] Vérifier que les suppressions sont synchronisées

#### Tests de performance
- [ ] Vérifier les temps de réponse de la recherche Algolia
- [ ] Comparer avec les recherches Firestore (sans searchQuery)
- [ ] Vérifier que le cache React Query fonctionne correctement

---

## 📋 Checklist finale

### Phase 1 : Configuration Algolia
- [ ] Créer les index (dev, preprod, prod)
- [ ] Appliquer la configuration JSON
- [ ] Créer les replicas (optionnel)
- [ ] Vérifier les variables d'environnement frontend

### Phase 2 : Migration des données
- [ ] Migration DEV (avec vérification)
- [ ] Migration PREPROD (avec vérification)
- [ ] Migration PROD (avec vérification)

### Phase 3 : Déploiement Cloud Functions
- [ ] Configurer les variables d'environnement Firebase Functions
- [ ] Déployer sur DEV
- [ ] Déployer sur PREPROD
- [ ] Déployer sur PROD

### Phase 4 : Tests et validation
- [ ] Tests manuels complets
- [ ] Vérification de la synchronisation automatique
- [ ] Tests de performance
- [ ] Validation avec les utilisateurs

---

## 🔗 Ressources

- [Documentation principale](./README.md)
- [Documentation d'implémentation](./IMPLEMENTATION.md)
- [Guide de migration](../../../../../scripts/MIGRATE_MEMBERS_README.md)
- [Script de migration](../../../../../scripts/migrate-members-to-algolia.ts)

---

## ⚠️ Notes importantes

1. **Migration** : La migration doit être effectuée **avant** le déploiement de la Cloud Function pour éviter que la fonction ne tente de synchroniser des documents déjà indexés (bien que cela ne pose pas de problème).

2. **Cloud Function** : Une fois déployée, la Cloud Function synchronisera automatiquement tous les nouveaux membres et modifications. Il n'est pas nécessaire de relancer la migration après chaque déploiement.

3. **Variables d'environnement** : Assurez-vous que les variables d'environnement Algolia sont bien configurées dans chaque environnement (frontend et Cloud Functions).

4. **Tests** : Testez d'abord sur DEV, puis PREPROD, avant de déployer sur PROD.

---

**Dernière mise à jour** : Date de création du document
