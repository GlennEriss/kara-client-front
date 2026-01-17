# Wireframe UI - Module de Gestion des Demandes d'Adhésion

Ce document définit le design de l'interface utilisateur pour le module de gestion des demandes d'adhésion (`/membership-requests`). Il sert de guide pour le refactoring de l'UI actuelle.

---

## Sommaire

1. [Analyse du Besoin](#1-analyse-du-besoin)
2. [Choix du Format : Tableau vs Cards](#2-choix-du-format--tableau-vs-cards)
3. [Informations Essentielles au Traitement](#3-informations-essentielles-au-traitement)
4. [Actions Principales vs Secondaires](#4-actions-principales-vs-secondaires)
5. [Wireframe Proposé](#5-wireframe-proposé)
6. [Spécifications Détaillées](#6-spécifications-détaillées)
7. [Responsive Design](#7-responsive-design)

---

## 1. Analyse du Besoin

### Objectif Principal
L'admin doit pouvoir **traiter efficacement** les demandes d'adhésion :
- **Identifier rapidement** le demandeur
- **Voir le statut** de paiement et de traitement
- **Prendre une décision** (Approuver, Rejeter, Demander corrections)
- **Accéder aux détails** si nécessaire

### Problèmes Actuels Identifiés

| Problème | Impact | Priorité |
|----------|--------|----------|
| Actions principales cachées dans un dropdown | L'admin doit cliquer 2 fois pour agir | 🔴 Critique |
| Trop d'informations affichées par carte | Surcharge visuelle, difficulté à scanner | 🟠 Important |
| Informations non pertinentes au traitement | Email, âge, véhicule visibles mais pas utiles pour décider | 🟠 Important |
| Statut paiement pas assez visible | Critère clé pour l'approbation | 🔴 Critique |
| Date de soumission sans contexte | Pas d'indicateur d'ancienneté/urgence | 🟡 Mineur |

### Questions Clés pour le Traitement

Un admin se pose ces questions pour chaque dossier :

1. **Qui est le demandeur ?** → Nom, Photo (reconnaissance visuelle)
2. **Est-ce payé ?** → Critère obligatoire pour approuver
3. **Quel est le statut actuel ?** → Pour savoir quelle action prendre
4. **Depuis quand ?** → Pour prioriser les anciens dossiers
5. **Y a-t-il un problème ?** → Notes de corrections, motif rejet
6. **Ai-je besoin de plus d'infos ?** → Lien vers détails

---

## 2. Choix du Format : Tableau vs Cards

### Analyse Comparative

| Critère | Tableau | Cards |
|---------|---------|-------|
| **Densité d'information** | ✅ Plus dense, plus de dossiers visibles | ❌ Prend plus d'espace |
| **Scannabilité** | ✅ Facile de comparer les lignes | ❌ Œil doit parcourir chaque carte |
| **Actions rapides** | ✅ Boutons dans chaque ligne | ✅ Boutons visibles sur carte |
| **Informations riches** | ❌ Limité en colonnes | ✅ Plus flexible |
| **Mobile** | ❌ Scroll horizontal | ✅ Empilables |
| **Photo du demandeur** | ❌ Petite, mal intégrée | ✅ Bien visible |
| **Traitement en lot** | ✅ Checkboxes faciles | ❌ Plus difficile |

### Recommandation : **Tableau avec Vue Cards Mobile**

**Pourquoi le tableau ?**
- Le module est principalement un **outil de traitement** (workflow)
- L'admin doit **traiter plusieurs dossiers** rapidement
- Les **comparaisons** entre dossiers sont fréquentes
- Les **actions** doivent être rapidement accessibles

**Variante Cards pour mobile :**
- Sur mobile, le tableau devient des cards empilées
- Chaque card contient les mêmes informations clés

### Format Hybride Proposé

```
Desktop (>1024px) : Tableau avec actions inline
Tablet (768-1024px) : Tableau compact ou Cards en grille
Mobile (<768px) : Cards empilées
```

---

## 3. Informations Essentielles au Traitement

### Hiérarchie de l'Information

#### Niveau 1 : Critique (toujours visible)
| Information | Raison | Format |
|-------------|--------|--------|
| **Photo** | Reconnaissance visuelle rapide | Avatar 40x40px |
| **Nom complet** | Identification du demandeur | Texte gras |
| **Statut** | Savoir quelle action prendre | Badge coloré |
| **Paiement** | Critère obligatoire pour approuver | Badge Payé/Non payé |
| **Date de soumission** | Priorisation | Relative ("Il y a 3 jours") |
| **Actions principales** | Cœur du workflow | Boutons visibles |

#### Niveau 2 : Important (visible au hover ou sur demande)
| Information | Raison | Format |
|-------------|--------|--------|
| **Téléphone** | Contact rapide si besoin | Tooltip ou colonne optionnelle |
| **Matricule** | Référence unique | Monospace |
| **Parrain** | Contexte relationnel | Badge si parrain existe |

#### Niveau 3 : Détails (page de détails uniquement)
| Information | Raison |
|-------------|--------|
| Email | Rarement utilisé pour le traitement immédiat |
| Adresse complète | Pas pertinent pour la décision |
| Âge | Pas pertinent pour la décision |
| Véhicule | Pas pertinent pour la décision |
| Documents | Vérification approfondie |
| Entreprise/Profession | Vérification approfondie |

---

## 4. Actions Principales vs Secondaires

### Principe : Les Actions Principales Doivent Être Visibles

**❌ Problème actuel :** Toutes les actions sont dans un menu dropdown (...)

**✅ Solution proposée :**
- Actions **principales** = Boutons visibles directement
- Actions **secondaires** = Menu dropdown (...)

### Classification des Actions

#### Actions Principales (Boutons Visibles)

| Action | Condition d'affichage | Style | Position |
|--------|----------------------|-------|----------|
| **Approuver** | `status === 'pending' && isPaid` | Bouton vert plein | Droite, premier |
| **Rejeter** | `status === 'pending' \|\| status === 'under_review'` | Bouton rouge outline | Droite, après Approuver |
| **Corrections** | `status === 'pending'` | Bouton orange outline | Droite, après Rejeter |
| **Payer** | `status === 'pending' && !isPaid` | Bouton bleu plein | Droite, premier (si non payé) |

**Logique contextuelle :**
```
Si non payé :
  [Payer (bleu)] [Corrections (orange)] [Rejeter (rouge)] [...]

Si payé et en attente :
  [Approuver (vert)] [Corrections (orange)] [Rejeter (rouge)] [...]

Si en cours d'examen :
  [Approuver (vert)] [Rejeter (rouge)] [...]

Si approuvé ou rejeté :
  [...] (toutes les actions dans le dropdown)
```

#### Actions Secondaires (Menu Dropdown)

| Action | Description |
|--------|-------------|
| Voir les détails | Navigation vers page de détails |
| Fiche d'adhésion | Télécharger PDF |
| Voir pièce d'identité | Ouvrir modal recto/verso |
| Réouvrir le dossier | Remettre en status pending |
| Renouveler le code | Générer nouveau code de sécurité |
| Envoyer WhatsApp | Ouvrir WhatsApp avec message |
| Copier le lien de correction | Copier dans presse-papiers |

---

## 5. Wireframe Proposé

### 5.1 Structure Globale de la Page

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Demandes d'Adhésion                        [+ Nouvelle (dev)]│ │
│ │ Gérez les demandes d'inscription des membres                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ STATISTIQUES (StatsCarousel)                                    │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │  Total  │ │En attente│ │Approuvées│ │Rejetées │ │En cours │    │
│ │   127   │ │   23    │ │   89    │ │   10    │ │    5    │    │
│ │  100%   │ │  18.1%  │ │  70.1%  │ │   7.9%  │ │   3.9%  │    │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────────────────────────────┤
│ FILTRES & RECHERCHE                                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Toutes ▼] [En attente] [En cours] [Approuvées] [Rejetées]  │ │
│ │                                                              │ │
│ │ 🔍 Rechercher par nom, email, téléphone...     [Filtres ▼] │ │
│ │                                                              │ │
│ │ Filtres actifs: [Payé ×] [Depuis 7 jours ×]    [Réinitialiser]│
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ TABLEAU DES DEMANDES                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Photo │ Demandeur      │ Statut    │ Paiement │ Date   │ Actions │
│ ├───────┼────────────────┼───────────┼──────────┼────────┼─────────┤
│ │ [IMG] │ Jean DUPONT    │ ● Attente │ ✅ Payé  │ 3j     │ [Approuver] [Corrections] [Rejeter] [⋮]│
│ │       │ MK_2025_0127   │           │          │        │         │
│ ├───────┼────────────────┼───────────┼──────────┼────────┼─────────┤
│ │ [IMG] │ Marie KOUMBA   │ ● Attente │ ❌ Non   │ 5j     │ [Payer] [Corrections] [Rejeter] [⋮]│
│ │       │ MK_2025_0126   │           │          │        │         │
│ ├───────┼────────────────┼───────────┼──────────┼────────┼─────────┤
│ │ [IMG] │ Paul NZAMBA    │ ● Examen  │ ✅ Payé  │ 1j     │ [Approuver] [Rejeter] [⋮]│
│ │       │ MK_2025_0125   │           │          │        │         │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ PAGINATION                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Afficher [10 ▼] par page    [◀ Préc] 1 2 3 ... 13 [Suiv ▶]  │ │
│ │                              Page 1 sur 13 • 127 résultats   │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Ligne de Tableau Détaillée

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  [Photo]    Jean-Pierre MOUYABI                [● En attente]    [✅ Payé]   │
│   48px      MK_2025_0127                                                      │
│             +241 06 01 23 45                                                  │
│                                       Il y a 3 jours                          │
│                                                                               │
│             ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───┐               │
│             │ ✓ Approuver│ │⚠ Corrections│ │ ✗ Rejeter │ │ ⋮ │               │
│             └────────────┘ └────────────┘ └────────────┘ └───┘               │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

Variante non payé :
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  [Photo]    Marie-Claire KOUMBA               [● En attente]    [❌ Non payé]│
│   48px      MK_2025_0126                                                      │
│             +241 07 45 67 89                                                  │
│                                       Il y a 5 jours                          │
│                                                                               │
│             ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───┐               │
│             │ $ Payer    │ │⚠ Corrections│ │ ✗ Rejeter │ │ ⋮ │               │
│             └────────────┘ └────────────┘ └────────────┘ └───┘               │
│             (Approuver désactivé tant que non payé)                           │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

Variante en cours d'examen :
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  [Photo]    Paul NZAMBA                       [● En cours]      [✅ Payé]    │
│   48px      MK_2025_0125                       d'examen                       │
│             +241 05 98 76 54                                                  │
│                                       Il y a 1 jour                           │
│                                                                               │
│  ⚠️ Corrections demandées : "Mettre à jour la photo, ajouter..."   [Voir]    │
│                                                                               │
│             ┌────────────┐ ┌────────────┐ ┌───┐                               │
│             │ ✓ Approuver│ │ ✗ Rejeter │ │ ⋮ │                               │
│             └────────────┘ └────────────┘ └───┘                               │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Menu Dropdown Détaillé

```
┌──────────────────────────┐
│ ⋮                        │
├──────────────────────────┤
│ 👁️ Voir les détails      │
│ 📄 Fiche d'adhésion       │
│ 🪪 Voir pièce d'identité  │
├──────────────────────────┤
│ 🔄 Réouvrir le dossier   │  (si approuvé/rejeté)
│ 🔑 Renouveler le code    │  (si en cours d'examen)
├──────────────────────────┤
│ 📱 Envoyer WhatsApp      │  (si téléphone disponible)
│ 📋 Copier lien correction │  (si en cours d'examen)
└──────────────────────────┘
```

### 5.4 Vue Mobile (Cards)

```
┌─────────────────────────────────────┐
│ ┌───────────────────────────────┐   │
│ │ [Photo]  Jean-Pierre MOUYABI  │   │
│ │  64px    MK_2025_0127         │   │
│ │                                │   │
│ │  [● En attente]  [✅ Payé]    │   │
│ │                                │   │
│ │  📞 +241 06 01 23 45          │   │
│ │  📅 Il y a 3 jours            │   │
│ │                                │   │
│ │  ┌────────────────────────────┐   │
│ │  │    ✓ Approuver    (plein)  │   │
│ │  ├────────────────────────────┤   │
│ │  │    ⚠ Corrections  │ ✗ Rejeter│
│ │  └────────────────────────────┘   │
│ │                          [⋮ Plus] │
│ └───────────────────────────────┘   │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ [Photo]  Marie-Claire KOUMBA  │   │
│ │  64px    MK_2025_0126         │   │
│ │                                │   │
│ │  [● En attente]  [❌ Non payé]│   │
│ │                                │   │
│ │  📞 +241 07 45 67 89          │   │
│ │  📅 Il y a 5 jours            │   │
│ │                                │   │
│ │  ┌────────────────────────────┐   │
│ │  │    $ Payer        (plein)  │   │
│ │  ├────────────────────────────┤   │
│ │  │    ⚠ Corrections  │ ✗ Rejeter│
│ │  └────────────────────────────┘   │
│ │                          [⋮ Plus] │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 6. Spécifications Détaillées

### 6.1 Badges de Statut

| Statut | Couleur | Icône | Texte |
|--------|---------|-------|-------|
| `pending` | Ambre/Orange | ⏳ | En attente |
| `under_review` | Bleu | 🔍 | En cours d'examen |
| `approved` | Vert | ✅ | Approuvée |
| `rejected` | Rouge | ❌ | Rejetée |

**Style CSS :**
```css
.badge-pending { background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
.badge-under_review { background: #DBEAFE; color: #1E40AF; border: 1px solid #3B82F6; }
.badge-approved { background: #D1FAE5; color: #065F46; border: 1px solid #10B981; }
.badge-rejected { background: #FEE2E2; color: #991B1B; border: 1px solid #EF4444; }
```

### 6.2 Badges de Paiement

| État | Couleur | Icône | Texte |
|------|---------|-------|-------|
| Payé | Vert | ✅ | Payé |
| Non payé | Rouge | ❌ | Non payé |

**Style CSS :**
```css
.badge-paid { background: #D1FAE5; color: #065F46; }
.badge-unpaid { background: #FEE2E2; color: #991B1B; }
```

### 6.3 Boutons d'Actions

| Action | Style | Couleur | Icône |
|--------|-------|---------|-------|
| **Approuver** | Primary (plein) | Vert (kara-success) | CheckCircle |
| **Payer** | Primary (plein) | Bleu (kara-primary-dark) | DollarSign |
| **Corrections** | Secondary (outline) | Orange (kara-warning) | AlertTriangle |
| **Rejeter** | Destructive (outline) | Rouge (kara-error) | XCircle |
| **Plus (⋮)** | Ghost | Gris | MoreHorizontal |

**Style CSS :**
```css
.btn-approve { background: var(--kara-success); color: white; }
.btn-pay { background: var(--kara-primary-dark); color: white; }
.btn-corrections { border: 1px solid var(--kara-warning); color: var(--kara-warning); }
.btn-reject { border: 1px solid var(--kara-error); color: var(--kara-error); }
```

### 6.4 Date Relative

| Ancienneté | Format affiché | Indicateur visuel |
|------------|----------------|-------------------|
| < 1 jour | "Aujourd'hui" | Vert |
| 1-3 jours | "Il y a X jours" | Vert |
| 4-7 jours | "Il y a X jours" | Orange |
| > 7 jours | "Il y a X jours" | Rouge |
| > 30 jours | "Il y a X semaines" | Rouge + Badge "Urgent" |

**Exemple :**
```
Aujourd'hui     → texte vert
Il y a 2 jours  → texte vert
Il y a 5 jours  → texte orange
Il y a 10 jours → texte rouge
Il y a 3 semaines → texte rouge + badge "🚨 Urgent"
```

### 6.5 Indicateur de Corrections

Quand une demande est en `under_review` avec des corrections demandées :

```
┌────────────────────────────────────────────────────────────────┐
│ ⚠️ Corrections demandées                                       │
│ "Veuillez mettre à jour votre photo et ajouter..."  [Voir tout]│
│ Code: 123456 • Expire dans 36h          [📋 Copier] [📱 WhatsApp]│
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Responsive Design

### Breakpoints

| Breakpoint | Largeur | Affichage |
|------------|---------|-----------|
| Mobile | < 640px | Cards empilées |
| Tablet | 640px - 1024px | Tableau compact ou Cards en grille 2x |
| Desktop | > 1024px | Tableau complet |

### Colonnes par Breakpoint

| Colonne | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Photo | ✅ | ✅ | ✅ |
| Nom/Matricule | ✅ | ✅ | ✅ |
| Téléphone | ✅ | ✅ | ✅ |
| Statut | ✅ | ✅ | ✅ |
| Paiement | ✅ | ✅ | ✅ |
| Date | ✅ | ✅ | ✅ |
| Actions principales | ✅ (empilées) | ✅ (inline) | ✅ (inline) |
| Menu dropdown | ✅ | ✅ | ✅ |

### Adaptations Mobile

1. **Photo** : 64px au lieu de 48px (meilleure visibilité)
2. **Actions** : Empilées verticalement, bouton principal pleine largeur
3. **Informations** : Format liste avec icônes
4. **Badges** : Plus grands, plus espacés

---

## 8. Composants à Créer/Modifier

### Nouveaux Composants

| Composant | Description | Fichier |
|-----------|-------------|---------|
| `MembershipRequestsTable` | Tableau des demandes (desktop) | `src/components/memberships/MembershipRequestsTable.tsx` |
| `MembershipRequestRow` | Ligne de tableau | `src/components/memberships/MembershipRequestRow.tsx` |
| `MembershipRequestMobileCard` | Carte mobile | `src/components/memberships/MembershipRequestMobileCard.tsx` |
| `MembershipRequestActions` | Groupe de boutons d'actions | `src/components/memberships/MembershipRequestActions.tsx` |
| `MembershipRequestCorrectionBanner` | Bandeau de corrections | `src/components/memberships/MembershipRequestCorrectionBanner.tsx` |
| `RelativeDate` | Affichage de date relative avec couleur | `src/components/ui/relative-date.tsx` |

### Composants à Modifier

| Composant | Modifications |
|-----------|---------------|
| `MembershipRequestsList.tsx` | Découper, utiliser le tableau, responsive |
| `MembershipRequestCard.tsx` | Simplifier, extraire les actions |

---

## 9. Plan d'Implémentation

### Phase 1 : Création des Composants de Base
1. [ ] Créer `MembershipRequestActions` (boutons d'actions)
2. [ ] Créer `RelativeDate` (date relative avec couleur)
3. [ ] Créer `MembershipRequestCorrectionBanner`

### Phase 2 : Création du Tableau Desktop
4. [ ] Créer `MembershipRequestRow`
5. [ ] Créer `MembershipRequestsTable`
6. [ ] Intégrer dans `MembershipRequestsList`

### Phase 3 : Création de la Vue Mobile
7. [ ] Créer `MembershipRequestMobileCard`
8. [ ] Ajouter détection responsive dans `MembershipRequestsList`

### Phase 4 : Tests et Ajustements
9. [ ] Tester sur différentes tailles d'écran
10. [ ] Ajuster les espacements et couleurs
11. [ ] Valider avec l'équipe

---

## 10. Exemples de Code

### 10.1 Composant MembershipRequestActions

```tsx
// src/components/memberships/MembershipRequestActions.tsx
interface MembershipRequestActionsProps {
  request: MembershipRequest
  onApprove: () => void
  onReject: () => void
  onCorrections: () => void
  onPay: () => void
  isApproving?: boolean
  isPaying?: boolean
}

export function MembershipRequestActions({
  request,
  onApprove,
  onReject,
  onCorrections,
  onPay,
  isApproving,
  isPaying,
}: MembershipRequestActionsProps) {
  const { status, isPaid } = request
  const canApprove = status === 'pending' && isPaid
  const canPay = status === 'pending' && !isPaid
  const canCorrections = status === 'pending'
  const canReject = status === 'pending' || status === 'under_review'

  return (
    <div className="flex items-center gap-2">
      {/* Bouton principal : Payer ou Approuver */}
      {canPay && (
        <Button
          onClick={onPay}
          disabled={isPaying}
          className="bg-kara-primary-dark hover:bg-kara-secondary-dark"
        >
          <DollarSign className="w-4 h-4 mr-1" />
          Payer
        </Button>
      )}
      
      {canApprove && (
        <Button
          onClick={onApprove}
          disabled={isApproving}
          className="bg-kara-success hover:bg-kara-success/90"
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Approuver
        </Button>
      )}

      {/* Boutons secondaires */}
      {canCorrections && (
        <Button
          variant="outline"
          onClick={onCorrections}
          className="border-kara-warning text-kara-warning hover:bg-kara-warning/10"
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Corrections
        </Button>
      )}

      {canReject && (
        <Button
          variant="outline"
          onClick={onReject}
          className="border-kara-error text-kara-error hover:bg-kara-error/10"
        >
          <XCircle className="w-4 h-4 mr-1" />
          Rejeter
        </Button>
      )}

      {/* Menu dropdown pour actions secondaires */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/membership-requests/${request.id}`)}>
            <Eye className="w-4 h-4 mr-2" />
            Voir les détails
          </DropdownMenuItem>
          {/* ... autres actions secondaires */}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

### 10.2 Composant RelativeDate

```tsx
// src/components/ui/relative-date.tsx
interface RelativeDateProps {
  date: Date
  showUrgent?: boolean
}

export function RelativeDate({ date, showUrgent = true }: RelativeDateProps) {
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  let text: string
  let colorClass: string
  let isUrgent = false

  if (diffDays === 0) {
    text = "Aujourd'hui"
    colorClass = 'text-green-600'
  } else if (diffDays <= 3) {
    text = `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
    colorClass = 'text-green-600'
  } else if (diffDays <= 7) {
    text = `Il y a ${diffDays} jours`
    colorClass = 'text-orange-600'
  } else if (diffDays <= 30) {
    text = `Il y a ${diffDays} jours`
    colorClass = 'text-red-600'
    isUrgent = diffDays > 14
  } else {
    const weeks = Math.floor(diffDays / 7)
    text = `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`
    colorClass = 'text-red-600'
    isUrgent = true
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm ${colorClass}`}>{text}</span>
      {showUrgent && isUrgent && (
        <Badge variant="destructive" className="text-xs">
          🚨 Urgent
        </Badge>
      )}
    </div>
  )
}
```

---

## 11. Checklist de Validation

### Fonctionnel
- [ ] Actions principales visibles sans clic supplémentaire
- [ ] Statut paiement clairement visible
- [ ] Date avec indicateur d'urgence
- [ ] Informations essentielles en un coup d'œil
- [ ] Actions contextuelles selon le statut

### UX
- [ ] Scannabilité rapide (admin peut traiter 10+ dossiers/minute)
- [ ] Actions accessibles en 1 clic maximum
- [ ] Feedback visuel sur hover/focus
- [ ] Responsive fonctionnel (mobile, tablet, desktop)

### Design
- [ ] Cohérence avec la palette KARA
- [ ] Badges distinctifs par statut
- [ ] Hiérarchie visuelle claire
- [ ] Espacement approprié

---

## Références

- `ANALYSE_ACTUELLE.md` - État actuel du module
- `CRITIQUE_ARCHITECTURE.md` - Problèmes identifiés
- `DESIGN_SYSTEM_UI.md` - Composants UI réutilisables
- `src/constantes/membership-requests.ts` - Constantes centralisées
