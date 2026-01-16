"use client"
import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProvinceListV2 from './ProvinceListV2'
import DepartmentListV2 from './DepartmentListV2'
import CommuneListV2 from './CommuneListV2'
import DistrictListV2 from './DistrictListV2'
import QuarterListV2 from './QuarterListV2'
import { MapPin } from 'lucide-react'
import { useGeographyStats } from '../../hooks/useGeographie'
import GeographyStatsV2 from './GeographyStatsV2'

/**
 * GeographieManagementV2 - Version 2 avec couleurs KARA
 * Voir documentation/DESIGN_SYSTEM_COULEURS_KARA.md
 * 
 * Améliorations V2 :
 * - Design avec couleurs KARA (kara-primary-dark, kara-primary-light)
 * - Sélecteurs stables avec data-testid pour les tests E2E
 * - Tabs avec attributs ARIA améliorés
 */
export default function GeographieManagementV2() {
  const [activeTab, setActiveTab] = useState('provinces')
  const stats = useGeographyStats()

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="geographie-management-v2">
      {/* Header avec couleurs KARA */}
      <header className="space-y-2" data-testid="geographie-header">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-kara-primary-dark flex items-center justify-center shrink-0 shadow-sm">
            <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-kara-primary-dark" data-testid="geographie-title">
              Gestion Géographique
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1" data-testid="geographie-description">
              Gérez les provinces, départements, communes, arrondissements et quartiers
            </p>
          </div>
        </div>
      </header>

      {/* Statistiques avec couleurs KARA */}
      <section data-testid="geographie-stats-section">
        <GeographyStatsV2 
          stats={stats} 
          onStatClick={(tabValue) => setActiveTab(tabValue)}
        />
      </section>

      {/* Tabs avec style KARA */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-testid="geographie-tabs">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <TabsList 
            className="inline-flex w-full sm:grid sm:grid-cols-5 min-w-max sm:min-w-0 h-auto p-1 bg-kara-primary-dark/5 rounded-lg border border-kara-primary-dark/10"
            role="tablist"
            data-testid="geographie-tabs-list"
          >
            <TabsTrigger 
              value="provinces" 
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-kara-primary-dark data-[state=active]:shadow-sm text-kara-primary-dark/70"
              data-testid="tab-provinces"
            >
              Provinces
            </TabsTrigger>
            <TabsTrigger 
              value="departments"
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-kara-primary-dark data-[state=active]:shadow-sm text-kara-primary-dark/70"
              data-testid="tab-departments"
            >
              Départements
            </TabsTrigger>
            <TabsTrigger 
              value="communes"
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-kara-primary-dark data-[state=active]:shadow-sm text-kara-primary-dark/70"
              data-testid="tab-communes"
            >
              Communes
            </TabsTrigger>
            <TabsTrigger 
              value="districts"
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-kara-primary-dark data-[state=active]:shadow-sm text-kara-primary-dark/70"
              data-testid="tab-districts"
            >
              Arrondissements
            </TabsTrigger>
            <TabsTrigger 
              value="quarters"
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-kara-primary-dark data-[state=active]:shadow-sm text-kara-primary-dark/70"
              data-testid="tab-quarters"
            >
              Quartiers
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="provinces" className="mt-4 sm:mt-6" data-testid="tab-content-provinces">
          <ProvinceListV2 />
        </TabsContent>

        <TabsContent value="departments" className="mt-4 sm:mt-6" data-testid="tab-content-departments">
          <DepartmentListV2 />
        </TabsContent>

        <TabsContent value="communes" className="mt-4 sm:mt-6" data-testid="tab-content-communes">
          <CommuneListV2 />
        </TabsContent>

        <TabsContent value="districts" className="mt-4 sm:mt-6" data-testid="tab-content-districts">
          <DistrictListV2 />
        </TabsContent>

        <TabsContent value="quarters" className="mt-4 sm:mt-6" data-testid="tab-content-quarters">
          <QuarterListV2 />
        </TabsContent>
      </Tabs>
    </div>
  )
}
