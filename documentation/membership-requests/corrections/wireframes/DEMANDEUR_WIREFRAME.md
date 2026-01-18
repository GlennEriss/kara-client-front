# Wireframe Demandeur - Accéder et Modifier les Corrections
## Page : `/register?requestId=XXX`

## 📋 Vue d'ensemble

Ce document détaille les modifications UI/UX à apporter à la page `/register` pour permettre au demandeur d'accéder et de modifier ses corrections, basé sur les diagrammes d'activité et de séquence.

---

## 🎯 État Initial - Page `/register`

### Structure existante

```
┌─────────────────────────────────────────────────────────────┐
│ RegisterPage                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Header (logo KARA)                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ StepIndicatorV2 (1/4 étapes)                            │ │
│ │ [●] Identité  [○] Adresse  [○] Profession  [○] Docs    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ RegistrationFormV2                                      │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ IdentityStepV2 (formulaire)                        │ │ │
│ │ │ - Civilité, Nom, Prénom, etc.                      │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ [← Précédent]              [Suivant →]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Modifications à apporter

### Phase 1 : Détection et Affichage du Banner

#### 📍 Emplacement
Au chargement de la page, si `requestId` présent dans l'URL ET demande en `under_review` avec `securityCode`.

#### 🎨 Design - CorrectionBannerV2

```
┌─────────────────────────────────────────────────────────────┐
│ RegisterPage                                                │
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
│ │ Pour accéder à votre formulaire et apporter les        │ │
│ │ corrections, veuillez saisir le code de sécurité      │ │
│ │ qui vous a été communiqué.                             │ │
│ │                                                         │ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ Code de sécurité (6 chiffres)                    │ │ │
│ │ │ ┌───────────────────────────────────────────────┐ │ │ │
│ │ │ │ [  ] [  ] [  ] [  ] [  ] [  ]                │ │ │ │
│ │ │ └───────────────────────────────────────────────┘ │ │ │
│ │ │                                                   │ │ │
│ │ │ [🛡️ Vérifier le code]                            │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 🎯 Spécifications détaillées

##### A. CorrectionBannerV2

**Composant :**
- **Fichier** : `src/domains/memberships/components/shared/CorrectionBannerV2.tsx`
- **Props** : `{ reviewNote?: string, className?: string }`

**Design :**
- **Type** : `Alert` (shadcn/ui)
- **Couleur** : `bg-amber-50 border-amber-200 text-amber-900`
- **Icône** : `<AlertCircle className="h-4 w-4 text-amber-600" />`
- **Titre** : "Corrections demandées :" (font-semibold)
- **Contenu** : Liste à puces des corrections (une par ligne)

**Code :**
```tsx
<Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-lg">
  <AlertCircle className="h-4 w-4 text-amber-600" />
  <AlertDescription>
    <div className="flex items-start gap-2">
      <FileText className="h-4 w-4 text-amber-600 mt-0.5" />
      <div>
        <p className="font-semibold text-sm mb-2">Corrections demandées :</p>
        <ul className="space-y-1 list-disc list-inside">
          {corrections.map((correction, index) => (
            <li key={index} className="text-sm">{correction}</li>
          ))}
        </ul>
      </div>
    </div>
  </AlertDescription>
</Alert>
```

**Animation :**
- **Entrée** : Slide down + fade in (`duration-300`)
- **Hover** : Légère élévation (`hover:shadow-md`)

##### B. Formulaire de code de sécurité

**Composant :** Nouveau composant `SecurityCodeFormV2`

**Design :**
- **Card** : Fond blanc avec bordure (`border-gray-200`)
- **Titre** : "Code de sécurité requis" avec icône `<Shield />`
- **Description** : Texte explicatif
- **Input** : 6 champs séparés pour les 6 chiffres (style OTP)

**Structure :**
```tsx
<Card className="border-2 border-amber-200 bg-amber-50/50">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Shield className="w-5 h-5 text-amber-600" />
      Code de sécurité requis
    </CardTitle>
    <CardDescription>
      Pour accéder à votre formulaire et apporter les corrections,
      veuillez saisir le code de sécurité qui vous a été communiqué.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <SecurityCodeInput
      length={6}
      value={code}
      onChange={setCode}
      disabled={isVerifying}
    />
    <Button
      onClick={handleVerify}
      disabled={code.length !== 6 || isVerifying}
      className="w-full mt-4"
    >
      {isVerifying ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Vérification...
        </>
      ) : (
        <>
          <Shield className="w-4 h-4 mr-2" />
          Vérifier le code
        </>
      )}
    </Button>
  </CardContent>
</Card>
```

