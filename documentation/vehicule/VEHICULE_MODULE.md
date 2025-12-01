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
- `VehicleType = 'Voiture' | 'Moto' | 'Camion' | 'Bus' | 'Maison' | ...`
- `VehicleEnergySource = 'essence' | 'diesel' | 'electrique' | 'hybride' | 'gaz' | 'autre'`
- `VehicleInsuranceHolderType = 'member' | 'non-member'` : Type de titulaire (membre ou non-membre)
- `VehicleInsurance` :
  - `id`, `holderType`, `city`, `primaryPhone`, `memberId` (optionnel si membre), `vehicleType`, `energySource`, `fiscalPower`, `brand`, `model`, `plateNumber`, `warrantyMonths`, `insuranceCompany`, `policyNumber`, `premium`, `currency`, `startDate`, `endDate`, `status`, `sponsorMemberId`, `sponsorName`, `sponsorMatricule`, `notes`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`.
  - **Pour membre** : `memberId`, `memberFirstName`, `memberLastName`, `memberMatricule`, `memberContacts`
  - **Pour non-membre** : `nonMemberFirstName`, `nonMemberLastName`, `nonMemberPhone1`, `nonMemberPhone2` (optionnel)
- `VehicleInsuranceFilters` :
  - `status`, `insuranceCompany`, `vehicleType`, `searchQuery`, `alphabeticalOrder`, `page`, `limit`, `holderType` (optionnel pour filtrer par type de titulaire).
- `VehicleInsuranceStats` :
  - `totalInsured`, `active`, `expired`, `expiresSoon`, `byCompany`, `byVehicleType`, `membersCount`, `nonMembersCount`.

### 2.2 Données Firestore

Collection utilisée : `vehicle-insurances`. Chaque document représente une police pour un membre ou un non-membre (1 véhicule = 1 document). Les champs enregistrés :

**Champs communs :**
- `holderType` : 'member' | 'non-member' (obligatoire)
- `city` : ville au Gabon
- `primaryPhone` : téléphone principal utilisé pour les exports/notifications

**Si holderType === 'member' :**
- `memberId`, `memberFirstName`, `memberLastName`, `memberMatricule`, `memberContacts`, `memberPhotoUrl`

**Si holderType === 'non-member' :**
- `nonMemberFirstName`, `nonMemberLastName`, `nonMemberPhone1`, `nonMemberPhone2` (optionnel)

**Champs communs (suite) :**
- `sponsorMemberId`, `sponsorName`, `sponsorMatricule`, `sponsorContacts` (optionnel)
- `vehicleType`, `vehicleBrand`, `vehicleModel`, `vehicleYear`, `plateNumber`
- `energySource`, `fiscalPower`, `warrantyMonths`
- `insuranceCompany`, `insuranceAgent`, `policyNumber`, `coverageType`, `premiumAmount`, `currency`
- `startDate`, `endDate`, `status`
- `attachments.policyUrl`, `attachments.receiptUrl` (preuve)
- `renewalCount`, `lastRenewedAt`
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy`

Un **export Excel/PDF** (basé sur `documentation/vehicule/exemple.xlsx`) est attendu :

- Les colonnes doivent respecter exactement l’ordre et les intitulés du fichier de référence.
- Deux lignes d’en-tête fusionnées (“FICHE D'EVALUATION…” et “DONNEES CLIENTS”).
- Les données proviennent de la collection complète, pas seulement de la page affichée.

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
  - **Sélection du titulaire** : Deux options disponibles :
    - **Option "Membre"** : Recherche/autocomplete avec `useSearchMembers` (recherche par nom, prénom, matricule). Affiche les résultats au fur et à mesure de la saisie (minimum 2-3 caractères). Évite de charger tous les membres dans un select.
    - **Option "Non-membre"** : Formulaire avec champs manuels : nom, prénom, téléphone 1, téléphone 2.
  - Champs obligatoires : 
    - Pour membre : sélection via recherche
    - Pour non-membre : nom, prénom, téléphone 1
    - Communs : type véhicule, plaque, assureur, numéro police, montant, dates
  - Validation : `endDate > startDate`, montant positif, plaque unique, téléphone valide pour non-membres.
  - **Parrain (Informations financières)** :
    - Recherche/autocomplete identique à la sélection d’un membre (nom / matricule).
    - Le choix stocke `sponsorMemberId`, `sponsorName`, `sponsorMatricule`, `sponsorContacts`.
    - Badge récapitulatif + bouton “Retirer/Changer”.
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

## 9. Amélioration du formulaire d'assurance

### 9.1 Support des non-membres

Le formulaire d'assurance véhicule supporte désormais deux types de titulaires :
- **Membres KARA** : Sélection via recherche/autocomplete (voir `docs/vehicule/FORMULAIRE_ASSURANCE_VEHICULE.md`)
- **Personnes externes** : Saisie manuelle (nom, prénom, téléphones)

### 9.2 Recherche optimisée pour les membres

Au lieu de charger tous les membres dans un select, le formulaire utilise :
- **Recherche en temps réel** avec `useSearchMembers`
- **Autocomplete** avec résultats limités (10-20)
- **Debounce** pour optimiser les requêtes
- **Recherche par** : nom, prénom, matricule

**Voir la documentation détaillée** : `docs/vehicule/FORMULAIRE_ASSURANCE_VEHICULE.md`

### 9.3 Sélection du parrain

- `SponsorSearchInput` (ou réutilisation configurée de `MemberSearchInput`) est rendu dans la section « Informations financières ».
- Les résultats proviennent de `useSearchMembers` pour garantir une cohérence totale avec `src/components/memberships/MembershipList.tsx`.
- Support de la recherche par matricule (`MAT-0001`), nom ou prénom.
- Lorsque l’utilisateur choisit un parrain :
  - Le formulaire remplit les champs `sponsorMemberId`, `sponsorName`, `sponsorMatricule`, `sponsorContacts`.
  - Un badge affiche le résumé + lien vers la fiche membre (navigue vers la page `memberships/[id]`).
  - Bouton “Changer” remet l’état de recherche, bouton “Aucun parrain” vide les champs.
- Contraintes UX :
  - Warning si parrain inactif (abonnement expiré) mais enregistrement permis (à valider côté métier).
  - Les lectures Firestore restent limitées grâce au debounce et au plafond de résultats (10-20).

## 10. Conclusion

Le module Véhicule s'intègre naturellement dans l'architecture existante : données centralisées dans Firestore, couche métier isolée dans les services, UI réutilisant les composants existants. Le plan ci-dessus couvre les responsabilités, le modèle, les routes, les tâches et les exigences UX pour garantir une expérience cohérente et responsive sur tous les terminaux.

Le formulaire amélioré permet de gérer efficacement les assurances pour les membres et les non-membres, avec une recherche performante qui évite les problèmes de chargement massif.

## 11. Implémentation (Novembre 2025)

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

