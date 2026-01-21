## Diagrammes d’activité – Détails membre (V2)

Ce dossier contient les **diagrammes d’activité** (PlantUML) pour la vue détails d’un membre :

### Diagrammes disponibles

- **`main.puml`** : flux principal de chargement de la fiche membre (ouverture depuis la liste, appel `useMembershipDetails`, affichage des sections).
- **`navigation.puml`** : navigation depuis la fiche vers les modules liés (abonnements, dossier d’adhésion, contrats caisse, filleuls).
- **`erreurs.puml`** : gestion des erreurs de chargement (membre introuvable, erreurs réseau) et retour vers la liste.

### Scénarios à ajouter/affiner (si besoin)

- [ ] Cas \"membre sans données secondaires\" (aucun abonnement/contrat/filleul).
- [ ] Cas d’actions supplémentaires (ex. boutons de recalcul d’agrégats, si implémentés).
