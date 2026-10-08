'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHero } from '@/components/ui/page-hero'
import { useAllMembers } from '@/hooks/useMembers'
import { useMyAccess } from '@/hooks/useMyAccess'
import { useVehicleInsurancesRealtimeSync } from '@/hooks/vehicule/useVehicleInsurancesRealtimeSync'
import { useCreateVehicleInsurance, useDeleteVehicleInsurance, useRejectVehicleDeclaration, useRenewVehicleInsurance, useUpdateVehicleInsurance, useValidateVehicleDeclaration, useVehicleInsuranceList, useVehicleInsuranceStats } from '@/hooks/vehicule/useVehicleInsurances'
import { Textarea } from '@/components/ui/textarea'
import { diffVehicleDeclaration } from '@/utils/vehicle-declaration'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'
import { VehicleInsurance, VehicleInsuranceFilters } from '@/types/types'
import { FileSpreadsheet, FileText, Percent, Plus, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useListUrlSync } from '@/hooks/useListUrlSync'
import { VehicleInsuranceDetail } from './VehicleInsuranceDetail'
import { VehicleInsuranceFilters as FiltersComponent } from './VehicleInsuranceFilters'
import { VehicleInsuranceForm } from './VehicleInsuranceForm'
import { VehicleInsuranceRenewForm } from './VehicleInsuranceRenewForm'
import { VehicleInsuranceStats } from './VehicleInsuranceStats'
import { VehicleInsuranceTable } from './VehicleInsuranceTable'
import { InsurancePartnersDialog, VehicleRewardEstimate, VehicleRewardsPanel } from './VehicleRewards'

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
  const { can } = useMyAccess()
  const canExport = can('vehicules.export')
  useVehicleInsurancesRealtimeSync(true)
  // État initialisé depuis l'URL : le retour navigateur retrouve la liste au même endroit.
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<VehicleInsuranceFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...(searchParams.get('statut') ? { status: searchParams.get('statut') as VehicleInsuranceFilters['status'] } : {}),
    ...(searchParams.get('type') ? { vehicleType: searchParams.get('type') as VehicleInsuranceFilters['vehicleType'] } : {}),
    ...(searchParams.get('q') ? { searchQuery: searchParams.get('q') as string } : {}),
  }))
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  // « À valider » : déclarations envoyées par les membres, à vérifier chez l'assureur partenaire.
  const [view, setView] = useState<'insurances' | 'pending' | 'rewards'>(
    searchParams.get('vue') === 'a-valider' ? 'pending' : searchParams.get('vue') === 'reversements' ? 'rewards' : 'insurances',
  )
  const [partnersOpen, setPartnersOpen] = useState(false)
  const [pageSize, setPageSize] = useState(Number(searchParams.get('limit')) || 10)

  // Miroir URL (les valeurs par défaut restent absentes de l'URL).
  useListUrlSync({
    statut: filters.status && filters.status !== 'all' ? filters.status : null,
    type: filters.vehicleType && filters.vehicleType !== 'all' ? filters.vehicleType : null,
    q: filters.searchQuery || null,
    page: page > 1 ? page : null,
    limit: pageSize !== 10 ? pageSize : null,
    vue: view === 'pending' ? 'a-valider' : view === 'rewards' ? 'reversements' : null,
  })
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [currentInsurance, setCurrentInsurance] = useState<VehicleInsurance | null>(null)
  const [detailInsurance, setDetailInsurance] = useState<VehicleInsurance | null>(null)
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false)
  const [insuranceToDelete, setInsuranceToDelete] = useState<VehicleInsurance | null>(null)
  // Validation : le formulaire s'ouvre pour vérifier/compléter, l'enregistrement valide.
  const [validateAfterSave, setValidateAfterSave] = useState(false)
  const [declarationToReject, setDeclarationToReject] = useState<VehicleInsurance | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const { data: stats, isLoading: statsLoading } = useVehicleInsuranceStats()
  const { data: list, isLoading, refetch } = useVehicleInsuranceList(
    { ...filters, page, limit: pageSize, declaration: view === 'pending' ? 'pending' : 'validated' },
    page,
    pageSize,
  )
  // Récupérer TOUS les membres (sans filtre hasCar côté Firestore pour éviter les problèmes d'indexation)
  const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } = useAllMembers({}, 1, 1000)
  // Récupérer toutes les assurances (sans pagination) pour obtenir la liste complète des membres avec assurance
  // Déclarations en attente comprises : le formulaire doit retrouver le membre déclarant.
  const { data: allInsurancesList } = useVehicleInsuranceList({ declaration: 'all' }, 1, 10000)

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
  // Exports : seulement les assurances validées.
  const allItems = (allInsurancesList?.items || []).filter((item) => !item.declarationStatus || item.declarationStatus === 'validated')

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
    toast.success('Exporter Excel généré')
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
    toast.success('Exporter PDF généré')
  }

  const createMutation = useCreateVehicleInsurance()
  const updateMutation = useUpdateVehicleInsurance()
  const renewMutation = useRenewVehicleInsurance()
  const deleteMutation = useDeleteVehicleInsurance()
  const validateMutation = useValidateVehicleDeclaration()
  const rejectMutation = useRejectVehicleDeclaration()

  const openValidation = (insurance: VehicleInsurance) => {
    setFormMode('edit')
    setCurrentInsurance(insurance)
    setValidateAfterSave(true)
    setIsFormOpen(true)
  }

  const handleReject = async () => {
    if (!declarationToReject) return
    try {
      await rejectMutation.mutateAsync({ id: declarationToReject.id, reason: rejectionReason })
      toast.success('Déclaration refusée', { description: 'Le membre a été prévenu.' })
      setDeclarationToReject(null)
      setRejectionReason('')
    } catch (error) {
      toast.error('Refus impossible', { description: error instanceof Error ? error.message : undefined })
    }
  }

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
        if (validateAfterSave) {
          // Écarts entre la saisie du membre et les informations de l'assureur partenaire.
          // Référence : la saisie du membre à l'envoi, même si la fiche a été modifiée depuis.
          const corrections = diffVehicleDeclaration(currentInsurance.declaredValues ?? currentInsurance, values)
          const { reward } = await validateMutation.mutateAsync({ id: currentInsurance.id, corrections })
          const rewardNote = reward
            ? ` ${reward.beneficiaryName} pourra réclamer ${reward.memberAmount.toLocaleString('fr-FR')} FCFA (onglet Reversements).`
            : ''
          toast.success('Déclaration validée', {
            description: (corrections.length
              ? `${corrections.length} correction${corrections.length > 1 ? 's' : ''} enregistrée${corrections.length > 1 ? 's' : ''} ; le membre a été prévenu.`
              : 'Le membre a été prévenu.') + rewardNote,
            duration: 8000,
          })
        } else {
          toast.success('Assurance mise à jour')
        }
      }
      setIsFormOpen(false)
      setCurrentInsurance(null)
      setValidateAfterSave(false)
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
      <PageHero
        icon={ShieldCheck}
        title="Assurances des véhicules"
        subtitle={
          !membersLoading && membersWithCar.length > 0
            ? `Suivi complet des membres possédant un véhicule et de leurs assurances. (${membersWithCar.length} ${membersWithCar.length === 1 ? 'membre' : 'membres'} avec véhicule)`
            : 'Suivi complet des membres possédant un véhicule et de leurs assurances.'
        }
        action={
          <div className="flex flex-wrap gap-2 md:gap-3">
            {canExport && (
              <Button
                type="button"
                variant="outline"
                onClick={handleExportExcel}
                disabled={!allItems.length}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exporter Excel
              </Button>
            )}
            {canExport && (
              <Button
                type="button"
                variant="outline"
                onClick={handleExportPdf}
                disabled={!allItems.length}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Exporter PDF
              </Button>
            )}
            {can('vehicules.edit') && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPartnersOpen(true)}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white flex items-center gap-2"
              >
                <Percent className="h-4 w-4" />
                Taux des assureurs
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => { refetch(); refetchMembers() }}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              Actualiser
            </Button>
            {can('vehicules.create') && (
              <Button
                onClick={openCreateModal}
                disabled={membersLoading}
                className="bg-white text-[#234D65] hover:bg-white/90 shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle assurance
              </Button>
            )}
          </div>
        }
      />

      <VehicleInsuranceStats stats={stats} isLoading={statsLoading} />

      <div className="flex flex-wrap gap-2">
        {([
          { value: 'insurances', label: 'Assurances' },
          { value: 'pending', label: `À valider${stats?.pendingDeclarations ? ` (${stats.pendingDeclarations})` : ''}` },
          { value: 'rewards', label: 'Reversements' },
        ] as const).map((tab) => (
          <Button
            key={tab.value}
            type="button"
            size="sm"
            variant={view === tab.value ? 'default' : 'outline'}
            className={view === tab.value ? 'bg-[#234D65] hover:bg-[#2c5a73]' : ''}
            onClick={() => {
              setView(tab.value)
              setPage(1)
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {view === 'pending' && (
        <p className="text-sm text-gray-600">
          Véhicules déclarés et envoyés par les membres. Vérifiez chez l&apos;assureur partenaire, complétez la fiche
          (plaque, ville, parrain) puis validez, ou refusez avec un motif : le membre est prévenu dans les deux cas.
        </p>
      )}

      {view === 'rewards' ? (
        <VehicleRewardsPanel canManage={can('vehicules.edit')} />
      ) : (
      <>
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
        onEdit={can('vehicules.edit') ? openEditModal : undefined}
        onRenew={can('vehicules.edit') && view !== 'pending' ? insurance => {
          setCurrentInsurance(insurance)
          setIsRenewDialogOpen(true)
        } : undefined}
        onDelete={can('vehicules.delete') ? setInsuranceToDelete : undefined}
        onValidate={view === 'pending' && can('vehicules.edit') ? openValidation : undefined}
        onReject={view === 'pending' && can('vehicules.edit') ? (insurance) => setDeclarationToReject(insurance) : undefined}
        onPageChange={setPage}
        onItemsPerPageChange={limit => {
          setPageSize(limit)
          setPage(1)
        }}
      />

      </>
      )}

      <InsurancePartnersDialog open={partnersOpen} onOpenChange={setPartnersOpen} companies={companies} />

      <VehicleInsuranceDetail insurance={detailInsurance} open={!!detailInsurance} onOpenChange={open => {
        if (!open) setDetailInsurance(null)
      }} />

      <Dialog open={isFormOpen} onOpenChange={open => {
        setIsFormOpen(open)
        if (!open) {
          setCurrentInsurance(null)
          setValidateAfterSave(false)
        }
      }}>
        <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90dvh] flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">{formMode === 'create' ? 'Ajouter une assurance véhicule' : validateAfterSave ? 'Valider la déclaration' : "Modifier l'assurance"}</DialogTitle>
            {validateAfterSave && (
              <p className="mt-2 text-sm text-gray-600">
                Vérifiez les informations auprès de l&apos;assureur partenaire et complétez la fiche : l&apos;enregistrement valide la déclaration.
              </p>
            )}
            {validateAfterSave && currentInsurance && (
              <div className="mt-2">
                <VehicleRewardEstimate
                  insuranceCompany={currentInsurance.insuranceCompany}
                  premiumAmount={currentInsurance.premiumAmount}
                />
              </div>
            )}
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
              disabled={createMutation.isPending || updateMutation.isPending || validateMutation.isPending || membersWithCar.length === 0}
              className="min-w-[140px] bg-[#234D65] hover:bg-[#2c5a73]"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>Enregistrement...</>
              ) : formMode === 'create' ? (
                <>Ajouter l'assurance</>
              ) : validateAfterSave ? (
                <>Enregistrer et valider</>
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
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
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

      <Dialog open={!!declarationToReject} onOpenChange={open => {
        if (!open) {
          setDeclarationToReject(null)
          setRejectionReason('')
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Refuser la déclaration</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {declarationToReject?.memberFirstName} {declarationToReject?.memberLastName}
            {declarationToReject?.plateNumber ? ` — ${declarationToReject.plateNumber}` : ''}. Le motif est envoyé au membre,
            qui pourra corriger et renvoyer sa déclaration.
          </p>
          <Textarea
            value={rejectionReason}
            onChange={event => setRejectionReason(event.target.value)}
            rows={4}
            placeholder="Ex. : véhicule introuvable chez l'assureur partenaire, numéro de police incorrect…"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeclarationToReject(null)} disabled={rejectMutation.isPending}>
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleReject}
              disabled={rejectMutation.isPending || rejectionReason.trim().length < 5}
            >
              Refuser
            </Button>
          </DialogFooter>
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
