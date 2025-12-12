"use client"
import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProvinceList from './ProvinceList'
import DepartmentList from './DepartmentList'
import CommuneList from './CommuneList'
import DistrictList from './DistrictList'
import QuarterList from './QuarterList'
import { MapPin } from 'lucide-react'

export default function GeographieManagement() {
  const [activeTab, setActiveTab] = useState('provinces')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#234D65] to-[#2c5a73] flex items-center justify-center">
          <MapPin className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
            Gestion Géographique
          </h1>
          <p className="text-gray-600 mt-1">Gérez les provinces, départements, communes, arrondissements et quartiers</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="provinces">Provinces</TabsTrigger>
          <TabsTrigger value="departments">Départements</TabsTrigger>
          <TabsTrigger value="communes">Communes</TabsTrigger>
          <TabsTrigger value="districts">Arrondissements</TabsTrigger>
          <TabsTrigger value="quarters">Quartiers</TabsTrigger>
        </TabsList>

        <TabsContent value="provinces" className="mt-6">
          <ProvinceList />
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <DepartmentList />
        </TabsContent>

        <TabsContent value="communes" className="mt-6">
          <CommuneList />
        </TabsContent>

        <TabsContent value="districts" className="mt-6">
          <DistrictList />
        </TabsContent>

        <TabsContent value="quarters" className="mt-6">
          <QuarterList />
        </TabsContent>
      </Tabs>
    </div>
  )
}

