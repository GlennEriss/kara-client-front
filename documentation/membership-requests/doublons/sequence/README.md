## Diagrammes de séquence – Gestion des doublons

Ce dossier contient les **diagrammes de séquence PlantUML** pour la fonctionnalité de détection et d'affichage des doublons. Ils respectent l'**architecture par domaines** du projet.

### Fichiers

| Fichier | Description |
|---------|-------------|
| `SEQ_DetecterDoublons.puml` | **Cloud Function** : détection automatique à l'écriture d'une demande, création/mise à jour des groupes, marquage des dossiers. |
| `SEQ_ConsulterDoublons.puml` | **UI Admin** : chargement de l'alerte, consultation de l'onglet Doublons, résolution d'un groupe. |

---

## Architecture

### Détection (Cloud Function)

```
Firestore Trigger (onWrite)
        │
        ▼
Cloud Function (detectDuplicates)
        │
        ├──► Requêtes Firestore (3 en parallèle)
        │    - identity.contacts array-contains phone
        │    - normalizedEmail == email
        │    - normalizedIdentityDocNumber == docNumber
        │
        ├──► Création/mise à jour duplicate-groups
        │
        └──► Mise à jour isDuplicate + duplicateGroupIds sur les demandes
```

### Consultation (UI Admin)

```
MembershipRequestsPage
        │
        ├──► DuplicatesAlert → useDuplicateAlert → hasUnresolvedGroups()
        │
        └──► DuplicatesTab → useDuplicateGroups → getUnresolvedGroups()
                                    │
                                    ▼
                        DuplicateGroupsRepository
                                    │
                                    ▼
                        Firestore (duplicate-groups)
```

---

## Participants

| Participant | Rôle |
|-------------|------|
| **Firestore Trigger** | Déclenche la Cloud Function à chaque écriture |
| **Cloud Function (detectDuplicates)** | Logique de détection et gestion des groupes |
| **Firestore (membership-requests)** | Collection des demandes, avec champs `isDuplicate` et `duplicateGroupIds` |
| **Firestore (duplicate-groups)** | Collection des groupes de doublons |
| **MembershipRequestsPage** | Page principale (Domain Component) |
| **DuplicatesAlert** | Composant alerte (bannière) |
| **DuplicatesTab** | Composant onglet Doublons |
| **useDuplicateAlert** | Hook pour savoir s'il y a des doublons (affichage alerte) |
| **useDuplicateGroups** | Hook pour charger les groupes de l'onglet |
| **DuplicateGroupsRepository** | Accès Firestore pour `duplicate-groups` |
