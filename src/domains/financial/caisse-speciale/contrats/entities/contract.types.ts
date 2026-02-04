import type { EmergencyContact } from '@/schemas/emergency-contact.schema'
import type { CaissePayment, CaisseType } from '@/services/caisse/types'

export interface CreateCaisseContractInput {
  memberId?: string
  groupeId?: string
  monthlyAmount: number
  monthsPlanned: number
  caisseType: CaisseType
  firstPaymentDate: string
  emergencyContact?: EmergencyContact
  settingsVersion?: string
  createdBy?: string
}

export interface ContractPdfMetadata {
  fileSize: number
  path: string
  originalFileName: string
  uploadedAt: Date
  url: string
}

export interface UploadContractPdfInput {
  contractId: string
  file: File
  originalFileName: string
  fileSize: number
  uploadedBy: string
}

export type ContractPayment = CaissePayment
