# Cloud Functions – Modifier une demande d'adhésion

## `updateMembershipRequest` (Callable)

Cette fonction permet à un administrateur de modifier les informations d'une demande d'adhésion existante. Elle remplace la modification directe via Firestore pour garantir la validation des données et la sécurité.

### Trigger
- **Type**: HTTPS Callable
- **Name**: `updateMembershipRequest`

### Permissions
- **Authentification requise**: Oui
- **Rôle requis**: Admin (vérifié via Custom Claims ou via lookup dans la collection `admins` si nécessaire).

### Payload (Arguments)
```typescript
interface UpdateMembershipRequestPayload {
  requestId: string;
  formData: {
    identity?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      civility?: string;
      phone?: string;
      photoURL?: string; // URL post-upload ou base64 (si géré par le back)
      // ... autres champs d'identité
    };
    address?: {
      street?: string;
      city?: string;
      country?: string;
      // ...
    };
    company?: {
        // ...
    };
    documents?: {
        // ...
    };
  };
}
```

### Logique métier (Séquence)

1.  **Vérification Authentification** :
    - Si `context.auth` est undefined -> Rejeter (`UNAUTHENTICATED`).
    - Si `!context.auth.token.admin` (si claims utilisés) -> Rejeter (`PERMISSION_DENIED`).

2.  **Validation des Données** :
    - Utiliser `Zod` (ou équivalent) pour valider que `payload.formData` respecte les règles métier (formats, champs obligatoires conditionnels, etc.).
    - Vérifier que `requestId` est valide.

3.  **Vérification Existence** :
    - Récupérer le document `membership_requests/{requestId}`.
    - Si non existant -> Rejeter (`NOT_FOUND`).
    - (Optionnel) Vérifier si le statut permet la modification (ex: pas si déjà archivé).

4.  **Application des Modifications** :
    - Préparer l'objet de mise à jour (flattening des objets imbriqués pour `updateDoc` si nécessaire, ou reconstruction de l'objet complet).
    - Ajouter les métadonnées de modification :
        - `updatedAt`: ServerTimestamp
        - `updatedBy`: ID de l'admin
    - Exécuter la mise à jour dans Firestore.

5.  **Gestion des Effets de Bord (Optionnel)** :
    - Si l'email change, vérifier l'unicité ?
    - Si les photos changent, supprimer les anciennes du Storage ? (Peut être fait via un trigger `onUpdate` séparé pour ne pas ralentir la réponse).

### Retours
- **Succès** : `{ success: true, requestId: string }`
- **Erreur** : Throws `HttpsError` (ex: `invalid-argument`, `permission-denied`, `internal`).
