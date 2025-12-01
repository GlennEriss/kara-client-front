# Mise à jour du statut véhicule des membres

## 1. Objectif

Permettre la mise à jour du statut `hasCar` (avec véhicule / sans véhicule) des membres directement depuis une interface dédiée dans la page de gestion des membres.

Cette fonctionnalité permettra aux administrateurs de :
- Visualiser tous les membres dans une liste simplifiée
- Mettre à jour rapidement le statut véhicule de chaque membre via un switch
- Identifier visuellement les membres avec ou sans véhicule
- Gérer efficacement les informations véhicules des membres

## 2. Contexte technique

### 2.1 Données existantes

- Les membres ont un champ `hasCar: boolean` dans leur profil (`User` interface)
- Le filtre `hasCar` existe déjà dans `MemberFilters.tsx`
- La fonction `getMembers()` dans `member.db.ts` supporte déjà le filtre `hasCar`

### 2.2 Architecture actuelle

- **Page principale** : `src/app/(admin)/memberships/page.tsx`
- **Composant liste** : `src/components/memberships/MembershipList.tsx`
- **Composant véhicules** : `src/components/memberships/MemberVehicleList.tsx`
- **Base de données** : `src/db/member.db.ts`
- **Hooks** : `src/hooks/useMembers.ts`
- **Types** : `src/types/types.ts`

## 3. Implémentation réalisée

### 3.1 Architecture respectée

L'implémentation suit strictement l'architecture définie dans `docs/architecture/ARCHITECTURE.md` :

1. **Repository** (`src/db/member.db.ts`) : Fonction `updateMemberHasCar()` pour l'accès aux données
2. **Hook** (`src/hooks/useMembers.ts`) : Hook `useUpdateMemberHasCar()` utilisant React Query
3. **Composant** (`src/components/memberships/MemberVehicleList.tsx`) : Interface utilisateur
4. **Page** (`src/app/(admin)/memberships/page.tsx`) : Intégration avec tabs

### 3.2 Structure des tabs

La page de gestion des membres utilise maintenant des **tabs** (`src/components/ui/tabs.tsx`) pour séparer deux vues :

1. **Tab "Liste des membres"** : Vue complète avec filtres, statistiques et détails
2. **Tab "Véhicules des membres"** : Vue simplifiée dédiée à la gestion des véhicules

### 3.3 Composant MemberVehicleList

Le composant `MemberVehicleList.tsx` affiche :

- **Liste simplifiée** des membres avec :
  - Nom et prénom
  - Matricule
  - Switch pour activer/désactiver le statut véhicule
  - Label "Avec véhicule" / "Sans véhicule" selon l'état

- **Fonctionnalités** :
  - Pagination simple (50 membres par page)
  - Mise à jour instantanée via switch
  - Feedback visuel (toasts de succès/erreur)
  - États de chargement (skeletons)
  - Gestion des erreurs

### 3.4 Fonctionnalités techniques

#### Repository (`src/db/member.db.ts`)

```typescript
export async function updateMemberHasCar(
  memberId: string,
  hasCar: boolean,
  updatedBy: string
): Promise<boolean>
```

- Met à jour le champ `hasCar` d'un membre
- Enregistre `updatedBy` et `updatedAt` pour l'audit
- Gère les erreurs et retourne un booléen

#### Hook (`src/hooks/useMembers.ts`)

```typescript
export function useUpdateMemberHasCar()
```

- Utilise React Query `useMutation`
- Invalide automatiquement les caches après mise à jour
- Gère les états de chargement et erreurs

#### Composant (`src/components/memberships/MemberVehicleList.tsx`)

- Utilise `useAllMembers()` pour récupérer les membres
- Utilise `useUpdateMemberHasCar()` pour les mises à jour
- Utilise `useAuth()` pour obtenir l'ID de l'administrateur
- Affiche une liste de cartes avec switch pour chaque membre

## 4. Interface utilisateur

