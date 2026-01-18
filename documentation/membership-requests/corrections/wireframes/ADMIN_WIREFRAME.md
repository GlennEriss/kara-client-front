# Wireframe Admin - Demander des Corrections
## Page : `/membership-requests`

## 📋 Vue d'ensemble

Ce document détaille les modifications UI/UX à apporter à la page `/membership-requests` pour la fonctionnalité de demande de corrections, basé sur les diagrammes d'activité et de séquence.

---

## 🎯 État Initial - Page `/membership-requests`

### Structure existante

```
┌─────────────────────────────────────────────────────────────┐
│ DashboardPageLayout                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PageHeader                                              │ │
│ │ "Gestion des Demandes d'Inscription"                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ StatsCarousel (statistiques)                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ TabsSection                                              │ │
│ │ [Toutes] [En attente] [En cours] [Approuvées] [Rejetées]│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ FiltersBar + SearchInput                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ MembershipRequestCard/Row (liste)                       │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ [Photo] Nom Prénom                                 │ │ │
│ │ │ Email • Téléphone • Adresse                        │ │ │
│ │ │ [Badge: En attente] [Badge: Non payé]              │ │ │
│ │ │                                                     │ │ │
│ │ │ [Approuver] [Rejeter] [Payer] [⋮]                 │ │ │
│ │ │                                                     │ │ │
│ │ │ Dropdown menu (⋮):                                  │ │ │
│ │ │   - Voir les détails                               │ │ │
│ │ │   - Fiche d'adhésion                               │ │ │
│ │ │   - Voir pièce d'identité                          │ │ │
│ │ │   - Détails du paiement                            │ │ │
│ │ │   - Exporter PDF                                   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Modifications à apporter

### 1. **Action "Demander corrections" dans le Dropdown "⋮"**

#### 📍 Emplacement
Dans le composant `MembershipRequestActionsV2`, ajouter l'action dans le **dropdown menu "⋮ Plus d'actions"** (visible si `status === 'pending'`).

#### 🎨 Design

**Dropdown "⋮ Plus d'actions" (si status = 'pending') :**
```
┌─────────────────────────────────────────┐
│ ⋮ Plus d'actions                        │
│ ─────────────────────────────────────── │
│ 📝 Demander des corrections             │
│ ─────────────────────────────────────── │
│ 👁️ Voir les détails                     │
│ 📄 Fiche d'adhésion                     │
│ 🆔 Voir pièce d'identité                │
│ ❌ Rejeter                              │
└─────────────────────────────────────────┘
```

**Dropdown "⋮ Plus d'actions" (si status = 'under_review') :**
```
┌─────────────────────────────────────────┐
│ ⋮ Plus d'actions                        │
│ ─────────────────────────────────────── │
│ 🔗 Copier lien de correction            │
│ 💬 Envoyer via WhatsApp                 │
│ 🔄 Régénérer le code                    │
│ ─────────────────────────────────────── │
│ 👁️ Voir les détails                     │
│ 📄 Fiche d'adhésion                     │
│ 🆔 Voir pièce d'identité                │
│ ❌ Rejeter                              │
└─────────────────────────────────────────┘
```

#### 🎯 Spécifications

**MenuItem "Demander des corrections" :**
- **Icône** : `<FileEdit className="w-4 h-4" />`
- **Texte** : "Demander des corrections"
- **Visible** : Si `status === 'pending'`
- **État disabled** : Si `isRequestingCorrections === true`
- **Loading state** : Afficher `<Loader2 className="w-4 h-4 animate-spin" />` à la place de l'icône si `isRequestingCorrections === true`

**Code :**
```tsx
<DropdownMenuItem
  onClick={onRequestCorrections}
  disabled={isRequestingCorrections}
  className="text-amber-700 focus:text-amber-800 focus:bg-amber-50"
  data-testid="request-corrections-menu"
>
  {isRequestingCorrections ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      En cours...
    </>
  ) : (
    <>
      <FileEdit className="w-4 h-4 mr-2" />
      Demander des corrections
    </>
  )}
