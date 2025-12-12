import type { Placement, CommissionPaymentPlacement, EarlyExitPlacement, PayoutMode, PlacementStatus, CommissionStatus, PlacementDocumentType, User } from '@/types/types'
import { PlacementRepository } from '@/repositories/placement/PlacementRepository'
import { IMemberRepository } from '@/repositories/members/IMemberRepository'
import { DocumentService } from '@/services/documents/DocumentService'
import { IDocumentRepository } from '@/repositories/documents/IDocumentRepository'

export class PlacementService {
  constructor(
    private placementRepository: PlacementRepository,
    private documentService: DocumentService,
    private documentRepository: IDocumentRepository,
    private memberRepository: IMemberRepository
  ) {}

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
    } catch (error) {
      console.warn('Impossible de récupérer les infos du membre', error)
    }
    return { benefactorName: undefined, benefactorPhone: undefined }
  }

  async createPlacement(data: Omit<Placement, 'id' | 'createdAt' | 'updatedAt' | 'status'>, adminId: string): Promise<Placement> {
    const dates = this.computeDates({
      startDate: data.startDate,
      periodMonths: data.periodMonths,
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
      amount: Number((data as any).amount) || 0,
      rate: Number((data as any).rate) || 0,
      periodMonths: Number((data as any).periodMonths) || 0,
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
    } catch (error) {
      console.warn("Impossible de mettre à jour les rôles du membre pour le placement:", error)
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
    const monthlyCommissionAmount = (placement.amount * placement.rate) / 100

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
        amount: monthlyCommissionAmount * placement.periodMonths,
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
    let computed = {}
    if (data.startDate || data.periodMonths || data.payoutMode) {
      const existing = await this.placementRepository.getById(id)
      const base = existing || {} as Placement
      const dates = this.computeDates({
        startDate: data.startDate ?? base.startDate,
        periodMonths: data.periodMonths ?? base.periodMonths,
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
      amount: data.amount !== undefined ? Number((data as any).amount) || 0 : undefined,
      rate: data.rate !== undefined ? Number((data as any).rate) || 0 : undefined,
      periodMonths: data.periodMonths !== undefined ? Number((data as any).periodMonths) || 0 : undefined,
      updatedBy: adminId 
    })
  }

  async listPlacements(): Promise<Placement[]> {
    return this.placementRepository.getAll()
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
    return this.placementRepository.updateCommission(placementId, commissionId, {
      ...data,
      status: data.status ?? 'Paid',
      paidAt: data.paidAt ?? new Date(),
      updatedBy: adminId,
    })
  }

  /**
   * Calcule automatiquement la commission due et le montant à verser en cas de retrait anticipé
   * Règle : Si la remise se fait après un mois, commission d'un mois, sinon 0 commission
   */
  async calculateEarlyExitAmounts(placementId: string): Promise<{ commissionDue: number; payoutAmount: number }> {
    const placement = await this.placementRepository.getById(placementId)
    if (!placement) {
      throw new Error('Placement introuvable')
    }

    const startDate = new Date(placement.startDate || placement.createdAt)
    const requestDate = new Date()
    
    // Calculer le nombre de mois écoulés de manière plus précise
    const yearsDiff = requestDate.getFullYear() - startDate.getFullYear()
    const monthsDiff = requestDate.getMonth() - startDate.getMonth()
    const daysDiff = requestDate.getDate() - startDate.getDate()
    
    // Nombre total de mois écoulés (en tenant compte des années et des jours)
    let monthsElapsed = yearsDiff * 12 + monthsDiff
    if (daysDiff < 0) {
      monthsElapsed-- // Si on n'a pas encore atteint le jour du mois, on ne compte pas ce mois
    }

    // Calcul de la commission mensuelle
    const monthlyCommissionAmount = (placement.amount * placement.rate) / 100

    // Règle : commission d'un mois si au moins 1 mois écoulé, sinon 0
    const commissionDue = monthsElapsed >= 1 ? monthlyCommissionAmount : 0

    // Montant à verser = capital + commission due
    const payoutAmount = placement.amount + commissionDue

    return { commissionDue, payoutAmount }
  }

  async requestEarlyExit(
    placementId: string,
    payload: Pick<EarlyExitPlacement, 'commissionDue' | 'payoutAmount'> & { reason?: string; documentPdf?: File },
    benefactorId: string,
    adminId: string
  ): Promise<EarlyExitPlacement> {
    let documentPdfId: string | undefined

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

    const earlyExit = await this.placementRepository.saveEarlyExit(placementId, {
      placementId,
      commissionDue: payload.commissionDue,
      payoutAmount: payload.payoutAmount,
      reason: payload.reason,
      documentPdfId,
      requestedAt: new Date(),
      createdBy: adminId,
    })
    await this.placementRepository.update(placementId, { status: 'EarlyExit', updatedBy: adminId } as any)

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
    const filePath = `placements/${placementId}/${fileName}`
    
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
      
      // Log pour débogage
      console.log('🔍 Génération ID contrat placement:', {
        benefactorId,
        memberMatricule: member.matricule,
        memberId: member.id,
        matriculeFormate: matricule,
        customDocumentId,
        date: `${day}${month}${year}`,
        heure: `${hours}${minutes}`
      })
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
    adminId: string
  ): Promise<{ documentId: string; commission: CommissionPaymentPlacement }> {
    // Upload de la preuve
    const { documentId } = await this.uploadCommissionProof(proofFile, placementId, commissionId, benefactorId, adminId)
    
    // Mettre à jour la commission avec le statut Paid et la date
    const commission = await this.placementRepository.updateCommission(placementId, commissionId, {
      status: 'Paid',
      paidAt: paidDate,
      proofDocumentId: documentId,
      receiptDocumentId: documentId, // on utilise le même document comme reçu
      updatedBy: adminId,
    })

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
    doc.text(`Montant capital: ${placement.amount.toLocaleString()} FCFA`, 14, 56)
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

    const updated = await this.placementRepository.update(placementId, {
      status: 'Closed',
      finalQuittanceDocumentId: documentId,
      closingReason: closingReason.trim(),
      updatedBy: adminId,
      updatedAt: new Date(),
    })

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
    doc.text(`Montant: ${placement.amount.toLocaleString()} FCFA`, 14, 56)
    doc.text(`Période: ${placement.periodMonths} mois`, 14, 64)
    doc.text(`Demande de retrait: ${earlyExit.requestedAt.toLocaleDateString()}`, 14, 72)
    doc.text(`Commission due: ${earlyExit.commissionDue.toLocaleString()} FCFA`, 14, 80)
    doc.text(`Montant à verser: ${earlyExit.payoutAmount.toLocaleString()} FCFA`, 14, 88)

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
      const amount = Number((placement as any).amount) || 0
      stats.totalAmount += amount
      
      if (placement.status === 'Draft') stats.draft++
      else if (placement.status === 'Active') stats.active++
      else if (placement.status === 'Closed') stats.closed++
      else if (placement.status === 'EarlyExit') stats.earlyExit++

      if (stats.payoutModeDistribution[placement.payoutMode] === undefined) {
        stats.payoutModeDistribution[placement.payoutMode] = 0
      }
      stats.payoutModeDistribution[placement.payoutMode]++
    }

    // Calculer les statistiques des commissions
    for (const placement of placements) {
      try {
        const commissions = await this.placementRepository.listCommissions(placement.id)
        stats.totalCommissionsAmount += commissions.reduce((sum, c) => sum + (Number((c as any).amount) || 0), 0)
        
        for (const commission of commissions) {
          if (commission.status === 'Due') {
            stats.commissionsDue++
          } else if (commission.status === 'Paid') {
            stats.commissionsPaid++
            stats.paidCommissionsAmount += Number((commission as any).amount) || 0
          }
        }
      } catch (error) {
        console.warn(`Erreur lors du calcul des commissions pour le placement ${placement.id}:`, error)
      }
    }

    // Calculer les top bienfaiteurs
    const benefactorMap = new Map<string, { totalAmount: number; placementCount: number }>()
    for (const placement of placements) {
      const amount = Number((placement as any).amount) || 0
      const existing = benefactorMap.get(placement.benefactorId) || { totalAmount: 0, placementCount: 0 }
      benefactorMap.set(placement.benefactorId, {
        totalAmount: existing.totalAmount + amount,
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
}

