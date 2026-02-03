# Workflow d’implémentation – Simulation Caisse Spéciale (Standard) V2

> Ce document organise les **tâches d’implémentation** du module Simulation (Standard / Standard Charitable), dans un ordre de réalisation cohérent avec l’architecture du projet KARA.

**Référence :** [documentation/general/WORKFLOW.md](../../../../../general/WORKFLOW.md)

---

## Comment utiliser ce workflow

1. Ce workflow est le **guide** pour réaliser le module Simulation.
2. **Avant chaque phase** : consulter le [README.md](../README.md) (formulaire, tableau, règles des bonus) et les références techniques indiquées.
3. **Skills** : pour chaque phase, utiliser les skills listés (`.cursor/skills/`) si pertinent (shadcn-ui, tailwind-design-system, tailwind-patterns).
4. Mettre à jour le workflow au fur et à mesure : cocher les tâches réalisées, adapter si nécessaire.

---

## Répertoire des skills

| Skill | Usage |
|-------|--------|
| **shadcn-ui** | Formulaire (Select, Input, Button, Card), tableau (Table) |
| **tailwind-design-system** | Cohérence visuelle avec Demandes / Contrats |
| **tailwind-patterns** | Styles et responsive |

Aucune persistance Firestore pour la simulation : pas de phase « Infrastructure Firebase » dédiée. Lecture seule des `caisseSettings` pour la bonusTable.

---

## Table des matières