**Input OTP (6 chiffres) :**
- **Composant** : Créer `SecurityCodeInput` ou utiliser une librairie OTP
- **Style** : 6 inputs carrés côte à côte
- **Validation** : Uniquement des chiffres (0-9)
- **Auto-focus** : Premier input au chargement
- **Auto-advance** : Passer au suivant après saisie
- **Paste** : Support du copier-coller (6 chiffres)

**Code du composant OTP :**
```tsx
<div className="flex gap-2 justify-center">
  {Array.from({ length: 6 }).map((_, index) => (
    <Input
      key={index}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={code[index] || ''}
      onChange={(e) => {
        const value = e.target.value.replace(/\D/g, '')
        if (value) {
          const newCode = code.split('')
          newCode[index] = value
          setCode(newCode.join(''))
          // Auto-advance
          if (index < 5 && value) {
            refs[index + 1]?.current?.focus()
          }
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
          refs[index - 1]?.current?.focus()
        }
      }}
      className="w-12 h-12 text-center text-2xl font-bold"
      ref={refs[index]}
    />
  ))}
</div>
```

**Bouton "Vérifier le code" :**
- **Variant** : `default`
- **Couleur** : `bg-amber-600 hover:bg-amber-700`
- **Icône** : `<Shield className="w-4 h-4" />`
- **État disabled** : Si `code.length !== 6` ou `isVerifying === true`
- **Loading** : Spinner + texte "Vérification..."

#### 🎬 Animations

1. **Affichage du banner** :
   - Slide down depuis le haut (`animate-slide-down`)
   - Fade in progressif

2. **Affichage du formulaire de code** :
   - Fade in après le banner
   - Scale légère (0.95 → 1.0)

3. **Saisie du code** :
   - Chaque input : Focus ring animé
   - Auto-advance : Transition douce vers l'input suivant
   - Validation : Vibration légère si caractère invalide (mobile)

4. **Vérification** :
   - Bouton passe en loading (spinner)
   - Inputs désactivés pendant la vérification

---

### Phase 2 : Affichage des erreurs

#### 📍 Emplacement
Sous le formulaire de code ou dans un toast.

#### 🎨 Design - Messages d'erreur

**1. Code déjà utilisé :**
```
┌─────────────────────────────────────────────────────────┐
│ ❌ Code déjà utilisé                                     │
│                                                         │
│ Ce code de sécurité a déjà été utilisé. Veuillez       │
│ contacter l'administrateur pour obtenir un nouveau code.│
└─────────────────────────────────────────────────────────┘
```

**2. Code expiré :**
```
┌─────────────────────────────────────────────────────────┐
│ ⏰ Code expiré                                          │
│                                                         │
│ Ce code de sécurité a expiré. Veuillez contacter       │
│ l'administrateur pour obtenir un nouveau code.         │
└─────────────────────────────────────────────────────────┘
```

**3. Code incorrect :**
```
┌─────────────────────────────────────────────────────────┐
│ ❌ Code incorrect                                       │
│                                                         │
│ Le code saisi ne correspond pas. Veuillez réessayer.   │
└─────────────────────────────────────────────────────────┘
```

**4. Format invalide :**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Format invalide                                      │
│                                                         │
│ Le code doit contenir exactement 6 chiffres.           │
└─────────────────────────────────────────────────────────┘
```

#### 🎯 Spécifications

**Composant Alert d'erreur :**
- **Type** : `Alert` avec variant `destructive`
- **Couleur** : `bg-red-50 border-red-200 text-red-900`
- **Icône** : `<AlertCircle className="h-4 w-4 text-red-600" />`
- **Animation** : Shake horizontal (`animate-shake`)

**Code :**
```tsx
<Alert variant="destructive" className="animate-shake">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Code déjà utilisé</AlertTitle>
  <AlertDescription>
    Ce code de sécurité a déjà été utilisé. Veuillez contacter
    l'administrateur pour obtenir un nouveau code.
  </AlertDescription>
