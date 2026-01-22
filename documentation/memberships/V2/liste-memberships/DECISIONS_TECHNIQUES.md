# Décisions techniques – Liste des membres (V2)

## Vue d'ensemble

Ce document décrit les décisions techniques prises lors du refactoring de la fonctionnalité `liste-memberships` vers l'architecture V2.

## 1. Architecture et organisation

### 1.1 Structure des fichiers

**Décision** : Organisation par domain avec séparation claire des responsabilités.

```
src/domains/memberships/
├── components/
│   ├── list/              # Composants spécifiques à la liste
│   │   ├── MembershipsListStats.tsx
│   │   ├── MembershipsListHeader.tsx
│   │   ├── MembershipsListTabs.tsx
│   │   ├── MembershipsListFilters.tsx
│   │   ├── MembershipsListLayout.tsx
│   │   ├── MembershipsListPagination.tsx
│   │   ├── MembershipsListSkeleton.tsx
│   │   ├── MembershipsListErrorState.tsx
│   │   └── MembershipsListEmptyState.tsx
│   └── page/
│       └── MembershipsListPage.tsx    # Container principal
├── hooks/
│   └── useMembershipsListV2.ts       # Hook agrégateur
├── repositories/
│   └── MembersRepositoryV2.ts        # Accès données
└── services/
    └── MembershipsListService.ts     # Logique métier (stats, filtres)
```

**Justification** :
- Séparation claire des responsabilités (présentation / logique / données)
- Réutilisabilité des composants
- Facilité de test
- Alignement avec le pattern DDD (Domain-Driven Design)

### 1.2 Renommage du composant principal

**Décision** : `MembershipList.tsx` → `MembershipsListPage.tsx`

**Justification** :
- Nom plus explicite (Page vs List)
- Cohérence avec la convention de nommage (pluriel : Memberships)
- Indique clairement qu'il s'agit d'un container de page

## 2. Pagination côté serveur

### 2.1 Utilisation de `getCountFromServer()`

**Décision** : Utiliser `getCountFromServer()` pour obtenir le vrai `totalItems`.

**Implémentation** :
```typescript
// Dans getMembers() (member.db.ts)
const countQuery = query(membersRef, ...countConstraints)
const countSnapshot = await getCountFromServer(countQuery)
const totalItems = countSnapshot.data().count
```

**Justification** :
- Permet d'obtenir le vrai total basé sur les filtres Firestore
- Évite de récupérer tous les documents pour compter
- Performance optimale (requête séparée mais optimisée)

**Limitation connue** :
- Si des filtres sont appliqués côté client (recherche texte, adresse, profession), le `totalItems` peut être ajusté pour refléter le résultat filtré côté client si tous les résultats tiennent sur une seule page.

### 2.2 Pagination par curseur

**Décision** : Implémenter une pagination hybride (curseur + numéro de page).

**Implémentation** :
- Navigation immédiate (page suivante/précédente) : utilise le curseur (`goToNextPage()`, `goToPrevPage()`)
- Saut de page (ex: page 1 → page 5) : utilise la pagination par numéro de page
- Historique des curseurs : `cursorHistoryRef` pour permettre la navigation arrière

**Justification** :
- Performance optimale pour navigation séquentielle (curseur)
- Flexibilité pour sauts de page (numéro de page)
- Meilleure UX (navigation fluide)

**Code clé** :
```typescript
// Dans useMembershipsListV2.ts
const cursorHistoryRef = useRef<DocumentSnapshot[]>([])
const [currentCursor, setCurrentCursor] = useState<DocumentSnapshot | null>(null)
const [isUsingCursor, setIsUsingCursor] = useState(false)
```

### 2.3 Calcul de `totalPages`

**Décision** : `totalPages = Math.ceil(totalItems / itemsPerPage)` basé sur le vrai `totalItems`.

**Justification** :
- Calcul correct basé sur le total réel
- Cohérence avec `totalItems` obtenu via `getCountFromServer()`

## 3. Performance et optimisation

### 3.1 Parallélisation des appels `getMemberWithSubscription()`

**Décision** : Utiliser `Promise.all()` pour paralléliser les appels.

