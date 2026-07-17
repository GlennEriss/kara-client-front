"use client"

import { CaisseTypeFilters } from "@/components/calendrier/CaisseTypeFilters"
import { CalendarView } from "@/components/calendrier/CalendarView"
import { CalendarViewCI } from "@/components/calendrier/CalendarViewCI"
import { CalendarViewCreditSpeciale } from "@/components/calendrier/CalendarViewCreditSpeciale"
import { CalendarViewPlacement } from "@/components/calendrier/CalendarViewPlacement"
import { OverdueCaissePaymentsList } from "@/components/calendrier/OverdueCaissePaymentsList"
import { UpcomingPayoutsList } from "@/components/calendrier/UpcomingPayoutsList"
import { PaymentFrequencyFilters } from "@/components/calendrier/PaymentFrequencyFilters"
import { PayoutModeFilters } from "@/components/calendrier/PayoutModeFilters"
import { PageHero } from "@/components/ui/page-hero"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCalendarCaisseImprevue } from "@/hooks/useCalendarCaisseImprevue"
import { useCalendarCaisseSpeciale } from "@/hooks/useCalendarCaisseSpeciale"
import { useCalendarCreditSpeciale } from "@/hooks/useCalendarCreditSpeciale"
import { useCalendarPlacement } from "@/hooks/useCalendarPlacement"
import type { CaisseType } from "@/services/caisse/types"
import type { CaisseImprevuePaymentFrequency, PayoutMode } from "@/types/types"
import { Banknote, Calendar, PiggyBank, TrendingUp, Wallet } from "lucide-react"
import { useEffect, useState } from "react"

export default function CalendrierPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState<
    | "caisse-speciale"
    | "caisse-imprevue"
    | "credit-speciale"
    | "credit-fixe"
    | "caisse-aide"
    | "placement"
  >("caisse-speciale")
  
  // Filtres Caisse Spéciale - Tous activés par défaut
  const [selectedTypes, setSelectedTypes] = useState<CaisseType[]>([
    "JOURNALIERE",
    "STANDARD",
    "LIBRE",
    "STANDARD_CHARITABLE",
    "JOURNALIERE_CHARITABLE",
    "LIBRE_CHARITABLE",
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
    if (
      savedTab === "caisse-speciale" ||
      savedTab === "caisse-imprevue" ||
      savedTab === "credit-speciale" ||
      savedTab === "credit-fixe" ||
      savedTab === "caisse-aide" ||
      savedTab === "placement"
    ) {
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

  // Ne charger que l'onglet actif (évite 6 requêtes lourdes simultanées)
  const { data: daysPaymentsCS = [], isLoading: isLoadingCS } = useCalendarCaisseSpeciale(
    currentMonth,
    selectedTypes,
    activeTab === "caisse-speciale"
  )

  const { data: daysPaymentsCI = [], isLoading: isLoadingCI } = useCalendarCaisseImprevue(
    currentMonth,
    selectedFrequencies,
    activeTab === "caisse-imprevue"
  )

  const { data: daysCommissionsPlacement = [], isLoading: isLoadingPlacement } = useCalendarPlacement(
    currentMonth,
    selectedPayoutModes,
    activeTab === "placement"
  )
  const { data: daysPaymentsCreditSpeciale = [], isLoading: isLoadingCreditSpeciale } =
    useCalendarCreditSpeciale(currentMonth, "SPECIALE", activeTab === "credit-speciale")
  const { data: daysPaymentsCreditFixe = [], isLoading: isLoadingCreditFixe } =
    useCalendarCreditSpeciale(currentMonth, "FIXE", activeTab === "credit-fixe")
  const { data: daysPaymentsCreditAide = [], isLoading: isLoadingCreditAide } =
    useCalendarCreditSpeciale(currentMonth, "AIDE", activeTab === "caisse-aide")

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <PageHero
        icon={Calendar}
        title="Calendrier des versements"
        subtitle="Gérez et suivez tous vos versements en un coup d'œil"
      />

      {/* Légende des couleurs */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-sm text-gray-700">Payé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-sm text-gray-700">À venir</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-400" />
          <span className="text-sm text-gray-700">Imminent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-sm text-gray-700">En retard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-sm text-gray-700">Sans versement</span>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(
                value as
                  | "caisse-speciale"
                  | "caisse-imprevue"
                  | "credit-speciale"
                  | "credit-fixe"
                  | "caisse-aide"
                  | "placement"
              )
            }
          >
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
                <TabsTrigger
                  value="credit-speciale"
                  className="h-12 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-[#234D65] transition-all duration-300 flex items-center gap-2"
                >
                  <Banknote className="h-4 w-4" />
                  <span className="font-medium">Crédit Spéciale</span>
                </TabsTrigger>
                <TabsTrigger
                  value="credit-fixe"
                  className="h-12 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-[#234D65] transition-all duration-300 flex items-center gap-2"
                >
                  <Banknote className="h-4 w-4" />
                  <span className="font-medium">Crédit Fixe</span>
                </TabsTrigger>
                <TabsTrigger
                  value="caisse-aide"
                  className="h-12 px-6 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-[#234D65] transition-all duration-300 flex items-center gap-2"
                >
                  <Banknote className="h-4 w-4" />
                  <span className="font-medium">Caisse Aide</span>
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
                <OverdueCaissePaymentsList product="Caisse Spéciale" />
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
                <OverdueCaissePaymentsList product="Caisse Imprévue" />
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
                <OverdueCaissePaymentsList product="Placement" />
              </TabsContent>

              <TabsContent value="credit-speciale" className="space-y-6 mt-0">
                <CalendarViewCreditSpeciale
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  daysPayments={daysPaymentsCreditSpeciale}
                  isLoading={isLoadingCreditSpeciale}
                />
                <OverdueCaissePaymentsList product="Crédit Spéciale" />
              </TabsContent>

              <TabsContent value="credit-fixe" className="space-y-6 mt-0">
                <CalendarViewCreditSpeciale
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  daysPayments={daysPaymentsCreditFixe}
                  isLoading={isLoadingCreditFixe}
                />
                <OverdueCaissePaymentsList product="Crédit Fixe" />
              </TabsContent>

              <TabsContent value="caisse-aide" className="space-y-6 mt-0">
                <CalendarViewCreditSpeciale
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  daysPayments={daysPaymentsCreditAide}
                  isLoading={isLoadingCreditAide}
                />
                <OverdueCaissePaymentsList product="Crédit Aide" />
              </TabsContent>
            </div>
        </Tabs>
      </div>

      {/* Remises d'argent à venir (CS + CI + Placement) : dues 30 jours après le
          dernier versement (contrat cotisé), la fin du placement, ou la demande
          de retrait anticipé. */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <UpcomingPayoutsList />
      </div>
    </div>
  )
}
