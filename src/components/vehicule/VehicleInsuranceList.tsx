'use client'

import { useMemo, useState } from 'react'
import { VehicleInsuranceFilters as FiltersComponent } from './VehicleInsuranceFilters'
import { VehicleInsuranceStats } from './VehicleInsuranceStats'
import { VehicleInsuranceTable } from './VehicleInsuranceTable'
import { VehicleInsuranceDetail } from './VehicleInsuranceDetail'
import { VehicleInsuranceForm } from './VehicleInsuranceForm'
import { VehicleInsuranceRenewForm } from './VehicleInsuranceRenewForm'
import { VehicleInsurance, VehicleInsuranceFilters } from '@/types/types'
import { useVehicleInsuranceList, useVehicleInsuranceStats, useCreateVehicleInsurance, useUpdateVehicleInsurance, useRenewVehicleInsurance, useDeleteVehicleInsurance } from '@/hooks/vehicule/useVehicleInsurances'
import { useAllMembers } from '@/hooks/useMembers'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, ShieldCheck, FileSpreadsheet, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const DEFAULT_FILTERS: VehicleInsuranceFilters = {
  status: 'all',
  vehicleType: 'all',
  alphabeticalOrder: 'asc',
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: 'Voiture',
  motorcycle: 'Moto',
  truck: 'Camion',
  bus: 'Bus',
  maison: 'Maison',
  other: 'Autre',
}

const ENERGY_LABELS: Record<string, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  electrique: 'Électrique',
  hybride: 'Hybride',
  gaz: 'Gaz',
  autre: 'Autre',
}

const EXPORT_HEADERS = [
  'NOMS',
  'PRENOMS',
  'VILLE',
  'TEL',
  'MARQUE VEHICULE',
  'TYPE DE VIHUCLE',
  "SOURCE D'ENERGIE",
  'PUISSANCE FISCALE / ADMINISTRATIF',
  "DATE D'EFFET",
  'DATE DE FIN',
  'NUMERO D\'IMMATRICULATION',
  'MONTANT PAYE',
  'FIN DE GARANTIE - MOIS',
  'ASSUREUR ACTUEL',
]