**Implémentation** :
```typescript
// Dans getMembers() (member.db.ts)
const docsToProcess = querySnapshot.docs.slice(0, itemsPerPage)
const memberPromises = docsToProcess.map(doc => getMemberWithSubscription(doc.id))
const memberResults = await Promise.all(memberPromises)
```

**Justification** :
- Évite le problème N+1 queries
- Améliore significativement les performances (appels en parallèle au lieu de séquentiel)
- Réduction du temps de chargement

**Impact** : Réduction du temps de chargement de ~N×latence à ~latence (où N = nombre de membres par page).

### 3.2 Cache React Query

**Décision** : Utiliser React Query avec clé de cache incluant filtres, page, et curseur.

**Configuration** :
```typescript
staleTime: 5 * 60 * 1000,  // 5 minutes
gcTime: 10 * 60 * 1000,    // 10 minutes
refetchOnWindowFocus: false
```

**Justification** :
- Évite les appels multiples pour les mêmes données
- Meilleure performance et UX
- Invalidation automatique lors des changements de filtres

## 4. Gestion des tabs (presets de filtres)

### 4.1 Mapping tab → filtres

**Décision** : Utiliser `MembershipsListService.buildFiltersForTab()` pour mapper les tabs aux filtres.

**Implémentation** :
```typescript
static buildFiltersForTab(baseFilters: UserFilters = {}, tab?: MembersTab): UserFilters {
  switch (tab) {
    case 'adherents':
      return { ...baseFilters, membershipType: ['adherant'] }
    case 'bienfaiteurs':
      return { ...baseFilters, membershipType: ['bienfaiteur'] }
    // ...
  }
}
```

**Justification** :
- Centralisation de la logique de mapping
- Facilité d'ajout de nouveaux tabs
- Séparation des responsabilités (service vs hook)

### 4.2 Réinitialisation de la pagination

**Décision** : Réinitialiser `currentPage` à 1 lors du changement de tab ou de filtres.

**Implémentation** :
```typescript
useEffect(() => {
  setCurrentPage(1)
}, [filters, activeTab])
```

**Justification** :
- Comportement intuitif pour l'utilisateur
- Évite les pages vides lors du changement de filtres

## 5. Composants présentatifs

### 5.1 Extraction des sous-composants

**Décision** : Extraire chaque section en composant présentatif dédié.

**Composants créés** :
- `MembershipsListStats` : Carrousel de statistiques
- `MembershipsListHeader` : Titre, compteur, actions
- `MembershipsListTabs` : Tabs de filtres prédéfinis
- `MembershipsListFilters` : Wrapper autour de `MemberFilters`
- `MembershipsListLayout` : Grille/liste avec `MemberCard`
- `MembershipsListPagination` : Pagination
- `MembershipsListSkeleton` : État de chargement
- `MembershipsListErrorState` : État d'erreur
- `MembershipsListEmptyState` : État vide

**Justification** :
- Réduction de la complexité du composant principal (~900 lignes → ~479 lignes)
- Réutilisabilité
- Facilité de test
- Maintenance simplifiée

### 5.2 Ajout de `data-testid`

**Décision** : Ajouter des attributs `data-testid` sur tous les composants clés.

**Justification** :
- Facilité de test (sélecteurs stables)
- Meilleure maintenabilité des tests
- Alignement avec les bonnes pratiques de test

## 6. Responsive mobile

### 6.1 Tabs scrollables horizontalement

**Décision** : Implémenter un scroll horizontal pour les tabs sur mobile.

**Implémentation** :
- Container avec `overflow-x-auto` et `no-scrollbar`
- Tabs avec `flex min-w-max` et `shrink-0`
- Gradients de fade sur les bords pour indiquer le scroll
- Réduction des paddings et gaps sur mobile

**Justification** :
- Évite le chevauchement des tabs sur petits écrans
- Navigation fluide et intuitive
- Indicateurs visuels clairs

### 6.2 Classe CSS `no-scrollbar`

**Décision** : Créer une classe utilitaire pour masquer la barre de défilement tout en gardant le scroll fonctionnel.

