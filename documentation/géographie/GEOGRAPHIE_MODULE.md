## Module « Géographie » – Provinces, Villes, Arrondissements, Quartiers

### 1. Objectif et périmètre
- CRUD complet pour quatre entités liées : Province → Ville → Arrondissement → Quartier.
- Chaque entité est administrable dans l’espace `@(admin)` avec pagination, recherche, filtres par parent et audit (créé/modifié par).
- Réutilisation stricte de l’architecture décrite dans `documentation/architecture/ARCHITECTURE.md`.

### 2. Diagramme de classes (Mermaid)
```mermaid
classDiagram
  class Province {
    +string id
    +string code // ex: "ESTuaire"
    +string name
    +int? displayOrder
    +Date createdAt
    +Date updatedAt
    +string createdBy
    +string? updatedBy
  }

  class City {
    +string id
    +string provinceId
    +string name
    +string? postalCode
    +int? displayOrder
    +Date createdAt
    +Date updatedAt
    +string createdBy
    +string? updatedBy
  }

  class District {
    +string id
    +string cityId
    +string name
    +int? displayOrder
    +Date createdAt
    +Date updatedAt
    +string createdBy
    +string? updatedBy
  }

  class Quarter {
    +string id
    +string districtId
    +string name
    +int? displayOrder
    +Date createdAt
    +Date updatedAt
    +string createdBy
    +string? updatedBy
  }

  Province "1" --> "many" City : contient
  City "1" --> "many" District : contient
  District "1" --> "many" Quarter : contient
```

### 3. Modélisation Firestore
- Collections plates (pas de sous-collections) pour faciliter les requêtes et filtres croisés :
  - `provinces`
  - `cities`
  - `districts`
  - `quarters`
- Clés stockées en référence (ex : `city.provinceId`, `district.cityId`, `quarter.districtId`).
- Champs communs : `name`, `displayOrder?`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy?`.
- Index suggérés :
  - `cities` : composite `provinceId + name` (asc) pour tri/filtre.
  - `districts` : composite `cityId + name`.
  - `quarters` : composite `districtId + name`.
  - Simple index sur `displayOrder` par collection pour l’affichage ordonné.
- Sécurité (à implémenter côté règles Firebase) : accès admin uniquement; validation des liens parents existants au niveau service avant écriture.

### 4. Types et constantes (à ajouter)
- `src/types/types.ts` : `Province`, `City`, `District`, `Quarter`.
- `src/constantes/routes.ts` : routes admin `ADMIN_GEO_PROVINCES`, `ADMIN_GEO_CITIES`, `ADMIN_GEO_DISTRICTS`, `ADMIN_GEO_QUARTERS`.
- `src/schemas/geographie.schema.ts` : schémas Zod pour chaque formulaire.

### 5. Architecture applicative (couches)
- Repositories `src/repositories/geographie/` :
  - `ProvinceRepository`, `CityRepository`, `DistrictRepository`, `QuarterRepository`.
  - Opérations CRUD Firestore, requêtes filtrées par parent, gestion des timestamps et `createdBy/updatedBy`.
- Services `src/services/geographie/` :
  - Validation parent/enfant (ex : vérifier existence de la province avant création de ville).
  - Gestion des tris, des filtres, et des transactions éventuelles (batch writes pour réordonnancement).
- Factories :
  - `RepositoryFactory` : instancie les repositories géographie.
  - `ServiceFactory` : expose `geographieService` regroupant les sous-services ou services unitaires par entité.
- Hooks `src/hooks/geographie/` :
  - `useProvinces`, `useCities`, `useDistricts`, `useQuarters` (list + get + create/update/delete via React Query).
  - `useGeoOptions` pour fournir des listes dépendantes (provinces → villes → arrondissements → quartiers) aux formulaires.
- Médiateurs (si besoin) `src/mediators/geographie/` :
  - Orchestration des chaînes dépendantes (ex : formulaire Quartier qui précharge province + ville + arrondissement).
- UI `src/components/geographie/` :
  - Listes/tabulations par sous-onglet.
  - Dialogs de création/édition (shadcn Dialog + react-hook-form + Zod).
  - Tableau avec filtres parent (select province/ville/arrondissement selon l’onglet).
- Pages Next `src/app/(admin)/geographie/*` :
  - Route principale avec Tabs : Province, Ville, Arrondissement, Quartier.
  - Chaque tab charge son composant + hooks dédiés.

### 6. Flux CRUD par onglet
- Province : liste, recherche par nom, tri par `displayOrder`, création/édition/suppression.
- Ville : filtre obligatoire par province; CRUD similaire; validation `provinceId` existant.
- Arrondissement : filtre obligatoire par ville; validation `cityId`.
- Quartier : filtre obligatoire par arrondissement; validation `districtId`.

### 7. Stratégie d’implémentation (plan)
1) Ajouter les types dans `src/types/types.ts` + routes admin.
2) Créer schémas Zod (`geographie.schema.ts`) pour les quatre formulaires.
3) Implémenter repositories Firestore (CRUD + requêtes filtrées + index nécessaires).
4) Implémenter services avec validations parent/enfant et horodatage/audit.
5) Étendre `RepositoryFactory` et `ServiceFactory` pour la géographie.
6) Créer hooks React Query (listes, détails, mutations) + `useGeoOptions`.
7) Construire composants UI (tables + dialogs) alignés sur shadcn + patterns existants.
8) Ajouter pages Next admin avec onglets; connecter routes et navigation.
9) Tests manuels : création en chaîne (Province → Ville → Arrondissement → Quartier), suppression contrôlée (bloquer suppression si enfants existants ou proposer cascade avec confirmation).

### 8. Points d’attention spécifiques
- Respect des formats Gabon si codes/provenances officielles sont fournis (à confirmer).
- Gestion des ordres d’affichage optionnels (`displayOrder`) pour maîtriser les listes déroulantes.
- Prévoir seed minimal pour tests (1 province, 1 ville, 1 arrondissement, 1 quartier) via un script ou une page dédiée admin.
- Traçabilité : toujours remplir `createdBy/updatedBy` depuis `useAuth`.

