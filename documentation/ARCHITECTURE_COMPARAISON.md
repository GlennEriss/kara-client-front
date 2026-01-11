# Comparaison des Architectures — Marketplace vs KARA

> Analyse comparative entre l'architecture marketplace (feature-based) et l'architecture KARA actuelle (domain-based)

---

## 📊 Vue d'ensemble

### Architecture Marketplace (Feature-Based)
- **Organisation** : Par fonctionnalités métier
- **Structure** : `features/<feature>/ui/hooks/services/schemas/types/`
- **Adaptateurs** : `services/` (firebase, algolia)
- **Injection** : Factory + Context (légère)

### Architecture KARA Actuelle (Domain-Driven Design)
- **Organisation** : Par domaines métier (DDD)
- **Structure** : `domains/<domain>/entities/repositories/services/hooks/components/schemas/`
- **Adaptateurs** : `repositories/` séparés + `factories/` explicites
- **Injection** : RepositoryFactory + ServiceFactory

---

## 🔄 Comparaison Détaillée

### 1. Organisation des dossiers

#### Marketplace (Feature-Based)
```
src/
  features/
    auth/
      ui/
      hooks/
      services/
      schemas/
      types/
    catalog/
      ui/
      hooks/
      services/
      schemas/
      types/
  
  shared/
    ui/
    hooks/
    lib/
    config/
    constants/
    types/
  
  services/
    firebase/
    algolia/
```

#### KARA (Domain-Driven Design)
```
src/
  domains/
    membership/
      entities/
      repositories/
      services/
      hooks/
      components/
      schemas/
    financial/
      caisse-speciale/
      caisse-imprevue/
      credit-speciale/
      placement/
  
  shared/
    ui/
    factories/
    providers/
    constants/
    types/
    utils/
  
  repositories/  # OU dans domains/ ?
  services/      # OU dans domains/ ?
```

**Différences clés** :
- Marketplace : `features/` = fonctionnalités (catalog, search, order)
- KARA : `domains/` = domaines métier (membership, financial, complementary)
- Marketplace : `services/` = adaptateurs techniques (firebase, algolia)
- KARA : `repositories/` + `services/` séparés, avec factories explicites

---

### 2. Flux d'injection des dépendances

#### Marketplace
```
Services (firebase/algolia) → Factory → Context → Features (hooks/services) → UI
```

#### KARA (actuel)
```
Firebase → Repositories → RepositoryFactory → Services → ServiceFactory → Hooks/Mediators → Components
```

**Observations** :
- Marketplace : Plus simple, factory légère (context)
- KARA : Plus structuré, factories explicites (RepositoryFactory, ServiceFactory)

---

### 3. Couches et responsabilités

#### Marketplace
```
UI → Hooks → Services → Repositories/Adapters (dans services/)
```

#### KARA
```
Components → Hooks/Mediators → Services → Repositories → Firebase
```

**Similitudes** :
- ✅ Séparation claire des couches
- ✅ UI ne contient pas de logique métier
- ✅ Services orchestrent les repositories

**Différences** :
- Marketplace : Repositories dans `services/` (adaptateurs)
- KARA : Repositories séparés (plus explicite)
- KARA : Médiateurs pour workflows complexes

---

### 4. Tests

#### Marketplace
```
features/
  catalog/
    __tests__/
      catalog.service.test.ts
      ProductCard.test.tsx
tests/
  integration/
  e2e/playwright/
```

#### KARA (recommandé)
```
src/
  domains/
    membership/
      services/
        __tests__/
          membership.service.test.ts
tests/
  integration/
  e2e/
```

**Similitudes** :
- ✅ Tests près du code (dans les features/domains)
- ✅ Tests séparés (integration, e2e)

---

## 💡 Recommandations pour KARA

### ✅ Points à conserver de l'architecture KARA actuelle

1. **Domains-Based (DDD)** : Meilleur pour KARA car :
   - Domaines métier clairs (Membership, Financial, Complementary)
   - Évolutif quand on ajoutera de nouveaux domaines
   - Aligné avec la vision métier

2. **Repositories séparés** : Plus explicite que dans `services/`
   - Clarifie la responsabilité (accès données vs logique métier)

3. **Factories explicites** : Meilleure traçabilité
   - RepositoryFactory + ServiceFactory = injection claire

