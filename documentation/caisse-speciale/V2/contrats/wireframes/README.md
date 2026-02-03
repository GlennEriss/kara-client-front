# Wireframes – Contrats Caisse Spéciale V2

Ce document décrit l'organisation des **cards de la liste des contrats** (vue grille), telle que demandée.
Référence visuelle : `/caisse-speciale/demandes` (organisation des cards).

---

## Index des wireframes

| Fichier | Description | Devices |
|---------|-------------|---------|
| [WIREFRAME_LISTE_CONTRATS_MOBILE.md](./WIREFRAME_LISTE_CONTRATS_MOBILE.md) | Liste contrats – mobile (badges carousel, recherche, filtres, pagination) | Mobile |
| [WIREFRAME_LISTE_CONTRATS_TABLETTE.md](./WIREFRAME_LISTE_CONTRATS_TABLETTE.md) | Liste contrats – tablette (tabs, recherche, filtres, pagination) | Tablette |
| [WIREFRAME_LISTE_CONTRATS_DESKTOP.md](./WIREFRAME_LISTE_CONTRATS_DESKTOP.md) | Liste contrats – desktop (tabs, recherche, filtres, pagination) | Desktop |

---

## Objectif

- Aligner la mise en page des cards **Contrats** sur l'organisation des cards **Demandes**.
- Remplacer l’icône inutile par **la photo du membre**.
- Afficher clairement le **matricule du contrat** (non tronqué).
- Forcer **3 cards par ligne** en vue grille.

---

## Palette & composants (référence UI)

### Palette couleur (KARA)

- **Bleu primaire** : `#234D65`
- **Bleu secondaire** : `#2c5a73`
- **Fonds clairs** : variantes de gris très pâles (ex. `#f8fafc`, `#f1f5f9`)
- **Badges statut** : vert (actif), orange/rouge (retard), bleu (info)

### Composants UI

- **Boutons principaux** : fond `#234D65`, hover `#2c5a73`, texte blanc.
- **Boutons secondaires** : outline bleu, hover fond bleu clair.
- **Badges** : fond léger + bordure fine, texte contrasté.
- **Cards** : fond blanc, ombre légère, coins arrondis.

### Classes / variants utilisés (référence code)

**Boutons** (extraits de `ListContracts.tsx`) :
- **Primary** : `bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white shadow-lg`
- **Secondary outline** : `bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white`
- **Actions outline** : `border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white`

**Badges** :
- **Retard** : `Badge` variant `destructive`
- **Infos** : classes custom (ex. `bg-blue-100 text-blue-700 border border-blue-200`)
- **Groupe** : `bg-purple-100 text-purple-700 border border-purple-200`

**Badges statut contrat (mapping exact)** :
- `DRAFT` : `bg-slate-100 text-slate-700 border-slate-200`
- `ACTIVE` : `bg-green-100 text-green-700 border-green-200`
- `LATE_NO_PENALTY` : `bg-yellow-100 text-yellow-700 border-yellow-200`
- `LATE_WITH_PENALTY` : `bg-orange-100 text-orange-700 border-orange-200`
- `DEFAULTED_AFTER_J12` : `bg-red-100 text-red-700 border-red-200`
- `EARLY_WITHDRAW_REQUESTED` : `bg-blue-100 text-blue-700 border-blue-200`
- `FINAL_REFUND_PENDING` : `bg-indigo-100 text-indigo-700 border-indigo-200`
- `EARLY_REFUND_PENDING` : `bg-blue-100 text-blue-700 border-blue-200`
- `RESCINDED` : `bg-red-100 text-red-700 border-red-200`
- `CLOSED` : `bg-gray-100 text-gray-700 border-gray-200`

**Badge inline (template)** :
- `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`

**Inputs / selects** :
- `border border-gray-300 rounded-xl bg-white text-gray-900`
- `focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65]`
- **Recherche (input)** :
  - `pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-500`
  - `focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200`
- **Selects filtres** :
  - `px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900`
  - `focus:ring-2 focus:ring-[#234D65] focus:border-[#234D65] transition-all duration-200`
- **Bouton reset filtres** :
  - `variant="outline"`
  - `px-4 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400`

**Tabs – Desktop (TabsList / TabsTrigger)** :
- `TabsList` : `grid w-full max-w-5xl grid-cols-6 gap-2`
- `TabsTrigger` : `flex items-center gap-2`
- **Onglet “Retard”** : `text-red-600 data-[state=active]:text-red-700 data-[state=active]:bg-red-50`

