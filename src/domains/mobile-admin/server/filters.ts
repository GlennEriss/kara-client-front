import {
  dateField,
  idField,
  type FieldDefinition,
} from '@/domains/finance/actions'
import { select, type AdminModule, type Dataset } from '../catalog'
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
  if (module.key === 'vehicles') {
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
  if (module.key === 'events') pick('category', 'Type d’évènement')
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
      ...base,
      metric(
        'Projets',
        rows.reduce((s, r) => s + (r.projects?.length || 0), 0),
      ),
      metric(
        'Projets actifs',
        rows.reduce(
          (s, r) =>
            s +
            (r.projects || []).filter((p: any) => p.status === 'ACTIVE').length,
          0,
        ),
      ),
    ]
  if (module.key === 'placements')
    return [
      ...base,
      metric(
        dataset.key === 'demands' ? 'Demandes acceptées' : 'Placements actifs',
        count('status', dataset.key === 'demands' ? ['APPROVED'] : ['Active']),
      ),
      metric('Capital (FCFA)', total('amount')),
    ]
  if (module.key === 'bienfaiteur')
    return [
      ...base,
      metric('Total collecté (FCFA)', total('totalCollectedAmount')),
      metric('Participants', total('totalParticipantsCount')),
    ]
  if (module.key === 'vehicles')
    return [
      ...base,
      metric('Actives', count('status', ['active'])),
      metric(
        'Déclarations en attente',
        count('declarationStatus', ['pending']),
      ),
    ]
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
