## Firebase – Détails membre (V2)

### 1. Collections / documents utilisés

- **`users`** (ou `members`) – profil du membre
  - Champs principaux utilisés dans la fiche détail :
    - Identité : `firstName`, `lastName`, `gender`, `birthDate`, `birthPlace`, `nationality`, `maritalStatus`, etc.
    - Coordonnées : `email`, `contacts[]`.
    - Adresse : `address.province`, `address.city`, `address.arrondissement`, `address.district`, `address.additionalInfo`.
    - Métadonnées : `matricule`, `roles`, `membershipType`, `createdAt`, `updatedAt`.
    - Liens : `dossier` (id de la demande d'adhésion), `groupIds`, éventuels `vehicleIds`, etc.
    - Photo : `photoURL`.

- **`subscriptions`** – abonnements du membre
  - Liés au membre par `userId`.
  - Champs : `userId`, `dateStart`, `dateEnd`, `status`, `amount`, `createdAt`.
  - Utilisés pour :
    - Afficher la dernière subscription (statut actuel).
    - Afficher l'historique des abonnements dans la section abonnement.

- **`caisse-contracts`** (contrats caisse spéciale / imprevue / placements)
  - Liés au membre par `memberId` (ou `userId` selon la DB actuelle).
  - Champs : `memberId`, `type` (spéciale/imprevue/placement), `status`, `amount`, `createdAt`, `updatedAt`, etc.
  - Utilisés pour :
    - Section \"Contrats\" (résumé par type).
    - Navigation vers modules caisse.

- **Collections filleuls / parrainage** (nom exact à confirmer)
  - Exemples possibles : `sponsorships`, `filleuls`.
  - Liés par `parrainId` / `sponsorId`.
  - Utilisés pour :
    - Section \"Filleuls / parrainage\" (liste ou compteur de filleuls).

- **Documents** (collection à confirmer)
  - Liés par `memberId`.
  - Utilisés pour :
    - Section \"Documents\" (compteur et liste).

- **`membershipRequests`** (demandes d'adhésion)
  - Liées par champ `dossier` dans le document `users`.
  - Utilisées pour :
    - Naviguer vers `MembershipRequestDetails` (Vue dossier d'adhésion).
    - (Optionnel) Afficher un résumé de la demande dans la section documents.

### 2. Index Firestore nécessaires

#### 2.1 Abonnements par membre

- Collection : `subscriptions`
- Index requis :
  - `userId` (Ascending), `createdAt` (Descending) ✅ **REQUIS pour `getMemberSubscriptions()`**
  - `userId` (Ascending), `dateStart` (Descending) - pour compatibilité avec ancien format
- Utilisation :
  - Récupérer toutes les subscriptions d'un membre triées par date de création (pour l'historique et la dernière subscription).
  - Utilisé dans `useMembershipDetails` via `getMemberSubscriptions(memberId)`.

#### 2.2 Contrats par membre

- Collection : `caisse-contracts` (ou équivalent)
- Index :
  - `memberId` (Ascending), `createdAt` (Descending)
  - (facultatif) `memberId` (Ascending), `type` (Ascending), `createdAt` (Descending)
- Utilisation :
  - Récupérer tous les contrats d'un membre.
  - Filtrer éventuellement par type de contrat pour les CTA vers modules caisse.

#### 2.3 Filleuls par parrain

- Collection : `sponsorships` / `filleuls` (à confirmer)
- Index :
  - `parrainId` (Ascending), `createdAt` (Descending)
- Utilisation :
  - Lister les filleuls d'un membre (parrain) dans la section filleuls.

#### 2.4 Documents par membre

- Collection : `documents`
- Index requis :
  - `memberId` (Ascending), `type` (Ascending), `createdAt` (Descending) ✅ **REQUIS pour `DocumentRepository.getDocuments()`**
  - `memberId` (Ascending), `createdAt` (Descending) - pour requêtes sans filtre type
- Utilisation :
  - Récupérer tous les documents d'un membre triés par type puis par date de création.
  - Utilisé dans `useMembershipDetails` via `useDocumentList(memberId)`.
  - Requête : `where('memberId', '==', memberId) + orderBy('type', 'asc') + orderBy('createdAt', 'desc')`

#### 2.5 Membres (profil)

- Collection : `users`
- Index :
  - `roles` (array-contains) + `createdAt` (Descending) – déjà nécessaire pour la liste.
  - (optionnel) `dossier` (Ascending) – si besoin de requêtes inverses depuis `membershipRequests`.

### 3. Règles de sécurité Firestore

#### 3.1 Lecture des fiches membres (admin uniquement)

```javascript
match /users/{userId} {
  allow read: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

#### 3.2 Lecture des abonnements / contrats / filleuls

```javascript
match /subscriptions/{subscriptionId} {
  allow read: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}

match /caisse-contracts/{contractId} {
  allow read: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}

match /sponsorships/{sponsorshipId} {
  allow read: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

> Les noms exacts de collections (`caisse-contracts`, `sponsorships`) sont à aligner avec la DB actuelle, mais le principe reste le même : **lecture réservée aux admins**.

### 4. Règles de sécurité Storage

- **Photos de membres**
  - Chemin : `/members/photos/{userId}/*` (ou équivalent).
  - Règle :
    - Lecture uniquement pour les admins authentifiés.
    - Pas d'écriture directe côté client (upload via back-office contrôlé).

- **Documents liés (PDFs, pièces d'identité, etc.)**
  - Chemins : `/members/documents/{userId}/*`, `/membership-requests/{dossierId}/documents/*`.
  - Règle :
    - Lecture uniquement pour admins.
    - Vérifier que `request.auth.uid` est un admin.

### 5. Implémentation V2

#### Collections utilisées dans `useMembershipDetails`

- **`users`** : via `getUserById(memberId)` depuis `@/db/user.db`
  - Fonction : `getDoc(doc(db, 'users', memberId))`
- **`subscriptions`** : via `getMemberSubscriptions(memberId)` depuis `@/db/member.db`
  - Requête : `query(collection(db, 'subscriptions'), where('userId', '==', memberId), orderBy('createdAt', 'desc'))`
- **`caisse-contracts`** : via `listContractsByMember(memberId)` depuis `@/db/caisse/contracts.db`
  - Requête : `query(collection(db, 'caisse-contracts'), where('memberId', '==', memberId))`
- **Filleuls** : via `useMemberWithFilleuls(memberId)` depuis `@/hooks/filleuls` (collection à confirmer)
- **Documents** : via `useDocumentList(memberId)` depuis `@/hooks/documents/useDocumentList` (collection à confirmer)

#### Requêtes Firestore effectives

1. **Membre** : `getDoc(doc(db, 'users', memberId))`
2. **Abonnements** : Query sur `subscriptions` avec `where('userId', '==', memberId)` + `orderBy('createdAt', 'desc')`
3. **Documents** : Query sur `documents` avec `where('memberId', '==', memberId)` + `orderBy('type', 'asc')` + `orderBy('createdAt', 'desc')`
4. **Contrats** : Query sur `caisse-contracts` avec `where('memberId', '==', memberId)`

### 6. Vérifications effectuées

- [x] Les requêtes dans `useMembershipDetails` utilisent les fonctions DB existantes (`getUserById`, `getMemberSubscriptions`, `listContractsByMember`).
- [x] Les index nécessaires ont été ajoutés dans `firestore.indexes.json` (voir `INDEX_MANQUANTS.md` pour les détails).
- [x] Les règles Firestore et Storage existantes couvrent les accès nécessaires (lecture admin uniquement).
- [ ] **Déploiement des index Firestore** : Les index doivent être déployés sur chaque environnement (dev, preprod, prod) via `firebase deploy --only firestore:indexes`.
- [ ] Tests d'intégration pour erreurs de permissions (403) : **À FAIRE** (Phase 5).

### 7. ⚠️ Index manquants (corrigé le 2026-01-22)

Voir `INDEX_MANQUANTS.md` pour les détails complets du problème et de la solution.

**Résumé** : Deux index Firestore manquants empêchaient le chargement des données :
1. `subscriptions` : `userId` (Ascending), `createdAt` (Descending)
2. `documents` : `memberId` (Ascending), `type` (Ascending), `createdAt` (Descending)

Ces index ont été ajoutés dans `firestore.indexes.json` et doivent être déployés.
