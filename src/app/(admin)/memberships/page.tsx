'use client'

import MemberVehicleList from '@/components/memberships/MemberVehicleList'
import { PageHero } from '@/components/ui/page-hero'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BirthdaysPage } from '@/domains/memberships/components/birthdays/BirthdaysPage'
import { MembershipsListPage } from '@/domains/memberships/components/page/MembershipsListPage'
import { Cake, Car, Users } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useListUrlSync } from '@/hooks/useListUrlSync'

// useSearchParams impose une frontière Suspense au build (même pattern que les demandes).
export default function MembershipsPage() {
  return (
    <Suspense fallback={null}>
      <MembershipsPageInner />
    </Suspense>
  )
}

function MembershipsPageInner() {
  const searchParams = useSearchParams()
  // `section` (et non `tab`) : `tab` est réservé aux onglets internes de la liste des membres.
  const [activeTab, setActiveTab] = useState(searchParams.get('section') || 'list')
  useListUrlSync({ section: activeTab !== 'list' ? activeTab : null })

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <PageHero
        icon={Users}
        title="Gestion des Membres"
        subtitle="Gérez les membres adhérents, bienfaiteurs et sympathisants de KARA"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative -mx-4 px-4">
          <div className="overflow-x-auto no-scrollbar">
            <TabsList className="flex min-w-max gap-2 md:grid md:w-full md:max-w-2xl md:grid-cols-3">
              <TabsTrigger value="list" className="flex items-center gap-2 shrink-0 md:shrink">
                <Users className="h-4 w-4" />
                <span className="whitespace-nowrap">Liste des membres</span>
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="flex items-center gap-2 shrink-0 md:shrink">
                <Car className="h-4 w-4" />
                <span className="whitespace-nowrap">Véhicules des membres</span>
              </TabsTrigger>
              <TabsTrigger value="birthdays" className="flex items-center gap-2 shrink-0 md:shrink">
                <Cake className="h-4 w-4" />
                <span className="whitespace-nowrap">Anniversaires</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <span className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r from-white to-transparent md:hidden" />
          <span className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-white to-transparent md:hidden" />
        </div>

        <TabsContent value="list" className="mt-6">
          <MembershipsListPage />
        </TabsContent>

        <TabsContent value="vehicles" className="mt-6">
          <MemberVehicleList />
        </TabsContent>

        <TabsContent value="birthdays" className="mt-6">
          <BirthdaysPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}