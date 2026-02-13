# Crédit Fixe – Index Documentation

> Le module **Crédit Fixe** est organisé en 3 sous-modules.
> Cette documentation est donc découpée en 3 dossiers dédiés.

## Structure

- `documentation/credit-fixe/simulation/README.md`
- `documentation/credit-fixe/demandes/README.md`
- `documentation/credit-fixe/contrats/README.md`

## Règles globales communes

- Produit : `creditType = FIXE`
- Taux : `0%` à `50%`
- Durée maximum : `14 mois`
- Garant obligatoire
- Contact urgent obligatoire
- Commission garant : `0%`
- Remboursement flexible possible
- Versement `0 FCFA` = statut métier `IMPAYE`
- Après 14 mois : pertes mensuelles = `15%` du restant dû

## Implémentation

- Architecture attendue : **domains-first**
- Cible technique : `src/domains/financial/credit-speciale/fixe/`
