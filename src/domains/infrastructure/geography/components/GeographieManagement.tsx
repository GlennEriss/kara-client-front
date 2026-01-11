"use client"
import React, { useState } from 'react'
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
    },
    {
      title: 'Départements',
      value: stats.departmentsCount,
      icon: Building2,
      color: 'text-green-600',
    },
    {
      title: 'Communes',
      value: stats.communesCount,
      icon: MapPinned,
      color: 'text-orange-600',
    },
    {
      title: 'Arrondissements',
      value: stats.districtsCount,
      icon: Route,
      color: 'text-purple-600',
    },
    {
      title: 'Quartiers',
      value: stats.quartersCount,
      icon: Home,
      color: 'text-red-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#234D65] to-[#2c5a73] flex items-center justify-center">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Gestion Géographique
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les provinces, départements, communes, arrondissements et quartiers
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
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

