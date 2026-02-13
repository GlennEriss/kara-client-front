# Crédit Fixe – Sous-module Contrats

> Documentation du sous-module **contrats** pour Crédit Fixe.

## Objectif

Définir la création et le suivi des contrats Crédit Fixe jusqu'au remboursement complet.

## Règles métier

- Durée max contrat : `14` mois.
- Taux max contrat : `50%`.
- Commission garant : `0%` obligatoire.
- Contact urgent : obligatoire.
- Paiements mensuels flexibles autorisés.
- Versement `0 FCFA` doit être enregistré et marqué `IMPAYE`.

## Calculs contractuels

- `interetUnique = amount * (interestRate / 100)`
- `totalAmount = amount + interetUnique`
- `monthlyPaymentAmount` de référence = `totalAmount / duration`

## Gestion post-échéance (après 14 mois)

- Si `amountRemaining > 0`, calculer chaque mois :
- `perteDuMois = amountRemaining * 0.15`
- Historiser la perte mensuelle pour le reporting.

## Impacts techniques

- `src/components/credit-speciale/ContractCreationModal.tsx`
- `src/components/credit-speciale/CreditContractDetail.tsx`
- `src/services/credit-speciale/CreditSpecialeService.ts`
- `src/repositories/credit-speciale/CreditContractRepository.ts`
- `src/types/types.ts`

## Tests minimum

- Création contrat FIXE avec `guarantorRemunerationPercentage = 0`.
- Paiement mensuel variable.
- Paiement `0 FCFA` -> statut `IMPAYE`.
- Calcul des pertes mois 15+ tant que le solde est positif.
