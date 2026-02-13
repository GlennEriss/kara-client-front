# Wireframe Desktop - Dashboard

> Cible desktop pour `/dashboard` avec statistiques de pilotage organisationnel.

## 1. Contexte

- Route: `/dashboard`
- Viewport cible: `>= 1024px`
- Theme: conserver les tokens actuels (KARA blue/gold + neutres)

## 2. Objectif UX

- donner une vision immediate de la sante metier
- permettre l'analyse par modules via onglets (tabs)
- garder une lecture claire sans surcharge visuelle

## 3. Structure desktop

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Header: "Tableau de bord" + date de generation + bouton Actualiser     │
├──────────────────────────────────────────────────────────────────────────┤
│ Barre filtres                                                           │
│ [Periode] [Province] [Ville] [Type membre] [Reset]                     │
│ (option: [Module compare] visible uniquement sur tab Executive)         │
├──────────────────────────────────────────────────────────────────────────┤
│ Tabs modules                                                            │
│ [Executive] [Caisse speciale] [Caisse imprevue] [Credit speciale]       │
│ [Credit fixe] [Caisse aide] [Placements] [Administration]               │
│ [Recouvrement] [Groupes] [Metiers] [Geographie]                         │
├──────────────────────────────────────────────────────────────────────────┤
│ Zone contenu tab actif                                                   │
│ - si tab \"Executive\": 4 KPI cards + synthese globale                    │
│ - si tab \"Caisse speciale\": stats CS uniquement                         │
│ - si tab \"Caisse imprevue\": stats CI uniquement                         │
│ - si tab \"Credit fixe\": stats CF uniquement                             │
│ - si tab \"Administration\": stats admins                                 │
│ - si tab \"Geographie\": repartition geo membres                          │
│ - etc.                                                                    │
│                                                                           │
│ Exemple tab actif (2 colonnes)                                           │
│ ┌──────────────────────────────────┬───────────────────────────────────┐ │
│ │ KPI cards module                 │ Graphiques module                │ │
│ │ + top listes                     │ + distributions                  │ │
│ └──────────────────────────────────┴───────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

## 4. Composants UI recommandes

- `Card` pour chaque bloc de statistiques
- `Tabs` (ou `SegmentedControl`) pour la navigation modules
- `Table` pour les tops (admins/groupes)
- `BarChart` pour top metiers et top collecteurs
- `DonutChart` pour repartitions (roles admin, H/F recouvrement)
- `Alert` pour warnings (snapshot stale, section fallback)

## 5. Style visuel

- Titre section: couleur primary dark (`#224D62`)
- Accents et badges: primary light (`#CBB171`)
- Fond: neutre clair + cartes blanches
- Espacement large pour garder une lecture executive

## 6. Responsive desktop -> tablette

- entre `768px` et `1023px`: sections en 1 colonne
- tables basculent en cards compactes
- filtres passent en 2 lignes avec wrap
- tabs modules en scroll horizontal si l'espace est insuffisant
- tab actif visuellement marque (underline + couleur primaire)

## 7. Etats d'ecran

- loading global: skeleton sections
- section error: card d'erreur locale + bouton retry section
- stale data: badge "Donnees non a jour" en haut

## 8. Comportement attendu des tabs

- Un seul tab actif a la fois.
- Le changement de tab conserve les filtres globaux (periode, zone, type membre).
- Chaque tab charge uniquement ses KPI et graphes metier.
- Les tabs financiers (`caisse speciale`, `caisse imprevue`, `credit speciale`, `credit fixe`, `caisse aide`, `placements`) permettent une lecture immediate par module.
