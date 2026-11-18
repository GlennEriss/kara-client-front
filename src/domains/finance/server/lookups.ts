import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { mobileJson } from '@/domains/mobile/server/access'
import { requireFinanceCaller } from './authorization'
import { createFinanceServices } from './services'
import { financeContractDetail } from './read-model'
import { financeModules, identifier } from '../actions'
const schema = z
  .object({
    source: z.enum([
      'members',
      'groups',
      'groupMembers',
      'agents',
      'subscriptions',
      'payments',
      'contributions',
      'versements',
      'penalties',
      'guarantorPayments',
      'refunds',
      'supports',
      'declarations',
    ]),
    search: z.string().trim().max(120).default(''),
    contractId: identifier.optional(),
  })
  .strict()
export async function getFinanceLookups(
  request: NextRequest,
  moduleValue: string,
) {
  const module = z.enum(financeModules).safeParse(moduleValue)
  if (!module.success) return mobileJson({ error: 'Section inconnue.' }, 404)
  const caller = await requireFinanceCaller(request, module.data)
  if (caller instanceof NextResponse) return caller
  const input = schema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  )
  if (!input.success) return mobileJson({ error: 'Recherche invalide.' }, 400)
  try {
    const { source, search, contractId } = input.data
    const services = createFinanceServices(caller)
    let rows: any[] = []
    if (source === 'members') {
      if (search.length < 2) return mobileJson({ items: [] })
      rows = (await services.members.searchMembers(search)).map((row) => ({
        value: row.id,
        label:
          `${row.firstName || ''} ${row.lastName || ''} · ${row.matricule || row.id}`.trim(),
      }))
    } else if (source === 'subscriptions')
      rows = (await services.caisseImprevue.getActiveSubscriptions()).map(
        (row) => ({
          value: row.id,
          label: `${row.code} · ${row.label || ''} · ${row.amountPerMonth} FCFA`,
        }),
      )
    else if (source === 'agents') {
      const snapshot = await services.db
        .collection('agentsRecouvrement')
        .limit(100)
        .get()
      rows = snapshot.docs.map((row) => ({
        value: row.id,
        label:
          `${row.data().prenom || row.data().firstName || ''} ${row.data().nom || row.data().lastName || ''}`.trim() ||
          row.id,
      }))
    } else if (source === 'groups') {
      const snapshot = await services.db.collection('groups').limit(100).get()
      rows = snapshot.docs.map((row) => ({
        value: row.id,
        label: String(row.data().name || row.id),
      }))
    } else {
      if (!contractId)
        return mobileJson({ error: 'Sélectionnez d’abord un contrat.' }, 400)
      const detail: any = await financeContractDetail(
        services,
        module.data,
        contractId,
      )
      if (source === 'groupMembers') {
        const groupId = detail.record.groupeId
        if (!groupId) return mobileJson({ items: [] })
        const snapshot = await services.db
          .collection('users')
          .where('groupIds', 'array-contains', groupId)
          .limit(100)
          .get()
        rows = snapshot.docs.map((row) => ({
          value: row.id,
          label:
            `${row.data().firstName || ''} ${row.data().lastName || ''}`.trim() ||
            row.id,
        }))
      } else {
        const items =
          source === 'declarations'
            ? module.data === 'caisse-speciale'
              ? await services.csRefunds.listDeclaredVersementsCS(contractId)
              : await services.csRefunds.listDeclaredVersementsCI(contractId)
            : detail[source] || []
        rows = items
          .filter(
            (row: any) =>
              source !== 'payments' ||
              module.data !== 'caisse-speciale' ||
              Number(row.accumulatedAmount ?? row.amount) > 0 ||
              row.contribs?.length ||
              row.groupContributions?.length,
          )
          .map((row: any) => ({
            value: row.id,
            label: [
              row.month
                ? `Mois ${row.month}`
                : row.dueMonthIndex != null
                  ? `Mois ${row.dueMonthIndex + 1}`
                  : row.monthIndex != null
                    ? `Mois ${row.monthIndex + 1}`
                    : row.id,
              row.date || row.paymentDate || '',
              row.amount != null ? `${row.amount} FCFA` : '',
              row.status || '',
            ]
              .filter(Boolean)
              .join(' · '),
            meta: {
              month:
                row.month ||
                (row.monthIndex != null
                  ? row.monthIndex + 1
                  : row.dueMonthIndex != null
                    ? row.dueMonthIndex + 1
                    : undefined),
              paymentId: row.paymentId,
              values: {
                ...(source === 'contributions'
                  ? { contributionId: row.id }
                  : {}),
                ...(source === 'versements' ? { versementId: row.id } : {}),
                ...(row.amount != null ? { amount: row.amount } : {}),
                ...(row.mode ? { mode: row.mode } : {}),
                ...(row.time || row.paymentTime
                  ? { time: row.time || row.paymentTime }
                  : {}),
                ...(row.date || row.paymentDate || row.paidAt
                  ? {
                      date: String(
                        row.date ||
                          (row.paymentDate || row.paidAt)?.toISOString?.() ||
                          row.paymentDate ||
                          row.paidAt,
                      ).slice(0, 10),
                    }
                  : {}),
                ...(row.withFees != null ? { withFees: row.withFees } : {}),
              },
            },
          }))
      }
    }
    const normalized = search.toLocaleLowerCase('fr')
    return mobileJson({
      items: rows
        .filter(
          (row) =>
            source === 'members' ||
            !normalized ||
            row.label.toLocaleLowerCase('fr').includes(normalized),
        )
        .slice(0, 100),
    })
  } catch {
    return mobileJson(
      { error: 'Impossible de charger les choix. Réessayez.' },
      503,
    )
  }
}
