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

## Gestion après le terme prévu (clarification du 20 novembre 2026)

- Le terme est la dernière échéance de la durée réellement convenue (14 mois au maximum).
- Si le prêt reste impayé, une pénalité de 10 % du solde non remboursé naît à chaque échéance mensuelle suivante : la première un mois après le terme.
- La base se reconstruit avec les versements réels, jamais avec les mensualités seulement prévues ; les pénalités ne sont pas capitalisées.
- Le manque à gagner désigne ici le montant du prêt non remboursé, distinct de ces pénalités.
- Le paiement des pénalités n'augmente pas `amountPaid` et ne réduit pas `amountRemaining`.
- Les anciens encaissements `missedEarningsPayments` du fixe/aide conservent leurs identifiants et preuves ; ils sont désormais présentés comme paiements des pénalités après terme.
- Aucun rattrapage ni écriture automatique de pénalités n'est exécuté en base : historique et solde sont calculés à la lecture.
- Le Crédit aide suit la même séparation. Une transformation effectivement datée arrête les nouvelles pénalités de son ancien contrat.

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