</DropdownMenuItem>
```

**Actions post-création (si status = 'under_review') :**
- **Copier lien de correction** : `<Link className="w-4 h-4" />`
- **Envoyer via WhatsApp** : `<MessageSquare className="w-4 h-4" />` (visible si numéro disponible)
- **Régénérer le code** : `<RotateCcw className="w-4 h-4" />`

#### 🎬 Animation
- **Hover** : Highlight avec fond amber-50
- **Click** : Ouverture du modal
- **Loading** : Spinner rotatif à la place de l'icône

---

### 2. **Modal CorrectionsModalV2**

#### 📍 Emplacement
Modal Dialog qui s'ouvre au clic sur "Demander corrections".

#### 🎨 Design

```
┌─────────────────────────────────────────────────────────────┐
│ ╔═════════════════════════════════════════════════════════╗ │
│ ║ CorrectionsModalV2                                      ║ │
│ ╠═════════════════════════════════════════════════════════╣ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ 📝 Demander des corrections                         │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Vous êtes sur le point de demander des corrections │ ║ │
│ ║ │ pour la demande de Jean Dupont.                    │ ║ │
│ ║ │ Le demandeur recevra un code de sécurité pour      │ ║ │
│ ║ │ accéder aux corrections.                            │ ║ │
│ ║ └─────────────────────────────────────────────────────┘ ║ │
│ ║                                                         ║ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ Corrections à apporter *                            │ ║ │
│ ║ │ ┌─────────────────────────────────────────────────┐ │ ║ │
│ ║ │ │ - Veuillez mettre à jour votre photo           │ │ ║ │
│ ║ │ │ - Ajouter le numéro de téléphone               │ │ ║ │
│ ║ │ │ - Corriger l'adresse                           │ │ ║ │
│ ║ │ │                                                 │ │ ║ │
│ ║ │ │                                                 │ │ ║ │
│ ║ │ └─────────────────────────────────────────────────┘ │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ 3 corrections détectées                              │ ║ │
│ ║ └─────────────────────────────────────────────────────┘ ║ │
│ ║                                                         ║ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ ☑ Envoyer via WhatsApp                              │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ Un lien WhatsApp sera généré pour envoyer les      │ ║ │
│ ║ │ corrections directement au demandeur               │ ║ │
│ ║ │ (+241 65 67 17 34). Le code de sécurité sera       │ ║ │
│ ║ │ inclus dans le message.                            │ ║ │
│ ║ └─────────────────────────────────────────────────────┘ ║ │
│ ║                                                         ║ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ 📱 Sélectionner le numéro WhatsApp                  │ ║ │
│ ║ │                                                     │ ║ │
│ ║ │ [Dropdown: +241 65 67 17 34 ▼]                     │ ║ │
│ ║ │   - +241 65 67 17 34 (par défaut)                  │ ║ │
│ ║ │   - +241 07 12 34 56                                │ ║ │
│ ║ │   - +241 06 78 90 12                                │ ║ │
│ ║ └─────────────────────────────────────────────────────┘ ║ │
│ ║                                                         ║ │
│ ║ ┌─────────────────────────────────────────────────────┐ ║ │
│ ║ │ [Annuler]              [📝 Demander les corrections]│ ║ │
│ ║ └─────────────────────────────────────────────────────┘ ║ │
│ ╚═════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

#### 🎯 Spécifications détaillées

##### A. Header du Modal

**Titre :**
- **Texte** : "Demander des corrections"
- **Icône** : `<FileEdit className="w-5 h-5 text-amber-600" />`
- **Style** : `text-xl font-bold text-kara-primary-dark`
- **Layout** : Flex avec gap-2

**Description :**
- **Texte** : "Saisissez les corrections à apporter (une par ligne). Le demandeur recevra un code de sécurité pour accéder aux corrections."
- **Style** : `text-sm text-gray-600`

##### B. Zone de saisie des corrections

**Label :**
- **Texte** : "Corrections à apporter" + astérisque rouge
- **Style** : `text-sm font-semibold text-kara-primary-dark`

