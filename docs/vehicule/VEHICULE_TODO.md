# TODO Module Véhicule (Admin)

> Statut initial : aucune tâche réalisée. Marquer les tâches complètes avec ✅, laisser ⬜ tant que c’est en cours / à faire.

## 1. Fondations & Modélisation
- ✅ Ajouter tous les types nécessaires (`VehicleInsurance`, filtres, stats, enums) dans `src/types/types.ts`.
- ✅ Créer les schemas Zod dans `src/schemas/vehicule.schema.ts` (formulaire assurance/véhicule, filtres avancés).
- ✅ Documenter l’API Firestore ciblée (collections, sous-collections, index) si besoin dans `docs/vehicule/VEHICULE_MODULE.md` (section “Structure Firestore”).
 
## 2. Couche Data (Firebase → Repositories)
- ✅ Ajouter `src/repositories/vehicule/VehicleInsuranceRepository.ts` (CRUD complet, pagination, recherche, filtres, agrégations basiques).
- ✅ Étendre `src/factories/RepositoryFactory.ts` (méthode `getVehicleInsuranceRepository()` + export).

## 3. Couche Service
- ✅ Créer `src/services/vehicule/VehicleInsuranceService.ts` :
  - Calcul des statuts (`active`, `expires_soon`, `expired`).
  - Gestion des agrégations (stats globales).
  - Méthodes `list`, `get`, `createOrUpdate`, `renew`, `markExpired`, etc.
- ✅ Étendre `src/factories/ServiceFactory.ts` pour exposer `getVehicleInsuranceService()`.

## 4. Hooks & Méditeurs
- ✅ Créer `src/hooks/vehicule/useVehicleInsurances.ts` (liste + filtres + pagination + stats).
- ✅ Créer `src/hooks/vehicule/useVehicleInsurance.ts` (détail, update, renouvellement).
- ✅ Créer `src/hooks/vehicule/useVehicleInsuranceForm.ts` (intégration react-hook-form + Zod).
- ⬜ (Optionnel) Ajouter un médiateur si un workflow multi-étapes est requis (ex: `VehicleInsuranceMediator`).

## 5. UI & Pages
- ✅ Ajouter les routes admin dans `src/constantes/routes.ts` (`/vehicules`, `/vehicules/[id]`, `/vehicules/[id]/edit`).
- ✅ Pages Next.js :
  - `src/app/(admin)/vehicules/page.tsx` (liste + stats + filtres).
  - `src/app/(admin)/vehicules/[id]/page.tsx` (détail + historique + actions).
  - `src/app/(admin)/vehicules/[id]/edit/page.tsx` (édition dédiée).
- ✅ Composants dans `src/components/vehicule/` :
  - `VehicleInsuranceList`, `VehicleInsuranceFilters`, `VehicleInsuranceStats`, `VehicleInsuranceTable`.
  - `VehicleInsuranceDetail`, `VehicleInsuranceDetailView`, `VehicleInsuranceBadge`.
  - `VehicleInsuranceForm`, `VehicleInsuranceRenewForm`.
- ✅ S’assurer que tous les composants réutilisent `src/components/ui/*` et Tailwind, et que le design reste aligné (responsive mobile/tablette/desktop).

## 6. Fonctionnalités avancées & UX
- ✅ Implémenter les badges d'état (actif, expire bientôt, expiré) calculés côté service.
- ✅ Ajout de filtres : recherche libre, compagnie d'assurance, type de véhicule, statut, tri alphabétique.
- ✅ Récupération des membres avec véhicules : utilisation du filtre `hasCar: true` via `useAllMembers({ hasCar: true })` (déjà implémenté dans `getMembers`).
- ✅ Correction du problème de double barre de scroll sur `/vehicules` : déplacement du padding dans `LayoutDashboard`.
- ✅ Amélioration de la clarté du formulaire d'ajout d'assurance : ajout de labels et descriptions explicites.
- ✅ Amélioration de l'affichage de la liste des membres avec véhicules :
  - Ajout d'un compteur du nombre de membres avec véhicules dans l'en-tête
  - Tri alphabétique des membres dans le sélecteur
  - Indicateurs de chargement et messages d'état améliorés
  - Gestion du cas où aucun membre n'a de véhicule
  - Limite augmentée à 1000 membres pour couvrir tous les cas
  - Bouton actualiser qui rafraîchit aussi la liste des membres
- ✅ Correction du problème de récupération des membres avec véhicules :
  - Récupération de tous les membres (sans filtre hasCar côté Firestore) pour éviter les problèmes d'indexation
  - Filtrage côté client pour inclure les membres où `hasCar === true` OU qui ont déjà une assurance véhicule
  - Récupération de toutes les assurances pour obtenir la liste complète des membres avec assurance
  - Résout le problème où certains membres avec véhicules n'apparaissaient pas dans la liste
- ⬜ Ajouter un export CSV/PDF (optionnel mais recommandé, basé sur Service + hook).
- ⬜ Gestion du parrainage : afficher le parrain, liens vers sa fiche, filtres par parrain.

## 7. Tests, QA & Documentation
- ⬜ (Optionnel, à réaliser en fin de module) Ajouter tests unitaires ciblés (services) si la base de tests existe.
- ⬜ Vérifier la responsivité (mobile/tablette/desktop) et l’accessibilité (focus, contrastes).
- ⬜ Mettre à jour `docs/vehicule/VEHICULE_MODULE.md` avec l’état d’implémentation et les points restants.
- ⬜ Ajouter des captures/animated gifs dans `docs/vehicule/` une fois le module prêt (optionnel).

## 8. Déploiement / Release
- ⬜ (Optionnel, fin de parcours) Vérifier les permissions Firestore/Storage nécessaires (règles de sécurité).
- ⬜ Préparer une note de publication (features, impacts) quand le module est terminé.

