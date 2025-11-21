# Module Véhicule – Proposition d’architecture et plan d’implémentation

## 1. Objectifs métier

- **Centraliser** la liste des membres possédant au moins un véhicule (donnée `hasCar` déjà présente dans `User`).
- **Suivre** l’état de leurs assurances (date de début, date de fin, assureur, montant, type de véhicule, type de couverture, etc.).
- **Alerter** automatiquement lorsqu’une assurance est expirée ou proche de la date d’expiration (badge “Assurance expirée” ou “Expire bientôt”).
- **Permettre** la mise à jour des informations d’assurance (nouvelle police, modification, renouvellement).
- **Tracer** le parrainage (membre référent) et les métadonnées de création/modification.

## 2. Données & modèle

### 2.1 Types à ajouter dans `src/types/types.ts`

- `VehicleInsuranceStatus = 'active' | 'expires_soon' | 'expired'`
- `VehicleType = 'Voiture' | 'Moto' | 'Camion' | ...` (liste extensible)
- `VehicleInsurance` :
  - `id`, `memberId`, `vehicleType`, `brand`, `model`, `plateNumber`, `insuranceCompany`, `policyNumber`, `coverage`, `premium`, `currency`, `startDate`, `endDate`, `status`, `sponsorMemberId`, `notes`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.
- `VehicleInsuranceFilters` :
  - `status`, `insuranceCompany`, `vehicleType`, `searchQuery`, `alphabeticalOrder`, `page`, `limit`.
- `VehicleInsuranceStats` :
  - `totalInsured`, `active`, `expired`, `expiresSoon`, `byCompany`, `byVehicleType`.

### 2.2 Données Firestore

Collection utilisée : `vehicle-insurances`. Chaque document représente une police pour un membre (1 véhicule = 1 document). Les champs enregistrés :