**Textarea :**
- **Placeholder** : 
  ```
  Listez les corrections à apporter (une par ligne)
  
  Exemple :
  - Veuillez mettre à jour votre photo
  - Ajouter le numéro de téléphone
  - Corriger l'adresse
  ```
- **Rows** : 8
- **Style** : `resize-none font-mono text-sm`
- **Validation** : 
  - Désactiver le bouton si `corrections.length === 0`
  - Afficher un message d'aide en dessous

**Message d'aide :**
- **Si vide** : "Ajoutez au moins une correction (une par ligne)" (texte gris)
- **Si rempli** : "{count} correction(s) détectée(s)" (texte gris)
- **Style** : `text-xs text-gray-500`

##### C. Zone de saisie uniquement

**⚠️ IMPORTANT :** Le modal est **uniquement un formulaire de saisie**. Pas de WhatsApp, pas de sélection de numéro ici.

**Flow simplifié :**
1. Admin saisit les corrections
2. Admin clique "Demander les corrections"
3. Modal se ferme
4. Statut passe à "under_review"
5. **Ensuite** : Actions post-création disponibles dans le dropdown (Copier lien, WhatsApp, Régénérer code)

##### E. Footer du Modal

**Bouton Annuler :**
- **Variant** : `outline`
- **Style** : `border-gray-300`
- **Action** : Fermer le modal et réinitialiser l'état

**Bouton "Demander les corrections" :**
- **Variant** : `default`
- **Couleur** : `bg-amber-600 hover:bg-amber-700 text-white`
- **Icône** : `<FileEdit className="w-4 h-4 mr-2" />`
- **État disabled** : Si `isLoading || !isValid`
- **Loading state** : 
  ```tsx
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Envoi en cours...
    </>
  ) : (
    <>
      <FileEdit className="w-4 h-4 mr-2" />
      Demander les corrections
    </>
  )}
  ```

#### 🎬 Animations

1. **Ouverture du modal** :
   - Fade in + scale (0.95 → 1.0) avec `duration-200`
   - Backdrop blur progressif

2. **Saisie dans le textarea** :
   - Compteur de corrections avec animation de transition
   - Validation en temps réel (bouton enable/disable)

3. **Soumission** :
   - Bouton passe en état loading avec spinner
   - Modal reste ouvert pendant le traitement
   - Toast de succès après fermeture
   - Modal se ferme automatiquement

---

### 3. **Affichage "En correction" dans la liste**

#### 📍 Emplacement
Dans `MembershipRequestCard` ou `MembershipRequestRow`, afficher un bloc dédié si `status === 'under_review'`.

#### 🎨 Design

**Card/Row avec statut "under_review" :**
```
┌─────────────────────────────────────────────────────────────┐
│ MembershipRequestCard (EN CORRECTION)                      │
│ ┌─────────────────────────────────────────────────────┐ │ │
│ │ [Photo] Jean Dupont                                 │ │ │
│ │ jean.dupont@email.com • +241 65 67 17 34           │ │ │
│ │                                                     │ │ │
│ │ [Badge: En correction] [Badge: Non payé]          │ │ │
│ │                                                     │ │ │
│ │ ┌───────────────────────────────────────────────┐ │ │ │
│ │ │ ⚠️ Corrections demandées                      │ │ │ │
│ │ │                                               │ │ │ │
│ │ │ • Photo floue                                 │ │ │ │
│ │ │ • Adresse incomplète                          │ │ │ │
│ │ │ • Signature manquante                         │ │ │ │
│ │ │                                               │ │ │ │
│ │ │ Code: AB12-CD34                               │ │ │ │
│ │ │ Expire le: 18/01/2026 22:10 (reste 2j 13h)   │ │ │ │
│ │ │ Demandé par: Admin Nom (MAT-001)              │ │ │ │
│ │ │                                               │ │ │ │
│ │ │ [🔗 Copier lien] [💬 Envoyer WhatsApp]        │ │ │ │
│ │ └───────────────────────────────────────────────┘ │ │ │
│ │                                                     │ │ │
│ │ [Rejeter] [⋮]                                       │ │ │
│ └─────────────────────────────────────────────────────┘ │ │
└─────────────────────────────────────────────────────────────┘
```

