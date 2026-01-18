# Interactions Détaillées - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document détaille toutes les interactions, animations et micro-interactions pour la fonctionnalité de correction.

---

## 🎬 Animations et Transitions

### 1. Modal CorrectionsModalV2

#### Ouverture

**Animation :**
- **Backdrop** : Fade in (`opacity: 0 → 1`, `duration: 200ms`)
- **Modal** : 
  - Fade in (`opacity: 0 → 1`)
  - Scale (`scale: 0.95 → 1.0`)
  - Duration : `200ms`
  - Easing : `ease-out`

**Code CSS :**
```css
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-enter {
  animation: modal-enter 0.2s ease-out;
}
```

#### Fermeture

**Animation :**
- **Backdrop** : Fade out (`opacity: 1 → 0`, `duration: 150ms`)
- **Modal** : 
  - Fade out (`opacity: 1 → 0`)
  - Scale (`scale: 1.0 → 0.95`)
  - Duration : `150ms`
  - Easing : `ease-in`

---

### 2. SecurityCodeInput (OTP)

#### Focus sur un input

**Animation :**
- **Bordure** : Transition de couleur (`border-gray-300 → border-amber-500`)
- **Ring** : Apparition du ring (`ring-2 ring-amber-200`)
- **Duration** : `200ms`
- **Easing** : `ease-out`

**Code :**
```tsx
className="transition-all duration-200 border-2 border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
```

#### Auto-advance

**Comportement :**
1. Utilisateur saisit un chiffre
2. Input suivant reçoit le focus automatiquement
3. Animation : Fade in du focus ring sur le nouvel input

**Code :**
```tsx
const handleChange = (index: number, digit: string) => {
  // ... mise à jour de la valeur
  if (index < length - 1 && digit) {
    // Délai minimal pour l'animation
    setTimeout(() => {
      inputRefs.current[index + 1]?.focus()
    }, 50)
  }
}
```

#### Paste (copier-coller)

**Comportement :**
1. Utilisateur colle 6 chiffres
2. Tous les inputs se remplissent simultanément
3. Focus passe au dernier input
4. Animation : Remplissage progressif (optionnel)

**Code :**
```tsx
const handlePaste = (e: React.ClipboardEvent) => {
  e.preventDefault()
  const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
  
  if (pasted.length === 6) {
    // Remplir tous les inputs
    onChange(pasted)
    
    // Focus sur le dernier input avec animation
    setTimeout(() => {
      inputRefs.current[5]?.focus()
    }, 100)
  }
}
```

#### Erreur

**Animation :**
- **Shake** : Secousse horizontale
- **Bordure** : `border-red-500`
- **Ring** : `ring-2 ring-red-200`
- **Duration** : `300ms`

**Code CSS :**
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.3s ease-in-out;
}
```

---

### 3. CorrectionBannerV2

#### Affichage initial

**Animation :**
- **Slide down** : Depuis le haut (`translateY: -20px → 0`)
- **Fade in** : (`opacity: 0 → 1`)
- **Duration** : `300ms`
- **Easing** : `ease-out`

**Code :**
```tsx
<Alert className="animate-slide-down">
  {/* ... */}
</Alert>
```

**CSS :**
```css
@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}
```

#### Hover

**Animation :**
- **Shadow** : `shadow-md → shadow-lg`
- **Elevation** : Légère translation vers le haut (`translateY: 0 → -2px`)
- **Duration** : `200ms`

**Code :**
```tsx
className="transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
```

---

### 4. Badge "En cours d'examen"

#### Changement de statut

**Animation :**
- **Fade in** : (`opacity: 0 → 1`)
- **Scale** : (`scale: 0.9 → 1.0`)
- **Duration** : `300ms`
- **Easing** : `ease-out`

**Code :**
```tsx
<Badge className="animate-fade-in-scale">
  En cours d'examen
</Badge>
```

**CSS :**
```css
@keyframes fade-in-scale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in-scale {
  animation: fade-in-scale 0.3s ease-out;
}
```

#### Pulse (optionnel)

**Animation :**
- **Pulse** : Légère pulsation pour attirer l'attention
- **Duration** : `2s`
- **Repeat** : `infinite`

**Code :**
```tsx
<Badge className="animate-pulse">
  En cours d'examen
