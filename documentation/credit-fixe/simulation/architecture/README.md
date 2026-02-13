# Architecture – Simulation Crédit Fixe (Domains)

> Ce document décrit l'architecture cible pour implémenter le sous-module **simulation** du Crédit Fixe en respectant les principes définis dans `documentation/architecture/ARCHITECTURE.md`.

---

## 1. Objectif

Mettre en place une architecture claire, testable et maintenable pour la simulation Crédit Fixe :

- simulation standard (répartition sur 14 échéances max),
- simulation personnalisée (montants saisis par mois, max 14),
- export PDF/Excel,
- impression,
- partage WhatsApp.

---

## 2. Principes d'architecture à respecter

Conformément à `documentation/architecture/ARCHITECTURE.md` :

- Les composants UI ne contiennent pas de logique métier.
- Les hooks consomment les services.
- Les services portent les règles métier et orchestrent les calculs.
- Les accès données passent par repository si persistance nécessaire.
- Séparation stricte des responsabilités par couche.

Spécificité simulation Crédit Fixe :

- La simulation est principalement **sans persistance**.
- Donc la couche repository est optionnelle pour le calcul.
- Si un export devait être persisté (ex. document stocké), on passe alors par `domains/infrastructure/documents`.

---

## 3. Structure domains cible

```text
src/domains/financial/credit-speciale/fixe/simulation/
├── entities/
│   └── fixed-simulation.types.ts
├── schemas/
│   └── fixed-simulation.schema.ts
├── services/
│   └── CreditFixeSimulationService.ts
├── hooks/
│   └── useCreditFixeSimulation.ts
├── components/
│   └── CreditFixeSimulationSection.tsx
├── exports/
│   ├── exportSimulationPdf.ts
│   ├── exportSimulationExcel.ts
│   ├── printSimulation.ts
│   └── shareSimulationWhatsApp.ts
└── __tests__/
    ├── unit/
    └── integration/
```

---

## 4. Rôle de chaque couche

### 4.1 `entities/`

Contient les contrats de données métier :

- `FixedSimulationInput`
- `FixedSimulationMode` (`STANDARD` | `CUSTOM`)
- `FixedScheduleRow`
- `FixedSimulationResult`

### 4.2 `schemas/`

Validation avec Zod :

- taux entre `0` et `50`,
- durée / nombre de mois `<= 14`,
- montants mensuels `>= 0`,
- date du premier versement valide.

### 4.3 `services/`

`CreditFixeSimulationService` implémente :

- `calculateStandardSimulation(input)`
- `calculateCustomSimulation(input)`
- contrôles de cohérence des montants
- génération du résultat final (échéancier, cumul, reste)

Règles clés :

- `M = C + (C * T / 100)` (intérêt appliqué une seule fois),
- standard : répartition sur 14 échéances max,
- personnalisée : max 14 lignes,
- ajustement de la dernière ligne pour garantir la somme totale.

### 4.4 `hooks/`

`useCreditFixeSimulation` expose :

- mutations de calcul (`standard`, `custom`),
- état de résultat,
- erreurs de validation métier.

Le hook ne recode pas les règles, il délègue au service.

### 4.5 `components/`

Composants de rendu :

- formulaire de simulation,
- tableau de résultat,
- boutons d'actions (PDF, Excel, imprimer, WhatsApp).

Pas de calcul métier directement dans le composant.

### 4.6 `exports/`

Utilitaires techniques :

- PDF : `jspdf` + `jspdf-autotable`
- Excel : `xlsx`
- impression : `window.print`
- WhatsApp : génération URL `wa.me` / `api.whatsapp.com`

---

## 5. Flux applicatif

```text
UI (components) 
  -> Hook (useCreditFixeSimulation)
    -> Service (CreditFixeSimulationService)
      -> Resultat simulation (rows + totaux)
        -> Exports (pdf/excel/print/whatsapp)
```

---

## 6. Intégration avec l'existant (phase transitoire)

Pendant la migration vers domains :

- UI actuelle : `src/components/credit-speciale/CreditSimulationPage.tsx`
- schémas actuels : `src/schemas/credit-speciale.schema.ts`
- service actuel : `src/services/credit-speciale/CreditSpecialeService.ts`

Approche recommandée :

1. Introduire le service simulation dans `domains/.../fixe/simulation/services`.
2. Faire consommer ce service par un hook domain dédié.
3. Brancher progressivement la page existante sur ce hook domain.
4. Garder les anciens services comme adaptateurs temporaires.

---

## 7. Règles non fonctionnelles

- Précision monétaire en FCFA : arrondi à l'unité.
- Cohérence des totaux : somme des échéances = montant global.
- Performance : calcul instantané côté client pour usage admin.
- Testabilité : logique de calcul isolée dans le service.

---

## 8. Références

- `documentation/architecture/ARCHITECTURE.md`
- `documentation/architecture/PLAN_MIGRATION_DOMAINS.md`
- `documentation/credit-fixe/simulation/README.md`
- `documentation/credit-fixe/simulation/activite/SimulationCreditFixe.puml`
