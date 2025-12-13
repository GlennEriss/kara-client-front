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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Calendar } from "lucide-react"

export default function CalendrierPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [activeTab, setActiveTab] = useState<"caisse-speciale" | "caisse-imprevue" | "placement">("caisse-speciale")
  
  // Filtres Caisse Spéciale
  const [selectedTypes, setSelectedTypes] = useState<CaisseType[]>([
    "JOURNALIERE",
  ])
  
  // Filtres Caisse Imprévue
  const [selectedFrequencies, setSelectedFrequencies] = useState<CaisseImprevuePaymentFrequency[]>([
    "DAILY",
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
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendrier des versements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "caisse-speciale" | "caisse-imprevue" | "placement")}>
            <TabsList>
              <TabsTrigger value="caisse-speciale">Caisse Spéciale</TabsTrigger>
              <TabsTrigger value="caisse-imprevue">Caisse Imprévue</TabsTrigger>
              <TabsTrigger value="placement">Placement</TabsTrigger>
            </TabsList>
            
            <TabsContent value="caisse-speciale" className="space-y-6 mt-6">
              {/* Filtres Caisse Spéciale */}
              <CaisseTypeFilters
                selectedTypes={selectedTypes}
                onTypesChange={setSelectedTypes}
              />

              {/* Calendrier Caisse Spéciale */}
              <CalendarView
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                daysPayments={daysPaymentsCS}
                isLoading={isLoadingCS}
              />
            </TabsContent>
            
            <TabsContent value="caisse-imprevue" className="space-y-6 mt-6">
              {/* Filtres Caisse Imprévue */}
              <PaymentFrequencyFilters
                selectedFrequencies={selectedFrequencies}
                onFrequenciesChange={setSelectedFrequencies}
              />

              {/* Calendrier Caisse Imprévue */}
              <CalendarViewCI
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                daysPayments={daysPaymentsCI}
                isLoading={isLoadingCI}
              />
            </TabsContent>
            
            <TabsContent value="placement" className="space-y-6 mt-6">
              {/* Filtres Placement */}
              <PayoutModeFilters
                selectedModes={selectedPayoutModes}
                onModesChange={setSelectedPayoutModes}
              />

              {/* Calendrier Placement */}
              <CalendarViewPlacement
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                daysCommissions={daysCommissionsPlacement}
                isLoading={isLoadingPlacement}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
