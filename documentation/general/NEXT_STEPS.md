# Prochaines Étapes — KARA Association

> Guide des prochaines étapes selon le WORKFLOW.md

---

## 🎯 Situation Actuelle

### ✅ Ce qui est fait
- [x] Workflow documenté (`WORKFLOW.md`)
- [x] Structure UML définie (`documentation/uml/`)
- [x] Plan de migration créé (`PLAN_MIGRATION_DOMAINS.md`)
- [x] Configurations Firebase récupérées (dev, preprod)
- [x] Design System KARA (couleurs)

### ⬜ Ce qui reste à faire
- [ ] Configuration Firebase complète (`.firebaserc`, `.env.local`, `.env.preview`)
- [ ] Code adapté pour préfixes de collections
- [ ] Diagrammes UML créés (use cases, classes)
- [ ] Migration vers structure domains/

---

## 📋 Prochaines Étapes selon le WORKFLOW

Selon `WORKFLOW.md`, pour refactoriser (ce qui est notre objectif principal), il faut suivre le **CAS 2 : Refactoring**.

### Étape 1 : Finaliser la Configuration Firebase (URGENT)

**⚠️ PRIORITÉ** : Avant de commencer tout refactoring, il faut sécuriser les environnements.

#### Actions immédiates
1. **Mettre à jour `.firebaserc`** :
   ```json
   {
     "projects": {
       "default": "kara-gabon-dev",
       "dev": "kara-gabon-dev",
       "preprod": "kara-gabon-preprod",
       "prod": "kara-gabon"
     }
   }
   ```

2. **Mettre à jour `.env.local`** avec les valeurs DEV :
   - Remplacer les valeurs de production par les valeurs `kara-gabon-dev`
   - ⚠️ **CRITIQUE** : Ne plus utiliser la base de production en développement

3. **Créer `.env.preview`** avec les valeurs PREPROD :
   - Utiliser les valeurs `kara-gabon-preprod`

4. **Adapter le code pour les préfixes de collections** :
   - Créer `src/shared/constants/collections.ts` avec les préfixes
   - Remplacer tous les noms de collections en dur par les constantes
   - Voir `FIREBASE_MULTI_ENVIRONNEMENT.md` section 2

**Référence** : `documentation/FIREBASE_MIGRATION_URGENTE.md`

**Durée estimée** : 2-3 heures

---

### Étape 2 : Créer les Diagrammes UML (OBLIGATOIRE avant refactoring)

Selon `WORKFLOW.md` (CAS 2 — Étape A.2 et A.3), avant de refactoriser, il faut :

#### 2.1 Créer le diagramme de use case complet

**Objectif** : Documenter TOUS les use cases de l'application.

**Action** :
- [ ] Créer `documentation/uml/use-cases/USE_CASES_COMPLETS.puml`
- [ ] Organiser par packages/modules
- [ ] Identifier tous les acteurs (Admin KARA, Membre, Système)
- [ ] Documenter tous les use cases existants

**Référence** : `WORKFLOW.md` section "CAS 2 — Étape A.2"

**Durée estimée** : 1-2 jours

#### 2.2 Créer les diagrammes de classes par module

**Objectif** : Créer des diagrammes de classes cohérents pour chaque module.

**Action** :
- [ ] Créer `documentation/uml/classes/CLASSES_MEMBERSHIP.puml`
- [ ] Créer `documentation/uml/classes/CLASSES_CAISSE_SPECIALE.puml`
- [ ] Créer `documentation/uml/classes/CLASSES_CAISSE_IMPREVUE.puml`
- [ ] Créer `documentation/uml/classes/CLASSES_CREDIT_SPECIALE.puml`
- [ ] Créer `documentation/uml/classes/CLASSES_PLACEMENT.puml`
- [ ] Créer `documentation/uml/classes/CLASSES_BIENFAITEUR.puml`
- [ ] Créer `documentation/uml/classes/CLASSES_VEHICULE.puml`
- [ ] Créer `documentation/uml/classes/CLASSES_GEOGRAPHIE.puml`
- [ ] Créer `documentation/uml/classes/CLASSES_SHARED.puml`

**Référence** : `WORKFLOW.md` section "CAS 2 — Étape A.3"

