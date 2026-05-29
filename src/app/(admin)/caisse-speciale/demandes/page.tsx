"use client"

import ListDemandes from '@/components/caisse-speciale/ListDemandes'
import ExportDemandesModal from '@/components/caisse-speciale/ExportDemandesModal'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import routes from '@/constantes/routes'
import { ClipboardList, Download, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'

function ListDemandesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function CaisseSpecialeDemandesPage() {
  const router = useRouter()
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 p-4 md:p-6">
      <PageHero
        icon={ClipboardList}
        title="Demandes de Caisse Spéciale"
        subtitle="Gestion des demandes de contrats Caisse Spéciale"
        action={
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsExportModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <Button
              onClick={() => router.push(routes.admin.caisseSpecialeNewDemand)}
              className="bg-white text-[#234D65] hover:bg-white/90 shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle demande
            </Button>
          </div>
        }
      />

      {/* Composant principal avec Suspense */}
      <Suspense fallback={<ListDemandesSkeleton />}>
        <ListDemandes />
      </Suspense>

      <ExportDemandesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  )
}
