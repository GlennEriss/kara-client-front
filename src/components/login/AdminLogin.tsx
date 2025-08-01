'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Eye, EyeOff, Mail, Lock, Shield, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { adminLoginSchema, AdminLoginFormData, adminLoginDefaultValues } from '@/types/schemas'
import routes from '@/constantes/routes'

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: adminLoginDefaultValues
  })

  const onSubmit = async (data: AdminLoginFormData) => {
    setIsLoading(true)
    try {
      // TODO: Implémenter la logique d'authentification admin
      console.log('Admin login data:', data)
      
      // Simuler une requête de connexion
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Redirection vers le dashboard admin (à créer)
      // router.push('/admin/dashboard')
      
    } catch (error) {
      console.error('Erreur de connexion:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToHome = () => {
    router.push(routes.public.homepage)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations - même style que homepage */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#224D62]/10 to-transparent rounded-full opacity-30 transform translate-x-48 -translate-y-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#CBB171]/10 to-transparent rounded-full opacity-30 transform -translate-x-48 translate-y-48"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-[#224D62]/10 to-[#CBB171]/10 rounded-full opacity-20 transform -translate-x-32 -translate-y-32"></div>
      </div>

      {/* Bouton retour */}
      <Button
        variant="ghost"
        onClick={handleBackToHome}
        className="absolute top-4 left-4 md:top-6 md:left-6 text-[#224D62] hover:text-[#CBB171] hover:bg-[#224D62]/5 z-10 text-sm md:text-base"
      >
        <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
        <span className="hidden sm:inline">Retour à l'accueil</span>
        <span className="sm:hidden">Retour</span>
      </Button>

      {/* Container principal */}
      <div className="w-full max-w-md relative z-10 pt-16 md:pt-0">
        {/* Logo */}
        <div className="text-center mb-8 animate-in fade-in-0 slide-in-from-top-4 duration-500">
          <img
            src="/Logo-Kara.webp"
            alt="KARA Logo"
            className="h-20 w-auto mx-auto mb-4 transition-transform hover:scale-105"
          />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#224D62] to-[#CBB171] bg-clip-text text-transparent">
            Connexion Administrateur
          </h1>
          <p className="text-[#224D62]/70 mt-2">
            Accédez au panneau d'administration KARA
          </p>
        </div>

        {/* Carte de connexion */}
        <Card className="p-0 shadow-2xl border-0 bg-white/80 backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-200">
          <CardHeader className="m-0 space-y-1 bg-gradient-to-r from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 border-b border-[#224D62]/20 rounded-t-lg">
            <CardTitle className="text-center flex items-center justify-center space-x-2 text-[#224D62]">
              <Shield className="w-6 h-6" />
              <span>Espace Sécurisé</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Champ Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-[#224D62]">
                        Adresse email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="admin@kara-mutuelle.ga"
                            className={cn(
                              "pl-10 h-12 border-2 border-[#224D62]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300",
                              form.formState.errors.email && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50"
                            )}
                            disabled={isLoading}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Champ Mot de passe */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-[#224D62]">
                        Mot de passe
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className={cn(
                              "pl-10 pr-12 h-12 border-2 border-[#224D62]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300",
                              form.formState.errors.password && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50"
                            )}
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 text-[#224D62] hover:text-[#CBB171] hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
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
                  className="w-full h-12 bg-gradient-to-r from-[#224D62] to-[#224D62]/90 hover:from-[#224D62]/90 hover:to-[#CBB171]/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>Connexion en cours...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Se connecter</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>

            {/* Message de sécurité */}
            <div className="text-center pt-4 border-t border-[#224D62]/10">
              <p className="text-xs text-[#224D62]/60">
                Cet espace est réservé aux administrateurs autorisés.
                <br />
                Toutes les connexions sont surveillées et enregistrées.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-400">
          <p className="text-sm text-[#224D62]/70">
            © 2025 KARA - Mutuelle de Solidarité
          </p>
        </div>
      </div>
    </div>
  )
}
