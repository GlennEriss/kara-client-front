# Composants UI - Fonctionnalité Corrections

## 📋 Vue d'ensemble

Ce document détaille les composants UI à créer ou modifier pour la fonctionnalité de correction, avec leurs spécifications techniques complètes.

---

## 🆕 Nouveaux Composants

### 1. SecurityCodeInput (OTP 6 chiffres)

#### 📍 Emplacement
`src/components/ui/security-code-input.tsx`

#### 🎨 Design

```
┌─────────────────────────────────────────────────────────┐
│ Code de sécurité (6 chiffres)                          │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│ │  1  │ │  2  │ │  3  │ │  4  │ │  5  │ │  6  │      │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
└─────────────────────────────────────────────────────────┘
```

#### 🎯 Spécifications

**Props :**
```typescript
interface SecurityCodeInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
  length?: number // Défaut: 6
  className?: string
}
```

**Comportement :**
- **Auto-focus** : Premier input au montage si `autoFocus === true`
- **Auto-advance** : Passer à l'input suivant après saisie d'un chiffre
- **Backspace** : Revenir à l'input précédent si vide
- **Paste** : Support du copier-coller (6 chiffres collés)
- **Validation** : Uniquement des chiffres (0-9)
- **Focus ring** : Couleur amber pour le focus

**Style :**
- **Taille** : `w-12 h-12` (desktop), `w-10 h-10` (mobile)
- **Texte** : `text-2xl font-bold text-center`
- **Bordure** : `border-2 border-gray-300`
- **Focus** : `border-amber-500 ring-2 ring-amber-200`
- **Error** : `border-red-500 ring-2 ring-red-200`
- **Disabled** : `opacity-50 cursor-not-allowed`

**Code :**
```tsx
'use client'

import { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function SecurityCodeInput({
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
  length = 6,
  className,
}: SecurityCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus()
    }
  }, [autoFocus])

  const handleChange = (index: number, inputValue: string) => {
    // Uniquement des chiffres
    const digit = inputValue.replace(/\D/g, '')
    if (!digit) return

    const newValue = value.split('')
    newValue[index] = digit
    const updatedValue = newValue.join('').slice(0, length)
    onChange(updatedValue)

    // Auto-advance
    if (index < length - 1 && digit) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted.length === length) {
      onChange(pasted)
      inputRefs.current[length - 1]?.focus()
    }
  }

  return (
    <div className={cn('flex gap-2 justify-center', className)} onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          ref={(el) => (inputRefs.current[index] = el)}
          className={cn(
            'w-12 h-12 text-center text-2xl font-bold',
            'border-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-200',
            error && 'border-red-500 ring-2 ring-red-200',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          data-testid={`security-code-input-${index}`}
        />
      ))}
    </div>
  )
}
```

#### 🎬 Animations

- **Focus** : Transition de bordure (`transition-colors duration-200`)
- **Error** : Shake horizontal (`animate-shake`)
- **Auto-advance** : Focus ring animé

---

### 2. SecurityCodeFormV2

#### 📍 Emplacement
`src/domains/auth/registration/components/SecurityCodeFormV2.tsx`

#### 🎨 Design

Voir `DEMANDEUR_WIREFRAME.md` section "Phase 1"

#### 🎯 Spécifications

**Props :**
```typescript
interface SecurityCodeFormV2Props {
  onVerify: (code: string) => Promise<boolean>
  isLoading?: boolean
  error?: string | null
  className?: string
}
```

**Comportement :**
- Affiche le formulaire de code de sécurité
- Gère la saisie via `SecurityCodeInput`
- Appelle `onVerify` au clic sur "Vérifier le code"
- Affiche les erreurs si `error` est fourni
- État de loading pendant la vérification

**Code :**
```tsx
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SecurityCodeInput } from '@/components/ui/security-code-input'
import { Shield, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SecurityCodeFormV2({
  onVerify,
  isLoading = false,
  error = null,
  className,
}: SecurityCodeFormV2Props) {
  const [code, setCode] = useState('')

  const handleVerify = async () => {
    if (code.length === 6) {
      await onVerify(code)
    }
  }

  return (
    <Card className={cn('border-2 border-amber-200 bg-amber-50/50', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <Shield className="w-5 h-5 text-amber-600" />
          Code de sécurité requis
        </CardTitle>
        <CardDescription className="text-amber-800">
          Pour accéder à votre formulaire et apporter les corrections,
          veuillez saisir le code de sécurité qui vous a été communiqué.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-amber-900">
            Code de sécurité (6 chiffres)
          </Label>
          <SecurityCodeInput
            value={code}
            onChange={setCode}
            disabled={isLoading}
            error={!!error}
            autoFocus
          />
        </div>

        {error && (
          <Alert variant="destructive" className="animate-shake">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleVerify}
          disabled={code.length !== 6 || isLoading}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          data-testid="verify-security-code-button"
        >
          {isLoading ? (
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
  )
}
```

#### 🎬 Animations

- **Entrée** : Fade in + scale (0.95 → 1.0)
- **Error** : Shake horizontal
- **Loading** : Spinner rotatif

