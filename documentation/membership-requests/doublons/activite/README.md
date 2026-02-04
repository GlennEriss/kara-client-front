## Diagrammes d'activité – Gestion des doublons

Ce dossier contient les **diagrammes d'activité PlantUML** qui décrivent le flux de la fonctionnalité de détection et de consultation des doublons parmi les demandes d'adhésion.

### Fichiers

| Fichier | Description |
|---------|-------------|
| `DetecterEtConsulterDoublons.puml` | Flux complet en deux parties : détection automatique (Cloud Function) et consultation/résolution (UI Admin). |

---

## Résumé du flux

### Partie 1 : Détection automatique (Cloud Function)

1. **Déclencheur** : création ou mise à jour d'une demande d'adhésion (`onWrite`).
2. **Extraction** : récupération des valeurs de détection (téléphones, email normalisé, numéro de pièce normalisé).
3. **Requêtes Firestore** : recherche de dossiers existants avec les mêmes valeurs (3 requêtes en parallèle).
4. **Création/mise à jour des groupes** : si des doublons sont trouvés, création ou mise à jour dans `duplicate-groups`.
5. **Marquage des dossiers** : `isDuplicate = true` et `duplicateGroupIds[]` sur les demandes concernées.
6. **Nettoyage** : si une mise à jour retire un doublon, suppression des groupes vides et mise à jour de `isDuplicate`.

### Partie 2 : Consultation et résolution (UI Admin)

1. **Entrée** : l'admin accède à la page des demandes d'adhésion.
2. **Alerte** : si des groupes non résolus existent, affichage d'une bannière.
3. **Onglet Doublons** : au clic, chargement des groupes depuis `duplicate-groups`.
4. **Affichage** : groupes listés par type (téléphone, email, pièce), avec pour chaque groupe la valeur en commun et les dossiers concernés.
5. **Résolution** : l'admin peut marquer un groupe comme « traité » (fusion effectuée, faux positif, etc.).

---

## Acteurs et composants

| Élément | Rôle |
|---------|------|
| **Cloud Function** | Détection automatique des doublons à l'écriture |
| **Firestore** | Stockage des demandes et des groupes de doublons |
| **Admin (UI)** | Consultation de l'alerte, de l'onglet Doublons, résolution des groupes |
| **useDuplicateAlert** | Hook pour l'alerte (existe-t-il des groupes non résolus ?) |
| **useDuplicateGroups** | Hook pour charger les groupes de l'onglet Doublons |
