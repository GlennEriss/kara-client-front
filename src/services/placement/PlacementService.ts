import type { Placement, CommissionPaymentPlacement, EarlyExitPlacement, PayoutMode, PlacementDocumentType, User, PlacementDemand, PlacementDemandFilters, PlacementDemandStats } from '@/types/types'
import { PlacementRepository } from '@/repositories/placement/PlacementRepository'
import { IMemberRepository } from '@/repositories/members/IMemberRepository'
import { DocumentService } from '@/domains/infrastructure/documents/services/DocumentService'
import { IDocumentRepository } from '@/domains/infrastructure/documents/repositories/IDocumentRepository'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { NotificationService } from '@/services/notifications/NotificationService'
import { IPlacementDemandRepository } from '@/repositories/placement/IPlacementDemandRepository'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { IAdminRepository } from '@/repositories/admins/IAdminRepository'
import {
  calculateMonthlyCommission,
  calculateTotalCommissions,
  roundFcfa,
  sumCommissionAmounts,
  sumPaidCommissionAmounts,
} from '@/utils/placementMoney'

export class PlacementService {
  private notificationService: NotificationService
  private placementDemandRepository: IPlacementDemandRepository
  private memberRepository: IMemberRepository
  private adminRepository: IAdminRepository

  constructor(
    private placementRepository: PlacementRepository,
    private documentService: DocumentService,
    private documentRepository: IDocumentRepository,
    memberRepository?: IMemberRepository,
    notificationService?: NotificationService, // Optionnel pour éviter dépendance circulaire
    placementDemandRepository?: IPlacementDemandRepository
  ) {
    // Initialiser NotificationService si non fourni
    if (!notificationService) {
      this.notificationService = ServiceFactory.getNotificationService()
    } else {
      this.notificationService = notificationService
    }
    
    // Initialiser les repositories si non fournis
    if (!memberRepository) {
      this.memberRepository = RepositoryFactory.getMemberRepository()
    } else {
      this.memberRepository = memberRepository
    }
    
    this.adminRepository = RepositoryFactory.getAdminRepository()
    
    if (!placementDemandRepository) {
      this.placementDemandRepository = RepositoryFactory.getPlacementDemandRepository()
    } else {
      this.placementDemandRepository = placementDemandRepository
    }
  }

  /**
   * Calcule les champs dérivés (endDate, nextCommissionDate) selon le mode et la période
   */
  private computeDates(payload: { startDate?: Date; periodMonths: number; payoutMode: PayoutMode }) {
    const start = payload.startDate ? new Date(payload.startDate) : new Date()
    const end = new Date(start)
    end.setMonth(end.getMonth() + (payload.periodMonths > 0 ? payload.periodMonths - 1 : 0))

    const nextCommissionDate =
      payload.payoutMode === 'MonthlyCommission_CapitalEnd' ? start : end

    return { startDate: start, endDate: end, nextCommissionDate }
  }

  private formatAmountForPdf(amount: number): string {
    const safe = Number.isFinite(amount) ? Math.round(amount) : 0
    return String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  private validatePlacementAmount(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error('Le capital doit être un montant entier en FCFA')
    }
    if (value < 1_000 || value > 100_000_000) {
      throw new Error('Le capital doit être compris entre 1 000 et 100 000 000 FCFA')
    }
    return value
  }

