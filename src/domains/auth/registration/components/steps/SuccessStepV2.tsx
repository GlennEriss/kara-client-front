'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Sparkles,
  Heart,
  Phone,
  CreditCard,
  MessageCircle,
  Copy,
  ExternalLink,
  Shield,
  Clock,
  AlertTriangle,
  Home,
  LogIn
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import routes from '@/constantes/routes'

interface SuccessStepV2Props {
  userData?: {
    firstName?: string
    lastName?: string
    civility?: string
  }
}

export default function SuccessStepV2({ userData }: SuccessStepV2Props) {
  const [copiedNumber, setCopiedNumber] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'airtel' | 'mobicash'>('airtel')

  // Numéros depuis les variables d'environnement
  const airtelNumber = process.env.NEXT_PUBLIC_NUMBER_AGENT_AIRTEL || "XX XX XX XX XX"
  const mobicashNumber = process.env.NEXT_PUBLIC_NUMBER_AGENT_MOBICASH || "XX XX XX XX XX"
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_AGENT || "XX XX XX XX XX"

  const currentNumber = selectedProvider === 'airtel' ? airtelNumber : mobicashNumber
  const currentProvider = selectedProvider === 'airtel' ? 'Airtel Money' : 'Mobicash'

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(currentNumber.replace(/\s/g, ''))
      setCopiedNumber(true)
      setTimeout(() => setCopiedNumber(false), 2000)
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
    }
  }

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      `Bonjour, je viens de soumettre ma demande d'inscription à la mutuelle Kara. Je vous envoie la capture d'écran de mon transfert de 10300 FCFA via ${currentProvider} pour finaliser mon inscription.`
    )
    window.open(`https://wa.me/${whatsappNumber.replace(/\s/g, '')}?text=${message}`, '_blank')
  }

  // Formater le message de félicitations
  const getGreetingMessage = () => {
    if (!userData?.firstName || !userData?.lastName) return "Félicitations !"
    
    const civility = userData.civility || ''
    let prefix = ''
    switch (civility) {
      case 'Monsieur': prefix = 'M.'; break
      case 'Madame': prefix = 'Mme'; break
      case 'Mademoiselle': prefix = 'Mlle'; break
    }

    return `Félicitations ${prefix} ${userData.lastName} ${userData.firstName} !`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Animation de succès */}
        <div className="text-center mb-8 animate-in zoom-in-50 duration-500">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-green-200">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[#CBB171] to-[#224D62] rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Message de succès */}
        <div className="text-center mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
            Demande soumise avec succès !
          </h1>
          <p className="text-lg text-[#CBB171] font-medium">{getGreetingMessage()}</p>
        </div>

        {/* Carte de confirmation */}
        <div className="bg-white rounded-2xl shadow-xl border border-green-100 p-6 mb-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-green-500" />
            <p className="text-green-700 font-medium">
              Votre demande à la <strong>Mutuelle Kara</strong> a été enregistrée
            </p>
            <Heart className="w-5 h-5 text-red-400 animate-pulse" />
          </div>

          {/* Instructions de paiement */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Finalisation requise</span>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              Pour activer votre mutuelle, veuillez effectuer le paiement :
            </p>

            {/* Sélecteur de provider */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['airtel', 'mobicash'] as const).map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setSelectedProvider(provider)}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                    selectedProvider === provider
                      ? provider === 'airtel' 
                        ? "border-orange-400 bg-orange-50" 
                        : "border-blue-400 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {provider === 'airtel' ? (
                    <Phone className="w-5 h-5 text-orange-500" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-blue-500" />
                  )}
                  <span className="text-sm font-medium">
                    {provider === 'airtel' ? 'Airtel Money' : 'Mobicash'}
                  </span>
                </button>
              ))}
            </div>

            {/* Détails paiement */}
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-sm text-slate-600">Montant :</span>
                <span className="font-bold text-[#224D62]">10,300 FCFA</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-sm text-slate-600">Numéro :</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{currentNumber}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyNumber}
                    className="h-8 px-2"
                  >
                    {copiedNumber ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <Button
            onClick={handleWhatsAppClick}
            className="w-full bg-green-500 hover:bg-green-600 text-white h-12 text-base"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Envoyer la preuve sur WhatsApp
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Avertissement */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-400">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">Important :</p>
              <ul className="space-y-1 text-xs">
                <li>• Votre inscription sera activée après réception du paiement</li>
                <li>• Conservez le reçu de transaction comme preuve</li>
                <li>• L'activation se fait généralement sous 24h</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-500">
          <Button
            variant="outline"
            onClick={() => window.location.href = routes.public.homepage}
            className="flex-1 h-11"
          >
            <Home className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
          <Button
            onClick={() => window.location.href = routes.public.login}
            className="flex-1 h-11 bg-gradient-to-r from-[#224D62] to-[#CBB171] text-white"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Se connecter
          </Button>
        </div>

        {/* Message de remerciement */}
        <div className="mt-8 text-center animate-in fade-in-0 duration-500 delay-700">
          <div className="inline-flex items-center gap-2 text-slate-500">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-sm">Bienvenue dans la famille <strong>Mutuelle Kara</strong></span>
            <Heart className="w-4 h-4 text-red-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