#### 🎯 Spécifications détaillées

##### A. Badge statut

**Badge "En correction" :**
- **Couleur** : `amber-600` (fond) / `amber-50` (texte)
- **Icône** : `<FileEdit className="w-3 h-3" />` (optionnel)
- **Texte** : "En correction"
- **Style** : Utiliser le composant `Badge` avec variant personnalisé

**Code :**
```tsx
{status === 'under_review' && (
  <Badge 
    variant="outline" 
    className="bg-amber-50 text-amber-700 border-amber-300"
    data-testid="status-under-review-badge"
  >
    <FileEdit className="w-3 h-3 mr-1" />
    En correction
  </Badge>
)}
```

##### B. Bloc "Corrections demandées"

**Emplacement :** Sous les badges, avant les actions

**Structure :**
- **Titre** : "Corrections demandées" avec icône `<AlertCircle />`
- **Liste des corrections** : 
  - Afficher max 3 lignes
  - Si plus de 3 : Afficher "..." + bouton "Voir plus" (expandable)
- **Métadonnées** :
  - **Code** : Format `XXXX-XXXX` (ex: `AB12-CD34`)
  - **Expiration** : "Expire le: DD/MM/YYYY HH:mm (reste Xj Xh)"
  - **Demandé par** : "Demandé par: {adminName} ({adminMatricule})"

**Code :**
```tsx
{status === 'under_review' && reviewNote && (
  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <AlertCircle className="w-4 h-4 text-amber-600" />
      <h4 className="text-sm font-semibold text-amber-900">
        Corrections demandées
      </h4>
    </div>
    
    <ul className="text-sm text-amber-800 space-y-1 mb-3">
      {corrections.slice(0, 3).map((correction, index) => (
        <li key={index}>• {correction}</li>
      ))}
      {corrections.length > 3 && (
        <li className="text-amber-600 cursor-pointer hover:underline">
          ... et {corrections.length - 3} autre(s) (Voir plus)
        </li>
      )}
    </ul>
    
    <div className="text-xs text-amber-700 space-y-1 border-t border-amber-200 pt-2">
      <div>Code: <span className="font-mono font-semibold">{formatSecurityCode(securityCode)}</span></div>
      <div>
        Expire le: {formatDate(securityCodeExpiry)} 
        <span className="text-amber-600"> (reste {getTimeRemaining(securityCodeExpiry)})</span>
      </div>
      <div>Demandé par: {processedByName} ({processedByMatricule})</div>
    </div>
    
    <div className="flex gap-2 mt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="border-amber-300 text-amber-700 hover:bg-amber-100"
      >
        <Link className="w-3 h-3 mr-1" />
        Copier lien
      </Button>
      {phoneNumbers && phoneNumbers.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendWhatsApp}
          className="border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          Envoyer WhatsApp
        </Button>
      )}
    </div>
  </div>
)}
```

**Fonctions utilitaires :**
```tsx
// Formater le code (AB12-CD34)
function formatSecurityCode(code: string): string {
  if (!code || code.length !== 6) return code
  return `${code.slice(0, 2)}-${code.slice(2, 4)}-${code.slice(4, 6)}`
}

// Calculer le temps restant
function getTimeRemaining(expiryDate: Date): string {
  const now = new Date()
  const diff = expiryDate.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return `${days}j ${hours}h`
}
```

##### C. Actions rapides (optionnel)

**Boutons inline dans le bloc :**
- **Copier lien** : Copie le lien `/register?requestId=XXX` dans le presse-papier
- **Envoyer WhatsApp** : Ouvre le modal de sélection du numéro (si plusieurs) ou envoie directement

**Alternative :** Ces actions peuvent aussi être uniquement dans le dropdown "⋮" pour garder la liste légère.

#### 🎬 Animation
- **Transition** : Fade in + slide down lors du changement de statut
- **Bloc corrections** : Apparition avec animation douce

---

### 4. **Toast de succès**

