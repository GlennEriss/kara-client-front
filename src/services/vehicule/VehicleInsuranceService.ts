import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { VehicleInsuranceRepository } from '@/repositories/vehicule/VehicleInsuranceRepository'
import { VehicleInsurance, VehicleInsuranceFilters, VehicleInsuranceListResult, VehicleInsuranceStats, VehicleInsuranceStatus } from '@/types/types'
import { VehicleInsuranceFormValues } from '@/schemas/vehicule.schema'

type CreatePayload = VehicleInsuranceFormValues & {
  memberContacts?: string[]
  memberPhotoUrl?: string | null
}

export class VehicleInsuranceService {
  constructor(private readonly repository: VehicleInsuranceRepository = RepositoryFactory.getVehicleInsuranceRepository()) {}

  list(filters?: VehicleInsuranceFilters, page: number = 1, pageSize: number = 12): Promise<VehicleInsuranceListResult> {
    return this.repository.list(filters, page, pageSize)
  }

  getById(id: string): Promise<VehicleInsurance | null> {
    return this.repository.getById(id)
  }

  getByMemberId(memberId: string): Promise<VehicleInsurance | null> {
    return this.repository.getByMemberId(memberId)
  }

  async createInsurance(payload: CreatePayload, adminId: string): Promise<string> {
    const now = new Date()
    const status = this.computeStatus(payload.endDate)
    const memberContacts = payload.holderType === 'member' ? payload.memberContacts || [] : undefined
    const primaryPhone =
      payload.holderType === 'member'
        ? memberContacts && memberContacts.length > 0
          ? memberContacts[0]
          : ''
        : payload.nonMemberPhone1 || ''

    const entity: any = {
      holderType: payload.holderType,
      city: payload.city,
      primaryPhone: primaryPhone || null,
      // Champs pour membre
      memberId: payload.holderType === 'member' ? payload.memberId : undefined,
      memberFirstName: payload.holderType === 'member' ? payload.memberFirstName : undefined,
      memberLastName: payload.holderType === 'member' ? payload.memberLastName : undefined,
      memberMatricule: payload.holderType === 'member' ? payload.memberMatricule : undefined,
      memberContacts,
      memberPhotoUrl: payload.holderType === 'member' ? (payload.memberPhotoUrl || null) : undefined,
      // Champs pour non-membre
      nonMemberFirstName: payload.holderType === 'non-member' ? payload.nonMemberFirstName : undefined,
      nonMemberLastName: payload.holderType === 'non-member' ? payload.nonMemberLastName : undefined,
      nonMemberPhone1: payload.holderType === 'non-member' ? payload.nonMemberPhone1 : undefined,
      nonMemberPhone2: payload.holderType === 'non-member' ? (payload.nonMemberPhone2 || null) : undefined,
      sponsorMemberId: payload.sponsorMemberId || null,
      sponsorName: payload.sponsorName || null,
      sponsorMatricule: payload.sponsorMatricule || null,
      sponsorContacts: payload.sponsorContacts || [],
      vehicleType: payload.vehicleType,
      vehicleBrand: payload.vehicleBrand,
      vehicleModel: payload.vehicleModel,
      vehicleYear: payload.vehicleYear ?? null,
      plateNumber: payload.plateNumber,
      energySource: payload.energySource,
      fiscalPower: payload.fiscalPower,
      insuranceCompany: payload.insuranceCompany,
      policyNumber: payload.policyNumber,
      warrantyMonths: payload.warrantyMonths,
      premiumAmount: payload.premiumAmount,
      currency: payload.currency,
      startDate: payload.startDate,
      endDate: payload.endDate,
      status,
      notes: payload.notes || null,
      attachments: this.normalizeAttachments(payload.attachments),
      renewalCount: 0,
      createdAt: now,
      createdBy: adminId,
      updatedAt: now,
      updatedBy: adminId,
    }

    // Supprimer tous les champs undefined (Firestore n'accepte pas undefined)
    // On garde les null car Firestore les accepte
    const cleanedEntity = this.removeUndefinedFields(entity)

    return this.repository.create(cleanedEntity as Omit<VehicleInsurance, 'id'>)
  }


