# Wireframe – Liste des Contrats Caisse Spéciale (Mobile)

> Wireframe pour la **liste des contrats** – Mobile (< 640px)

## 📋 Vue d'ensemble

**Page** : `/caisse-speciale` (liste contrats)  
**Organisation** : alignée sur `/caisse-speciale/demandes`  
**Design System** : palette KARA (bleu primaire #234D65, bleu secondaire #2c5a73, fonds clairs)

---

## 📱 Mobile (< 640px)

### Structure Générale

```
┌─────────────────────────────────────┐
│  [Header KARA]                       │
│  [FileText] Contrats Caisse Spéciale │ ← Titre module
│  Gérez les contrats en cours         │ ← Brève description
│  2 contrats • Page 1                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Stats Carousel - lucide icons]     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Badges Carousel - Tabs]            │ ← Sans boutons (swipe)
│  ┌──────┐ ┌──────┐ ┌──────┐ ...      │
│  │Tous  │ │Std   │ │Jour. │          │
│  │  24  │ │  10  │ │  8   │          │
│  └──────┘ └──────┘ └──────┘          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Recherche + Filtres]               │
│  [Search] Rechercher (nom, prénom, matricule) │
│  [Statut ▼] [Type ▼]                 │
│  [Type caisse ▼]                     │
│  [Date création: du ▢ au ▢]          │
│  [Date échéance: du ▢ au ▢]          │
│  [Retard uniquement ☐]               │
│  [Réinitialiser filtres]             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Barre d’actions]                   │
│  [Actualiser] [Exporter Excel]       │
│  [Nouveau Contrat]                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Pagination]                        │ ← Avant la liste
│  Affichage 1-12 sur 24 contrats      │
│  [◀ Préc] [1] [2] [Suiv ▶]           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Cards - 1 colonne]                 │
│  ┌───────────────────────────────┐  │
│  │ [User] Matricule contrat       │  │ ← avatar membre (lucide User) si pas de photo
│  │      MK_DEMANDE_CS_...         │  │
│  │ [Badges: Individuel • Actif]  │  │
│  │ Type de contrat : Standard    │  │
│  │ Nom : ETOUNDI                 │  │
│  │ Prénom : Claude               │  │
│  │ Matricule membre : 0004.MK... │  │
│  │ Contacts : 06 00 00 00 00     │  │
│  │ Contact urgent:               │  │
│  │  - Nom : MBOGO                │  │
│  │  - Prénom : Alain             │  │
│  │  - Téléphone : 06 11 11 11 11 │  │
│  │ Mensualité : 10 000 FCFA      │  │
│  │ Durée : 5 mois                │  │
│  │ Début d’échéance : 02/02/26   │  │
│  │ Prochaine échéance : 02/03/26 │  │
│  │ Contrat PDF : Disponible      │  │
│  │ Versé : 10 000 FCFA           │  │
│  │ [Ouvrir]                      │  │
│  │ [Contrat d’inscription]       │  │
│  │ [Téléverser PDF] (si besoin)  │  │
│  │ [Télécharger contrat]         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [Pagination]                        │ ← Après la liste
│  Affichage 1-12 sur 24 contrats      │
│  [◀ Préc] [1] [2] [Suiv ▶]           │
└─────────────────────────────────────┘
```

### Spécifications Mobile

| Élément | Spécifications |
|---------|----------------|
| **Grille** | 1 card par ligne, `gap` identique à `/caisse-speciale/demandes` |
| **Toggle Grille/Liste** | **Non disponible** sur mobile (vue grille uniquement) |
| **Avatar** | photo membre (fallback initiales ou icône groupe) |
| **Matricule contrat** | **non tronqué**, monospace si besoin |
| **Badges (Tabs)** | **Carousel de badges sans boutons**, swipe uniquement (comme `/caisse-speciale/demandes`) |
| **Liste des tabs** | Tous, Standard, Journalier, Libre, Standard Charitable, Journalier Charitable, Libre Charitable, Mois en cours, Retard |
| **Recherche** | input plein largeur, placeholder “Nom, prénom, matricule…”, debounce 300ms, min 2 caractères |
| **Filtres** | statut, type (individuel/groupe), type caisse, dates création, dates échéance, overdueOnly |
| **Contacts** | téléphone(s) + email si dispo |
| **Contact urgent** | bloc distinct (Nom/Prénom/Téléphone) |
| **Actions** | colonne verticale, boutons pleine largeur |

---

*Dernière mise à jour : 2026-02-03*
