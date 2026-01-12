import { ISubscriptionCIRepository } from '@/repositories/caisse-imprevu/ISubscriptionCIRepository'
import { IContractCIRepository } from '@/repositories/caisse-imprevu/IContractCIRepository'
import { IPaymentCIRepository } from '@/repositories/caisse-imprevu/IPaymentCIRepository'
import { ISupportCIRepository } from '@/repositories/caisse-imprevu/ISupportCIRepository'
import { IEarlyRefundCIRepository } from '@/repositories/caisse-imprevu/IEarlyRefundCIRepository'
import { IRepository } from '@/repositories/IRepository'
import { IMemberRepository } from '@/repositories/members/IMemberRepository'
import { MemberRepository } from '@/repositories/members/MemberRepository'
import { SubscriptionCIRepository } from '@/repositories/caisse-imprevu/SubscriptionCIRepository'
import { ContractCIRepository } from '@/repositories/caisse-imprevu/ContractCIRepository'
import { PaymentCIRepository } from '@/repositories/caisse-imprevu/PaymentCIRepository'
import { SupportCIRepository } from '@/repositories/caisse-imprevu/SupportCIRepository'
import { EarlyRefundCIRepository } from '@/repositories/caisse-imprevu/EarlyRefundCIRepository'
import { IAdminRepository } from '@/repositories/admins/IAdminRepository'
import { AdminRepository } from '@/repositories/admins/AdminRepository'
import { IDocumentRepository } from '@/repositories/documents/IDocumentRepository'
import { DocumentRepository } from '@/repositories/documents/DocumentRepository'
import { VehicleInsuranceRepository } from '@/repositories/vehicule/VehicleInsuranceRepository'
import { NotificationRepository } from '@/repositories/notifications/NotificationRepository'
import { PlacementRepository } from '@/repositories/placement/PlacementRepository'
import { ProvinceRepository } from '@/domains/infrastructure/geography/repositories/ProvinceRepository'
import { DepartmentRepository } from '@/domains/infrastructure/geography/repositories/DepartmentRepository'
import { CommuneRepository } from '@/domains/infrastructure/geography/repositories/CommuneRepository'
import { DistrictRepository } from '@/domains/infrastructure/geography/repositories/DistrictRepository'
import { QuarterRepository } from '@/domains/infrastructure/geography/repositories/QuarterRepository'
import { ICreditDemandRepository } from '@/repositories/credit-speciale/ICreditDemandRepository'
import { ICreditContractRepository } from '@/repositories/credit-speciale/ICreditContractRepository'
import { ICreditPaymentRepository } from '@/repositories/credit-speciale/ICreditPaymentRepository'
import { ICreditPenaltyRepository } from '@/repositories/credit-speciale/ICreditPenaltyRepository'
import { ICreditInstallmentRepository } from '@/repositories/credit-speciale/ICreditInstallmentRepository'
import { IGuarantorRemunerationRepository } from '@/repositories/credit-speciale/IGuarantorRemunerationRepository'
import { CreditDemandRepository } from '@/repositories/credit-speciale/CreditDemandRepository'
import { CreditContractRepository } from '@/repositories/credit-speciale/CreditContractRepository'
import { CreditPaymentRepository } from '@/repositories/credit-speciale/CreditPaymentRepository'
import { CreditPenaltyRepository } from '@/repositories/credit-speciale/CreditPenaltyRepository'
import { CreditInstallmentRepository } from '@/repositories/credit-speciale/CreditInstallmentRepository'
import { GuarantorRemunerationRepository } from '@/repositories/credit-speciale/GuarantorRemunerationRepository'
import { ICaisseSpecialeDemandRepository } from '@/repositories/caisse-speciale/ICaisseSpecialeDemandRepository'
import { CaisseSpecialeDemandRepository } from '@/repositories/caisse-speciale/CaisseSpecialeDemandRepository'
import { IPlacementDemandRepository } from '@/repositories/placement/IPlacementDemandRepository'
import { PlacementDemandRepository } from '@/repositories/placement/PlacementDemandRepository'
import { ICaisseImprevueDemandRepository } from '@/repositories/caisse-imprevue/ICaisseImprevueDemandRepository'
import { CaisseImprevueDemandRepository } from '@/repositories/caisse-imprevue/CaisseImprevueDemandRepository'
import { IUserRepository } from '@/domains/auth/repositories/IUserRepository'
import { UserRepository } from '@/domains/auth/repositories/UserRepository'

