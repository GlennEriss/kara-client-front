# Plan de Travail - Module Memberships V2

## 🎯 Objectif Global

Finaliser le module `memberships` V2 avec :
1. Tests unitaires et d'intégration
2. Finalisation de la Phase 4 (Combobox)
3. Documentation complète
4. Intégration Algolia pour la recherche des membres

---

## 📋 Option 1 : Tests Unitaires du Service (Phase 2)

### Objectif
Créer des tests unitaires complets pour `MembershipFormService` et `MembershipErrorHandler`.

### Tâches

#### 1.1 Tests `MembershipFormService`
- [ ] **Fichier** : `src/domains/memberships/services/__tests__/MembershipFormService.test.ts`
- [ ] Mock `MembershipRepositoryV2.create()`
- [ ] Mock Firebase Functions (`submitCorrections`)
- [ ] Mock `MembershipErrorHandler`
- [ ] **Cas de test** :
  - [ ] Soumission réussie d'une nouvelle demande
  - [ ] Validation échoue (nom manquant)
  - [ ] Upload de photo échoue
  - [ ] Erreur Firestore lors de la création
  - [ ] Soumission de corrections réussie
  - [ ] Erreur lors de l'appel à `submitCorrections`
  - [ ] Sauvegarde de brouillon
  - [ ] Chargement de brouillon
  - [ ] Expiration de brouillon (après 7 jours)
  - [ ] Suppression de brouillon après soumission

#### 1.2 Tests `MembershipErrorHandler`
- [ ] **Fichier** : `src/domains/memberships/services/__tests__/MembershipErrorHandler.test.ts`
- [ ] **Cas de test** :
  - [ ] Normalisation d'erreur Firebase Storage
  - [ ] Normalisation d'erreur Firestore
  - [ ] Normalisation d'erreur réseau
  - [ ] Génération de message utilisateur-friendly
  - [ ] Extraction de code d'erreur
  - [ ] Logging structuré

#### 1.3 Configuration des tests
- [ ] Configurer Vitest avec mocks Firebase
- [ ] Créer des fixtures de données de test
- [ ] Configurer les mocks pour `DocumentRepository`

**Durée estimée** : 2-3h

---

## 📋 Option 2 : Tests d'Intégration (Phase 6)

### Objectif
Créer des tests d'intégration end-to-end pour le formulaire d'adhésion.

### Tâches

