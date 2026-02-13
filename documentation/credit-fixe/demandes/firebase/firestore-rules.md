# Regles Firestore – creditDemands

> Regles de securite pour la collection `creditDemands` utilisee par les demandes Credit Fixe.

## Collection concernee

`creditDemands` – Collection partagee entre les types SPECIALE, FIXE et AIDE.

## Regles actuelles

```javascript
// firestore.rules (lignes 696-733)

match /creditDemands/{demandId} {

  // ─── LECTURE ───
  // Admin uniquement
  allow read: if isAdmin();

  // ─── CRÉATION ───
  // Admin uniquement avec validation des champs requis
  allow create: if isAdmin() &&
    // Identite du client
    request.resource.data.clientId is string &&
    request.resource.data.clientId.size() > 0 &&
    request.resource.data.clientFirstName is string &&
    request.resource.data.clientLastName is string &&

    // Type de credit (SPECIALE, FIXE ou AIDE)
    request.resource.data.creditType in ['SPECIALE', 'FIXE', 'AIDE'] &&

    // Montant : entre 1 000 et 10 000 000 FCFA
    request.resource.data.amount is number &&
    request.resource.data.amount >= 1000 &&
    request.resource.data.amount <= 10000000 &&

    // Date souhaitee et motif
    request.resource.data.desiredDate is string &&
    request.resource.data.desiredDate.size() > 0 &&
    request.resource.data.cause is string &&
    request.resource.data.cause.size() >= 10 &&
    request.resource.data.cause.size() <= 500 &&

    // Garant obligatoire
    request.resource.data.guarantorId is string &&
    request.resource.data.guarantorId.size() > 0 &&
    request.resource.data.guarantorFirstName is string &&
    request.resource.data.guarantorLastName is string &&
    request.resource.data.guarantorRelation is string &&

    // Statut initial obligatoirement PENDING
    request.resource.data.status == 'PENDING' &&

    // Audit
    request.resource.data.createdBy is string &&
    request.resource.data.createdBy == request.auth.uid &&
    request.resource.data.createdAt is timestamp &&
    request.resource.data.updatedAt is timestamp;

  // ─── MISE À JOUR ───
  // Admin uniquement (approbation, rejet, reouverture, liaison contrat)
  allow update: if isAdmin();

  // ─── SUPPRESSION ───
  // Admin uniquement, seulement demandes PENDING sans contrat lie
  allow delete: if isAdmin() &&
    resource.data.status == 'PENDING' &&
    (!('contractId' in resource.data) || resource.data.get('contractId', null) == null);
}
```

## Resume des permissions

| Operation | Qui | Conditions |
|---|---|---|
| `read` | Admin | Aucune condition supplementaire |
| `create` | Admin | Tous les champs requis valides, `status == 'PENDING'`, `createdBy == auth.uid` |
| `update` | Admin | Aucune condition supplementaire (validations metier cote service) |
| `delete` | Admin | `status == 'PENDING'` ET aucun `contractId` lie |

## Validations cote regles vs cote service

| Validation | Regles Firestore | Service |
|---|---|---|
| Champs requis presents | Oui | Oui (Zod) |
| Montant 1k-10M | Oui | Oui (Zod) |
| Motif 10-500 caracteres | Oui | Oui (Zod) |
| creditType valide | Oui | Oui |
| Statut initial PENDING | Oui | Oui |
| Garant obligatoire | Oui | Oui (Zod) |
| Transition statut valide | Non | Oui |
| Suppression contrat lie | Oui (contractId) | Oui |
| Score initial | Non | Oui |
| Notifications | Non | Oui |

> **Note** : Les regles Firestore assurent une securite de base. La logique metier avancee (transitions de statut, score, notifications) est geree dans le service.
