import { z } from 'zod'
import {
  textField,
  idField,
  selectField,
  field,
  type FieldDefinition,
} from '@/domains/finance/actions'
export interface Dataset {
  key: string
  label: string
  collection: string
  fields: FieldDefinition[]
  create?: string
  edit?: string
  delete?: string
  virtual?: boolean
  defaults?: Record<string, unknown>
}
export interface AdminModule {
  key: string
  label: string
  icon: string
  permission: string
  datasets: Dataset[]
}
export const options = (values: string[]) =>
  values.map((value) => ({
    value,
    label: value === 'true' ? 'Oui' : value === 'false' ? 'Non' : value,
  }))
export const nested = (
  key: string,
  label: string,
  fields: FieldDefinition[],
  optional = false,
) =>
  field(
    key,
    label,
    'fields',
    optional
      ? z
          .object(Object.fromEntries(fields.map((f) => [f.key, f.schema])))
          .strict()
          .optional()
      : z
          .object(Object.fromEntries(fields.map((f) => [f.key, f.schema])))
          .strict(),
    { fields },
  )
export const rows = (
  key: string,
  label: string,
  fields: FieldDefinition[],
  optional = false,
) =>
  field(
    key,
    label,
    'rows',
    optional
      ? z
          .array(
            z
              .object(Object.fromEntries(fields.map((f) => [f.key, f.schema])))
              .strict(),
          )
          .max(200)
          .optional()
      : z
          .array(
            z
              .object(Object.fromEntries(fields.map((f) => [f.key, f.schema])))
              .strict(),
          )
          .min(1)
          .max(200),
    { fields },
  )
export const birthDate = (key: string, label: string) =>
  field(
    key,
    label,
    'date',
    z
      .string()
      .regex(/^(19|20)\d{2}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !Number.isNaN(new Date(v + 'T12:00:00Z').getTime()) &&
          new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v,
        'Date invalide',
      ),
    { initial: '' },
  )
export const textArea = (key: string, label: string, optional = false) =>
  field(
    key,
    label,
    'multiline',
    optional
      ? z.string().max(5000).optional()
      : z.string().trim().min(1).max(5000),
  )
