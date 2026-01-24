## Diagrammes de séquence – Modifier une demande d'adhésion

Les **diagrammes de séquence** complètent les diagrammes d’activité en montrant les **interactions détaillées** entre UI, hooks, services et repositories.

Chaque séquence sera décrite dans un fichier PlantUML dédié.

### SEQ_MODIFIER_01 – Chargement de la demande dans la fiche d’édition

- **But** : décrire comment la fiche d’édition récupère les données à partir de l’ID de la demande.
- **Participants typiques**
  - `Admin`
  - `MembershipRequestsPageV2`
  - `useMembershipRequestsV2` / `MembershipRepositoryV2`
  - `MemberDetailsModal` (mode édition)
- **Étapes**
  - L’admin clique sur « Ouvrir la fiche / Modifier » depuis la liste ou la page de détails.
  - L’UI détermine l’ID de la demande et charge les données (depuis le cache React Query ou Firestore).
  - Le modal d’édition est ouvert avec le formulaire pré‑rempli.

### SEQ_MODIFIER_02 – Sauvegarde des modifications

- **But** : montrer le flow complet **Admin → UI → Service → Repository → Firestore**.
- **Participants typiques**
  - `Admin`
  - `MemberDetailsModal` (formulaire)
  - `MembershipFormService.updateMembershipRequest`
  - `MembershipRepositoryV2.update`
  - `Firestore (membership_requests)`
- **Étapes**
  - L’admin clique sur « Enregistrer les modifications ».
  - Le formulaire valide les données (Zod / RHF).
  - Le service applique les règles métiers et construit un payload partiel.
  - Le repository persiste les changements dans Firestore.
  - Le service renvoie un résultat (succès/erreur) à l’UI.

### SEQ_MODIFIER_03 – Mise à jour des documents (Storage)

- **But** : décrire les interactions spécifiques liées aux documents (photos / pièces d’identité).
- **Participants typiques**
  - `Admin`
  - `MemberDetailsModal` (upload composant)
  - `MembershipRepositoryV2` (ou un service de documents dédié)
  - `Firebase Storage`
  - `Firestore (références de documents)`
- **Étapes**
  - L’admin remplace une photo / pièce d’identité.
  - L’UI envoie le nouveau fichier vers Storage.
  - Le repository met à jour les métadonnées dans la demande (URL, path, type).
  - Optionnel : suppression ou archivage de l’ancienne ressource.

### SEQ_MODIFIER_04 – Échecs et rollback minimal

- **But** : documenter le comportement en cas d’erreur pendant la sauvegarde.
- **Scénarios**
  - Erreur de validation (UI ou service) : les données ne sont pas envoyées à Firestore.
  - Erreur Firestore : message d’erreur métier retourné, la fiche reste ouverte.
  - Erreur Storage : documents non mis à jour, notification claire à l’admin.

