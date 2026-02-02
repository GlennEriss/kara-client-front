# Analyse : Algolia InstantSearch vs Firestore pour la liste des agents de recouvrement

> Décision technique : faut-il utiliser Algolia InstantSearch pour la liste, les filtres et la recherche des agents de recouvrement ?

## 📋 Contexte

Le module agent de recouvrement nécessite :
- **Liste** paginée (vue cards/liste)
- **Filtres** : onglets Actifs | Tous | Inactifs
- **Recherche** : nom, prénom, numéro pièce, téléphone
- **Tri** : nom, prénom, date création
- **Stats** : total, actifs, inactifs, hommes, femmes

## 🔍 Usage Algolia dans le projet

| Module | Algolia | Volume | Justification |
|--------|---------|--------|---------------|
| **Membres** | ✅ Oui | Élevé (milliers) | Recherche typo-tolerant, autocomplete |
| **Demandes d'adhésion** | ✅ Oui | Élevé (milliers) | Recherche multi-critères |
| **Agents de recouvrement** | ❓ À décider | **Faible (10-100)** | — |

**Implémentation actuelle** : Le projet utilise **algoliasearch API client + React Query**, pas React InstantSearch. Voir `documentation/memberships/V2/algolia/ANALYSE_SKILL_ALGOLIA.md`.

---

## ⚖️ Comparaison des options

### Option A : Firestore uniquement (recommandé)

| Critère | Évaluation |
|---------|------------|
| **Volume** | 10-100 agents → Firestore suffit largement |
| **Complexité** | Simple : Repository + requêtes Firestore |
| **Coût** | Aucun coût supplémentaire |
| **Synchronisation** | Aucune (données en temps réel) |
| **Recherche** | Champ `searchableText` ou requêtes multi-champs |
| **Cohérence** | Aligné avec caisse-speciale, caisse-imprevue (Firestore) |

**Implémentation** :
- Collection `agentsRecouvrement` avec index Firestore
- **Attributs de recherche obligatoires** : `searchableTextLastNameFirst`, `searchableTextFirstNameFirst`, `searchableTextNumeroFirst` (voir ci-dessous)
- Filtres : `where('actif', '==', true)` ou requête sans filtre actif
- Pagination : `limit()` + `startAfter()`
- Debounce 300 ms sur la recherche

### Option B : Algolia + InstantSearch

| Critère | Évaluation |
|---------|------------|
| **Volume** | Surdimensionné pour 10-100 agents |
| **Complexité** | Élevée : Cloud Function sync, index Algolia, InstantSearch |
| **Coût** | Nouvel index Algolia, opérations API |
| **Synchronisation** | Cloud Function Firestore → Algolia (create/update/delete) |
| **Recherche** | Typo-tolerant, highlighting, facettes natives |
| **Cohérence** | Aligné avec membres, membership-requests |

**Implémentation** :
- Index Algolia `agents_recouvrement`
- Cloud Function `syncAgentsToAlgolia` (onCreate, onUpdate, onDelete)
- React InstantSearch ou API client + React Query
- Attributs recherchables : nom, prenom, pieceIdentite.numero, tel1, tel2
- Facettes : actif, sexe

---

## 🎯 Recommandation : **Firestore uniquement**

### Pourquoi ne pas utiliser Algolia pour les agents ?

1. **Volume trop faible**  
   Les agents sont des employés de la mutuelle (typiquement 10-100). Algolia est conçu pour des volumes plus importants (milliers+). Firestore gère facilement ce volume.

2. **Coût et complexité inutiles**  
   - Nouvel index Algolia = coût API supplémentaire  
   - Cloud Function de synchronisation à maintenir  
   - Risque de désynchronisation Firestore ↔ Algolia  

3. **Cohérence avec les autres modules "petits volumes"**  
   Caisse spéciale et caisse imprévue utilisent Firestore avec `searchableText` pour la recherche. Les agents suivent le même pattern.

4. **Simplicité**  
   Une seule source de vérité (Firestore), pas de sync, pas de latence d’indexation.

