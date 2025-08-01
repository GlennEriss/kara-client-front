'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Smartphone,
  Camera,
  MessageCircle,
  Copy,
  ExternalLink,
  Phone,
  CreditCard,
  Shield,
  Clock,
  AlertTriangle,
  Sparkles,
  Heart,
  LogIn
} from 'lucide-react'
import { cn } from '@/lib/utils'
import routes from '@/constantes/routes'

interface Step5Props {
  userData?: {
    firstName?: string
    lastName?: string
  }
}

export default function Step5({ userData }: Step5Props) {
  const [copiedNumber, setCopiedNumber] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Numéro depuis les variables d'environnement
  const agentNumber = process.env.NEXT_PUBLIC_NUMBER_AGENT_AIRTEL || "XX XX XX XX XX"
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_AGENT || "XX XX XX XX XX"

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(agentNumber.replace(/\s/g, ''))
      setCopiedNumber(true)
      setTimeout(() => setCopiedNumber(false), 2000)
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
    }
  }

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      `Bonjour, je viens de soumettre ma demande d'inscription à la mutuelle Kara. Je vous envoie la capture d'écran de mon transfert de 5000 FCFA pour finaliser mon inscription.`
    )
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\s/g, '')}?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

  const steps = [
    {
      number: 1,
      title: "Transfert d'argent",
      description: "Envoyez 5000 FCFA via Airtel Money",
      icon: CreditCard,
      action: "Faire le transfert"
    },
    {
      number: 2,
      title: "Capture d'écran",
      description: "Prenez une photo du reçu de transaction",
      icon: Camera,
      action: "Prendre une photo"
    },
    {
      number: 3,
      title: "Envoi WhatsApp",
      description: "Envoyez la capture sur WhatsApp",
      icon: MessageCircle,
      action: "Envoyer sur WhatsApp"
    }
  ]

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-4xl mx-auto overflow-x-hidden">
      {/* Header avec animation de succès */}
      <div className="text-center space-y-4 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-700 delay-200">
            <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14 text-white animate-pulse" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-[#CBB171] to-[#224D62] rounded-full flex items-center justify-center animate-bounce delay-500">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#224D62] animate-in slide-in-from-bottom-4 duration-700 delay-300">
            Demande soumise avec succès !
          </h1>
          <p className="text-base sm:text-lg text-[#CBB171] font-medium animate-in slide-in-from-bottom-4 duration-700 delay-400">
            {userData?.firstName && userData?.lastName
              ? `Félicitations ${userData.firstName} ${userData.lastName} !`
              : "Félicitations !"
            }
          </p>
        </div>

        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 animate-in fade-in-0 zoom-in-95 duration-700 delay-500">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-center space-x-3">
              <Shield className="w-6 h-6 text-green-600" />
              <p className="text-sm sm:text-base text-green-800 font-medium">
                Votre demande d'inscription à la <strong>Mutuelle Kara</strong> a été enregistrée
              </p>
              <Heart className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions principales */}
      <Card className="border-2 border-[#224D62]/20 bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-600 shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-[#224D62]/10 rounded-full">
              <Clock className="w-5 h-5 text-[#224D62]" />
              <span className="text-[#224D62] font-semibold text-sm sm:text-base">Finalisation requise</span>
            </div>
            <p className="text-[#224D62] text-lg sm:text-xl font-bold">
              Pour activer votre mutuelle, veuillez suivre ces 3 étapes simples :
            </p>
          </div>

          {/* Étapes */}
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  "relative p-4 sm:p-6 rounded-xl border-2 transition-all duration-500 animate-in slide-in-from-left-4",
                  currentStep === step.number
                    ? "border-[#224D62] bg-[#224D62]/5 shadow-md"
                    : currentStep > step.number
                      ? "border-green-300 bg-green-50/50"
                      : "border-gray-200 bg-gray-50/50"
                )}
                style={{ animationDelay: `${700 + index * 200}ms` }}
              >
                <div className="flex items-start space-x-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300",
                    currentStep === step.number
                      ? "bg-[#224D62] text-white"
                      : currentStep > step.number
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  )}>
                    {currentStep > step.number ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-[#224D62]">{step.title}</h3>
                        <p className="text-gray-600">{step.description}</p>
                      </div>

                      {step.number === 1 && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyNumber}
                            className="border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171]/10"
                          >
                            {copiedNumber ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Copié !
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-2" />
                                Copier le numéro
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {step.number === 3 && (
                        <Button
                          onClick={handleWhatsAppClick}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Ouvrir WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Détails du transfert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Informations de transfert */}
        <Card className="border border-[#CBB171]/30 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-1000">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-[#CBB171]" />
                <h3 className="font-bold text-[#224D62]">Transfert Airtel Money</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-[#CBB171]/10 rounded-lg">
                  <span className="text-sm font-medium text-[#224D62]">Montant :</span>
                  <Badge className="bg-[#224D62] text-white text-base px-3 py-1">
                    5,000 FCFA
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 bg-[#CBB171]/10 rounded-lg">
                  <span className="text-sm font-medium text-[#224D62]">Numéro :</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[#224D62] font-bold">{agentNumber}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyNumber}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-[#CBB171]/10 rounded-lg">
                  <span className="text-sm font-medium text-[#224D62]">Opérateur :</span>
                  <Badge variant="outline" className="border-orange-400 text-orange-600">
                    <Phone className="w-4 h-4 mr-1" />
                    Airtel Money
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions WhatsApp */}
        <Card className="border border-green-300 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-1200">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-[#224D62]">WhatsApp Agent</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-[#224D62]">Numéro WhatsApp :</span>
                  <span className="font-mono text-green-600 font-bold">{whatsappNumber}</span>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700 italic">
                    "Bonjour, je viens de soumettre ma demande d'inscription à la mutuelle Kara.
                    Je vous envoie la capture d'écran de mon transfert de 5000 FCFA pour finaliser mon inscription."
                  </p>
                </div>

                <Button
                  onClick={handleWhatsAppClick}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Envoyer message WhatsApp
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avertissement important */}
      <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-1400">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-1 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-bold text-amber-800">Important à retenir</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Votre inscription ne sera <strong>activée qu'après réception</strong> du transfert et de la capture d'écran</li>
                <li>• Conservez precieusement le <strong>reçu de transaction</strong> comme preuve de paiement</li>
                <li>• L'activation se fait généralement sous <strong>24h ouvrables</strong></li>
                <li>• En cas de problème, contactez notre agent via WhatsApp</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message de remerciement */}
      <div className="text-center p-6 sm:p-8 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-xl animate-in fade-in-0 zoom-in-95 duration-700 delay-1600">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <Heart className="w-6 h-6 text-red-500" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#224D62]">Merci de votre confiance !</h2>
          <Heart className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-[#224D62]/80 text-sm sm:text-base">
          Bienvenue dans la famille <strong>Mutuelle Kara</strong>.
          Nous sommes ravis de vous accompagner dans votre protection santé.
        </p>
        <div className="text-center my-8">
          <Button
            onClick={() => window.location.href = routes.public.login}
            className="bg-gradient-to-r from-[#224D62] to-[#CBB171] hover:from-[#224D62]/90 hover:to-[#CBB171]/90 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3 text-base"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Se connecter à mon espace
          </Button>
        </div>
      </div>
    </div>
  )
}