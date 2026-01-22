'use client'

import { useState } from 'react'
import { MembershipsListPage } from '@/domains/memberships/components/page/MembershipsListPage'
import MemberVehicleList from '@/components/memberships/MemberVehicleList'
import MemberBirthdaysList from '@/components/memberships/MemberBirthdaysList'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Users, Car, Cake } from 'lucide-react'

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState('list')

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-linear-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
            Gestion des Membres
          </h1>
          <p className="text-gray-600 text-lg">
            Gérez les membres adhérents, bienfaiteurs et sympathisants de KARA
          </p>
        </div>
      </div>

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
          <MemberBirthdaysList />
        </TabsContent>
      </Tabs>
    </div>
  )
}