### 🔄 Points à adapter depuis Marketplace

1. **Structure des tests** :
   - Marketplace : `__tests__/` dans chaque feature
   - **Recommandation KARA** : Adopter la même approche
   ```
   domains/
     membership/
       services/
         __tests__/
           membership.service.test.ts
   ```

2. **Shared UI** :
   - Marketplace : `shared/ui/` bien défini
   - **KARA** : Déjà présent, s'assurer qu'il est utilisé

3. **Schemas Zod** :
   - Marketplace : `features/<feature>/schemas/`
   - **KARA** : Déjà présent dans `domains/<domain>/schemas/` ✅

4. **Services/Repositories** :
   - Marketplace : `services/firebase/`, `services/algolia/`
   - **KARA** : Conserver `repositories/` séparés (plus clair)

---

## 📋 Structure Recommandée pour KARA (Hybride)

### Structure optimale (KARA + meilleures pratiques Marketplace)

```
src/
  domains/
    membership/
      entities/          # Types/Interfaces
      repositories/      # Accès Firestore/Storage
      services/          # Logique métier
      hooks/             # Hooks React Query
      components/        # Composants UI spécifiques au domaine
      schemas/           # Schemas Zod
      __tests__/         # Tests du domaine
        services/
          membership.service.test.ts
        hooks/
          useMemberships.test.ts
        components/
          MemberCard.test.tsx
    
    financial/
      caisse-speciale/
        repositories/
        services/
        hooks/
        components/
        schemas/
        __tests__/
      # ... autres sous-modules
  
  shared/
    ui/                  # Composants UI réutilisables (shadcn)
    factories/           # RepositoryFactory, ServiceFactory
    providers/           # Contextes React globaux
    hooks/               # Hooks communs
    lib/                 # Helpers (format, dates, money)
    config/              # Routes, appConfig
    constants/           # Routes, collection names
    types/               # Types partagés
    utils/               # Utilitaires généraux
  
  firebase/              # Configuration Firebase (client/admin)
  
  app/                   # Next.js App Router
    (admin)/
    (public)/
    api/
    layout.tsx
  
  tests/
    integration/
    e2e/
```

### Règles de structure

1. **Domains** : Organisation par domaine métier (DDD)
2. **Couches par domaine** : entities → repositories → services → hooks → components
3. **Tests** : `__tests__/` dans chaque couche (services, hooks, components)
4. **Shared** : Code réutilisable entre domaines
5. **Firebase** : Configuration centralisée

---

## 🎯 Différences Clés à Noter

| Aspect | Marketplace | KARA Actuel | Recommandation KARA |
|--------|-------------|-------------|---------------------|
| **Organisation** | Features | Domains (DDD) | ✅ Conserver Domains |
| **Repositories** | Dans `services/` | Séparés | ✅ Conserver séparés |
| **Factories** | Factory + Context | RepositoryFactory + ServiceFactory | ✅ Conserver factories explicites |
| **Tests** | `__tests__/` dans features | À définir | ✅ Adopter `__tests__/` dans domains |
| **Services adaptateurs** | `services/firebase/` | `firebase/` + `repositories/` | ✅ Conserver séparation |
| **Médiateurs** | Non mentionné | Présent | ✅ Conserver pour workflows complexes |

---

## ✅ Conclusion

### Architecture KARA = Bonne base

L'architecture KARA actuelle (DDD + factories explicites) est **appropriée** pour le projet car :

1. ✅ **Domains-Based** : S'adapte mieux aux domaines métier complexes de KARA
2. ✅ **Repositories séparés** : Plus clair et testable
3. ✅ **Factories explicites** : Meilleure traçabilité de l'injection
4. ✅ **Médiateurs** : Utiles pour les workflows complexes (formulaires multi-étapes)

### Améliorations à adopter depuis Marketplace

1. ✅ **Tests** : Adopter `__tests__/` dans chaque domaine/couche
2. ✅ **Structure des tests** : Séparer integration/e2e dans `tests/`
3. ✅ **Documentation** : Garder la structure claire comme dans marketplace

---

## 📚 Références

- Architecture Marketplace : Document fourni par l'utilisateur
- Architecture KARA : `documentation/architecture/ARCHITECTURE.md`
- Workflow : `documentation/WORKFLOW.md`
