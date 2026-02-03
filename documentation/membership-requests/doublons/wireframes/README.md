# Wireframes – Gestion des doublons

Ce dossier décrit les maquettes et spécifications UI pour la fonctionnalité de **détection et consultation des doublons** parmi les demandes d'adhésion.

## Fichiers

| Fichier | Description |
|---------|-------------|
| [WIREFRAME_ALERTE_ET_ONGLET_DOUBLONS.md](./WIREFRAME_ALERTE_ET_ONGLET_DOUBLONS.md) | Alerte administrateur et onglet « Doublons » (tabs, sous-onglets ou sections par type d'attribut, pré-listage des dossiers). |

## Résumé

- **Alerte** : bannière ou bloc en haut de la page liste des demandes lorsque des doublons existent ; message explicite + accès rapide à l'onglet Doublons.
- **Onglet Doublons** : intégré aux Tabs de la page (ex. Tous | En attente | Approuvées | Rejetées | **Doublons**).
- **Contenu de l'onglet** : groupes de dossiers pré-listés par type d'attribut en commun (téléphone, email, numéro de pièce d'identité) ; chaque groupe affiche la valeur en commun et les dossiers concernés (matricule, nom, prénom, statut, lien détail).

## Références

- [README principal](../README.md) : critères de doublon, comportement, données.
- [Diagrammes d'activité](../activite/) : flux détection et consultation.
- [Diagrammes de séquence](../sequence/) : architecture domaines.
- [Design System](../../DESIGN_SYSTEM_UI.md) : composants et thème KARA.
