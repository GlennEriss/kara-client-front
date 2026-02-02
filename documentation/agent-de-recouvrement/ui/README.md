# Wireframes UI/UX – Module Agents de Recouvrement

> Wireframes pour toutes les vues du module Agents de Recouvrement (Mobile, Tablette, Desktop)

## 📋 Vue d'ensemble

Ce dossier contient les wireframes pour les interfaces du module Agents de Recouvrement, conçus selon le Design System KARA et optimisés pour une expérience responsive sur tous les appareils.

**Design System** : KARA (Bleu foncé #234D65, Or #CBB171)  
**Framework UI** : Shadcn UI  
**Responsive** : Mobile-first (320px+), Tablette (640px+), Desktop (1024px+)

---

## 📁 Structure des Wireframes

```
ui/
├── README.md              # Ce fichier (vue d'ensemble)
├── WIREFRAME_LISTE.md     # Wireframe liste des agents
├── WIREFRAME_DETAILS.md   # Wireframe page détails d'un agent
└── WIREFRAME_MODALS.md    # Wireframes des modals (Créer, Modifier, Désactiver, Select)
```

---

## 📱 Vues

| Fichier | Description | Devices |
|---------|-------------|---------|
| [WIREFRAME_LISTE.md](./WIREFRAME_LISTE.md) | Liste des agents (stats, filtres, recherche, cards/liste, pagination) | Mobile, Tablette, Desktop |
| [WIREFRAME_DETAILS.md](./WIREFRAME_DETAILS.md) | Page détails (alertes, infos, contacts, statut, traçabilité) | Mobile, Tablette, Desktop |
| [WIREFRAME_MODALS.md](./WIREFRAME_MODALS.md) | Modals Créer, Modifier, Désactiver + Select agent dans paiements | Mobile, Tablette, Desktop |

---

## 📐 Breakpoints Responsive

| Device | Largeur | Classes Tailwind |
|--------|---------|------------------|
| **Mobile** | < 640px | `sm:` |
| **Tablette** | 640px - 1023px | `md:` |
| **Desktop** | ≥ 1024px | `lg:`, `xl:` |

---

## 🎯 Principes UX

- **Mobile-first** : Conception pour mobile en premier
- **Touch-friendly** : Zones de tap ≥ 44x44px sur mobile
- **Navigation adaptative** : Menu hamburger sur mobile
- **Grilles flexibles** : `grid` / `flex` avec breakpoints
- **Modals responsive** : `max-w-2xl` sur desktop, pleine largeur sur mobile

---

## 🔄 Composants Réutilisés

- **Stats Carousel** : Le carousel des stats sur la page liste reprend **strictement** le pattern de `MembershipsListStats` (`/memberships`). Référence : `src/domains/memberships/components/list/MembershipsListStats.tsx` – hook `useCarousel`, boutons ◀ ▶, drag/swipe, `ModernStatsCard` avec mini pie chart.
- **Badges Carousel (tabs)** : Sur mobile/tablette (`lg:hidden`), les onglets (Actifs, Tous, Inactifs, Anniversaires du mois) sont des badges cliquables dans un carousel horizontal, swipe au doigt uniquement (pas de boutons ◀ ▶), comme sur `/caisse-speciale/demandes`. Référence : `StatusFilterBadgesCarousel.tsx`.

---

## 📚 Références

- [README module](../README.md)
- [Diagrammes d'activité](../activity/)
- [Design System KARA](../../design-system/)
