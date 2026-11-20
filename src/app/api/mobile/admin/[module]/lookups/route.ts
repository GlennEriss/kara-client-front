import { getAdminChoices } from '@/domains/mobile-admin/server/gateway'
export const runtime = 'nodejs'
export async function GET(
  request: import('next/server').NextRequest,
  ctx: { params: Promise<{ module: string }> },
) {
  return getAdminChoices(request, (await ctx.params).module)
}
