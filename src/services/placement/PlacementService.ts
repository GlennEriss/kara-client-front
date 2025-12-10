import type { Placement, CommissionPaymentPlacement, EarlyExitPlacement, PayoutMode, PlacementStatus, CommissionStatus, PlacementDocumentType } from '@/types/types'
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

  async createPlacement(data: Omit<Placement, 'id' | 'createdAt' | 'updatedAt' | 'status'>, adminId: string): Promise<Placement> {
    const placement = await this.placementRepository.create({
      ...data,
      status: 'Draft',
      createdBy: adminId,
      updatedBy: adminId,
    })

    // Si le membre n'a pas encore le rôle Bienfaiteur, l'ajouter
    try {
      const member = await this.memberRepository.getMemberById(data.benefactorId)
      if (member) {
        const roles = member.roles || []
        if (!roles.includes('Bienfaiteur')) {
          await this.memberRepository.updateMemberRoles(member.id as string, [...roles, 'Bienfaiteur'])
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
    }
  }

  async updatePlacement(id: string, data: Partial<Placement>, adminId: string): Promise<Placement> {
    return this.placementRepository.update(id, { ...data, updatedBy: adminId })
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
    payload: Pick<EarlyExitPlacement, 'commissionDue' | 'payoutAmount'>,
    adminId: string
  ): Promise<EarlyExitPlacement> {
    const earlyExit = await this.placementRepository.saveEarlyExit(placementId, {
      placementId,
      commissionDue: payload.commissionDue,
      payoutAmount: payload.payoutAmount,
      requestedAt: new Date(),
      createdBy: adminId,
    })
    await this.placementRepository.update(placementId, { status: 'EarlyExit', updatedBy: adminId } as any)
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
    // 1. Upload du fichier vers Firebase Storage avec chemin spécifique aux placements
    const timestamp = Date.now()
    const fileName = `${timestamp}_${documentType}_${file.name}`
    const filePath = `placements/${placementId}/${fileName}`
    
    // Utiliser uploadDocumentFile mais adapter le chemin après
    const { url, path, size } = await this.documentRepository.uploadDocumentFile(file, benefactorId, documentType)
    
    // 2. Créer l'enregistrement du document dans Firestore
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

    const document = await this.documentRepository.createDocument(documentData)

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
      updatedBy: adminId,
    })

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
    })

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

    return { documentId: document.id, earlyExit }
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
      stats.totalAmount += placement.amount
      
      if (placement.status === 'Draft') stats.draft++
      else if (placement.status === 'Active') stats.active++
      else if (placement.status === 'Closed') stats.closed++
      else if (placement.status === 'EarlyExit') stats.earlyExit++
      else if (placement.status === 'Canceled') stats.canceled++

      stats.payoutModeDistribution[placement.payoutMode]++
    }

    // Calculer les statistiques des commissions
    for (const placement of placements) {
      try {
        const commissions = await this.placementRepository.listCommissions(placement.id)
        stats.totalCommissionsAmount += commissions.reduce((sum, c) => sum + c.amount, 0)
        
        for (const commission of commissions) {
          if (commission.status === 'Due') {
            stats.commissionsDue++
          } else if (commission.status === 'Paid') {
            stats.commissionsPaid++
            stats.paidCommissionsAmount += commission.amount
          }
        }
      } catch (error) {
        console.warn(`Erreur lors du calcul des commissions pour le placement ${placement.id}:`, error)
      }
    }

    // Calculer les top bienfaiteurs
    const benefactorMap = new Map<string, { totalAmount: number; placementCount: number }>()
    for (const placement of placements) {
      const existing = benefactorMap.get(placement.benefactorId) || { totalAmount: 0, placementCount: 0 }
      benefactorMap.set(placement.benefactorId, {
        totalAmount: existing.totalAmount + placement.amount,
        placementCount: existing.placementCount + 1,
      })
    }
    
    stats.topBenefactors = Array.from(benefactorMap.entries())
      .map(([benefactorId, data]) => ({ benefactorId, ...data }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10) // Top 10

    return stats
  }
}

