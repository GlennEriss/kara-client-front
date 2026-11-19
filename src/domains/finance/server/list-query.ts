import { z } from 'zod'
import { identifier } from '../actions'

export const financeListSchema = z
  .object({
    kind: z.enum(['contracts', 'demands', 'settings']).default('contracts'),
    search: z.string().trim().max(120).default(''),
    status: z.string().max(50).optional(),
    type: z.string().max(60).optional(),
    settingsSort: z.enum(['recent', 'effective', 'nameAsc']).optional(),
    presentation: z.literal('cards').optional(),
    profile: z.enum(['INDIVIDUAL', 'GROUP']).optional(),
    category: identifier.optional(),
    memberId: identifier.optional(),
    tab: z
      .enum([
        'active',
        'closed',
        'overdue',
        'currentMonth',
        'fixed',
        'writtenOff',
      ])
      .optional(),
    earlyWithdrawal: z.enum(['IN_PROGRESS', 'FINALIZED']).optional(),
    monthlyMin: z.coerce.number().finite().min(0).optional(),
    monthlyMax: z.coerce.number().finite().min(0).optional(),
    amountMin: z.coerce.number().finite().min(0).optional(),
    amountMax: z.coerce.number().finite().min(0).optional(),
    paidMin: z.coerce.number().finite().min(0).optional(),
    paidMax: z.coerce.number().finite().min(0).optional(),
    remainingMin: z.coerce.number().finite().min(0).optional(),
    remainingMax: z.coerce.number().finite().min(0).optional(),
    durationMin: z.coerce.number().int().min(0).optional(),
    durationMax: z.coerce.number().int().min(0).optional(),
    createdFrom: z.iso.date().optional(),
    createdTo: z.iso.date().optional(),
    dueFrom: z.iso.date().optional(),
    dueTo: z.iso.date().optional(),
    cursor: identifier.optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict()