export function VehicleInsuranceList() {
  const [filters, setFilters] = useState<VehicleInsuranceFilters>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [currentInsurance, setCurrentInsurance] = useState<VehicleInsurance | null>(null)
  const [detailInsurance, setDetailInsurance] = useState<VehicleInsurance | null>(null)
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false)
  const [insuranceToDelete, setInsuranceToDelete] = useState<VehicleInsurance | null>(null)

  const { data: stats, isLoading: statsLoading } = useVehicleInsuranceStats()
  const { data: list, isLoading, refetch } = useVehicleInsuranceList({ ...filters, page, limit: pageSize }, page, pageSize)
  // Récupérer TOUS les membres (sans filtre hasCar côté Firestore pour éviter les problèmes d'indexation)
  const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } = useAllMembers({}, 1, 1000)
  // Récupérer toutes les assurances (sans pagination) pour obtenir la liste complète des membres avec assurance
  const { data: allInsurancesList } = useVehicleInsuranceList({}, 1, 10000)

  // Récupérer les IDs des membres qui ont déjà une assurance véhicule
  const memberIdsWithInsurance = useMemo(() => {
    if (!allInsurancesList?.items) {
      return new Set<string>()
    }
    const ids = allInsurancesList.items
      .map((insurance: VehicleInsurance) => insurance.memberId)
      .filter((id): id is string => !!id)
    return new Set(ids)
  }, [allInsurancesList])

  const membersWithCar = useMemo(() => {
    if (!membersData?.data) {
      return []
    }
    
    // Filtrer côté client pour inclure :
    // 1. Les membres où hasCar === true
    // 2. OU les membres qui ont déjà une assurance véhicule (même si hasCar n'est pas défini)
    const filtered = membersData.data.filter(member => {
      const hasCarField = member.hasCar === true
      const hasExistingInsurance = memberIdsWithInsurance.has(member.id)
      return hasCarField || hasExistingInsurance
    })
    
    // Trier par nom pour faciliter la recherche
    return filtered.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })
  }, [membersData, memberIdsWithInsurance])
  const companies = useMemo(() => stats?.byCompany.map(item => item.company) || [], [stats])
  const allItems = allInsurancesList?.items || []

  const buildExportRows = () => {
    return allItems.map(insurance => {
      const firstName = insurance.holderType === 'member' ? (insurance.memberFirstName || '') : (insurance.nonMemberFirstName || '')
      const lastName = insurance.holderType === 'member' ? (insurance.memberLastName || '') : (insurance.nonMemberLastName || '')
      const phone = insurance.primaryPhone || insurance.memberContacts?.[0] || insurance.nonMemberPhone1 || ''
      const brand = [insurance.vehicleBrand, insurance.vehicleModel].filter(Boolean).join(' ').trim()
      const vehicleType = VEHICLE_TYPE_LABELS[insurance.vehicleType] || insurance.vehicleType
      const energy = insurance.energySource ? (ENERGY_LABELS[insurance.energySource] || insurance.energySource) : ''
      const fiscalPower = insurance.fiscalPower || ''
      const startDate = insurance.startDate ? insurance.startDate.toLocaleDateString('fr-FR') : ''
      const endDate = insurance.endDate ? insurance.endDate.toLocaleDateString('fr-FR') : ''
      const plateNumber = insurance.plateNumber || ''
      const premiumAmount = insurance.premiumAmount ? insurance.premiumAmount.toLocaleString('fr-FR') : ''
      const warrantyMonths = insurance.warrantyMonths ?? ''

      return [
        lastName,
        firstName,
        insurance.city || '',
        phone,
        brand,
        vehicleType,
        energy,
        fiscalPower,
        startDate,
        endDate,
        plateNumber,
        premiumAmount,
        warrantyMonths,
        insurance.insuranceCompany || '',
      ]
    })
  }

  const handleExportExcel = async () => {
    if (!allItems.length) {
      toast.error('Aucune assurance à exporter')
      return
    }
    const rows = buildExportRows()
    const XLSX = await import('xlsx')
    const sheetData = [
      ["FICHE D'EVALUATION DE PROSPECTION MANDATAIRE MASTER"],
      ['DONNEES CLIENTS'],
      EXPORT_HEADERS,
      ...rows,
    ]
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: EXPORT_HEADERS.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: EXPORT_HEADERS.length - 1 } },
    ]
    worksheet['!cols'] = EXPORT_HEADERS.map(() => ({ wch: 22 }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assurances')
    const filename = `assurances_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(workbook, filename)
    toast.success('Export Excel généré')
  }

  const handleExportPdf = async () => {
    if (!allItems.length) {
      toast.error('Aucune assurance à exporter')
      return
    }
    const rows = buildExportRows()
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF('landscape')
    doc.setFontSize(14)
    doc.text("FICHE D'EVALUATION DE PROSPECTION MANDATAIRE MASTER", 14, 14)
    doc.setFontSize(11)
    doc.text('DONNEES CLIENTS', 14, 22)
    autoTable(doc, {
      head: [EXPORT_HEADERS],
      body: rows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      theme: 'grid',
    })
    const filename = `assurances_${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(filename)
    toast.success('Export PDF généré')
  }

  const createMutation = useCreateVehicleInsurance()
  const updateMutation = useUpdateVehicleInsurance()
  const renewMutation = useRenewVehicleInsurance()
  const deleteMutation = useDeleteVehicleInsurance()

  const openCreateModal = () => {
    setFormMode('create')
    setCurrentInsurance(null)
    setIsFormOpen(true)
  }

  const openEditModal = (insurance: VehicleInsurance) => {
    setFormMode('edit')
    setCurrentInsurance(insurance)
    setIsFormOpen(true)
  }

  const handleSubmitForm = async (values: VehicleInsuranceFormValues) => {
    try {
      // Récupérer le membre sélectionné pour enrichir les données
      const selectedMember = membersWithCar.find(m => m.id === values.memberId)
      
      // Enrichir les valeurs avec les informations du membre
      const enrichedValues = {
        ...values,
        memberContacts: selectedMember?.contacts || values.memberContacts || [],
        memberPhotoUrl: selectedMember?.photoURL || null,
      }
      
      if (formMode === 'create') {
        await createMutation.mutateAsync(enrichedValues as any)
        toast.success('Assurance véhicule créée')
      } else if (currentInsurance) {
        await updateMutation.mutateAsync({ id: currentInsurance.id, updates: enrichedValues })
        toast.success('Assurance mise à jour')
      }
      setIsFormOpen(false)
      setCurrentInsurance(null)
      refetch()
    } catch (error) {
      toast.error("Impossible d'enregistrer l'assurance", { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleRenew = async (values: { startDate: Date; endDate: Date; premiumAmount: number; policyNumber?: string }) => {
    if (!currentInsurance) return
    try {
      await renewMutation.mutateAsync({ id: currentInsurance.id, ...values })
      toast.success('Assurance renouvelée')
      setIsRenewDialogOpen(false)
      setCurrentInsurance(null)
      refetch()
    } catch (error) {
      toast.error('Renouvellement impossible', { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleDelete = async () => {
    if (!insuranceToDelete) return
    try {
      await deleteMutation.mutateAsync(insuranceToDelete.id)
      toast.success('Assurance supprimée')
      setInsuranceToDelete(null)
      refetch()
    } catch (error) {
      toast.error('Suppression impossible', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-gray-500 tracking-wide">Module Véhicule</p>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-[#234D65]" />
            Assurances des véhicules
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi complet des membres possédant un véhicule et de leurs assurances.
            {!membersLoading && membersWithCar.length > 0 && (
              <span className="ml-2 font-medium text-[#234D65]">
                ({membersWithCar.length} {membersWithCar.length === 1 ? 'membre' : 'membres'} avec véhicule)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportExcel}
            disabled={!allItems.length}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPdf}
            disabled={!allItems.length}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => {
            refetch()
            refetchMembers()
          }}>
            Actualiser
          </Button>
          <Button onClick={openCreateModal} disabled={membersLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle assurance
          </Button>
        </div>
      </div>

      <VehicleInsuranceStats stats={stats} isLoading={statsLoading} />

      <FiltersComponent filters={filters} onChange={next => {
        setFilters(next)
        setPage(1)
      }} onReset={() => {
        setFilters(DEFAULT_FILTERS)
        setPage(1)
      }} companies={companies} />

      <VehicleInsuranceTable
        data={list}
        isLoading={isLoading}
        onView={insurance => setDetailInsurance(insurance)}
        onEdit={openEditModal}
        onRenew={insurance => {
          setCurrentInsurance(insurance)
          setIsRenewDialogOpen(true)
        }}
        onDelete={setInsuranceToDelete}
        onPageChange={setPage}
        onItemsPerPageChange={limit => {
          setPageSize(limit)
          setPage(1)
        }}
      />

      <VehicleInsuranceDetail insurance={detailInsurance} open={!!detailInsurance} onOpenChange={open => {
        if (!open) setDetailInsurance(null)
      }} />

      <Dialog open={isFormOpen} onOpenChange={open => {
        setIsFormOpen(open)
        if (!open) {
          setCurrentInsurance(null)
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">{formMode === 'create' ? 'Ajouter une assurance véhicule' : "Modifier l'assurance"}</DialogTitle>
            {formMode === 'create' && (
              <div className="space-y-1 mt-2">
                <p className="text-sm text-gray-600">
                  Ajoutez les informations d'assurance pour un membre qui possède déjà un véhicule.
                </p>
                {membersLoading ? (
                  <p className="text-xs text-gray-400">Chargement des membres...</p>
                ) : membersWithCar.length === 0 ? (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Aucun membre avec véhicule trouvé. Assurez-vous que des membres ont l'attribut "hasCar" activé.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 font-medium">
                    {membersWithCar.length} {membersWithCar.length === 1 ? 'membre disponible' : 'membres disponibles'} avec véhicule
                  </p>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1 pr-2 -mr-2">
            <VehicleInsuranceForm 
              onSubmit={handleSubmitForm} 
              initialInsurance={currentInsurance} 
              isSubmitting={createMutation.isPending || updateMutation.isPending} 
              mode={formMode}
              isLoadingMembers={membersLoading}
            />
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 pb-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsFormOpen(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Annuler
            </Button>
            <Button 
              type="submit"
              form="vehicle-insurance-form"
              disabled={createMutation.isPending || updateMutation.isPending || membersWithCar.length === 0}
              className="min-w-[140px] bg-[#234D65] hover:bg-[#2c5a73]"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>Enregistrement...</>
              ) : formMode === 'create' ? (
                <>Ajouter l'assurance</>
              ) : (
                <>Mettre à jour</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenewDialogOpen} onOpenChange={open => {
        setIsRenewDialogOpen(open)
        if (!open) setCurrentInsurance(null)
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Renouveler l’assurance</DialogTitle>
          </DialogHeader>
          <VehicleInsuranceRenewForm
            defaultValues={{
              startDate: currentInsurance?.startDate,
              endDate: currentInsurance?.endDate,
              premiumAmount: currentInsurance?.premiumAmount,
              policyNumber: currentInsurance?.policyNumber,
            }}
            onSubmit={values => handleRenew(values)}
            isSubmitting={renewMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!insuranceToDelete} onOpenChange={open => {
        if (!open) setInsuranceToDelete(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette assurance ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprimera les informations d’assurance pour {insuranceToDelete?.memberFirstName} {insuranceToDelete?.memberLastName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteMutation.isPending}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

