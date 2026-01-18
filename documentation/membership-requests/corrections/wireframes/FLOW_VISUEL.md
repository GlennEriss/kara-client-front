# Flow Visuel Complet - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document présente le flow visuel complet de la fonctionnalité de correction, de l'admin au demandeur, avec tous les états et transitions.

---

## 🎬 Flow Admin → Demandeur

### Étape 1 : Admin demande des corrections

**Page :** `/membership-requests`

```
┌─────────────────────────────────────────────────────────────┐
│ [Dashboard Header]                                          │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ MembershipRequestCard                                     │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ [Photo] Jean Dupont                                 │ │ │
│ │ │ jean.dupont@email.com • +241 65 67 17 34           │ │ │
│ │ │                                                       │ │ │
│ │ │ [Badge: En attente] [Badge: Non payé]              │ │ │
│ │ │                                                       │ │ │
│ │ │ [Approuver] [Rejeter] [Payer]                       │ │ │
│ │ │ [📝 Demander corrections] [⋮]                      │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Action :** Admin clique sur "📝 Demander corrections"

**Transition :** Modal s'ouvre avec animation fade + scale

---

### Étape 2 : Modal de corrections

```
┌─────────────────────────────────────────────────────────────┐
│ ╔═════════════════════════════════════════════════════════╗ │
│ ║                                                           ║ │
│ ║  📝 Demander des corrections                             ║ │
│ ║                                                           ║ │
│ ║  Vous êtes sur le point de demander des corrections     ║ │
│ ║  pour la demande de Jean Dupont.                         ║ │
│ ║                                                           ║ │
│ ║  ┌───────────────────────────────────────────────────┐  ║ │
│ ║  │ Corrections à apporter *                           │  ║ │
│ ║  │ ┌───────────────────────────────────────────────┐ │  ║ │
│ ║  │ │ - Veuillez mettre à jour votre photo          │ │  ║ │
│ ║  │ │ - Ajouter le numéro de téléphone              │ │  ║ │
│ ║  │ │ - Corriger l'adresse                          │ │  ║ │
│ ║  │ │                                               │ │  ║ │
│ ║  │ └───────────────────────────────────────────────┘ │  ║ │
│ ║  │ 3 corrections détectées                            │  ║ │
│ ║  └───────────────────────────────────────────────────┘  ║ │
│ ║                                                           ║ │
│ ║  ┌───────────────────────────────────────────────────┐  ║ │
│ ║  │ 📱 Sélectionner le numéro WhatsApp                  │  ║ │
│ ║  │                                                     │  ║ │
│ ║  │ [Dropdown: +241 65 67 17 34 ▼]                     │  ║ │
│ ║  │   - +241 65 67 17 34 (par défaut)                  │  ║ │
│ ║  │   - +241 07 12 34 56                                │  ║ │
│ ║  │   - +241 06 78 90 12                                │  ║ │
│ ║  └───────────────────────────────────────────────────┘  ║ │
│ ║                                                           ║ │
│ ║  ┌───────────────────────────────────────────────────┐  ║ │
│ ║  │ ☑ Envoyer via WhatsApp                             │  ║ │
│ ║  │                                                     │  ║ │
│ ║  │ Un lien WhatsApp sera généré pour envoyer les     │  ║ │
│ ║  │ corrections directement au demandeur.             │  ║ │
│ ║  └───────────────────────────────────────────────────┘  ║ │
│ ║                                                           ║ │
│ ║  [Annuler]        [📝 Demander les corrections]        ║ │
│ ║                                                           ║ │
│ ╚═════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

**Action :** Admin clique sur "Demander les corrections"

**Transition :** 
1. Bouton passe en loading (spinner)
2. Service traite la requête
3. Si WhatsApp sélectionné → Nouvel onglet s'ouvre
4. Modal se ferme (fade out)
5. Toast de succès s'affiche

---

### Étape 3 : Badge mis à jour

```
┌─────────────────────────────────────────────────────────────┐
│ MembershipRequestCard (APRÈS)                               │
│ ┌─────────────────────────────────────────────────────┐ │ │
│ │ [Photo] Jean Dupont                                 │ │ │
│ │                                                       │ │ │
│ │ [Badge: En cours d'examen] [Badge: Non payé]       │ │ │
│ │                                                       │ │ │
│ │ [Rejeter] [⋮]                                       │ │ │
│ └─────────────────────────────────────────────────────┘ │ │
└─────────────────────────────────────────────────────────────┘
```

**Animation :** Badge change avec fade in + scale

