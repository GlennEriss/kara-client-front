## Diagrammes de séquence – Formulaire membre (V2)

Ce dossier contient les **diagrammes de séquence** (PlantUML) décrivant les interactions pour le formulaire d’adhésion :

### Diagrammes disponibles

- **`main.puml`** : séquence de soumission du formulaire (Admin → Register → MembershipFormService → Repositories → Firestore/Storage).
- **`creation-rapide.puml`** : séquence de création rapide d’un référentiel (Admin → Step → Modal → Service → Repository → Firestore → React Query invalidation → sélection automatique).

### Scénarios à ajouter/affiner (si besoin)

- [ ] Séquence spécifique pour la validation d’une étape (affichage erreurs, blocage navigation).
- [ ] Séquence d’upload de documents (Step4 → DocumentRepository → Storage).
- [ ] Séquence de cascade géographique (sélection province → chargement villes → sélection ville → chargement arrondissements, etc.).

