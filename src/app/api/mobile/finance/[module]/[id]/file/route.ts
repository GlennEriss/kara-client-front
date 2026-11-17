import type { NextRequest } from 'next/server'
import { getFinanceFile } from '@/domains/finance/server/files'
export const runtime = 'nodejs'
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ module: string; id: string }> },
) {
  const { module, id } = await context.params
  return getFinanceFile(request, module, id)
}
