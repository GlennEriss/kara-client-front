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
    const entity: any = {
      memberId: payload.memberId,
      memberFirstName: payload.memberFirstName,
      memberLastName: payload.memberLastName,
      memberMatricule: payload.memberMatricule,
      memberContacts: payload.memberContacts || [],
      memberPhotoUrl: payload.memberPhotoUrl || null,
      sponsorMemberId: payload.sponsorMemberId || null,
      sponsorName: payload.sponsorName || null,
      vehicleType: payload.vehicleType,
      vehicleBrand: payload.vehicleBrand,
      vehicleModel: payload.vehicleModel,
      vehicleYear: payload.vehicleYear ?? null,
      plateNumber: payload.plateNumber,
      insuranceCompany: payload.insuranceCompany,
      insuranceAgent: payload.insuranceAgent || null,
      policyNumber: payload.policyNumber,
      coverageType: payload.coverageType || null,
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
    const { attachments, ...restUpdates } = updates
    
    const updatePayload: any = {
      ...restUpdates,
      // Normaliser les valeurs - utiliser null au lieu de undefined
      memberContacts: updates.memberContacts !== undefined ? (updates.memberContacts || []) : undefined,
      memberPhotoUrl: updates.memberPhotoUrl !== undefined ? (updates.memberPhotoUrl || null) : undefined,
      sponsorMemberId: updates.sponsorMemberId !== undefined ? (updates.sponsorMemberId || null) : undefined,
      sponsorName: updates.sponsorName !== undefined ? (updates.sponsorName || null) : undefined,
      insuranceAgent: updates.insuranceAgent !== undefined ? (updates.insuranceAgent || null) : undefined,
      coverageType: updates.coverageType !== undefined ? (updates.coverageType || null) : undefined,
      vehicleYear: updates.vehicleYear !== undefined ? (updates.vehicleYear ?? null) : undefined,
      notes: updates.notes !== undefined ? (updates.notes || null) : undefined,
      status,
      updatedAt: new Date(),
      updatedBy: adminId,
    }

    // Normaliser attachments si fourni
    if (attachments !== undefined) {
      updatePayload.attachments = this.normalizeAttachments(attachments)
    }

    // Supprimer tous les champs undefined (Firestore n'accepte pas undefined)
    // On garde les null car Firestore les accepte
    const cleanedPayload = this.removeUndefinedFields(updatePayload)

    await this.repository.update(id, cleanedPayload as Partial<VehicleInsurance>)
  }

  async renewInsurance(id: string, data: { startDate: Date; endDate: Date; premiumAmount: number; policyNumber?: string; coverageType?: string }, adminId: string): Promise<void> {
    const current = await this.repository.getById(id)
    if (!current) throw new Error('Assurance véhicule introuvable')

    const renewalCount = (current.renewalCount || 0) + 1
    const status = this.computeStatus(data.endDate)
    await this.repository.update(id, {
      startDate: data.startDate,
      endDate: data.endDate,
      premiumAmount: data.premiumAmount,
      policyNumber: data.policyNumber || current.policyNumber,
      coverageType: data.coverageType || current.coverageType,
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