---

## 🎬 Flow Demandeur

### Étape 1 : Accès via URL

**Page :** `/register?requestId=ABC123`

```
┌─────────────────────────────────────────────────────────────┐
│ RegisterPage                                                 │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Corrections demandées                                │ │
│ │                                                         │ │
│ │ Corrections demandées :                                 │ │
│ │ • Veuillez mettre à jour votre photo                   │ │
│ │ • Ajouter le numéro de téléphone                       │ │
│ │ • Corriger l'adresse                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔒 Code de sécurité requis                             │ │
│ │                                                         │ │
│ │ Pour accéder à votre formulaire et apporter les       │ │
│ │ corrections, veuillez saisir le code de sécurité        │ │
│ │ qui vous a été communiqué.                             │ │
│ │                                                         │ │
│ │ Code de sécurité (6 chiffres)                          │ │
│ │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │ │
│ │ │  1  │ │  2  │ │  3  │ │  4  │ │  5  │ │  6  │    │ │
│ │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘    │ │
│ │                                                         │ │
│ │ [🛡️ Vérifier le code]                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Animation :** Banner slide down + fade in, puis formulaire fade in

---

### Étape 2 : Saisie du code

**Interaction :**
- Utilisateur tape "1" → Premier input se remplit, focus passe au 2ème
- Utilisateur tape "2" → Deuxième input se remplit, focus passe au 3ème
- ... (auto-advance)
- Utilisateur tape "6" → Dernier input se remplit, bouton devient actif

**État du bouton :**
- **Disabled** : Si code < 6 chiffres
- **Actif** : Si code = 6 chiffres

---

### Étape 3 : Vérification

**Action :** Utilisateur clique "Vérifier le code"

**Transition :**
1. Bouton passe en loading (spinner + "Vérification...")
2. Inputs désactivés
3. Appel API
4. Si succès → Toast + chargement des données
5. Si erreur → Message d'erreur avec shake

**Toast de succès :**
```
┌─────────────────────────────────────────┐
│ ✅ Code vérifié !                        │
│                                          │
│ Données chargées. Vous pouvez           │
│ maintenant modifier vos informations.    │
└─────────────────────────────────────────┘
```

**Message d'erreur :**
```
┌─────────────────────────────────────────────────────────┐
│ ❌ Code incorrect                                       │
│                                                         │
│ Le code saisi ne correspond pas. Veuillez réessayer.   │
└─────────────────────────────────────────────────────────┘
```

**Animation :** Shake horizontal sur le formulaire

---

### Étape 4 : Formulaire pré-rempli

**Transition :**
1. Formulaire de code se masque (fade out + slide up)
2. Formulaire d'inscription s'affiche (fade in + slide down)
3. Données se remplissent progressivement

```
┌─────────────────────────────────────────────────────────────┐
│ RegisterPage                                                 │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Corrections demandées (COMPACT)                       │ │
│ │ • Photo • Téléphone • Adresse                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ StepIndicatorV2                                           │ │
│ │ [●] Identité  [○] Adresse  [○] Profession  [○] Docs      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ IdentityStepV2 (PRÉ-REMPLI)                             │ │
│ │                                                         │ │
│ │ Civilité: [Monsieur ▼]                                  │ │
│ │ Nom: [Dupont]                                           │ │
│ │ Prénom: [Jean]                                          │ │
│ │                                                         │ │
│ │ Photo de profil                                         │ │
│ │ [Badge: À corriger]                                     │ │
│ │ [📷 Choisir une photo]                                  │ │
│ │                                                         │ │
│ │ Numéro de téléphone                                     │ │
│ │ [Badge: À corriger]                                     │ │
│ │ [+241] [65] [67] [17] [34]                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ [← Précédent]              [Suivant →]                       │
└─────────────────────────────────────────────────────────────┘
```

**Mise en évidence :**
- Badge "À corriger" à côté des champs concernés
- Bordure orange sur les champs à corriger
- Message d'aide sous les champs

---

### Étape 5 : Soumission

**Dernière étape du formulaire :**

```
┌─────────────────────────────────────────────────────────────┐
│ DocumentsStepV2                                             │
│                                                             │
│ [Tous les documents sont pré-remplis]                      │
│                                                             │
│ [← Précédent]  [📝 Soumettre les corrections]              │
└─────────────────────────────────────────────────────────────┘
```

**Action :** Utilisateur clique "Soumettre les corrections"

**Transition :**
1. Bouton passe en loading
2. Formulaire désactivé
3. Appel API
4. Toast de succès
5. Redirection ou message de confirmation

**Toast de succès final :**
```
┌─────────────────────────────────────────┐
│ ✅ Corrections soumises !                │
│                                          │
│ Votre demande a été mise à jour et      │
│ repasse en attente d'examen.             │
└─────────────────────────────────────────┘
```

---

## 🎨 États et Variantes

### États du modal (Admin)

**1. État initial :**
- Textarea vide
- Bouton désactivé
- Compteur : "Ajoutez au moins une correction"

**2. Saisie en cours :**
- Textarea avec texte
- Compteur : "1 correction détectée" (orange)
- Bouton reste désactivé

**3. Prêt à soumettre :**
- Textarea avec 3+ corrections
- Compteur : "3 corrections détectées" (vert)
- Bouton actif ✅

**4. Loading :**
- Bouton avec spinner
- Tous les champs désactivés
- Modal reste ouvert

**5. Succès :**
- Modal se ferme
- Toast s'affiche
- Badge mis à jour

---

### États du formulaire de code (Demandeur)

**1. État initial :**
- 6 inputs vides
- Bouton désactivé
- Premier input focus

**2. Saisie en cours :**
- Inputs se remplissent progressivement
- Auto-advance entre les inputs
- Bouton reste désactivé si < 6 chiffres

**3. Code complet :**
- Tous les 6 inputs remplis
- Bouton actif ✅
- Dernier input focus

**4. Vérification :**
- Bouton avec spinner
- Inputs désactivés
- "Vérification..." affiché

**5. Erreur :**
- Message d'erreur avec shake
- Inputs restent remplis
- Bouton redevient actif
- Focus sur le premier input

**6. Succès :**
- Formulaire de code se masque
- Formulaire pré-rempli s'affiche
- Toast de succès

---

## 📱 Responsive - Comparaison Desktop vs Mobile

### Desktop (> 768px)

**Modal :**
```
┌─────────────────────────────────────┐
│ Modal (600px max, centré)          │
│                                     │
│ Layout horizontal                   │
│ Boutons côte à côte                 │
└─────────────────────────────────────┘
```

**Formulaire de code :**
```
┌─────────────────────────────────────┐
│ 6 inputs côte à côte (w-12 h-12)   │
│ Largeur: 500px max                  │
└─────────────────────────────────────┘
```

### Mobile (< 768px)

**Modal :**
```
┌─────────────────────────────────────┐
│ Modal (plein écran)                 │
│                                     │
│ Layout vertical                     │
│ Boutons stack                       │
└─────────────────────────────────────┘
```

**Formulaire de code :**
```
┌─────────────────────────────────────┐
│ 6 inputs côte à côte (w-10 h-10)   │
│ Largeur: 100%                       │
└─────────────────────────────────────┘
```

---

## 🎯 Points d'attention UX

### 1. Feedback visuel immédiat

- **Validation en temps réel** : Compteur de corrections mis à jour instantanément
- **États de boutons** : Désactivé → Actif avec transition douce
- **Loading states** : Spinner visible pendant les opérations

### 2. Messages d'erreur clairs

- **Format invalide** : "Le code doit contenir exactement 6 chiffres"
- **Code incorrect** : "Le code saisi ne correspond pas"
- **Code expiré** : "Le code a expiré. Contactez l'administrateur"
- **Code utilisé** : "Code déjà utilisé. Contactez l'administrateur"

### 3. Guidance utilisateur

- **Banner de corrections** : Toujours visible pour guider le demandeur
- **Badges "À corriger"** : Mise en évidence des champs concernés
- **Messages d'aide** : Instructions sous les champs à corriger

### 4. Accessibilité

- **ARIA labels** : Tous les inputs et boutons labellisés
- **Keyboard navigation** : Navigation complète au clavier
- **Focus visible** : Focus ring clair sur tous les éléments interactifs
- **Contraste** : Respect des ratios de contraste WCAG

---

## ✅ Checklist finale

### Admin
- [x] Wireframe modal créé
- [x] Spécifications bouton créées
- [x] Animations définies
- [x] Responsive documenté

### Demandeur
- [x] Wireframe formulaire de code créé
- [x] Wireframe formulaire pré-rempli créé
- [x] Messages d'erreur définis
- [x] Animations définies
- [x] Responsive documenté

### Commun
- [x] Thème et couleurs définis
- [x] Composants réutilisables identifiés
- [x] Interactions détaillées
- [x] Accessibilité prise en compte