**Durée estimée** : 2-3 jours

---

### Étape 3 : Commencer la Migration vers Domains/

Une fois les diagrammes UML créés, suivre le plan de migration :

**Référence** : `documentation/PLAN_MIGRATION_DOMAINS.md`

**Ordre recommandé** :
1. Phase 1 : Infrastructure (Geography, Documents, Notifications, References)
2. Phase 2 : Complementary (Vehicle, Charity)
3. Phase 3 : Financial (Placement, Caisse Imprévue, Crédit Spéciale, Caisse Spéciale)
4. Phase 4 : Membership
5. Phase 5 : Nettoyage

**Durée estimée** : 6 semaines

---

## 🎯 Recommandation : Par quoi commencer MAINTENANT

### Option A : Configuration Firebase d'abord (RECOMMANDÉ)

**Pourquoi** : Sécuriser les environnements avant tout développement.

**Actions** :
1. ✅ Mettre à jour `.firebaserc`
2. ✅ Mettre à jour `.env.local` avec DEV
3. ✅ Créer `.env.preview` avec PREPROD
4. ✅ Adapter le code pour les préfixes de collections
5. ✅ Tester en local avec le projet DEV

**Avantages** :
- ✅ Plus de risque de polluer la production
- ✅ Environnements sécurisés
- ✅ Base solide pour le refactoring

**Référence** : `documentation/FIREBASE_MIGRATION_URGENTE.md`

---

### Option B : Diagrammes UML d'abord

**Pourquoi** : Avoir une vision complète avant de migrer.

**Actions** :
1. ✅ Créer `USE_CASES_COMPLETS.puml`
2. ✅ Créer tous les diagrammes de classes
3. ✅ Ensuite, commencer la migration

**Avantages** :
- ✅ Vision complète de l'application
- ✅ Documentation à jour
- ✅ Meilleure planification de la migration

**Inconvénient** :
- ⚠️ Risque de continuer à utiliser la production en dev pendant ce temps

---

## ✅ Recommandation Finale

**Commencer par : Configuration Firebase (Option A)**

**Ordre d'exécution** :

### Semaine 1 : Configuration Firebase
1. **Jour 1-2** : Finaliser la configuration Firebase
   - Mettre à jour `.firebaserc`
   - Mettre à jour `.env.local` avec DEV
   - Créer `.env.preview` avec PREPROD
   - Adapter le code pour les préfixes de collections

2. **Jour 3-4** : Créer les diagrammes UML
   - `USE_CASES_COMPLETS.puml`
   - Commencer les diagrammes de classes (1-2 modules)

3. **Jour 5** : Finaliser les diagrammes UML
   - Compléter tous les diagrammes de classes

### Semaine 2+ : Migration vers Domains/
- Suivre `PLAN_MIGRATION_DOMAINS.md`
- Commencer par Infrastructure

---

## 📝 Checklist Immédiate

### Configuration Firebase (À faire MAINTENANT)
- [ ] Mettre à jour `.firebaserc`
- [ ] Mettre à jour `.env.local` avec `kara-gabon-dev`
- [ ] Créer `.env.preview` avec `kara-gabon-preprod`
- [ ] Récupérer Service Accounts (DEV et PREPROD)
- [ ] Adapter le code pour les préfixes de collections
- [ ] Tester en local avec le projet DEV

### Diagrammes UML (Ensuite)
- [ ] Créer `documentation/uml/use-cases/USE_CASES_COMPLETS.puml`
- [ ] Créer tous les diagrammes de classes
- [ ] Vérifier la cohérence avec le code existant

### Migration (Plus tard)
- [ ] Suivre `PLAN_MIGRATION_DOMAINS.md`
- [ ] Commencer par Infrastructure

---

## 🔗 Références

- `WORKFLOW.md` : Workflow complet (CAS 2 pour refactoring)
- `FIREBASE_MIGRATION_URGENTE.md` : Guide de migration Firebase
- `FIREBASE_CONFIGURATIONS.md` : Toutes les configurations Firebase
- `PLAN_MIGRATION_DOMAINS.md` : Plan de migration vers domains/
- `documentation/uml/README.md` : Structure UML
