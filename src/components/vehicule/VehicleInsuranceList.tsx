'use client'

import { insurerLabel } from "@/domains/vehicles/insurance-companies"
import { assetTypeLabel } from '@/domains/vehicles/asset-types'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { PageHero } from '@/components/ui/page-hero'
import { useAllMembers } from '@/hooks/useMembers'
import { useMyAccess } from '@/hooks/useMyAccess'
import { useVehicleInsurancesRealtimeSync } from '@/hooks/vehicule/useVehicleInsurancesRealtimeSync'
import { useCreateVehicleInsurance, useDeleteVehicleInsurance, useRejectVehicleDeclaration, useRenewVehicleInsurance, useUpdateVehicleInsurance, useValidateVehicleDeclaration, useVehicleInsuranceList, useVehicleInsuranceStats } from '@/hooks/vehicule/useVehicleInsurances'
import { Textarea } from '@/components/ui/textarea'
import { listVehicleRewards } from '@/db/vehicle-rewards.db'
import { diffVehicleDeclaration } from '@/utils/vehicle-declaration'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'
import { VehicleInsurance, VehicleInsuranceFilters } from '@/types/types'
import { Calculator, FileSpreadsheet, FileText, Percent, Plus, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useListUrlSync } from '@/hooks/useListUrlSync'
import { useAuditLogger } from '@/hooks/useAuditLog'
import { VEHICLE_AUDIT_MODULE } from '@/constantes/audit-modules'
import { VehicleInsuranceDetail } from './VehicleInsuranceDetail'
import { VehicleInsuranceFilters as FiltersComponent } from './VehicleInsuranceFilters'
import { VehicleInsuranceForm } from './VehicleInsuranceForm'
import { VehicleInsuranceRenewForm } from './VehicleInsuranceRenewForm'
import { VehicleInsuranceStats } from './VehicleInsuranceStats'
import { VehicleInsuranceTable } from './VehicleInsuranceTable'
import { InsuranceAssetTypesDialog } from './InsuranceAssetTypesDialog'
import { InsuranceCompaniesDialog } from './InsuranceCompaniesDialog'
import { InsurancePartnersDialog, VehicleRewardEstimate, VehicleRewardsPanel } from './VehicleRewards'

const DEFAULT_FILTERS: VehicleInsuranceFilters = {
  status: 'all',
  vehicleType: 'all',
  alphabeticalOrder: 'asc',
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
  'Nom', 'Prénom', 'Ville', 'Quartier', 'Emplacement', 'Téléphone', 'Marque et modèle',
  'Type de bien', 'Énergie', 'Puissance fiscale', 'Date d’effet', 'Date de fin',
  'Référence du bien', 'Prime (FCFA)', 'Garantie (mois)', 'Assureur', 'Reversé au parrain (FCFA)',
]