  private validatePlacementRate(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('Le taux mensuel doit être un nombre fini')
    }
    if (value < 0 || value > 10) {
      throw new Error('Le taux mensuel doit être compris entre 0 et 10 %')
    }
    return value
  }

  private validatePlacementPeriod(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error('La durée doit être un nombre entier de mois')
    }
    if (value < 1 || value > 7) {
      throw new Error('La durée doit être comprise entre 1 et 7 mois')
    }
    return value
  }

  /**
   * Récupère les informations du membre pour préremplir nom et téléphone
   */
  private async enrichMemberInfo(benefactorId: string): Promise<Pick<Placement, 'benefactorName' | 'benefactorPhone'>> {
    try {
      const member = await this.memberRepository.getMemberById(benefactorId) as unknown as User | null
      if (member) {
        const name = `${member.lastName ?? ''} ${member.firstName ?? ''}`.trim()
        const phone = Array.isArray(member.contacts) && member.contacts.length > 0 ? member.contacts[0] : undefined
        return { benefactorName: name || undefined, benefactorPhone: phone }
      }
    } catch {
      // Impossible de récupérer les infos du membre - continue sans
    }
    return { benefactorName: undefined, benefactorPhone: undefined }
  }

  async createPlacement(data: Omit<Placement, 'id' | 'createdAt' | 'updatedAt' | 'status'>, adminId: string): Promise<Placement> {
    const amount = this.validatePlacementAmount(data.amount)
    const rate = this.validatePlacementRate(data.rate)
    const periodMonths = this.validatePlacementPeriod(data.periodMonths)
    const dates = this.computeDates({
      startDate: data.startDate,
      periodMonths,
      payoutMode: data.payoutMode,
    })
    const memberInfo = await this.enrichMemberInfo(data.benefactorId)

    // Générer l'ID personnalisé au format MK_BF_matriculeMembre_date_heure
    const member = await this.memberRepository.getMemberById(data.benefactorId)
    if (!member) {
      throw new Error('Membre bienfaiteur introuvable')
    }
    
    // Récupérer le matricule et le formater avec padding à 4 chiffres
    let matricule = member.matricule || member.id || data.benefactorId
    // Extraire uniquement les chiffres du matricule et formater à 4 chiffres
    const matriculeDigits = matricule.replace(/\D/g, '') // Garder uniquement les chiffres
    // Si pas de chiffres trouvés, utiliser les 4 derniers caractères de l'ID
    matricule = matriculeDigits.length > 0 
      ? matriculeDigits.padStart(4, '0') // Padding à 4 chiffres avec des zéros à gauche
      : String(member.id || data.benefactorId).slice(-4).padStart(4, '0')
    
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    // Format: MK_BF_matriculeMembre_ddMMyy_HHmm (ex: MK_BF_0001_111225_1705)
    const customPlacementId = `MK_BF_${matricule}_${day}${month}${year}_${hours}${minutes}`

    const placement = await this.placementRepository.create({
      ...data,
      ...memberInfo,
      startDate: dates.startDate,
      endDate: dates.endDate,
      nextCommissionDate: dates.nextCommissionDate,
      amount,
      rate,
      periodMonths,
      status: 'Draft',
      createdBy: adminId,
      updatedBy: adminId,
    }, customPlacementId)

    // Si le membre n'a pas encore le rôle Bienfaiteur, l'ajouter
    try {
      const member = await this.memberRepository.getMemberById(data.benefactorId)
      if (member) {
        const roles = member.roles || []
        if (!roles.includes('Bienfaiteur')) {
          await this.memberRepository.updateMemberRoles(member.id as string, [...roles, 'Bienfaiteur'], adminId)
        }
      }
    } catch {
      // Impossible de mettre à jour les rôles du membre pour le placement - continue sans
    }

    return placement
  }

  /**
   * Génère automatiquement les commissions selon le mode de règlement
   */
  private async generateCommissions(placement: Placement, adminId: string): Promise<void> {
    const startDate = placement.startDate || placement.createdAt
    const commissions: Omit<CommissionPaymentPlacement, 'id' | 'createdAt' | 'updatedAt'>[] = []

    // Calcul du montant de commission mensuel
    const monthlyCommissionAmount = calculateMonthlyCommission(placement.amount, placement.rate)

    if (placement.payoutMode === 'MonthlyCommission_CapitalEnd') {
      // Mode 1 : Commission mensuelle + capital à la fin
      // Créer une commission pour chaque mois
      // La date saisie (startDate) est la date du 1er versement
      for (let i = 0; i < placement.periodMonths; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)
        
        commissions.push({
          placementId: placement.id,
          dueDate,
          amount: monthlyCommissionAmount,
          status: 'Due',
          createdBy: adminId,
          updatedBy: adminId,
        })
      }
    } else if (placement.payoutMode === 'CapitalPlusCommission_End') {
      // Mode 2 : Capital + commissions à la fin
      // Créer une seule commission à la fin avec le total des commissions
      const endDate = placement.endDate || (() => {
        const date = new Date(startDate)
        // Fin = après la dernière commission mensuelle
        date.setMonth(date.getMonth() + placement.periodMonths - 1)
        return date
      })()

      commissions.push({
        placementId: placement.id,
        dueDate: endDate,
        amount: calculateTotalCommissions(placement.amount, placement.rate, placement.periodMonths),
        status: 'Due',
        createdBy: adminId,
        updatedBy: adminId,
      })
    }

    // Créer toutes les commissions
    if (commissions.length > 0) {
      await this.placementRepository.createCommissions(placement.id, commissions)
      await this.recalculatePlacementCommissionStatus(placement.id)
    }
  }

  async updatePlacement(id: string, data: Partial<Placement>, adminId: string): Promise<Placement> {
    const amount = data.amount !== undefined ? this.validatePlacementAmount(data.amount) : undefined
    const rate = data.rate !== undefined ? this.validatePlacementRate(data.rate) : undefined
    const periodMonths = data.periodMonths !== undefined
      ? this.validatePlacementPeriod(data.periodMonths)
      : undefined
    let computed = {}
    if (data.startDate || data.periodMonths || data.payoutMode) {
      const existing = await this.placementRepository.getById(id)
      const base = existing || {} as Placement
      const dates = this.computeDates({
        startDate: data.startDate ?? base.startDate,
        periodMonths: periodMonths ?? base.periodMonths,
        payoutMode: data.payoutMode ?? base.payoutMode,
      })
      computed = {
        startDate: dates.startDate,
        endDate: dates.endDate,
        nextCommissionDate: dates.nextCommissionDate,
      }
    }

    return this.placementRepository.update(id, { 
      ...data,
      ...computed,
      amount,
      rate,
      periodMonths,
      updatedBy: adminId 
    })
  }

  async listPlacements(opts: { statuses?: Placement['status'][]; payoutMode?: Placement['payoutMode'] } = {}): Promise<Placement[]> {
    return this.placementRepository.getAll(opts)
  }

  async getPlacement(id: string): Promise<Placement | null> {
    return this.placementRepository.getById(id)
  }

  async deletePlacement(id: string): Promise<void> {
    await this.placementRepository.delete(id)
  }

  async listCommissions(placementId: string): Promise<CommissionPaymentPlacement[]> {
    return this.placementRepository.listCommissions(placementId)
  }

  async payCommission(placementId: string, commissionId: string, data: Partial<CommissionPaymentPlacement>, adminId: string): Promise<CommissionPaymentPlacement> {
    const existing = (await this.placementRepository.listCommissions(placementId)).find(c => c.id === commissionId)
    if (!existing) throw new Error('Commission introuvable')

    const nextStatus = data.status ?? 'Paid'
    const paidAmount = nextStatus === 'Paid'
      ? roundFcfa(data.paidAmount ?? existing.amount)
      : data.paidAmount

    const commission = await this.placementRepository.updateCommission(placementId, commissionId, {
      ...data,
      amount: roundFcfa(existing.amount),
      paidAmount,
      status: nextStatus,
      paidAt: data.paidAt ?? new Date(),
      updatedBy: adminId,
    })

    await this.recalculatePlacementCommissionStatus(placementId)
    
    return commission
  }

  /**
   * Calcule automatiquement la commission due et le montant à verser en cas de retrait anticipé
   * Règle : Si la remise se fait après un mois, commission d'un mois, sinon 0 commission
   */
  private calculateEarlyExitAmountsForPlacement(
    placement: Placement,
    effectiveDate: Date
  ): { commissionDue: number; payoutAmount: number } {
    if (Number.isNaN(effectiveDate.getTime())) {
      throw new Error('La date effective du retrait est invalide')
    }

    const startDate = new Date(placement.startDate || placement.createdAt)
    if (Number.isNaN(startDate.getTime())) {
      throw new Error('La date de début du placement est invalide')
    }

    const yearsDiff = effectiveDate.getFullYear() - startDate.getFullYear()
    const monthsDiff = effectiveDate.getMonth() - startDate.getMonth()
    const daysDiff = effectiveDate.getDate() - startDate.getDate()

    let monthsElapsed = yearsDiff * 12 + monthsDiff
    if (daysDiff < 0) monthsElapsed--

    const monthlyCommissionAmount = calculateMonthlyCommission(placement.amount, placement.rate)
    const commissionDue = monthsElapsed >= 1 ? monthlyCommissionAmount : 0
    const payoutAmount = roundFcfa(placement.amount) + commissionDue

    return { commissionDue, payoutAmount: roundFcfa(payoutAmount) }
  }

  async calculateEarlyExitAmounts(
    placementId: string,
    effectiveDate: Date = new Date()
  ): Promise<{ commissionDue: number; payoutAmount: number }> {
    const placement = await this.placementRepository.getById(placementId)
    if (!placement) {
      throw new Error('Placement introuvable')
    }
    return this.calculateEarlyExitAmountsForPlacement(placement, effectiveDate)
  }

  async requestEarlyExit(
    placementId: string,
    payload: Pick<EarlyExitPlacement, 'commissionDue' | 'payoutAmount'> & {
      reason?: string
      withdrawalAmount?: number
      withdrawalDate?: string
      withdrawalTime?: string
      withdrawalProof?: File
      documentPdf?: File
      paymentMode?: EarlyExitPlacement['paymentMode']
      withFees?: boolean
      paymentMethodOther?: string
      paymentDate?: Date
    },
    benefactorId: string,
    adminId: string
  ): Promise<EarlyExitPlacement> {
    const placement = await this.placementRepository.getById(placementId)
    if (!placement) throw new Error('Placement introuvable')
    if (placement.status !== 'Active') {
      throw new Error('Seul un placement actif peut faire l’objet d’une sortie anticipée')
    }

    const effectiveDate = payload.withdrawalDate
      ? new Date(`${payload.withdrawalDate}T${payload.withdrawalTime || '00:00'}`)
      : payload.paymentDate
        ? new Date(payload.paymentDate)
        : new Date()
    if (Number.isNaN(effectiveDate.getTime())) {
      throw new Error('La date effective du retrait est invalide')
    }

    const placementStartDate = new Date(placement.startDate || placement.createdAt)
    if (effectiveDate.getTime() < placementStartDate.getTime()) {
      throw new Error('La date effective du retrait ne peut pas précéder le début du placement')
    }

    // Les montants soumis sont indicatifs : seuls ceux recalculés ici à la date
    // effective font foi et sont persistés. Le client ne peut donc pas imposer
    // une commission ou une restitution partielle, et un écart d'affichage (date
    // saisie ≠ date du jour, valeur en cache) ne bloque pas l'enregistrement.
    const calculatedAmounts = this.calculateEarlyExitAmountsForPlacement(placement, effectiveDate)

    let withdrawalProofDocumentId: string | undefined
    let documentPdfId: string | undefined

    if (payload.withdrawalProof) {
      const validProofTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validProofTypes.includes(payload.withdrawalProof.type)) {
        throw new Error('La preuve du retrait doit être une image (JPEG, PNG, WebP)')
      }
      if (payload.withdrawalProof.size > 20 * 1024 * 1024) {
        throw new Error('La preuve du retrait ne doit pas dépasser 20MB')
      }

      const { url, path, size } = await this.documentRepository.uploadDocumentFile(
        payload.withdrawalProof,
        benefactorId,
        'PLACEMENT_EARLY_EXIT_PROOF'
      )

      const now = new Date()
      const day = String(now.getDate()).padStart(2, '0')
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const year = String(now.getFullYear()).slice(-2)
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const customProofId = `MK_PLACEMENT_EARLY_EXIT_PROOF_${placementId.slice(-8).toUpperCase()}_${day}${month}${year}_${hours}${minutes}`

      const proofDocument = await this.documentRepository.createDocument(
        {
          type: 'PLACEMENT_EARLY_EXIT_PROOF',
          format: 'image',
          libelle: `Preuve image retrait anticipé - Placement ${placementId}`,
          path,
          url,
          size,
          memberId: benefactorId,
          contractId: placementId,
          createdBy: adminId,
          updatedBy: adminId,
        },
        customProofId
      )

      if (!proofDocument?.id) {
        throw new Error('Erreur lors de la création de la preuve de retrait')
      }

      withdrawalProofDocumentId = proofDocument.id
    }

    // Téléverser le document PDF si fourni
    if (payload.documentPdf) {
      const { url, path, size } = await this.documentRepository.uploadDocumentFile(
        payload.documentPdf,
        benefactorId,
        'PLACEMENT_EARLY_EXIT_DOCUMENT'
      )

      // Générer un ID personnalisé incluant le placementId
      const now = new Date()
      const day = String(now.getDate()).padStart(2, '0')
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const year = String(now.getFullYear()).slice(-2)
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const customDocumentId = `MK_PLACEMENT_EARLY_EXIT_DOCUMENT_${placementId.slice(-8).toUpperCase()}_${day}${month}${year}_${hours}${minutes}`

      const document = await this.documentRepository.createDocument(
        {
          type: 'PLACEMENT_EARLY_EXIT_DOCUMENT',
          format: 'pdf',
          libelle: `Document de retrait anticipé signé - Placement ${placementId}`,
          path,
          url,
          size,
          memberId: benefactorId,
          contractId: placementId,
          createdBy: adminId,
          updatedBy: adminId,
        },
        customDocumentId
      )

      if (!document?.id) {
        throw new Error('Erreur lors de la création du document PDF')
      }

      documentPdfId = document.id
    }

    const effectiveWithdrawalAmount = calculatedAmounts.payoutAmount
    const effectiveWithdrawalDate = payload.withdrawalDate ? effectiveDate : undefined
    const effectivePaymentDate = payload.paymentDate ? new Date(payload.paymentDate) : effectiveDate

    const earlyExit = await this.placementRepository.saveEarlyExit(placementId, {
      placementId,
      commissionDue: calculatedAmounts.commissionDue,
      payoutAmount: effectiveWithdrawalAmount,
      withdrawalAmount: effectiveWithdrawalAmount,
      withdrawalDate: effectiveWithdrawalDate,
      withdrawalTime: payload.withdrawalTime,
      paymentMode: payload.paymentMode,
      withFees: payload.withFees,
      paymentMethodOther: payload.paymentMethodOther,
      paymentDate: effectivePaymentDate,
      reason: payload.reason?.trim(),
      withdrawalProofDocumentId,
      documentPdfId,
      requestedAt: new Date(),
      createdBy: adminId,
    })
    await this.placementRepository.update(placementId, { status: 'EarlyExit', updatedBy: adminId } as any)

    const dueCommissions = (await this.placementRepository.listCommissions(placementId))
      .filter(commission => commission.status === 'Due')
    await Promise.all(
      dueCommissions.map(commission =>
        this.placementRepository.updateCommission(placementId, commission.id, {
          status: 'Canceled',
          updatedBy: adminId,
        })
      )
    )
    await this.recalculatePlacementCommissionStatus(placementId)

    // Notifier la demande de retrait anticipé
    await this.notifyEarlyExitRequest(placementId, earlyExit, adminId)
    // Générer et attacher automatiquement l'avenant de retrait anticipé
    try {
      await this.generateEarlyExitAddendum(placementId, adminId)
    } catch (err) {
      console.error('Erreur lors de la génération automatique de l\'avenant de retrait anticipé', err)
    }

    return earlyExit
  }

  async getEarlyExit(placementId: string): Promise<EarlyExitPlacement | null> {
    return this.placementRepository.getEarlyExit(placementId)
  }

  /**
   * Upload un document de placement (contrat, preuve de commission, quittance)
   */
  async uploadPlacementDocument(
    file: File,
    placementId: string,
    benefactorId: string,
    documentType: PlacementDocumentType,
    adminId: string
  ): Promise<{ documentId: string; placement: Placement }> {
    // Verrou : si au moins une commission payée, on bloque la modification du contrat
    if (documentType === 'PLACEMENT_CONTRACT') {
      const commissions = await this.placementRepository.listCommissions(placementId)
      const hasPaid = commissions.some(c => c.status === 'Paid')
      if (hasPaid) {
        throw new Error('Contrat verrouillé après le premier paiement de commission')
      }
    }

    // 1. Upload du fichier vers Firebase Storage avec chemin spécifique aux placements
    const timestamp = Date.now()
    const fileName = `${timestamp}_${documentType}_${file.name}`
    
    // Utiliser uploadDocumentFile mais adapter le chemin après
    const { url, path, size } = await this.documentRepository.uploadDocumentFile(file, benefactorId, documentType)
    
    // 2. Générer l'ID personnalisé pour les contrats de placement au format MK_BF_matriculeMembre_date_heure
    let customDocumentId: string | undefined
    if (documentType === 'PLACEMENT_CONTRACT') {
      const member = await this.memberRepository.getMemberById(benefactorId)
      if (!member) {
        throw new Error('Membre bienfaiteur introuvable')
      }
      // Récupérer le matricule et le formater avec padding à 4 chiffres
      let matricule = member.matricule || member.id || benefactorId
      // Extraire uniquement les chiffres du matricule et formater à 4 chiffres
      const matriculeDigits = matricule.replace(/\D/g, '') // Garder uniquement les chiffres
      // Si pas de chiffres trouvés, utiliser les 4 derniers caractères de l'ID
      matricule = matriculeDigits.length > 0 
        ? matriculeDigits.padStart(4, '0') // Padding à 4 chiffres avec des zéros à gauche
        : String(member.id || benefactorId).slice(-4).padStart(4, '0')
      
      const now = new Date()
      const day = String(now.getDate()).padStart(2, '0')
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const year = String(now.getFullYear()).slice(-2)
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      // Format: MK_BF_matriculeMembre_ddMMyy_HHmm (ex: MK_BF_0001_111225_1705)
      customDocumentId = `MK_BF_${matricule}_${day}${month}${year}_${hours}${minutes}`
      
    }
    
    // 3. Créer l'enregistrement du document dans Firestore
    const documentData: Omit<import('@/types/types').Document, 'id' | 'createdAt' | 'updatedAt'> = {
      type: documentType,
      format: 'pdf',
      libelle: `Document placement - ${documentType} - ${placementId}`,
      path: path,
      url: url,
      size: size,
      memberId: benefactorId,
      contractId: placementId, // Utiliser contractId pour référencer le placement
      createdBy: adminId,
      updatedBy: adminId,
    }

    const document = await this.documentRepository.createDocument(documentData, customDocumentId)

    if (!document || !document.id) {
      throw new Error('Erreur lors de la création du document')
    }

    // 3. Mettre à jour le placement avec l'ID du document selon le type
    const updateData: Partial<Placement> = { updatedBy: adminId }
    const existingPlacement = await this.placementRepository.getById(placementId)
    
    if (documentType === 'PLACEMENT_CONTRACT') {
      updateData.contractDocumentId = document.id
      // Règle métier : dès que le contrat est téléversé pour un brouillon, le placement passe à "Active"
      if (existingPlacement?.status === 'Draft') {
        updateData.status = 'Active'
      }
    }

    const updatedPlacement = await this.placementRepository.update(placementId, updateData)

    // Si on vient d'activer un placement (passage de Draft -> Active), générer les commissions
    if (documentType === 'PLACEMENT_CONTRACT' && existingPlacement?.status === 'Draft') {
      await this.generateCommissions(updatedPlacement, adminId)
      
      // Notifier l'activation du placement
      await this.notifyPlacementActivated(updatedPlacement, adminId)
      
      // Planifier les notifications d'échéance de commissions
      await this.scheduleCommissionReminders(updatedPlacement, adminId)
    }

    return {
      documentId: document.id,
      placement: updatedPlacement
    }
  }

  /**
   * Upload une preuve de commission (image ou PDF)
   */
  async uploadCommissionProof(
    file: File,
    placementId: string,
    commissionId: string,
    benefactorId: string,
    adminId: string
  ): Promise<{ documentId: string; commission: CommissionPaymentPlacement }> {
    // Upload du document (peut être image ou PDF)
    const { url, path, size } = await this.documentRepository.uploadDocumentFile(file, benefactorId, 'PLACEMENT_COMMISSION_PROOF')
    
    // Déterminer le format selon le type de fichier
    const format: 'pdf' | 'image' = file.type.startsWith('image/') ? 'image' : 'pdf'
    
    // Créer le document
    const document = await this.documentRepository.createDocument({
      type: 'PLACEMENT_COMMISSION_PROOF',
      format,
      libelle: `Preuve commission - Placement ${placementId} - Commission ${commissionId}`,
      path,
      url,
      size,
      memberId: benefactorId,
      contractId: placementId,
      createdBy: adminId,
      updatedBy: adminId,
    })

    if (!document?.id) {
      throw new Error('Erreur lors de la création du document')
    }

    // Mettre à jour la commission avec le documentId
    const commission = await this.placementRepository.updateCommission(placementId, commissionId, {
      proofDocumentId: document.id,
      updatedBy: adminId,
    })

    return { documentId: document.id, commission }
  }

  /**
   * Payer une commission avec upload de preuve
   */
  async payCommissionWithProof(
    placementId: string,
    commissionId: string,
    proofFile: File,
    benefactorId: string,
    paidDate: Date,
    adminId: string,
    paymentMeta: {
      paidAmount: number
      paymentMode?: import('@/types/types').PaymentMode
      withFees?: boolean
      paymentMethodOther?: string
    }
  ): Promise<{ documentId: string; commission: CommissionPaymentPlacement }> {
    if (paymentMeta?.paidAmount === undefined) {
      throw new Error('Le montant payé est requis')
    }

    const placement = await this.placementRepository.getById(placementId)
    if (!placement) throw new Error('Placement introuvable')
    if (placement.status !== 'Active') {
      throw new Error('Les commissions ne peuvent être payées que sur un placement actif')
    }

    const existingCommission = (await this.placementRepository.listCommissions(placementId))
      .find(item => item.id === commissionId)
    if (!existingCommission) throw new Error('Commission introuvable')
    if (existingCommission.status !== 'Due') {
      throw new Error('Cette commission n’est plus à payer')
    }

    const dueAmount = roundFcfa(existingCommission.amount)
    const paidAmount = roundFcfa(paymentMeta.paidAmount)
    if (paidAmount !== dueAmount) {
      throw new Error(`Le montant payé doit être exactement de ${dueAmount} FCFA`)
    }

    // Upload de la preuve
    const { documentId } = await this.uploadCommissionProof(proofFile, placementId, commissionId, benefactorId, adminId)

    const commissionUpdate: Partial<CommissionPaymentPlacement> = {
      amount: dueAmount,
      paidAmount,
      status: 'Paid',
      paidAt: paidDate,
      paymentRecordedBy: adminId,
      paymentRecordedAt: new Date(),
      proofDocumentId: documentId,
      receiptDocumentId: documentId, // on utilise le même document comme reçu
      updatedBy: adminId,
    }

    if (paymentMeta.paymentMode) {
      commissionUpdate.paymentMode = paymentMeta.paymentMode
    }
    if (
      (paymentMeta?.paymentMode === 'airtel_money' || paymentMeta?.paymentMode === 'mobicash') &&
      (paymentMeta.withFees === true || paymentMeta.withFees === false)
    ) {
      commissionUpdate.withFees = paymentMeta.withFees
    }
    if (paymentMeta?.paymentMode === 'other' && paymentMeta.paymentMethodOther?.trim()) {
      commissionUpdate.paymentMethodOther = paymentMeta.paymentMethodOther.trim()
    }

    // Mettre à jour la commission avec le statut Paid et la date
    const commission = await this.placementRepository.updateCommission(placementId, commissionId, commissionUpdate)

    await this.recalculatePlacementCommissionStatus(placementId)

    return { documentId, commission }
  }

  /**
   * Upload une quittance de retrait anticipé
   */
  async uploadEarlyExitQuittance(
    file: File,
    placementId: string,
    benefactorId: string,
    adminId: string
  ): Promise<{ documentId: string; earlyExit: EarlyExitPlacement }> {
    const { url, path, size } = await this.documentRepository.uploadDocumentFile(file, benefactorId, 'PLACEMENT_EARLY_EXIT_QUITTANCE')
    
    // Générer un ID personnalisé incluant le placementId pour faciliter la recherche
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const customDocumentId = `MK_PLACEMENT_EARLY_EXIT_QUITTANCE_${placementId.slice(-8)}_${day}${month}${year}_${hours}${minutes}`
    
    const document = await this.documentRepository.createDocument({
      type: 'PLACEMENT_EARLY_EXIT_QUITTANCE',
      format: 'pdf',
      libelle: `Quittance retrait anticipé - Placement ${placementId}`,
      path,
      url,
      size,
      memberId: benefactorId,
      contractId: placementId,
      createdBy: adminId,
      updatedBy: adminId,
    }, customDocumentId)

    if (!document?.id) {
      throw new Error('Erreur lors de la création du document')
    }

    // Mettre à jour le retrait anticipé avec le documentId
    const existingEarlyExit = await this.placementRepository.getEarlyExit(placementId)
    if (!existingEarlyExit) {
      throw new Error('Retrait anticipé introuvable')
    }

    // Utiliser saveEarlyExit pour mettre à jour avec le documentId
    const { id, createdAt, updatedAt, ...earlyExitData } = existingEarlyExit
    const earlyExit = await this.placementRepository.saveEarlyExit(placementId, {
      ...earlyExitData,
      quittanceDocumentId: document.id,
      updatedBy: adminId,
    })

    // Mettre à jour le placement avec l'ID de quittance
    await this.placementRepository.update(placementId, {
      earlyExitQuittanceDocumentId: document.id,
      updatedBy: adminId,
    } as any)

    return { documentId: document.id, earlyExit }
  }

  /**
   * Upload une quittance finale de placement
   */
  async uploadFinalQuittance(
    file: File,
    placementId: string,
    benefactorId: string,
    adminId: string
  ): Promise<{ documentId: string }> {
    const { url, path, size } = await this.documentRepository.uploadDocumentFile(file, benefactorId, 'PLACEMENT_FINAL_QUITTANCE')

    // Générer un ID personnalisé incluant le placementId pour faciliter la recherche
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const customDocumentId = `MK_PLACEMENT_FINAL_QUITTANCE_${placementId.slice(-8)}_${day}${month}${year}_${hours}${minutes}`

    const document = await this.documentRepository.createDocument({
      type: 'PLACEMENT_FINAL_QUITTANCE',
      format: 'pdf',
      libelle: `Quittance finale - Placement ${placementId}`,
      path,
      url,
      size,
      memberId: benefactorId,
      contractId: placementId,
      createdBy: adminId,
      updatedBy: adminId,
    }, customDocumentId)

    if (!document?.id) {
      throw new Error('Erreur lors de la création de la quittance finale')
    }

    await this.placementRepository.update(placementId, {
      finalQuittanceDocumentId: document.id,
      updatedBy: adminId,
    } as any)

    return { documentId: document.id }
  }

  /**
   * Génère automatiquement une quittance finale (PDF) et l'attache
   */
  async generateFinalQuittance(
    placementId: string,
    adminId: string
  ): Promise<{ documentId: string }> {
    const placement = await this.placementRepository.getById(placementId)
    if (!placement) throw new Error('Placement introuvable')

    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('QUITTANCE FINALE', 105, 20, { align: 'center' })
    doc.setFontSize(11)
    doc.text(`Placement #${placement.id}`, 14, 40)
    doc.text(`Bienfaiteur: ${placement.benefactorName || placement.benefactorId}`, 14, 48)
    doc.text(`Montant capital: ${this.formatAmountForPdf(placement.amount)} FCFA`, 14, 56)
    doc.text(`Durée: ${placement.periodMonths} mois`, 14, 64)
    if (placement.endDate) {
      doc.text(`Date de fin: ${new Date(placement.endDate).toLocaleDateString('fr-FR')}`, 14, 72)
    }
    const blob = doc.output('blob')
    const fileName = `QUITTANCE_FINALE_${placement.id.slice(-6)}.pdf`
    const file = new File([blob], fileName, { type: 'application/pdf' })
    return this.uploadFinalQuittance(file, placementId, placement.benefactorId, adminId)
  }

  /**
   * Upload un avenant de retrait anticipé
   */
  async uploadEarlyExitAddendum(
    file: File,
    placementId: string,
    benefactorId: string,
    adminId: string
  ): Promise<{ documentId: string }> {
    const { url, path, size } = await this.documentRepository.uploadDocumentFile(file, benefactorId, 'PLACEMENT_EARLY_EXIT_ADDENDUM')

    // Générer un ID personnalisé incluant le placementId pour faciliter la recherche
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const customDocumentId = `MK_PLACEMENT_EARLY_EXIT_ADDENDUM_${placementId.slice(-8)}_${day}${month}${year}_${hours}${minutes}`

    const document = await this.documentRepository.createDocument({
      type: 'PLACEMENT_EARLY_EXIT_ADDENDUM',
      format: 'pdf',
      libelle: `Avenant retrait anticipé - Placement ${placementId}`,
      path,
      url,
      size,
      memberId: benefactorId,
      contractId: placementId,
      createdBy: adminId,
      updatedBy: adminId,
    }, customDocumentId)

    if (!document?.id) {
      throw new Error('Erreur lors de la création de l\'avenant de retrait anticipé')
    }

    await this.placementRepository.update(placementId, {
      earlyExitAddendumDocumentId: document.id,
      updatedBy: adminId,
    } as any)

    return { documentId: document.id }
  }

  /**
   * Clôturer un placement (remboursement final) et attacher la quittance finale
   */
  async closePlacement(
    placementId: string,
    file: File,
    closingReason: string,
    adminId: string
  ): Promise<Placement> {
    const placement = await this.placementRepository.getById(placementId)
    if (!placement) throw new Error('Placement introuvable')
    if (placement.status !== 'Active') {
      throw new Error('Seul un placement actif peut être clôturé normalement')
    }

    const commissions = await this.placementRepository.listCommissions(placementId)
    const unpaidCommissions = commissions.filter(commission => commission.status !== 'Paid')
    if (unpaidCommissions.length > 0) {
      throw new Error('Toutes les commissions doivent être payées avant la clôture')
    }

    // Valider le motif de clôture
    if (!closingReason || closingReason.trim().length < 10) {
      throw new Error('Le motif de clôture est requis (minimum 10 caractères)')
    }

    // Valider que le fichier est fourni
    if (!file) {
      throw new Error('La quittance finale est requise')
    }

    // Valider le type de fichier
    if (file.type !== 'application/pdf') {
      throw new Error('Le fichier doit être un PDF')
    }

    // Valider la taille du fichier (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('La taille du fichier ne peut pas dépasser 10MB')
    }

    // Téléverser la quittance finale
    const { documentId } = await this.uploadFinalQuittance(file, placementId, placement.benefactorId, adminId)

    const capitalRepaidAt = new Date()
    const updated = await this.placementRepository.update(placementId, {
      status: 'Closed',
      finalQuittanceDocumentId: documentId,
      closingReason: closingReason.trim(),
      capitalRepaidAmount: roundFcfa(placement.amount),
      capitalRepaidAt,
      updatedBy: adminId,
      updatedAt: new Date(),
    })

    await this.notifyPlacementCompleted(updated, adminId)

    return updated
  }

  /**
   * Génère et attache automatiquement l'avenant de retrait anticipé (PDF)
   */
  async generateEarlyExitAddendum(
    placementId: string,
    adminId: string
  ): Promise<{ documentId: string }> {
    const placement = await this.placementRepository.getById(placementId)
    if (!placement) throw new Error('Placement introuvable')
    const earlyExit = await this.placementRepository.getEarlyExit(placementId)
    if (!earlyExit) throw new Error('Retrait anticipé introuvable')

    // Génération simplifiée de l'avenant en PDF (texte de base)
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('AVENANT DE RETRAIT ANTICIPÉ', 105, 20, { align: 'center' })
    doc.setFontSize(11)
    doc.text(`Placement #${placement.id}`, 14, 40)
    doc.text(`Bienfaiteur: ${placement.benefactorName || placement.benefactorId}`, 14, 48)
    doc.text(`Montant: ${this.formatAmountForPdf(placement.amount)} FCFA`, 14, 56)
    doc.text(`Période: ${placement.periodMonths} mois`, 14, 64)
    doc.text(`Demande de retrait: ${earlyExit.requestedAt.toLocaleDateString()}`, 14, 72)
    doc.text(`Commission due: ${this.formatAmountForPdf(earlyExit.commissionDue)} FCFA`, 14, 80)
    doc.text(`Montant à verser: ${this.formatAmountForPdf(earlyExit.payoutAmount)} FCFA`, 14, 88)

    const blob = doc.output('blob')
    const fileName = `AVENANT_SORTIE_${placement.id.slice(-6)}.pdf`
    const file = new File([blob], fileName, { type: 'application/pdf' })

    const res = await this.uploadEarlyExitAddendum(file, placementId, placement.benefactorId, adminId)
    return { documentId: res.documentId }
  }

  /**
   * Rattacher un document existant à un placement
   */
  async attachExistingDocument(
    placementId: string,
    documentId: string,
    documentType: PlacementDocumentType,
    adminId: string
  ): Promise<Placement> {
    const updateData: Partial<Placement> = { updatedBy: adminId }
    
    if (documentType === 'PLACEMENT_CONTRACT') {
      updateData.contractDocumentId = documentId
    }

    return this.placementRepository.update(placementId, updateData)
  }

  /**
   * Calcule les statistiques complètes des placements
   */
  async getPlacementStats(): Promise<{
    total: number
    totalAmount: number
    draft: number
    active: number
    closed: number
    earlyExit: number
    canceled: number
    commissionsDue: number
    commissionsPaid: number
    totalCommissionsAmount: number
    paidCommissionsAmount: number
    payoutModeDistribution: Record<PayoutMode, number>
    topBenefactors: Array<{ benefactorId: string; totalAmount: number; placementCount: number }>
  }> {
    const placements = await this.placementRepository.getAll()
    
    const stats = {
      total: placements.length,
      totalAmount: 0,
      draft: 0,
      active: 0,
      closed: 0,
      earlyExit: 0,
      canceled: 0,
      commissionsDue: 0,
      commissionsPaid: 0,
      totalCommissionsAmount: 0,
      paidCommissionsAmount: 0,
      payoutModeDistribution: {
        MonthlyCommission_CapitalEnd: 0,
        CapitalPlusCommission_End: 0,
      } as Record<PayoutMode, number>,
      topBenefactors: [] as Array<{ benefactorId: string; totalAmount: number; placementCount: number }>,
    }

    // Calculer les statistiques de base
    for (const placement of placements) {
      const amount = roundFcfa(placement.amount)
      stats.totalAmount = roundFcfa(stats.totalAmount + amount)
      
      if (placement.status === 'Draft') stats.draft++
      else if (placement.status === 'Active') stats.active++
      else if (placement.status === 'Closed') stats.closed++
      else if (placement.status === 'EarlyExit') stats.earlyExit++
      else if (placement.status === 'Canceled') stats.canceled++

      if (stats.payoutModeDistribution[placement.payoutMode] === undefined) {
        stats.payoutModeDistribution[placement.payoutMode] = 0
      }
      stats.payoutModeDistribution[placement.payoutMode]++
    }

    // Calculer les statistiques des commissions.
    // Chargement en parallèle (au lieu d'un await séquentiel par placement), puis agrégation synchrone.
    const commissionsPerPlacement = await Promise.all(
      placements.map(async (placement) => {
        try {
          return await this.placementRepository.listCommissions(placement.id)
        } catch {
          // Erreur lors du chargement des commissions - continue sans
          return []
        }
      })
    )
    for (const commissions of commissionsPerPlacement) {
      stats.totalCommissionsAmount = roundFcfa(
        stats.totalCommissionsAmount +
        sumCommissionAmounts(commissions, ['Due', 'Paid', 'Partial'])
      )
      stats.paidCommissionsAmount = roundFcfa(
        stats.paidCommissionsAmount + sumPaidCommissionAmounts(commissions)
      )
      for (const commission of commissions) {
        if (commission.status === 'Due') {
          stats.commissionsDue++
        } else if (commission.status === 'Paid') {
          stats.commissionsPaid++
        }
      }
    }

    // Calculer les top bienfaiteurs
    const benefactorMap = new Map<string, { totalAmount: number; placementCount: number }>()
    for (const placement of placements) {
      const amount = roundFcfa(placement.amount)
      const existing = benefactorMap.get(placement.benefactorId) || { totalAmount: 0, placementCount: 0 }
      benefactorMap.set(placement.benefactorId, {
        totalAmount: roundFcfa(existing.totalAmount + amount),
        placementCount: existing.placementCount + 1,
      })
    }
    
    stats.topBenefactors = Array.from(benefactorMap.entries())
      .map(([benefactorId, data]) => ({ benefactorId, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10) // Top 10

    return stats
  }

  /**
   * Recalcule la prochaine échéance due et le flag en retard pour un placement
   */
  private async recalculatePlacementCommissionStatus(placementId: string): Promise<void> {
    const commissions = await this.placementRepository.listCommissions(placementId)
    const due = commissions.filter(c => c.status === 'Due').sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    const nextDue = due[0]?.dueDate || null
    const hasOverdue = due.some(c => c.dueDate.getTime() < Date.now())
    await this.placementRepository.update(placementId, {
      nextCommissionDate: nextDue,
      hasOverdueCommission: hasOverdue,
      updatedAt: new Date(),
    } as any)
  }

  // ========== Méthodes privées de notification ==========

  /**
   * Notifie l'activation d'un placement (contrat téléversé)
   */
  private async notifyPlacementActivated(placement: Placement, adminId: string): Promise<void> {
    try {
      const member = await this.memberRepository.getMemberById(placement.benefactorId) as unknown as User | null
      const memberName = member 
        ? `${member.firstName || ''} ${member.lastName || ''}`.trim() 
        : placement.benefactorName || placement.benefactorId
      const amount = roundFcfa(placement.amount)

      await this.notificationService.createNotification({
        module: 'placement',
        entityId: placement.id,
        type: 'placement_activated',
        title: 'Placement activé',
        message: `Le placement #${placement.id.slice(0, 8)} de ${memberName} a été activé. Montant : ${amount.toLocaleString('fr-FR')} FCFA, Taux : ${placement.rate}%, Période : ${placement.periodMonths} mois.`,
        metadata: {
          placementId: placement.id,
          benefactorId: placement.benefactorId,
          amount,
          rate: placement.rate,
          periodMonths: placement.periodMonths,
          payoutMode: placement.payoutMode,
        },
      })
    } catch {
      // Erreur lors de la création de la notification d'activation - continue sans
    }
  }

  /**
   * Planifie les notifications de rappel pour chaque échéance de commission
   */
  private async scheduleCommissionReminders(placement: Placement, adminId: string): Promise<void> {
    try {
      const commissions = await this.placementRepository.listCommissions(placement.id)
      const member = await this.memberRepository.getMemberById(placement.benefactorId) as unknown as User | null
      const memberName = member 
        ? `${member.firstName || ''} ${member.lastName || ''}`.trim() 
        : placement.benefactorName || placement.benefactorId

      for (const commission of commissions) {
        const commissionAmount = roundFcfa(commission.amount)
        // Créer une notification programmée pour J-3 (3 jours avant l'échéance)
        const reminderDate = new Date(commission.dueDate)
        reminderDate.setDate(reminderDate.getDate() - 3)

        // Ne créer la notification que si la date de rappel est dans le futur
        if (reminderDate > new Date()) {
          await this.notificationService.createNotification({
            module: 'placement',
            entityId: placement.id,
            type: 'commission_due_reminder',
            title: 'Rappel : Échéance de commission',
            message: `Échéance de commission pour le placement #${placement.id.slice(0, 8)} de ${memberName}. Montant : ${commissionAmount.toLocaleString('fr-FR')} FCFA. Date d'échéance : ${commission.dueDate.toLocaleDateString('fr-FR')}.`,
            metadata: {
              placementId: placement.id,
              commissionId: commission.id,
              benefactorId: placement.benefactorId,
              dueDate: commission.dueDate.toISOString(),
              amount: commissionAmount,
              daysBefore: 3,
            },
            scheduledAt: reminderDate,
          })
        }

        // Optionnel : Créer une notification pour le jour J (échéance)
        const dueDate = new Date(commission.dueDate)
        dueDate.setHours(9, 0, 0, 0) // 9h du matin le jour de l'échéance

        if (dueDate > new Date()) {
          await this.notificationService.createNotification({
            module: 'placement',
            entityId: placement.id,
            type: 'commission_due_reminder',
            title: 'Échéance de commission aujourd\'hui',
            message: `Échéance de commission aujourd'hui pour le placement #${placement.id.slice(0, 8)} de ${memberName}. Montant : ${commissionAmount.toLocaleString('fr-FR')} FCFA.`,
            metadata: {
              placementId: placement.id,
              commissionId: commission.id,
              benefactorId: placement.benefactorId,
              dueDate: commission.dueDate.toISOString(),
              amount: commissionAmount,
              daysBefore: 0,
            },
            scheduledAt: dueDate,
          })
        }
      }
    } catch {
      // Erreur lors de la planification des rappels de commission - continue sans
    }
  }

  /**
   * Notifie une demande de retrait anticipé
   */
  private async notifyEarlyExitRequest(
    placementId: string,
    earlyExit: EarlyExitPlacement,
    adminId: string
  ): Promise<void> {
    try {
      const placement = await this.placementRepository.getById(placementId)
      if (!placement) return

      const member = await this.memberRepository.getMemberById(placement.benefactorId) as unknown as User | null
      const memberName = member 
        ? `${member.firstName || ''} ${member.lastName || ''}`.trim() 
        : placement.benefactorName || placement.benefactorId
      const commissionDue = roundFcfa(earlyExit.commissionDue)
      const payoutAmount = roundFcfa(earlyExit.payoutAmount)

      await this.notificationService.createNotification({
        module: 'placement',
        entityId: placementId,
        type: 'early_exit_request',
        title: 'Demande de retrait anticipé',
        message: `Demande de retrait anticipé pour le placement #${placement.id.slice(0, 8)} de ${memberName}. Commission due : ${commissionDue.toLocaleString('fr-FR')} FCFA, Montant à verser : ${payoutAmount.toLocaleString('fr-FR')} FCFA.`,
        metadata: {
          placementId: placement.id,
          earlyExitId: earlyExit.id,
          benefactorId: placement.benefactorId,
          commissionDue,
          payoutAmount,
          requestedAt: earlyExit.requestedAt.toISOString(),
        },
      })
    } catch {
      // Erreur lors de la création de la notification de retrait anticipé - continue sans
    }
  }

  /**
   * Notifie la complétion d'un placement (toutes commissions payées)
   */
  private async notifyPlacementCompleted(placement: Placement, adminId: string): Promise<void> {
    try {
      const member = await this.memberRepository.getMemberById(placement.benefactorId) as unknown as User | null
      const memberName = member 
        ? `${member.firstName || ''} ${member.lastName || ''}`.trim() 
        : placement.benefactorName || placement.benefactorId
      const commissions = await this.placementRepository.listCommissions(placement.id)
      const capitalRepaidAmount = roundFcfa(placement.capitalRepaidAmount ?? placement.amount)
      const paidCommissionsAmount = sumPaidCommissionAmounts(commissions)
      const totalPaidAmount = roundFcfa(capitalRepaidAmount + paidCommissionsAmount)

      await this.notificationService.createNotification({
        module: 'placement',
        entityId: placement.id,
        type: 'placement_completed',
        title: 'Placement terminé',
        message: `Le placement #${placement.id.slice(0, 8)} de ${memberName} est terminé. Capital restitué : ${capitalRepaidAmount.toLocaleString('fr-FR')} FCFA. Commissions versées : ${paidCommissionsAmount.toLocaleString('fr-FR')} FCFA. Total cumulé versé : ${totalPaidAmount.toLocaleString('fr-FR')} FCFA.`,
        metadata: {
          placementId: placement.id,
          benefactorId: placement.benefactorId,
          capitalRepaidAmount,
          paidCommissionsAmount,
          totalPaidAmount,
          completedBy: adminId,
          completedAt: new Date().toISOString(),
        },
      })
    } catch {
      // Erreur lors de la création de la notification de complétion - continue sans
    }
  }

  // ==================== DEMANDES ====================

  async createDemand(data: Omit<PlacementDemand, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<PlacementDemand> {
    // Générer l'ID au format: MK_DEMANDE_PL_{matriculeBienfaiteur}_{date}_{heure}
    let matriculeFormatted = "0000";
    let benefactorName = "Bienfaiteur inconnu";
    
    if (data.benefactorId) {
      const member = await this.memberRepository.getMemberById(data.benefactorId);
      if (member && member.matricule) {
        const matriculePart = member.matricule.split('.')[0] || member.matricule.replace(/[^0-9]/g, '').slice(0, 4);
        matriculeFormatted = matriculePart.padStart(4, '0');
        benefactorName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
      }
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const dateFormatted = `${day}${month}${year}`;
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hours}${minutes}`;

    const customId = `MK_DEMANDE_PL_${matriculeFormatted}_${dateFormatted}_${timeFormatted}`;

    // Enrichir les données avec les informations du bienfaiteur
    const member = await this.memberRepository.getMemberById(data.benefactorId);
    const benefactorNameFull = member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : undefined;
    const benefactorPhone = member && Array.isArray(member.contacts) && member.contacts.length > 0 ? member.contacts[0] : undefined;

    const demandData = {
      ...data,
      benefactorName: benefactorNameFull || data.benefactorName,
      benefactorPhone: benefactorPhone || data.benefactorPhone,
      status: 'PENDING' as const,
      createdBy: adminId,
    };

    const demand = await this.placementDemandRepository.createDemand(demandData, customId);
    
    // Notification pour tous les admins
    try {
      const admin = await this.adminRepository.getAdminById(adminId);
      const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;
      
      await this.notificationService.createNotification({
        module: 'placement',
        entityId: demand.id,
        type: 'placement_demand_created' as any,
        title: 'Nouvelle demande de placement',
        message: `Une nouvelle demande a été créée par ${adminName} pour ${benefactorNameFull || 'Bienfaiteur inconnu'}`,
        metadata: {
          demandId: demand.id,
          benefactorId: data.benefactorId,
          amount: data.amount,
          rate: data.rate,
          periodMonths: data.periodMonths,
          payoutMode: data.payoutMode,
          desiredDate: data.desiredDate,
          createdBy: adminId,
        },
      });
    } catch {
      // Erreur lors de la création de la notification - continue sans
    }
    
    return demand;
  }

  async getDemandById(id: string): Promise<PlacementDemand | null> {
    return await this.placementDemandRepository.getDemandById(id);
  }

  async getDemandsWithFilters(filters?: PlacementDemandFilters): Promise<PlacementDemand[]> {
    return await this.placementDemandRepository.getDemandsWithFilters(filters);
  }

  async getDemandsStats(filters?: PlacementDemandFilters): Promise<PlacementDemandStats> {
    return await this.placementDemandRepository.getDemandsStats(filters);
  }

  async approveDemand(demandId: string, adminId: string, reason: string): Promise<PlacementDemand | null> {
    // Récupérer le nom de l'admin
    const admin = await this.adminRepository.getAdminById(adminId);
    const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

    const demand = await this.placementDemandRepository.updateDemandStatus(
      demandId,
      'APPROVED',
      adminId,
      reason,
      adminName
    );

    if (demand) {
      // Récupérer le nom du bienfaiteur
      let benefactorName = "Bienfaiteur inconnu";
      if (demand.benefactorId) {
        const member = await this.memberRepository.getMemberById(demand.benefactorId);
        if (member) {
          benefactorName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
        }
      }

      // Notification au bienfaiteur et à l'admin créateur
      try {
        await this.notificationService.createNotification({
          module: 'placement',
          entityId: demand.id,
          type: 'placement_demand_approved' as any,
          title: 'Demande de placement acceptée',
          message: `La demande ${demand.id} de ${benefactorName} a été acceptée par ${adminName}.`,
          metadata: {
            demandId: demand.id,
            decisionMadeBy: adminId,
            decisionMadeByName: adminName,
            decisionReason: reason,
            decisionMadeAt: new Date().toISOString(),
            benefactorId: demand.benefactorId,
          },
        });

        // Notification membre
        if (demand.benefactorId) {
          void this.notificationService.notifyMember({
            recipientId: demand.benefactorId,
            module: 'placement',
            entityId: demand.id,
            type: 'placement_demand_approved' as any,
            title: 'Demande de placement acceptée',
            message: `Votre demande de placement a été acceptée. Raison : ${reason}`,
            metadata: { demandId: demand.id, decisionReason: reason },
          });
        }

        // Notification à l'admin créateur si différent
        if (demand.createdBy !== adminId) {
          await this.notificationService.createNotification({
            module: 'placement',
            entityId: demand.id,
            type: 'status_update' as any,
            title: 'Demande acceptée',
            message: `La demande ${demand.id} de ${benefactorName} a été acceptée par ${adminName}`,
            metadata: {
              demandId: demand.id,
              decisionMadeBy: adminId,
              decisionMadeByName: adminName,
              decisionReason: reason,
              createdBy: demand.createdBy,
            },
          });
        }
      } catch {
        // Erreur lors de la création de la notification - continue sans
      }
    }

    return demand;
  }

  async rejectDemand(demandId: string, adminId: string, reason: string): Promise<PlacementDemand | null> {
    // Récupérer le nom de l'admin
    const admin = await this.adminRepository.getAdminById(adminId);
    const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

    const demand = await this.placementDemandRepository.updateDemandStatus(
      demandId,
      'REJECTED',
      adminId,
      reason,
      adminName
    );

    if (demand) {
      // Récupérer le nom du bienfaiteur
      let benefactorName = "Bienfaiteur inconnu";
      if (demand.benefactorId) {
        const member = await this.memberRepository.getMemberById(demand.benefactorId);
        if (member) {
          benefactorName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
        }
      }

      // Notification au bienfaiteur et à l'admin créateur
      try {
        await this.notificationService.createNotification({
          module: 'placement',
          entityId: demand.id,
          type: 'placement_demand_rejected' as any,
          title: 'Demande de placement refusée',
          message: `La demande ${demand.id} de ${benefactorName} a été refusée par ${adminName}. Raison : ${reason}`,
          metadata: {
            demandId: demand.id,
            decisionMadeBy: adminId,
            decisionMadeByName: adminName,
            decisionReason: reason,
            decisionMadeAt: new Date().toISOString(),
            benefactorId: demand.benefactorId,
          },
        });

        // Notification membre
        if (demand.benefactorId) {
          void this.notificationService.notifyMember({
            recipientId: demand.benefactorId,
            module: 'placement',
            entityId: demand.id,
            type: 'placement_demand_rejected' as any,
            title: 'Demande de placement refusée',
            message: `Votre demande de placement a été refusée. Raison : ${reason}`,
            metadata: { demandId: demand.id, decisionReason: reason },
          });
        }

        // Notification à l'admin créateur si différent
        if (demand.createdBy !== adminId) {
          await this.notificationService.createNotification({
            module: 'placement',
            entityId: demand.id,
            type: 'status_update' as any,
            title: 'Demande refusée',
            message: `La demande ${demand.id} de ${benefactorName} a été refusée par ${adminName}`,
            metadata: {
              demandId: demand.id,
              decisionMadeBy: adminId,
              decisionMadeByName: adminName,
              decisionReason: reason,
              createdBy: demand.createdBy,
            },
          });
        }
      } catch {
        // Erreur lors de la création de la notification - continue sans
      }
    }

    return demand;
  }

  async reopenDemand(demandId: string, adminId: string, reason: string): Promise<PlacementDemand | null> {
    const demand = await this.getDemandById(demandId);
    if (!demand) {
      throw new Error('Demande introuvable');
    }

    if (demand.status !== 'REJECTED') {
      throw new Error('Seules les demandes refusées peuvent être réouvertes');
    }

    // Récupérer le nom de l'admin
    const admin = await this.adminRepository.getAdminById(adminId);
    const adminName = admin ? `${admin.firstName || ''} ${admin.lastName || ''}`.trim() : adminId;

    // Mettre à jour la demande pour la réouvrir
    const updatedDemand = await this.placementDemandRepository.updateDemand(demandId, {
      status: 'PENDING',
      reopenedAt: new Date(),
      reopenedBy: adminId,
      reopenedByName: adminName,
      reopenReason: reason,
      updatedBy: adminId,
    });

    if (updatedDemand) {
      // Récupérer le nom du bienfaiteur
      let benefactorName = "Bienfaiteur inconnu";
      if (demand.benefactorId) {
        const member = await this.memberRepository.getMemberById(demand.benefactorId);
        if (member) {
          benefactorName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
        }
      }

      // Notification au bienfaiteur et à tous les admins
      try {
        await this.notificationService.createNotification({
          module: 'placement',
          entityId: demand.id,
          type: 'placement_demand_reopened' as any,
          title: 'Demande réouverte',
          message: `Votre demande de placement a été réouverte. Motif : ${reason}`,
          metadata: {
            demandId: demand.id,
            reopenedBy: adminId,
            reopenedByName: adminName,
            reopenReason: reason,
            reopenedAt: new Date().toISOString(),
            benefactorId: demand.benefactorId,
          },
        });

        // Notification globale pour tous les admins
        await this.notificationService.createNotification({
          module: 'placement',
          entityId: demand.id,
          type: 'status_update' as any,
          title: 'Demande réouverte',
          message: `La demande ${demand.id} de ${benefactorName} a été réouverte par ${adminName}`,
          metadata: {
            demandId: demand.id,
            reopenedBy: adminId,
            reopenedByName: adminName,
            reopenReason: reason,
            reopenedAt: new Date().toISOString(),
            benefactorId: demand.benefactorId,
          },
        });
      } catch {
        // Erreur lors de la création de la notification - continue sans
      }
    }

    return updatedDemand;
  }

  async convertDemandToPlacement(demandId: string, adminId: string, placementData?: Partial<Placement>): Promise<{ demand: PlacementDemand; placement: Placement } | null> {
    const demand = await this.getDemandById(demandId);
    if (!demand || demand.status !== 'APPROVED') {
      throw new Error('La demande doit être acceptée pour être convertie en placement');
    }

    if (demand.placementId) {
      throw new Error('Cette demande a déjà été convertie en placement');
    }

    // Créer le placement à partir de la demande
    const placement = await this.createPlacement({
      benefactorId: demand.benefactorId,
      benefactorName: demand.benefactorName,
      benefactorPhone: demand.benefactorPhone,
      urgentContact: demand.urgentContact,
      amount: placementData?.amount || demand.amount,
      rate: placementData?.rate || demand.rate,
      periodMonths: placementData?.periodMonths || demand.periodMonths,
      payoutMode: placementData?.payoutMode || demand.payoutMode,
      startDate: placementData?.startDate || new Date(demand.desiredDate),
      // Champs optionnels : n'ajouter la clé que si la valeur existe, sinon
      // Firestore rejette l'écriture (« Unsupported field value: undefined »).
      ...(placementData?.paymentMode !== undefined ? { paymentMode: placementData.paymentMode } : {}),
      ...(placementData?.withFees !== undefined ? { withFees: placementData.withFees } : {}),
      ...(placementData?.paymentMethodOther !== undefined ? { paymentMethodOther: placementData.paymentMethodOther } : {}),
      ...(placementData?.handoverLocation !== undefined ? { handoverLocation: placementData.handoverLocation } : {}),
      ...(placementData?.handoverDate !== undefined ? { handoverDate: placementData.handoverDate } : {}),
      ...(placementData?.handoverTime !== undefined ? { handoverTime: placementData.handoverTime } : {}),
      createdBy: adminId,
    }, adminId);

    // Mettre à jour la demande pour indiquer qu'elle a été convertie
    const updatedDemand = await this.placementDemandRepository.updateDemand(demandId, {
      status: 'CONVERTED',
      placementId: placement.id,
      updatedBy: adminId,
    });

    if (updatedDemand && placement) {
      // Récupérer le nom du bienfaiteur
      let benefactorName = "Bienfaiteur inconnu";
      if (demand.benefactorId) {
        const member = await this.memberRepository.getMemberById(demand.benefactorId);
        if (member) {
          benefactorName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
        }
      }

      // Notification au bienfaiteur et à tous les admins
      try {
        await this.notificationService.createNotification({
          module: 'placement',
          entityId: placement.id,
          type: 'placement_demand_converted' as any,
          title: 'Placement créé depuis votre demande',
          message: `Votre demande a été convertie en placement. Le placement ${placement.id} est maintenant actif.`,
          metadata: {
            demandId: demand.id,
            placementId: placement.id,
            benefactorId: demand.benefactorId,
            convertedBy: adminId,
          },
        });

        // Notification globale pour tous les admins
        await this.notificationService.createNotification({
          module: 'placement',
          entityId: placement.id,
          type: 'contract_created' as any,
          title: 'Placement créé depuis une demande',
          message: `La demande ${demand.id} de ${benefactorName} a été convertie en placement ${placement.id}`,
          metadata: {
            demandId: demand.id,
            placementId: placement.id,
            benefactorId: demand.benefactorId,
            convertedBy: adminId,
          },
        });
      } catch {
        // Erreur lors de la création de la notification - continue sans
      }
    }

    return updatedDemand && placement ? {
      demand: updatedDemand,
      placement: placement,
    } : null;
  }
}
