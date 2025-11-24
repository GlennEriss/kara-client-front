'use client'

import { useState } from 'react'
import MembershipList from '@/components/memberships/MembershipList'
import MemberVehicleList from '@/components/memberships/MemberVehicleList'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Users, Car } from 'lucide-react'

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState('list')

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
            Gestion des Membres
          </h1>
          <p className="text-gray-600 text-lg">
            Gérez les membres adhérents, bienfaiteurs et sympathisants de KARA
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Liste des membres
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Véhicules des membres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <MembershipList />
        </TabsContent>

        <TabsContent value="vehicles" className="mt-6">
          <MemberVehicleList />
        </TabsContent>
      </Tabs>
    </div>
  )
}