#### 📍 Emplacement
Affiché après la fermeture du modal, en haut à droite de l'écran.

#### 🎨 Design

**Toast :**
- **Titre** : "Corrections demandées"
- **Description** : "Un code de sécurité a été généré et envoyé au demandeur."
- **Type** : `success`
- **Durée** : 4000ms
- **Style** : Utiliser `toast.success()` de `sonner`

**Code :**
```tsx
toast.success("Corrections demandées", {
  description: "Un code de sécurité a été généré et envoyé au demandeur.",
  duration: 4000,
})
```

#### 🎬 Animation
- **Entrée** : Slide in depuis la droite + fade in
- **Sortie** : Slide out vers la droite + fade out

---

## 🎨 Thème et Design System

### Couleurs utilisées

- **Amber (corrections)** :
  - `amber-50` : Fond des badges/cards
  - `amber-200` : Bordures
  - `amber-300` : Bordures hover
  - `amber-600` : Texte principal, boutons
  - `amber-700` : Hover des boutons

- **Bleu (WhatsApp)** :
  - `blue-50` : Fond de la card WhatsApp
  - `blue-200` : Bordure
  - `blue-700` : Texte de description
  - `blue-900` : Label

### Composants réutilisés

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter` (shadcn/ui)
- `Button` (shadcn/ui)
- `Textarea` (shadcn/ui)
- `Label` (shadcn/ui)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` (shadcn/ui)
- `Checkbox` (shadcn/ui)
- `Badge` (shadcn/ui)
- `toast` (sonner)

### Icônes (lucide-react)

- `FileEdit` : Corrections
- `MessageSquare` : WhatsApp
- `Loader2` : Loading/Spinner
- `AlertCircle` : Alertes

---

## 🔄 Flow complet (CORRIGÉ)

### 1. Admin ouvre le dropdown et clique "Demander des corrections"

```
État initial (status = 'pending')
  ↓
Admin clique sur "⋮ Plus d'actions"
  ↓
Dropdown s'ouvre
  ↓
Admin clique sur "📝 Demander des corrections"
  ↓
Modal s'ouvre (animation fade + scale)
  ↓
Textarea vide, bouton désactivé
```

### 2. Admin saisit les corrections

```
Textarea vide
  ↓
Admin tape "Photo floue"
  ↓
Compteur: "1 correction détectée"
Bouton reste désactivé (validation en cours)
  ↓
Admin tape "Adresse incomplète"
  ↓
Compteur: "2 corrections détectées"
Bouton devient actif ✅
```

### 3. Admin soumet

```
[Demander les corrections] (bouton actif)
  ↓
Admin clique
  ↓
Bouton passe en loading (spinner)
Modal reste ouvert
  ↓
Service traite la requête:
  - Génère code de sécurité
  - Calcule expiration (48h)
  - Met à jour statut → 'under_review'
  ↓
Modal se ferme (animation fade out)
  ↓
Toast de succès s'affiche
  ↓
Badge change: "En attente" → "En correction"
Bloc "Corrections demandées" apparaît
Liste se rafraîchit automatiquement
```

### 4. Actions post-création (nouveau statut "En correction")

```
Card affiche maintenant:
- Badge "En correction"
- Bloc "Corrections demandées" avec:
  - Liste des corrections
  - Code formaté (AB12-CD34)
  - Expiration (reste 2j 13h)
  - Demandé par (Admin + Matricule)
  - Boutons: [Copier lien] [Envoyer WhatsApp]
  ↓
Dropdown "⋮" contient maintenant:
  - Copier lien de correction
  - Envoyer via WhatsApp
  - Régénérer le code
  - Voir détails
  - Fiche d'adhésion
  - Pièce d'identité
  - Rejeter
```

### 5. Admin copie le lien

```
Admin clique "Copier lien" (dans bloc ou dropdown)
  ↓
Lien copié: /register?requestId=ABC123
  ↓
Toast: "Lien copié dans le presse-papier"
```

### 6. Admin envoie via WhatsApp

