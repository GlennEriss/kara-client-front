## Notifications – Exports membres (V2)

### 1. Toasts UI (feedback immédiat)

- **Succès d’export côté client** :
  - `toast.success('Export CSV/Excel/PDF généré')`.
- **Aucun membre à exporter** :
  - `toast.info('Aucun membre à exporter selon les critères')`.
- **Erreur d’export** :
  - `toast.error('Erreur lors de l\'export')` avec détails éventuels.

### 2. Notifications système (si Cloud Function utilisée)

Si on met en place une Cloud Function pour les gros exports :

- **Type proposé** : `export_completed` (déjà mentionné dans `liste-memberships`).
- **Déclenchement** :
  - À la fin de `exportMembersList` (Cloud Function) après upload dans Storage.
- **Contenu** :
  - Module : `memberships`.
  - Type : `export_completed`.
  - Message : "Votre export {format} ({count} membres) est prêt".
  - Métadonnées : `{ exportId, format, count, downloadUrl }`.
- **Usage** :
  - L’admin clique la notification → ouvre un écran d’historique des exports ou déclenche le téléchargement.

### 3. Alignement avec le système de notifications global

- Vérifier/compléter dans `documentation/notifications/*` :
  - Type `export_completed` si non déjà défini.
- S’assurer que :
  - La Cloud Function `exportMembersList` crée bien une notification `export_completed` pour l’admin initiateur.
  - Le front consomme cette notification (centre de notifications + lien vers le téléchargement).

### 4. À faire

- [ ] Ajouter les toasts manquants dans `ExportMembershipModal` ou `useMembershipExport` selon la refacto.
- [ ] Si Cloud Function utilisée, implémenter la création de notifications `export_completed` côté backend.
