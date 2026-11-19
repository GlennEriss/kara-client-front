import {
  dateField,
  moneyField,
  idField,
  type FieldDefinition,
} from '@/domains/finance/actions'
import { select, type AdminModule, type Dataset } from '../catalog'
import { communityMetrics } from './community-presentation'
export function sectionFilters(
  module: AdminModule,
  dataset: Dataset,
  rows: Record<string, any>[],
): FieldDefinition[] {
  const list: FieldDefinition[] = []
  const pick = (key: string, label: string, read = (r: any) => r[key]) => {
    const values = [
      ...new Set(
        rows.flatMap((r) => {
          const v = read(r)
          return Array.isArray(v) ? v : v == null ? [] : [String(v)]
        }),
      ),
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'fr'))
    if (values.length) list.push(select(key, label, values, true))
  }
  if (['members', 'birthdays', 'member-requests'].includes(module.key)) {
    pick('membershipType', 'Type de membre')
    pick(
      'nationality',
      'Nationalité',
      (r) => r.nationality || r.identity?.nationality,
    )
    list.push(select('hasCar', 'Possède un véhicule', ['true', 'false'], true))
    if (module.key === 'members') {
      list.push({
        ...select('isSubscriptionValid', 'Abonnement', ['true', 'false'], true),
        options: [
          { value: 'true', label: 'Valide' },
          { value: 'false', label: 'Invalide ou absent' },
        ],
      })
      pick('province', 'Province', (r) => r.address?.province)
      pick('city', 'Ville', (r) => r.address?.city)
      pick('district', 'Quartier', (r) => r.address?.district)
      pick('companyName', 'Entreprise')
      pick('profession', 'Métier')
    }
    if (module.key === 'member-requests')
      list.push(
        select('isPaid', 'Paiement enregistré', ['true', 'false'], true),
      )
    if (module.key === 'birthdays')
      list.push(
        select(
          'birthdayMonth',
          'Mois de naissance',
          Array.from({ length: 12 }, (_, i) => String(i + 1)),
          true,
        ),
      )
  }
  if (
    ['placements', 'payment-history', 'contract-history'].includes(module.key)
  )
    list.push(idField('memberId', 'Membre', 'members', false))
  if (module.key === 'placements') {
    list.push(
      select(
        'payoutMode',
        'Règlement',
        ['MonthlyCommission_CapitalEnd', 'CapitalPlusCommission_End'],
        true,
      ),
      select('durationRange', 'Durée', ['short', 'long'], true),
      select('contractState', 'Contrat signé', ['present', 'missing'], true),
      select(
        'sort',
        'Tri',
        ['recent', 'amountDesc', 'amountAsc', 'nextDate'],
        true,
      ),
      {
        ...moneyField('minAmount', 'Montant minimum (FCFA)', false),
        required: false,
      },
      {
        ...moneyField('maxAmount', 'Montant maximum (FCFA)', false),
        required: false,
      },
      {
        ...dateField('nextFrom', 'Prochaine échéance depuis'),
        required: false,
      },
      {
        ...dateField('nextTo', 'Prochaine échéance jusqu’au'),
        required: false,
      },
    )
  }
  if (module.key === 'vehicles') {
    list.push(select('sort', 'Tri alphabétique', ['nameAsc', 'nameDesc'], true))
    pick('insuranceCompany', 'Assureur')
    pick('vehicleType', 'Bien assuré')
    pick('holderType', 'Type de titulaire')
    pick('declarationStatus', 'Déclaration')
    list.push(idField('sponsorMemberId', 'Parrain', 'members', false))
  }
  if (module.key === 'shops') {
    pick('category', 'Catégorie')
    pick('city', 'Ville')
    list.push(select('isActive', 'Actif', ['true', 'false'], true))
    if (dataset.key === 'articles')
      list.push(idField('parentId', 'Boutique', 'shops', false))
  }
  if (module.key === 'events')
    list.push(
      select(
        'type',
        'Type d’événement',
        ['assembly', 'celebration', 'training', 'charity', 'other'],
        true,
      ),
      select('sort', 'Tri par date', ['dateDesc', 'dateAsc'], true),
    )
  if (module.key === 'calls') {
    pick('channel', 'Canal')
    pick('outcome', 'Résultat')
    pick('adminId', 'Administrateur')
    pick('product', 'Activité')
  }
  if (module.key === 'journal') {
    pick('action', 'Action')
    pick('module', 'Section')
    pick('adminId', 'Administrateur')
  }
  if (module.key === 'geography') {
    const parent = {
      departments: ['provinces', 'Province'],
      communes: ['departments', 'Département'],
      districts: ['communes', 'Commune'],
      quarters: ['districts', 'Arrondissement'],
    }[dataset.key]
    if (parent) list.push(idField('parentId', parent[1], parent[0], false))
  }
  if (module.key === 'payment-history') {
    pick('mode', 'Moyen de paiement')
    pick('paymentType', 'Nature du paiement')
    pick('sourceType', 'Activité')
  }
  if (module.key === 'contract-history') pick('type', 'Type de document')
  if (
    ![
      'references',
      'geography',
      'help',
      'messages',
      'documents',
      'birthdays',
    ].includes(module.key)
  )
    list.push(
      { ...dateField('from', 'Depuis'), required: false },
      { ...dateField('to', 'Jusqu’au'), required: false },
    )
  return list.map((f) => ({ ...f, required: false }))
}
export function sectionMetrics(
  module: AdminModule,
  dataset: Dataset,
  rows: Record<string, any>[],
  selected: Record<string, any>[],
) {
  const community = communityMetrics(module.key, dataset.key, rows)
  if (community) return community
  const metric = (label: string, value: number) => ({ label, value })
  const count = (key: string, states: string[]) =>
    rows.filter((r) => states.includes(String(r[key]))).length
  const total = (key: string) =>
    rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0)
  const base = [
    metric('Total', rows.length),
    metric('Résultats', selected.length),
  ]
  if (module.key === 'members')
    return [
      ...base,
      metric('Adhérents', count('membershipType', ['adherant'])),
      metric('Bienfaiteurs', count('membershipType', ['bienfaiteur'])),
    ]
  if (module.key === 'member-requests')
    return [
      ...base,
      metric('En attente', count('status', ['pending'])),
      metric('À corriger', count('status', ['under_review'])),
      metric('Approuvées', count('status', ['approved'])),
      metric('Refusées', count('status', ['rejected'])),
    ]
  if (module.key === 'groups')
    return [
      metric('Groupes', rows.length),
      metric(
        'Projets ouverts',
        rows.reduce(
          (s, r) =>
            s +
            (r.projects || []).filter((p: any) =>
              ['ACTIVE', 'PLANNED'].includes(p.status),
            ).length,
          0,
        ),
      ),
      metric(
        'Projets terminés',
        rows.reduce(
          (s, r) =>
            s +
            (r.projects || []).filter((p: any) => p.status === 'COMPLETED')
              .length,
          0,
        ),
      ),
    ]
  if (module.key === 'placements')
    return dataset.key === 'demands'
      ? [
          metric('Demandes', rows.length),
          metric('En attente', count('status', ['PENDING'])),
          metric('Acceptées', count('status', ['APPROVED'])),
          metric('Refusées', count('status', ['REJECTED'])),
          metric('Converties', rows.filter((r) => !!r.placementId).length),
          metric('Montant demandé (FCFA)', total('amount')),
        ]
      : [
          metric('Total', rows.length),
          metric('Capital (FCFA)', total('amount')),
          metric('Actifs', count('status', ['Active'])),
          metric(
            'Commissions dues',
            rows.reduce(
              (s, r) => s + Number(r.placementView?.dueCount || 0),
              0,
            ),
          ),
          metric(
            'Commissions payées',
            rows.reduce(
              (s, r) => s + Number(r.placementView?.paidCount || 0),
              0,
            ),
          ),
          metric('Retrait anticipé', count('status', ['EarlyExit'])),
          metric(
            'Mode mensuel',
            count('payoutMode', ['MonthlyCommission_CapitalEnd']),
          ),
          metric(
            'Mode final',
            count('payoutMode', ['CapitalPlusCommission_End']),
          ),
        ]
  if (module.key === 'bienfaiteur')
    return [
      metric(
        'Évènements (année)',
        rows.filter((r) =>
          String(r.startDate || '').startsWith(
            String(new Date().getFullYear()),
          ),
        ).length,
      ),
      metric('Montant collecté (FCFA)', total('totalCollectedAmount')),
      metric('Total participants', total('totalParticipantsCount')),
    ]
  if (module.key === 'vehicles') {
    if (dataset.key === 'rewards')
      return [
        metric(
          'Commissions à recevoir (FCFA)',
          rows
            .filter((r) => r.status === 'AWAITING_PARTNER')
            .reduce((s, r) => s + Number(r.expectedCommission || 0), 0),
        ),
        metric(
          'À verser aux membres (FCFA)',
          rows
            .filter((r) => r.status === 'TO_PAY')
            .reduce((s, r) => s + Number(r.memberAmount || 0), 0),
        ),
        metric(
          'Versé aux membres (FCFA)',
          rows
            .filter((r) => r.status === 'PAID')
            .reduce((s, r) => s + Number(r.memberAmount || 0), 0),
        ),
        metric(
          'Gardé par LE KARA (FCFA)',
          rows.reduce(
            (s, r) =>
              s +
              (r.partnerReceipt
                ? Number(r.partnerReceipt.amount || 0) -
                  Number(r.memberAmount || 0)
                : 0),
            0,
          ),
        ),
      ]
    if (dataset.key === 'partners') return [metric('Assureurs', rows.length)]
    rows = rows.filter(
      (r) => !r.declarationStatus || r.declarationStatus === 'validated',
    )
    return [
      metric('Assurés', rows.length),
      metric('Actifs', count('status', ['active'])),
      metric('Expire bientôt', count('status', ['expires_soon'])),
      metric('Expirées', count('status', ['expired'])),
      metric('Membres assurés', count('holderType', ['member'])),
      metric('Non-membres', count('holderType', ['non-member'])),
    ]
  }
  if (module.key === 'shops' || module.key === 'events')
    return [
      ...base,
      metric('En attente', count('status', ['pending', 'draft'])),
      metric(
        module.key === 'shops' ? 'Publiées' : 'Publiés',
        count('status', [
          'approved',
          'published',
          'poll_open',
          'location_confirmed',
        ]),
      ),
    ]
  if (module.key === 'payment-history')
    return [...base, metric('Montant (FCFA)', total('amount'))]
  return base
}
