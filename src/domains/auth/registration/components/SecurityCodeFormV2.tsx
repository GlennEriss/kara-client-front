/**
 * Formulaire de code de sécurité V2
 * 
 * Permet au demandeur de saisir un code de sécurité à 6 chiffres
 * pour accéder à son formulaire de correction.
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SecurityCodeFormV2Props {
  onVerify: (code: string) => Promise<boolean>
  isLoading?: boolean
  error?: string | null
  className?: string
}

export function SecurityCodeFormV2({
  onVerify,
  isLoading = false,
  error: externalError,
  className,
}: SecurityCodeFormV2Props) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Réinitialiser l'erreur quand le code change
  useEffect(() => {
    if (code.some(c => c !== '')) {
      setError(null)
    }
  }, [code])

  // Mettre à jour l'erreur externe
  useEffect(() => {
    if (externalError) {
      setError(externalError)
    }
  }, [externalError])

  // Réinitialiser le code quand la vérification réussit
  useEffect(() => {
    if (!isVerifying && !isLoading && !error) {
      // Si la vérification a réussi, le code sera réinitialisé par le parent
      // On ne fait rien ici
    }
  }, [isVerifying, isLoading, error])

  const handleInputChange = (index: number, value: string) => {
    // Ne permettre que les chiffres
    if (value && !/^\d$/.test(value)) {
      return
    }

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError(null)

    // Auto-advance vers le champ suivant si un chiffre est saisi
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Supprimer et revenir en arrière
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }

    // Navigation avec les flèches
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Coller un code complet (6 chiffres)
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6)
        if (digits.length === 6) {
          const newCode = digits.split('')
          setCode(newCode)
          setError(null)
          // Focus sur le dernier input
          inputRefs.current[5]?.focus()
        }
      })
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    const digits = pastedText.replace(/\D/g, '').slice(0, 6)
    
    if (digits.length === 6) {
      const newCode = digits.split('')
      setCode(newCode)
      setError(null)
      // Focus sur le dernier input
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const codeString = code.join('')
    
    // Validation : doit être 6 chiffres
    if (codeString.length !== 6) {
      setError('Le code doit contenir 6 chiffres')
      return
    }

    if (!/^\d{6}$/.test(codeString)) {
      setError('Le code doit contenir uniquement des chiffres')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const success = await onVerify(codeString)
      if (!success) {
        // L'erreur sera gérée par le parent via la prop error
        // On ne fait rien ici
      } else {
        // Réinitialiser le code en cas de succès
        setCode(['', '', '', '', '', ''])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsVerifying(false)
    }
  }

  const isCodeComplete = code.every(c => c !== '') && code.join('').length === 6
  const isDisabled = !isCodeComplete || isVerifying || isLoading

  return (
    <Card
      className={cn(
        'border-2 border-amber-200 bg-amber-50/50 shadow-lg',
        className
      )}
      data-testid="security-code-form"
    >
      <CardHeader>
        <CardTitle
          className="flex items-center gap-2 text-amber-900"
          data-testid="security-code-form-title"
        >
          <Shield className="w-5 h-5 text-amber-600" />
          Code de sécurité requis
        </CardTitle>
        <CardDescription
          className="text-amber-800"
          data-testid="security-code-form-description"
        >
          Pour accéder à votre formulaire et apporter les corrections,
          veuillez saisir le code de sécurité qui vous a été communiqué.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label
            className="text-amber-900 font-semibold"
            data-testid="security-code-form-label"
          >
            Code de sécurité (6 chiffres)
          </Label>
          
          <div
            className="flex gap-2 justify-center"
            data-testid="security-code-inputs"
          >
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isVerifying || isLoading}
                className={cn(
                  'w-12 h-14 text-center text-2xl font-bold border-2 transition-all',
                  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200',
                  error ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                data-testid={`security-code-input-${index}`}
              />
            ))}
          </div>
        </div>

        {(error || externalError) && (
          <Alert
            variant="destructive"
            className="animate-in fade-in-0 slide-in-from-top-2"
            data-testid="security-code-form-error"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="security-code-form-error-message">
              {error || externalError}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleVerify}
          disabled={isDisabled}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          data-testid="security-code-form-verify-button"
        >
          {isVerifying || isLoading ? (
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