### Quand envisager Algolia ?

- Si le volume d’agents dépasse **500-1000**
- Si des besoins avancés apparaissent : autocomplete, typo-tolérance forte, analytics de recherche
- Si une unification de la recherche (membres + agents + demandes) est souhaitée

---

## 📐 Architecture recommandée (Firestore)

```
┌─────────────────────────────────────────────────────────────┐
│  Page /admin/agents-recouvrement                             │
├─────────────────────────────────────────────────────────────┤
│  useAgentsRecouvrementStats()  → Stats (Total, Actifs, etc.)│
│  useAgentsRecouvrement(filters) → Liste paginée + recherche  │
├─────────────────────────────────────────────────────────────┤
│  AgentRecouvrementRepository                                │
│  - getAgentsWithFilters(filters)                            │
│  - getAgentsStats()                                         │
├─────────────────────────────────────────────────────────────┤
│  Firestore : collection agentsRecouvrement                  │
│  - Attributs recherche : searchableTextLastNameFirst, FirstNameFirst, NumeroFirst │
│  - Index : actif + searchableText*, pagination               │
└─────────────────────────────────────────────────────────────┘
```

**Attributs de recherche** (obligatoires, pour recherche par nom, prénom, numéro pièce ou téléphone) :

Firestore impose une contrainte : la recherche par préfixe ne matche que le **début** de la chaîne. **Solution** : 3 champs dénormalisés (comme caisse-speciale, caisse-imprevue) :

| Champ | Ordre | Exemple | Permet de rechercher |
|-------|-------|---------|----------------------|
| `searchableTextLastNameFirst` | nom prénom numéro tel1 tel2 | `dupont jean ab123456 0612345678` | "dupont", "dupont jean" |
| `searchableTextFirstNameFirst` | prénom nom numéro tel1 tel2 | `jean dupont ab123456 0612345678` | "jean", "jean dupont" |
| `searchableTextNumeroFirst` | numéro tel1 tel2 nom prénom | `ab123456 0612345678 dupont jean` | "06", "0612", "ab123" (numéro pièce ou téléphone) |

**Génération** (à chaque create/update) :
```typescript
searchableTextLastNameFirst = `${nom} ${prenom} ${pieceIdentite.numero} ${tel1} ${tel2 || ''}`.toLowerCase().trim()
searchableTextFirstNameFirst = `${prenom} ${nom} ${pieceIdentite.numero} ${tel1} ${tel2 || ''}`.toLowerCase().trim()
searchableTextNumeroFirst = `${pieceIdentite.numero} ${tel1} ${tel2 || ''} ${nom} ${prenom}`.toLowerCase().trim()
```

**Recherche** : 3 requêtes Firestore parallèles (une par champ) → fusion + déduplication des résultats, ou `getPaginatedWithSearchMerge` (pattern caisse-speciale).

**Index Firestore** :
- `actif` (asc/desc)
- `nom` (asc/desc)
- `createdAt` (asc/desc)
- **Composite** : `actif` + `searchableTextLastNameFirst` + `createdAt` (recherche par nom + filtre actif)
- **Composite** : `actif` + `searchableTextFirstNameFirst` + `createdAt` (recherche par prénom + filtre actif)
- **Composite** : `actif` + `searchableTextNumeroFirst` + `createdAt` (recherche par numéro/tel + filtre actif)

---

## ✅ Conclusion

**Ne pas utiliser Algolia InstantSearch** pour la liste des agents de recouvrement. Utiliser **Firestore** avec :
- Repository `AgentRecouvrementRepository`
- Requêtes filtrées et paginées
- **Attributs de recherche obligatoires** : `searchableTextLastNameFirst`, `searchableTextFirstNameFirst`, `searchableTextNumeroFirst` (recherche par nom, prénom, numéro pièce ou téléphone)
- Debounce 300 ms sur l’input de recherche

Cette approche est suffisante pour le volume attendu et reste cohérente avec les autres modules à faible volume du projet.
