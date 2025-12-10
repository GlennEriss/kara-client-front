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
import { INotificationRepository } from '@/repositories/notifications/INotificationRepository'
import { NotificationRepository } from '@/repositories/notifications/NotificationRepository'
import { ProvinceRepository } from '@/repositories/geographie/ProvinceRepository'
import { CityRepository } from '@/repositories/geographie/CityRepository'
import { DistrictRepository } from '@/repositories/geographie/DistrictRepository'
import { QuarterRepository } from '@/repositories/geographie/QuarterRepository'

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
   * Obtient le repository des villes
   */
  static getCityRepository(): CityRepository {
    const key = 'CityRepository'
    if (!this.repositories.has(key)) {
      this.repositories.set(key, new CityRepository())
    }
    return this.repositories.get(key) as CityRepository
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
