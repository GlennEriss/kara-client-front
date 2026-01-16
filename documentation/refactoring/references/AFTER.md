# État Cible — Module References (Companies, Professions)

## Avantages de la Nouvelle Structure

### Organisation
- ✅ Tous les fichiers du domaine References au même endroit
- ✅ Cohésion métier visible
- ✅ Types isolés dans `entities/`
- ✅ Repositories structurés remplaçant les fichiers `db/` legacy
- ✅ Utils partagés (normalizeName)

### Maintenabilité
- ✅ Facile de trouver tous les fichiers liés au module
- ✅ Frontière claire entre domaines
- ✅ Réduction des risques de dépendances circulaires
- ✅ Code modernisé avec repositories au lieu de fichiers `db/` legacy
- ✅ Logique métier séparée des opérations de base de données

### Scalabilité
- ✅ Structure qui scale bien avec de nombreux domaines
- ✅ Facile d'isoler un domaine pour tests/refactoring
- ✅ Aligné avec les principes DDD (Domain-Driven Design)
- ✅ Repositories réutilisables et testables

---

## Structure Cible Détaillée

Voir `README.md` section "État Cible (AFTER)".

---

## Bénéfices Attendus

1. **Clarté** : Structure plus claire et intuitive
2. **Isolation** : Domaine isolé, moins de couplage
3. **Tests** : Plus facile de tester un domaine isolé avec des repositories mockables
4. **Collaboration** : Plusieurs développeurs peuvent travailler sur différents domaines sans conflits
5. **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités au domaine
6. **Modernisation** : Remplacement des fichiers `db/` legacy par des repositories structurés
7. **Réutilisation** : Utils partagés (normalizeName) utilisables par tous les sous-modules

---

## Migration Strategy

- Migration atomique (tous les fichiers en une fois)
- Création des repositories depuis les fichiers `db/` legacy
- Mise à jour des imports en une seule passe
- Tests manuels après migration complète
- Préservation du système de cache existant

---

## Fonctionnalités Préservées

- ✅ Recherche d'entreprise/profession par nom normalisé
- ✅ Suggestions lors de la recherche
- ✅ Pagination pour les listes
- ✅ Cache des entreprises (CompanyCacheProvider)
- ✅ CRUD complet (Create, Read, Update, Delete)
- ✅ Intégration avec les formulaires d'inscription
