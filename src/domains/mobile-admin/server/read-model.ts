import { memberRecentForm } from './membership-presentation'
import { searchHelp } from '@/domains/help/utils/help-search'
import { BirthdaysService } from '@/domains/memberships/services/BirthdaysService'
import {
  canWithAccess,
  adminAccessRedirect,
} from '@/domains/auth/access-policy'
import { MESSAGE_TEMPLATES } from '@/domains/messaging/constants/message-templates'
import { HELP_TOPICS } from '@/domains/help/content'
import { fromFirestore } from '@/domains/mobile/server/calendar-service'
import type { AdminModule, Dataset } from '../catalog'
import type { AdminServices } from './context'
import type { MobileCaller } from '@/domains/mobile/server/access'
export const plain = (value: any): any =>
  JSON.parse(JSON.stringify(fromFirestore(value)))
export const normalized = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
export const title = (r: any) =>
  String(
    r.title ||
      r.name ||
      r.benefactorName ||
      r.memberName ||
      [
        r.firstName ||
          r.prenom ||
          r.identity?.firstName ||
          r.clientFirstName ||
          r.memberFirstName ||
          r.nonMemberFirstName,
        r.lastName ||
          r.nom ||
          r.identity?.lastName ||
          r.clientLastName ||
          r.memberLastName ||
          r.nonMemberLastName,
      ]
        .filter(Boolean)
        .join(' ') ||
      r.description ||
      r.id,
  )
