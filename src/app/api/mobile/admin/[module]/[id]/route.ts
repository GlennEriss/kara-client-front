import {
  getAdminDetail,
  postAdminAction,
} from '@/domains/mobile-admin/server/gateway'
export const runtime = 'nodejs'
export async function GET(
  request: import('next/server').NextRequest,
  ctx: { params: Promise<{ module: string; id: string }> },
) {
  const p = await ctx.params
  return getAdminDetail(request, p.module, p.id)
}
export async function POST(
  request: import('next/server').NextRequest,
  ctx: { params: Promise<{ module: string; id: string }> },
) {
  const p = await ctx.params
  return postAdminAction(request, p.module, p.id)
}
