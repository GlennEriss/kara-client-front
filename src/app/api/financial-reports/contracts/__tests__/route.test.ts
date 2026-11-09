import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  load: vi.fn(),
  member: vi.fn(),
  build: vi.fn(),
  detail: vi.fn(),
  enrich: vi.fn(),
}));
vi.mock("@/domains/auth/server/requireAdminCaller", () => ({
  requireAdminCaller: mock.auth,
}));
vi.mock("@/firebase/adminFirestore", () => ({ adminFirestore: { db: true } }));
vi.mock(
  "@/domains/financial/reports/services/loadFinancialReportSources",
  () => ({ loadFinancialReportSources: mock.load }),
);
vi.mock(
  "@/domains/financial/reports/services/loadMemberFinancialReportSources",
  () => ({ loadMemberFinancialReportSources: mock.member }),
);
vi.mock("@/domains/financial/reports/builders/buildFinancialReport", () => ({
  buildFinancialReport: mock.build,
}));
vi.mock(
  "@/domains/financial/reports/builders/buildFinancialReportDetails",
  () => ({ buildFinancialReportContracts: mock.detail }),
);
vi.mock(
  "@/domains/financial/reports/services/enrichFinancialReportDetails",
  () => ({ enrichFinancialReportParties: mock.enrich }),
);
const request = (params: Record<string, string> = {}) =>
  new NextRequest(
    `https://kara.test/api/financial-reports/contracts?${new URLSearchParams({ from: "2026-01", to: "2026-03", module: "credit_fixe", block: "treasury", line: "in_total", ...params })}`,
  );
beforeEach(() => {
  vi.clearAllMocks();
  mock.auth.mockResolvedValue({ uid: "admin" });
  mock.load.mockResolvedValue({ scoped: false });
  mock.member.mockResolvedValue({
    sources: { scoped: true },
    subject: { memberId: "M1" },
  });
  mock.build.mockReturnValue({
    modules: [
      {
        key: "credit_fixe",
        blocks: [{ key: "treasury", lines: [{ key: "in_total" }] }],
      },
    ],
  });
  mock.detail.mockReturnValue({ rows: [] });
  mock.enrich.mockResolvedValue({ rows: [], amount: 123 });
});

describe("API contrats du bilan", () => {
  it("réserve les lectures au SuperAdmin avant accès aux données", async () => {
    mock.auth.mockResolvedValue(
      NextResponse.json({ error: "Interdit" }, { status: 403 }),
    );
    expect((await GET(request())).status).toBe(403);
    expect(mock.auth).toHaveBeenCalledWith(expect.anything(), {
      superAdmin: true,
    });
    expect(mock.load).not.toHaveBeenCalled();
  });
  it("valide la période, le membre et la date de calcul", async () => {
    for (const params of [
      { from: "2020-01" },
      { memberId: "users/other" },
      { asOf: "invalid" },
      { asOf: "2999-01-01" },
    ] as Array<Record<string, string>>)
      expect((await GET(request(params))).status).toBe(400);
    expect(mock.load).not.toHaveBeenCalled();
    expect(mock.member).not.toHaveBeenCalled();
  });
  it("garde les sources du seul membre demandé et interdit le cache partagé", async () => {
    mock.detail.mockReturnValue([{ key: "credit_fixe:c1" }]);
    mock.enrich.mockResolvedValue([{ key: "credit_fixe:c1" }]);
    const response = await GET(
      request({ memberId: "M1", asOf: "2026-03-31T12:00:00Z" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mock.load).not.toHaveBeenCalled();
    expect(mock.build).toHaveBeenCalledWith(
      { scoped: true },
      { from: "2026-01", to: "2026-03", now: new Date("2026-03-31T12:00:00Z") },
      { subject: { memberId: "M1" }, maxMonths: 120 },
    );
    expect((await response.json()).contracts).toEqual([
      { key: "credit_fixe:c1" },
    ]);
  });
  it("retourne 404 pour un membre inexistant sans charger le bilan de tous", async () => {
    mock.member.mockResolvedValue(null);
    expect((await GET(request({ memberId: "missing" }))).status).toBe(404);
    expect(mock.load).not.toHaveBeenCalled();
    expect(mock.enrich).not.toHaveBeenCalled();
  });
});
