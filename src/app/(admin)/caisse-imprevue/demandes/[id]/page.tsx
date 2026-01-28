/**
 * Page de détails d'une demande Caisse Imprévue V2
 * 
 * Affichage complet avec simulation et actions contextuelles
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { useDemandDetail, useExportDemandDetails } from '@/domains/financial/caisse-imprevue/hooks'
import { DemandDetailV2 } from '@/domains/financial/caisse-imprevue/components/demandes/DemandDetailV2'
import { Skeleton } from '@/components/ui/skeleton'

export default function DemandDetailPage() {
  const params = useParams()
  const router = useRouter()
  const demandId = params.id as string

  const { data: demand, isLoading } = useDemandDetail(demandId)
  const { exportDetails, isExporting } = useExportDemandDetails()

  const handleExportPDF = async () => {
    if (!demand) return
    try {
      await exportDetails(demand)
      // toast.success sera affiché dans le hook
    } catch (error) {
      console.error('Erreur export:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!demand) {
    return (
      <div className="container mx-auto p-3 md:p-4 lg:p-6">
        <p className="text-center text-kara-neutral-500">Demande non trouvée</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-3 md:p-4 lg:p-6 space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/caisse-imprevue/demandes">Demandes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Détails</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">Demande #{demand.id}</h1>
            <p className="text-sm md:text-base text-kara-neutral-600">
              Détails complets de la demande
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={isExporting}
          data-testid="export-details-pdf-button"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </>
          )}
        </Button>
      </div>

      {/* Détails */}
      <DemandDetailV2 demand={demand} />
    </div>
  )
}
