## Diagrammes de séquence – Détails membre (V2)

Ce dossier contient les **diagrammes de séquence** (PlantUML) décrivant les interactions pour la fiche détails membre :

### Diagrammes disponibles

- **`main.puml`** : séquence de chargement complet (page `/memberships/{id}` → `MemberDetailsPage` → `useMembershipDetails` → repositories → Firestore).
- **`navigation.puml`** : séquence de navigation depuis la fiche vers les modules liés (abonnements, dossier d’adhésion, contrats, filleuls).
- **`modals.puml`** : séquence d’ouverture des modals depuis la fiche (historique abonnements, documents).

### Scénarios à ajouter/affiner (si besoin)

- [ ] Séquence spécifique pour les erreurs (membre introuvable / réseau) couplée à `MemberDetailsErrorState`.
- [ ] Séquence d’intégration avec le centre de notifications (ouverture de la fiche depuis une notification portant `memberId`).
