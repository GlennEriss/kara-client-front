import { getMobileMemberOverview } from '@/domains/mobile-admin/server/member-overview'
export const runtime = 'nodejs'
export async function GET(
  request: import('next/server').NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return getMobileMemberOverview(request, (await context.params).id)
}
