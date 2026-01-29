# Analyse : Recherche côté serveur paginée avec searchableText

> **Contexte** : Ce document analyse et spécifie la recherche des demandes Caisse Imprévue avec le champ `searchableText` (nom, prénom, matricule).
> **Référence** : `documentation/caisse-imprevue/V2/recherche-demande/`
> **Décision** : Approche searchableText (pas Algolia, pas memberLastName seul)

---

## 1. État des lieux

### 1.1 Ce qui est documenté

| Document | Contenu |
|----------|---------|
| `activite/RechercherDemandes.puml` | Workflow recherche avec searchableText, pagination, tabs |
| `sequence/SEQ_RechercherDemandes.puml` | Séquence avec `useCaisseImprevueDemands` et `searchQuery` dans filters |
| `demande/firebase/INDEXES.md` | Index pour recherche par `searchableText` |

### 1.2 Ce qui est implémenté (état actuel)

- **DemandSearchV2** : Composant avec input de recherche, utilise `useDemandSearch`
- **useDemandSearch** : Hook séparé avec cache 2 min, limit 50
- **DemandCIRepository.search()** : Recherche Firestore par préfixe `memberLastName` + filtre prénom côté client
- **Problème** : La recherche n'est **pas connectée** à la liste principale. `DemandSearchV2` ne passe pas `onResultsChange` à `ListDemandesV2`, et la liste utilise `useCaisseImprevueDemands` sans `searchQuery`.

### 1.3 Problèmes identifiés

1. **Recherche non intégrée** : Le champ de recherche existe mais ne filtre pas la liste affichée
2. **Pas de pagination** : La recherche actuelle retourne max 50 résultats, sans pagination
3. **Filtre prénom côté client** : Incompatible avec pagination (total et curseurs incorrects)
4. **Double source de données** : Liste = `useCaisseImprevueDemands`, Recherche = `useDemandSearch` (séparés)
5. **Pas de matricule** : La recherche actuelle ne couvre que nom/prénom (et prénom côté client)

---

## 2. Cahier des charges

### 2.1 Objectifs

- **Recherche par nom, prénom et matricule** : Via un champ `searchableText` agrégé
- **Recherche côté serveur** : Les requêtes Firestore incluent le critère de recherche
- **Recherche paginée** : Même mécanisme que la liste (cursor-based, page 1, 2, 3...)
- **Intégration liste** : Une seule source de données, la recherche filtre la liste principale
- **Tabs par statut** : Toutes, En attente (PENDING), Acceptées (APPROVED), Refusées (REJECTED), Réouverte (REOPENED)
- **Combinaison filtres** : Recherche + statut (tab) + fréquence de paiement + tri (date, A-Z, Z-A)
- **Résultats paginés** : Avec total correct et curseurs

### 2.2 Contraintes Firestore

| Contrainte | Impact |
|------------|--------|
| **Une seule inégalité par requête** | On ne peut pas faire `memberLastName >= X` ET `memberFirstName >= Y` |
| **Recherche par préfixe uniquement** | Firestore ne supporte pas "contains". Le préfixe matche le **début** de la chaîne |
| **Index composites obligatoires** | Chaque combinaison (recherche + filtre + tri) nécessite un index |
| **Ordre des champs dans l'index** | Égalité d'abord, puis inégalité (searchableText), puis orderBy |

### 2.3 Champ searchableText

**Contenu** : Concaténation normalisée (lowercase, sans accents) de :
- `memberLastName` (nom de famille)
- `memberFirstName` (prénom)
- `memberMatricule` (matricule)

**Format** : `normalize(lastName + ' ' + firstName + ' ' + matricule)`

**Exemple** : `"Dupont Jean 8438.MK.160126"` → `"dupont jean 8438.mk.160126"`

**Limitation Firestore (préfixe)** : La recherche par préfixe ne matche que le **début** de la chaîne. Avec l'ordre `lastName firstName matricule` :
- ✅ "dupont" matche
- ✅ "dupont jean" matche
- ❌ "jean" seul ne matche pas (car la chaîne commence par "dupont")
- ❌ "8438" seul ne matche pas (car la chaîne commence par "dupont")

**Alternative pour couvrir le matricule** : Mettre le matricule en premier → `"8438.mk.160126 dupont jean"`. Alors "8438" matche, mais "dupont" ne matche plus. **On ne peut pas avoir les deux** avec un seul champ. Recommandation : garder `lastName firstName matricule` (recherche par nom prioritaire). Si besoin de recherche par matricule, envisager un second champ `searchableTextMatricule` en Phase 2.