export const select = (
  key: string,
  label: string,
  values: string[],
  optional = false,
) => selectField(key, label, options(values), optional)
const simple = (
  key: string,
  label: string,
  collection = key,
  fields = [textField('name', 'Nom')],
): Dataset => ({
  key,
  label,
  collection,
  fields,
  create: 'manage',
  edit: 'manage',
  delete: 'manage',
})
export const adminModules: AdminModule[] = [
  {
    key: 'members',
    label: 'Membres',
    icon: 'account-group-outline',
    permission: 'members',
    datasets: [
      { key: 'members', label: 'Membres', collection: 'users', fields: [] },
    ],
  },
  {
    key: 'member-requests',
    label: 'Demandes d’adhésion',
    icon: 'account-clock-outline',
    permission: 'memberRequests',
    datasets: [
      {
        key: 'requests',
        label: 'Demandes',
        collection: 'membership-requests',
        fields: [],
      },
      {
        key: 'duplicates',
        label: 'Doublons',
        collection: 'duplicate-groups',
        fields: [],
      },
    ],
  },
  {
    key: 'birthdays',
    label: 'Anniversaires',
    icon: 'cake-variant-outline',
    permission: 'birthdays',
    datasets: [
      {
        key: 'birthdays',
        label: 'Anniversaires',
        collection: 'users',
        fields: [],
      },
    ],
  },
  {
    key: 'groups',
    label: 'Groupes et projets',
    icon: 'account-multiple-outline',
    permission: 'groups',
    datasets: [
      { key: 'groups', label: 'Groupes', collection: 'groups', fields: [] },
    ],
  },
  {
    key: 'placements',
    label: 'Placements',
    icon: 'chart-line',
    permission: 'placements',
    datasets: [
      {
        key: 'contracts',
        label: 'Contrats',
        collection: 'placements',
        fields: [],
      },
      {
        key: 'demands',
        label: 'Demandes',
        collection: 'placementDemands',
        fields: [],
      },
    ],
  },
  {
    key: 'bienfaiteur',
    label: 'Charité',
    icon: 'hand-heart-outline',
    permission: 'bienfaiteur',
    datasets: [
      {
        key: 'events',
        label: 'Collectes',
        collection: 'charity-events',
        fields: [],
      },
    ],
  },
  {
    key: 'vehicles',
    label: 'Véhicules et assurances',
    icon: 'car-outline',
    permission: 'vehicules',
    datasets: [
      {
        key: 'insurance',
        label: 'Assurances',
        collection: 'vehicle-insurances',
        fields: [],
      },
      { key: 'prospects', label: 'Prospection', collection: 'insurance-prospects', fields: [] },
      {
        key: 'partners',
        label: 'Taux assureurs',
        collection: 'vehicleInsurancePartners',
        fields: [],
      },
      {
        key: 'rewards',
        label: 'Reversements',
        collection: 'vehicleInsuranceRewards',
        fields: [],
      },
    ],
  },
  {
    key: 'shops',
    label: 'Boutiques',
    icon: 'storefront-outline',
    permission: 'boutiques',
    datasets: [
      { key: 'shops', label: 'Boutiques', collection: 'shops', fields: [] },
      {
        key: 'articles',
        label: 'Articles',
        collection: 'shopArticles',
        fields: [],
      },
      {
        key: 'partners',
        label: 'Achat à crédit',
        collection: 'shopCreditPartners',
        fields: [],
      },
    ],
  },
  {
    key: 'events',
    label: 'Événements',
    icon: 'calendar-star',
    permission: 'events',
    datasets: [
      { key: 'events', label: 'Événements', collection: 'events', fields: [] },
    ],
  },
  {
    key: 'agents',
    label: 'Agents de recouvrement',
    icon: 'account-tie-outline',
    permission: 'agents',
    datasets: [
      {
        key: 'agents',
        label: 'Agents',
        collection: 'agentsRecouvrement',
        fields: [],
      },
    ],
  },
  {
    key: 'calls',
    label: 'Relances et appels',
    icon: 'phone-log-outline',
    permission: 'calendar',
    datasets: [
      { key: 'logs', label: 'Journal', collection: 'callLogs', fields: [] },
      { key: 'plans', label: 'Planning', collection: 'callPlans', fields: [] },
    ],
  },
  {
    key: 'references',
    label: 'Métiers / Entreprises',
    icon: 'briefcase-outline',
    permission: 'references',
    datasets: [
      simple('companies', 'Entreprises', 'companies', [
        textField('name', 'Nom'),
        textField('industry', 'Secteur d’activité', false),
        nested('address', 'Adresse', [
          textField('province', 'Province', false),
          textField('city', 'Ville', false),
          textField('district', 'Quartier', false),
        ]),
      ]),
      simple('professions', 'Métiers', 'professions', [
        textField('name', 'Nom'),
        textArea('description', 'Description', true),
      ]),
    ],
  },
  {
    key: 'geography',
    label: 'Géographie',
    icon: 'map-marker-radius-outline',
    permission: 'geography',
    datasets: [
      simple('provinces', 'Provinces', 'provinces', [
        textField('name', 'Nom'),
        textField('code', 'Code'),
      ]),
      simple('departments', 'Départements', 'departments', [
        idField('provinceId', 'Province', 'provinces'),
        textField('name', 'Nom'),
        textField('code', 'Code', false),
      ]),
      simple('communes', 'Communes', 'communes', [
        idField('departmentId', 'Département', 'departments'),
        textField('name', 'Nom'),
        textField('postalCode', 'Code postal', false),
        textField('alias', 'Alias', false),
      ]),
      simple('districts', 'Arrondissements', 'districts', [
        idField('communeId', 'Commune', 'communes'),
        textField('name', 'Nom'),
      ]),
      simple('quarters', 'Quartiers', 'quarters', [
        idField('districtId', 'Arrondissement', 'districts'),
        textField('name', 'Nom'),
      ]),
    ],
  },
  {
    key: 'admins',
    label: 'Administration',
    icon: 'shield-account-outline',
    permission: 'admins',
    datasets: [
      {
        key: 'admins',
        label: 'Administrateurs',
        collection: 'admins',
        fields: [],
      },
    ],
  },
  {
    key: 'journal',
    label: 'Journalisation',
    icon: 'clipboard-text-clock-outline',
    permission: 'journal',
    datasets: [
      { key: 'audit', label: 'Actions', collection: 'auditLogs', fields: [] },
    ],
  },
  {
    key: 'payment-history',
    label: 'Historique des paiements',
    icon: 'cash-clock',
    permission: 'paymentsHistory',
    datasets: [
      {
        key: 'payments',
        label: 'Paiements',
        collection: 'payments',
        fields: [],
      },
    ],
  },
  {
    key: 'contract-history',
    label: 'Historique des contrats',
    icon: 'file-clock-outline',
    permission: 'contractsHistory',
    datasets: [
      {
        key: 'documents',
        label: 'Documents',
        collection: 'documents',
        fields: [],
      },
    ],
  },
  {
    key: 'messages',
    label: 'Modèles de messages',
    icon: 'message-text-outline',
    permission: 'messageTemplates',
    datasets: [
      {
        key: 'templates',
        label: 'Modèles',
        collection: 'settings',
        fields: [],
        virtual: true,
      },
    ],
  },
  {
    key: 'documents',
    label: 'Documents de l’association',
    icon: 'file-document-multiple-outline',
    permission: 'documents',
    datasets: [
      {
        key: 'documents',
        label: 'Documents officiels',
        collection: 'association-documents',
        fields: [],
        virtual: true,
      },
    ],
  },
  {
    key: 'help',
    label: 'Centre d’aide',
    icon: 'lifebuoy',
    permission: '',
    datasets: [
      {
        key: 'topics',
        label: 'Fiches d’aide',
        collection: '',
        fields: [],
        virtual: true,
      },
    ],
  },
]
export const getAdminModule = (key: string) =>
  adminModules.find((m) => m.key === key)
