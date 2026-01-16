import { ICompanySuggestionsService } from '@/services/interfaces/IService'
import { CompanySuggestionsService } from '@/domains/infrastructure/references/services/CompanySuggestionsService'
import { CompanyService } from '@/domains/infrastructure/references/services/CompanyService'
import { ProfessionService } from '@/domains/infrastructure/references/services/ProfessionService'
import { IFilleulService } from '@/services/filleuls/IFilleulService'
import { FilleulService } from '@/services/filleuls/FilleulService'
import { RepositoryFactory } from './RepositoryFactory'
import { ICaisseImprevueService } from '@/services/caisse-imprevue/ICaisseImprevueService'
import { CaisseImprevueService } from '@/services/caisse-imprevue/CaisseImprevueService'
import { VehicleInsuranceService } from '@/services/vehicule/VehicleInsuranceService'
import { NotificationService } from '@/services/notifications/NotificationService'
import { GeographieService } from '@/domains/infrastructure/geography/services/GeographieService'
import { PlacementService } from '@/services/placement/PlacementService'
import { DocumentService } from '@/domains/infrastructure/documents/services/DocumentService'
import { ICreditSpecialeService } from '@/services/credit-speciale/ICreditSpecialeService'
import { CreditSpecialeService } from '@/services/credit-speciale/CreditSpecialeService'
import { ICaisseSpecialeService } from '@/services/caisse-speciale/ICaisseSpecialeService'
import { CaisseSpecialeService } from '@/services/caisse-speciale/CaisseSpecialeService'
import { MembershipService } from '@/services/memberships/MembershipService'
import { ILoginService } from '@/domains/auth/services/ILoginService'
import { LoginService } from '@/domains/auth/services/LoginService'
import { ILogoutService } from '@/domains/auth/services/ILogoutService'
import { LogoutService } from '@/domains/auth/services/LogoutService'
import { IRegistrationService } from '@/domains/auth/registration/services/IRegistrationService'
import { RegistrationService } from '@/domains/auth/registration/services/RegistrationService'
import { IRegistrationCacheService } from '@/domains/auth/registration/services/IRegistrationCacheService'
import { RegistrationCacheService } from '@/domains/auth/registration/services/RegistrationCacheService'

/**
 * Factory statique pour créer et gérer tous les services en singleton
 */
export class ServiceFactory {
  private static services = new Map<string, any>()