export function VehicleInsuranceList() {
  const { can, isSuperAdmin } = useMyAccess()
  const { log } = useAuditLogger()
  const canExport = can('vehicules.export')
  useVehicleInsurancesRealtimeSync(true)
  // État initialisé depuis l'URL : le retour navigateur retrouve la liste au même endroit.
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<VehicleInsuranceFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...(searchParams.get('statut') ? { status: searchParams.get('statut') as VehicleInsuranceFilters['status'] } : {}),
    ...(searchParams.get('type') ? { vehicleType: searchParams.get('type') as VehicleInsuranceFilters['vehicleType'] } : {}),
    ...(searchParams.get('quarterId') ? { quarterId: searchParams.get('quarterId')! } : {}),
    ...(searchParams.get('locationMissing') === 'true' ? { locationMissing: true } : {}),
    ...(searchParams.get('q') ? { searchQuery: searchParams.get('q') as string } : {}),
  }))
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  // « À valider » : déclarations envoyées par les membres, à vérifier chez l'assureur partenaire.
  const [view, setView] = useState<'insurances' | 'pending' | 'rewards'>(
    searchParams.get('vue') === 'a-valider' ? 'pending' : searchParams.get('vue') === 'reversements' ? 'rewards' : 'insurances',
  )
  const [isExporting, setIsExporting] = useState(false)
  const [assetTypesOpen, setAssetTypesOpen] = useState(false)
  const [companiesOpen, setCompaniesOpen] = useState(false)
  const [partnersOpen, setPartnersOpen] = useState(false)
  const [pageSize, setPageSize] = useState(Number(searchParams.get('limit')) || 10)

  // Miroir URL (les valeurs par défaut restent absentes de l'URL).
  useListUrlSync({
    statut: filters.status && filters.status !== 'all' ? filters.status : null,
    type: filters.vehicleType && filters.vehicleType !== 'all' ? filters.vehicleType : null,
    q: filters.searchQuery || null,
    quarterId: filters.quarterId || null,
    locationMissing: filters.locationMissing ? 'true' : null,
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
  const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } = useAllMembers({}, 1, 1000)
  const { data: allInsurancesList } = useVehicleInsuranceList({ declaration: 'all' }, 1, 10000)

  const companies = useMemo(() => stats?.byCompany.map(item => item.company) || [], [stats])
  // Exports : seulement les assurances validées.
  const allItems = (allInsurancesList?.items || []).filter((item) => !item.declarationStatus || item.declarationStatus === 'validated')

  const buildExportRows = (paid: Map<string, number>) => {
    return allItems.map(insurance => {
      const firstName = insurance.holderType === 'member' ? (insurance.memberFirstName || '') : (insurance.nonMemberFirstName || '')
      const lastName = insurance.holderType === 'member' ? (insurance.memberLastName || '') : (insurance.nonMemberLastName || '')
      const phone = insurance.primaryPhone || insurance.memberContacts?.[0] || insurance.nonMemberPhone1 || ''
      const brand = [insurance.vehicleBrand, insurance.vehicleModel].filter(Boolean).join(' ').trim()
      const vehicleType = assetTypeLabel(insurance.vehicleType, insurance.vehicleDescription)
      const energy = insurance.energySource ? (ENERGY_LABELS[insurance.energySource] || insurance.energySource) : ''
      const fiscalPower = insurance.fiscalPower || ''
      const startDate = insurance.startDate ? insurance.startDate.toLocaleDateString('fr-FR') : ''
      const endDate = insurance.endDate ? insurance.endDate.toLocaleDateString('fr-FR') : ''
      const plateNumber = insurance.plateNumber || ''
      const premiumAmount = insurance.premiumAmount ?? ''
      const warrantyMonths = insurance.warrantyMonths ?? ''

      return [
        lastName,
        firstName,
        insurance.city || '',
        insurance.quarter || '',
        insurance.locationType === 'other' ? insurance.locationDetails || '' : '',
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
        insurerLabel(insurance.insuranceCompany || ''),
        paid.get(insurance.id) ?? 0,
      ]
    })
  }

  const exportInsurances = async (format: 'pdf' | 'xlsx') => {
    if (isExporting || !canExport || !allItems.length) return
    setIsExporting(true)
    try {
      const [rewards, exporter] = await Promise.all([
        listVehicleRewards(),
        import('@/domains/vehicles/insurance-export'),
      ])
      const generated = new Date()
      const rows = buildExportRows(exporter.paidInsuranceTotals(rewards))
      const filename = `LE-KARA-assurances_${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Libreville' }).format(generated)}.${format}`
      if (format === 'pdf') {
        exporter.insuranceListPdf(EXPORT_HEADERS, rows, generated).save(filename)
      } else {
        const book = exporter.insuranceListExcel(EXPORT_HEADERS, rows, generated)
        const bytes = await book.xlsx.writeBuffer()
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }))
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
      log({
        action: 'export',
        ...VEHICLE_AUDIT_MODULE,
        targetType: 'assurances',
        targetId: filename,
        description: `Export des assurances validées — ${rows.length} dossier(s)`,
        metadata: { format, count: rows.length },
      })
      toast.success(format === 'pdf' ? 'Export PDF généré' : 'Export Excel généré')
    } catch {
      toast.error('Impossible d’exporter les assurances et leurs reversements.')
    } finally {
      setIsExporting(false)
    }
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

  const openDetailModal = (insurance: VehicleInsurance) => {
    setDetailInsurance(insurance)
    log({
      action: 'view',
      ...VEHICLE_AUDIT_MODULE,
      targetType: 'assurance',
      targetId: insurance.id,
      description: `Consultation d'une assurance${insurance.plateNumber ? ` (${insurance.plateNumber})` : ''}`,
    })
  }

  const handleSubmitForm = async (values: VehicleInsuranceFormValues) => {
    try {
      // Récupérer le membre sélectionné pour enrichir les données
      const selectedMember = membersData?.data.find(member => member.id === values.memberId)
      
      // Enrichir les valeurs avec les informations du membre
      const enrichedValues = {
        ...values,
        memberContacts: selectedMember?.contacts || values.memberContacts || [],
        memberPhotoUrl: selectedMember?.photoURL || null,
      }
      
      if (formMode === 'create') {
        await createMutation.mutateAsync(enrichedValues as any)
        toast.success('Assurance créée')
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
    } catch (error) {
      toast.error('Suppression impossible', { description: error instanceof Error ? error.message : undefined })
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={ShieldCheck}
        title="Assurances et prospections"
        subtitle="Gérez les assurances de véhicules, de maisons et d’autres biens. Suivez les échéances, les reversements et les relances des prospects."
        action={
          <div className="flex flex-wrap gap-2 md:gap-3">
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20"><Link href="/vehicules/prospection">Voir les prospects</Link></Button>
            {can('vehicules.view') && (
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                <Link href="/vehicules/baremes">
                  <FileText aria-hidden="true" className="h-4 w-4" />
                  Barèmes des assureurs
                </Link>
              </Button>
            )}
            {can('vehicules.view') && (
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                <Link href="/vehicules/simulateur"><Calculator aria-hidden className="size-4" /> Simulateur</Link>
              </Button>
            )}
            {canExport && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void exportInsurances('xlsx')}
                disabled={isExporting || !allItems.length}
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
                onClick={() => void exportInsurances('pdf')}
                disabled={isExporting || !allItems.length}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Exporter PDF
              </Button>
            )}
            {can('vehicules.edit') && (
              <Button type="button" variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white" onClick={() => setAssetTypesOpen(true)}>
                Types de biens
              </Button>
            )}
            {isSuperAdmin && (
              <Button type="button" variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white" onClick={() => setCompaniesOpen(true)}>
                Liste des assureurs
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
              onClick={() => { void Promise.allSettled([refetch(), refetchMembers()]) }}
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
          Assurances déclarées par les membres. Vérifiez chez l&apos;assureur partenaire, complétez la fiche
          (plaque, ville, parrain) puis validez, ou refusez avec un motif : le membre est prévenu dans les deux cas.
        </p>
      )}

      {view === 'rewards' ? (
        <VehicleRewardsPanel canManage={can('vehicules.edit')} />
      ) : (
      <>
      <FiltersComponent quarters={stats?.locations?.quarters} filters={filters} onChange={next => {
        setFilters(next)
        setPage(1)
      }} onReset={() => {
        setFilters(DEFAULT_FILTERS)
        setPage(1)
      }} companies={companies} />

      <VehicleInsuranceTable
        data={list}
        isLoading={isLoading}
        onView={openDetailModal}
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

      {can('vehicules.edit') && <InsuranceAssetTypesDialog open={assetTypesOpen} onOpenChange={setAssetTypesOpen} />}
      {isSuperAdmin && <InsuranceCompaniesDialog open={companiesOpen} onOpenChange={setCompaniesOpen} />}
      <InsurancePartnersDialog open={partnersOpen} onOpenChange={setPartnersOpen} />

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
        <ModalContent size="3xl" className="!w-[calc(100vw-1rem)] max-h-[95dvh] sm:!w-[95vw]">
          <ModalHeader
            icon={ShieldCheck}
            title={formMode === 'create' ? 'Ajouter une assurance' : validateAfterSave ? 'Valider la déclaration' : "Modifier l'assurance"}
            description={
              validateAfterSave
                ? "Vérifiez les informations auprès de l'assureur partenaire avant de valider."
                : formMode === 'create'
                  ? 'Renseignez le titulaire, le bien assuré, la couverture et le reçu de paiement.'
                  : "Mettez à jour les informations du bien et de son assurance."
            }
          />
          <ModalBody className="space-y-4 bg-slate-50/60 px-4 py-4 sm:px-6 sm:py-5">
            {validateAfterSave && currentInsurance && (
              <VehicleRewardEstimate
                insuranceCompany={currentInsurance.insuranceCompany}
                premiumAmount={currentInsurance.premiumAmount}
              />
            )}
            <VehicleInsuranceForm 
              onSubmit={handleSubmitForm} 
              initialInsurance={currentInsurance} 
              isSubmitting={createMutation.isPending || updateMutation.isPending} 
              mode={formMode}
              isLoadingMembers={membersLoading}
            />
          </ModalBody>
          <ModalFooter className="flex-col-reverse bg-white sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
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
              disabled={createMutation.isPending || updateMutation.isPending || validateMutation.isPending}
              className="min-w-[160px] bg-[#234D65] hover:bg-[#2c5a73]"
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
          </ModalFooter>
        </ModalContent>
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
            placeholder="Ex. : dossier introuvable chez l'assureur partenaire, numéro de police incorrect…"
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
