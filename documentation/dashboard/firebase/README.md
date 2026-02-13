# Firebase - Dashboard

> Configuration Firebase necessaire pour le dashboard tabs-first (cache, securite, performances).

## Fichiers

| Fichier | Contenu |
|---|---|
| `firestore-rules.md` | Regles Firestore pour les collections techniques dashboard (`dashboardAggregates`, `dashboardJobLocks`). |
| `storage-rules.md` | Regles Storage pour exports dashboard (optionnel). |
| `firestore-indexes.md` | Index par tabs/modules et par dimensions metier (metiers/geographie/recouvrement). |
| `cloud-functions.md` | Decision Cloud Functions + design functions tab-aware. |

## Decision architecture Firebase

- Cache metier dashboard: **oui** (`dashboardAggregates`)
- Cloud Functions dashboard: **oui** (recommande)
- Storage dashboard: **non en V1** si export local

## Collections techniques ajoutees

| Collection | Role | Ecriture |
|---|---|---|
| `dashboardAggregates` | snapshots agreges par `activeTab + periode + filtres` | Cloud Functions uniquement |
| `dashboardJobLocks` | lock anti-concurrence des jobs dashboard | Cloud Functions uniquement |

## SnapshotId recommande

- `${periodKey}__${filtersHash}__${activeTab}`

Exemple:

- `month_2026_02__all-all-all__credit_fixe`

