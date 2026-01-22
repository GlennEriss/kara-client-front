## Diagrammes de séquence – Liste des membres (V2)

Ce dossier contient les **diagrammes de séquence** (PlantUML) décrivant les interactions pour la liste des membres :

### Diagrammes disponibles

- **`main.puml`** : Séquence de chargement complet (page → hook → repository → Firestore → stats).
- **`tabs.puml`** : Séquence de changement de tab (mapping tab → filtres → requête).
- **`export.puml`** : Séquence d’export (modal → service → génération fichier → téléchargement).

### Scénarios à documenter (à compléter)

- [ ] Séquence de filtres avancés (géographie, entreprise, profession).
- [ ] Séquence de recherche texte (debounce, requête Firestore ou filtrage client).
- [ ] Séquence d’erreur réseau (retry).
- [ ] Séquence d’ouverture détails membre (modal).

