'use client'

import dynamic from 'next/dynamic'
import { BookOpen, Loader2, Scale } from 'lucide-react'
import React from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { STATUTS_ENTETE } from '@/constantes/statuts-kara'

const chargement = () => (
  <div className="flex h-64 items-center justify-center text-gray-500">
    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
    Préparation du document...
  </div>
)

// react-pdf ne peut pas être rendu côté serveur
const StatutsPdfPreview = dynamic(() => import('./StatutsPdfPreview'), {
  ssr: false,
  loading: chargement,
})
const ReglementPdfPreview = dynamic(() => import('./ReglementPdfPreview'), {
  ssr: false,
  loading: chargement,
})

/**
 * Documents de l'association : les Statuts et le Règlement Intérieur, chacun
 * consultable, remplissable et signable par le Comité Exécutif.
 */
const StatutsPage: React.FC = () => (
  <div className="space-y-6 p-3 sm:p-6">
    <div className="flex items-center gap-3">
      <div className="p-3 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
        <Scale className="h-5 w-5 text-white" />
      </div>
      <div>
        <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
          Documents de l&apos;association
        </h1>
        <p className="text-sm text-gray-600">
          {STATUTS_ENTETE.association} — {STATUTS_ENTETE.devise}
        </p>
      </div>
    </div>

    <Tabs defaultValue="statuts" className="w-full">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="statuts">
          <Scale className="mr-2 h-4 w-4" />
          Statuts
        </TabsTrigger>
        <TabsTrigger value="reglement">
          <BookOpen className="mr-2 h-4 w-4" />
          Règlement Intérieur
        </TabsTrigger>
      </TabsList>

      <TabsContent value="statuts" className="mt-4">
        <StatutsPdfPreview />
      </TabsContent>
      <TabsContent value="reglement" className="mt-4">
        <ReglementPdfPreview />
      </TabsContent>
    </Tabs>
  </div>
)

export default StatutsPage
