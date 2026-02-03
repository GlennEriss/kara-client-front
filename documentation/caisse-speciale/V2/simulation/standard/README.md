# Simulation Caisse Spéciale (Standard) – V2

Ce dossier documente le module **Simulation** de la Caisse Spéciale, limité aux types **Standard** et **Standard Charitable**. Ce module permet à l’admin de simuler un échéancier et les bonus sans créer de contrat ni de demande.

## 1. Contexte et périmètre

### 1.1. Objectif

Offrir un **outil de simulation** simple sous l’onglet Caisse Spéciale :

- L’admin remplit un formulaire (type de caisse, montant mensuel, durée, date souhaitée).
- Il valide et obtient un **tableau récapitulatif** des échéances avec une **colonne des bonus gagnés**, inspiré de l’historique des versements des contrats existants.

Aucune donnée n’est enregistrée en base : la simulation est **uniquement calcul côté client** (ou via un service de calcul sans persistance).

### 1.2. Place dans la navigation

Le module Simulation est un **sous-menu** de l’onglet Caisse Spéciale :

```
Caisse Spéciale
├── Demandes
├── Contrats
└── Simulation   ← nouveau
```

**Route proposée :** `/caisse-speciale/simulation` (ou `/caisse-speciale/simulation/standard` si on prévoit d’autres types plus tard).

### 1.3. Types de caisse concernés

D’après la [documentation des paramètres Caisse Spéciale](../../V1/settings/README.md) :

| Libellé UI            | Code (caisseType)   | Description                                      |
|-----------------------|---------------------|---------------------------------------------------|
| Standard              | `STANDARD`          | Contrats standard classiques                     |
| Standard Charitable   | `STANDARD_CHARITABLE` | Variante caritative du standard (règles dédiées) |

Les deux types utilisent les **paramètres actifs** (`caisseSettings`) de leur type pour la **bonusTable** (M4 à M12). Les bonus s’appliquent à partir du **mois 4** ; les mois 1 à 3 ont 0 % de bonus.

---

## 2. Formulaire de simulation

### 2.1. Champs du formulaire

| Champ                 | Type / Contraintes        | Obligatoire | Description |
|-----------------------|---------------------------|-------------|-------------|
| **Type de caisse**   | Sélection (liste)         | Oui         | Valeurs : **Standard** ou **Standard Charitable**. Détermine quel `caisseSettings` actif est utilisé pour la `bonusTable`. |
| **Montant mensuel**  | Nombre (FCFA)             | Oui         | Montant versé à chaque échéance. Strictement positif. |
| **Durée prévue**     | Nombre entier (mois)      | Oui         | Entre **1 et 12** mois (max 12). |
| **Date souhaitée**   | Date                      | Oui         | Date de prise d’effet souhaitée (premier jour du premier mois). Utilisée pour calculer les dates d’échéance (ex. même jour chaque mois). |

### 2.2. Validation

- **Montant mensuel** : > 0.
- **Durée** : 1 ≤ durée ≤ 12.
- **Date souhaitée** : date valide (et cohérente avec les règles métier si besoin).

À la soumission : récupération des **paramètres actifs** du type choisi (`STANDARD` ou `STANDARD_CHARITABLE`) pour disposer de la `bonusTable` (M4–M12), puis calcul de l’échéancier et des bonus.

### 2.3. Comportement après validation

1. Chargement des **CaisseSettings actifs** pour le `caisseType` sélectionné (lecture seule, pas d’écriture).
2. Calcul de l’échéancier : N lignes (N = durée en mois), avec pour chaque ligne :
   - N° échéance (M1, M2, …),
   - Date de prise d’effet du bonus (à partir de M4),
   - Date d’échéance,
   - Montant à verser à l’échéance,
   - **Bonus gagné** (montant en FCFA et/ou pourcentage).
3. Affichage du **tableau récapitulatif** (voir section 3).

---

## 3. Tableau récapitulatif

Le tableau est inspiré de l’**historique des versements** d’un contrat (ex. page `/caisse-speciale/contrats/[id]/versements`), où l’on voit clairement les échéances, les dates et les bonus.

### 3.1. Colonnes proposées

