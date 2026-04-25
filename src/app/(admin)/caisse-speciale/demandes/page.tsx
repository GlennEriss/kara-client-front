"use client"

import ListDemandes from '@/components/caisse-speciale/ListDemandes'
import ExportDemandesModal from '@/components/caisse-speciale/ExportDemandesModal'
import { Button } from '@/components/ui/button'
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f7fafd] via-white to-[#ecf4f8] p-4 md:p-6">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_1px_1px,rgba(35,77,101,0.07)_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="pointer-events-none absolute -left-24 bottom-[-120px] h-80 w-80 rounded-full bg-[#cbb171]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[-140px] h-[26rem] w-[26rem] rounded-full bg-[#234D65]/18 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-6 md:space-y-8">
        {/* En-tête */}
        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-[#1d4358] via-[#234D65] to-[#2d5d77] p-4 text-white shadow-[0_22px_50px_-30px_rgba(35,77,101,0.95)] md:p-6 lg:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-[#cbb171]/20 blur-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12" />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black">
              Demandes de Caisse Spéciale
            </h1>
          </div>
          <p className="text-sm md:text-base lg:text-lg text-kara-primary-light/80 mb-4">
            Gestion des demandes de contrats Caisse Spéciale
          </p>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 lg:gap-4">
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
              className="bg-kara-primary-light hover:bg-[#B8A05F] text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle demande
            </Button>
          </div>
        </div>

        {/* Composant principal avec Suspense */}
        <Suspense fallback={<ListDemandesSkeleton />}>
          <ListDemandes />
        </Suspense>

        <ExportDemandesModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      </div>
    </div>
  )
}
