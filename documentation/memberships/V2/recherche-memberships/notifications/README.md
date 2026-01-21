## Notifications – Recherche & filtres (V2)

### 1. Toasts UI

- Toasts d’erreur pour :
  - Erreur réseau lors de la recherche.
  - Erreur Firestore lors du chargement des filtres.
- Messages d’information :
  - "Aucun membre ne correspond à votre recherche".
  - "Filtres trop restrictifs" (si nécessaire).

### 2. Notifications système

- Aucune notification système spécifique n’est prévue pour la recherche/filtres.
- Le système de notifications global reste focalisé sur des événements métier (nouvelles demandes, anniversaires, exports, etc.), pas sur les actions de recherche.

### 3. À faire

- [ ] Ajouter/ajuster les toasts dans les composants concernés (`MembershipSearchBar`, `MembershipList`, onglet Véhicules) en fonction des erreurs possibles.
