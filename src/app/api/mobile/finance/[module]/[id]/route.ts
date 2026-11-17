import type { NextRequest } from 'next/server'
import {
  getFinanceDetail,
  postFinanceAction,
} from '@/domains/finance/server/gateway'
export const runtime = 'nodejs'
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ module: string; id: string }> },
) {
  const { module, id } = await context.params
  return getFinanceDetail(request, module, id)
}
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ module: string; id: string }> },
) {
  const { module, id } = await context.params
  return postFinanceAction(request, module, id)
}