```
Admin clique "Envoyer via WhatsApp" (dans bloc ou dropdown)
  ↓
Si plusieurs numéros:
  → Modal "Choisir numéro" s'ouvre
  → Admin sélectionne le numéro
  → Modal se ferme
  ↓
Si un seul numéro:
  → Envoi direct
  ↓
URL WhatsApp générée avec:
  - Lien: /register?requestId=ABC123
  - Code: AB12-CD34
  - Expiration: 18/01/2026 22:10 (reste 2j 13h)
  ↓
Nouvel onglet WhatsApp s'ouvre
```

### 7. Admin régénère le code

```
Admin clique "Régénérer le code" (dans dropdown)
  ↓
Modal de confirmation:
  "Un nouveau code invalidera l'ancien. Continuer ?"
  ↓
Admin confirme
  ↓
Nouveau code généré
  ↓
Toast: "Code régénéré: XY34-ZW56"
  ↓
Bloc "Corrections demandées" se met à jour:
  - Nouveau code affiché
  - Nouvelle expiration (48h à partir de maintenant)
```

---

## 📱 Responsive Design

### Desktop (> 768px)

- Modal : Largeur max `600px`
- Boutons : Affichage horizontal
- Textarea : 8 lignes visibles

### Mobile (< 768px)

- Modal : Plein écran avec padding
- Boutons : Stack vertical si nécessaire
- Textarea : 6 lignes visibles
- Dropdown : Plein largeur

---

## ✅ Checklist d'implémentation

### Phase 1 : Actions dans le dropdown
- [ ] Ajouter "Demander des corrections" dans le dropdown "⋮" (visible si `status === 'pending'`)
- [ ] Ajouter actions post-création dans le dropdown (visible si `status === 'under_review'`) :
  - [ ] Copier lien de correction
  - [ ] Envoyer via WhatsApp
  - [ ] Régénérer le code

### Phase 2 : Modal simplifié
- [ ] Créer/améliorer `CorrectionsModalV2` avec :
  - [ ] Textarea pour corrections (une par ligne)
  - [ ] Validation en temps réel
  - [ ] Compteur de corrections
  - [ ] États de loading
  - [ ] **RETIRER** : WhatsApp et sélection de numéro du modal

### Phase 3 : Affichage "En correction"
- [ ] Ajouter badge "En correction" dans les cards/rows (si `status === 'under_review'`)
- [ ] Créer bloc "Corrections demandées" avec :
  - [ ] Liste des corrections (max 3 lignes + "Voir plus")
  - [ ] Code formaté (AB12-CD34)
  - [ ] Expiration avec temps restant
  - [ ] Demandé par (nom + matricule admin)
  - [ ] Boutons actions (Copier lien, Envoyer WhatsApp) - optionnel (peut être dans dropdown uniquement)

### Phase 4 : Actions post-création
- [ ] Implémenter "Copier lien" :
  - [ ] Générer lien `/register?requestId=XXX`
  - [ ] Copier dans presse-papier
  - [ ] Toast de confirmation
- [ ] Implémenter "Envoyer via WhatsApp" :
  - [ ] Modal de sélection du numéro (si plusieurs)
  - [ ] Génération URL WhatsApp avec lien + code + expiration
  - [ ] Ouverture nouvel onglet
- [ ] Implémenter "Régénérer le code" :
  - [ ] Modal de confirmation
  - [ ] Génération nouveau code
  - [ ] Mise à jour expiration (48h)
  - [ ] Toast avec nouveau code

### Phase 5 : Utilitaires
- [ ] Fonction `formatSecurityCode()` : Format AB12-CD34
- [ ] Fonction `getTimeRemaining()` : Calcul temps restant (Xj Xh)
- [ ] Fonction `formatDate()` : Format date expiration

### Phase 6 : Finitions
- [ ] Implémenter toast de succès après création
- [ ] Ajouter animations (modal, transitions, bloc corrections)
- [ ] Tester responsive (desktop + mobile)
- [ ] Ajouter `data-testid` pour les tests E2E
- [ ] Vérifier que les actions (Détails, Fiche, Pièce, Rejeter) restent accessibles en correction