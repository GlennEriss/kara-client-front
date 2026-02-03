# Wireframe – Liste des Contrats Caisse Spéciale (Tablette)

> Wireframe pour la **liste des contrats** – Tablette (640px - 1023px)

## 📋 Vue d'ensemble

**Page** : `/caisse-speciale` (liste contrats)  
**Organisation** : alignée sur `/caisse-speciale/demandes`  
**Design System** : palette KARA (bleu primaire #234D65, bleu secondaire #2c5a73, fonds clairs)

---

## 📱 Tablette (640px - 1023px)

### Icons Legend

- `FileText` = Titre module / Télécharger contrat
- `Search` = Recherche
- `Filter` = Filtres
- `User` / `Users` = Avatar fallback
- `AlertCircle` = Retard
- `CheckCircle` = Actif/validé
- `Calendar` = Dates
- `DollarSign` = Montants
- `Eye` = Ouvrir
- `Upload` = Téléverser PDF
- `Download` = Export
- `RefreshCw` = Actualiser
- `Plus` = Nouveau contrat

### Tabs Legend (tablette)

- **Tous** : `FileText`
- **Standard** : `FileText`
- **Journalier** : `Calendar`
- **Libre** : `FileText`
- **Standard Charitable** : `FileText`
- **Journalier Charitable** : `Calendar`
- **Libre Charitable** : `FileText`
- **Mois en cours** : `Calendar`
- **Retard** : `AlertCircle`

### Structure Générale

```
┌─────────────────────────────────────────────────────────┐
│  [Header KARA]                                          │
│  [FileText] Contrats Caisse Spéciale                    │ ← Titre module
│  Gérez les contrats en cours                            │ ← Brève description
│  2 contrats • Page 1                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [Stats Carousel]                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [Tabs]                                                 │
│  Tous | Standard | Journalier | Libre | Charitable | ...│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [Recherche + Filtres]                                  │
│  🔍 Rechercher (nom, prénom, matricule)                 │
│  [Statut ▼] [Type ▼] [Type caisse ▼]                    │
│  [Date création: du ▢ au ▢] [Date échéance: du ▢ au ▢]  │
│  [Retard uniquement ☐] [Réinitialiser filtres]          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [Barre d’actions]                                      │
│  [Actualiser] [Exporter Excel] [Nouveau Contrat]        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [Pagination]                                           │ ← Avant la liste
│  Affichage 1-12 sur 24 contrats                          │
│  [◀ Préc] [1] [2] [Suiv ▶]                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [Cards - 2 colonnes]                                   │
│  ┌───────────────────────────────┐ ┌──────────────────┐ │
│  │ [User] Matricule contrat       │ │ [User] Matricule│ │
│  │ [Badges état]                 │ │ [Badges état]    │ │
│  │ Type de contrat               │ │ Type de contrat  │ │
│  │ Nom / Prénom / Matricule      │ │ ...              │ │
│  │ Contacts                      │ │ ...              │ │
│  │ Contact urgent                │ │ ...              │ │
│  │ Mensualité / Durée / Dates    │ │ ...              │ │
│  │ PDF / Versé                   │ │ ...              │ │
│  │ Actions verticales            │ │ Actions          │ │
│  └───────────────────────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  [Pagination]                                           │ ← Après la liste
│  Affichage 1-12 sur 24 contrats                          │
│  [◀ Préc] [1] [2] [Suiv ▶]                              │
└─────────────────────────────────────────────────────────┘
```

### Spécifications Tablette

| Élément | Spécifications |
|---------|----------------|
| **Grille** | 2 cards par ligne, hauteur équilibrée |
| **Avatar** | photo membre, fallback initiales |
| **Matricule contrat** | non tronqué, retour ligne autorisé |
| **Toggle Grille/Liste** | **Non disponible** sur tablette (vue grille uniquement) |
| **Tabs** | Tous, Standard, Journalier, Libre, Standard Charitable, Journalier Charitable, Libre Charitable, Mois en cours, Retard |
| **Recherche** | input + debounce 300ms, min 2 caractères |
| **Filtres** | statut, type, type caisse, dates création/échéance, overdueOnly |
| **Pagination** | affichée **avant** et **après** la liste |
| **Badges** | ligne dédiée, wrap autorisé |
| **Actions** | verticales, largeur 100% |

### Icônes Lucide – mapping (tablette)

- **Header module** : `FileText`
- **Recherche** : `Search`
- **Tabs** : `FileText` (si icône utilisée), `AlertCircle` (Retard)
- **Avatar fallback** : `User` (individuel), `Users` (groupe)
- **Badge Retard** : `AlertCircle`
- **Dates** : `Calendar`
- **Montants** : `DollarSign`
- **Actions** : `Eye` (Ouvrir), `Upload` (Téléverser), `FileText` (Télécharger), `Download` (Exporter), `RefreshCw` (Actualiser), `Plus` (Nouveau contrat)

---

*Dernière mise à jour : 2026-02-03*
