# Checklist QA - Francisation plateforme

## Objectif
Valider que l'interface utilisateur est 100% en français sur les écrans métier et administration, sans impacter les statuts techniques internes.

## Règles de validation
- Tous les libellés visibles sont en français (titres, boutons, badges, toasts, placeholders, messages vides, erreurs UI).
- Les statuts techniques (`pending`, `approved`, `Active`, `Paid`, etc.) peuvent rester en code, mais doivent être traduits à l'affichage.
- Aucun fallback anglais visible (`Unknown`, `N/A`, `No data`, `Loading...`, `Top ...`, `Export ...`).

## Parcours par module
1. Dashboard
- Vérifier onglets, filtres, KPI, graphiques, badges, états vides, notes.
- Vérifier `Executif`, statuts des distributions, et libellés d'alertes.

2. Caisse spéciale
- Vérifier demandes, contrats, versements, paramètres, exports, modales.
- Vérifier les statuts affichés et les messages de confirmation/erreur.

3. Caisse imprévue
- Vérifier demandes, contrats, versements, supports, exports.
- Vérifier les libellés d'étapes et les filtres.

4. Crédit (spéciale / fixe / aide)
- Vérifier demandes, contrats, simulations, modales d'actions.
- Vérifier KPI finance et repos en libellé français.

5. Placements
- Vérifier liste, détail, commissions, quittances, retraits anticipés.
- Vérifier les libellés de statuts, totaux et sections synthèse.

6. Adhésions / Membership
- Vérifier liste, détails, actions, exports, anniversaires.
- Vérifier messages d'erreur affichés à l'utilisateur.

7. Géographie / Référentiels / Admin
- Vérifier écrans CRUD, recherche, exports CSV, badges d'état.

## Cas transverses à valider
- États de chargement: `Chargement...`
- États vides: `Aucune donnée disponible`
- Exports: `Exporter CSV`, `Exporter Excel`, `Exporter PDF`
- Erreurs UI: français clair, sans code technique visible
- Accessibilité: labels cohérents (pas de mélange FR/EN dans les textes affichés)

## Méthode de recette
1. Parcourir chaque module avec un compte admin.
2. Capturer les résidus anglais détectés (capture + route + composant).
3. Corriger par lot.
4. Relancer lint/typecheck.
5. Revalider les parcours critiques.

## Critère de sortie
- 0 terme anglais visible dans les parcours principaux.
- 0 régression fonctionnelle suite aux corrections de libellés.