/**
 * Factory statique pour créer et gérer tous les repositories en singleton
 */
export class RepositoryFactory {
  private static repositories = new Map<string, IRepository>()

  /**
   * Obtient le repository des membres
   */
  static getMemberRepository(): IMemberRepository {
    const key = 'MemberRepository'

    if (!this.repositories.has(key)) {
      this.repositories.set(key, new MemberRepository())
    }

    return this.repositories.get(key) as IMemberRepository
  }


  /**
   * Obtient le repository des souscriptions de la caisse imprevue
   */
  static getSubscriptionCIRepository(): ISubscriptionCIRepository {
    const key = 'SubscriptionCIRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new SubscriptionCIRepository())
    }
    return this.repositories.get(key) as ISubscriptionCIRepository
  }

  /**
   * Obtient le repository des contrats de la caisse imprevue
   */
  static getContractCIRepository(): IContractCIRepository {
    const key = 'ContractCIRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new ContractCIRepository())
    }
    return this.repositories.get(key) as IContractCIRepository
  }

  /**
   * Obtient le repository des administrateurs
   */
  static getAdminRepository(): IAdminRepository {
    const key = 'AdminRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new AdminRepository())
    }
    return this.repositories.get(key) as IAdminRepository
  }

  /**
   * Obtient le repository des documents
   */
  static getDocumentRepository(): IDocumentRepository {
    const key = 'DocumentRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new DocumentRepository())
    }
    return this.repositories.get(key) as IDocumentRepository
  }

  /**
   * Obtient le repository des assurances véhicules
   */
  static getVehicleInsuranceRepository(): VehicleInsuranceRepository {
    const key = 'VehicleInsuranceRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new VehicleInsuranceRepository())
    }
    return this.repositories.get(key) as VehicleInsuranceRepository
  }

  /**
   * Obtient le repository des paiements de la caisse imprevue
   */
  static getPaymentCIRepository(): IPaymentCIRepository {
    const key = 'PaymentCIRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new PaymentCIRepository())
    }
    return this.repositories.get(key) as IPaymentCIRepository
  }

  /**
   * Obtient le repository des supports de la caisse imprevue
   */
  static getSupportCIRepository(): ISupportCIRepository {
    const key = 'SupportCIRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new SupportCIRepository())
    }
    return this.repositories.get(key) as unknown as ISupportCIRepository
  }

  /**
   * Obtient le repository des retraits anticipés de la caisse imprevue
   */
  static getEarlyRefundCIRepository(): IEarlyRefundCIRepository {
    const key = 'EarlyRefundCIRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new EarlyRefundCIRepository())
    }
    return this.repositories.get(key) as IEarlyRefundCIRepository
  }

  /**
   * Obtient le repository des notifications
   */
  static getNotificationRepository(): NotificationRepository {
    const key = 'NotificationRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new NotificationRepository())
    }
    return this.repositories.get(key) as NotificationRepository
  }

  /**
   * Obtient le repository des placements
   */
  static getPlacementRepository(): PlacementRepository {
    const key = 'PlacementRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new PlacementRepository())
    }
    return this.repositories.get(key) as PlacementRepository
  }

  /**
   * Obtient le repository des provinces
   */
  static getProvinceRepository(): ProvinceRepository {
    const key = 'ProvinceRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new ProvinceRepository())
    }
    return this.repositories.get(key) as ProvinceRepository
  }

  /**
   * Obtient le repository des départements
   */
  static getDepartmentRepository(): DepartmentRepository {
    const key = 'DepartmentRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new DepartmentRepository())
    }
    return this.repositories.get(key) as DepartmentRepository
  }

  /**
   * Obtient le repository des communes
   */
  static getCommuneRepository(): CommuneRepository {
    const key = 'CommuneRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new CommuneRepository())
    }
    return this.repositories.get(key) as CommuneRepository
  }

  /**
   * Obtient le repository des arrondissements
   */
  static getDistrictRepository(): DistrictRepository {
    const key = 'DistrictRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new DistrictRepository())
    }
    return this.repositories.get(key) as DistrictRepository
  }

  /**
   * Obtient le repository des quartiers
   */
  static getQuarterRepository(): QuarterRepository {
    const key = 'QuarterRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new QuarterRepository())
    }
    return this.repositories.get(key) as QuarterRepository
  }

  /**
   * Obtient le repository des demandes de crédit
   */
  static getCreditDemandRepository(): ICreditDemandRepository {
    const key = 'CreditDemandRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new CreditDemandRepository())
    }
    return this.repositories.get(key) as ICreditDemandRepository
  }

  /**
   * Obtient le repository des contrats de crédit
   */
  static getCreditContractRepository(): ICreditContractRepository {
    const key = 'CreditContractRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new CreditContractRepository())
    }
    return this.repositories.get(key) as ICreditContractRepository
  }

  /**
   * Obtient le repository des paiements de crédit
   */
  static getCreditPaymentRepository(): ICreditPaymentRepository {
    const key = 'CreditPaymentRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new CreditPaymentRepository())
    }
    return this.repositories.get(key) as ICreditPaymentRepository
  }

  /**
   * Obtient le repository des pénalités de crédit
   */
  static getCreditPenaltyRepository(): ICreditPenaltyRepository {
    const key = 'CreditPenaltyRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new CreditPenaltyRepository())
    }
    return this.repositories.get(key) as ICreditPenaltyRepository
  }

  /**
   * Obtient le repository des échéances de crédit
   */
  static getCreditInstallmentRepository(): ICreditInstallmentRepository {
    const key = 'CreditInstallmentRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new CreditInstallmentRepository())
    }
    return this.repositories.get(key) as ICreditInstallmentRepository
  }

  /**
   * Obtient le repository des rémunérations de garant
   */
  static getGuarantorRemunerationRepository(): IGuarantorRemunerationRepository {
    const key = 'GuarantorRemunerationRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new GuarantorRemunerationRepository())
    }
    return this.repositories.get(key) as IGuarantorRemunerationRepository
  }

  /**
   * Obtient le repository des demandes de Caisse Spéciale
   */
  static getCaisseSpecialeDemandRepository(): ICaisseSpecialeDemandRepository {
    const key = 'CaisseSpecialeDemandRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new CaisseSpecialeDemandRepository())
    }
    return this.repositories.get(key) as ICaisseSpecialeDemandRepository
  }

  /**
   * Obtient le repository des demandes de placement
   */
  static getPlacementDemandRepository(): IPlacementDemandRepository {
    const key = 'PlacementDemandRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new PlacementDemandRepository())
    }
    return this.repositories.get(key) as IPlacementDemandRepository
  }

  /**
   * Obtient le repository des demandes de Caisse Imprévue
   */
  static getCaisseImprevueDemandRepository(): ICaisseImprevueDemandRepository {
    const key = 'CaisseImprevueDemandRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new CaisseImprevueDemandRepository())
    }
    return this.repositories.get(key) as ICaisseImprevueDemandRepository
  }

  /**
   * Obtient le repository des utilisateurs
   */
  static getUserRepository(): IUserRepository {
    const key = 'UserRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new UserRepository())
    }
    return this.repositories.get(key) as IUserRepository
  }

  /**
   * Obtient un repository par son nom
   */
  static getRepository<T extends IRepository>(repositoryName: string): T | null {
    return this.repositories.get(repositoryName) as T || null
  }

  /**
   * Enregistre un repository personnalisé
   */
  static registerRepository<T extends IRepository>(repositoryName: string, repository: T): void {
    this.repositories.set(repositoryName, repository)
  }

  /**
   * Vide tous les repositories (utile pour les tests)
   */
  static clearAllRepositories(): void {
    this.repositories.clear()
  }

  /**
   * Obtient la liste de tous les repositories enregistrés
   */
  static getAllRepositories(): string[] {
    return Array.from(this.repositories.keys())
  }

  /**
   * Vérifie si un repository existe
   */
  static hasRepository(repositoryName: string): boolean {
    return this.repositories.has(repositoryName)
  }

  /**
   * Obtient le nombre de repositories enregistrés
   */
  static getRepositoryCount(): number {
    return this.repositories.size
  }
}
