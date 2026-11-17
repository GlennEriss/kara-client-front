/* eslint-disable no-restricted-imports -- Adaptateur temporaire vers les règles métier et modèles officiels existants. */
import { adminFirestore } from '@/firebase/adminFirestore'
import { CaisseImprevueService as CIDemandService } from '@/domains/financial/caisse-imprevue/services/CaisseImprevueService'
import { DemandCIRepository } from '@/domains/financial/caisse-imprevue/repositories/DemandCIRepository'
import { CaisseContractsRepository } from '@/domains/financial/caisse-speciale/contrats/repositories/CaisseContractsRepository'
import { CaisseContractsService } from '@/domains/financial/caisse-speciale/contrats/services/CaisseContractsService'
import { getEarlyWithdrawalContractIds } from '@/domains/financial/refunds/earlyWithdrawalFilter'
import { createContributionService } from '@/domains/groups/contribution-service'
import { createProjectCreditService } from '@/domains/groups/project-credit-service'
import { cleanFinanceWrite, createServerFirestorePort } from './firestore-port'
import { ServerFinanceDocuments } from './documents'
import type { MobileCaller } from '@/domains/mobile/server/access'
import { createCaisseSettingsRepository } from '@/db/caisse/settings.db'
import { createCaisseRefundsRepository } from '@/db/caisse/refunds.db'
import { createCaissePaymentsRepository } from '@/db/caisse/payments.db'
import { createCaisseContractsRepository } from '@/db/caisse/contracts.db'
import { createCaisseMutations } from '@/services/caisse/mutations'
import { createCaisseReaders } from '@/services/caisse/readers'
import { createRefundHandover } from '@/services/refunds/finalizeRefundHandover'
import { CaisseSpecialeService } from '@/services/caisse-speciale/CaisseSpecialeService'
import { CaisseImprevueService } from '@/services/caisse-imprevue/CaisseImprevueService'
import { CreditSpecialeService } from '@/services/credit-speciale/CreditSpecialeService'
import { CaisseSpecialeDemandRepository } from '@/repositories/caisse-speciale/CaisseSpecialeDemandRepository'
import { CaisseImprevueDemandRepository } from '@/repositories/caisse-imprevue/CaisseImprevueDemandRepository'
import { MemberRepository } from '@/repositories/members/MemberRepository'
import { AdminRepository } from '@/repositories/admins/AdminRepository'
import { ContractCIRepository } from '@/repositories/caisse-imprevu/ContractCIRepository'
import { PaymentCIRepository } from '@/repositories/caisse-imprevu/PaymentCIRepository'
import { SubscriptionCIRepository } from '@/repositories/caisse-imprevu/SubscriptionCIRepository'
import { SupportCIRepository } from '@/repositories/caisse-imprevu/SupportCIRepository'
import { EarlyRefundCIRepository } from '@/repositories/caisse-imprevu/EarlyRefundCIRepository'
import { CreditDemandRepository } from '@/repositories/credit-speciale/CreditDemandRepository'
import { CreditContractRepository } from '@/repositories/credit-speciale/CreditContractRepository'
import { CreditPaymentRepository } from '@/repositories/credit-speciale/CreditPaymentRepository'
import { CreditPenaltyRepository } from '@/repositories/credit-speciale/CreditPenaltyRepository'
import { CreditInstallmentRepository } from '@/repositories/credit-speciale/CreditInstallmentRepository'
import { GuarantorPaymentRepository } from '@/repositories/credit-speciale/GuarantorPaymentRepository'
import { GuarantorRemunerationRepository } from '@/repositories/credit-speciale/GuarantorRemunerationRepository'
import { NotificationRepository } from '@/repositories/notifications/NotificationRepository'
import { NotificationService } from '@/services/notifications/NotificationService'
import { firebaseCollectionNames as names } from '@/constantes/firebase-collection-names'
import type { AdminUser } from '@/db/admin.db'
import type { CaisseMutationPorts } from '@/services/caisse/mutations'

