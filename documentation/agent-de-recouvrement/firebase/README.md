# Firebase – Module Agent de recouvrement

> Index Firestore, règles Firestore et Storage déduits des diagrammes de séquence

## 📋 Fichiers

| Fichier | Description |
|---------|-------------|
| [INDEXES.md](./INDEXES.md) | Index Firestore nécessaires (liste, recherche, stats, Cloud Function) |
| [FIRESTORE_RULES.md](./FIRESTORE_RULES.md) | Règles Firestore pour `agentsRecouvrement` |
| [STORAGE_RULES.md](./STORAGE_RULES.md) | Règles Storage pour photos agents (`agents-recouvrement/{agentId}/{fileName}`) |

## 🔗 Correspondance Diagrammes → Firebase

| Diagramme séquence | Firestore | Storage |
|-------------------|-----------|---------|
| SEQ_CreerAgent | create agentsRecouvrement | upload photo (optionnel) |
| SEQ_ModifierAgent | update agentsRecouvrement | upload/delete photo (optionnel) |
| SEQ_DesactiverAgent | update actif=false | — |
| SEQ_SupprimerAgent | deleteDoc | delete photo Storage si présente |
| SEQ_ListerAgents | query actif + searchableText + tri, getAgentsAnniversairesMois | read photo |
| SEQ_RechercherAgents | query actif + searchableText | read photo |
| SEQ_StatsAgents | count (incl. totalAnniversairesMois) | — |
| SEQ_VoirDetailsAgent | getById | read photo |
| SEQ_SelectionnerAgent* | query actif | read photo (affichage) |
| SEQ_CloudFunctionNotificationsAgent | query actif + dateNaissance | — |

## 📝 Intégration

### 1. Index Firestore

Copier les index de [INDEXES.md](./INDEXES.md) dans `firestore.indexes.json` (racine du projet).

### 2. Règles Firestore

Copier la section `agentsRecouvrement` de [FIRESTORE_RULES.md](./FIRESTORE_RULES.md) dans `firestore.rules`.

### 3. Règles Storage

Copier la section `agents-recouvrement` de [STORAGE_RULES.md](./STORAGE_RULES.md) dans `storage.rules`.

### 4. Déploiement

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```
