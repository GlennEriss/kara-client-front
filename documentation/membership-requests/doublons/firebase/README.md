# Firebase – Gestion des doublons

Configuration Firebase (Firestore) pour la fonctionnalité de détection des doublons.

---

## 1. Collections

### 1.1 `membership-requests` (champs ajoutés)

| Champ | Type | Description |
|-------|------|-------------|
| `normalizedEmail` | `string?` | Email en lowercase + trim (pour requête optimisée) |
| `normalizedIdentityDocNumber` | `string?` | Numéro de pièce normalisé (trim, uppercase optionnel) |
| `isDuplicate` | `boolean` | `true` si le dossier appartient à au moins un groupe de doublons |
| `duplicateGroupIds` | `string[]` | Liste des IDs des groupes auxquels le dossier appartient |

### 1.2 `duplicate-groups` (nouvelle collection)

| Champ | Type | Description |
|-------|------|-------------|
| `type` | `string` | `'phone'`, `'email'` ou `'identityDocument'` |
| `value` | `string` | Valeur partagée (téléphone, email ou numéro de pièce) |
| `requestIds` | `string[]` | Liste des IDs des demandes concernées |
| `requestCount` | `number` | Nombre de demandes (dénormalisé pour tri) |
| `detectedAt` | `Timestamp` | Date de première détection |
| `updatedAt` | `Timestamp` | Date de dernière mise à jour |
| `resolvedAt` | `Timestamp?` | Date de résolution (null si non résolu) |
| `resolvedBy` | `string?` | ID de l'admin qui a résolu le groupe |

---

## 2. Index Firestore

À ajouter dans `firestore.indexes.json` :

```json
{
  "indexes": [
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "normalizedEmail", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "normalizedIdentityDocNumber", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "membership-requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isDuplicate", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "duplicate-groups",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "resolvedAt", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "detectedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "duplicate-groups",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "value", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Notes sur les index

- **`identity.contacts`** : Firestore crée automatiquement un index `array-contains` sur les champs de type array.
- **`normalizedEmail`** et **`normalizedIdentityDocNumber`** : index single-field suffisants pour les requêtes `==`.
- **Index composites** : nécessaires pour les requêtes avec filtre + tri (ex. `resolvedAt == null` + `orderBy detectedAt`).

---

## 3. Règles de sécurité

À ajouter dans `firestore.rules` :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ... règles existantes ...

    // Collection duplicate-groups
    match /duplicate-groups/{groupId} {
      // Lecture : admins uniquement
      allow read: if isAdmin();
      
      // Écriture : Cloud Functions uniquement (via service account)
      // Les admins peuvent uniquement mettre à jour resolvedAt et resolvedBy
      allow update: if isAdmin() 
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['resolvedAt', 'resolvedBy']);
      
      // Création et suppression : Cloud Functions uniquement
      allow create, delete: if false;
    }

    // Helper : vérifier si l'utilisateur est admin
    function isAdmin() {
      return request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['Admin', 'SuperAdmin', 'Secretary'];
    }
  }
}
```

### Explication des règles

- **Lecture** : seuls les admins peuvent voir les groupes de doublons.
- **Mise à jour partielle** : les admins peuvent uniquement marquer un groupe comme résolu (`resolvedAt`, `resolvedBy`).
- **Création/suppression** : réservées à la Cloud Function (exécutée avec le service account, donc règles contournées).

---

## 4. Migration des données existantes

Pour les demandes existantes, une Cloud Function ou un script de migration doit :

1. Ajouter les champs `normalizedEmail` et `normalizedIdentityDocNumber` sur chaque demande.
2. Exécuter la détection initiale pour créer les groupes `duplicate-groups`.
3. Marquer les dossiers concernés avec `isDuplicate` et `duplicateGroupIds`.

Voir `functions/README.md` pour le script de migration.