1. [Contexte et ordre d’implémentation](#1-contexte-et-ordre-dimplémentation)
2. [Phase initiale – Créer la branche](#phase-initiale--créer-la-branche)
3. [Phase 0 – Route et menu](#phase-0--route-et-menu)
4. [Phase 1 – Formulaire de simulation](#phase-1--formulaire-de-simulation)
5. [Phase 2 – Récupération des paramètres](#phase-2--récupération-des-paramètres)
6. [Phase 3 – Calcul et tableau récapitulatif](#phase-3--calcul-et-tableau-récapitulatif)
7. [Phase 4 – Export (optionnel)](#phase-4--export-optionnel)
8. [Definition of Done](#definition-of-done)

---

## 1. Contexte et ordre d’implémentation

### Principe

- **Simulation = calcul + affichage** : aucune création de contrat ni de demande, pas d’écriture en base pour les données de simulation.
- **Lecture seule** : récupération des `caisseSettings` actifs (STANDARD ou STANDARD_CHARITABLE) pour la `bonusTable`.
- Ordre recommandé : **Route/Menu → Formulaire → Paramètres → Calcul/Tableau → Export (optionnel)**.

### Dépendances

- Réutilisation de la logique de calcul des bonus existante (`computeBonus`, `bonusTable` M4–M12).
- Réutilisation des hooks / repositories existants pour lire les paramètres Caisse Spéciale (settings actifs par type).

---

## Phase initiale – Créer la branche

**Skills :** —

### Tâches

- [ ] **Init.1** Depuis `develop` : `git checkout develop` puis `git pull`
- [ ] **Init.2** Créer la branche : `git checkout -b feat/caisse-speciale-simulation-standard`
- [ ] **Init.3** Convention : `feat/<module>-<feature>`

### Exemple

```bash
git checkout develop
git pull
git checkout -b feat/caisse-speciale-simulation-standard
```

---

## Phase 0 – Route et menu

**Skills :** [shadcn-ui](https://github.com/shadcn-ui/ui), [tailwind-design-system](https://tailwindcss.com/docs) — Navigation, layout

**Référence :** [README.md](../README.md) – Section 1.2 (Place dans la navigation) | [SEQ_LancerSimulation.puml](../sequence/SEQ_LancerSimulation.puml)

### Tâches

- [ ] **0.1** Ajouter l’entrée **Simulation** dans le menu Caisse Spéciale (sidebar) : sous-menu ou lien visible avec Demandes et Contrats.
- [ ] **0.2** Créer la page (ou route) pour la simulation : ex. `src/app/(admin)/caisse-speciale/simulation/page.tsx` (route `/caisse-speciale/simulation`).
- [ ] **0.3** Breadcrumbs : ex. `Caisse Spéciale > Simulation`.
- [ ] **0.4** Titre de page : ex. « Simulation Caisse Spéciale » ou « Simuler un contrat Standard ».

### Tests

- [ ] La route `/caisse-speciale/simulation` est accessible pour un admin.
- [ ] Le menu Caisse Spéciale affiche bien Simulation avec Demandes et Contrats.

---

## Phase 1 – Formulaire de simulation

**Skills :** [shadcn-ui](https://github.com/shadcn-ui/ui), [tailwind-design-system](https://tailwindcss.com/docs), [tailwind-patterns](https://tailwindcss.com/docs) — Form, validation

**Référence :** [README.md](../README.md) – Section 2 (Formulaire de simulation) | [LancerSimulation.puml](../activite/LancerSimulation.puml) | [SEQ_LancerSimulation.puml](../sequence/SEQ_LancerSimulation.puml)

### Tâches

- [ ] **1.1** Champ **Type de caisse** : liste de sélection avec deux options – **Standard** (`STANDARD`) et **Standard Charitable** (`STANDARD_CHARITABLE`). Libellés UI clairs.
- [ ] **1.2** Champ **Montant mensuel** : saisie numérique (FCFA), obligatoire, strictement positif.
- [ ] **1.3** Champ **Durée prévue** : entier, entre 1 et 12 mois (contrainte max 12). Obligatoire.
- [ ] **1.4** Champ **Date souhaitée** : sélecteur de date (date de prise d’effet / premier mois). Obligatoire.
- [ ] **1.5** Validation côté client (Zod ou équivalent) : montant > 0, durée entre 1 et 12, date valide.
- [ ] **1.6** Bouton de soumission : ex. « Lancer la simulation » ou « Valider ». Au clic : ne pas envoyer de données en base ; préparer les entrées pour le calcul (type, montant, durée, date + récupération des paramètres).

### Tests

- [ ] Impossible de soumettre si montant ≤ 0 ou durée hors [1, 12].
- [ ] Les valeurs saisies sont bien utilisées pour la suite (Phase 2 et 3).

---

## Phase 2 – Récupération des paramètres

**Skills :** Réutilisation des repositories / services existants (caisse-speciale settings)

**Référence :** [README.md](../README.md) – Section 2.3 ; [settings README](../../../V1/settings/README.md) – bonusTable ; [SEQ_LancerSimulation.puml](../sequence/SEQ_LancerSimulation.puml)

### Tâches

- [ ] **2.1** Après soumission du formulaire : appeler le mécanisme existant pour récupérer les **CaisseSettings actifs** du `caisseType` choisi (STANDARD ou STANDARD_CHARITABLE).
- [ ] **2.2** S’assurer que la **bonusTable** (M4 à M12) est disponible pour le calcul des bonus. Gérer le cas « aucun paramètre actif » (message explicite à l’utilisateur, pas de calcul de bonus).
- [ ] **2.3** Passer en entrée du calcul : type, montant mensuel, durée, date souhaitée, bonusTable (ou settings complet).

### Tests

- [ ] Pour STANDARD et STANDARD_CHARITABLE, les paramètres actifs sont bien chargés.
- [ ] Si aucun paramètre actif, l’utilisateur est informé et le tableau peut afficher 0 % / 0 FCFA pour les bonus.

---

## Phase 3 – Calcul et tableau récapitulatif

**Skills :** [shadcn-ui](https://github.com/shadcn-ui/ui) — Table, Card ; logique métier (engine, bonus)

**Référence :** [README.md](../README.md) – Section 3 (Tableau récapitulatif) ; [LancerSimulation.puml](../activite/LancerSimulation.puml) ; [SEQ_LancerSimulation.puml](../sequence/SEQ_LancerSimulation.puml) ; page versements `src/app/(admin)/caisse-speciale/contrats/[id]/versements/page.tsx` ; `src/services/caisse/engine.ts` (`computeBonus`)

### Tâches

- [ ] **3.1** Calcul de l’échéancier : pour chaque mois de 1 à N (durée) :
  - N° échéance (M1, M2, …),
  - Date d’échéance (à partir de la date souhaitée, même jour chaque mois),
  - Montant à verser = montant mensuel saisi,
  - Taux bonus (%) : 0 pour M1–M3 ; pour M4–M12, utiliser la bonusTable du paramètre actif (même règle que `computeBonus` / affichage versements),
  - Bonus gagné (FCFA) : calcul cohérent avec le module contrats (montant nominal × taux pour l’échéance concernée).
- [ ] **3.2** Affichage du **tableau récapitulatif** avec colonnes : **N° Échéance**, **Date d’échéance**, **Date de prise d’effet du bonus** (ou équivalent), **Montant à verser (FCFA)**, **Taux bonus (%)**, **Bonus gagné (FCFA)**.
- [ ] **3.3** (Optionnel) Ligne de totaux : somme des montants à verser, somme des bonus.
- [ ] **3.4** Design aligné avec l’historique des versements (lisible, responsive). Réutilisation des composants Table / Card existants.
- [ ] **3.5** Bouton **« Partager sur WhatsApp »** : préparer un contenu partageable (texte formaté du tableau ou image), ouvrir le lien WhatsApp (`wa.me/?text=...` ou partage de fichier) pour que l’admin puisse envoyer le récapitulatif.

### Tests

- [ ] Pour une durée de 12 mois et un type avec bonusTable renseignée, les lignes M4–M12 affichent un taux et un montant de bonus cohérents avec la bonusTable.
- [ ] Mois 1–3 : bonus 0 % et 0 FCFA.
- [ ] Les dates d’échéance sont correctes (même jour chaque mois à partir de la date souhaitée).

---

## Phase 4 – Export (optionnel)

**Skills :** [react-pdf](https://react-pdf.org/) et/ou jsPDF, exports Excel si déjà utilisés dans le projet

**Référence :** [README.md](../README.md) – Section 3.3 ; [ExporterSimulation.puml](../activite/ExporterSimulation.puml) ; [SEQ_ExporterSimulation.puml](../sequence/SEQ_ExporterSimulation.puml) ; exports de la page versements (PDF / Excel)

### Tâches

- [ ] **4.1** Bouton « Exporter en PDF » : génération d’un PDF contenant le tableau récapitulatif (même colonnes que l’écran), sans persistance.
- [ ] **4.2** (Optionnel) Bouton « Exporter en Excel » : même contenu en fichier Excel. Réutiliser la logique d’export existante (ex. page versements) si possible.
- [ ] **4.3** Nom du fichier exporté : cohérent avec les conventions du projet (ex. `simulation_caisse_speciale_YYYY-MM-DD.pdf`).

### Tests

- [ ] Le PDF généré contient bien toutes les colonnes et les totaux si présents.
- [ ] Aucune donnée de simulation n’est enregistrée en base lors de l’export.

---

## Definition of Done

Pour chaque phase, avant de passer à la suivante :

- [ ] Code aligné avec l’architecture du projet (composants, hooks, services existants).
- [ ] Design cohérent avec le reste du module Caisse Spéciale (Demandes, Contrats).
- [ ] Validation des champs (montant, durée 1–12, date).
- [ ] Tests manuels : au moins un scénario Standard et un Standard Charitable, avec vérification des bonus M4–M12.
- [ ] Aucune régression sur les fonctionnalités existantes (Demandes, Contrats, paramètres).

---

## Références

- [README.md](../README.md) – Contexte, formulaire, tableau, règles des bonus
- [firebase/FIREBASE.md](../firebase/FIREBASE.md) – Lecture caisseSettings, pas de nouvelle règle
- [ui/WIREFRAME_SIMULATION.md](../ui/WIREFRAME_SIMULATION.md) – Spécification de la page
- [tests/README.md](../tests/README.md) – Plans de tests unitaires, intégration, E2E
- [documentation/general/WORKFLOW.md](../../../../../general/WORKFLOW.md) – Workflow hybride KARA
- [Paramètres Caisse Spéciale](../../../V1/settings/README.md) – Types, bonusTable
- [Demandes – WORKFLOW.md](../../demandes/workflow/WORKFLOW.md) – Style et structure des phases
- Page versements : `src/app/(admin)/caisse-speciale/contrats/[id]/versements/page.tsx`
- Calcul bonus : `src/services/caisse/engine.ts` (`computeBonus`)
