# Architecture du projet Kara Client Front

## Vue d’ensemble

- `src/firebase` contient toute l’intégration Firebase (Firestore, Storage, Auth, Messaging). Ces helpers de base de données sont le point d’entrée unique pour l’accès aux données et aux services Firebase.
- Les données persistent dans Firestore/Storage via `src/repositories/**`. Chaque module possède ses repositories dédiés qui encapsulent les requêtes vers Firebase. Pas de logique métier dans cette couche.
- Les services métier se trouvent dans `src/services/**`. Ils orchestrent les repositories, appliquent les règles métier et exposent des méthodes de haut niveau.
- Les factories (`src/factories/**`) instancient repositories et services. Elles garantissent l’injection correcte des dépendances : `RepositoryFactory` produit les repositories, `ServiceFactory` reçoit les repositories et retourne les services prêts à l’emploi. On injecte ensuite ces services dans les hooks ou les médiateurs via les factories.
- Les hooks (`src/hooks/**`) consomment exclusivement les services (jamais les repositories directement). Ils gèrent l’état React Query, les effets et exposent des helpers prêts pour l’UI.
- Les médiateurs (`src/mediators/**`) coordonnent plusieurs services lorsque nécessaire (ex. formulaires multi-étapes) avant de renvoyer les données aux composants.
- Les composants sont rangés par vue dans `src/components/<module>/`. Ils se limitent au rendu (HTML/JSX, Tailwind CSS, composants UI shadcn). Aucune logique métier directe : seulement de la composition, des interactions et l’appel aux hooks/médiateurs.
- Les pages Next.js pour l’espace admin vivent dans `src/app/(admin)/...`. Chaque nouveau module admin reçoit sa route ici.

## Flux d’injection des dépendances

```
firebase => repositories => factory
factory.repositories => services
factory.services => hooks | mediators
mediators => components
hooks => components
```

- Jamais de saut direct : un service ne parle pas à Firebase sans passer par un repository, un composant ne parle pas à un service sans passer par un hook ou un médiateur si besoin.
- Avant toute implémentation, vérifier si un design pattern dédié convient. Si oui, créer un sous-dossier dans `src/` portant le nom du pattern (ex. `src/factories`).

## Règles par couche

- **Firebase (`src/firebase`)** : configuration client & admin, adaptateurs partagés. On n’importe pas Firebase ailleurs que dans les repositories.
- **Repositories (`src/repositories`)** : accès bruts aux collections, sous-collections et storage. Chaque module a son sous-dossier (`bienfaiteur`, `caisse-imprevue`, etc.). Interfaces communes dans `IRepository.ts`.
- **Services (`src/services`)** : logique métier pure, aucune logique de rendu. Utilisent les repositories via les factories.
- **Factories (`src/factories`)** : centralisent la création et l’injection. Toute nouvelle dépendance doit passer par une factory correspondante.
- **Hooks (`src/hooks`)** : exposition des données pour React. `react-hook-form`, React Query, formatage UI. Les hooks n’implémentent pas les règles métier.
- **Médiateurs (`src/mediators`)** : orchestrent plusieurs services ou workflows complexes (formulaires, navigation). Ils consomment les services provenant des factories.
- **Composants (`src/components`)** : classés par vue. Exemple : `components/bienfaiteur/*` pour les écrans Bienfaiteur. Utilisent exclusivement les primitives UI de `src/components/ui`.
- **Pages (`src/app/(admin)`)** : point d’entrée Next.js pour chaque module admin. Importent les composants prêts à l’emploi.

## Conventions transverses

- **Constantes** : toute constante (routes, libellés, codes, etc.) va dans `src/constantes`. Les routes **doivent** être ajoutées ou étendues dans `src/constantes/routes.ts`.
- **Types & modèles** : tous les types TypeScript résident dans `src/types/types.ts`. Chaque nouveau modèle doit y être défini pour centraliser la connaissance métier.
- **Schemas de formulaires** : tous les formulaires utilisent `react-hook-form` + Zod. Les schemas se trouvent dans `src/schemas`. Exemple : `src/schemas/bienfaiteur.schema.ts` pour les formulaires Bienfaiteur.
- **Providers (`src/providers`)** : création des contextes React et wrappers globaux (Auth, React Query, formulaires spécialisés, etc.).
- **UI (`src/components/ui`)** : bibliothèque UI shadcn/maison. Tous les nouveaux composants doivent réutiliser ces primitives (Button, Card, Tabs, Dialog, etc.).
- **Modules** : chaque module suit la structure complète (repositories → services → hooks → composants). Exemple : le module Bienfaiteur range ses composants dans `components/bienfaiteur/`, ses hooks dans `hooks/bienfaiteur/`, ses services dans `services/bienfaiteur/`, etc.

## Bonnes pratiques

- Respecter strictement la séparation des responsabilités :
  - **Composants/Vues** : uniquement UI/UX (JSX, Tailwind, animation).
  - **Services** : règles, calculs, appels multiples, transactions logiques.
  - **Repositories** : accès brut aux données.
- Toujours vérifier l’existence d’un hook/service/mediator avant d’en créer un nouveau pour éviter les doublons.
- Lorsqu’un formulaire est nécessaire : créer/étendre le schema Zod dans `src/schemas`, utiliser `react-hook-form` et brancher le service adapté via un hook.
- Ajouter systématiquement les routes admin/public dans `src/constantes/routes.ts` pour garder la navigation centralisée.
- Documenter toute architecture ou convention additionnelle dans `docs/architecture/`.

## Exemple : module Bienfaiteur

- Firebase : `src/firebase/*`
- Repositories : `src/repositories/bienfaiteur/*`
- Services : `src/services/bienfaiteur/*`
- Factories : `src/factories/{Repository,Service}Factory.ts`
- Hooks : `src/hooks/bienfaiteur/*`
- Composants : `src/components/bienfaiteur/*`
- Pages : `src/app/(admin)/bienfaiteur/...`
- Schemas : `src/schemas/bienfaiteur.schema.ts`
- Routes : ajout dans `src/constantes/routes.ts`
- Types : ajout des modèles dans `src/types/types.ts`

Cette architecture garantit une séparation claire, facilite les tests et permet l’évolution modulaire du projet.

