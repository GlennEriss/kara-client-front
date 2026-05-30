"use client"
import React, { useState } from 'react'
import { PageHero } from '@/components/ui/page-hero'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ProvinceList from './ProvinceList'
import DepartmentList from './DepartmentList'
import CommuneList from './CommuneList'
import DistrictList from './DistrictList'
import QuarterList from './QuarterList'
import { MapPin, Building2, MapPinned, Route, Home } from 'lucide-react'
import { useGeographyStats } from '../hooks/useGeographie'

export default function GeographieManagement() {
  const [activeTab, setActiveTab] = useState('provinces')
  const stats = useGeographyStats()

  const statsData = [
    {
      title: 'Provinces',
      value: stats.provincesCount,
      icon: MapPin,
      color: 'text-blue-600',
      tabValue: 'provinces',
    },
    {
      title: 'Départements',
      value: stats.departmentsCount,
      icon: Building2,
      color: 'text-green-600',
      tabValue: 'departments',
    },
    {
      title: 'Communes',
      value: stats.communesCount,
      icon: MapPinned,
      color: 'text-orange-600',
      tabValue: 'communes',
    },
    {
      title: 'Arrondissements',
      value: stats.districtsCount,
      icon: Route,
      color: 'text-purple-600',
      tabValue: 'districts',
    },
    {
      title: 'Quartiers',
      value: stats.quartersCount,
      icon: Home,
      color: 'text-red-600',
      tabValue: 'quarters',
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHero
        icon={MapPin}
        title="Gestion Géographique"
        subtitle="Gérez les provinces, départements, communes, arrondissements et quartiers"
      />

      {/* Statistiques - Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card 
              key={stat.title} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setActiveTab(stat.tabValue)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate pr-2">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color} flex-shrink-0`} />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.value === 1 ? 'élément' : 'éléments'}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs - Responsive avec scroll horizontal en mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <TabsList className="inline-flex w-full sm:grid sm:grid-cols-5 min-w-max sm:min-w-0 h-auto p-1 bg-muted rounded-lg">
            <TabsTrigger 
              value="provinces" 
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-background"
            >
              Provinces
            </TabsTrigger>
            <TabsTrigger 
              value="departments"
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-background"
            >
              Départements
            </TabsTrigger>
            <TabsTrigger 
              value="communes"
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-background"
            >
              Communes
            </TabsTrigger>
            <TabsTrigger 
              value="districts"
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-background"
            >
              Arrondissements
            </TabsTrigger>
            <TabsTrigger 
              value="quarters"
              className="whitespace-nowrap px-3 sm:px-4 py-2 text-xs sm:text-sm data-[state=active]:bg-background"
            >
              Quartiers
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="provinces" className="mt-4 sm:mt-6">
          <ProvinceList />
        </TabsContent>

        <TabsContent value="departments" className="mt-4 sm:mt-6">
          <DepartmentList />
        </TabsContent>

        <TabsContent value="communes" className="mt-4 sm:mt-6">
          <CommuneList />
        </TabsContent>

        <TabsContent value="districts" className="mt-4 sm:mt-6">
          <DistrictList />
        </TabsContent>

        <TabsContent value="quarters" className="mt-4 sm:mt-6">
          <QuarterList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
