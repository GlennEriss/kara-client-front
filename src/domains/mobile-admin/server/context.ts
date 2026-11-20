import { createDuplicateGroupsRepository } from '@/domains/memberships/repositories/DuplicateGroupsRepository'
/* eslint-disable no-restricted-imports -- Adaptateur mobile vers les services métier existants du site, injectés par requête. */
import { createCharityMediaService } from '@/services/bienfaiteur/CharityMediaService'
import { createCharityStorage } from './storage-port'
import { createAssociationPublications } from '@/components/statuts/publication'
import { createMemberDatabase } from '@/db/member.db'
import { createAdminsRepository } from '@/db/admin.db'
import { createCharityEventRepository } from '@/repositories/bienfaiteur/CharityEventRepository'
import { createCharityContributionRepository } from '@/repositories/bienfaiteur/CharityContributionRepository'
import { createCharityParticipantRepository } from '@/repositories/bienfaiteur/CharityParticipantRepository'
import { createCharityMediaRepository } from '@/repositories/bienfaiteur/CharityMediaRepository'
import { createCharityEventService } from '@/services/bienfaiteur/CharityEventService'
import { createCharityContributionService } from '@/services/bienfaiteur/CharityContributionService'
import { createCharityParticipantService } from '@/services/bienfaiteur/CharityParticipantService'
import { createCharityStarsService } from '@/domains/community/charity-stars/services/CharityStarsService'
import { createCallLogsService } from '@/services/call-logs/callLog'
import { createCallPlansService } from '@/services/call-logs/callPlan'
import { createUsersRepository } from '@/db/user.db'
import { createSubscriptionsRepository } from '@/db/subscription.db'
import { createPaymentRepositoryV2 } from '@/domains/memberships/repositories/PaymentRepositoryV2'
import { createMembershipRepositoryV2 } from '@/domains/memberships/repositories/MembershipRepositoryV2'
import { createMembershipServiceV2 } from '@/domains/memberships/services/MembershipServiceV2'
import { createMembershipFormService } from '@/domains/memberships/services/MembershipFormService'
import { ServerFinanceDocuments } from '@/domains/finance/server/documents'
import { CompanyRepository } from '@/domains/infrastructure/references/repositories/CompanyRepository'
import { ProfessionRepository } from '@/domains/infrastructure/references/repositories/ProfessionRepository'
import { ProvinceRepository } from '@/domains/infrastructure/geography/repositories/ProvinceRepository'
import { DepartmentRepository } from '@/domains/infrastructure/geography/repositories/DepartmentRepository'
import { CommuneRepository } from '@/domains/infrastructure/geography/repositories/CommuneRepository'
import { DistrictRepository } from '@/domains/infrastructure/geography/repositories/DistrictRepository'
import { QuarterRepository } from '@/domains/infrastructure/geography/repositories/QuarterRepository'
import { CompanyService } from '@/domains/infrastructure/references/services/CompanyService'
import { ProfessionService } from '@/domains/infrastructure/references/services/ProfessionService'
import { GeographieService } from '@/domains/infrastructure/geography/services/GeographieService'
import { geographySearchText } from '@/domains/infrastructure/geography/utils/search-text'
import { createServerFirestorePort } from '@/domains/finance/server/firestore-port'
import { createGroupService } from '@/domains/groups/group-service'
import { createAgreementService } from '@/domains/groups/agreements/agreement-service'
import { createPayoutService } from '@/domains/groups/payout-service'
import { createContributionService } from '@/domains/groups/contribution-service'
import { createProjectCreditService } from '@/domains/groups/project-credit-service'
import { createShopsRepository } from '@/db/shops.db'
import { createAgentsRepository } from '@/db/agent-recouvrement.db'
import { createVehicleRewardsRepository } from '@/db/vehicle-rewards.db'
import { createEventsRepository } from '@/domains/community/events/repositories/EventsRepository'
import { EventsService } from '@/domains/community/events/services/EventsService'
import { VehicleInsuranceRepository } from '@/repositories/vehicule/VehicleInsuranceRepository'
import { InsuranceProspectRepository } from '@/domains/insurance-prospects/repository'
import { VehicleInsuranceService } from '@/services/vehicule/VehicleInsuranceService'
import { PlacementRepository } from '@/repositories/placement/PlacementRepository'
import { PlacementDemandRepository } from '@/repositories/placement/PlacementDemandRepository'
import { PlacementService } from '@/services/placement/PlacementService'
import { DocumentService } from '@/domains/infrastructure/documents/services/DocumentService'
import { createFinanceServices } from '@/domains/finance/server/services'
import { cleanFinanceWrite } from '@/domains/finance/server/firestore-port'
import type { MobileCaller } from '@/domains/mobile/server/access'
export function createAdminServices(caller: MobileCaller) {
  const finance = createFinanceServices(caller)
  const placements = new PlacementRepository(finance.firestore, true)
  const placementDemands = new PlacementDemandRepository(
    finance.firestore,
    true,
  )
  const audit = async (input: Record<string, unknown>) => {
    await finance.db.collection('auditLogs').add(
      cleanFinanceWrite({
        ...input,
        adminId: caller.claims.uid,
        createdAt: new Date(),
      }),
    )
  }
  const placementService = new PlacementService(
    placements,
    new DocumentService(finance.documents),
    finance.documents,
    finance.members,
    finance.notifications,
    placementDemands,
    finance.admins,
    audit,
  )
  const basePort = createServerFirestorePort(finance.db)
  const port: typeof basePort = {
    ...basePort,
    setDoc: (async (ref: any, value: any, options?: any) =>
      options
        ? ref.set(cleanFinanceWrite(value), options)
        : ref.set(cleanFinanceWrite(value))) as typeof basePort.setDoc,
  }
  const company = new CompanyService(
    new CompanyRepository(finance.firestore, true),
  )
  const profession = new ProfessionService(
    new ProfessionRepository(finance.firestore, true),
  )
  const indexedGeographyFirestore = async () => {
    const firestore = await finance.firestore()
    const indexed = (data: Record<string, any>) =>
      typeof data.name === 'string'
        ? { ...data, searchableText: geographySearchText(data.name, data.code) }
        : data
    return {
      ...firestore,
      addDoc: ((ref: any, data: any) =>
        firestore.addDoc(ref, indexed(data))) as typeof firestore.addDoc,
      updateDoc: ((ref: any, data: any) =>
        firestore.updateDoc(ref, indexed(data))) as typeof firestore.updateDoc,
    }
  }
  const geography = new GeographieService(
    new ProvinceRepository(indexedGeographyFirestore, true),
    new DepartmentRepository(indexedGeographyFirestore, true),
    new CommuneRepository(indexedGeographyFirestore, true),
    new DistrictRepository(indexedGeographyFirestore, true),
    new QuarterRepository(indexedGeographyFirestore, true),
  )
  const agreements = createAgreementService(port)
  const contributions = createContributionService(port)
  const projectCredit = createProjectCreditService({
    ...port,
    ...contributions,
  })
  const groups = createGroupService({
    ...port,
    agreementLedgerRef: agreements.agreementLedgerRef,
  })
  const payouts = createPayoutService(port)
  const shops = createShopsRepository(port)
  const agents = createAgentsRepository(port)
  const rewards = createVehicleRewardsRepository(port)
  const memberDatabase = createMemberDatabase(port)
  const events = new EventsService(
    createEventsRepository({
      ...port,
      fbLimit: port.limit,
    }).EventsRepository.getInstance(),
  )
  const vehicles = new VehicleInsuranceService(
    new VehicleInsuranceRepository(finance.firestore),
    finance.notifications,
  )
  const charityEventRepo = createCharityEventRepository({
    getFirestore: finance.firestore,
  }).CharityEventRepository
  const charityContributionRepo = createCharityContributionRepository({
    getFirestore: finance.firestore,
  }).CharityContributionRepository
  const charityParticipantRepo = createCharityParticipantRepository({
    getFirestore: finance.firestore,
  }).CharityParticipantRepository
  const charityMediaRepo = createCharityMediaRepository({
    getFirestore: finance.firestore,
  }).CharityMediaRepository
  const charityEvents = createCharityEventService({
    CharityEventRepository: charityEventRepo,
    CharityContributionRepository: charityContributionRepo,
    CharityParticipantRepository: charityParticipantRepo,
  }).CharityEventService
  const charityContributions = createCharityContributionService({
    ...port,
    CharityEventService: charityEvents,
    CharityContributionRepository: charityContributionRepo,
    CharityParticipantRepository: charityParticipantRepo,
  }).CharityContributionService
  const charityParticipants = createCharityParticipantService({
    CharityEventRepository: charityEventRepo,
    CharityParticipantRepository: charityParticipantRepo,
  }).CharityParticipantService
  const charityMediaService = createCharityMediaService({
    ...createCharityStorage(),
    CharityMediaRepository: charityMediaRepo,
  } as any)
  const charityStars =
    createCharityStarsService(port).CharityStarsService.getInstance()
  const callLogs = createCallLogsService({ ...port, fbLimit: port.limit })
  const callPlans = createCallPlansService(port)
  const adminAccounts = createAdminsRepository(port)
  const publications = createAssociationPublications(port)
  const duplicates =
    createDuplicateGroupsRepository(
      port,
    ).DuplicateGroupsRepository.getInstance()
  const users = createUsersRepository({
    ...port,
    firestore: port.db,
    firestoreLimit: port.limit,
  })
  const subscriptions = createSubscriptionsRepository(basePort)
  const payments = createPaymentRepositoryV2(basePort).PaymentRepositoryV2
  class ScopedDocuments extends ServerFinanceDocuments {
    constructor() {
      super(finance.firestore, true)
    }
  }
  const memberships = (token: string) => {
    const captured: { blob: Blob; filename: string }[] = []
    const callable = ((_functions: unknown, name: string) =>
      async (data: unknown) => {
        if (
          ![
            'approveMembershipRequest',
            'updateMembershipRequest',
            'renewSecurityCode',
            'replaceAdhesionPdf',
            'deleteMembershipRequest',
          ].includes(name)
        )
          throw Error('Opération d’adhésion inconnue.')
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        if (!projectId || !token) throw Error('Session indisponible.')
        const response = await fetch(
          `https://us-central1-${projectId}.cloudfunctions.net/${name}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data }),
          },
        )
        const result = await response.json()
        if (!response.ok || result.error)
          throw Error(
            result.error?.message || 'Le traitement de l’adhésion a échoué.',
          )
        return { data: result.result ?? result.data }
      }) as typeof import('firebase/functions').httpsCallable
    const repositoryClass = createMembershipRepositoryV2(
      {
        ...port,
        setDoc: basePort.setDoc,
        fbLimit: port.limit,
        PaymentRepositoryV2: payments,
        DocumentRepository: ScopedDocuments,
        generateMatricule: users.generateMatricule,
        httpsCallable: callable,
      },
      { awaitEffects: true },
    ).MembershipRepositoryV2
    const serviceClass = createMembershipServiceV2(
      {
        MembershipRepositoryV2: repositoryClass,
        httpsCallable: callable,
        getFunctions: (() => ({})) as any,
        downloadPDF: (blob, filename) => {
          captured.push({ blob, filename })
        },
        createFile: (async (file: File, memberId: string) =>
          finance.documents.uploadDocumentFile(
            file,
            memberId,
            'CONTACT_DOCUMENT',
          )) as any,
      },
      { awaitEffects: true },
    ).MembershipServiceV2
    const formClass = createMembershipFormService({
      MembershipRepositoryV2: repositoryClass,
      httpsCallable: callable,
      getFunctions: (() => ({})) as any,
    }).MembershipFormService
    return {
      repository: repositoryClass.getInstance(),
      service: serviceClass.getInstance(
        repositoryClass.getInstance(),
        finance.admins,
        finance.notifications,
      ),
      form: formClass.getInstance(),
      captured,
      invoke: (name: string, data: unknown) => callable({} as any, name)(data),
    }
  }
  return {
    ...finance,
    placements,
    placementDemands,
    placementService,
    audit,
    publications,
    adminAccounts,
    memberDatabase,
    charityEvents,
    charityContributions,
    charityParticipants,
    charityMedia: charityMediaRepo,
    charityMediaService,
    charityStars,
    callLogs,
    callPlans,
    users,
    duplicates,
    subscriptions,
    memberships,
    company,
    profession,
    geography,
    groups,
    agreements,
    contributions,
    projectCredit,
    payouts,
    shops,
    agents,
    rewards,
    events,
    vehicles,
    insuranceProspects: new InsuranceProspectRepository(finance.firestore),
  }
}
export type AdminServices = ReturnType<typeof createAdminServices>
