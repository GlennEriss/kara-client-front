## Cloud Functions – Recherche & filtres (V2)

### 1. Option Firestore-only

- Si l’on reste sur une recherche simple (sans Algolia) :
  - Aucune Cloud Function spécifique n’est nécessaire.
  - La recherche est basée sur :
    - Des requêtes Firestore (
      `where` sur `roles`, `membershipType`, `hasCar`, `isActive`, etc.).
    - Éventuellement un champ `searchableText` géré côté client (mise à jour lors d’opérations sur le membre).

### 2. Option moteur externe (Algolia)

Si l’on choisit de déporter la recherche full‑text vers Algolia :

- **Fonctions à prévoir** :
  - Trigger `onWrite` sur `users` pour maintenir l’index Algolia à jour :
    - Création/mise à jour/suppression d’un membre → update de l’objet dans l’index `memberships`.
  - (Optionnel) Job batch pour réindexer tous les membres.

- **Documents liés** :
  - Voir `documentation/membership-requests/recherche/` pour les patterns déjà définis (index Algolia, variables d’environnement, etc.).

### 3. À décider

- [ ] Firestore-only vs Algolia.
- [ ] Si Algolia : spécifier clairement les champs indexés et le modèle d’objet côté index.
