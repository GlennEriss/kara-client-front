## Cloud Functions – Exports membres (V2)

### 1. Contexte

En V1, tous les exports sont réalisés côté client via `ExportMembershipModal.tsx`. Pour de petits volumes, cela suffit. Pour de gros volumes, une **Cloud Function** peut être introduite pour :

- Éviter les limites de mémoire/CPU du navigateur.
- Permettre des exports asynchrones (l’admin est notifié quand le fichier est prêt).
- Centraliser la logique d’export volumique.

### 2. Cloud Function `exportMembersList` (optionnelle)

- **Type** : HTTPS callable ou HTTP + authentification admin.
- **Entrée** :
  ```ts
  {
    filters: UserFilters
    dateRange?: { start: string; end: string }
    vehicleFilter?: 'all' | 'with' | 'without'
    format: 'csv' | 'excel' | 'pdf'
    quantity?: number | 'all'
  }
  ```
- **Traitement** :
  - Utilise l’Admin SDK pour :
    - Récupérer les membres selon les `filters` + `vehicleFilter`.
    - Récupérer les `membershipRequests` associés (si enrichissement nécessaire).
  - Génère le fichier (CSV/Excel/PDF) côté serveur.
  - Stocke le fichier dans Storage (`/exports/members/{exportId}.{ext}`).
  - Crée un document `exports/{exportId}` avec :
    - `createdBy`, `createdAt`, `filters`, `format`, `downloadUrl`.
- **Sortie** :
  ```ts
  {
    exportId: string
    downloadUrl: string
  }
  ```

### 3. Intégration côté front

- `MembershipExportService` :
  - Décide en fonction de la volumétrie :
    - **Petit volume** : export direct côté client.
    - **Gros volume** : appel Cloud Function `exportMembersList`.
- Le hook `useMembershipExport` :
  - Gère le cas Cloud Function et renvoie l’`downloadUrl` si nécessaire.

### 4. Notifications (voir `notifications/README.md`)

- La Cloud Function peut créer une notification "export terminé" pour l’admin qui a lancé la demande.

### 5. À faire

- [ ] Décider si la Cloud Function est nécessaire dans un premier temps.
- [ ] Si oui, implémenter `exportMembersList` + écrire les tests associés.
