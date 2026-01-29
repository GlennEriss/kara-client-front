# Data-testid - Recherche des Demandes

> Liste des `data-testid` utilisés pour les tests de recherche.

## 📋 Référence

**Préfixe** : `ci-demand-` (Caisse Imprevue Demandes)  
**Module complet** : Voir [../../demande/tests/DATA_TESTID.md](../../demande/tests/DATA_TESTID.md)

## 🔍 Recherche

### DemandSearchV2

| data-testid | Élément | Usage |
|-------------|---------|------|
| `demand-search-input` | Input de recherche | Saisie, clear, placeholder |
| *(à ajouter)* `demand-search-clear-button` | Bouton effacer (X) | Clic pour effacer |
| *(à ajouter)* `demand-search-loading` | Indicateur de chargement | Visible pendant refetch |

### ListDemandesV2 (recherche intégrée)

| data-testid | Élément | Usage |
|-------------|---------|------|
| `ci-demand-list-search-input` | Input de recherche (si alias) | Alias de demand-search-input |
| `ci-demand-tab-all` | Tab "Toutes" | Clic pour tab Toutes |
| `ci-demand-tab-pending` | Tab "En attente" | Clic pour tab PENDING |
| `ci-demand-tab-approved` | Tab "Acceptées" | Clic pour tab APPROVED |
| `ci-demand-tab-rejected` | Tab "Refusées" | Clic pour tab REJECTED |
| `ci-demand-tab-reopened` | Tab "Réouverte" | Clic pour tab REOPENED |
| `ci-demand-card-{id}` | Card demande | Vérifier visibilité, contenu |
| `ci-demand-pagination-next-button` | Bouton Suivant | Pagination |
| `ci-demand-pagination-prev-button` | Bouton Précédent | Pagination |
| `ci-demand-pagination-page-{n}` | Numéro de page | Vérifier page active |
| `ci-demand-filter-frequency-trigger` | Filtre fréquence | Clic pour ouvrir |
| `ci-demand-filter-frequency-monthly` | Option Mensuelle | Clic pour filtrer |
| `ci-demand-filter-frequency-daily` | Option Quotidienne | Clic pour filtrer |

## ⚠️ Implémentation

Le composant `DemandSearchV2` utilise actuellement `data-testid="demand-search-input"`.  
Vérifier que ce testid est présent dans le code source :

```tsx
// DemandSearchV2.tsx
<input
  data-testid="demand-search-input"
  type="text"
  placeholder="Rechercher par nom, prénom ou matricule..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
/>
```

Pour le bouton clear, ajouter :

```tsx
<button
  data-testid="demand-search-clear-button"
  onClick={handleClear}
  aria-label="Effacer la recherche"
>
  <X className="w-3 h-3" />
</button>
```
