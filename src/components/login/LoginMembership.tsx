'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Phone, Users, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import routes from '@/constantes/routes'
import { memberLoginSchema, MemberLoginFormData, memberLoginDefaultValues } from '@/types/schemas'
import AuthLayout from '@/components/auth/AuthLayout'

export default function LoginMembership() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<MemberLoginFormData>({
    resolver: zodResolver(memberLoginSchema),
    defaultValues: memberLoginDefaultValues
  })

  const onSubmit = async (data: MemberLoginFormData) => {
    setIsLoading(true)
    try {
      // Simulation d'une connexion - à remplacer par votre logique d'authentification
      console.log('Tentative de connexion avec:', data.phoneNumber)
      
      // Simule une attente d'API
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simule une vérification (à remplacer par votre logique)
      const isValidMember = true // Votre logique de validation ici
      
      if (isValidMember) {
        // Toast de succès
        toast.success("Connexion réussie !", {
          description: "Bienvenue dans votre espace membre",
          style: {
            background: "#10b981",
            color: "white",
            border: "none"
          },
          duration: 2000
        })

        // Redirection vers l'espace membre
        router.push('')
      } else {
        // Toast d'erreur pour membre non trouvé
        toast.error("Membre non trouvé", {
          description: "Ce numéro n'est pas associé à un compte membre",
          style: {
            background: "#ef4444",
            color: "white",
            border: "none"
          },
          duration: 4000
        })
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error)

      // Toast d'erreur générique
      toast.error("Erreur de connexion", {
        description: "Une erreur s'est produite. Veuillez réessayer.",
        style: {
          background: "#ef4444",
          color: "white",
          border: "none"
        },
        duration: 4000
      })
    } finally {
      setIsLoading(false)
    }
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
      subtitle="Connectez-vous avec votre numéro de téléphone"
      headerIcon={<Users className="w-6 h-6" />}
      headerTitle="Connexion Membre"
    >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Champ Numéro de téléphone */}
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-medium text-[#224D62] flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>Numéro de téléphone</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CBB171] transition-colors duration-300 group-focus-within:text-[#224D62]" />
                          <Input
                            {...field}
                            type="tel"
                            placeholder="+241 074 77 34 00"
                            onChange={(e) => {
                              const formatted = formatPhoneNumber(e.target.value)
                              field.onChange(formatted)
                            }}
                            className={cn(
                              "pl-12 h-14 border-2 border-[#224D62]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300 text-lg bg-white/70 backdrop-blur-sm",
                              "hover:border-[#CBB171]/50 hover:bg-white/90",
                              form.formState.errors.phoneNumber && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                            )}
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bouton de connexion */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-gradient-to-r from-[#224D62] to-[#224D62]/90 hover:from-[#224D62]/90 hover:to-[#CBB171]/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 text-lg group"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                      <span>Connexion en cours...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3 group-hover:scale-105 transition-transform duration-200">
                      <Phone className="w-5 h-5" />
                      <span>Se connecter</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>

      {/* Informations supplémentaires */}
      <div className="space-y-4 pt-4 border-t border-[#224D62]/10">
        {/* Message informatif */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-[#224D62]/70 text-sm bg-[#CBB171]/10 px-4 py-2 rounded-lg">
            <Shield className="w-4 h-4" />
            <span>Connexion sécurisée par SMS</span>
          </div>
        </div>

        {/* Note pour nouveaux membres */}
        <div className="text-center">
          <p className="text-xs text-[#224D62]/60 leading-relaxed">
            Pas encore membre ?{' '}
            <button 
              onClick={() => router.push(routes.public.register)}
              className="text-[#CBB171] hover:text-[#224D62] font-medium underline transition-colors duration-200"
            >
              Rejoignez KARA
            </button>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}