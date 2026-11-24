import { NextResponse, type NextRequest } from 'next/server'
import { canWithAccess } from '@/domains/auth/access-policy'
import { loadAdminAccess } from '@/domains/auth/server/admin-access'
import { requireAdminCaller } from '@/domains/auth/server/requireAdminCaller'
import { tariffGridSchema } from '@/domains/vehicles/tariff-grid'
import {
  hasValidOgarCoverage, listTariffGrids, ogarGridId, saveTariffGrid, tariffGridId,
} from '@/domains/vehicles/server/tariff-grids'
import { adminFirestore } from '@/firebase/adminFirestore'

export const runtime = 'nodejs'

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

async function authorize(request: NextRequest) {
  const caller = await requireAdminCaller(request, { allowRestricted: true })
  if (caller instanceof NextResponse) return caller
  const access = await loadAdminAccess(caller.claims)
  if (!access || !canWithAccess(access, 'vehicules.view')) return reply({ error: 'Accès aux grilles non autorisé.' }, 403)
  return { uid: caller.claims.uid, canEdit: canWithAccess(access, 'vehicules.edit') }
}

export async function GET(request: NextRequest) {
  try {
    const access = await authorize(request)
    if (access instanceof NextResponse) return access
    if (!adminFirestore) return reply({ error: 'Grilles indisponibles.' }, 503)
    return reply({ items: await listTariffGrids(adminFirestore), canEdit: access.canEdit })
  } catch {
    return reply({ error: 'Impossible de charger les grilles tarifaires.' }, 503)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const site = request.headers.get('sec-fetch-site')
    if (site ? site !== 'same-origin' : origin && origin !== request.nextUrl.origin) {
      return reply({ error: 'Origine de la demande non autorisée.' }, 403)
    }
    const access = await authorize(request)
    if (access instanceof NextResponse) return access
    if (!access.canEdit) return reply({ error: 'Vous ne pouvez pas modifier les grilles.' }, 403)
    if (!adminFirestore) return reply({ error: 'Grilles indisponibles.' }, 503)
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 450_000) return reply({ error: 'Cette grille est trop volumineuse.' }, 413)
    const data = await new Response(raw).json().catch(() => null)
    const parsed = tariffGridSchema.safeParse(data)
    if (!parsed.success) return reply({ error: parsed.error.issues[0]?.message || 'Grille invalide.' }, 400)
    const input = parsed.data
    const id = tariffGridId(input.insurer, input.assetType)
    if (!id || (id === ogarGridId && !hasValidOgarCoverage(input))) {
      return reply({ error: 'Vérifiez l’assureur et les types de biens couverts.' }, 400)
    }
    if (!await saveTariffGrid(adminFirestore, id, input, access.uid)) {
      return reply({ error: 'Une version plus récente existe. Rechargez la grille avant de modifier ses tarifs.' }, 409)
    }
    return reply({ id })
  } catch {
    return reply({ error: 'Enregistrement impossible. Réessayez.' }, 503)
  }
}