---

## 3. Où et comment ajouter searchableText

### 3.1 Flux de création de demande

```
CreateDemandFormV2 (Step1Member, Step2Forfait, Step3Contact)
  → useDemandForm (données : memberLastName, memberFirstName, memberMatricule)
  → useCreateDemand (mutation)
  → CaisseImprevueService.createDemand(data, createdBy)
  → DemandCIRepository.create(data, memberMatricule)
```

**Point d'ajout** : `DemandCIRepository.create()` — calculer `searchableText` à partir de `data.memberLastName`, `data.memberFirstName`, `data.memberMatricule` avant `setDoc`.

### 3.2 Flux de mise à jour

Les mises à jour partielles (`update`, `accept`, `reject`, `reopen`) ne modifient **pas** les champs membre (memberLastName, memberFirstName, memberMatricule). Donc **pas de mise à jour de searchableText** dans ces opérations.

**Exception** : Si un futur `UpdateCaisseImprevueDemandInput` permet de modifier les infos membre (nom, prénom), alors `DemandCIRepository.update()` devra recalculer `searchableText`.

### 3.3 Fonction de génération

```typescript
function generateDemandSearchableText(
  lastName: string,
  firstName: string,
  matricule: string
): string {
  return [lastName, firstName, matricule]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
}
```

**Réutiliser** le pattern de `BaseGeographyRepository.generateSearchableText()` ou créer une utilitaire partagée dans `src/utils/`.

---

## 4. Architecture retenue : searchableText intégré à getPaginated

### 4.1 Principe

- Ajouter `searchQuery?: string` à `DemandFilters`
- Quand `searchQuery` est défini et `length >= 2`, `getPaginated` ajoute les contraintes Firestore sur `searchableText`
- Une seule méthode, une seule source de données
- Pagination cursor-based inchangée
- Cohérent avec filtres (statut, fréquence) et tri

### 4.2 Tabs et filtres

| Tab | status dans effectiveFilters |
|-----|------------------------------|
| Toutes | `'all'` (pas de where status) |
| En attente | `'PENDING'` |
| Acceptées | `'APPROVED'` |
| Refusées | `'REJECTED'` |
| Réouverte | `'REOPENED'` |

La recherche s'applique **dans** le tab actif. Ex. : tab "En attente" + recherche "dupont" → demandes PENDING dont searchableText commence par "dupont".

### 4.3 Combinaison avec filtres et tri

| Filtre | Champ Firestore | Type |
|--------|-----------------|------|
| Statut (tab) | `status` | equality |
| Fréquence | `paymentFrequency` | equality |
| Recherche | `searchableText` | range (>=, <=) |

| Tri | Champs Firestore |
|-----|------------------|
| Plus récents | `orderBy('createdAt', 'desc')` |
| Plus anciens | `orderBy('createdAt', 'asc')` |
| A-Z | `orderBy('memberLastName', 'asc')`, `orderBy('memberFirstName', 'asc')` |
| Z-A | `orderBy('memberLastName', 'desc')`, `orderBy('memberFirstName', 'desc')` |

**Contrainte Firestore** : Quand on a une inégalité sur `searchableText`, le premier `orderBy` doit être sur `searchableText`. On utilisera donc :
- `orderBy('searchableText', 'asc')` comme premier orderBy (obligatoire pour la range)
- Puis `orderBy('createdAt', 'desc')` ou `orderBy('memberLastName', 'asc')` selon le tri choisi

Cela signifie que **lors d'une recherche**, le tri utilisateur sera appliqué en second (tie-break). Les résultats seront d'abord regroupés par préfixe searchableText, puis triés par date ou nom. C'est un compromis acceptable.

### 4.4 Pagination

- Cursor-based : `startAfter(lastDoc)` avec le dernier document de la page précédente
- `limit(pageSize)` : 10, 25, 50, 100
- Total : `getCountFromServer` sur la même query (sans limit/startAfter)

---

## 5. Index Firestore requis

### 5.1 Règle d'ordre des champs

Pour une requête avec :
- `where('status', '==', X)` (equality)
- `where('paymentFrequency', '==', Y)` (equality)
- `where('searchableText', '>=', Z)` et `where('searchableText', '<=', Z+'\uf8ff')` (range)
- `orderBy('searchableText', 'asc')` (obligatoire pour la range)
- `orderBy('createdAt', 'desc')` ou `orderBy('memberLastName', 'asc')` (tri secondaire)

