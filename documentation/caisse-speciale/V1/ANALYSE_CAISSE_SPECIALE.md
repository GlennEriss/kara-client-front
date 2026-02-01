# Analyse fonctionnelle – Module Caisse spéciale

## 1. Contexte et périmètre

- Module déjà existant dans le code :  
  - `src/components/caisse-speciale/*`  
  - `src/app/(admin)/caisse-speciale/*`
- La **caisse spéciale** gère des contrats spécifiques (montants, durée, contributions, pièces jointes PDF, etc.) indépendants des autres modules (bienfaiteur, véhicules, memberships), mais qui doivent respecter l’architecture globale décrite dans [`documentation/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md).

## 2. Objectifs fonctionnels

- Décrire précisément :
  - Le cycle de vie d’un contrat de caisse spéciale (création, validation, génération PDF, archivage, résiliation, etc.).
  - Les rôles/acteurs (admin, gestionnaire, membre, etc.).
  - Les règles métier (plafonds, pénalités, statuts, dates d’effet, etc.).
- Servir de base pour toutes les futures fonctionnalités de ce module (nouveaux écrans, automatisations, exports).

## 3. Analyse UML (à compléter)

### 3.1. Cas d'utilisation (Use Case)

- Identifier les principaux cas d'utilisation :
  - UC1 – Créer un contrat de caisse spéciale.
  - UC2 – Modifier un contrat avant validation.
  - UC3 – Générer / télécharger le PDF du contrat.
  - UC4 – Consulter l'historique des contrats d'un membre.
  - UC5 – Résilier / clôturer un contrat.
  - UC6 – Filtrer les contrats par retard de paiement.
  - UC7 – Gérer les demandes de contrats (voir [`./DEMANDES_CAISSE_SPECIALE.md`](./DEMANDES_CAISSE_SPECIALE.md) pour les détails).
- Pour chaque UC, décrire :
  - Acteur(s)
  - Pré‑conditions / Post‑conditions
  - Scénario nominal + scénarios d'exception.

---

### UC6 – Filtrer les contrats par retard de paiement

**Acteur** : Admin

**Objectif** : Permettre à l'admin de visualiser uniquement les contrats qui ont des versements en retard

**Préconditions** :
- L'admin est sur la page de gestion des contrats de caisse spéciale
- Des contrats existent dans le système

**Définition d'un contrat en retard** :
Un contrat est considéré en retard si :
- Le contrat a le statut `ACTIVE`, `LATE_NO_PENALTY`, ou `LATE_WITH_PENALTY`
- ET l'une des conditions suivantes :
  - Le contrat a le statut `LATE_NO_PENALTY` ou `LATE_WITH_PENALTY` (déjà calculé par le système)
  - Le contrat a `nextDueAt` défini et `nextDueAt < date actuelle` (prochain versement en retard)
  - Le contrat a au moins un versement (dans la sous-collection `payments`) avec :
    - `status: 'DUE'` ou `status: 'PARTIAL'`
    - `dueAt` défini et `dueAt < date actuelle` (le versement est en retard)

**Scénario principal** :
1. L'admin voit un nouvel onglet "Retard" dans la liste des onglets de la page de gestion des contrats
2. L'admin clique sur l'onglet "Retard"
3. Le système affiche uniquement les contrats qui sont en retard selon les critères définis
4. Les contrats sont affichés avec un indicateur visuel (badge, couleur) pour montrer qu'ils sont en retard
5. Les statistiques s'adaptent pour afficher uniquement les contrats en retard

**Scénarios alternatifs** :
- Si aucun contrat n'est en retard, afficher "Aucun contrat en retard"
- Les filtres de statut et de recherche restent actifs sur l'onglet "Retard"
- La pagination fonctionne normalement sur l'onglet "Retard"

**Postconditions** :
- Seuls les contrats en retard sont affichés
- Les statistiques sont mises à jour pour refléter les contrats en retard
- Les autres filtres et onglets ne sont pas affectés

### 3.2. Diagramme de classes (conceptuel)

> À détailler plus tard sous forme de diagramme UML (ou image jointe) basé sur le modèle suivant :

- `CaisseSpecialeContract`
  - id
  - memberId / companyId
  - montant, durée, fréquence, statut, dates clés
  - liens vers pièces jointes (PDF)
- `CaisseSpecialePayment` (si suivi des versements)
- `User` / `AdminUser` (acteurs techniques)

## 4. Alignement avec l’architecture

- Respecter la structure décrite dans [`ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) :
  - Repositories : `src/repositories/caisse-speciale/*`
  - Services : `src/services/caisse-speciale/*`
  - Hooks : `src/hooks/caisse-speciale/*`
  - Composants : `src/components/caisse-speciale/*`
  - Pages : `src/app/(admin)/caisse-speciale/*`
  - Types : `src/types/types.ts` (modèles de contrats, paiements, etc.)
  - Schemas : `src/schemas/caisse-speciale.schema.ts` (formulaires associés)

## 5. Référence croisée

- **Réalisation** : les tâches concrètes à implémenter pour ce module sont listées dans [`realisationAfaire.md`](./realisationAfaire.md).  
- **Architecture globale** : voir [`documentation/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) pour toutes les règles d’injection, de séparation des couches et conventions transverses.