**Implémentation** :
```css
.no-scrollbar {
  -ms-overflow-style: none;  /* IE et Edge */
  scrollbar-width: none;  /* Firefox */
}

.no-scrollbar::-webkit-scrollbar {
  display: none;  /* Chrome, Safari et Opera */
}
```

**Justification** :
- UX plus propre (pas de barre de défilement visible)
- Scroll toujours fonctionnel
- Compatibilité cross-browser

## 7. Tests

### 7.1 Tests d'intégration

**Décision** : Créer des tests d'intégration couvrant les scénarios principaux.

**Résultat** : 9/9 tests passent (8 tests d'intégration + 1 test de pagination avec 2 sous-tests).

**Scénarios testés** :
- ✅ Chargement réussi
- ✅ Erreur réseau
- ✅ Changement de tab
- ✅ Pagination (totalItems, totalPages, curseur)
- ✅ Toggle vue grille/liste
- ✅ Export
- ✅ Ouverture détails membre
- ✅ État vide

**Tests recommandés en E2E** :
- Filtres avancés (géographie, entreprise, profession)
- Recherche texte (nom, matricule, email)

### 7.2 Génération de données de test

**Décision** : Créer une fonction `generateFakeMembers()` pour générer 20 membres fictifs.

**Justification** :
- Tests plus réalistes
- Couverture de différents cas (types d'adhésion, genres, abonnements)
- Facilité de maintenance des tests

## 8. Points d'attention et limitations

### 8.1 Filtres côté client

**Limitation** : Certains filtres (recherche texte, adresse, profession) sont encore appliqués côté client dans `getMembers()`.

**Impact** :
- La recherche texte ne porte que sur les membres de la page actuelle
- Les filtres géographiques et professionnels sont appliqués après récupération

**Solution future** :
- Créer un champ `searchableText` indexé dans Firestore
- Déplacer les filtres géographiques et professionnels côté Firestore
- Créer les index composites nécessaires

### 8.2 Stats calculées côté client

**Décision** : Les stats sont calculées côté client à partir des données paginées.

**Justification** :
- Volume acceptable (12 membres par page)
- Calcul simple et rapide
- Pas besoin de requête supplémentaire

**Alternative future** : Si le volume augmente, envisager un calcul côté serveur via Cloud Function.

## 9. Compatibilité et migration

### 9.1 Conservation de l'UI/UX

**Décision** : Conserver exactement le même design et comportement.

**Justification** :
- Pas de disruption pour les utilisateurs
- Migration transparente
- Focus sur l'architecture, pas sur le design

### 9.2 Outils de test en développement

**Décision** : Conserver les outils de test/debug en développement uniquement.

**Justification** :
- Utiles pour le développement et les tests
- N'apparaissent pas en production
- Facilite le debugging

## 10. Prochaines étapes recommandées

1. **Tests unitaires** : Ajouter les tests unitaires pour repository, service et hook (≥80% couverture).
2. **Filtres côté serveur** : Déplacer les filtres texte/adresse/profession côté Firestore.
3. **Tests E2E** : Implémenter les tests E2E pour filtres avancés et recherche texte.
4. **Optimisation Cloud Functions** : Si nécessaire, créer des Cloud Functions pour stats globales.

## 11. Métriques de succès

- ✅ Réduction du code : ~900 lignes → ~479 lignes (47% de réduction)
- ✅ Tests d'intégration : 9/9 passent
- ✅ Performance : Parallélisation des appels (réduction N+1 queries)
- ✅ Pagination : Vrai `totalItems` et `totalPages` calculés correctement
- ✅ Responsive : Tabs scrollables sur mobile
- ✅ Architecture : Séparation claire des responsabilités

## 12. Références

- **Repository** : `src/domains/memberships/repositories/MembersRepositoryV2.ts`
- **Service** : `src/domains/memberships/services/MembershipsListService.ts`
- **Hook** : `src/domains/memberships/hooks/useMembershipsListV2.ts`
- **Composant principal** : `src/domains/memberships/components/page/MembershipsListPage.tsx`
- **Tests** : `src/domains/memberships/__tests__/integration/memberships-list.integration.test.tsx`
- **Documentation** : `documentation/memberships/V2/liste-memberships/`
