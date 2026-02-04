# Firebase - Remplacement du PDF d'adhesion

Configuration Firestore/Storage pour permettre le remplacement du PDF d'adhesion sur une demande **payee et approuvee**.

---

## 1. Collections

### 1.1 `membership-requests` (champs)

| Champ | Type | Description |
|-------|------|-------------|
| `adhesionPdfURL` | `string?` | URL du PDF d'adhesion (source de verite) |
| `adhesionPdfUpdatedAt` | `Timestamp?` | Date du dernier remplacement |
| `adhesionPdfUpdatedBy` | `string?` | Admin ayant remplace le PDF |

### 1.2 `documents` (ADHESION)

Un nouvel enregistrement est ajoute a chaque remplacement.

Champs additionnels proposes :

| Champ | Type | Description |
|-------|------|-------------|
| `requestId` | `string` | ID de la demande source |
| `source` | `string` | Valeur fixe `membership-requests` |
| `isCurrent` | `boolean` | `true` pour la version active |
| `replacedAt` | `Timestamp?` | Date de remplacement |
| `replacedBy` | `string?` | Admin ayant effectue le remplacement |

> L'ancien document `ADHESION` est conserve et passe a `isCurrent=false`.

### 1.3 `memberships` / `subscriptions`

Si une subscription existe pour la demande, son `adhesionPdfURL` doit etre aligne avec la nouvelle URL.

---

## 2. Index Firestore (recommandes)

```json
{
  "indexes": [
    {
      "collectionGroup": "documents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "memberId", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "isCurrent", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 3. Regles Firestore (principes)

- **Lecture** : admins uniquement.
- **Ecriture** : uniquement via Cloud Function `replaceAdhesionPdf`.
- **Mise a jour** cote client (si autorisee) : limiter aux champs `adhesionPdfURL`, `adhesionPdfUpdatedAt`, `adhesionPdfUpdatedBy` ET exiger `status=approved` + `isPaid=true`.

---

## 4. Storage

- Dossier cible : `membership-adhesion-pdfs/`.
- Ecriture reservee aux admins.
- Verifier le MIME type (`application/pdf`).

> Le cleanup de l'ancien fichier est optionnel (depend de la politique de retention).
