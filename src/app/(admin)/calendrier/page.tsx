"use client"

import { useState, useEffect } from "react"
import { CalendarView } from "@/components/calendrier/CalendarView"
import { CaisseTypeFilters } from "@/components/calendrier/CaisseTypeFilters"
import { useCalendarCaisseSpeciale } from "@/hooks/useCalendarCaisseSpeciale"
import { CalendarViewCI } from "@/components/calendrier/CalendarViewCI"
import { PaymentFrequencyFilters } from "@/components/calendrier/PaymentFrequencyFilters"
import { useCalendarCaisseImprevue } from "@/hooks/useCalendarCaisseImprevue"
import { CalendarViewPlacement } from "@/components/calendrier/CalendarViewPlacement"
import { PayoutModeFilters } from "@/components/calendrier/PayoutModeFilters"
import { useCalendarPlacement } from "@/hooks/useCalendarPlacement"
import type { CaisseType } from "@/services/caisse/types"
import type { CaisseImprevuePaymentFrequency, PayoutMode } from "@/types/types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Calendar, Wallet, PiggyBank, TrendingUp, Sparkles } from "lucide-react"

export default function CalendrierPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState<"caisse-speciale" | "caisse-imprevue" | "placement">("caisse-speciale")
  
  // Filtres Caisse Spéciale - Tous activés par défaut
  const [selectedTypes, setSelectedTypes] = useState<CaisseType[]>([
    "JOURNALIERE",
    "STANDARD",
    "LIBRE",
  ])
  
  // Filtres Caisse Imprévue - Tous activés par défaut
  const [selectedFrequencies, setSelectedFrequencies] = useState<CaisseImprevuePaymentFrequency[]>([
    "DAILY",
    "MONTHLY",
  ])
  
  // Filtres Placement
  const [selectedPayoutModes, setSelectedPayoutModes] = useState<PayoutMode[]>([])

  // Charger les préférences depuis localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem("calendar-active-tab")
    if (savedTab === "caisse-speciale" || savedTab === "caisse-imprevue" || savedTab === "placement") {
      setActiveTab(savedTab)
    }
    
    const savedTypes = localStorage.getItem("calendar-caisse-types")
    if (savedTypes) {
      try {
        const parsed = JSON.parse(savedTypes)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedTypes(parsed)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des préférences:", error)
      }
    }
    
    const savedFrequencies = localStorage.getItem("calendar-ci-frequencies")
    if (savedFrequencies) {
      try {
        const parsed = JSON.parse(savedFrequencies)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedFrequencies(parsed)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des préférences:", error)
      }
    }
    
    const savedPayoutModes = localStorage.getItem("calendar-placement-modes")
    if (savedPayoutModes) {
      try {
        const parsed = JSON.parse(savedPayoutModes)
        if (Array.isArray(parsed)) {
          setSelectedPayoutModes(parsed)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des préférences:", error)
      }
    }
  }, [])

  // Sauvegarder les préférences dans localStorage
  useEffect(() => {
    localStorage.setItem("calendar-active-tab", activeTab)
  }, [activeTab])
  
  useEffect(() => {
    localStorage.setItem("calendar-caisse-types", JSON.stringify(selectedTypes))
  }, [selectedTypes])
  
  useEffect(() => {
    localStorage.setItem("calendar-ci-frequencies", JSON.stringify(selectedFrequencies))
  }, [selectedFrequencies])
  
  useEffect(() => {
    localStorage.setItem("calendar-placement-modes", JSON.stringify(selectedPayoutModes))
  }, [selectedPayoutModes])

  const { data: daysPaymentsCS = [], isLoading: isLoadingCS } = useCalendarCaisseSpeciale(
    currentMonth,
    selectedTypes
  )
  
  const { data: daysPaymentsCI = [], isLoading: isLoadingCI } = useCalendarCaisseImprevue(
    currentMonth,
    selectedFrequencies
  )
  
  const { data: daysCommissionsPlacement = [], isLoading: isLoadingPlacement } = useCalendarPlacement(
    currentMonth,
    selectedPayoutModes
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="container mx-auto p-6 space-y-6">
        {/* En-tête moderne */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#1a3a4d] p-8 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,white)]" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          
          <div className="relative flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                Calendrier des versements
                <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
              </h1>
              <p className="text-white/70 mt-1">
                Gérez et suivez tous vos versements en un coup d'œil
              </p>
            </div>
          </div>

          {/* Légende des couleurs */}
          <div className="relative mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              <span className="text-sm text-white/80">Payé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50" />
              <span className="text-sm text-white/80">À venir</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400 shadow-lg shadow-orange-400/50" />
              <span className="text-sm text-white/80">Imminent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400 shadow-lg shadow-red-400/50" />
              <span className="text-sm text-white/80">En retard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400 shadow-lg shadow-gray-400/50" />
              <span className="text-sm text-white/80">Sans versement</span>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "caisse-speciale" | "caisse-imprevue" | "placement")}>
            {/* Onglets modernisés */}
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white px-6 pt-4">
              <TabsList className="h-14 p-1 bg-gray-100/80 rounded-xl gap-1">
                <TabsTrigger 
                  value="caisse-speciale" 
                  className="h-12 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-[#234D65] transition-all duration-300 flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="font-medium">Caisse Spéciale</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="caisse-imprevue" 
                  className="h-12 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-[#234D65] transition-all duration-300 flex items-center gap-2"
                >
                  <PiggyBank className="h-4 w-4" />
                  <span className="font-medium">Caisse Imprévue</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="placement" 
                  className="h-12 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-[#234D65] transition-all duration-300 flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Placement</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="caisse-speciale" className="space-y-6 mt-0">
                <CaisseTypeFilters
                  selectedTypes={selectedTypes}
                  onTypesChange={setSelectedTypes}
                />
                <CalendarView
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  daysPayments={daysPaymentsCS}
                  isLoading={isLoadingCS}
                />
              </TabsContent>
              
              <TabsContent value="caisse-imprevue" className="space-y-6 mt-0">
                <PaymentFrequencyFilters
                  selectedFrequencies={selectedFrequencies}
                  onFrequenciesChange={setSelectedFrequencies}
                />
                <CalendarViewCI
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  daysPayments={daysPaymentsCI}
                  isLoading={isLoadingCI}
                />
              </TabsContent>
              
              <TabsContent value="placement" className="space-y-6 mt-0">
                <PayoutModeFilters
                  selectedModes={selectedPayoutModes}
                  onModesChange={setSelectedPayoutModes}
                />
                <CalendarViewPlacement
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  daysCommissions={daysCommissionsPlacement}
                  isLoading={isLoadingPlacement}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
