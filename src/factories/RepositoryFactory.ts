import { ISubscriptionCIRepository } from '@/repositories/caisse-imprevu/ISubscriptionCIRepository'
import { IContractCIRepository } from '@/repositories/caisse-imprevu/IContractCIRepository'
import { IPaymentCIRepository } from '@/repositories/caisse-imprevu/IPaymentCIRepository'
import { IRepository } from '@/repositories/IRepository'
import { IMemberRepository } from '@/repositories/members/IMemberRepository'
import { MemberRepository } from '@/repositories/members/MemberRepository'
import { SubscriptionCIRepository } from '@/repositories/caisse-imprevu/SubscriptionCIRepository'
import { ContractCIRepository } from '@/repositories/caisse-imprevu/ContractCIRepository'
import { PaymentCIRepository } from '@/repositories/caisse-imprevu/PaymentCIRepository'
import { IAdminRepository } from '@/repositories/admins/IAdminRepository'
import { AdminRepository } from '@/repositories/admins/AdminRepository'
import { IDocumentRepository } from '@/repositories/documents/IDocumentRepository'
import { DocumentRepository } from '@/repositories/documents/DocumentRepository'

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
