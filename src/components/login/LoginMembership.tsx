'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Phone, Users, Shield, Loader2, IdCard, ArrowLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import routes from '@/constantes/routes'
import { ADMIN_ROLES } from '@/types/types'
import { z } from 'zod'
import AuthLayout from '@/components/auth/AuthLayout'
import { auth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from '@/firebase/auth'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

// Schémas séparés pour chaque étape
const step1Schema = z.object({
  matricule: z.string().min(1, "Le matricule est requis")
})

const step2Schema = z.object({
  phoneNumber: z.string().min(8, "Le numéro de téléphone doit contenir au moins 8 chiffres")
})

const step3Schema = z.object({
  otp: z.string().regex(/^\d{6}$/g, 'Code à 6 chiffres requis')
})

const fullSchema = z.object({
  matricule: z.string().min(1, "Le matricule est requis"),
  phoneNumber: z.string().min(8, "Le numéro de téléphone doit contenir au moins 8 chiffres")
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>
type FullFormData = z.infer<typeof fullSchema>

export default function LoginMembership() {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const router = useRouter()

  // Form pour l'étape 1
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { matricule: '' }
  })

  // Form pour l'étape 2
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { phoneNumber: '' }
  })

  // Form pour l'étape 3 (OTP)
  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: { otp: '' }
  })

  // Gestion de l'étape 1
  const onStep1Submit = async (data: Step1Data) => {
    setStep1Data(data)
    setStep(2)
  }

  // Gestion de l'étape 2: vérification UID + envoi SMS, puis passage à l'étape 3
  const onStep2Submit = async (step2Data: Step2Data) => {
    if (!step1Data) return

    const fullData: FullFormData = {
      ...step1Data,
      ...step2Data
    }

    setIsLoading(true)
    try {
      // 1) Vérifier l'existence de l'utilisateur par UID (matricule)
      const resp = await fetch('/api/firebase/auth/get-user/by-uid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: fullData.matricule.trim() }),
      })
      if (!resp.ok) throw new Error('USER_CHECK_FAILED')
      const userInfo = await resp.json()
      if (!userInfo?.found) throw new Error('USER_NOT_FOUND')

      // 2) Envoi du code par SMS
      const verifierId = 'recaptcha-container'
      let recaptchaDiv = document.getElementById(verifierId)
      if (!recaptchaDiv) {
        recaptchaDiv = document.createElement('div')
        recaptchaDiv.id = verifierId
        recaptchaDiv.style.position = 'fixed'
        recaptchaDiv.style.bottom = '0'
        recaptchaDiv.style.right = '0'
        recaptchaDiv.style.opacity = '0'
        document.body.appendChild(recaptchaDiv)
      }
      const appVerifier = new RecaptchaVerifier(auth, verifierId, { size: 'invisible' })
      const conf = await signInWithPhoneNumber(auth, fullData.phoneNumber, appVerifier)
      setConfirmation(conf)
      setStep(3)
      toast.success('Code envoyé', { description: 'Un code de vérification vous a été envoyé par SMS.' })
    } catch (error: any) {
      console.error('Erreur de connexion:', error)
      toast.error('Matricule ou numéro de téléphone incorrect', {
        description: 'Vérifiez vos informations et réessayez.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Retour à l'étape 1
  const goBackToStep1 = () => {
    setStep(1)
  }

  // Formatage automatique du numéro de téléphone
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const match = numbers.match(/^(\d{0,3})(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2})/)
    if (match) {
      return [match[1], match[2], match[3], match[4], match[5]]
        .filter(Boolean)
        .join(' ')
        .trim()
    }
    return value
  }

  return (
    <AuthLayout
      title="Espace Membres"
      subtitle="Connectez-vous avec votre matricule et numéro de téléphone"
      headerIcon={<Users className="w-6 h-6" />}
      headerTitle="Connexion Membre"
    >
      <div className="space-y-6">
        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors",
              step >= 1 ? "bg-[#224D62] border-[#224D62] text-white" : "border-gray-300 text-gray-400"
            )}>
              1
            </div>
            <span className={cn(
              "ml-2 text-sm font-medium",
              step >= 1 ? "text-[#224D62]" : "text-gray-400"
            )}>
              Matricule
            </span>
          </div>
          
          <div className={cn(
            "w-6 h-1 rounded-full transition-colors",
            step >= 2 ? "bg-[#224D62]" : "bg-gray-200"
          )} />
          
          <div className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors",
              step >= 2 ? "bg-[#224D62] border-[#224D62] text-white" : "border-gray-300 text-gray-400"
            )}>
              2
            </div>
            <span className={cn(
              "ml-2 text-sm font-medium",
              step >= 2 ? "text-[#224D62]" : "text-gray-400"
            )}>
              Téléphone
            </span>
          </div>

          <div className={cn(
            "w-6 h-1 rounded-full transition-colors",
            step >= 3 ? "bg-[#224D62]" : "bg-gray-200"
          )} />
          
          <div className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors",
              step >= 3 ? "bg-[#224D62] border-[#224D62] text-white" : "border-gray-300 text-gray-400"
            )}>
              3
            </div>
            <span className={cn(
              "ml-2 text-sm font-medium",
              step >= 3 ? "text-[#224D62]" : "text-gray-400"
            )}>
              Vérification
            </span>
          </div>
        </div>

        {step === 1 && (
          <Form {...step1Form}>
            <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-6">
              <FormField
                control={step1Form.control}
                name="matricule"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium text-[#224D62] flex items-center space-x-2">
                      <IdCard className="w-4 h-4" />
                      <span>Matricule</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Saisissez votre matricule"
                        className="h-12 border-2 border-gray-200 focus:border-[#224D62] focus:ring-2 focus:ring-[#224D62]/20 transition-all text-base"
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full h-12 bg-[#224D62] hover:bg-[#224D62]/90 text-white"
                disabled={isLoading}
              >
                <span>Continuer</span>
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </Form>
        )}

        {step === 2 && (
          <Form {...step2Form}>
            <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
              {/* Rappel du matricule */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <IdCard className="w-4 h-4" />
                    <span>Matricule: <strong className="text-[#224D62]">{step1Data?.matricule}</strong></span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={goBackToStep1}
                    className="text-gray-500 hover:text-[#224D62]"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                </div>
              </div>

              <FormField
                control={step2Form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium text-[#224D62] flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>Numéro de téléphone</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          {...field}
                          type="tel"
                          placeholder="+241 074 77 34 00"
                          onChange={(e) => {
                            const formatted = process.env.NODE_ENV === 'development' ? e.target.value : formatPhoneNumber(e.target.value)
                            field.onChange(formatted)
                          }}
                          className="pl-12 h-12 border-2 border-gray-200 focus:border-[#224D62] focus:ring-2 focus:ring-[#224D62]/20 transition-all text-base"
                          disabled={isLoading}
                          autoFocus
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBackToStep1}
                  className="h-12 px-6"
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 bg-[#224D62] hover:bg-[#224D62]/90 text-white"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Envoi du code...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span>Envoyer le code</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === 3 && (
          <Form {...step3Form}>
            <form
              onSubmit={step3Form.handleSubmit(async ({ otp }) => {
                if (!confirmation) return
                setIsLoading(true)
                try {
                  await confirmation.confirm(otp)
                  toast.success('Connexion réussie !', { description: 'Bienvenue dans votre espace membre' })
                  const role = await JSON.parse(((auth?.currentUser as any)?.reloadUserInfo?.customAttributes))["role"]
                  const isAdmin = role && ADMIN_ROLES.includes(role)
                  router.push(isAdmin ? routes.admin.dashboard : routes.member.home)
                } catch (err) {
                  toast.error('Code invalide', { description: 'Veuillez vérifier le code et réessayer.' })
                } finally {
                  setIsLoading(false)
                }
              })}
              className="space-y-6"
            >
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="text-sm text-gray-600">
                  Saisissez le code reçu par SMS pour le matricule <strong className="text-[#224D62]">{step1Data?.matricule}</strong>
                </div>
              </div>

              <FormField
                control={step3Form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-sm font-medium text-[#224D62]">Code de vérification</FormLabel>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={field.value} onChange={field.onChange}>
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, i) => (
                            <InputOTPSlot key={i} index={i} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-12 px-6" disabled={isLoading}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1 h-12 bg-[#224D62] hover:bg-[#224D62]/90 text-white">
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Vérification...</span>
                    </div>
                  ) : (
                    <span>Valider</span>
                  )}
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={isLoading}
                onClick={async () => {
                  try {
                    const verifierId = 'recaptcha-container'
                    const appVerifier = new RecaptchaVerifier(auth, verifierId, { size: 'invisible' })
                    const conf = await signInWithPhoneNumber(auth, step2Form.getValues('phoneNumber'), appVerifier)
                    setConfirmation(conf)
                    toast.success('Code renvoyé')
                  } catch (e) {
                    toast.error('Impossible de renvoyer le code')
                  }
                }}
              >
                Renvoyer le code
              </Button>
            </form>
          </Form>
        )}

        {/* Informations supplémentaires */}
        <div className="space-y-4 pt-6 border-t border-gray-100">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-gray-600 text-sm bg-gray-50 px-4 py-2 rounded-lg">
              <Shield className="w-4 h-4" />
              <span>Connexion sécurisée</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Pas encore membre ?{' '}
              <button 
                onClick={() => router.push(routes.public.register)}
                className="text-[#224D62] hover:text-[#224D62]/80 font-medium underline transition-colors"
              >
                Rejoignez KARA
              </button>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}