**Badges carousel – Mobile/Tablette** (référence `StatusFilterBadgesCarousel.tsx`) :
- **Container** : `flex gap-2 md:gap-3 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x`
- **Snap** : `scrollSnapType: 'x mandatory'` + `scrollSnapAlign: 'center'`
- **Fade** : `absolute left-0/right-0 ... bg-gradient-to-r/l from-white to-transparent`
- **Chip (base)** :
  - `flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-medium text-sm whitespace-nowrap transition-all duration-200 flex-shrink-0`
  - `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#234D65]`
  - `active:scale-95`
- **Chip actif** : `scale-105` + `activeColor` (ex. `bg-[#234D65] text-white border-[#234D65] shadow-lg shadow-[#234D65]/20`)

**Cards (contrats)** :
- `Card` : `group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative h-full flex flex-col`
- **Badge “Retard”** : `Badge variant="destructive" className="absolute top-3 right-3 z-20 flex items-center gap-1"`

**Header module (liste)** :
- **Icon container** : `p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg`
- **Titre** : `text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent`

### Icônes Lucide (référence)

- **Titre module** : `FileText`
- **Recherche** : `Search`
- **Filtres** : `Filter`
- **Actualiser** : `RefreshCw`
- **Grille/Liste** : `Grid3X3`, `List`
- **Export** : `Download`
- **Nouveau contrat** : `Plus`
- **Retard** : `AlertCircle`
- **Actif/validé** : `CheckCircle`
- **En attente** : `Clock`
- **Ouvrir** : `Eye`
- **Dates** : `Calendar`
- **Montants** : `DollarSign`
- **Avatar fallback** : `User` (individuel), `Users` (groupe)
- **Upload PDF** : `Upload`
- **Stats** : `TrendingUp`, `BarChart3`
- **Pagination carousel stats** : `ChevronLeft`, `ChevronRight`

**Toggle Grille/Liste (desktop)** :
- **Container** : `flex items-center bg-gray-100 rounded-xl p-1 shadow-inner hidden md:flex`
- **Bouton actif** : `bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105`
- **Bouton inactif** : `hover:bg-white hover:shadow-md`
- **Boutons** : `h-10 px-4 rounded-lg transition-all duration-300`

**Actions – barre principale** :
- **Actualiser** : `bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white`
- **Exporter Excel** : `bg-white border-2 border-green-300 hover:border-green-400 hover:bg-green-50 text-green-700 hover:text-green-800`
- **Nouveau Contrat** : `bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white shadow-lg`

**Actions – card (verticales)** :
- **Ouvrir** : `bg-white text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white`
- **Contrat d'inscription** : `border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400`
- **Téléverser PDF** : `bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 hover:text-orange-800`
- **Télécharger contrat** : `border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white`


---

## Grille (layout)

- **Organisation** : même rythme/espacement que `/caisse-speciale/demandes`.

## Wireframes par device

### Mobile

- **Grille** : 1 card par ligne.
- **Header card** : avatar + matricule contrat sur 2 lignes si besoin.
- **Badges** : ligne dédiée, wrap autorisé.
- **Actions** : pile verticale, pleine largeur.

### Tablette

- **Grille** : 2 cards par ligne.
- **Header card** : avatar + matricule contrat sur une ligne.
- **Badges** : ligne dédiée, wrap autorisé.
- **Actions** : pile verticale, largeur 100%.

### Desktop

- **Grille** : 3 cards par ligne.
- **Header card** : avatar + matricule contrat sur une ligne, alignement gauche.
- **Badges** : ligne dédiée (Individuel, Retard, Actif...).
- **Actions** : pile verticale, alignée à gauche.

---

## Structure d’une card (ordre strict des lignes)

1. **Photo du membre** (avatar) à la place de l’icône.
2. **Matricule du contrat** (visible en entier, non tronqué).
3. **Badges d’état** (ex. : Individuel, Retard, Actif…).
4. **Type de contrat**.
5. **Nom du membre**.
6. **Prénom du membre**.
7. **Matricule du membre**.
8. **Contacts du membre**.
9. **Contact urgent** :
   - Nom
   - Prénom
   - Téléphone
10. **Mensualité**.
11. **Durée**.
12. **Date de début d’échéance**.
13. **Prochaine échéance**.
14. **État du contrat PDF**.
15. **Versé : X FCFA**.
16. **Actions** alignées **verticalement** (colonne de boutons).

---

## Notes d’implémentation (UX)

- Le matricule du contrat doit être **lisible** et **non tronqué** (ex. monospace si besoin).
- Les badges d’état doivent être **sur une seule ligne** si possible.
- Les informations de contact doivent être **lisibles** (téléphone, email si disponible).
- Le bloc contact urgent doit être **clairement séparé** des infos membre.

---

*Dernière mise à jour : 2026-02-03*