</Badge>
```

---

### 5. Toast de succès

#### Entrée

**Animation :**
- **Slide in** : Depuis la droite (`translateX: 100% → 0`)
- **Fade in** : (`opacity: 0 → 1`)
- **Duration** : `300ms`
- **Easing** : `ease-out`

#### Sortie

**Animation :**
- **Slide out** : Vers la droite (`translateX: 0 → 100%`)
- **Fade out** : (`opacity: 1 → 0`)
- **Duration** : `200ms`
- **Easing** : `ease-in`

**Note :** Géré automatiquement par `sonner`

---

## 🎯 Micro-interactions

### 1. Validation en temps réel (Textarea)

**Comportement :**
- Compteur de corrections mis à jour en temps réel
- Animation de transition sur le nombre
- Couleur change selon le nombre :
  - 0 : Gris (désactivé)
  - 1-2 : Orange (attention)
  - 3+ : Vert (OK)

**Code :**
```tsx
const correctionCount = corrections.length

<p className={cn(
  "text-xs transition-colors duration-200",
  correctionCount === 0 && "text-gray-500",
  correctionCount >= 1 && correctionCount < 3 && "text-amber-600",
  correctionCount >= 3 && "text-green-600"
)}>
  {correctionCount === 0
    ? 'Ajoutez au moins une correction'
    : `${correctionCount} correction${correctionCount > 1 ? 's' : ''} détectée${correctionCount > 1 ? 's' : ''}`}
</p>
```

**Animation du compteur :**
```tsx
<motion.span
  key={correctionCount}
  initial={{ scale: 1.2, color: '#d97706' }}
  animate={{ scale: 1, color: '#000' }}
  transition={{ duration: 0.2 }}
>
  {correctionCount}
</motion.span>
```

---

### 2. Bouton "Demander les corrections"

#### États

**Normal :**
- Couleur : `bg-amber-600`
- Shadow : `shadow-md`

**Hover :**
- Couleur : `bg-amber-700`
- Shadow : `shadow-lg`
- Translation : `-translate-y-0.5`
- Duration : `200ms`

**Disabled :**
- Opacity : `opacity-50`
- Cursor : `cursor-not-allowed`
- Pas d'interaction

**Loading :**
- Spinner rotatif
- Texte : "Envoi en cours..."
- Bouton désactivé

**Code :**
```tsx
<Button
  className={cn(
    "bg-amber-600 hover:bg-amber-700 text-white",
    "shadow-md hover:shadow-lg",
    "transition-all duration-200",
    "hover:-translate-y-0.5",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  )}
  disabled={isLoading || !isValid}
>
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
</Button>
```

---

### 3. Select numéro WhatsApp

#### Ouverture

**Animation :**
- **Dropdown** : Slide down (`translateY: -10px → 0`)
- **Fade in** : (`opacity: 0 → 1`)
- **Duration** : `200ms`

#### Sélection

**Animation :**
- **Item** : Highlight au hover (`bg-gray-100`)
- **Sélection** : Checkmark apparaît avec fade in
- **Fermeture** : Slide up + fade out

**Code :**
```tsx
<SelectContent className="animate-slide-down">
  {phoneNumbers.map((phone, index) => (
    <SelectItem
      key={index}
      value={index.toString()}
      className="transition-colors duration-150 hover:bg-gray-100"
    >
      {formatPhoneNumber(phone)}
      {index === selectedPhoneIndex && (
        <Check className="w-4 h-4 ml-auto text-amber-600" />
      )}
    </SelectItem>
  ))}
</SelectContent>
```

---

### 4. Formulaire pré-rempli

#### Chargement des données

**Animation :**
- **Skeleton** : Affichage pendant le chargement
- **Remplissage** : Les champs se remplissent progressivement
- **Fade in** : Chaque champ apparaît avec un léger délai

**Code :**
```tsx
{isLoadingData ? (
  <div className="space-y-4">
    {Array.from({ length: 10 }).map((_, i) => (
      <Skeleton
        key={i}
        className="h-10 w-full"
        style={{ animationDelay: `${i * 50}ms` }}
      />
    ))}
  </div>
) : (
  <RegistrationFormV2 />
)}
```

#### Mise en évidence des champs à corriger

**Animation :**
- **Bordure** : `border-amber-300` (par défaut)
- **Focus** : `border-amber-500 ring-2 ring-amber-200`
- **Pulse** : Légère pulsation au chargement (optionnel)

**Code :**
```tsx
<Input
  className={cn(
    "transition-all duration-200",
    needsCorrection && "border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200",
    needsCorrection && "animate-pulse-once"
  )}
