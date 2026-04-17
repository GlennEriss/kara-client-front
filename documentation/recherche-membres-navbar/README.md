# Recherche de Membres dans la Navbar

## Objectif

Ajouter dans la navbar (juste avant l'icône de notification) une recherche membre globale permettant:

1. De retrouver rapidement un membre.
2. D'ouvrir une vue consolidée de ses dossiers actifs/non clôturés.
3. D'accéder directement aux pages module concernées.

## Contrainte d'architecture (obligatoire)

Cette feature doit suivre l'architecture `domains-first` du projet.

- Pas de nouveau code métier dans `src/services/*` legacy.
- Le flux cible: `components -> hooks -> services -> repositories -> firebase`.
- Les types/contrats de la feature doivent vivre dans `entities` du domaine.

## Positionnement UI

- Emplacement: header `LayoutDashboard`, immédiatement avant `NotificationBell`.
- Composant recommandé: `MemberGlobalSearch` (nouveau composant dédié).
- Comportement:
  - Saisie type-ahead (nom, prénom, matricule, téléphone).
  - Sélection d'un membre.
  - Ouverture d'un panneau résumé (drawer/modal) avec ses dossiers filtrés.

## Règles métier à afficher

### 1) Caisse spéciale

- Demandes (`/caisse-speciale/demandes`): uniquement `PENDING` et `APPROVED`.
- Contrats (`/caisse-speciale` ou `/caisse-speciale/contrats` selon navigation): uniquement non clôturés.

### 2) Caisse imprévue

- Demandes (`/caisse-imprevue/demandes`): uniquement `PENDING` et `APPROVED`.
- Contrats (`/caisse-imprevue`): uniquement en cours (`ACTIVE`).

### 3) Crédit spéciale

- Demandes (`/credit-speciale/demandes`): `PENDING` ou `APPROVED` avec contrat non créé.
- Contrats (`/credit-speciale/contrats`): exclure `CLOSED` et `DISCHARGED`.

### 4) Crédit fixe / Crédit aide / Placement (même logique)

- Demandes: `PENDING` et `APPROVED` (selon besoin: avec ou sans contrat créé).
- Contrats: uniquement non clôturés/non déchargés.

## Algolia: utile ou non?

Oui, utile pour la partie "trouver le membre rapidement".

- À conserver: Algolia pour l'autocomplete membre (déjà présent dans le projet).
- À éviter: indexer tout l'état métier multi-modules dans Algolia (complexité élevée de synchro).
- Recommandation: architecture hybride.
  - Algolia = recherche membre.
  - Firestore = chargement des dossiers métier filtrés par statut.

## Architecture proposée (claire et pragmatique)

### A. Frontend

1. `MemberGlobalSearch` dans la navbar.
2. Au clic sur un membre, appel d'un endpoint d'agrégation.
3. Affichage d'un `MemberOverviewPanel` découpé en sections:
   - Profil membre
   - Caisse spéciale
   - Caisse imprévue
   - Crédit spéciale
   - Crédit fixe
   - Crédit aide
   - Placement

### B. Backend d'agrégation

Créer une verticale dédiée dans `domains`, par exemple:

```txt
src/domains/dashboard/member-overview/
  entities/
    member-overview.types.ts
    member-overview-status-filters.ts
  repositories/
    IMemberOverviewRepository.ts
    MemberOverviewRepository.ts
  services/
    MemberOverviewAggregationService.ts
  hooks/
    useMemberGlobalSearch.ts
    useMemberOverview.ts
  components/
    MemberNavbarSearch.tsx
    MemberOverviewPanel.tsx
```

Intégration:

- `src/components/layout/LayoutDashboard.tsx` importe `MemberNavbarSearch` (composant de domaine).
- Le composant de domaine reste la source de vérité fonctionnelle.

Rôle:

1. Recevoir `memberId`.
2. Interroger en parallèle les collections concernées.
3. Appliquer les filtres de statuts métier.
4. Retourner un payload unique et stable pour le frontend.

### C. Contrat de réponse recommandé

```ts
type MemberOverviewResponse = {
  member: {
    id: string
    matricule?: string
    firstName: string
    lastName: string
    contacts?: string[]
  }
  modules: {
    caisseSpeciale: { demandes: any[]; contrats: any[] }
    caisseImprevue: { demandes: any[]; contrats: any[] }
    creditSpeciale: { demandes: any[]; contrats: any[] }
    creditFixe: { demandes: any[]; contrats: any[] }
    creditAide: { demandes: any[]; contrats: any[] }
    placement: { demandes: any[]; contrats: any[] }
  }
  counts: Record<string, number>
  generatedAt: string
}
```

## Plan d'implémentation recommandé

1. UI navbar:
   - Intégrer la recherche avant la cloche.
   - Réutiliser le service/hook Algolia membres existant.
2. Domaine d'agrégation:
   - Implémenter `MemberOverviewAggregationService` (domaine dashboard).
   - Implémenter `MemberOverviewRepository` pour les lectures Firestore.
   - Centraliser les statuts dans `member-overview-status-filters.ts`.
3. Vue résumé membre:
   - Cartes par module + liens "Voir tout" vers les routes existantes.
4. Performance:
   - Limiter le volume retourné (ex: 5 à 10 items par section).
   - Ajouter/valider les indexes Firestore nécessaires.
5. Sécurité:
   - Vérifier les rôles autorisés (admin/agent).
   - Ne pas exposer des champs sensibles non nécessaires.

## Points de vigilance

1. Harmoniser la définition "non clôturé" par module (ex: `Closed`, `DISCHARGED`, `EarlyExit`, `Canceled`).
2. Vérifier la différence route listing contrats:
   - `/caisse-speciale` vs `/caisse-speciale/contrats`
   - `/caisse-imprevue` vs `/caisse-imprevue/contrats`
3. Clarifier pour les demandes approuvées:
   - garder toutes les approuvées
   - ou seulement celles sans contrat (`contractId` absent)

## Décision proposée pour le MVP

1. Recherche membre: Algolia (réutilisation immédiate de l'existant).
2. Résumé métier: agrégation Firestore via `src/domains/dashboard/member-overview/*`.
3. Affichage: panneau unique accessible depuis la navbar.
4. Scope MVP: Caisse spéciale + Caisse imprévue + Crédit spéciale en premier, puis Crédit fixe/Aide/Placement.
