import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const f = vi.hoisted(() => ({
  superAdmin: true,
  report: vi.fn(),
  details: vi.fn(),
  contracts: vi.fn(),
  member: vi.fn(),
  file: vi.fn(),
}))
vi.mock('@/domains/mobile/server/access', () => ({
  requireMobileCaller: async () => ({
    access: { isSuperAdmin: f.superAdmin },
    mustChangePassword: false,
  }),
  mobileJson: (body: unknown, status = 200) =>
    NextResponse.json(body, { status }),
}))
vi.mock('@/domains/mobile-admin/server/gateway', () => ({
  errorResponse: (e: Error) =>
    NextResponse.json({ error: e.message }, { status: 400 }),
}))
vi.mock('@/domains/mobile-admin/server/files', () => ({
  readApplicationFile: (url: string) => f.file(url),
}))
vi.mock('@/domains/auth/access-policy', () => ({
  canWithAccess: () => f.superAdmin,
}))
vi.mock('@/app/api/financial-reports/route', () => ({
  GET: (r: NextRequest) => f.report(r),
}))
vi.mock('@/app/api/financial-reports/details/route', () => ({
  GET: (r: NextRequest) => f.details(r),
}))
vi.mock('@/app/api/financial-reports/contracts/route', () => ({
  GET: (r: NextRequest) => f.contracts(r),
}))
vi.mock('@/app/api/financial-reports/member/route', () => ({
  GET: (r: NextRequest) => f.member(r),
}))
import { GET } from '@/app/api/mobile/reports/route'
const request = (params: string) =>
  new NextRequest(
    'http://localhost/api/mobile/reports?from=2026-01&to=2026-11&' + params,
  )
beforeEach(() => {
  vi.clearAllMocks()
  f.superAdmin = true
  f.report.mockResolvedValue(NextResponse.json({ modules: [] }))
  f.member.mockResolvedValue(NextResponse.json({ modules: [] }))
})
describe('adaptateur natif des bilans', () => {
  it('réserve les bilans au super administrateur', async () => {
    f.superAdmin = false
    expect((await GET(request(''))).status).toBe(403)
    expect(f.report).not.toHaveBeenCalled()
  })
  it('transmet toute l’histoire du membre au moteur existant et fournit son guide', async () => {
    const res = await GET(request('memberId=M1&all=1'))
    expect(res.status).toBe(200)
    expect(f.member.mock.calls[0][0].nextUrl.searchParams.get('all')).toBe('1')
    expect((await res.json()).guide.length).toBeGreaterThan(0)
  })
  it('traduit les statuts des dossiers avec le même présentateur que le site', async () => {
    f.contracts.mockResolvedValue(
      NextResponse.json({
        report: {},
        contracts: [{ status: 'PARTIAL', key: 'C' }],
      }),
    )
    const data = await (await GET(request('kind=contracts'))).json()
    expect(data.contracts[0]).toMatchObject({
      status: 'PARTIAL',
      displayStatus: 'Partiellement réglé',
    })
  })
  it('résout les preuves à partir de l’annexe autorisée et refuse une référence absente', async () => {
    f.contracts.mockImplementation(async () =>
      NextResponse.json({
        contracts: [
          {
            key: 'R',
            facts: [{ href: 'https://storage.example.test/proof.pdf' }],
          },
        ],
      }),
    )
    f.file.mockResolvedValue({
      base64: 'JVBERi0x',
      mime: 'application/pdf',
      filename: 'proof.pdf',
    })
    expect(
      (await GET(request('kind=attachment&sourceKey=R&factIndex=0'))).status,
    ).toBe(200)
    expect(f.file).toHaveBeenCalledWith(
      'https://storage.example.test/proof.pdf',
    )
    f.file.mockClear()
    expect(
      (await GET(request('kind=attachment&sourceKey=OTHER&factIndex=0')))
        .status,
    ).toBe(400)
    expect(f.file).not.toHaveBeenCalled()
  })
  it('exporte uniquement les personnes recherchées dans le détail CSV', async () => {
    f.details.mockResolvedValue(
      NextResponse.json({
        monthLabels: ['Novembre'],
        selection: {},
        kind: 'flow',
        unit: 'count',
        rows: [
          {
            moduleTitle: 'Adhésions',
            party: { name: 'Alice' },
            sourceLabel: 'Dossier Alice',
            status: 'PAID',
            relatedParties: [],
            values: [1],
            amount: 1,
          },
          {
            moduleTitle: 'Adhésions',
            party: { name: 'Bob' },
            sourceLabel: 'Dossier Bob',
            status: 'PAID',
            relatedParties: [],
            values: [1],
            amount: 1,
          },
        ],
      }),
    )
    const data = await (
      await GET(request('kind=details&format=csv&search=alice'))
    ).json()
    const csv = Buffer.from(data.base64, 'base64').toString('utf8')
    expect(csv).toContain('Alice')
    expect(csv).not.toContain('Bob')
    expect(csv).toContain('Nombre')
  })
})