| Colonne | Description | Exemple / Règle |
|---------|-------------|------------------|
| **N° Échéance** | Numéro du mois (M1, M2, …) | M1, M2, …, M12 |
| **Date d’échéance** | Date à laquelle le versement est dû | Calculée à partir de la date souhaitée (même jour chaque mois). |
| **Date de prise d’effet du bonus** | À partir de quel mois le bonus s’applique | Mois 1–3 : « — » ou « 0 % ». À partir de M4 : date de l’échéance du mois concerné ou libellé du type « M4 », « M5 », etc. |
| **Montant à verser (FCFA)** | Montant de l’échéance | Égal au montant mensuel saisi. |
| **Taux bonus (%)** | Pourcentage de bonus applicable pour cette échéance | Mois 1–3 : 0. À partir de M4 : valeur issue de la `bonusTable` du paramètre actif (règle identique à `computeBonus` / affichage versements). |
| **Bonus gagné (FCFA)** | Montant du bonus pour cette échéance | Pour STANDARD : basé sur le montant nominal payé et le taux du mois (voir [engine.ts](../../../../src/services/caisse/engine.ts) et affichage versements). Mois 1–3 : 0. |

### 3.2. Règles des bonus (rappel)

- **Mois 1 à 3** : pas de bonus (0 %).
- **À partir du mois 4** : le taux appliqué pour l’échéance du mois M est donné par la `bonusTable` du paramètre actif (`M4`, `M5`, …, `M12`). Le **montant du bonus** pour une échéance est calculé comme dans le module contrats (référence : `computeBonus`, `getBonusPercentageForPayment` et affichage bonus dans la page versements).

Référence implémentation actuelle :  
`src/app/(admin)/caisse-speciale/contrats/[id]/versements/page.tsx` (colonnes N° échéance, Date d’échéance, Montant, Bonus appliqué / taux).

### 3.3. Optionnel

- Ligne de **total** : somme des montants à verser, somme des bonus.
- Export **PDF** et/ou **Excel** du tableau récapitulatif (sans persistance).
- **Partage sur WhatsApp** : bouton « Partager sur WhatsApp » permettant d’envoyer le tableau récapitulatif (texte formaté ou image du tableau) via un lien `wa.me` ou `api.whatsapp.com` avec message pré-rempli ou partage de fichier image.

---

## 4. Structure du dossier documentation

```
V2/simulation/
└── standard/
    ├── README.md           (ce fichier)
    ├── activite/           # Diagrammes d'activité (workflows) .puml
    │   ├── LancerSimulation.puml
    │   ├── ExporterSimulation.puml
    │   └── README.md
    ├── sequence/           # Diagrammes de séquence .puml
    │   ├── SEQ_LancerSimulation.puml
    │   ├── SEQ_ExporterSimulation.puml
    │   └── README.md
    ├── workflow/
    │   ├── README.md       (présentation du workflow)
    │   └── WORKFLOW.md     (tâches d'implémentation)
    ├── firebase/           # Usage Firebase (lecture caisseSettings uniquement)
    │   ├── README.md
    │   └── FIREBASE.md
    ├── ui/                 # Wireframes et spécifications UI
    │   ├── README.md
    │   └── WIREFRAME_SIMULATION.md
    └── tests/              # Plans de tests (unitaires, intégration, E2E)
        ├── README.md
        ├── TESTS_UNITAIRES.md
        ├── TESTS_INTEGRATION.md
        └── TESTS_E2E.md
```

---

## 5. Diagrammes

- **Activité** : [activite/README.md](./activite/README.md) – LancerSimulation, ExporterSimulation
- **Séquence** : [sequence/README.md](./sequence/README.md) – SEQ_LancerSimulation, SEQ_ExporterSimulation

## 6. Firebase, UI, Tests

- **Firebase** : [firebase/README.md](./firebase/README.md) – Lecture seule `caisseSettings`, aucune nouvelle règle ni index
- **UI** : [ui/README.md](./ui/README.md) – Wireframe page simulation (formulaire + tableau + actions)
- **Tests** : [tests/README.md](./tests/README.md) – Plans tests unitaires, intégration, E2E

## 7. Références

- [Paramètres Caisse Spéciale (settings)](../../V1/settings/README.md) – Types STANDARD / STANDARD_CHARITABLE, `bonusTable` M4–M12.
- [Demandes Caisse Spéciale V2](../demandes/README.md) – Structure et style de documentation.
- [Workflow Demandes](../demandes/workflow/WORKFLOW.md) – Organisation des phases et tâches.
- Page versements (inspiration tableau) : `src/app/(admin)/caisse-speciale/contrats/[id]/versements/page.tsx`.
- Calcul bonus : `src/services/caisse/engine.ts` (`computeBonus`), et logique d’affichage dans la page versements (`getBonusPercentageForPayment`, colonne bonus).

---

## 8. Prochaines étapes

1. **Implémentation** : Suivre le [WORKFLOW.md](./workflow/WORKFLOW.md) pour les tâches par phase.
2. **UI** : Réutiliser le design system et les composants (shadcn, Tailwind) comme pour Demandes et Contrats.
3. **Tests** : Tests unitaires sur le calcul d’échéancier et des bonus ; tests composants sur le formulaire et le tableau.
