# Documentation – Gestion des doublons (membership-requests)

> Spécification de la détection automatique et de l'affichage des dossiers en doublon parmi les demandes d'adhésion.

---

## 1. Contexte et objectif

Permettre à l'administrateur de **repérer les demandes d'adhésion (membership-requests) qui sont en doublon** selon des critères explicites (téléphone, email, numéro de pièce d'identité), d'être **alerté** lorsqu'il existe de tels doublons, et d'**afficher ces dossiers regroupés** dans un onglet dédié (tabs).

### Critères de doublon

Deux dossiers (ou plus) sont considérés en doublon s'ils partagent **au moins un** des attributs suivants :

| Attribut | Champ Firestore | Comparaison |
|----------|-----------------|-------------|
| Numéro de téléphone | `identity.contacts[]` | Au moins un numéro en commun |
| Adresse email | `identity.email` | Égalité après normalisation (trim + lowercase) |
| Numéro de pièce d'identité | `documents.identityDocumentNumber` | Égalité après normalisation |

### Fonctionnalités

- **Détection automatique** : via Cloud Function à chaque création ou mise à jour d'une demande.
- **Alerte admin** : l'interface indique clairement qu'il existe des dossiers en doublon et précise l'attribut en commun.
- **Onglet Doublons** : un onglet (tabs) affiche les groupes de doublons pré-listés par type d'attribut.

---

## 2. Architecture technique

### 2.1 Détection via Cloud Function

La détection des doublons est effectuée **côté serveur** par une **Cloud Function** déclenchée à chaque écriture (création ou mise à jour) sur la collection `membership-requests`.

```
onWrite(membership-requests/{requestId})
  ↓
  1. Extraire les valeurs de détection :
     - contacts[] (téléphones)
     - email (normalisé)
     - identityDocumentNumber (normalisé)
  ↓
  2. Pour chaque valeur non vide, requêter Firestore :
     - Téléphone : where("identity.contacts", "array-contains", phone)
     - Email : where("normalizedEmail", "==", email)
     - Pièce : where("normalizedIdentityDocNumber", "==", docNumber)
  ↓
  3. Si d'autres dossiers existent (hors le dossier courant) :
     - Créer ou mettre à jour un groupe dans `duplicate-groups`
     - Marquer les dossiers concernés (isDuplicate: true, duplicateGroupIds[])
  ↓
  4. Si le dossier n'a plus de doublons (mise à jour ou suppression) :
     - Retirer le dossier des groupes concernés
     - Supprimer les groupes vides ou à 1 seul membre
     - Mettre à jour isDuplicate si plus aucun groupe
```

### 2.2 Modèle de données

#### Champs ajoutés sur `membership-requests/{id}`

| Champ | Type | Description |
|-------|------|-------------|
| `normalizedEmail` | `string?` | Email en lowercase + trim (pour index/requête) |
| `normalizedIdentityDocNumber` | `string?` | Numéro de pièce normalisé (trim) |
| `isDuplicate` | `boolean` | `true` si le dossier appartient à au moins un groupe de doublons |
| `duplicateGroupIds` | `string[]` | Liste des IDs des groupes auxquels le dossier appartient |

#### Collection `duplicate-groups/{groupId}`

| Champ | Type | Description |
|-------|------|-------------|
| `type` | `'phone' \| 'email' \| 'identityDocument'` | Type d'attribut en commun |
| `value` | `string` | Valeur partagée (téléphone, email ou numéro de pièce) |
| `requestIds` | `string[]` | Liste des IDs des demandes concernées |
| `requestCount` | `number` | Nombre de demandes (pour tri/affichage) |
| `detectedAt` | `Timestamp` | Date de première détection |
| `updatedAt` | `Timestamp` | Date de dernière mise à jour |
| `resolvedAt` | `Timestamp?` | Date de résolution (si l'admin a traité le groupe) |
| `resolvedBy` | `string?` | ID de l'admin qui a résolu |

### 2.3 Index Firestore requis

```
// Pour la détection par téléphone
membership-requests: identity.contacts (array-contains)

// Pour la détection par email
membership-requests: normalizedEmail (==)

// Pour la détection par pièce d'identité
membership-requests: normalizedIdentityDocNumber (==)

// Pour lister les dossiers en doublon
membership-requests: isDuplicate (==), createdAt (desc)

// Pour lister les groupes non résolus
duplicate-groups: resolvedAt (==), type (==), detectedAt (desc)
```

---

## 3. Comportement fonctionnel

### 3.1 Détection automatique

- **Déclenchement** : à chaque création (`onCreate`) ou mise à jour (`onUpdate`) d'une demande.
- **Valeurs vides ignorées** : si un champ est vide/undefined, il n'est pas utilisé pour la détection.
- **Mise à jour des groupes** : si une demande est modifiée (changement de téléphone, email ou pièce), les anciens groupes sont mis à jour et de nouveaux groupes peuvent être créés.

### 3.2 Alerte administrateur

- **Emplacement** : sur la page/liste des demandes d'adhésion.
- **Condition d'affichage** : au moins un groupe non résolu existe dans `duplicate-groups`.
- **Contenu** : message du type « Des dossiers partagent le même numéro de téléphone, email ou numéro de pièce d'identité. Consultez l'onglet Doublons. »
- **Action** : lien vers l'onglet « Doublons ».

### 3.3 Onglet « Doublons » (tabs)

- **Intégration** : onglet dans le système de tabs de la page (Tous | En attente | … | **Doublons**).
- **Contenu** : requête sur `duplicate-groups` où `resolvedAt == null`, groupés par type (téléphone, email, pièce).
- **Pour chaque groupe** :
  - Valeur en commun (ex. `+241 77 12 34 56`)
  - Liste des dossiers concernés (matricule, nom, prénom, statut)
  - Lien vers la fiche détail de chaque dossier
  - Action « Marquer comme traité » pour résoudre le groupe

### 3.4 Résolution d'un groupe

L'admin peut marquer un groupe comme « traité » (fusion effectuée, faux positif, ou autre décision). Le groupe reste en base (traçabilité) mais n'apparaît plus dans l'onglet Doublons.

---

## 4. Architecture (domains)

### Couches impliquées

| Couche | Élément | Rôle |
|--------|---------|------|
| **Cloud Function** | `onMembershipRequestWrite` | Détection des doublons à l'écriture |
| **Repository** | `DuplicateGroupsRepository` | CRUD sur `duplicate-groups` |
| **Hook** | `useDuplicateGroups` | Chargement des groupes non résolus |
| **Hook** | `useDuplicateAlert` | Indique si des doublons existent (pour l'alerte) |
| **Component** | Alerte doublons | Bannière d'alerte avec lien vers l'onglet |
| **Component** | Onglet Doublons | Affichage des groupes par type |

### Flux de données

```
[Firestore: membership-requests]
        │
        ▼ (onWrite)
[Cloud Function: detectDuplicates]
        │
        ├──► Requêtes Firestore (téléphone, email, pièce)
        │
        ▼
[Firestore: duplicate-groups] ◄── création/mise à jour des groupes
        │
        ▼
[Firestore: membership-requests] ◄── mise à jour isDuplicate, duplicateGroupIds
```

---

## 5. Fichiers de documentation

| Dossier / Fichier | Description |
|-------------------|-------------|
| `activite/` | Diagrammes d'activité (détection Cloud Function, consultation onglet). |
| `sequence/` | Diagrammes de séquence (Cloud Function, chargement UI). |
| `firebase/` | Index Firestore, règles de sécurité. |
| `functions/` | Spécification de la Cloud Function `detectDuplicates`. |
| `wireframes/` | Maquettes : alerte, onglet Doublons, résolution. |
| `workflow/` | Phases d'implémentation. |

---

## 6. Sécurité et confidentialité

- **Accès aux groupes** : réservé aux rôles admin (règles Firestore).
- **Cloud Function** : exécutée avec les droits admin, pas d'accès direct depuis le client.
- **Données sensibles** : les doublons exposent téléphone, email et numéro de pièce ; à afficher uniquement dans un contexte sécurisé.

---

## 7. Mapping des composants

| Élément | Emplacement prévu |
|--------|--------------------|
| Cloud Function détection | `functions/src/membership-requests/detectDuplicates.ts` |
| Repository groupes | `src/domains/memberships/repositories/DuplicateGroupsRepository.ts` |
| Hook groupes | `src/domains/memberships/hooks/useDuplicateGroups.ts` |
| Hook alerte | `src/domains/memberships/hooks/useDuplicateAlert.ts` |
| Composant alerte | Intégré dans la page liste des demandes |
| Onglet Doublons | Intégré dans le système de tabs de la page |

> Ce README sert de référence pour le workflow d'implémentation (`workflow/README.md`), les diagrammes (`activite/`, `sequence/`), la spécification Firebase (`firebase/`) et la Cloud Function (`functions/`).