</Alert>
```

#### 🎬 Animations

- **Shake** : Animation de secousse horizontale (300ms)
- **Fade in** : Apparition progressive
- **Auto-dismiss** : Disparaît après 5 secondes (optionnel)

---

### Phase 3 : Formulaire pré-rempli

#### 📍 Emplacement
Après vérification réussie du code, le formulaire d'inscription s'affiche avec les données pré-remplies.

#### 🎨 Design

```
┌─────────────────────────────────────────────────────────────┐
│ RegisterPage                                                │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ Code vérifié !                                        │ │
│ │                                                         │ │
│ │ Vos données ont été chargées. Vous pouvez maintenant   │ │
│ │ modifier les informations selon les corrections         │ │
│ │ demandées.                                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ StepIndicatorV2 (1/4 étapes)                            │ │
│ │ [●] Identité  [○] Adresse  [○] Profession  [○] Docs    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ RegistrationFormV2 (PRÉ-REMPLI)                        │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ IdentityStepV2                                       │ │ │
│ │ │ [Monsieur ▼] [Dupont] [Jean]                        │ │ │
│ │ │ [01/01/1990] [Libreville] ...                        │ │ │
│ │ │                                                       │ │ │
│ │ │ ⚠️ Corrections demandées :                           │ │ │
│ │ │ • Veuillez mettre à jour votre photo                │ │ │
│ │ │ • Ajouter le numéro de téléphone                     │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ [← Précédent]              [Suivant →]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 🎯 Spécifications détaillées

##### A. Toast de succès

**Affichage :**
- **Titre** : "Code vérifié !"
- **Description** : "Données chargées. Vous pouvez maintenant modifier vos informations."
- **Type** : `success`
- **Durée** : 4000ms
- **Position** : Haut droite

**Code :**
```tsx
toast.success("Code vérifié !", {
  description: "Données chargées. Vous pouvez maintenant modifier vos informations.",
  duration: 4000,
})
```

##### B. Banner de corrections (persistant)

**Affichage :**
- Le `CorrectionBannerV2` reste affiché en haut du formulaire
- Style réduit (compact) pour ne pas prendre trop de place
- Toujours visible pour guider le demandeur

##### C. Formulaire pré-rempli

**Comportement :**
- Tous les champs sont pré-remplis avec les données existantes
- Le demandeur peut modifier n'importe quel champ
- Les champs à corriger sont mis en évidence (optionnel)

**Mise en évidence des champs à corriger :**
- **Option 1** : Badge "À corriger" à côté du label
- **Option 2** : Bordure orange sur les champs concernés
- **Option 3** : Message d'aide sous le champ

**Exemple pour un champ à corriger :**
```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Label htmlFor="phone">Numéro de téléphone</Label>
    <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
      À corriger
    </Badge>
  </div>
  <Input
    id="phone"
    value={watch('identity.contacts.0')}
    onChange={(e) => setValue('identity.contacts.0', e.target.value)}
    className="border-amber-300 focus:border-amber-500"
  />
  <p className="text-xs text-amber-600">
    ⚠️ Ce champ nécessite une correction selon les instructions de l'admin.
  </p>
</div>
```

#### 🎬 Animations

1. **Masquage du formulaire de code** :
   - Fade out + slide up (`duration-300`)

2. **Affichage du formulaire pré-rempli** :
   - Fade in + slide down (`duration-300`)
   - Les champs se remplissent progressivement (optionnel)

3. **Toast de succès** :
   - Slide in depuis la droite + fade in

---

### Phase 4 : Soumission des corrections

#### 📍 Emplacement
Bouton "Soumettre" à la dernière étape du formulaire.

#### 🎨 Design

**Bouton de soumission :**
- **Texte** : "Soumettre les corrections" (au lieu de "Soumettre")
- **Icône** : `<FileEdit className="w-4 h-4" />`
- **Couleur** : `bg-amber-600 hover:bg-amber-700`

**Code :**
```tsx
<Button
  type="submit"
  disabled={isSubmitting}
  className="bg-amber-600 hover:bg-amber-700 text-white"
>
  {isSubmitting ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Soumission en cours...
    </>
  ) : (
    <>
      <FileEdit className="w-4 h-4 mr-2" />
      Soumettre les corrections
    </>
  )}
</Button>
```

#### 🎯 Toast de succès final

**Affichage :**
- **Titre** : "Corrections soumises !"
- **Description** : "Votre demande a été mise à jour et repasse en attente d'examen."
- **Type** : `success`
- **Durée** : 5000ms

**Code :**
```tsx
toast.success("Corrections soumises !", {
  description: "Votre demande a été mise à jour et repasse en attente d'examen.",
  duration: 5000,
})
```

#### 🎬 Animations

1. **Soumission** :
   - Bouton passe en loading (spinner)
   - Formulaire désactivé pendant le traitement

2. **Succès** :
   - Toast de succès
   - Redirection vers page de confirmation (optionnel)
   - Ou affichage d'un message de confirmation

---

## 🎨 Thème et Design System

### Couleurs utilisées

