'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Phone, Shield, Loader2, IdCard, ArrowLeft, ChevronRight, Sparkles, Lock, Zap, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import routes from '@/constantes/routes'
import { ADMIN_ROLES } from '@/types/types'
import { z } from 'zod'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#234E64]/5 to-[#234E64]/10 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#234E64]/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#234E64]/15 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-[#234E64]/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100/[0.02] bg-[size:75px_75px]" />

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300 overflow-hidden bg-white">
              <Logo variant="with-bg" size="md" alt="KARA" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#234E64] to-[#234E64] bg-clip-text text-transparent mb-2">
              Bienvenue sur KARA
            </h1>
            <p className="text-slate-600 text-lg">
              Connectez-vous à votre espace membre
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNumber, index) => (
                <React.Fragment key={stepNumber}>
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-12 h-12 rounded-full border-2 flex items-center justify-center font-semibold transition-all duration-500 relative",
                      step >= stepNumber
                        ? "bg-gradient-to-br from-[#234E64] to-[#234E64] border-transparent text-white shadow-lg"
                        : "border-slate-300 text-slate-400 bg-white"
                    )}>
                      {step > stepNumber ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        stepNumber
                      )}
                      {step >= stepNumber && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#234E64] to-[#234E64] animate-ping opacity-25" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium mt-2 transition-colors duration-300",
                      step >= stepNumber ? "text-[#234E64]" : "text-slate-400"
                    )}>
                      {stepNumber === 1 && "Matricule"}
                      {stepNumber === 2 && "Téléphone"}
                      {stepNumber === 3 && "Code"}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={cn(
                      "w-16 h-1 rounded-full transition-all duration-500",
                      step > stepNumber + 1 ? "bg-gradient-to-r from-[#234E64] to-[#234E64]" : "bg-slate-200"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Main Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#234E64]/20 to-[#234E64]/20 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">

              {/* Step 1 - Matricule */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#234E64]/10 to-[#234E64]/10 rounded-2xl mb-4">
                      <IdCard className="w-7 h-7 text-[#234E64]" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Votre matricule</h2>
                    <p className="text-slate-600">Saisissez votre matricule pour commencer</p>
                  </div>

                  <Form {...step1Form}>
                    <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-6">
                      <FormField
                        control={step1Form.control}
                        name="matricule"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <IdCard className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                  {...field}
                                  placeholder="Entrez votre matricule"
                                  className="h-14 pl-12 text-lg bg-white/70 border-slate-200 focus:border-[#234E64] focus:ring-2 focus:ring-[#234E64]/20 rounded-xl transition-all duration-300"
                                  autoFocus
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full h-14 bg-gradient-to-r from-[#234E64] to-[#234E64] hover:from-[#234E64] hover:to-[#234E64] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                        disabled={isLoading}
                      >
                        <span>Continuer</span>
                        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                      </Button>
                    </form>
                  </Form>
                </div>
              )}

              {/* Step 2 - Phone */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#234E64]/10 to-[#234E64]/10 rounded-2xl mb-4">
                      <Phone className="w-7 h-7 text-[#234E64]" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Votre téléphone</h2>
                    <p className="text-slate-600">Nous allons vous envoyer un code de vérification</p>
                  </div>

                  {/* Matricule Reminder */}
                  <div className="bg-gradient-to-r from-[#234E64]/5 to-[#234E64]/5 border border-[#234E64]/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#234E64]/10 rounded-full flex items-center justify-center">
                          <IdCard className="w-4 h-4 text-[#234E64]" />
                        </div>
                        <span className="text-slate-700">
                          Matricule: <span className="font-semibold text-[#234E64]">{step1Data?.matricule}</span>
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={goBackToStep1}
                        className="text-slate-500 hover:text-[#234E64]"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                    </div>
                  </div>

                  <Form {...step2Form}>
                    <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
                <FormField
                        control={step2Form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                          <FormItem>
                      <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input
                            {...field}
                            type="tel"
                            placeholder="+241 074 77 34 00"
                            onChange={(e) => {
                                    //const formatted = process.env.NODE_ENV === 'development' ? e.target.value : formatPhoneNumber(e.target.value)
                                    const formatted = e.target.value
                              field.onChange(formatted)
                            }}
                                  className="h-14 pl-12 text-lg bg-white/70 border-slate-200 focus:border-[#234E64] focus:ring-2 focus:ring-[#234E64]/20 rounded-xl transition-all duration-300"
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
                          className="h-14 px-6 border-slate-200 hover:bg-slate-50 rounded-xl"
                          disabled={isLoading}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Retour
                        </Button>

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 h-14 bg-gradient-to-r from-[#234E64] to-[#234E64] hover:from-[#234E64] hover:to-[#234E64] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          {isLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Envoi...</span>
                          </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <Zap className="w-5 h-5" />
                              <span>Envoyer le code</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                        </div>
                      )}
                      
              {/* Step 3 - OTP */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#234E64]/10 to-[#234E64]/10 rounded-2xl mb-4 animate-pulse">
                      <Lock className="w-7 h-7 text-[#234E64]" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Code de vérification</h2>
                    <p className="text-slate-600">Entrez le code à 6 chiffres reçu par SMS</p>
                  </div>

                  {/* Phone Reminder */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-xl p-4">
                    <div className="text-center">
                      <p className="text-green-800 text-sm">
                        Code envoyé au <span className="font-semibold">{step2Form.getValues('phoneNumber')}</span>
                      </p>
                      <p className="text-green-600 text-xs mt-1">
                        Matricule: {step1Data?.matricule}
                      </p>
                    </div>
                        </div>

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
                      className="space-y-8"
                    >
                      <FormField
                        control={step3Form.control}
                        name="otp"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-center">
                              <InputOTP
                                maxLength={6}
                                value={field.value}
                                onChange={field.onChange}
                                className="gap-3"
                              >
                                <InputOTPGroup className="gap-3">
                                  {Array.from({ length: 6 }).map((_, i) => (
                                    <InputOTPSlot
                                      key={i}
                                      index={i}
                                      className="w-12 h-14 text-xl font-bold border-2 border-slate-200 focus:border-[#234E64] focus:ring-2 focus:ring-[#234E64]/20 rounded-xl bg-white/70 transition-all duration-300"
                                    />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                        </div>
                            <FormMessage />
                    </FormItem>
                  )}
                />

                      <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                          className="w-full h-14 bg-gradient-to-r from-[#234E64] to-[#234E64] hover:from-[#234E64] hover:to-[#234E64] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Vérification...</span>
                    </div>
                  ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Valider</span>
                    </div>
                  )}
                </Button>

                        <div className="flex space-x-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep(2)}
                            className="flex-1 h-12 border-slate-200 hover:bg-slate-50 rounded-xl"
                            disabled={isLoading}
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Retour
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex-1 h-12 text-slate-600 hover:text-[#234E64] hover:bg-slate-50 rounded-xl"
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
                        </div>
                      </div>
              </form>
            </Form>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 space-y-4">
            <div className="flex items-center justify-center space-x-2 text-slate-600">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Connexion sécurisée avec vérification SMS</span>
        </div>

            <p className="text-sm text-slate-500">
            Pas encore membre ?{' '}
            <button 
              onClick={() => router.push(routes.public.register)}
                className="text-[#234E64] hover:text-[#234E64] font-semibold underline transition-colors duration-300"
            >
              Rejoignez KARA
            </button>
          </p>
        </div>
      </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .bg-grid-slate-100\\/\\[0\\.02\\] {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.05)'%3e%3cpath d='m0 .5h32m-32 32v-32'/%3e%3c/svg%3e");
        }
      `}</style>
    </div>
  )
}