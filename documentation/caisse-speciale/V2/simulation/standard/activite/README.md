# Diagrammes d'activité – Simulation Caisse Spéciale (Standard) V2

Ce dossier contient les diagrammes d'activité (workflows) pour le module Simulation Standard / Standard Charitable.

## Fichiers

| Fichier | Description |
|---------|-------------|
| [LancerSimulation.puml](./LancerSimulation.puml) | Formulaire (type, montant, durée 1–12, date) → récupération paramètres actifs → calcul échéancier + bonus → affichage tableau récapitulatif (colonnes dont Bonus gagné). Boutons Export PDF/Excel et **Partager sur WhatsApp** (texte formaté ou image du tableau). Aucune persistance. |
| [ExporterSimulation.puml](./ExporterSimulation.puml) | Export PDF et/ou Excel du tableau récapitulatif (optionnel, Phase 4). |

## Points couverts

- **Formulaire** : Type de caisse (STANDARD / STANDARD_CHARITABLE), montant mensuel, durée max 12 mois, date souhaitée.
- **Validation** : Zod (montant > 0, durée 1–12, date valide).
- **Paramètres** : Lecture seule des CaisseSettings actifs pour la bonusTable (M4–M12).
- **Tableau** : N° Échéance, Date d'échéance, Date de prise d'effet du bonus, Montant à verser, Taux bonus (%), Bonus gagné (FCFA).
- **Export** : PDF / Excel sans persistance.
- **Partage WhatsApp** : préparation d’un contenu (texte formaté ou image du tableau) et ouverture du lien WhatsApp pour envoi.

## Références

- [README.md](../README.md) – Contexte, formulaire, tableau
- [WORKFLOW.md](../workflow/WORKFLOW.md) – Tâches d'implémentation
- [Paramètres Caisse Spéciale](../../../V1/settings/README.md) – bonusTable