### 4.1 Structure des tabs

```
[Page Gestion des Membres]
├── [Tab 1: Liste des membres]
│   └── MembershipList (vue complète avec filtres)
│
└── [Tab 2: Véhicules des membres]
    └── MemberVehicleList (vue simplifiée)
        ├── En-tête avec statistiques
        ├── Liste des membres (cartes)
        │   ├── Nom, Prénom
        │   ├── Matricule
        │   └── Switch + Label
        └── Pagination
```

### 4.2 Design du switch

- **Switch activé** (vert) : "Avec véhicule"
- **Switch désactivé** (gris) : "Sans véhicule"
- **Label dynamique** : Change selon l'état du switch
- **Feedback visuel** : Toast de confirmation après chaque changement

### 4.3 États et interactions

- **Chargement** : Skeleton loaders pendant le chargement
- **Erreur** : Message d'erreur clair si le chargement échoue
- **Mise à jour** : Switch désactivé pendant la mutation
- **Succès** : Toast de confirmation avec message approprié

## 5. Flux utilisateur

1. **Navigation** : L'utilisateur accède à la page "Gestion des Membres"
2. **Sélection du tab** : Clique sur le tab "Véhicules des membres"
3. **Visualisation** : Voit la liste simplifiée de tous les membres
4. **Modification** : Clique sur le switch d'un membre pour changer son statut
5. **Confirmation** : Reçoit un feedback visuel (toast) confirmant la mise à jour
6. **Rafraîchissement** : La liste se met à jour automatiquement

## 6. Considérations techniques

### 6.1 Performance

- **Pagination** : 50 membres par page pour éviter les surcharges
- **Invalidation ciblée** : Seules les queries concernées sont invalidées
- **Optimistic updates** : Le switch se met à jour immédiatement (via React Query)

### 6.2 Sécurité

- **Authentification** : Vérification de l'utilisateur connecté avant mise à jour
- **Audit** : Enregistrement de `updatedBy` et `updatedAt` pour traçabilité
- **Validation** : Vérification que le membre existe avant mise à jour

### 6.3 UX/UI

- **Feedback immédiat** : Toast de confirmation après chaque action
- **États visuels** : Switch désactivé pendant la mutation
- **Messages clairs** : Labels explicites ("Avec véhicule" / "Sans véhicule")
- **Responsive** : Interface adaptée pour mobile/tablette/desktop

## 7. Fichiers modifiés/créés

### 7.1 Nouveaux fichiers

- `src/components/memberships/MemberVehicleList.tsx` : Composant de liste simplifiée

### 7.2 Fichiers modifiés

- `src/app/(admin)/memberships/page.tsx` : Ajout des tabs
- `src/db/member.db.ts` : Fonction `updateMemberHasCar()`
- `src/hooks/useMembers.ts` : Hook `useUpdateMemberHasCar()`
- `docs/vehicule/MISE_A_JOUR_STATUT_MEMBRES_SANS_VEHICULE.md` : Documentation mise à jour

## 8. Extensions futures possibles

- **Filtres** : Ajouter des filtres dans le tab véhicules (avec/sans véhicule)
- **Recherche** : Barre de recherche pour trouver rapidement un membre
- **Tri** : Options de tri (par nom, matricule, statut véhicule)
- **Export** : Export CSV/PDF de la liste des membres avec leur statut véhicule
- **Statistiques** : Afficher des statistiques (nombre avec/sans véhicule)
- **Actions en masse** : Sélection multiple pour mettre à jour plusieurs membres à la fois

## 9. Conclusion

Cette implémentation offre une solution simple et efficace pour gérer le statut véhicule des membres. L'utilisation de tabs permet de séparer clairement les fonctionnalités tout en gardant une navigation intuitive. Le switch offre une interaction rapide et directe, parfaite pour des mises à jour fréquentes.

L'architecture respectée garantit la maintenabilité et la cohérence avec le reste de l'application.
