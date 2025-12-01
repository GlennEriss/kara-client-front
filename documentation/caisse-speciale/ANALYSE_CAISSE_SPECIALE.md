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

### 3.1. Cas d’utilisation (Use Case)

- Identifier les principaux cas d’utilisation :
  - UC1 – Créer un contrat de caisse spéciale.
  - UC2 – Modifier un contrat avant validation.
  - UC3 – Générer / télécharger le PDF du contrat.
  - UC4 – Consulter l’historique des contrats d’un membre.
  - UC5 – Résilier / clôturer un contrat.
- Pour chaque UC, décrire :
  - Acteur(s)
  - Pré‑conditions / Post‑conditions
  - Scénario nominal + scénarios d’exception.

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


