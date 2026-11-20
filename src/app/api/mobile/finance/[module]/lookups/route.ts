import type { NextRequest } from 'next/server'
import { getFinanceLookups } from '@/domains/finance/server/lookups'
export const runtime = 'nodejs'
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ module: string }> },
) {
  return getFinanceLookups(request, (await context.params).module)
}