  /**
   * Obtient le service de gestion des entreprises
   */
  static getCompanyService(): CompanyService {
    const key = 'CompanyService'
    if (!this.services.has(key)) {
      const companyRepository = RepositoryFactory.getCompanyRepository()
      this.services.set(key, new CompanyService(companyRepository))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion des professions
   */
  static getProfessionService(): ProfessionService {
    const key = 'ProfessionService'
    if (!this.services.has(key)) {
      const professionRepository = RepositoryFactory.getProfessionRepository()
      this.services.set(key, new ProfessionService(professionRepository))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de suggestions d'entreprises
   */
  static getCompanySuggestionsService(): ICompanySuggestionsService {
    const key = 'CompanySuggestionsService'

    if (!this.services.has(key)) {
      const companyRepository = RepositoryFactory.getCompanyRepository()
      this.services.set(key, new CompanySuggestionsService(companyRepository))
    }

    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion des filleuls
   */
  static getFilleulService(): IFilleulService {
    const key = 'FilleulService'

    if (!this.services.has(key)) {
      const memberRepository = RepositoryFactory.getMemberRepository()
      this.services.set(key, new FilleulService(memberRepository))
    }

    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion des caisse imprevue
   */
  static getCaisseImprevueService(): ICaisseImprevueService {
    const key = 'CaisseImprevueService'
    if (!this.services.has(key)) {
      const memberRepository = RepositoryFactory.getMemberRepository()
      const subscriptionCIRepository = RepositoryFactory.getSubscriptionCIRepository()
      const contractCIRepository = RepositoryFactory.getContractCIRepository()
      const adminRepository = RepositoryFactory.getAdminRepository()
      const documentRepository = RepositoryFactory.getDocumentRepository()
      const paymentCIRepository = RepositoryFactory.getPaymentCIRepository()
      const supportCIRepository = RepositoryFactory.getSupportCIRepository()
      const earlyRefundCIRepository = RepositoryFactory.getEarlyRefundCIRepository()
      const caisseImprevueDemandRepository = RepositoryFactory.getCaisseImprevueDemandRepository()
      this.services.set(key, new CaisseImprevueService(memberRepository, subscriptionCIRepository, contractCIRepository, adminRepository, documentRepository, paymentCIRepository, supportCIRepository, earlyRefundCIRepository, caisseImprevueDemandRepository))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion de la Caisse Spéciale
   */
  static getCaisseSpecialeService(): ICaisseSpecialeService {
    const key = 'CaisseSpecialeService'
    if (!this.services.has(key)) {
      const caisseSpecialeDemandRepository = RepositoryFactory.getCaisseSpecialeDemandRepository()
      this.services.set(key, new CaisseSpecialeService(caisseSpecialeDemandRepository))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion des assurances véhicules
   */
  static getVehicleInsuranceService(): VehicleInsuranceService {
    const key = 'VehicleInsuranceService'
    if (!this.services.has(key)) {
      const repository = RepositoryFactory.getVehicleInsuranceRepository()
      this.services.set(key, new VehicleInsuranceService(repository))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion des notifications
   */
  static getNotificationService(): NotificationService {
    const key = 'NotificationService'
    if (!this.services.has(key)) {
      this.services.set(key, new NotificationService())
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion des placements
   */
  static getPlacementService(): PlacementService {
    const key = 'PlacementService'
    if (!this.services.has(key)) {
      const placementRepository = RepositoryFactory.getPlacementRepository()
      const documentRepository = RepositoryFactory.getDocumentRepository()
      const documentService = new DocumentService(documentRepository)
      const memberRepository = RepositoryFactory.getMemberRepository()
      this.services.set(key, new PlacementService(placementRepository, documentService, documentRepository, memberRepository))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion de la géographie
   */
  static getGeographieService(): GeographieService {
    const key = 'GeographieService'
    if (!this.services.has(key)) {
      const provinceRepository = RepositoryFactory.getProvinceRepository()
      const departmentRepository = RepositoryFactory.getDepartmentRepository()
      const communeRepository = RepositoryFactory.getCommuneRepository()
      const districtRepository = RepositoryFactory.getDistrictRepository()
      const quarterRepository = RepositoryFactory.getQuarterRepository()
      this.services.set(key, new GeographieService(provinceRepository, departmentRepository, communeRepository, districtRepository, quarterRepository))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion du crédit spéciale
   */
  static getCreditSpecialeService(): ICreditSpecialeService {
    const key = 'CreditSpecialeService'
    if (!this.services.has(key)) {
      const creditDemandRepository = RepositoryFactory.getCreditDemandRepository()
      const creditContractRepository = RepositoryFactory.getCreditContractRepository()
      const creditPaymentRepository = RepositoryFactory.getCreditPaymentRepository()
      const creditPenaltyRepository = RepositoryFactory.getCreditPenaltyRepository()
      const guarantorRemunerationRepository = RepositoryFactory.getGuarantorRemunerationRepository()
      this.services.set(key, new CreditSpecialeService(
        creditDemandRepository,
        creditContractRepository,
        creditPaymentRepository,
        creditPenaltyRepository,
        guarantorRemunerationRepository
      ))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de gestion des membres/demandes d'adhésion
   */
  static getMembershipService(): MembershipService {
    const key = 'MembershipService'
    if (!this.services.has(key)) {
      this.services.set(key, new MembershipService())
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de login/authentification
   */
  static getLoginService(): ILoginService {
    const key = 'LoginService'
    if (!this.services.has(key)) {
      const userRepository = RepositoryFactory.getUserRepository()
      this.services.set(key, new LoginService(userRepository))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de déconnexion
   */
  static getLogoutService(): ILogoutService {
    const key = 'LogoutService'
    if (!this.services.has(key)) {
      this.services.set(key, new LogoutService())
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service d'inscription
   */
  static getRegistrationService(): IRegistrationService {
    const key = 'RegistrationService'
    if (!this.services.has(key)) {
      const registrationRepository = RepositoryFactory.getRegistrationRepository()
      this.services.set(key, new RegistrationService(registrationRepository))
    }
    return this.services.get(key)
  }

  /**
   * Obtient le service de cache pour les inscriptions
   */
  static getRegistrationCacheService(): IRegistrationCacheService {
    const key = 'RegistrationCacheService'
    if (!this.services.has(key)) {
      this.services.set(key, new RegistrationCacheService())
    }
    return this.services.get(key)
  }

  /**
   * Obtient un service par son nom
   */
  static getService<T>(serviceName: string): T | null {
    return this.services.get(serviceName) || null
  }

  /**
   * Enregistre un service personnalisé
   */
  static registerService<T>(serviceName: string, service: T): void {
    this.services.set(serviceName, service)
  }

  /**
   * Vide tous les services (utile pour les tests)
   */
  static clearAllServices(): void {
    this.services.clear()
  }

  /**
   * Obtient la liste de tous les services enregistrés
   */
  static getAllServices(): string[] {
    return Array.from(this.services.keys())
  }
}
