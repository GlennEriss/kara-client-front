# Crédit Fixe – Sous-module Demandes

> Documentation du sous-module **demandes** pour Crédit Fixe.

## Objectif

Structurer la création et la gestion des demandes de type `FIXE`.

## Règles métier

- `creditType` obligatoire : `FIXE`.
- Garant obligatoire.
- Montant demandé obligatoire.
- La demande suit les statuts existants : `PENDING`, `APPROVED`, `REJECTED`.
- Le dossier doit préparer les données nécessaires à la création du contrat FIXE.

## Validation fonctionnelle attendue

- Le type de crédit doit rester `FIXE` pendant le parcours de demande.
- Les règles spécifiques FIXE doivent être conservées jusqu'à la conversion en contrat.
- Une demande validée est convertie en un seul contrat (relation 1:1 via `contractId`).

## Impacts techniques

- `src/components/credit-speciale/CreateCreditDemandModal.tsx`
- `src/components/credit-speciale/ListDemandes.tsx`
- `src/services/credit-speciale/CreditSpecialeService.ts`
- `src/repositories/credit-speciale/CreditDemandRepository.ts`
- `src/types/types.ts`

## Tests minimum

- Création d'une demande `FIXE`.
- Modification d'une demande `FIXE` en statut `PENDING`.
- Interdiction de modification si demande déjà traitée.
- Conversion de la demande en contrat unique.
