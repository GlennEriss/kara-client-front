import routes from '@/constantes/routes'
import { MEMBER_OVERVIEW_STATUS_FILTERS } from '../entities/member-overview-status-filters'
import type {
  MemberOverviewData,
  MemberOverviewListItem,
  MemberOverviewModuleKey,
} from '../entities/member-overview.types'
import type { IMemberOverviewRepository, OverviewRawRecord } from '../repositories/IMemberOverviewRepository'
import { MemberOverviewRepository, coerceDate } from '../repositories/MemberOverviewRepository'

function toAmount(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export class MemberOverviewAggregationService {
  private static instance: MemberOverviewAggregationService
  private repository: IMemberOverviewRepository

  private constructor(repository: IMemberOverviewRepository = MemberOverviewRepository.getInstance()) {
    this.repository = repository
  }

  static getInstance(): MemberOverviewAggregationService {
    if (!MemberOverviewAggregationService.instance) {
      MemberOverviewAggregationService.instance = new MemberOverviewAggregationService()
    }
    return MemberOverviewAggregationService.instance
  }

  private buildItem(record: OverviewRawRecord, module: MemberOverviewModuleKey, kind: 'demande' | 'contrat'): MemberOverviewListItem {
    return {
      id: record.id,
      status: record.status || 'UNKNOWN',
      amount: toAmount(record.amount),
      createdAt: coerceDate(record.createdAt),
      desiredDate: coerceDate(record.desiredDate),
      contractId: typeof record.contractId === 'string' ? record.contractId : undefined,
      label: typeof record.label === 'string' ? record.label : undefined,
      kind,
      module,
    }
  }

  private countModules(modules: MemberOverviewData['modules']): MemberOverviewData['counts'] {
    return {
      caisseSpecialeDemandes: modules.caisseSpeciale.demandes.length,
      caisseSpecialeContrats: modules.caisseSpeciale.contrats.length,
      caisseImprevueDemandes: modules.caisseImprevue.demandes.length,
      caisseImprevueContrats: modules.caisseImprevue.contrats.length,
      creditSpecialeDemandes: modules.creditSpeciale.demandes.length,
      creditSpecialeContrats: modules.creditSpeciale.contrats.length,
      creditFixeDemandes: modules.creditFixe.demandes.length,
      creditFixeContrats: modules.creditFixe.contrats.length,
      creditAideDemandes: modules.creditAide.demandes.length,
      creditAideContrats: modules.creditAide.contrats.length,
      placementDemandes: modules.placement.demandes.length,
      placementContrats: modules.placement.contrats.length,
    }
  }

  private async safeSection<T>(sectionName: string, loader: () => Promise<T>): Promise<T | null> {
    try {
      return await loader()
    } catch (error) {
      console.error(`[MemberOverviewAggregationService] Section "${sectionName}" en erreur:`, error)
      return null
    }
  }

  async getMemberOverview(memberId: string, limitPerSection = 8): Promise<MemberOverviewData> {
    const safeLimit = Math.max(1, Math.min(limitPerSection, 20))

    const member = await this.repository.getMemberById(memberId)

    const [
      caisseSpecialeDemandsRaw,
      caisseSpecialeContractsRaw,
      caisseImprevueDemandsRaw,
      caisseImprevueContractsRaw,
      creditSpecialeDemandsRaw,
      creditSpecialeContractsRaw,
      creditFixeDemandsRaw,
      creditFixeContractsRaw,
      creditAideDemandsRaw,
      creditAideContractsRaw,
      placementDemandsRaw,
      placementsRaw,
      charityDeclarationsRaw,
      charityContributionsRaw,
    ] = await Promise.all([
      this.safeSection('caisseSpecialeDemands', () =>
        this.repository.getCaisseSpecialeDemands(memberId, safeLimit),
      ),
      this.safeSection('caisseSpecialeContracts', () =>
        this.repository.getCaisseSpecialeContracts(memberId, safeLimit),
      ),
      this.safeSection('caisseImprevueDemands', () =>
        this.repository.getCaisseImprevueDemands(memberId, safeLimit),
      ),
      this.safeSection('caisseImprevueContracts', () =>
        this.repository.getCaisseImprevueContracts(memberId, safeLimit),
      ),
      this.safeSection('creditSpecialeDemands', () =>
        this.repository.getCreditDemands(memberId, 'SPECIALE', safeLimit),
      ),
      this.safeSection('creditSpecialeContracts', () =>
        this.repository.getCreditContracts(memberId, 'SPECIALE', safeLimit),
      ),
      this.safeSection('creditFixeDemands', () =>
        this.repository.getCreditDemands(memberId, 'FIXE', safeLimit),
      ),
      this.safeSection('creditFixeContracts', () =>
        this.repository.getCreditContracts(memberId, 'FIXE', safeLimit),
      ),
      this.safeSection('creditAideDemands', () =>
        this.repository.getCreditDemands(memberId, 'AIDE', safeLimit),
      ),
      this.safeSection('creditAideContracts', () =>
        this.repository.getCreditContracts(memberId, 'AIDE', safeLimit),
      ),
      this.safeSection('placementDemands', () =>
        this.repository.getPlacementDemands(memberId, safeLimit),
      ),
      this.safeSection('placements', () => this.repository.getPlacements(memberId, safeLimit)),
      this.safeSection('charityDeclarations', () =>
        this.repository.getCharityDeclarations(member?.matricule ?? '', safeLimit),
      ),
      this.safeSection('charityContributions', () =>
        this.repository.getCharityContributions(memberId, safeLimit),
      ),
    ])

    const modules: MemberOverviewData['modules'] = {
      caisseSpeciale: {
        demandes: (caisseSpecialeDemandsRaw || [])
          .filter((d) => MEMBER_OVERVIEW_STATUS_FILTERS.caisseSpeciale.demandesIncluded.includes((d.status || '') as 'PENDING' | 'APPROVED'))
          .map((d) => this.buildItem(d, 'caisseSpeciale', 'demande')),
        contrats: (caisseSpecialeContractsRaw || [])
          .filter((c) => !MEMBER_OVERVIEW_STATUS_FILTERS.caisseSpeciale.contratsExcluded.includes((c.status || '') as 'CLOSED'))
          .map((c) => this.buildItem(c, 'caisseSpeciale', 'contrat')),
        hasError: caisseSpecialeDemandsRaw === null || caisseSpecialeContractsRaw === null,
      },
      caisseImprevue: {
        demandes: (caisseImprevueDemandsRaw || [])
          .filter((d) => MEMBER_OVERVIEW_STATUS_FILTERS.caisseImprevue.demandesIncluded.includes((d.status || '') as 'PENDING' | 'APPROVED'))
          .map((d) => this.buildItem(d, 'caisseImprevue', 'demande')),
        contrats: (caisseImprevueContractsRaw || [])
          .filter((c) => MEMBER_OVERVIEW_STATUS_FILTERS.caisseImprevue.contratsIncluded.includes((c.status || '') as 'ACTIVE'))
          .map((c) => this.buildItem(c, 'caisseImprevue', 'contrat')),
        hasError: caisseImprevueDemandsRaw === null || caisseImprevueContractsRaw === null,
      },
      creditSpeciale: {
        demandes: (creditSpecialeDemandsRaw || [])
          .filter(
            (d) =>
              MEMBER_OVERVIEW_STATUS_FILTERS.creditSpeciale.demandesIncluded.includes((d.status || '') as 'PENDING' | 'APPROVED') &&
              !d.contractId,
          )
          .map((d) => this.buildItem(d, 'creditSpeciale', 'demande')),
        contrats: (creditSpecialeContractsRaw || [])
          .filter((c) => !MEMBER_OVERVIEW_STATUS_FILTERS.creditSpeciale.contratsExcluded.includes((c.status || '') as 'CLOSED' | 'DISCHARGED'))
          .map((c) => this.buildItem(c, 'creditSpeciale', 'contrat')),
        hasError: creditSpecialeDemandsRaw === null || creditSpecialeContractsRaw === null,
      },
      creditFixe: {
        demandes: (creditFixeDemandsRaw || [])
          .filter(
            (d) =>
              MEMBER_OVERVIEW_STATUS_FILTERS.creditFixe.demandesIncluded.includes((d.status || '') as 'PENDING' | 'APPROVED') &&
              !d.contractId,
          )
          .map((d) => this.buildItem(d, 'creditFixe', 'demande')),
        contrats: (creditFixeContractsRaw || [])
          .filter((c) => !MEMBER_OVERVIEW_STATUS_FILTERS.creditFixe.contratsExcluded.includes((c.status || '') as 'CLOSED' | 'DISCHARGED'))
          .map((c) => this.buildItem(c, 'creditFixe', 'contrat')),
        hasError: creditFixeDemandsRaw === null || creditFixeContractsRaw === null,
      },
      creditAide: {
        demandes: (creditAideDemandsRaw || [])
          .filter(
            (d) =>
              MEMBER_OVERVIEW_STATUS_FILTERS.creditAide.demandesIncluded.includes((d.status || '') as 'PENDING' | 'APPROVED') &&
              !d.contractId,
          )
          .map((d) => this.buildItem(d, 'creditAide', 'demande')),
        contrats: (creditAideContractsRaw || [])
          .filter((c) => !MEMBER_OVERVIEW_STATUS_FILTERS.creditAide.contratsExcluded.includes((c.status || '') as 'CLOSED' | 'DISCHARGED'))
          .map((c) => this.buildItem(c, 'creditAide', 'contrat')),
        hasError: creditAideDemandsRaw === null || creditAideContractsRaw === null,
      },
      placement: {
        demandes: (placementDemandsRaw || [])
          .filter((d) => MEMBER_OVERVIEW_STATUS_FILTERS.placement.demandesIncluded.includes((d.status || '') as 'PENDING' | 'APPROVED'))
          .map((d) => this.buildItem(d, 'placement', 'demande')),
        contrats: (placementsRaw || [])
          .filter((c) => MEMBER_OVERVIEW_STATUS_FILTERS.placement.contratsIncluded.includes((c.status || '') as 'Draft' | 'Active'))
          .map((c) => this.buildItem(c, 'placement', 'contrat')),
        hasError: placementDemandsRaw === null || placementsRaw === null,
      },
      charite: {
        // Seules les déclarations encore en attente : une fois confirmée, une
        // déclaration a donné lieu à une contribution réelle, qui ferait doublon.
        demandes: (charityDeclarationsRaw || [])
          .filter((d) => MEMBER_OVERVIEW_STATUS_FILTERS.charite.demandesIncluded.includes((d.status || '') as 'pending'))
          .map((d) => this.buildItem(d, 'charite', 'demande')),
        // Les contributions réellement enregistrées font foi (y compris celles
        // saisies directement par un gestionnaire).
        contrats: (charityContributionsRaw || []).map((c) => this.buildItem(c, 'charite', 'contrat')),
        hasError: charityDeclarationsRaw === null || charityContributionsRaw === null,
      },
    }

    return {
      member,
      modules,
      counts: this.countModules(modules),
      generatedAt: new Date().toISOString(),
    }
  }

  getModuleListRoutes() {
    return {
      caisseSpeciale: { demandes: routes.admin.caisseSpecialeDemandes, contrats: routes.admin.caisseSpeciale },
      caisseImprevue: { demandes: routes.admin.caisseImprevueDemandes, contrats: routes.admin.caisseImprevue },
      creditSpeciale: { demandes: routes.admin.creditSpecialeDemandes, contrats: routes.admin.creditSpecialeContrats },
      creditFixe: { demandes: routes.admin.creditFixeDemandes, contrats: routes.admin.creditFixeContrats },
      creditAide: { demandes: routes.admin.creditAideDemandes, contrats: routes.admin.creditAideContrats },
      placement: { demandes: routes.admin.placementDemandes, contrats: routes.admin.placements },
      charite: { demandes: routes.admin.bienfaiteur, contrats: routes.admin.bienfaiteur },
    } as const
  }
}
