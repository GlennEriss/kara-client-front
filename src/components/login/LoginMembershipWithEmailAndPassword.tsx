'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Eye, EyeOff, Mail, Lock, Shield, Loader2, IdCard, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"
import routes from '@/constantes/routes'
import { ADMIN_ROLES } from '@/types/types'
import { z } from 'zod'
import { auth } from '@/firebase/auth'
import { signInWithEmailAndPassword } from 'firebase/auth'

// Schéma de validation pour la connexion membre avec email/mot de passe
const memberLoginSchema = z.object({
  matricule: z.string().min(1, "Le matricule est requis"),
  email: z.string()
    .email('Format d\'email invalide')
    .min(1, 'L\'email est requis'),
  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .max(100, 'Le mot de passe ne peut pas dépasser 100 caractères')
})

type MemberLoginFormData = z.infer<typeof memberLoginSchema>

const memberLoginDefaultValues: MemberLoginFormData = {
  matricule: '',
  email: '',
  password: ''
}

export default function LoginMembershipWithEmailAndPassword() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<MemberLoginFormData>({
    resolver: zodResolver(memberLoginSchema),
    defaultValues: memberLoginDefaultValues
  })

  const onSubmit = async (data: MemberLoginFormData) => {
    setIsLoading(true)
    try {
      // 1) Vérifier l'existence de l'utilisateur par UID (matricule)
      const resp = await fetch('/api/firebase/auth/get-user/by-uid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: data.matricule.trim() }),
      })
      
      if (!resp.ok) throw new Error('USER_CHECK_FAILED')
      const userInfo = await resp.json()
      if (!userInfo?.found) throw new Error('USER_NOT_FOUND')

      // 2) Tentative de connexion avec email/mot de passe
      const userCred = await signInWithEmailAndPassword(auth, data.email, data.password)
      
      if (userCred.user) {
        // Vérifier que l'utilisateur connecté correspond au matricule
        if (userCred.user.uid !== data.matricule.trim()) {
          throw new Error('MATRICULE_EMAIL_MISMATCH')
        }

        // Obtenir le token ID pour l'authentification côté serveur
        const idToken = await userCred.user.getIdToken()
        
        // Sauvegarder le token dans un cookie
        document.cookie = `auth-token=${idToken}; path=/; max-age=3600; secure; samesite=strict`
        
        toast.success('Connexion réussie !', { 
          description: 'Bienvenue dans votre espace membre',
          style: {
            background: "#10b981",
            color: "white",
            border: "none"
          },
          duration: 2000
        })

        // Vérifier le rôle et rediriger
        const role = await JSON.parse(((auth?.currentUser as any)?.reloadUserInfo?.customAttributes))["role"]
        const isAdmin = role && ADMIN_ROLES.includes(role)
        router.push(isAdmin ? routes.admin.dashboard : routes.member.home)
      }
    } catch (error: any) {
      console.error('Erreur de connexion:', error)
      
      let errorMessage = "Une erreur est survenue"
      let errorDescription = "Vérifiez vos informations et réessayez."

      if (error.message === 'USER_NOT_FOUND') {
        errorMessage = "Matricule incorrect"
        errorDescription = "Ce matricule n'existe pas dans notre base de données."
      } else if (error.message === 'MATRICULE_EMAIL_MISMATCH') {
        errorMessage = "Matricule et email ne correspondent pas"
        errorDescription = "Le matricule saisi ne correspond pas à l'email utilisé."
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "Email incorrect"
        errorDescription = "Aucun compte associé à cet email."
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Mot de passe incorrect"
        errorDescription = "Vérifiez votre mot de passe et réessayez."
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email invalide"
        errorDescription = "Format d'email incorrect."
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Trop de tentatives"
        errorDescription = "Réessayez plus tard."
      }

      toast.error(errorMessage, {
        description: errorDescription,
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

          {/* Main Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#234E64]/20 to-[#234E64]/20 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">
              
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#234E64]/10 to-[#234E64]/10 rounded-2xl mb-4">
                  <Shield className="w-7 h-7 text-[#234E64]" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Connexion sécurisée</h2>
                <p className="text-slate-600">Utilisez vos identifiants pour accéder</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* Champ Matricule */}
                  <FormField
                    control={form.control}
                    name="matricule"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative group">
                            <IdCard className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CBB171] transition-colors duration-300 group-focus-within:text-[#234E64]" />
                            <Input
                              {...field}
                              placeholder="Entrez votre matricule"
                              className={cn(
                                "pl-12 h-14 border-2 border-[#234E64]/30 focus:border-[#234E64] focus:ring-2 focus:ring-[#234E64]/20 transition-all duration-300 text-lg bg-white/70 backdrop-blur-sm",
                                "hover:border-[#CBB171]/50 hover:bg-white/90",
                                form.formState.errors.matricule && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                              )}
                              disabled={isLoading}
                              autoFocus
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Champ Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CBB171] transition-colors duration-300 group-focus-within:text-[#234E64]" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="email@kara.ga"
                              className={cn(
                                "pl-12 h-14 border-2 border-[#234E64]/30 focus:border-[#234E64] focus:ring-2 focus:ring-[#234E64]/20 transition-all duration-300 text-lg bg-white/70 backdrop-blur-sm",
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
                      <FormItem>
                        <FormControl>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#CBB171] transition-colors duration-300 group-focus-within:text-[#234E64]" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className={cn(
                                "pl-12 pr-12 h-14 border-2 border-[#234E64]/30 focus:border-[#234E64] focus:ring-2 focus:ring-[#234E64]/20 transition-all duration-300 text-lg bg-white/70 backdrop-blur-sm",
                                "hover:border-[#CBB171]/50 hover:bg-white/90",
                                form.formState.errors.password && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                              )}
                              disabled={isLoading}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-12 w-12 text-[#234E64] hover:text-[#CBB171] hover:bg-transparent"
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
                    className="w-full h-14 bg-gradient-to-r from-[#234E64] to-[#234E64] hover:from-[#234E64] hover:to-[#234E64] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Connexion en cours...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Se connecter</span>
                      </div>
                    )}
                  </Button>
                </form>
              </Form>

              {/* Message de sécurité */}
              <div className="text-center pt-6 border-t border-[#234E64]/10">
                <div className="inline-flex items-center space-x-2 text-[#234E64]/70 text-sm bg-[#CBB171]/10 px-4 py-2 rounded-lg">
                  <Shield className="w-4 h-4" />
                  <span>Connexion sécurisée et surveillée</span>
                </div>
                <p className="text-xs text-[#234E64]/60 mt-2 leading-relaxed">
                  Vos données sont protégées et chiffrées
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 space-y-4">
            <div className="flex items-center justify-center space-x-2 text-slate-600">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Connexion sécurisée avec identifiants</span>
            </div>

            <p className="text-sm text-slate-500">
              Pas encore membre ?{' '}
              <button 
                onClick={() => router.push(routes.public.register)}
                className="cursor-pointer text-[#234E64] hover:text-[#234E64] font-semibold underline transition-colors duration-300"
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
