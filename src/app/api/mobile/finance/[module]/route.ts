import type { NextRequest } from 'next/server'
import { getFinanceWorkspace } from '@/domains/finance/server/gateway'
export const runtime = 'nodejs'
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ module: string }> },
) {
  return getFinanceWorkspace(request, (await context.params).module)
}
