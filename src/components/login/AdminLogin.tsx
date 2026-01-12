'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { adminLoginSchema, AdminLoginFormData, adminLoginDefaultValues } from '@/schemas/schemas'
import routes from '@/constantes/routes'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase/auth'
import { toast } from "sonner"
import AuthLayout from '@/components/auth/AuthLayout'

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
      const userCred = await signInWithEmailAndPassword(auth, data.email, data.password)
      if (userCred.user) {
        // Obtenir le token ID pour l'authentification côté serveur
        const idToken = await userCred.user.getIdToken()
        
        // Sauvegarder le token dans un cookie (secure uniquement en production)
        const isProduction = window.location.protocol === 'https:';
        const cookieOptions = `path=/; max-age=3600; samesite=strict${isProduction ? '; secure' : ''}`;
        document.cookie = `auth-token=${idToken}; ${cookieOptions}`;
        
        // Toast de succès avec fond vert
        toast.success("Connexion réussie !", {
          description: "Redirection vers le tableau de bord...",
          style: {
            background: "#10b981", // Vert success
            color: "white",
            border: "none"
          },
          duration: 2000
        })

        // Redirection vers le dashboard admin
        router.push(routes.admin.dashboard)
      } else {
        // Toast d'erreur pour utilisateur non trouvé
        toast.error("Erreur de connexion", {
          description: "Impossible de vous connecter",
          style: {
            background: "#ef4444", // Rouge error
            color: "white",
            border: "none"
          },
          duration: 4000
        })
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error)

      // Toast d'erreur avec fond rouge
      let errorMessage = "Une erreur est survenue"
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Utilisateur non trouvé"
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Mot de passe incorrect"
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email invalide"
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Trop de tentatives. Réessayez plus tard"
      }

      toast.error("Connexion échouée", {
        description: errorMessage,
        style: {
          background: "#ef4444", // Rouge error
          color: "white",
          border: "none"
        },
        duration: 4000
      })
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <AuthLayout
      title="Connexion Administrateur"
      subtitle="Accédez au panneau d'administration KARA"
      headerIcon={<Shield className="w-6 h-6" />}
      headerTitle="Espace Sécurisé"
    >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Champ Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-medium text-[#224D62] flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>Adresse email</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CBB171] transition-colors duration-300 group-focus-within:text-[#224D62]" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="admin@kara-mutuelle.ga"
                            className={cn(
                              "pl-12 h-14 border-2 border-[#224D62]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300 text-lg bg-white/70 backdrop-blur-sm",
                              "hover:border-[#CBB171]/50 hover:bg-white/90",
                              form.formState.errors.email && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
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
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-medium text-[#224D62] flex items-center space-x-2">
                        <Lock className="w-4 h-4" />
                        <span>Mot de passe</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CBB171] transition-colors duration-300 group-focus-within:text-[#224D62]" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className={cn(
                              "pl-12 pr-12 h-14 border-2 border-[#224D62]/30 focus:border-[#224D62] focus:ring-4 focus:ring-[#224D62]/10 transition-all duration-300 text-lg bg-white/70 backdrop-blur-sm",
                              "hover:border-[#CBB171]/50 hover:bg-white/90",
                              form.formState.errors.password && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                            )}
                            disabled={isLoading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-12 w-12 text-[#224D62] hover:text-[#CBB171] hover:bg-transparent"
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
                  className="w-full h-14 bg-gradient-to-r from-[#224D62] to-[#224D62]/90 hover:from-[#224D62]/90 hover:to-[#CBB171]/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 text-lg group"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                      <span>Connexion en cours...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3 group-hover:scale-105 transition-transform duration-200">
                      <Shield className="w-5 h-5" />
                      <span>Se connecter</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>

        {/* Message de sécurité */}
        <div className="text-center pt-4 border-t border-[#224D62]/10">
          <div className="inline-flex items-center space-x-2 text-[#224D62]/70 text-sm bg-[#CBB171]/10 px-4 py-2 rounded-lg">
            <Shield className="w-4 h-4" />
            <span>Espace surveillé et sécurisé</span>
          </div>
          <p className="text-xs text-[#224D62]/60 mt-2 leading-relaxed">
            Réservé aux administrateurs autorisés
          </p>
        </div>
    </AuthLayout>
  )
}