export async function readRows(
  services: AdminServices,
  module: AdminModule,
  dataset: Dataset,
  caller: MobileCaller,
): Promise<Record<string, any>[]> {
  if (module.key === 'member-requests' && dataset.key === 'duplicates')
    return plain(await services.duplicates.getUnresolvedGroups()).map(
      (r: any) => ({
        ...r,
        title: `${r.type === 'phone' ? 'Téléphone' : r.type === 'email' ? 'Email' : 'Pièce d’identité'} : ${r.value}`,
      }),
    )
  if (module.key === 'messages') {
    const saved = (
      await services.db.collection('settings').doc('messageTemplates').get()
    ).data()
    return MESSAGE_TEMPLATES.map((t) => ({
      ...t,
      id: t.key,
      body: saved?.templates?.[t.key] || t.defaultBody,
      baseUrl: saved?.urls?.[t.key] || '',
      status: t.category,
    }))
  }
  if (module.key === 'help')
    return HELP_TOPICS.filter(
      (t) =>
        (!t.superAdminOnly || caller.access.isSuperAdmin) &&
        t.pages.some((p) => !adminAccessRedirect(p.path, caller.access)),
    ).map((t) => ({ ...t, id: t.key, title: t.title, status: t.category }))
  if (module.key === 'documents') {
    const snap = await services.db.collection(dataset.collection).get()
    return ['statuts', 'reglement-interieur'].map((id) => ({
      id,
      title:
        id === 'statuts' ? 'Statuts de l’association' : 'Règlement intérieur',
      ...plain(snap.docs.find((d) => d.id === id)?.data() || {}),
    }))
  }
  const snap = await services.db
    .collection(dataset.collection)
    .limit(10001)
    .get()
  if (snap.size > 10000)
    throw Error(
      'Le volume de cette section nécessite une recherche plus précise.',
    )
  let data = snap.docs.map((d) => ({ ...plain(d.data()), id: d.id }))
  if (module.key === 'members' || module.key === 'birthdays')
    data = data.filter(
      (r) =>
        Array.isArray(r.roles) &&
        r.roles.some((role: string) =>
          ['Adherant', 'Bienfaiteur', 'Sympathisant'].includes(role),
        ),
    )
  if (
    module.key === 'calls' &&
    dataset.key === 'plans' &&
    !caller.access.isSuperAdmin
  )
    data = data.filter(
      (r) =>
        !r.assignee?.adminId ||
        r.assignee.adminId === caller.claims.uid ||
        r.assignee.email === caller.claims.email,
    )
  if (module.key === 'vehicles' && dataset.key === 'insurance')
    data = data.filter((r) => r.declarationStatus !== 'draft')
  if (module.key === 'members')
    data = plain(
      await services.memberDatabase.enrichWithSubscriptionsBatch(data as any),
    )
  if (module.key === 'birthdays') {
    const reference = new Date(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Libreville',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()) + 'T12:00:00Z',
    )
    data = data.flatMap((r) => {
      try {
        const info = BirthdaysService.calculateBirthdayInfo(
          r.birthDate,
          reference,
        )
        return [
          {
            id: r.id,
            matricule: r.matricule,
            firstName: r.firstName,
            lastName: r.lastName,
            birthDate: r.birthDate,
            photoURL: r.photoURL,
            contacts: r.contacts,
            whatsappNumber: r.whatsappNumber,
            membershipType: r.membershipType,
            nationality: r.nationality,
            hasCar: r.hasCar,
            nextBirthday: info.nextBirthday.toISOString(),
            age: info.age,
            daysUntil: info.daysUntil,
          },
        ]
      } catch {
        return []
      }
    })
    return data.sort((a, b) => a.daysUntil - b.daysUntil)
  }
  return data.sort(
    (a, b) =>
      String(b.createdAt || b.updatedAt || '').localeCompare(
        String(a.createdAt || a.updatedAt || ''),
      ) || title(a).localeCompare(title(b), 'fr'),
  )
}
export function filterRows(
  rows: Record<string, any>[],
  input: Record<string, any>,
  moduleKey?: string,
) {
  if (moduleKey === 'help' && input.search) {
    rows = searchHelp(rows as any, input.search).map((r) => r.topic as any)
    input = { ...input, search: '' }
  }
  return rows.filter((row) => {
    if (
      input.search &&
      !normalized(
        [
          row.id,
          title(row),
          row.matricule,
          row.email,
          row.identity,
          row.contacts,
          row.memberId,
          row.clientId,
          row.description,
          ...(moduleKey === 'help'
            ? [row.summary, row.steps, row.faq, row.rules, row.pages]
            : []),
          row.phone,
          row.tel1,
          row.plateNumber,
          row.insuranceCompany,
          row.category,
          row.address,
        ]
          .map((v) => (typeof v === 'object' ? JSON.stringify(v) : v))
          .join(' '),
      ).includes(normalized(input.search))
    )
      return false
    for (const key of [
      'membershipType',
      'nationality',
      'province',
      'city',
      'district',
      'companyName',
      'profession',
      'insuranceCompany',
      'vehicleType',
      'holderType',
      'declarationStatus',
      'category',
      'channel',
      'outcome',
      'adminId',
      'product',
      'action',
      'module',
      'mode',
      'paymentType',
      'sourceType',
      'type',
      'sponsorMemberId',
    ])
      if (
        input[key] &&
        String(row[key] ?? row.identity?.[key] ?? row.address?.[key] ?? '') !==
          String(input[key])
      )
        return false
    if (
      input.isSubscriptionValid &&
      String(row.isSubscriptionValid) !== input.isSubscriptionValid
    )
      return false
    if (input.birthdayPeriod) {
      const days = Number(row.daysUntil)
      if (input.birthdayPeriod === 'nearby' && days > 30 && days < 358)
        return false
      if (
        (input.birthdayPeriod === 'today' && days !== 0) ||
        (input.birthdayPeriod === 'week' && (days < 1 || days > 7)) ||
        (input.birthdayPeriod === 'upcoming' && (days < 8 || days > 30)) ||
        (input.birthdayPeriod === 'recent' && days < 358)
      )
        return false
    }
    if (
      input.birthdayMonths &&
      !String(input.birthdayMonths)
        .split(',')
        .map(Number)
        .includes(new Date(row.birthDate).getUTCMonth() + 1)
    )
      return false
    for (const key of ['isPaid', 'isActive', 'hasCar'])
      if (
        input[key] &&
        String(row[key] ?? row.identity?.[key] ?? false) !== input[key]
      )
        return false
    if (
      input.birthdayMonth &&
      new Date(row.birthDate || row.identity?.birthDate).getUTCMonth() + 1 !==
        Number(input.birthdayMonth)
    )
      return false
    if (
      input.status &&
      String(
        row.status ??
          (row.actif === false || row.isActive === false
            ? 'inactive'
            : 'active'),
      ) !== input.status
    )
      return false
    if (
      input.memberId &&
      ![row.memberId, row.clientId, row.benefactorId, row.id].includes(
        input.memberId,
      )
    )
      return false
    if (
      input.parentId &&
      ![
        row.provinceId,
        row.departmentId,
        row.communeId,
        row.districtId,
        row.shopId,
      ].includes(input.parentId)
    )
      return false
    if (
      input.from &&
      String(
        moduleKey === 'calls' && row.scheduledDate
          ? row.scheduledDate
          : ['events', 'bienfaiteur'].includes(moduleKey || '')
            ? row.startDate || row.createdAt
            : moduleKey === 'payment-history'
              ? row.date || row.createdAt
              : row.createdAt || row.date || '',
      ).slice(0, 10) < input.from
    )
      return false
    if (
      input.to &&
      String(
        moduleKey === 'calls' && row.scheduledDate
          ? row.scheduledDate
          : ['events', 'bienfaiteur'].includes(moduleKey || '')
            ? row.startDate || row.createdAt
            : moduleKey === 'payment-history'
              ? row.date || row.createdAt
              : row.createdAt || row.date || '',
      ).slice(0, 10) > input.to
    )
      return false
    return true
  })
}
export async function relatedRows(
  services: AdminServices,
  module: AdminModule,
  row: any,
  caller: MobileCaller,
) {
  const groups: { key: string; label: string; items: any[] }[] = []
  const read = async (
    key: string,
    label: string,
    path: string,
    field?: string,
    value?: string,
  ) => {
    const col = services.db.collection(path)
    const snap = await (field ? col.where(field, '==', value) : col)
      .limit(1001)
      .get()
    if (snap.size > 1000)
      throw Error('Trop d’éléments liés pour une seule fiche.')
    groups.push({
      key,
      label,
      items: snap.docs.map((d) => ({ ...plain(d.data()), id: d.id })),
    })
  }
  if (module.key === 'member-requests' && Array.isArray(row.requestIds)) {
    const items: any[] = []
    for (let i = 0; i < row.requestIds.length; i += 100) {
      const docs = await services.db.getAll(
        ...row.requestIds
          .slice(i, i + 100)
          .map((id: string) =>
            services.db.collection('membership-requests').doc(id),
          ),
      )
      items.push(
        ...docs
          .filter((d) => d.exists)
          .map((d) => ({ ...plain(d.data()), id: d.id })),
      )
    }
    groups.push({ key: 'requests', label: 'Dossiers concernés', items })
  }
  if (module.key === 'placements' && row.benefactorId) {
    groups.push({
      key: 'commissions',
      label: 'Échéancier des commissions',
      items: plain(await services.placementService.listCommissions(row.id)),
    })
    const early = await services.placementService.getEarlyExit(row.id)
    if (early)
      groups.push({
        key: 'earlyExit',
        label: 'Retrait anticipé',
        items: [plain(early)],
      })
  }
  if (module.key === 'groups') {
    groups.push({
      key: 'projects',
      label: 'Projets',
      items: row.projects || [],
    })
    const members = await services.db
      .collection('users')
      .where('groupIds', 'array-contains', row.id)
      .get()
    groups.push({
      key: 'members',
      label: 'Membres',
      items: members.docs.map((d) => ({ ...plain(d.data()), id: d.id })),
    })
    await read('contributions', 'Cotisations', `groups/${row.id}/contributions`)
    await read(
      'agreements',
      'Accords entre membres',
      `groups/${row.id}/agreements`,
    )
    await read('payouts', 'Remises', 'groupPayouts', 'groupId', row.id)
    const allowedCreditTypes = (['FIXE', 'SPECIALE'] as const).filter((type) =>
      canWithAccess(
        caller.access,
        type === 'FIXE' ? 'creditFixe.view' : 'creditSpeciale.view',
      ),
    )
    if (allowedCreditTypes.length) {
      for (const project of row.projects || []) {
        const financing = await services.projectCredit.loadProjectCredits(
          row.id,
          project.id,
          allowedCreditTypes,
        )
        groups.push({
          key: 'financing-' + project.id,
          label: `Financement · ${project.name}`,
          items: [
            ...plain(financing.demands || []).map((d: any) => ({
              ...d,
              nativeKind: 'demand',
            })),
            ...plain(financing.contracts || []).map((d: any) => ({
              ...d,
              nativeKind: 'contract',
            })),
          ],
        })
      }
    }
    groups.push({
      key: 'history',
      label: 'Historique',
      items: (row.activity || []).map((r: any, i: number) => ({
        ...r,
        id: r.id || String(i),
      })),
    })
  }
  if (module.key === 'bienfaiteur') {
    groups.push({
      key: 'contributions',
      label: 'Contributions',
      items: plain(
        await services.charityContributions.getEventContributions(row.id),
      ),
    })
    for (const [key, label] of [
      ['participants', 'Participants'],
      ['media', 'Médias'],
    ])
      await read(key, label, `charity-events/${row.id}/${key}`)
    await read(
      'declarations',
      'Déclarations',
      'charityContributions',
      'eventId',
      row.id,
    )
  }
  if (module.key === 'events')
    await read('votes', 'Votants', `events/${row.id}/votes`)
  if (module.key === 'members') {
    if (row.dossier) {
      const dossier = await services
        .memberships('')
        .repository.getById(row.dossier)
      if (dossier?.identity?.beneficiary)
        groups.push({
          key: 'beneficiary',
          label: 'Ayant droit',
          items: [
            { ...plain(dossier.identity.beneficiary), id: 'beneficiary' },
          ],
        })
    }
    const stars = await services.charityStars.getMemberStars(row.id)
    groups.push({
      key: 'stars',
      label: 'Étoiles de charité',
      items: [
        { ...plain(stars), id: row.id },
        ...plain(await services.charityStars.listAdjustments(row.id)),
      ],
    })
    await read(
      'subscriptions',
      'Abonnements',
      'subscriptions',
      'userId',
      row.id,
    )
    if (canWithAccess(caller.access, 'documents.download'))
      await read('documents', 'Documents', 'documents', 'memberId', row.id)
    for (const [key, label, col, field, permission] of [
      [
        'contracts-cs',
        'Caisse spéciale',
        'caisseContracts',
        'memberId',
        'caisseSpeciale.view',
      ],
      [
        'contracts-ci',
        'Caisse imprévue',
        'contractsCI',
        'memberId',
        'caisseImprevue.view',
      ],
      [
        'contracts-placement',
        'Placements',
        'placements',
        'benefactorId',
        'placements.view',
      ],
    ])
      if (canWithAccess(caller.access, permission))
        await read(key, label, col, field, row.id)
    const creditPermission = (type: string) =>
      type === 'FIXE'
        ? 'creditFixe.view'
        : type === 'AIDE'
          ? 'creditAide.view'
          : 'creditSpeciale.view'
    if (
      ['creditFixe.view', 'creditAide.view', 'creditSpeciale.view'].some((p) =>
        canWithAccess(caller.access, p),
      )
    ) {
      await read(
        'contracts-credit',
        'Crédits',
        'creditContracts',
        'clientId',
        row.id,
      )
      const linked = groups.find((g) => g.key === 'contracts-credit')
      if (linked)
        linked.items = linked.items.filter((r) =>
          canWithAccess(caller.access, creditPermission(r.creditType)),
        )
    }
    const form = await memberRecentForm(services, row.id, groups)
    groups.push({
      key: 'payment-form',
      label: 'Historique d’activité',
      items: plain(form.products).map((p: any) => ({ ...p, id: p.product })),
    })
    if (canWithAccess(caller.access, 'vehicules.view'))
      await read(
        'member-vehicles',
        'Véhicules et assurances',
        'vehicle-insurances',
        'memberId',
        row.id,
      )
    await read(
      'godchildren',
      'Filleuls',
      'users',
      'intermediaryCode',
      row.matricule || row.id,
    )
  }
  if (module.key === 'placements' && row.benefactorId) {
    const ids = [
      row.contractDocumentId,
      row.finalQuittanceDocumentId,
      row.earlyExitQuittanceDocumentId,
      row.earlyExitAddendumDocumentId,
    ].filter((id): id is string => typeof id === 'string' && !id.includes('/'))
    if (ids.length) {
      const docs = await services.db.getAll(
        ...ids.map((id) => services.db.collection('documents').doc(id)),
      )
      groups.push({
        key: 'documents',
        label: 'Documents du placement',
        items: docs
          .filter((d) => d.exists)
          .map((d) => ({ ...plain(d.data()), id: d.id })),
      })
    }
  }
  if (module.key === 'shops' && row.ownerMemberId) {
    await read('articles', 'Articles', 'shopArticles', 'shopId', row.id)
    const p = await services.shops.getShopCreditPartner(row.id)
    if (p)
      groups.push({
        key: 'partners',
        label: 'Achat à crédit',
        items: [plain(p)],
      })
  }
  return groups
}