/** Every dependency is request-scoped. No browser auth, singleton role or token is mutated. */
export function createFinanceServices(caller: MobileCaller) {
  if (!adminFirestore) throw new Error('Base de données indisponible')
  const db = adminFirestore
  const port = createServerFirestorePort(db)
  const firestore = async () => port
  const contributionService = createContributionService(port)
  const projectCreditService = createProjectCreditService({
    ...port,
    ...contributionService,
  })
  const documents = new ServerFinanceDocuments(firestore, true)
  const members = new MemberRepository(firestore, true)
  const admins = new AdminRepository(firestore, true)
  const notifications = new NotificationService(
    new NotificationRepository(firestore, true),
  )
  const ciContracts = new ContractCIRepository(firestore, true)
  const ciPayments = new PaymentCIRepository(firestore, true)
  const ciSubscriptions = new SubscriptionCIRepository(firestore, true)
  const ciSupports = new SupportCIRepository(firestore, true)
  const ciRefunds = new EarlyRefundCIRepository(firestore, true)
  const ciDemands = new CaisseImprevueDemandRepository(firestore, true)
  const creditDemands = new CreditDemandRepository(
    firestore,
    true,
    projectCreditService.createLinkedCreditRecord,
  )
  const creditContracts = new CreditContractRepository(
    firestore,
    true,
    projectCreditService.createLinkedCreditRecord,
  )
  const creditPayments = new CreditPaymentRepository(firestore, true)
  const creditPenalties = new CreditPenaltyRepository(firestore, true)
  const creditInstallments = new CreditInstallmentRepository(firestore, true)
  const guarantorPayments = new GuarantorPaymentRepository(firestore, true)
  const remunerations = new GuarantorRemunerationRepository(firestore, true)
  const csSettings = createCaisseSettingsRepository(firestore)
  const csRefunds = createCaisseRefundsRepository(firestore)
  const csPayments = createCaissePaymentsRepository(firestore)
  const csContracts = createCaisseContractsRepository(firestore, csRefunds)
  const csReaders = createCaisseReaders({
    ...csContracts,
    ...csPayments,
    ...csRefunds,
  })
  const auth = {
    currentUser: {
      uid: caller.claims.uid,
      email: caller.claims.email,
      displayName: caller.claims.name,
    },
  } as CaisseMutationPorts['auth']
  const getAdminById = async (id: string): Promise<AdminUser | null> => {
    const account = await admins.getAdminById(id)
    return account ? ({ ...account, id } as unknown as AdminUser) : null
  }
  const handover = createRefundHandover({ auth, getAdminById, firestore })
  const upload: CaisseMutationPorts['createFile'] = async (
    file,
    ownerId,
    location,
  ) => documents.uploadDocumentFile(file, ownerId, location)
  const cs = createCaisseMutations({
    ...csContracts,
    ...csPayments,
    ...csRefunds,
    ...csSettings,
    ...csReaders,
    auth,
    getAdminById,
    getGroupById: async (id) => {
      const snap = await db.collection(names.groups).doc(id).get()
      return snap.exists
        ? ({ id: snap.id, ...snap.data() } as Awaited<
            ReturnType<CaisseMutationPorts['getGroupById']>
          >)
        : null
    },
    getMemberWithSubscription: async (id) =>
      members.getMemberById(id) as ReturnType<
        CaisseMutationPorts['getMemberWithSubscription']
      >,
    addCaisseContractToUser: async (id, contractId) => {
      await db
        .collection(names.users)
        .doc(id)
        .update({
          caisseContractIds: (
            await import('firebase-admin/firestore')
          ).FieldValue.arrayUnion(contractId),
          updatedAt: new Date(),
        })
      return true
    },
    addCaisseContractToEntity: async (id, contractId, type) => {
      await db
        .collection(type === 'GROUP' ? names.groups : names.users)
        .doc(id)
        .update({
          caisseContractIds: (
            await import('firebase-admin/firestore')
          ).FieldValue.arrayUnion(contractId),
          updatedAt: new Date(),
        })
      return true
    },
    createFile: upload,
    uploadSignedContract: async (file, id) =>
      documents.uploadDocumentFile(file, id, 'ADHESION_CS'),
    compressImage: async (file) => {
      if (file.type === 'application/pdf')
        throw new Error('La preuve de versement CS doit être une image.')
      const sharp = (await import('sharp')).default
      const compressed = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: 1800, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
      return `data:image/webp;base64,${compressed.toString('base64')}`
    },
    resolveIsSuperAdmin: async () => caller.access.isSuperAdmin,
    logAdminAction: async (input) => {
      try {
        await db
          .collection(names.auditLogs)
          .add(
            cleanFinanceWrite({
              ...input,
              adminId: caller.claims.uid,
              createdAt: new Date(),
            }),
          )
      } catch {
        /* L’audit ne doit pas interrompre un versement enregistré. */
      }
    },
    finalizeRefundHandover: handover,
    // The mutation service only uses these two functions to remove a replaced proof.
    ref: ((_storage: unknown, path: string) => ({
      fullPath: path,
    })) as CaisseMutationPorts['ref'],
    getStorageInstance:
      (() => ({})) as CaisseMutationPorts['getStorageInstance'],
    deleteObject: async (reference) => documents.deleteFile(reference.fullPath),
  })
  const csDemands = new CaisseSpecialeDemandRepository(firestore, true)
  const caisseSpeciale = new CaisseSpecialeService(csDemands, {
    notifications,
    members,
    admins,
    subscribe: cs.subscribe,
    getActiveSettings: csSettings.getActiveSettings,
    firestore,
  })
  const ciDemandRepository = new DemandCIRepository(
    { ...port, fbLimit: port.limit },
    true,
  )
  const ciDemandService = new CIDemandService({
    demands: ciDemandRepository,
    contracts: ciContracts,
    members,
    documents,
    subscriptions: ciSubscriptions,
    firestore,
  })
  const csContractRepository = new CaisseContractsRepository(
    { ...port, fbLimit: port.limit },
    {
      subscribe: cs.subscribe,
      listPayments: csPayments.listPayments,
      deleteAllPayments: csPayments.deleteAllPayments,
      deletePaymentDoc: csPayments.deletePayment,
      deleteAllRefunds: csRefunds.deleteAllRefunds,
      updateContractPdf: csContracts.updateContractPdf,
      createFile: upload,
      getEarlyWithdrawalContractIds: (fund, filter, ids) =>
        getEarlyWithdrawalContractIds(fund, filter, ids, port),
    },
    true,
  )
  const csContractService = new CaisseContractsService(csContractRepository, {
    deleteFile: (path) => documents.deleteFile(path),
    createFile: upload,
    getDocuments: () => documents,
    getDemands: () => csDemands,
    ...csContracts,
    ...csPayments,
    ...csSettings,
    ...csReaders,
    listRefunds: csRefunds.listRefunds,
    removeCaisseContractFromEntity: async (id, contractId, type) => {
      await db
        .collection(type === 'GROUP' ? names.groups : names.users)
        .doc(id)
        .update({
          caisseContractIds: (
            await import('firebase-admin/firestore')
          ).FieldValue.arrayRemove(contractId),
          updatedAt: new Date(),
        })
      return true
    },
  })
  const caisseImprevue = new CaisseImprevueService(
    members,
    ciSubscriptions,
    ciContracts,
    admins,
    documents,
    ciPayments,
    ciSupports,
    ciRefunds,
    ciDemands,
    notifications,
    () => `v_${crypto.randomUUID()}`,
  )
  const creditSpeciale = new CreditSpecialeService(
    creditDemands,
    creditContracts,
    creditPayments,
    creditPenalties,
    remunerations,
    guarantorPayments,
    {
      notifications,
      members,
      documents,
      contractsCI: ciContracts,
      paymentsCI: ciPayments,
      installments: creditInstallments,
      firestore,
      createFile: upload,
      deleteFile: (path) => documents.deleteFile(path),
      removeStorageFile: (path) => documents.deleteFile(path),
      getShopArticle: async (id) => {
        const snap = await db.collection(names.shopArticles).doc(id).get()
        return snap.exists
          ? ({ id: snap.id, ...snap.data() } as Awaited<
              ReturnType<
                NonNullable<
                  import('@/services/credit-speciale/CreditSpecialeService').CreditServicePorts['getShopArticle']
                >
              >
            >)
          : null
      },
      getShopCreditPartner: async (id) => {
        const snap = await db.collection(names.shopCreditPartners).doc(id).get()
        return snap.exists
          ? ({
              shopId: snap.id,
              enabled: false,
              discountPercent: 0,
              ...snap.data(),
            } as Awaited<
              ReturnType<
                import('@/services/credit-speciale/CreditSpecialeService').CreditServicePorts['getShopCreditPartner']
              >
            >)
          : null
      },
    },
  )
  return {
    db,
    firestore,
    documents,
    members,
    admins,
    notifications,
    handover,
    caisseSpeciale,
    caisseImprevue,
    creditSpeciale,
    ciDemandService,
    ciDemandRepository,
    csContractRepository,
    csContractService,
    cs,
    csContracts,
    csPayments,
    csRefunds,
    csSettings,
    csReaders,
    ciContracts,
    ciPayments,
    ciSubscriptions,
    ciSupports,
    ciRefunds,
    ciDemands,
    creditContracts,
    creditPayments,
    creditPenalties,
    creditDemands,
    creditInstallments,
    guarantorPayments,
    remunerations,
  }
}
export type FinanceServices = ReturnType<typeof createFinanceServices>
