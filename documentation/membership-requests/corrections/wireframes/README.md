# Wireframes - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce dossier contient les wireframes détaillés pour la fonctionnalité de demande de correction, basés sur les diagrammes d'activité et de séquence.

## 📁 Fichiers

### 1. [ADMIN_WIREFRAME.md](./ADMIN_WIREFRAME.md)
Wireframes et spécifications UI/UX pour la page admin `/membership-requests` :
- Bouton "Demander corrections"
- Modal `CorrectionsModalV2` avec sélection numéro WhatsApp
- Badge "En cours d'examen"
- Toast de succès
- Animations et interactions détaillées
- Responsive design

### 2. [DEMANDEUR_WIREFRAME.md](./DEMANDEUR_WIREFRAME.md)
Wireframes et spécifications UI/UX pour la page demandeur `/register` :
- Banner de corrections (`CorrectionBannerV2`)
- Formulaire de code de sécurité (OTP 6 chiffres)
- Formulaire pré-rempli avec données existantes
- Messages d'erreur (code incorrect, expiré, utilisé)
- Mise en évidence des champs à corriger
- Soumission des corrections
- Animations et interactions détaillées
- Responsive design

### 3. [COMPOSANTS_UI.md](./COMPOSANTS_UI.md)
Spécifications techniques des composants UI :
- `SecurityCodeInput` : Composant OTP 6 chiffres
- `SecurityCodeFormV2` : Formulaire complet de vérification
- Modifications à apporter aux composants existants
- Styles et thème
- Responsive

### 4. [INTERACTIONS_DETAILLEES.md](./INTERACTIONS_DETAILLEES.md)
Détails de toutes les interactions et animations :
- Animations CSS (fade, slide, shake, pulse)
- Transitions de page
- Micro-interactions
- Feedback visuel
- Interactions tactiles (mobile)
- Performance et optimisations
- Accessibilité (ARIA, keyboard navigation)

### 5. [FLOW_VISUEL.md](./FLOW_VISUEL.md)
Flow visuel complet avec diagrammes ASCII :
- Flow Admin → Demandeur
- Tous les états et variantes
- Comparaison Desktop vs Mobile
- Points d'attention UX

## 🎨 Design System

### Couleurs principales

- **Amber (corrections)** : `amber-50`, `amber-200`, `amber-600`, `amber-700`
- **Bleu (WhatsApp)** : `blue-50`, `blue-200`, `blue-700`, `blue-900`
- **Rouge (erreurs)** : `red-50`, `red-200`, `red-600`, `red-900`
- **Vert (succès)** : `green-50`, `green-600`, `green-900`

### Composants utilisés

- **shadcn/ui** : `Dialog`, `Button`, `Textarea`, `Select`, `Checkbox`, `Badge`, `Alert`, `Card`, `Input`
- **lucide-react** : `FileEdit`, `MessageSquare`, `Loader2`, `AlertCircle`, `Shield`, `FileText`
- **sonner** : `toast` pour les notifications

### Animations

- **Fade in/out** : `duration-200` à `duration-300`
- **Slide** : `animate-slide-down`, `animate-slide-up`
- **Scale** : `scale-95` → `scale-100`
- **Shake** : `animate-shake` pour les erreurs
- **Spin** : `animate-spin` pour les loaders

## 🔄 Flow complet

### Côté Admin (CORRIGÉ)

1. Admin ouvre dropdown "⋮" → "Demander des corrections"
2. Modal s'ouvre (formulaire simple)
3. Admin saisit les corrections (une par ligne)
4. Admin soumet
5. Modal se ferme, toast de succès
6. Badge change en "En correction"
7. Bloc "Corrections demandées" apparaît avec code + expiration
8. **Actions post-création disponibles** :
   - Copier lien (dans bloc ou dropdown)
   - Envoyer via WhatsApp (ouvre modal sélection numéro)
   - Régénérer le code (ouvre modal confirmation)

### Côté Demandeur

1. Demandeur accède à `/register?requestId=XXX`
2. Banner + formulaire de code s'affichent
3. Demandeur saisit le code (6 chiffres)
4. Demandeur clique "Vérifier le code"
5. Code vérifié, données chargées
6. Formulaire pré-rempli s'affiche
7. Demandeur modifie les champs nécessaires
8. Demandeur soumet les corrections
9. Toast de succès, statut repasse à "pending"

## 📱 Responsive

- **Desktop** : Layout horizontal, modals centrés
- **Mobile** : Layout vertical, modals plein écran

## ✅ Checklist globale

### Admin
- [x] Action "Demander corrections" dans dropdown "⋮"
- [ ] Modal simplifié (textarea uniquement)
- [ ] Badge "En correction" + bloc "Corrections demandées"
- [ ] Affichage code, expiration, demandé par
- [ ] Action "Copier lien"
- [ ] Modal "Envoyer via WhatsApp" (post-création)
- [ ] Modal "Régénérer le code" (post-création)
- [ ] Toast de succès

### Demandeur
- [ ] Banner de corrections
- [ ] Formulaire de code OTP
- [ ] Messages d'erreur
- [ ] Formulaire pré-rempli
- [ ] Mise en évidence des champs à corriger
- [ ] Toast de succès

### Commun
- [ ] Animations fluides
- [ ] Respect du thème KARA
- [ ] Responsive design
- [ ] Accessibilité (ARIA labels)
- [ ] Tests E2E (`data-testid`)

## 📚 Références

- [Diagrammes d'activité](../activite/) : Workflows détaillés
- [Diagrammes de séquence](../sequence/) : Interactions techniques
- [Règles Firebase](../firebase/) : Sécurité et index
- [Design System](../../DESIGN_SYSTEM_UI.md) : Composants réutilisables
