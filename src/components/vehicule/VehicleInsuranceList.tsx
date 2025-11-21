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
import { Plus, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const DEFAULT_FILTERS: VehicleInsuranceFilters = {
  status: 'all',
  vehicleType: 'all',
  alphabeticalOrder: 'asc',
}

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
  const { data: membersData, isLoading: membersLoading } = useAllMembers({ hasCar: true }, 1, 100)

  const membersWithCar = useMemo(() => membersData?.data || [], [membersData])
  const companies = useMemo(() => stats?.byCompany.map(item => item.company) || [], [stats])

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
      if (formMode === 'create') {
        await createMutation.mutateAsync(values)
        toast.success('Assurance véhicule créée')
      } else if (currentInsurance) {
        await updateMutation.mutateAsync({ id: currentInsurance.id, updates: values })
        toast.success('Assurance mise à jour')
      }
      setIsFormOpen(false)
      setCurrentInsurance(null)
      refetch()
    } catch (error) {
      toast.error("Impossible d'enregistrer l'assurance", { description: error instanceof Error ? error.message : undefined })
    }
  }

  const handleRenew = async (values: { startDate: Date; endDate: Date; premiumAmount: number; policyNumber?: string; coverageType?: string }) => {
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
          <p className="text-sm text-gray-500 mt-1">Suivi complet des membres possédant un véhicule et de leurs assurances.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => refetch()}>
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Ajouter une assurance' : 'Modifier l’assurance'}</DialogTitle>
          </DialogHeader>
          <VehicleInsuranceForm members={membersWithCar} onSubmit={handleSubmitForm} initialInsurance={currentInsurance} isSubmitting={createMutation.isPending || updateMutation.isPending} mode={formMode} />
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
              coverageType: currentInsurance?.coverageType,
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

