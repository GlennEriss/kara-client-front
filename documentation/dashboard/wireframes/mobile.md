# Wireframe Mobile - Dashboard

> Cible mobile pour `/dashboard`, orientee lisibilite et priorisation des KPI.

## 1. Contexte

- Viewport cible: `320px` a `767px`
- Objectif: lecture rapide + navigation verticale fluide

## 2. Structure mobile

```text
┌─────────────────────────────────────┐
│ Header compact                      │
│ Tableau de bord                     │
│ Derniere mise a jour + Refresh      │
├─────────────────────────────────────┤
│ Filtres (drawer ou chips scroll)    │
│ [Periode] [Zone] [Type]             │
│ [Module compare] (tab Executive)    │
├─────────────────────────────────────┤
│ Tabs modules (horizontal scroll)    │
│ [Exec] [CS] [CI] [CrSpec] [CFixe]   │
│ [CAide] [Place] [Admin] [Reco] ...  │
├─────────────────────────────────────┤
│ Contenu du tab actif                │
│ - si tab Exec: cards executive      │
│ - cards KPI module                  │
│ - top listes module                 │
│ - mini chart module                 │
│ Exemple: tab \"CS\" -> stats         │
│ Caisse speciale uniquement          │
└─────────────────────────────────────┘
```

## 3. Principes UX mobile

- sections en cartes verticales, pas de tables larges
- KPI critiques en premier (tab Executive)
- boutons et zones tactiles >= 44px
- titre + valeur + variation sur 2 lignes max
- tabs modules toujours visibles apres les filtres

## 4. Comportements responsive

- charts complexes simplifies en top lists sur mobile
- filtres avances dans un drawer (eviter l'encombrement)
- actions secondaires dans menu `...`
- tabs modules scrollables horizontalement avec snap

## 5. Theme et modernite

- conserver palette projet (KARA blue/gold)
- cards avec ombres douces et coins arrondis
- icones claires et non decoratives uniquement
- transitions courtes (200-250ms)

## 6. Etats mobile

- loading: skeleton par section
- offline/error partiel: message inline dans section concernee
- stale cache: bandeau compact en haut

## 7. Regles tabs mobile

- Tabs en une ligne scrollable, label court (`CS`, `CI`, `CrSpec`, `CFixe`, `CAide`).
- Le tab actif est surligne (fond primary + texte blanc ou underline fort).
- Le changement de tab ne reset pas les filtres.
- Memoire du dernier tab selectionne en session (optionnel `localStorage`).