  async updateInsurance(id: string, updates: Partial<CreatePayload>, adminId: string): Promise<void> {
    const current = await this.repository.getById(id)
    if (!current) {
      throw new Error('Assurance véhicule introuvable')
    }
    const status = updates.endDate ? this.computeStatus(updates.endDate) : current.status
    
    // Extraire attachments pour le normaliser séparément
    const { attachments, holderType, ...restUpdates } = updates
    
    const updatePayload: any = {
      ...restUpdates,
    }

    // Si holderType change, mettre à jour les champs en conséquence
    if (holderType !== undefined) {
      updatePayload.holderType = holderType
      // Si on passe de membre à non-membre, vider les champs membre
      if (holderType === 'non-member' && current.holderType === 'member') {
        updatePayload.memberId = undefined
        updatePayload.memberFirstName = undefined
        updatePayload.memberLastName = undefined
        updatePayload.memberMatricule = undefined
        updatePayload.memberContacts = undefined
        updatePayload.memberPhotoUrl = undefined
      }
      // Si on passe de non-membre à membre, vider les champs non-membre
      if (holderType === 'member' && current.holderType === 'non-member') {
        updatePayload.nonMemberFirstName = undefined
        updatePayload.nonMemberLastName = undefined
        updatePayload.nonMemberPhone1 = undefined
        updatePayload.nonMemberPhone2 = undefined
      }
    }

    // Normaliser les valeurs - utiliser null au lieu de undefined
    if (updates.city !== undefined) {
      updatePayload.city = updates.city
    }
    if (updates.memberContacts !== undefined) {
      updatePayload.memberContacts = updates.memberContacts || []
    }
    if (updates.memberPhotoUrl !== undefined) {
      updatePayload.memberPhotoUrl = updates.memberPhotoUrl || null
    }
    if (updates.nonMemberPhone2 !== undefined) {
      updatePayload.nonMemberPhone2 = updates.nonMemberPhone2 || null
    }
    if (updates.sponsorMemberId !== undefined) {
      updatePayload.sponsorMemberId = updates.sponsorMemberId || null
    }
    if (updates.sponsorName !== undefined) {
      updatePayload.sponsorName = updates.sponsorName || null
    }
    if (updates.sponsorMatricule !== undefined) {
      updatePayload.sponsorMatricule = updates.sponsorMatricule || null
    }
    if (updates.sponsorContacts !== undefined) {
      updatePayload.sponsorContacts = updates.sponsorContacts || []
    }
    if (updates.vehicleYear !== undefined) {
      updatePayload.vehicleYear = updates.vehicleYear ?? null
    }
    if (updates.notes !== undefined) {
      updatePayload.notes = updates.notes || null
    }

    const effectiveHolderType = holderType ?? current.holderType
    const nextMemberContacts = updates.memberContacts ?? current.memberContacts
    const nextNonMemberPhone = updates.nonMemberPhone1 ?? current.nonMemberPhone1
    if (effectiveHolderType === 'member') {
      updatePayload.primaryPhone = nextMemberContacts && nextMemberContacts.length > 0 ? nextMemberContacts[0] : current.primaryPhone || null
    } else {
      updatePayload.primaryPhone = nextNonMemberPhone || current.primaryPhone || null
    }

    updatePayload.status = status
    updatePayload.updatedAt = new Date()
    updatePayload.updatedBy = adminId

    // Normaliser attachments si fourni
    if (attachments !== undefined) {
      updatePayload.attachments = this.normalizeAttachments(attachments)
    }

    // Supprimer tous les champs undefined (Firestore n'accepte pas undefined)
    // On garde les null car Firestore les accepte
    const cleanedPayload = this.removeUndefinedFields(updatePayload)

    await this.repository.update(id, cleanedPayload as Partial<VehicleInsurance>)
  }

  async renewInsurance(id: string, data: { startDate: Date; endDate: Date; premiumAmount: number; policyNumber?: string }, adminId: string): Promise<void> {
    const current = await this.repository.getById(id)
    if (!current) throw new Error('Assurance véhicule introuvable')

    const renewalCount = (current.renewalCount || 0) + 1
    const status = this.computeStatus(data.endDate)
    await this.repository.update(id, {
      startDate: data.startDate,
      endDate: data.endDate,
      premiumAmount: data.premiumAmount,
      policyNumber: data.policyNumber || current.policyNumber,
      renewalCount,
      lastRenewedAt: new Date(),
      status,
      updatedAt: new Date(),
      updatedBy: adminId,
    })
  }

  async markExpired(id: string, adminId: string): Promise<void> {
    await this.repository.update(id, {
      status: 'expired',
      updatedAt: new Date(),
      updatedBy: adminId,
    })
  }

  deleteInsurance(id: string): Promise<void> {
    return this.repository.delete(id)
  }

  getStats(): Promise<VehicleInsuranceStats> {
    return this.repository.getStats()
  }

  private computeStatus(endDate: Date): VehicleInsuranceStatus {
    const now = new Date()
    const soonThreshold = new Date()
    soonThreshold.setDate(soonThreshold.getDate() + 30)
    if (endDate < now) return 'expired'
    if (endDate <= soonThreshold) return 'expires_soon'
    return 'active'
  }

  private normalizeAttachments(
    attachments?: CreatePayload['attachments']
  ): VehicleInsurance['attachments'] | undefined {
    if (!attachments) {
      return undefined
    }

    return {
      policyUrl: attachments.policyUrl || undefined,
      policyPath: attachments.policyPath || undefined,
      receiptUrl: attachments.receiptUrl || undefined,
      receiptPath: attachments.receiptPath || undefined,
    }
  }

  /**
   * Supprime tous les champs undefined d'un objet pour compatibilité Firestore
   * Firestore n'accepte pas les valeurs undefined
   */
  private removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: Partial<T> = {}
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key]
      }
    }
    return cleaned
  }
}

