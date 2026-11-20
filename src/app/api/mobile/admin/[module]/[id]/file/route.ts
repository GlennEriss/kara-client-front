import { getAdminFile } from '@/domains/mobile-admin/server/files'
export const runtime = 'nodejs'
export async function GET(
  request: import('next/server').NextRequest,
  ctx: { params: Promise<{ module: string; id: string }> },
) {
  const p = await ctx.params
  return getAdminFile(request, p.module, p.id)
}