#### 2.1 Tests d'intégration du formulaire
- [ ] **Fichier** : `src/domains/memberships/__tests__/integration/membership-form.integration.test.tsx`
- [ ] **Scénarios** :
  - [ ] **INT-FORM-01** : Remplissage complet (Step1 → Step4) et soumission réussie
  - [ ] **INT-FORM-02** : Création rapide d'une province depuis Step2 → vérifier sélection automatique
  - [ ] **INT-FORM-03** : Création rapide d'une entreprise depuis Step3 → vérifier sélection automatique
  - [ ] **INT-FORM-04** : Validation des étapes (erreurs affichées, navigation bloquée si invalide)
  - [ ] **INT-FORM-05** : Sauvegarde/chargement de brouillon
  - [ ] **INT-FORM-06** : Soumission avec erreur (affichage message d'erreur)

#### 2.2 Configuration des tests d'intégration
- [ ] Configurer React Testing Library
- [ ] Configurer Firebase Emulators pour les tests
- [ ] Créer des helpers de test (remplir formulaire, soumettre, etc.)

**Note** : Les tests d'intégration seront réalisés plus tard. Priorité donnée aux améliorations UX (Combobox).

**Durée estimée** : 3-4h (reporté)

---

## 📋 Option 3 : Finaliser Phase 4 - Convertir Select en Combobox

### Objectif
Améliorer l'UX en convertissant les Select en Combobox avec recherche dans Step2 (géographie).

### Tâches

#### 3.1 Créer des Combobox pour la géographie
- [ ] **Fichier** : `src/domains/memberships/components/form/steps/MembershipFormStepAddress.tsx`
- [ ] Convertir `ProvinceSelect` → `ProvinceCombobox` (avec recherche)
- [ ] Convertir `CitySelect` → `CityCombobox` (avec recherche)
- [ ] Convertir `ArrondissementSelect` → `ArrondissementCombobox` (avec recherche)
- [ ] Convertir `QuarterSelect` → `QuarterCombobox` (avec recherche)
- [ ] Utiliser les composants existants de `@/domains/infrastructure/references/components`

#### 3.2 Centraliser la logique de cascade
- [ ] **Fichier** : `src/domains/memberships/hooks/useAddressCascade.ts` (nouveau)
- [ ] Créer un hook qui gère la cascade : Province → Ville → Arrondissement → Quartier
- [ ] Gérer le chargement automatique des options en fonction de la sélection parente
- [ ] Gérer la réinitialisation des champs enfants quand le parent change

#### 3.3 Refactor Step1 et Step4
- [ ] **Step1** : S'assurer que la validation est centralisée dans un schéma (`MembershipIdentitySchema`)
- [ ] **Step4** : Vérifier que l'upload utilise bien `DocumentRepository`

**Durée estimée** : 2-3h

---

## 📋 Option 4 : Documentation (Phase 7)

### Objectif
Compléter toute la documentation manquante du module `form-membership`.

### Tâches

#### 4.1 Documentation Firebase
- [ ] **Fichier** : `documentation/memberships/V2/form-membership/firebase/README.md`
- [ ] Documenter les collections utilisées (`membershipRequests`)
- [ ] Documenter les index Firestore nécessaires
- [ ] Documenter les règles de sécurité Firestore
- [ ] Documenter les règles de sécurité Storage (upload photos/documents)

#### 4.2 Documentation Tests
- [ ] **Fichier** : `documentation/memberships/V2/form-membership/tests/README.md`
- [ ] Checklist détaillée des tests créés
- [ ] Guide pour exécuter les tests
- [ ] Guide pour ajouter de nouveaux tests

#### 4.3 Documentation Functions
- [ ] **Fichier** : `documentation/memberships/V2/form-membership/functions/README.md`
- [ ] Documenter la Cloud Function `submitCorrections`
- [ ] Documenter les triggers Firestore (si applicable)
- [ ] Guide de déploiement

#### 4.4 Documentation Notifications
- [ ] **Fichier** : `documentation/memberships/V2/form-membership/notifications/README.md`
- [ ] Documenter les notifications après création d'une demande
- [ ] Documenter les notifications après corrections
- [ ] Documenter les notifications d'erreur

#### 4.5 Diagrammes
- [ ] Mettre à jour `activite/*.puml` (diagrammes d'activité)
- [ ] Mettre à jour `sequence/*.puml` (diagrammes de séquence)

**Durée estimée** : 1-2h

---

## 📋 Option 5 : Intégration Algolia pour la Recherche des Membres

### Objectif
Adapter Algolia (déjà utilisé pour `membership-requests`) pour la recherche des membres dans la liste.

### Tâches

#### 5.1 Documentation Algolia pour Members
- [ ] **Fichier** : `documentation/memberships/V2/recherche-memberships/ALGOLIA_SETUP.md`
- [ ] Adapter la documentation existante (`documentation/membership-requests/recherche/ALGOLIA_SETUP.md`)
- [ ] Documenter la création de l'index `members` dans Algolia
- [ ] Documenter les attributs de recherche (nom, prénom, matricule, email, téléphone)
- [ ] Documenter les facets (type d'adhésion, abonnement, géographie, etc.)

#### 5.2 Service Algolia pour Members
- [ ] **Fichier** : `src/services/search/MembersAlgoliaSearchService.ts` (nouveau)
- [ ] Créer un service similaire à `AlgoliaSearchService` mais pour les membres
- [ ] Adapter `generateSearchableText` pour les membres (User)
- [ ] Gérer les filtres spécifiques aux membres (membershipType, isActive, province, etc.)

#### 5.3 Cloud Function - Synchronisation Members → Algolia
- [ ] **Fichier** : `functions/src/members/syncToAlgolia.ts` (nouveau)
- [ ] Créer une Cloud Function qui synchronise `users` → Algolia index `members`
- [ ] Déclencher sur `onCreate`, `onUpdate`, `onDelete` de la collection `users`
- [ ] Générer `searchableText` pour chaque membre
- [ ] Indexer les champs nécessaires (nom, prénom, matricule, email, téléphone, etc.)

#### 5.4 Repository - Intégration Algolia
- [ ] **Fichier** : `src/domains/memberships/repositories/MembersRepositoryV2.ts`
- [ ] Modifier `getAll()` pour utiliser Algolia si disponible et si `searchQuery` est présent
- [ ] Fallback vers Firestore si Algolia n'est pas configuré ou en cas d'erreur
- [ ] Adapter les filtres pour Algolia (convertir `UserFilters` en filtres Algolia)

#### 5.5 Hook de Recherche
- [ ] **Fichier** : `src/domains/memberships/hooks/useMembershipSearch.ts` (existe déjà, à adapter)
- [ ] Adapter pour utiliser `MembersAlgoliaSearchService` au lieu de Firestore uniquement
- [ ] Gérer le fallback Firestore si Algolia échoue

#### 5.6 Mise à jour des Filtres
- [ ] **Fichier** : `src/domains/memberships/components/list/MembershipsListFilters.tsx`
- [ ] S'assurer que les filtres sont compatibles avec Algolia
- [ ] Documenter les filtres supportés par Algolia vs Firestore

#### 5.7 Script de Migration
- [ ] **Fichier** : `scripts/migrate-members-to-algolia.ts` (nouveau)
- [ ] Créer un script pour migrer les membres existants vers Algolia
- [ ] Traiter par batch pour éviter les timeouts
- [ ] Gérer les erreurs et la reprise en cas d'échec

#### 5.8 Tests
- [ ] Tests unitaires pour `MembersAlgoliaSearchService`
- [ ] Tests d'intégration pour la recherche avec Algolia
- [ ] Tests du fallback Firestore

#### 5.9 Documentation
- [ ] **Fichier** : `documentation/memberships/V2/recherche-memberships/IMPLEMENTATION_ALGOLIA.md`
- [ ] Adapter la documentation existante pour les membres
- [ ] Documenter la configuration de l'index Algolia
- [ ] Documenter les variables d'environnement
- [ ] Documenter le déploiement

**Durée estimée** : 4-5h

---

## 📅 Ordre d'Exécution Recommandé

### Sprint 1 (Priorité Haute)
1. **Option 1** : Tests unitaires (2-3h)
2. **Option 3** : Finaliser Phase 4 - Combobox (2-3h)
3. **Option 4** : Documentation (1-2h)

**Total Sprint 1** : ~6-8h

### Sprint 2 (Priorité Moyenne)
4. **Option 2** : Tests d'intégration (3-4h)
5. **Option 5** : Intégration Algolia (4-5h)

**Total Sprint 2** : ~7-9h

---

## ✅ Checklist Globale

### Tests
- [ ] Tests unitaires `MembershipFormService`
- [ ] Tests unitaires `MembershipErrorHandler`
- [ ] Tests d'intégration du formulaire (6 scénarios)
- [ ] Tests Algolia pour la recherche des membres

### Code
- [ ] Convertir Select → Combobox dans Step2
- [ ] Créer hook `useAddressCascade`
- [ ] Créer `MembersAlgoliaSearchService`
- [ ] Créer Cloud Function `syncToAlgolia` pour members
- [ ] Adapter `MembersRepositoryV2` pour Algolia
- [ ] Créer script de migration members → Algolia

### Documentation
- [ ] Documentation Firebase
- [ ] Documentation Tests
- [ ] Documentation Functions
- [ ] Documentation Notifications
- [ ] Documentation Algolia Setup
- [ ] Documentation Algolia Implementation
- [ ] Mettre à jour les diagrammes

---

## 📝 Notes Importantes

### Algolia
- **Index** : `members``` (différent de `membership-requests`)
- **Attributs de recherche** : `searchableText`, `firstName`, `lastName`, `matricule`, `email`, `phone`
- **Facets** : `membershipType`, `isActive`, `province`, `city`, etc.
- **Fallback** : Toujours garder Firestore comme fallback si Algolia échoue

### Tests
- Utiliser Firebase Emulators pour les tests d'intégration
- Mocker Algolia pour les tests unitaires
- Créer des fixtures de données réalistes

### Migration
- Tester la migration sur un environnement de dev d'abord
- Prévoir un rollback si nécessaire
- Monitorer les coûts Algolia après migration

---

## 🚀 Prochaines Étapes Immédiates

1. **Commencer par Option 1** (Tests unitaires) - Le plus rapide et le plus critique
2. **Puis Option 3** (Combobox) - Amélioration UX visible
3. **Ensuite Option 4** (Documentation) - Nécessaire pour la maintenance
4. **Puis Option 2** (Tests d'intégration) - Validation end-to-end
5. **Enfin Option 5** (Algolia) - Le plus complexe, nécessite déploiement

---

**Date de création** : 2025-01-21  
**Dernière mise à jour** : 2025-01-21
