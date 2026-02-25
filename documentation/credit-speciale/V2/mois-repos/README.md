# Mois de repos – Crédit Spéciale V2

> Analyse et spécification de la fonctionnalité **Mois de repos** pour les contrats crédit spéciale : permettre à un membre de reporter une échéance (maladie, cas de force majeure) sans pénalité, avec traçabilité admin.

---

## Sommaire

- [README.md](./README.md) – Ce fichier (vue d’ensemble)
- [ANALYSE_MOIS_REPOS.md](./ANALYSE_MOIS_REPOS.md) – Analyse détaillée : contraintes, points de casse, conception
- [PLAN_INTEGRATION_MOIS_REPOS.md](./PLAN_INTEGRATION_MOIS_REPOS.md) – Plan d’intégration global (ordre des lots, fichiers impactés)
- [SIMULATION_EXEMPLE.md](./SIMULATION_EXEMPLE.md) – Exemple chiffré : 1 M FCFA à 10 %, 7 échéances, montant par mois ; cas avec échéance 2 au repos → montant à l’échéance 3 ; échéances 7–9, deux repos

---

## Contexte rapide

- **Page concernée :** `/credit-speciale/contrats/[id]` (ex. `http://localhost:3000/credit-speciale/contrats/MK_CSP_9143_180226_1502`).
- **Bloc concerné :** Échéancier de paiement (onglet principal), avec le bouton « Payer cette échéance » pour chaque échéance à payer.
- **Idée :** Sous « Payer cette échéance », proposer un bouton **Mois de repos** (motif + enregistrement par un admin : id, nom, prénom, date/heure). L’échéance n’est pas payée, mais **aucune pénalité** n’est appliquée ; on considère que l’échéance est **décalée** à la suivante (comme si le mois N n’avait jamais existé pour le calcul).
- **Complexité :** La règle des **7 mois** (annulation des intérêts après la 7e échéance) et les calculs de l’onglet **Simulation** (échéance calculée, échéancier actuel) doivent rester cohérents avec ce « décalage » conceptuel.

L’analyse détaillée est dans [ANALYSE_MOIS_REPOS.md](./ANALYSE_MOIS_REPOS.md). Elle inclut notamment :
- **PDF / export** (§8) : timeline avec date début–fin pour chaque ligne (échéance ou mois de repos), calcul des dates à partir de `firstPaymentDate` et `monthNumber`.
- **Migration** (§9) : pas de script obligatoire ; champ optionnel `restMonths` (ou sous-collection), anciens contrats = tableau vide.
- **Statistiques** (§10) : indicateurs « nombre total de mois de repos » et « nombre de contrats avec au moins 1 mois de repos », plus affichage par contrat.
- **Plusieurs mois de repos** (§11) : contraintes (max 2 repos par contrat recommandé, optionnel max 12 mois calendaires), impact sur PDF, job et échéancier.
