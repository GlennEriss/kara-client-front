# État Actuel — Module References (Companies, Professions)

## Problèmes Identifiés

### Organisation
- ❌ Code dispersé dans plusieurs dossiers (`db/`, `services/`, `hooks/`, `components/`, `mediators/`, `schemas/`)
- ❌ Utilisation de fichiers `db/` legacy au lieu de repositories structurés
- ❌ Pas de cohésion visible du domaine métier References
- ❌ Types mélangés avec les autres types dans `types/types.ts`
- ❌ Hooks dupliqués (`useCompanySuggestions` dans `hooks/` et `hooks/company/`)

### Maintenabilité
- ⚠️ Difficile de trouver tous les fichiers liés au module References
- ⚠️ Pas de frontière claire entre domaines
- ⚠️ Risque de dépendances circulaires accru
- ⚠️ Code legacy dans `db/` qui doit être modernisé
- ⚠️ Logique métier mélangée avec les opérations de base de données

### Scalabilité
- ⚠️ Structure actuelle ne scale pas bien avec de nombreux modules
- ⚠️ Difficulté à isoler un domaine pour tests/refactoring
- ⚠️ Pas de repositories structurés, utilisation directe de Firestore

---

## Structure Actuelle Détaillée

Voir `README.md` section "État Actuel (BEFORE)".

---

## Métriques

- **Database (Legacy)** : 2 fichiers (`company.db.ts`, `profession.db.ts`)
- **Services** : 1 fichier (`CompanySuggestionsService.ts`)
- **Hooks** : ~6 fichiers (useCompany, useCompaniesQuery, useCompanySuggestions, useProfessions, useJobs, etc.)
- **Components** : ~10 fichiers (CompanyList, JobsList, combobox, modals, etc.)
- **Mediators** : 1 fichier (`CompanyFormMediator.ts`)
- **Schemas** : 1 fichier (`company.schema.ts`)
- **Types** : 4 interfaces/types (dans types/types.ts)

**Total** : ~25 fichiers à migrer/créer

---

## Dépendances

Le module References est utilisé par :
- **Membership** : Champs entreprise/profession dans les formulaires d'inscription
- **Member** : Informations d'entreprise et profession des membres
- **Forms** : Combobox pour sélection d'entreprise/profession dans les formulaires

---

## Points Techniques à Noter

### Fichiers Legacy
- `db/company.db.ts` : Contient toutes les opérations CRUD pour les entreprises
- `db/profession.db.ts` : Contient toutes les opérations CRUD pour les professions
- Ces fichiers utilisent directement Firestore sans passer par des repositories

### Système de Cache
- `CompanyCacheProvider` : Système de cache pour améliorer les performances des suggestions
- `useCompanyCacheManager` : Hook pour gérer le cache
- Doit être préservé lors de la migration

### Normalisation
- Fonction `normalizeName` dupliquée dans `company.db.ts` et `profession.db.ts`
- Doit être extraite dans un utilitaire partagé
