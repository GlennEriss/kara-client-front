"use client"
import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CompanyListV2 from './CompanyListV2'
import ProfessionListV2 from './ProfessionListV2'
import ReferencesStatsV2 from './ReferencesStatsV2'
import { Briefcase } from 'lucide-react'
import { useCompaniesPaginated } from '../hooks/useCompanies'
import { useProfessionsPaginated } from '../hooks/useProfessions'

interface ReferencesManagementV2Props {
  defaultTab?: 'companies' | 'professions'
}

/**
 * ReferencesManagementV2 - Gestion des référentiels métiers
 * Design cohérent avec GeographieManagementV2, couleurs KARA
 * 
 * Structure :
 * 1. Header (titre + description + icône)
 * 2. Stats (nombre d'entreprises et métiers)
 * 3. Tabs (Entreprises / Métiers)
 */
export default function ReferencesManagementV2({ defaultTab = 'companies' }: ReferencesManagementV2Props) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  
  // Récupérer les stats via les hooks existants
  const { data: companiesData } = useCompaniesPaginated({}, 1, 1)
  const { data: professionsData } = useProfessionsPaginated({}, 1, 1)
  
  const stats = {
    companiesCount: companiesData?.pagination?.totalItems || 0,
    professionsCount: professionsData?.pagination?.totalItems || 0,
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="references-management-v2">
      {/* Header avec couleurs KARA */}
      <header className="space-y-2" data-testid="references-header">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-kara-primary-dark flex items-center justify-center shrink-0 shadow-sm">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-kara-primary-dark" data-testid="references-title">
              Gestion des Métiers
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1" data-testid="references-description">
              Gérez les entreprises et les professions/métiers de vos membres
            </p>
          </div>
        </div>
      </header>

      {/* Statistiques avec couleurs KARA */}
      <section data-testid="references-stats-section">
        <ReferencesStatsV2 
          stats={stats} 
          onStatClick={(tabValue) => setActiveTab(tabValue as 'companies' | 'professions')}
        />
      </section>

      {/* Tabs avec style KARA */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'companies' | 'professions')} className="w-full" data-testid="references-tabs">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <TabsList 
            className="inline-flex w-full sm:grid sm:grid-cols-2 min-w-max sm:min-w-0 h-auto p-1 bg-kara-primary-dark/5 rounded-lg border border-kara-primary-dark/10"
            role="tablist"
            data-testid="references-tabs-list"
          >
            <TabsTrigger 
              value="companies" 
              className="whitespace-nowrap px-4 sm:px-6 py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:text-kara-primary-dark data-[state=active]:shadow-sm text-kara-primary-dark/70 flex items-center gap-2"
              data-testid="tab-companies"
            >
              <span className="hidden sm:inline">🏢</span>
              Entreprises
            </TabsTrigger>
            <TabsTrigger 
              value="professions"
              className="whitespace-nowrap px-4 sm:px-6 py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:text-kara-primary-dark data-[state=active]:shadow-sm text-kara-primary-dark/70 flex items-center gap-2"
              data-testid="tab-professions"
            >
              <span className="hidden sm:inline">💼</span>
              Métiers / Professions
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="companies" className="mt-4 sm:mt-6" data-testid="tab-content-companies">
          <CompanyListV2 />
        </TabsContent>

        <TabsContent value="professions" className="mt-4 sm:mt-6" data-testid="tab-content-professions">
          <ProfessionListV2 />
        </TabsContent>
      </Tabs>
    </div>
  )
}