L'index doit avoir : `status`, `paymentFrequency`, `searchableText`, puis le champ de tri, puis `__name__`.

### 5.2 Index à ajouter dans firestore.indexes.json

**Recherche seule (sans filtre statut/fréquence)** :
- `searchableText`, `createdAt`, `__name__` (tri date)
- `searchableText`, `memberLastName`, `memberFirstName`, `__name__` (tri alphabétique)

**Recherche + statut** :
- `status`, `searchableText`, `createdAt`, `__name__`
- `status`, `searchableText`, `memberLastName`, `memberFirstName`, `__name__`

**Recherche + statut + fréquence** :
- `status`, `paymentFrequency`, `searchableText`, `createdAt`, `__name__`
- `status`, `paymentFrequency`, `searchableText`, `memberLastName`, `memberFirstName`, `__name__`

**Variantes asc/desc** : Pour `createdAt` desc vs asc, et `memberLastName` asc vs desc, Firestore peut exiger des index distincts. Vérifier les erreurs à l'exécution et ajouter les index suggérés par Firebase.

### 5.3 Vérification

Vérifier que ces index existent ou sont ajoutés dans `firestore.indexes.json` avant implémentation. Référence : `firebase/INDEXES.md` et `firebase/indexes.recherche.json` dans ce dossier.

---

## 6. Fichiers impactés

| Fichier | Modification |
|---------|--------------|
| `entities/demand-filters.types.ts` | `searchQuery?: string` déjà présent |
| `entities/demand.types.ts` | Ajouter `searchableText?: string` à l'interface (optionnel, pour typage) |
| `repositories/DemandCIRepository.ts` | 1) `create()` : ajouter searchableText. 2) `getPaginated()` : gérer searchQuery avec where searchableText. 3) `update()` : recalculer searchableText si memberLastName/FirstName/Matricule modifiés |
| `repositories/IDemandCIRepository.ts` | Signature getPaginated inchangée (searchQuery dans filters) |
| `components/demandes/ListDemandesV2.tsx` | État `searchQuery`, passer à `effectiveFilters`, connecter `DemandSearchV2` en mode contrôlé |
| `components/demandes/filters/DemandSearchV2.tsx` | Props `value`/`onChange` (composant contrôlé), debounce 300ms, supprimer `useDemandSearch` |
| `hooks/useDemandSearch.ts` | À supprimer ou déprécier |
| `scripts/migrate-demands-searchable-text.ts` | Nouveau script pour migrer les demandes existantes (ajouter searchableText) |
| `firestore.indexes.json` | Ajouter les index recherche + searchableText |

---

## 7. Migration des données existantes

Les demandes créées avant l'implémentation n'ont pas `searchableText`. Il faut un script de migration (comme `scripts/migrate-searchable-text.ts` pour la géographie) qui :

1. Parcourt la collection `caisseImprevueDemands`
2. Pour chaque document : calcule `searchableText` à partir de `memberLastName`, `memberFirstName`, `memberMatricule`
3. Met à jour le document avec `searchableText`

**Commande** : `pnpm tsx scripts/migrate-demands-searchable-text.ts [dev|preprod|prod]`

---

## 8. Diagrammes

Les diagrammes UML sont dans ce dossier :
- **Activité** : `activite/RechercherDemandes.puml`
- **Séquence** : `sequence/SEQ_RechercherDemandes.puml`

---

## 9. Checklist avant implémentation

- [ ] Valider cette analyse avec l'équipe
- [ ] Décider l'ordre des champs dans searchableText (lastName firstName matricule vs matricule lastName firstName)
- [ ] Vérifier les index Firestore dans firestore.indexes.json
- [ ] Mettre à jour VERIFICATION_DIAGRAMMES.md dans demande/
- [ ] Mettre à jour firebase/INDEXES.md si nouveaux index
- [x] Mettre à jour WORKFLOW.md avec la tâche recherche (voir WORKFLOW.md)
- [ ] Créer les tests E2E (recherche + pagination) dans tests/TESTS_E2E.md
- [ ] Exécuter le script de migration sur dev avant tests

---

## 10. Références

- [Firestore : Requêtes avec inégalités](https://cloud.google.com/firestore/docs/query-data/queries#inequality)
- [Firestore : Index composites](https://cloud.google.com/firestore/docs/query-data/indexing)
- Géographie : `BaseGeographyRepository.getPaginated` avec searchableText (pattern similaire)
- Géographie : `scripts/migrate-searchable-text.ts` (pattern de migration)
