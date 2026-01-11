'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Eye, EyeOff, Mail, Lock, Shield, Loader2, IdCard, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import routes from '@/constantes/routes'
import Link from 'next/link'
import { useLogin } from '@/domains/auth/hooks/useLogin'
import { useRouter } from 'next/navigation'

export default function LoginMembershipWithEmailAndPassword() {
  const {
    mediator,
    form,
    onSubmit,
    onInvalid
  } = useLogin()
  const router = useRouter()  
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen flex">
      {/* Mobile View - Formulaire centré avec design premium */}
      <div className="lg:hidden min-h-screen relative overflow-hidden w-full">
        {/* Background Image Mobile - Subtle */}
        <div className="absolute inset-0">
          <img
            src="/imgkara.webp"
            alt="KARA Background"
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-[#234E64]/5 to-[#234E64]/15"></div>
        </div>
        
        {/* Background Effects Mobile */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#CBB171]/15 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#234E64]/15 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-[#CBB171]/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="absolute inset-0 bg-grid-slate-100/[0.02] bg-[size:75px_75px]" />

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            {/* Header Mobile - Style amélioré */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-xl mb-6 bg-gradient-to-br from-[#234E64] to-[#1a3b4d] border border-white/20 hover:scale-110 transition-transform duration-500 overflow-hidden">
                <div className="logo-white-filter">
                  <Logo variant="default" size="lg" alt="KARA" />
                </div>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#234E64] via-[#234E64] to-[#CBB171] bg-clip-text text-transparent mb-2">
                Bienvenue sur KARA
              </h1>
              <p className="text-slate-600 text-lg font-light">
                Connectez-vous à votre espace membre
              </p>
            </div>

            {/* Main Card Mobile - Design premium avec glow doré */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#234E64]/30 via-[#CBB171]/40 to-[#234E64]/30 rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition duration-500" />
              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">

                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#234E64]/10 to-[#234E64]/10 rounded-2xl mb-4">
                    <Shield className="w-7 h-7 text-[#234E64]" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Connexion sécurisée</h2>
                  <p className="text-slate-600">Utilisez vos identifiants pour accéder</p>
                </div>

                <Form {...mediator.getForm()}>
                  <form method="post" onSubmit={mediator.handleSubmit(onSubmit, onInvalid)} className="space-y-6">

                    {/* Champ Matricule */}
                    <FormField
                      control={mediator.getForm().control}
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
                                  mediator.getForm().formState.errors.matricule && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                                )}
                                disabled={form.formState.isSubmitting}
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
                      control={mediator.getForm().control}
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
                                  mediator.getForm().formState.errors.email && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                                )}
                                disabled={form.formState.isSubmitting}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Champ Mot de passe */}
                    <FormField
                      control={mediator.getForm().control}
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
                                  mediator.getForm().formState.errors.password && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                                )}
                                disabled={form.formState.isSubmitting}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-12 w-12 text-[#234E64] hover:text-[#CBB171] hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={form.formState.isSubmitting}
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

                    {/* Bouton de connexion - Style identique au desktop */}
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="w-full h-14 bg-gradient-to-r from-[#234E64] via-[#234E64] to-[#CBB171] hover:from-[#CBB171] hover:via-[#234E64] hover:to-[#234E64] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 group"
                    >
                      {form.formState.isSubmitting ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Connexion en cours...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2 group-hover:scale-105 transition-transform duration-300">
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

            {/* Footer Mobile - Badges de confiance */}
            <div className="text-center mt-8 space-y-5">
              {/* Trust Badges */}
              <div className="flex items-center justify-center space-x-4 text-slate-600">
                <div className="flex items-center space-x-1.5 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                  <Shield className="w-4 h-4 text-[#CBB171]" />
                  <span className="text-xs font-medium">Sécurisé</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#CBB171]" />
                  <span className="text-xs font-medium">Fiable</span>
                </div>
                <div className="flex items-center space-x-1.5 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                  <Lock className="w-4 h-4 text-[#CBB171]" />
                  <span className="text-xs font-medium">Protégé</span>
                </div>
              </div>

              <p className="text-sm text-slate-500">
                Pas encore membre ?{' '}
                <button
                  onClick={() => router.push(routes.public.register)}
                  disabled={form.formState.isSubmitting}
                  className="cursor-pointer text-[#234E64] hover:text-[#CBB171] font-semibold underline transition-all duration-300"
                >
                  Rejoignez KARA
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View - Two Panel Layout */}
      <div className="hidden lg:flex w-full">
        {/* Left Panel - Formulaire */}
        <div className="w-1/2 bg-gradient-to-br from-white via-slate-50/50 to-[#234E64]/5 flex items-center justify-center p-6 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-16 left-16 w-24 h-24 bg-[#CBB171]/10 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-16 right-16 w-20 h-20 bg-[#234E64]/10 rounded-full blur-xl animate-pulse animation-delay-2000"></div>

          <div className="w-full max-w-sm relative z-10 animate-fade-in-left">
            {/* Header Desktop */}
            <div className="text-center mb-6">
              <div className="lg:hidden inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-6 bg-gradient-to-br from-white to-slate-50 group hover:scale-110 transition-transform duration-500 overflow-hidden border border-[#234E64]/10">
                <Logo variant="with-bg" size="md" alt="KARA" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#234E64] via-[#234E64] to-[#CBB171] bg-clip-text text-transparent mb-3 leading-tight">
                Bienvenue sur KARA
              </h1>
              <p className="text-slate-600 text-lg font-light leading-relaxed">
                Connectez-vous à votre espace membre
              </p>
            </div>

            {/* Form Container Desktop */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#234E64]/20 via-[#CBB171]/20 to-[#234E64]/20 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">

                <Form {...mediator.getForm()}>
                  <form method="post" onSubmit={mediator.handleSubmit(onSubmit, onInvalid)} className="space-y-5">

                    {/* Champ Matricule Desktop */}
                    <FormField
                      control={mediator.getForm().control}
                      name="matricule"
                      render={({ field }) => (
                        <FormItem className="animate-fade-in-up animation-delay-200">
                          <FormControl>
                            <div className="relative group">
                              <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] transition-all duration-300 group-focus-within:text-[#234E64] group-focus-within:scale-110" />
                              <Input
                                {...field}
                                placeholder="Entrez votre matricule"
                                className={cn(
                                  "pl-10 h-12 border-2 border-[#234E64]/20 focus:border-[#234E64] focus:ring-2 focus:ring-[#234E64]/10 transition-all duration-500 text-base bg-white/80 backdrop-blur-sm rounded-lg",
                                  "hover:border-[#CBB171]/60 hover:bg-white/95 hover:shadow-md hover:-translate-y-0.5",
                                  "focus:scale-102 focus:shadow-lg",
                                  mediator.getForm().formState.errors.matricule && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                                )}
                                disabled={form.formState.isSubmitting}
                                autoFocus
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Champ Email Desktop */}
                    <FormField
                      control={mediator.getForm().control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="animate-fade-in-up animation-delay-400">
                          <FormControl>
                            <div className="relative group">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] transition-all duration-300 group-focus-within:text-[#234E64] group-focus-within:scale-110" />
                              <Input
                                {...field}
                                type="email"
                                placeholder="email@kara.ga"
                                className={cn(
                                  "pl-10 h-12 border-2 border-[#234E64]/20 focus:border-[#234E64] focus:ring-2 focus:ring-[#234E64]/10 transition-all duration-500 text-base bg-white/80 backdrop-blur-sm rounded-lg",
                                  "hover:border-[#CBB171]/60 hover:bg-white/95 hover:shadow-md hover:-translate-y-0.5",
                                  "focus:scale-102 focus:shadow-lg",
                                  mediator.getForm().formState.errors.email && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                                )}
                                disabled={form.formState.isSubmitting}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Champ Mot de passe Desktop */}
                    <FormField
                      control={mediator.getForm().control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="animate-fade-in-up animation-delay-600">
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] transition-all duration-300 group-focus-within:text-[#234E64] group-focus-within:scale-110" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className={cn(
                                  "pl-10 pr-12 h-12 border-2 border-[#234E64]/20 focus:border-[#234E64] focus:ring-2 focus:ring-[#234E64]/10 transition-all duration-500 text-base bg-white/80 backdrop-blur-sm rounded-lg",
                                  "hover:border-[#CBB171]/60 hover:bg-white/95 hover:shadow-md hover:-translate-y-0.5",
                                  "focus:scale-102 focus:shadow-lg",
                                  mediator.getForm().formState.errors.password && "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/50"
                                )}
                                disabled={form.formState.isSubmitting}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 text-[#234E64] hover:text-[#CBB171] hover:bg-[#234E64]/5 hover:scale-110 transition-all duration-300 rounded-md"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={form.formState.isSubmitting}
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

                    {/* Bouton de connexion Desktop */}
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-[#234E64] via-[#234E64] to-[#CBB171] hover:from-[#CBB171] hover:via-[#234E64] hover:to-[#234E64] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-500 group animate-fade-in-up animation-delay-800 hover:scale-102"
                    >
                      {form.formState.isSubmitting ? (
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-base">Connexion en cours...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2 group-hover:scale-105 transition-transform duration-300">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-base">Se connecter</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Footer Desktop */}
                <div className="text-center pt-5 border-t border-[#234E64]/10 mt-5">
                  <div className="inline-flex items-center space-x-2 text-[#234E64]/70 text-xs bg-[#CBB171]/10 px-3 py-1.5 rounded-full mb-3">
                    <Shield className="w-3 h-3" />
                    <span>Connexion sécurisée SSL</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pas encore membre ?{' '}
                    <button
                      onClick={() => router.push(routes.public.register)}
                      className="cursor-pointer text-[#234E64] hover:text-[#CBB171] font-semibold underline transition-all duration-300 hover:scale-105 inline-block"
                    >
                      Rejoignez KARA
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Image & Welcome Text */}
        <div className="w-1/2 relative overflow-hidden bg-gradient-to-br from-[#234E64] via-[#234E64] to-[#1a3b4d]">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src="/imgkara.webp"
              alt="KARA - Mutuelle de Solidarité"
              className="w-full h-full object-cover opacity-30 animate-fade-in-right"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#234E64]/80 via-[#234E64]/60 to-[#1a3b4d]/80"></div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-16 right-16 w-32 h-32 bg-[#CBB171]/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-24 left-12 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse animation-delay-4000"></div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col justify-center items-center p-8 text-center">
            <div className="animate-fade-in-up animation-delay-1000">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-6 border border-white/20">
                  <Link href={routes.public.homepage}>
                    <div className="logo-white-filter">
                      <Logo variant="default" size="lg" alt="KARA" />
                    </div>
                  </Link>
                </div>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                Bienvenue dans votre
                <span className="block text-[#CBB171] mt-1">espace KARA</span>
              </h2>

              <p className="text-lg text-white/90 leading-relaxed max-w-md mb-6 font-light">
                Une famille élargie et inclusive, un réseau de cœurs ouverts qui refusent l'indifférence et choisissent la main tendue.
              </p>

              <div className="flex items-center justify-center space-x-6 text-white/80">
                <div className="flex items-center space-x-1.5">
                  <Shield className="w-4 h-4 text-[#CBB171]" />
                  <span className="text-xs">Sécurisé</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#CBB171]" />
                  <span className="text-xs">Fiable</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Lock className="w-4 h-4 text-[#CBB171]" />
                  <span className="text-xs">Protégé</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1a3b4d] to-transparent"></div>
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

        @keyframes fade-in-left {
          0% {
            opacity: 0;
            transform: translateX(-50px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-in-right {
          0% {
            opacity: 0;
            transform: translateX(50px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-fade-in-left {
          animation: fade-in-left 1s ease-out;
          animation-fill-mode: both;
        }
        
        .animate-fade-in-right {
          animation: fade-in-right 1.2s ease-out;
          animation-fill-mode: both;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
          animation-fill-mode: both;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        
        .animation-delay-600 {
          animation-delay: 0.6s;
        }
        
        .animation-delay-800 {
          animation-delay: 0.8s;
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .focus\\:scale-102:focus {
          transform: scale(1.02);
        }
        
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
        
        .logo-white-filter {
          filter: brightness(0) invert(1);
        }
        
        .bg-grid-slate-100\\/\\[0\\.02\\] {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(148 163 184 / 0.05)'%3e%3cpath d='m0 .5h32m-32 32v-32'/%3e%3c/svg%3e");
        }
      `}</style>
    </div>
  )
}
