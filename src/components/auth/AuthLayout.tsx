'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import routes from '@/constantes/routes'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
  headerIcon: React.ReactNode
  headerTitle: string
  showBackButton?: boolean
  footerText?: string
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  headerIcon,
  headerTitle,
  showBackButton = true,
  footerText = "© 2025 KARA - Mutuelle de Solidarité"
}: AuthLayoutProps) {
  const router = useRouter()

  const handleBackToHome = () => {
    router.push(routes.public.homepage)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Décorations de fond - style KARA */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#224D62]/10 to-transparent rounded-full opacity-30 transform translate-x-48 -translate-y-48 floating"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#CBB171]/10 to-transparent rounded-full opacity-30 transform -translate-x-48 translate-y-48 floating" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-[#224D62]/10 to-[#CBB171]/10 rounded-full opacity-20 transform -translate-x-32 -translate-y-32 floating" style={{ animationDelay: '4s' }}></div>
        
        {/* Particules flottantes */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-[#CBB171]/20 rounded-full floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-[#224D62]/20 rounded-full floating" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-[#CBB171]/30 rounded-full floating" style={{ animationDelay: '5s' }}></div>
      </div>

      {/* Bouton retour */}
      {showBackButton && (
        <Button
          variant="ghost"
          onClick={handleBackToHome}
          className="absolute top-4 left-4 md:top-6 md:left-6 text-[#224D62] hover:text-[#CBB171] hover:bg-[#224D62]/5 z-10 text-sm md:text-base transition-all duration-300 hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
          Retour
        </Button>
      )}

      {/* Container principal */}
      <div className="w-full max-w-md relative z-10 pt-16 md:pt-0">
        {/* En-tête avec logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="mb-4">
            <Logo 
              size="lg" 
              className="mx-auto transition-transform hover:scale-105" 
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gradient mb-2">
            {title}
          </h1>
          <p className="text-[#224D62]/70 text-sm md:text-base">
            {subtitle}
          </p>
        </div>

        {/* Carte de connexion */}
        <Card className="p-0 shadow-2xl border-0 bg-white/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="m-0 space-y-1 bg-gradient-to-r from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 border-b border-[#224D62]/20 rounded-t-lg">
            <CardTitle className="text-center flex items-center justify-center space-x-2 text-[#224D62]">
              {headerIcon}
              <span>{headerTitle}</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {children}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-sm text-[#224D62]/70">
            {footerText}
          </p>
          <p className="text-xs text-[#224D62]/50 mt-1">
            Ensemble, construisons l'avenir
          </p>
        </div>
      </div>

      {/* Styles pour les animations personnalisées */}
      <style jsx>{`
        @keyframes floating {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(1deg);
          }
          66% {
            transform: translateY(5px) rotate(-1deg);
          }
        }
        
        .floating {
          animation: floating 6s ease-in-out infinite;
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
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        
        .text-gradient {
          background: linear-gradient(45deg, #224D62, #CBB171);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  )
}