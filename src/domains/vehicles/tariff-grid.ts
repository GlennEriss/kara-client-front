import { z } from 'zod'

const label = z.string().trim().min(1).max(150)
export const tariffGridSchema = z.object({
  insurer: z.string().trim().min(1).max(60),
  assetType: z.string().trim().min(1).max(60),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1).nullable(),
  groups: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]{1,80}$/),
    label,
    assetTypes: z.array(z.string().min(1).max(80)).max(20),
    plans: z.array(label).min(1).max(16),
    bands: z.array(z.object({
      label,
      rates: z.array(z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable()).min(1).max(16),
    })).min(1).max(30),
  })).min(1).max(40),
}).superRefine(({ groups }, ctx) => {
  if (new Set(groups.map(group => group.id)).size !== groups.length) {
    ctx.addIssue({ code: 'custom', message: 'Chaque catégorie doit avoir un identifiant unique.' })
  }
  for (const group of groups) {
    const duplicates = (values: string[]) =>
      new Set(values.map(value => value.toLocaleLowerCase('fr'))).size !== values.length
    if (duplicates(group.plans) || duplicates(group.bands.map(band => band.label))) {
      ctx.addIssue({ code: 'custom', message: `Les durées et les lignes de « ${group.label} » doivent être distinctes.` })
    }
    if (group.bands.some(band => band.rates.length !== group.plans.length) ||
        !group.bands.some(band => band.rates.some(rate => rate !== null))) {
      ctx.addIssue({ code: 'custom', message: `Renseignez au moins une prime dans « ${group.label} ».` })
    }
  }
})

export type TariffGridInput = z.infer<typeof tariffGridSchema>
export type TariffGrid = Omit<TariffGridInput, 'revision'> & {
  id: string
  revision: number
  updatedAt: string | null
}