---

## 🔄 Composants à Modifier

### 1. CorrectionsModalV2

#### Modifications nécessaires

**Ajouter la sélection du numéro WhatsApp :**

```tsx
// Ajouter dans les props
interface CorrectionsModalV2Props {
  // ... props existantes
  phoneNumbers?: string[] // Liste de tous les numéros
  selectedPhoneIndex?: number // Index du numéro sélectionné
  onPhoneIndexChange?: (index: number) => void
}

// Dans le composant
{phoneNumbers && phoneNumbers.length > 1 && (
  <div className="space-y-2">
    <Label htmlFor="phone-select" className="text-sm font-semibold">
      Sélectionner le numéro WhatsApp
    </Label>
    <Select
      value={selectedPhoneIndex?.toString() || '0'}
      onValueChange={(value) => onPhoneIndexChange?.(parseInt(value))}
      disabled={isLoading}
    >
      <SelectTrigger id="phone-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {phoneNumbers.map((phone, index) => (
          <SelectItem key={index} value={index.toString()}>
            {formatPhoneNumber(phone)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-gray-500">
      Par défaut: {formatPhoneNumber(phoneNumbers[0])}
    </p>
  </div>
)}
```

**Modifier le callback `onConfirm` :**

```tsx
// Ancien
onConfirm: (data: {
  corrections: string[]
  sendWhatsApp?: boolean
}) => Promise<...>

// Nouveau
onConfirm: (data: {
  corrections: string[]
  selectedPhoneIndex?: number
}) => Promise<...>
```

---

### 2. RegisterProvider / RegistrationFormV2

#### Modifications nécessaires

**Ajouter l'affichage conditionnel :**

```tsx
// Dans RegisterProvider ou RegistrationFormV2
{correctionRequest && !correctionRequest.isVerified ? (
  // Afficher SecurityCodeFormV2
  <div className="space-y-6">
    <CorrectionBannerV2 reviewNote={correctionRequest.reviewNote} />
    <SecurityCodeFormV2
      onVerify={handleVerifyCode}
      isLoading={isVerifyingCode}
      error={verificationError}
    />
  </div>
) : (
  // Afficher RegistrationFormV2 normal
  <RegistrationFormV2 />
)}
```

**Ajouter la fonction de vérification :**

```tsx
const handleVerifyCode = async (code: string) => {
  setIsVerifyingCode(true)
  setVerificationError(null)
  
  try {
    const isValid = await registrationService.verifySecurityCode(
      correctionRequest.requestId,
      code
    )
    
    if (isValid) {
      // Charger les données
      const formData = await registrationService.loadRegistrationForCorrection(
        correctionRequest.requestId
      )
      
      if (formData) {
        reset(formData)
        setCorrectionRequest({ ...correctionRequest, isVerified: true })
        toast.success("Code vérifié !", {
          description: "Données chargées. Vous pouvez maintenant modifier vos informations.",
        })
      }
    } else {
      setVerificationError("Code incorrect, expiré ou déjà utilisé.")
    }
  } catch (error) {
    setVerificationError("Erreur lors de la vérification du code.")
  } finally {
    setIsVerifyingCode(false)
  }
}
```

---

## 🎨 Styles et Thème

### Couleurs KARA

**Amber (corrections) :**
```css
--amber-50: #fffbeb;
--amber-200: #fde68a;
--amber-300: #fcd34d;
--amber-600: #d97706;
--amber-700: #b45309;
```

**Utilisation :**
- Fond des banners : `bg-amber-50`
- Bordures : `border-amber-200`
- Texte : `text-amber-900`
- Boutons : `bg-amber-600 hover:bg-amber-700`

### Animations CSS

**Shake :**
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

**Slide down :**
```css
@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
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

---

## 📱 Responsive

### Desktop (> 768px)

- **SecurityCodeInput** : 6 inputs côte à côte, taille `w-12 h-12`
- **Modal** : Largeur max `600px`, centré
- **Banner** : Pleine largeur avec padding

### Mobile (< 768px)

- **SecurityCodeInput** : 6 inputs côte à côte, taille `w-10 h-10`
- **Modal** : Plein écran avec padding réduit
- **Banner** : Pleine largeur, padding réduit

---

## ✅ Checklist d'implémentation

### Composants à créer

- [ ] `SecurityCodeInput` (OTP 6 chiffres)
- [ ] `SecurityCodeFormV2` (formulaire complet)

### Composants à modifier

- [ ] `CorrectionsModalV2` (ajouter sélection numéro)
- [ ] `RegisterProvider` (ajouter logique de vérification)
- [ ] `RegistrationFormV2` (affichage conditionnel)

### Styles et animations

- [ ] Ajouter animations CSS (shake, slide-down)
- [ ] Créer variants de couleurs amber
- [ ] Tester responsive

### Intégration

- [ ] Intégrer dans la page admin
- [ ] Intégrer dans la page register
- [ ] Tester le flow complet
- [ ] Ajouter `data-testid` pour E2E
