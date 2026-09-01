'use client'

import Logo from '@/components/logo/Logo'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useLogin } from '@/domains/auth/hooks/useLogin'
import { ArrowRight, BadgeCheck, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

export default function LoginMembershipWithEmailAndPassword() {
  const { mediator, form, onSubmit, onInvalid } = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const isLoading = form.formState.isSubmitting

  return (
    <div className="min-h-dvh w-full overflow-hidden bg-gradient-to-br from-[#EEF5FA] via-white to-[#F2F7FB] relative">
      {/* Background blobs subtils */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#234D65]/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-4 w-56 h-56 rounded-full bg-[#CBB171]/12 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-10 w-40 h-40 rounded-full bg-[#234D65]/5 blur-2xl pointer-events-none" />

      <div className="relative z-10 min-h-dvh flex items-center justify-center px-5 py-6 lg:px-10 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* CARTE */}
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_-8px_rgba(35,77,101,0.18)] border border-gray-100 overflow-hidden">
            {/* Barre d'accent en haut */}
            <div className="h-[3px] w-full bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#CBB171]" />

            <div className="p-7 sm:p-8">
              {/* Logo */}
              <div className="flex items-center justify-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#234D65] to-[#1a3b4d] shadow-md">
                  <div className="logo-white-filter">
                    <Logo variant="default" size="md" alt="KARA" />
                  </div>
                </div>
              </div>

              {/* Titre */}
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#234D65]/8 px-2.5 py-1 mb-2">
                  <ShieldCheck className="w-3 h-3 text-[#234D65]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#234D65]">
                    Espace administrateur
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-[#234D65] tracking-tight">
                  Bon retour parmi nous
                </h1>
                <p className="text-sm text-gray-500 mt-1.5">
                  Connectez-vous à votre console d&apos;administration.
                </p>
              </div>

              {/* Formulaire */}
              <Form {...mediator.getForm()}>
                <form
                  method="post"
                  onSubmit={mediator.handleSubmit(onSubmit, onInvalid)}
                  className="space-y-3.5"
                  noValidate
                >
                  {/* Matricule */}
                  <FormField
                    control={mediator.getForm().control}
                    name="matricule"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <label
                          htmlFor="login-matricule"
                          className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
                        >
                          Matricule
                        </label>
                        <FormControl>
                          <div className="relative">
                            <BadgeCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <Input
                              {...field}
                              id="login-matricule"
                              placeholder="Ex : 123.MK.160126"
                              autoComplete="username"
                              autoFocus
                              disabled={isLoading}
                              className={cn(
                                'w-full h-11 pl-10 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400',
                                'focus:outline-none focus:bg-white focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/15 transition-all'
                              )}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-500" />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={mediator.getForm().control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <label
                          htmlFor="login-email"
                          className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
                        >
                          Email
                        </label>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <Input
                              {...field}
                              id="login-email"
                              type="email"
                              placeholder="email@kara.ga"
                              autoComplete="email"
                              disabled={isLoading}
                              className={cn(
                                'w-full h-11 pl-10 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400',
                                'focus:outline-none focus:bg-white focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/15 transition-all'
                              )}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-500" />
                      </FormItem>
                    )}
                  />

                  {/* Mot de passe */}
                  <FormField
                    control={mediator.getForm().control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <label
                          htmlFor="login-password"
                          className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
                        >
                          Mot de passe
                        </label>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <Input
                              {...field}
                              id="login-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              disabled={isLoading}
                              className={cn(
                                'w-full h-11 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400',
                                'focus:outline-none focus:bg-white focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/15 transition-all'
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              disabled={isLoading}
                              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-500" />
                      </FormItem>
                    )}
                  />

                  {/* Bouton */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-70 mt-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        Se connecter
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>

          {/* Pastille sécurité sous la carte */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#234D65]/50" />
            <span className="text-[11px]">Connexion sécurisée · Chiffrement SSL</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .logo-white-filter {
          filter: brightness(0) invert(1);
        }
      `}</style>
    </div>
  )
}
