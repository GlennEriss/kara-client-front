import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/firebase/adminAuth'
import { requireMobileCaller, mobileJson } from '@/domains/mobile/server/access'
import { toolRequestSchema, toolCalendarPath, toolDashboardPath } from '@/domains/mobile/tool-session'
import { calendarContractHref } from '@/utils/calendar-contract-link'
import { canWithAccess } from '@/domains/auth/access-policy'
type OverdueProduct = Parameters<typeof calendarContractHref>[0]
import type { MobileModule } from '@/domains/mobile/contracts'

export const runtime = 'nodejs'
const products: Record<MobileModule, OverdueProduct> = {
  'caisse-speciale': 'Caisse Spéciale', 'caisse-imprevue': 'Caisse Imprévue',
  'credit-speciale': 'Crédit Spéciale', 'credit-fixe': 'Crédit Fixe',
  'caisse-aide': 'Crédit Aide', placement: 'Placement',
}
export async function POST(request: NextRequest) {
  // Le jeton est vérifié avec révocation, puis les droits sont relus en base.
  const caller = await requireMobileCaller(request)
  if (caller instanceof NextResponse) return caller
  if (caller.mustChangePassword) return mobileJson({ error: 'Choisissez votre mot de passe personnel avant de continuer.' }, 403)
  let body: unknown
  try { body = await request.json() } catch { return mobileJson({ error: 'Demande invalide.' }, 400) }
  const parsed = toolRequestSchema.safeParse(body)
  if (!parsed.success) return mobileJson({ error: 'Outil ou paramètres invalides.' }, 400)
  const input = parsed.data
  const allowed = input.target === 'dashboard' ? !caller.access.isAgent : canWithAccess(caller.access, 'calendar.view')
  if (!allowed) return mobileJson({ error: 'Vous n’avez pas accès à cet outil.' }, 403)
  let path: string
  try {
    if (input.target === 'contract' || input.module === 'placement' && input.eventId?.endsWith(':capital')) {
      if (!input.module || !input.contractId) return mobileJson({ error: 'Contrat manquant.' }, 400)
      const href = calendarContractHref(products[input.module], input.contractId, key => canWithAccess(caller.access, key))
      if (!href) return mobileJson({ error: 'Vos permissions ne permettent pas d’ouvrir ce contrat.' }, 403)
      path = href
    } else path = input.target === 'dashboard' ? toolDashboardPath(input) : toolCalendarPath(input)
  } catch { return mobileJson({ error: 'Échéance ou contrat invalide.' }, 400) }
  if (!adminAuth) return mobileJson({ error: 'Authentification indisponible.' }, 503)
  try {
    // Même UID, aucun rôle ni permission ajouté. Ce jeton ne transite jamais dans un URL.
    const customToken = await adminAuth.createCustomToken(caller.claims.uid)
    return mobileJson({ version: 1, uid: caller.claims.uid, customToken, path,
      sessionId: randomBytes(24).toString('hex'), exchangeBefore: Date.now() + 60_000,
      capabilities: { amounts: caller.access.restrictedRole !== 'AgentRecouvrement', documents: canWithAccess(caller.access, 'documents.download'),
        exports: input.target === 'dashboard' ? !caller.access.isAgent : canWithAccess(caller.access, 'calendar.export') } })
  } catch { return mobileJson({ error: 'Impossible d’ouvrir les outils. Réessayez.' }, 503) }
}