- `memberId`, `memberFirstName`, `memberLastName`, `memberMatricule`, `memberContacts`, `memberPhotoUrl`
- `sponsorMemberId`, `sponsorName`
- `vehicleType`, `vehicleBrand`, `vehicleModel`, `vehicleYear`, `plateNumber`
- `insuranceCompany`, `insuranceAgent`, `policyNumber`, `coverageType`, `premiumAmount`, `currency`
- `startDate`, `endDate`, `status`
- `attachments.policyUrl`, `attachments.receiptUrl` (preuve)
- `renewalCount`, `lastRenewedAt`
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy`

Indexes à prévoir :
- `status` + `endDate` (listing par statut/échéance)
- `vehicleType`, `insuranceCompany` pour les filtres.

## 3. Architecture technique (conformément à `docs/architecture`)

1. **Firebase** (`src/firebase/*`) : déjà prêt.
2. **Repositories** (`src/repositories/vehicule/`) :
   - `VehicleInsuranceRepository.ts` : CRUD, pagination, filtres.
3. **Services** (`src/services/vehicule/`) :
   - `VehicleInsuranceService.ts` : logique métier (calcul statut, détection expiration, agrégations stats, validations additionnelles).
4. **Factories** :
   - Étendre `RepositoryFactory` et `ServiceFactory` pour exposer `getVehicleInsuranceRepository()` et `getVehicleInsuranceService()`.
5. **Hooks** (`src/hooks/vehicule/`) :
   - `useVehicleInsurances(filters)` : liste + stats + pagination.
   - `useVehicleInsurance(id)` : détail + update.
6. **Schemas** (`src/schemas/vehicule.schema.ts`) :
   - `vehicleInsuranceFormSchema` (react-hook-form + Zod).
7. **Composants** (`src/components/vehicule/`) :
   - `VehicleInsuranceList.tsx`, `VehicleInsuranceFilters.tsx`, `VehicleInsuranceStats.tsx`, `VehicleInsuranceCard.tsx`, `VehicleInsuranceTable.tsx`, `VehicleInsuranceDetail.tsx`, `VehicleInsuranceForm.tsx`, `VehicleInsuranceBadge.tsx`.
8. **Pages** (`src/app/(admin)/vehicules/`) :
   - `/vehicules` (liste + stats)
   - `/vehicules/[id]` (détail + historique)
   - `/vehicules/[id]/edit` ou modal d’édition depuis le détail.
9. **Providers** (si besoin d’un contexte temps réel ou multi-sélection).

## 4. UX/UI attendue

- Responsive mobile/tablette/desktop, cohérent avec modules existants (couleurs, cards, table, carrousel de stats).
- **Liste principale** :
  - Vue grille + vue tableau (comme Bienfaiteur).
  - Carte/ligne affichant :
    - Nom + photo + badge “Assurance expirée/Expire bientôt/Active”.
    - Informations véhicule (type, marque, plaque).
    - Informations assurance (compagnie, numéro, montant, dates).
    - Parrain (nom + lien vers fiche).
  - Actions rapides : “Voir détails”, “Mettre à jour assurance”, “Historique”.
- **Filtres** :
  - Recherche par nom/prénom/numéro de police/plaque.
  - Statut assurance (active, expire bientôt, expirée).
  - Assureur.
  - Type de véhicule.
  - Tri alphabétique A→Z / Z→A.
  - Filtre date fin (prochaines expirations).
- **Stats** :
  - Total assurés, actifs, expirés, expiring soon.
  - Répartition par assureur/vehicule (pie/bar chart).
- **Detail** :
  - Timeline des assurances (renouvellements).
  - Bouton “Renouveler” pré-rempli avec dernières valeurs.
  - Pièces jointes (preuve de police, facture).
- **Formulaire** :
  - react-hook-form + Zod.
  - Champs obligatoires : membre (lecture seule ou sélection), type véhicule, plaque, assureur, numéro police, montant, dates.
  - Validation : `endDate > startDate`, montant positif, plaque unique.
- **Badges/alertes** :
  - `status` calculé côté service (`expired` si `endDate < today`, `expiresSoon` si < 30 jours).

## 5. Routes & navigation (`src/constantes/routes.ts`)

Ajouter sous `routes.admin` :
```
vehicules: '/vehicules',
vehiculeDetails: (id: string) => `/vehicules/${id}`,
vehiculeEdit: (id: string) => `/vehicules/${id}/edit`,
```

## 6. Liste de tâches (backlog)

1. **Types & schémas**
   - Étendre `src/types/types.ts` (types Vehicle).
   - Créer `src/schemas/vehicule.schema.ts`.
2. **Repositories**
   - `VehicleInsuranceRepository.ts` : `list`, `get`, `create`, `update`, `delete`, `listByStatus`, `search`.
3. **Services**
   - `VehicleInsuranceService.ts` : logique statuts, calcul `expiresSoon`, agrégations stats, validation métier (unicité plaque/police par membre).
4. **Factories**
   - Mettre à jour `RepositoryFactory` & `ServiceFactory`.
5. **Hooks**
   - `useVehicleInsurances`, `useVehicleInsurance`, `useVehicleInsuranceStats`.
6. **UI Components**
   - Stats cards, filters, table/grid, badges, detail view, form (modal ou page).
7. **Pages Next.js**
   - `/vehicules/page.tsx` : liste + stats + filtres.
   - `/vehicules/[id]/page.tsx` : détail.
8. **Routing**
   - Ajout routes admin.
9. **Docs**
   - Ce fichier + éventuellement `docs/vehicule/roadmap.md` pour suivi.
10. **Tests & QA**
    - Vérification responsive (mobile/tablette/desktop).
    - Cas : assurance expirée, renouvellement, multiples véhicules par membre.

## 7. Fonctionnalités avancées / optimisations

- Notifications (email/SMS) quand l’assurance approche de la fin (extension future via service).
- Intégration avec module Bienfaiteur si besoin de véhicules pour events logistiques.
- Export CSV/PDF des assurances.
- Historique complet des modifications (audit log).

## 8. Références internes

- S’inspirer du module Bienfaiteur (`docs/bienfaiteur/*`, `src/components/bienfaiteur/*`) pour :
  - Architecture repository/service/hook/composants.
  - Carrousel de stats, pagination, filtres.
  - Gestion des modals (ex : `CharityEventDetail`, `CreateCharityEventForm`).

## 9. Conclusion

Le module Véhicule s’intègre naturellement dans l’architecture existante : données centralisées dans Firestore, couche métier isolée dans les services, UI réutilisant les composants existants. Le plan ci-dessus couvre les responsabilités, le modèle, les routes, les tâches et les exigences UX pour garantir une expérience cohérente et responsive sur tous les terminaux.

## 10. Implémentation (Novembre 2025)

- **Données** : collection `vehicle-insurances` alimentée via `VehicleInsuranceRepository` + service.
- **Service** : `VehicleInsuranceService` assure création, mise à jour, renouvellement, marquage expiré, statistiques.
- **Hooks** : `useVehicleInsurances` (list/statistiques/mutations) + `useVehicleInsuranceForm`.
- **UI** :
  - `VehicleInsuranceList` (stats → filtres → tableau + pagination + modals).
  - Composants dédiés (`VehicleInsuranceBadge`, `VehicleInsuranceForm`, `VehicleInsuranceRenewForm`, `VehicleInsuranceDetail`, `VehicleInsuranceDetailView`, `VehicleInsuranceEditView`).
- **Pages Next.js** :
  - `/vehicules` (dashboard complet),
  - `/vehicules/[id]` (détail),
  - `/vehicules/[id]/edit` (édition).
- **Routes** ajoutées dans `src/constantes/routes.ts`.
- **Doc & TODO** mis à jour : `VEHICULE_MODULE.md`, `VEHICULE_TODO.md`.

