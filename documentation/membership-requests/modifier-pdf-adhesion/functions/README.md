# Cloud Function - Remplacer le PDF d'adhesion

Spec de la Cloud Function **callable** `replaceAdhesionPdf`.

---

## 1. Signature (proposee)

```ts
export const replaceAdhesionPdf = onCall(async (request) => {
  // request.data: { requestId, adminId, pdf: { url, path, size } }
})
```

### Payload

```json
{
  "requestId": "REQ_123",
  "adminId": "ADMIN_456",
  "pdf": {
    "url": "https://.../file.pdf",
    "path": "membership-adhesion-pdfs/.../file.pdf",
    "size": 123456
  }
}
```

---

## 2. Validations

- `adminId` obligatoire et role admin.
- La demande existe.
- `status === 'approved'`.
- `isPaid === true`.
- `pdf.url` et `pdf.path` valides (MIME PDF deja verifie cote client).

---

## 3. Algorithme (resume)

1. Charger la demande `membership-requests/{requestId}`.
2. Verifier l'etat (approved + paid).
3. Recuperer l'ancien `adhesionPdfURL`.
4. Mettre a jour la demande :
   - `adhesionPdfURL = pdf.url`
   - `adhesionPdfUpdatedAt = now`
   - `adhesionPdfUpdatedBy = adminId`
5. Creer un nouveau document `documents` :
   - `type = 'ADHESION'`, `url`, `path`, `size`, `memberId`, `requestId`, `isCurrent=true`.
6. Marquer l'ancien document ADHESION `isCurrent=false` (si trouve).
7. Mettre a jour la subscription (si existe) : `adhesionPdfURL = pdf.url`.
8. (Optionnel) Supprimer l'ancien fichier Storage si politique de retention.
9. Retourner un resultat `{ success: true }`.

---

## 4. Erreurs attendues

- `permission-denied` : admin non autorise.
- `not-found` : demande inexistante.
- `failed-precondition` : demande non approuvee ou non payee.
- `invalid-argument` : payload invalide.

---

## 5. Audit

- Stocker `adhesionPdfUpdatedAt` et `adhesionPdfUpdatedBy` sur la demande.
- Conserver l'historique via `documents` (versioning).
