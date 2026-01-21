## Firebase – Détails membre (V2)

### 1. Collections / documents utilisés

- **`users`** (ou `members`) – profil du membre
  - Champs principaux utilisés dans la fiche détail :
    - Identité : `firstName`, `lastName`, `gender`, `birthDate`, `birthPlace`, `nationality`, `maritalStatus`, etc.
    - Coordonnées : `email`, `contacts[]`.
    - Adresse : `address.province`, `address.city`, `address.arrondissement`, `address.district`, `address.additionalInfo`.
    - Métadonnées : `matricule`, `roles`, `membershipType`, `createdAt`, `updatedAt`.
    - Liens : `dossier` (id de la demande d’adhésion), `groupIds`, éventuels `vehicleIds`, etc.

- **`subscriptions`** – abonnements du membre
  - Liés au membre par `userId`.
  - Champs : `userId`, `dateStart`, `dateEnd`, `status`, `amount`, `createdAt`.
  - Utilisés pour :
    - Afficher la dernière subscription (statut actuel).
    - Afficher l’historique des abonnements dans la section abonnement.

- **`caisseContracts` / contrats caisse** (caisse spéciale / imprevue / autres)
  - Liés au membre par `memberId` (ou `userId` selon la DB actuelle).
  - Champs : `memberId`, `type` (spéciale/imprevue/placement), `status`, `amount`, `createdAt`, `updatedAt`, etc.
  - Utilisés pour :
    - Section \"Historique des contrats\".
    - Résumé des montants / nombres de contrats.

- **Collections filleuls / parrainage** (nom exact à confirmer)
  - Exemples possibles : `sponsorships`, `filleuls`.
  - Liés par `parrainId` / `sponsorId`.
  - Utilisés pour :
    - Section \"Filleuls / parrainage\" (liste ou compteur de filleuls).

- **`membershipRequests`** (demandes d’adhésion)
  - Liées par champ `dossier` dans le document `users`.
  - Utilisées pour :
    - Naviguer vers `MembershipRequestDetails` (Vue dossier d’adhésion).
    - (Optionnel) Afficher un résumé de la demande dans la section documents.

### 2. Index Firestore nécessaires

#### 2.1 Abonnements par membre

- Collection : `subscriptions`
- Index :
  - `userId` (Ascending), `dateEnd` (Descending)
- Utilisation :
  - Récupérer toutes les subscriptions d’un membre triées par date (pour l’historique et la dernière subscription).

#### 2.2 Contrats par membre

- Collection : `caisseContracts` (ou équivalent)
- Index :
  - `memberId` (Ascending), `createdAt` (Descending)
  - (facultatif) `memberId` (Ascending), `type` (Ascending), `createdAt` (Descending)
- Utilisation :
  - Récupérer tous les contrats d’un membre.
  - Filtrer éventuellement par type de contrat pour les CTA vers modules caisse.

#### 2.3 Filleuls par parrain

- Collection : `sponsorships` / `filleuls` (à confirmer)
- Index :
  - `parrainId` (Ascending), `createdAt` (Descending)
- Utilisation :
  - Lister les filleuls d’un membre (parrain) dans la section filleuls.

#### 2.4 Membres (profil)

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

match /caisseContracts/{contractId} {
  allow read: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}

match /sponsorships/{sponsorshipId} {
  allow read: if request.auth != null
    && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

> Les noms exacts de collections (`caisseContracts`, `sponsorships`) sont à aligner avec la DB actuelle, mais le principe reste le même : **lecture réservée aux admins**.

### 4. Règles de sécurité Storage

- **Photos de membres**
  - Chemin : `/members/photos/{userId}/*` (ou équivalent).
  - Règle :
    - Lecture uniquement pour les admins authentifiés.
    - Pas d’écriture directe côté client (upload via back-office contrôlé).

- **Documents liés (PDFs, pièces d’identité, etc.)**
  - Chemins : `/members/documents/{userId}/*`, `/membership-requests/{dossierId}/documents/*`.
  - Règle :
    - Lecture uniquement pour admins.
    - Vérifier que `request.auth.uid` est un admin.

### 5. Vérifications à faire pendant le refactor

- [ ] Vérifier que les index ci-dessus existent dans `firestore.indexes.json`.
- [ ] S’assurer que les requêtes dans `useMembershipDetails` respectent l’ordre des champs dans les index.
- [ ] Vérifier que les règles Firestore et Storage couvrent bien tous les accès nécessaires pour la vue détails membre.
- [ ] Ajouter des tests (manuels ou automatisés) pour les erreurs de permissions (403) dans les tests d’intégration, si pertinent.

