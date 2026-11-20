import { caisseSettingsActions } from './caisse-settings'
import { isCreditModule, creditTypeForModule } from '../credit-module'
/* eslint-disable no-restricted-imports -- Adaptateur temporaire vers les règles métier et modèles officiels existants. */
import { z } from 'zod'
import {
  asDate,
  dateField,
  defineAction,
  field,
  moneyField,
  numberField,
  selectField,
  type FinanceAction,
  type FinanceModule,
} from '../actions'
import { caisseTypes } from './demands'
import { DemandSimulationService } from '@/domains/financial/caisse-imprevue/services/DemandSimulationService'
import { runCaisseSpecialeSimulationWithSettings } from '@/services/caisse-speciale/CaisseSpecialeSimulationService'
export function settingsActions(module: FinanceModule): FinanceAction[] {
  const action = (
    id: string,
    label: string,
    scope: 'workspace' | 'settings',
    fields: Parameters<typeof defineAction>[5],
    run: FinanceAction['run'],
    extra = {},
  ) =>
    defineAction(
      module,
      id,
      label,
      scope,
      id.startsWith('simulation') ? 'view' : 'settings',
      fields,
      run,
      extra,
    )
  if (isCreditModule(module))
    return [
      action(
        'simulation.standard',
        'Simulation standard',
        'workspace',
        [
          moneyField(),
          field(
            'interestRate',
            'Taux (%)',
            'number',
            z
              .number()
              .min(0)
              .max(
                module === 'caisse-aide'
                  ? 5
                  : module === 'credit-fixe'
                    ? 50
                    : 100,
              ),
          ),
          moneyField('monthlyPaymentAmount', 'Mensualité (FCFA)'),
          dateField('firstPaymentDate', 'Première échéance'),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.calculateStandardSimulation(
            d.amount,
            d.interestRate,
            d.monthlyPaymentAmount,
            asDate(d.firstPaymentDate),
            creditTypeForModule(module),
          ),
        { readonly: true },
      ),
      action(
        'simulation.custom',
        'Simulation personnalisée',
        'workspace',
        [
          moneyField(),
          field(
            'interestRate',
            'Taux (%)',
            'number',
            z
              .number()
              .min(0)
              .max(
                module === 'caisse-aide'
                  ? 5
                  : module === 'credit-fixe'
                    ? 50
                    : 100,
              ),
          ),
          dateField('firstPaymentDate', 'Première échéance'),
          field(
            'monthlyPayments',
            'Échéancier',
            'rows',
            z
              .array(
                z
                  .object({
                    month: z.number().int().positive(),
                    amount: z.number().positive(),
                  })
                  .strict(),
              )
              .min(1)
              .max(1200),
            {
              fields: [numberField('month', 'Échéance', 1, 1200), moneyField()],
            },
          ),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.calculateCustomSimulation(
            d.amount,
            d.interestRate,
            d.monthlyPayments,
            asDate(d.firstPaymentDate),
            creditTypeForModule(module),
          ),
        { readonly: true },
      ),
      action(
        'simulation.proposed',
        'Simulation par durée',
        'workspace',
        [
          moneyField('totalAmount', 'Capital (FCFA)'),
          field(
            'interestRate',
            'Taux (%)',
            'number',
            z
              .number()
              .min(0)
              .max(
                module === 'caisse-aide'
                  ? 5
                  : module === 'credit-fixe'
                    ? 50
                    : 100,
              ),
          ),
          numberField(
            'duration',
            'Durée (mois)',
            1,
            module === 'caisse-aide' ? 3 : module === 'credit-fixe' ? 14 : 1200,
          ),
          dateField('firstPaymentDate', 'Première échéance'),
        ],
        async (ctx, d) =>
          ctx.services.creditSpeciale.calculateProposedSimulation(
            d.totalAmount,
            d.duration,
            d.interestRate,
            asDate(d.firstPaymentDate),
            creditTypeForModule(module),
          ),
        { readonly: true },
      ),
    ]
  return [
    ...caisseSettingsActions(module),
    ...(module === 'caisse-imprevue'
      ? [
          action(
            'simulation.standard',
            'Simulation de caisse',
            'workspace',
            [
              moneyField('subscriptionCIAmountPerMonth', 'Mensualité (FCFA)'),
              numberField('subscriptionCIDuration', 'Durée (mois)', 1, 1200),
              dateField('desiredStartDate', 'Début'),
              selectField('paymentFrequency', 'Fréquence', [
                { value: 'MONTHLY', label: 'Mensuelle' },
                { value: 'DAILY', label: 'Journalière' },
              ]),
            ],
            async (_ctx, d) =>
              DemandSimulationService.getInstance().calculatePaymentSchedule(
                d as any,
              ),
            { readonly: true },
          ),
        ]
      : []),
    ...(module === 'caisse-speciale'
      ? [
          action(
            'simulation.standard',
            'Simulation de caisse',
            'workspace',
            [
              selectField(
                'caisseType',
                'Type de caisse',
                caisseTypes.filter((row) => row.value.startsWith('STANDARD')),
              ),
              moneyField('monthlyAmount', 'Mensualité (FCFA)'),
              numberField('durationMonths', 'Durée (mois)', 1, 1200),
              dateField('startDate', 'Début'),
            ],
            async (ctx, d) =>
              runCaisseSpecialeSimulationWithSettings(
                { ...d, startDate: asDate(d.startDate) },
                ctx.services.csSettings.getActiveSettings,
              ),
            { readonly: true },
          ),
        ]
      : []),
  ]
}