- **Amber (corrections)** :
  - `amber-50` : Fond des banners/cards
  - `amber-200` : Bordures
  - `amber-300` : Bordures des champs à corriger
  - `amber-600` : Texte principal, boutons
  - `amber-700` : Hover des boutons

- **Rouge (erreurs)** :
  - `red-50` : Fond des alertes d'erreur
  - `red-200` : Bordures
  - `red-600` : Icônes
  - `red-900` : Texte

- **Vert (succès)** :
  - `green-50` : Fond des alertes de succès
  - `green-600` : Icônes
  - `green-900` : Texte

### Composants réutilisés

- `Alert`, `AlertDescription`, `AlertTitle` (shadcn/ui)
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` (shadcn/ui)
- `Input` (shadcn/ui) - pour l'OTP
- `Button` (shadcn/ui)
- `Badge` (shadcn/ui)
- `toast` (sonner)
- `CorrectionBannerV2` (composant existant)

### Icônes (lucide-react)

- `Shield` : Code de sécurité
- `AlertCircle` : Alertes/erreurs
- `FileText` : Corrections
- `CheckCircle` : Succès
- `Loader2` : Loading/Spinner
- `FileEdit` : Modifications

---

## 🔄 Flow complet

### 1. Accès via URL avec requestId

```
Demandeur accède à /register?requestId=ABC123
  ↓
Page se charge
  ↓
useRegistration() détecte requestId dans URL
  ↓
Appel API pour récupérer la demande
  ↓
Si demande trouvée ET status='under_review' ET securityCode existe:
  ↓
Vérifier securityCodeUsed
  ↓
Si false:
  ↓
Vérifier expiration
  ↓
Si valide:
  ↓
Afficher CorrectionBannerV2 + SecurityCodeFormV2
Masquer RegistrationFormV2
```

### 2. Vérification du code

```
Demandeur saisit le code (6 chiffres)
  ↓
Auto-advance entre les inputs
  ↓
Demandeur clique "Vérifier le code"
  ↓
Validation format (6 chiffres)
  ↓
Si valide:
  ↓
Appel API verifySecurityCode()
  ↓
Si code correct ET non utilisé ET non expiré:
  ↓
Appel API loadRegistrationForCorrection()
  ↓
Chargement des données
  ↓
Toast: "Code vérifié !"
  ↓
Masquer SecurityCodeFormV2 (fade out)
  ↓
Afficher RegistrationFormV2 pré-rempli (fade in)
  ↓
CorrectionBannerV2 reste visible (compact)
```

### 3. Modification des données

```
Demandeur consulte le banner de corrections
  ↓
Demandeur navigue entre les étapes
  ↓
Demandeur modifie les champs nécessaires
  ↓
Validation en temps réel de chaque étape
  ↓
Champs à corriger mis en évidence (optionnel)
```

### 4. Soumission

```
Demandeur arrive à la dernière étape
  ↓
Bouton "Soumettre les corrections" actif
  ↓
Demandeur clique
  ↓
Bouton passe en loading
  ↓
Appel API updateRegistration()
  ↓
Mise à jour Firestore:
  - status → 'pending'
  - securityCodeUsed → true
  - Données mises à jour
  ↓
Toast: "Corrections soumises !"
  ↓
Redirection vers page de confirmation
  OU
Affichage message de confirmation
```

---

## 📱 Responsive Design

### Desktop (> 768px)

- Banner : Pleine largeur avec padding
- Formulaire de code : Centré, largeur max 500px
- Inputs OTP : 6 inputs côte à côte avec gap
- Formulaire : Layout standard multi-colonnes

### Mobile (< 768px)

- Banner : Pleine largeur, padding réduit
- Formulaire de code : Pleine largeur
- Inputs OTP : 6 inputs côte à côte (taille réduite)
- Formulaire : Layout stack vertical

---

## ✅ Checklist d'implémentation

- [ ] Créer `SecurityCodeFormV2` composant
- [ ] Créer `SecurityCodeInput` (OTP 6 chiffres)
- [ ] Intégrer `CorrectionBannerV2` dans RegisterPage
- [ ] Ajouter logique de détection `requestId` dans URL
- [ ] Implémenter vérification du code
- [ ] Implémenter chargement des données pour correction
- [ ] Ajouter mise en évidence des champs à corriger (optionnel)
- [ ] Modifier le bouton de soumission ("Soumettre les corrections")
- [ ] Ajouter toasts de succès/erreur
- [ ] Ajouter animations (fade, slide, shake)
- [ ] Tester responsive (desktop + mobile)
- [ ] Ajouter `data-testid` pour les tests E2E
