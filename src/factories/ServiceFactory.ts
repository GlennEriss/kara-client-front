import { ICompanySuggestionsService } from '@/services/interfaces/IService'
import { CompanySuggestionsService } from '@/services/suggestions/CompanySuggestionsService'
import { IFilleulService } from '@/services/filleuls/IFilleulService'
import { FilleulService } from '@/services/filleuls/FilleulService'
import { RepositoryFactory } from './RepositoryFactory'
import { ICaisseImprevueService } from '@/services/caisse-imprevue/ICaisseImprevueService'
import { CaisseImprevueService } from '@/services/caisse-imprevue/CaisseImprevueService'

/**
 * Factory statique pour créer et gérer tous les services en singleton
 */
export class ServiceFactory {
  private static services = new Map<string, any>()

  /**
   * Obtient le service de suggestions d'entreprises
   */
  static getCompanySuggestionsService(): ICompanySuggestionsService {
    const key = 'CompanySuggestionsService'

    if (!this.services.has(key)) {
      this.services.set(key, new CompanySuggestionsService())
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
      const adminRepository = RepositoryFactory.getAdminRepository()
      this.services.set(key, new CaisseImprevueService(memberRepository, subscriptionCIRepository, adminRepository))
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