/>
```

**CSS :**
```css
@keyframes pulse-once {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-pulse-once {
  animation: pulse-once 2s ease-in-out;
}
```

---

## 🔄 Transitions de page

### 1. Masquage du formulaire de code

**Animation :**
- **Fade out** : (`opacity: 1 → 0`)
- **Slide up** : (`translateY: 0 → -20px`)
- **Duration** : `300ms`
- **Easing** : `ease-in`

**Code :**
```tsx
<motion.div
  initial={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: 'ease-in' }}
>
  <SecurityCodeFormV2 />
</motion.div>
```

### 2. Affichage du formulaire pré-rempli

**Animation :**
- **Fade in** : (`opacity: 0 → 1`)
- **Slide down** : (`translateY: 20px → 0`)
- **Duration** : `300ms`
- **Easing** : `ease-out`

**Code :**
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: 'ease-out' }}
>
  <RegistrationFormV2 />
</motion.div>
```

---

## 📱 Interactions tactiles (Mobile)

### 1. Tap sur input OTP

**Feedback :**
- **Ripple effect** : Cercle qui s'étend depuis le point de tap
- **Vibration** : Légère vibration (si supporté)
- **Focus ring** : Apparition immédiate

### 2. Swipe pour fermer modal

**Comportement :**
- Swipe down pour fermer le modal
- Animation de fermeture si swipe > 50% de la hauteur

**Code :**
```tsx
const handleSwipe = (direction: 'up' | 'down') => {
  if (direction === 'down' && swipeDistance > 100) {
    onClose()
  }
}
```

---

## ⚡ Performance

### Optimisations

1. **Lazy loading** : Charger `SecurityCodeFormV2` uniquement si nécessaire
2. **Debounce** : Validation du textarea avec debounce (300ms)
3. **Memoization** : Mémoriser les composants coûteux
4. **CSS animations** : Préférer CSS aux animations JS pour la performance

**Code :**
```tsx
const SecurityCodeFormV2 = memo(({ onVerify, ... }) => {
  // ...
})

// Debounce pour la validation
const debouncedValidation = useMemo(
  () => debounce((text: string) => {
    const corrections = text.split('\n').filter(l => l.trim())
    setIsValid(corrections.length > 0)
  }, 300),
  []
)
```

---

## 🎨 Accessibilité

### ARIA Labels

**SecurityCodeInput :**
```tsx
<div
  role="group"
  aria-label="Code de sécurité à 6 chiffres"
  aria-describedby="security-code-help"
>
  {inputs.map((input, index) => (
    <Input
      aria-label={`Chiffre ${index + 1} du code de sécurité`}
      aria-required="true"
    />
  ))}
</div>
<p id="security-code-help" className="sr-only">
  Saisissez le code de sécurité à 6 chiffres qui vous a été communiqué
</p>
```

### Keyboard Navigation

**SecurityCodeInput :**
- **Tab** : Navigation entre les inputs
- **Backspace** : Revenir à l'input précédent si vide
- **Arrow keys** : Navigation gauche/droite
- **Enter** : Valider le code (si tous les champs remplis)

**Code :**
```tsx
const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
  if (e.key === 'ArrowLeft' && index > 0) {
    inputRefs.current[index - 1]?.focus()
  } else if (e.key === 'ArrowRight' && index < length - 1) {
    inputRefs.current[index + 1]?.focus()
  } else if (e.key === 'Enter' && code.length === 6) {
    handleVerify()
  }
}
```

---

## ✅ Checklist animations

- [ ] Modal : Ouverture/fermeture avec fade + scale
- [ ] SecurityCodeInput : Focus ring, auto-advance, shake sur erreur
- [ ] CorrectionBannerV2 : Slide down + fade in
- [ ] Badge : Fade in + scale au changement
- [ ] Toast : Slide in/out depuis la droite
- [ ] Boutons : Hover avec translation et shadow
- [ ] Formulaire : Remplissage progressif avec skeleton
- [ ] Transitions : Masquage/affichage avec fade + slide
- [ ] Mobile : Ripple effect, swipe to close
- [ ] Performance : CSS animations, memoization, debounce
