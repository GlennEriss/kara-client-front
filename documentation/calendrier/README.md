# Module Calendrier – Documentation

## Vue d'ensemble

Le module **Calendrier** permet de visualiser et gérer tous les versements à effectuer pour les différents modules de l'application sur une vue calendrier mensuelle.

## Objectif

Créer une page avec différents onglets pour chaque module (caisse spéciale, caisse imprévue, Bienfaiteur/Placement, crédit spéciale) permettant de :
- Visualiser les versements à faire sur un calendrier mensuel
- Voir les jours du mois avec les échéances programmées
- Cliquer sur un jour pour voir les versements détaillés
- Effectuer les versements directement depuis le calendrier
- Conserver la logique d'enregistrement des versements de chaque module

## Structure de la documentation

### Analyses par module

1. **[Analyse Calendrier Crédit Spéciale](./ANALYSE_CALENDRIER_CREDIT_SPECIALE.md)**
   - Structure des échéances (`CreditInstallment`)
   - Récupération des données par mois
   - Affichage dans le calendrier
   - Enregistrement de paiements depuis le calendrier

2. **[Analyse Calendrier Caisse Spéciale](./ANALYSE_CALENDRIER_CAISSE_SPECIALE.md)** ✅
   - Structure des versements par type de contrat
   - Filtres par type (Journaliers, Standard, Libre)
   - Affichage par défaut des contrats journaliers
   - Dates d'échéance (`nextDueAt`, `dueAt`)
   - Gestion des retards

3. **Analyse Calendrier Caisse Imprévue** (à venir)
   - Structure des versements mensuels
   - Dates d'échéance
   - Gestion des retards

4. **Analyse Calendrier Placement/Bienfaiteur** (à venir)
   - Structure des commissions
   - Dates d'échéance des commissions
   - Gestion des retraits anticipés

### Architecture globale

- **Vue principale** : Page avec onglets par module
- **Composant calendrier** : Réutilisable pour tous les modules
- **Modals de paiement** : Réutilisation des modals existants de chaque module
- **Hooks de données** : Spécifiques à chaque module mais structure similaire

## Fonctionnalités communes

### Navigation calendrier
- Sélection du mois/année
- Navigation mois précédent/suivant
- Retour au mois en cours

### Affichage par jour
- Badge avec nombre d'échéances
- Indicateur visuel de statut (couleur)
- Montant total des échéances
- Clic pour voir les détails

### Gestion des versements
- Liste des échéances d'un jour
- Informations détaillées par échéance
- Bouton pour enregistrer un paiement
- Ouverture du modal de paiement du module concerné

## Prochaines étapes

1. ✅ Analyser le calendrier des crédits spéciaux
2. ✅ Analyser le calendrier de la caisse spéciale (avec filtres par type)
3. ⏳ Analyser le calendrier de la caisse imprévue
4. ⏳ Analyser le calendrier des placements/bienfaiteurs
5. ⏳ Définir l'architecture globale du composant calendrier
6. ⏳ Créer les diagrammes de séquence et d'activité
7. ⏳ Documenter les cas d'usage complets

## Références

- [Architecture globale](../architecture/ARCHITECTURE.md)
- [Documentation Crédit Spéciale](../credit-speciale/ANALYSE_CREDIT_SPECIALE.md)
- [Documentation Caisse Imprévue](../caisse-imprevue/)
- [Documentation Caisse Spéciale](../caisse-speciale/)
- [Documentation Placement](../placement/)
