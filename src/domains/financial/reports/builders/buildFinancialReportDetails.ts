import routes from "@/constantes/routes";
import type { CreditType } from "@/types/types";
import { PAYMENT_MODE_LABELS } from "@/constantes/membership-requests";
import { isUnknownGuarantor } from "@/utils/credit-guarantor";
import type {
  FinancialReport,
  FinancialReportModule,
  FinancialReportModuleKey,
} from "../entities/financial-report.types";
import type {
  ChildRecord,
  FinancialReportSources,
  SourceRecord,
} from "../entities/financial-report-sources.types";
import type {
  FinancialContractReport,
  FinancialDetailParty,
  FinancialDetailRow,
  FinancialDetailSelection,
  FinancialReportDetails,
} from "../entities/financial-report-details.types";
import { buildCollectiveFundsModule } from "./collective-funds";
import { buildAdhesionsModule } from "./adhesions";
import { buildCaisseImprevueModule } from "./caisse-imprevue";
import { buildCaisseSpecialeModule } from "./caisse-speciale";
import { buildCreditModule } from "./credits";
import { buildPlacementsModule } from "./placements";
import { buildSynthesisModule } from "./synthesis";
import { buildVehiclesModule } from "./vehicles";
import { toReportDate } from "../utils/report-months";
import { monthKeyOf } from "../utils/report-months";

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";
const name = (...values: unknown[]) =>
  values.map(text).filter(Boolean).join(" ");
const emptySources = (): FinancialReportSources => ({
  caisseSpecialeContracts: [],
  caisseSpecialePayments: [],
  caisseSpecialeRefunds: [],
  caisseImprevueContracts: [],
  caisseImprevuePayments: [],
  caisseImprevueSupports: [],
  caisseImprevueRefunds: [],
  creditContracts: [],
  creditPayments: [],
  creditPenalties: [],
  guarantorPayments: [],
  placements: [],
  placementCommissions: [],
  placementEarlyExits: [],
  membershipRequests: [],
});
function indexBy<T>(
  records: T[],
  key: (record: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const record of records) {
    const id = key(record);
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(record);
  }
  return map;
}

interface Entity {
  id: string;
  module: Exclude<FinancialReportModuleKey, "synthesis">;
  record: SourceRecord;
  exists: boolean;
  sources: FinancialReportSources;
  creditType?: CreditType;
}

/** Partition each source once. Parent/child credit context remains available to
 * the credit engine, but only the selected contract contributes to its rows. */
function* entities(sources: FinancialReportSources): Generator<Entity> {
  const caisse = (
    module: Entity["module"],
    contracts: SourceRecord[],
    lists: Array<[keyof FinancialReportSources, ChildRecord[]]>,
  ) => {
    const records = new Map(contracts.map((c) => [c.id, c]));
    const ids = new Set(records.keys());
    const indexes = lists.map(([key, list]) => {
      for (const c of list) ids.add(c.parentId);
      return [key, indexBy(list, (c) => c.parentId)] as const;
    });
    return [...ids].map((id): Entity => {
      const scoped = emptySources();
      for (const [key, index] of indexes)
        Object.assign(scoped, { [key]: index.get(id) ?? [] });
      const record = records.get(id) ?? { id };
      if (module === "caisse_speciale")
        scoped.caisseSpecialeContracts = records.has(id) ? [record] : [];
      else scoped.caisseImprevueContracts = records.has(id) ? [record] : [];
      return { id, module, record, exists: records.has(id), sources: scoped };
    });
  };
  yield* caisse("caisse_speciale", sources.caisseSpecialeContracts, [
    ["caisseSpecialePayments", sources.caisseSpecialePayments],
    ["caisseSpecialeRefunds", sources.caisseSpecialeRefunds],
  ]);
  yield* caisse("caisse_imprevue", sources.caisseImprevueContracts, [
    ["caisseImprevuePayments", sources.caisseImprevuePayments],
    ["caisseImprevueSupports", sources.caisseImprevueSupports],
    ["caisseImprevueRefunds", sources.caisseImprevueRefunds],
  ]);

  const contracts = new Map(sources.creditContracts.map((c) => [c.id, c]));
  const children = indexBy(
    sources.creditContracts,
    (c) => c.parentContractId ?? "",
  );
  const payments = indexBy(sources.creditPayments, (p) => p.creditId);
  const penalties = indexBy(sources.creditPenalties, (p) => p.creditId);
  const guarantors = indexBy(sources.guarantorPayments, (p) => p.creditId);
  const modules: Record<CreditType, Entity["module"]> = {
    SPECIALE: "credit_speciale",
    FIXE: "credit_fixe",
    AIDE: "credit_aide",
  };
  for (const contract of sources.creditContracts) {
    if (!modules[contract.creditType]) continue;
    const parent = contracts.get(contract.parentContractId ?? "");
    const scoped = emptySources();
    scoped.creditContracts = [
      ...new Map(
        [
          contract,
          ...(parent ? [parent] : []),
          ...(children.get(contract.id) ?? []),
        ].map((c) => [c.id, c]),
      ).values(),
    ];
    scoped.creditPayments = payments.get(contract.id) ?? [];
    scoped.creditPenalties = penalties.get(contract.id) ?? [];
    scoped.guarantorPayments = (guarantors.get(contract.id) ?? []).filter(
      (payment) => !isUnknownGuarantor(payment),
    );
    yield {
      id: contract.id,
      module: modules[contract.creditType],
      record: contract as unknown as SourceRecord,
      exists: true,
      sources: scoped,
      creditType: contract.creditType,
    };
  }
  const commissions = indexBy(sources.placementCommissions, (p) => p.parentId);
  const exits = indexBy(sources.placementEarlyExits, (p) => p.parentId);
  for (const record of sources.placements) {
    const scoped = emptySources();
    scoped.placements = [record];
    scoped.placementCommissions = commissions.get(record.id) ?? [];
    scoped.placementEarlyExits = exits.get(record.id) ?? [];
    yield {
      id: record.id,
      module: "placements",
      record,
      exists: true,
      sources: scoped,
    };
  }
  for (const record of sources.groupContributions ?? [])
    yield {
      id: `contribution:${record.parentId}:${record.id}`,
      module: "caisses_collectives",
      record: {
        ...record,
        groupId: record.parentId,
        sourceLabel: `${text(record.projectName) || "Cotisation"} · ${text(record.period)}`,
        status: "Cotisation enregistrée",
      },
      exists: true,
      sources: { ...emptySources(), groupContributions: [record] },
    };
  for (const record of sources.groupPayouts ?? [])
    yield {
      id: `remise:${record.id}`,
      module: "caisses_collectives",
      record: {
        ...record,
        memberId: record.beneficiaryId,
        memberName: record.beneficiaryName,
        sourceLabel: `${text(record.projectName)} · ${text(record.period)} · Brut ${record.grossAmount} / Redevance ${record.feeAmount} / Net ${record.netAmount} FCFA`,
        status: "Remise enregistrée",
      },
      exists: true,
      sources: { ...emptySources(), groupPayouts: [record] },
    };
  for (const record of sources.membershipRequests)
    yield {
      id: record.id,
      module: "adhesions",
      record,
      exists: true,
      sources: { ...emptySources(), membershipRequests: [record] },
    };
  const insurances = new Map((sources.vehicleInsurances ?? []).map(record => [record.id, record]));
  for (const record of sources.vehicleRewards ?? []) {
    const insurance = insurances.get(text(record.insuranceId));
    const receipt = record.partnerReceipt as Record<string, unknown> | undefined;
    const payment = record.memberPayment as Record<string, unknown> | undefined;
    const period = Number(record.periodIndex) > 0
      ? `Renouvellement ${Number(record.periodIndex)}` : "Période initiale";
    yield {
      id: record.id,
      module: "vehicules",
      record: {
        ...record,
        insurance,
        sourceLabel: [text(record.plateNumber), text(record.insuranceCompany), text(insurance?.policyNumber), period, record.id].filter(Boolean).join(" · "),
        status: toReportDate(payment?.paidAt) ? "Remise enregistrée au parrain"
          : toReportDate(receipt?.receivedAt) && Number(receipt?.amount) > 0 ? "À reverser au parrain" : "Commission à recevoir",
      },
      exists: true,
      sources: { ...emptySources(), vehicleRewards: [record] },
    };
  }
}

function sourceHref(entity: Entity): string | undefined {
  if (!entity.exists) return undefined;
  const id = encodeURIComponent(entity.id);
  switch (entity.module) {
    case "caisse_speciale":
      return routes.admin.caisseSpecialeContractDetails(id);
    case "caisse_imprevue":
      return routes.admin.caisseImprevueContractDetails(id);
    case "credit_speciale":
      return `${routes.admin.creditSpecialeContrats}/${id}`;
    case "credit_fixe":
      return routes.admin.creditFixeContractDetails(id);
    case "credit_aide":
      return routes.admin.creditAideContractDetails(id);
    case "placements":
      return routes.admin.placementDetails(id);
    case "adhesions":
      return routes.admin.membershipRequestDetails(id);
    case "vehicules":
      return entity.record.insurance
        ? routes.admin.vehiculeDetails(encodeURIComponent(text(entity.record.insuranceId)))
        : undefined;
    case "caisses_collectives":
      return routes.admin.groupDetails(
        encodeURIComponent(text(entity.record.groupId)),
      );
  }
}

function insuredMember(entity: Entity): FinancialDetailParty[] {
  if (entity.module !== "vehicules") return [];
  const insurance = entity.record.insurance as Record<string, unknown> | undefined;
  if (insurance?.holderType !== "member" || !text(insurance.memberId) || insurance.memberId === entity.record.beneficiaryId) return [];
  return [{
    id: text(insurance.memberId),
    matricule: text(insurance.memberMatricule) || undefined,
    name: name(insurance.memberLastName, insurance.memberFirstName) || "Titulaire de l’assurance",
    kind: "member",
  }];
}

function owner(entity: Entity): FinancialDetailParty {
  const c = entity.record;
  if (entity.module === "vehicules")
    return {
      id: text(c.beneficiaryId) || undefined,
      name: text(c.beneficiaryName) || "Parrain non identifié",
      matricule: text(c.beneficiaryMatricule) || undefined,
      kind: "member",
    };
  if (entity.module === "caisses_collectives")
    return {
      id: text(c.memberId),
      name: text(c.memberName) || "Membre",
      kind: "member",
    };
  if (entity.module === "adhesions") {
    const identity =
      c.identity && typeof c.identity === "object"
        ? (c.identity as Record<string, unknown>)
        : {};
    return {
      id: text(c.matricule) || undefined,
      matricule: text(c.matricule) || undefined,
      name:
        name(identity.lastName, identity.firstName) ||
        name(c.lastName, c.firstName) ||
        "Demandeur non identifié",
      kind: "applicant",
    };
  }
  if (c.contractType === "GROUP" || c.groupeId || c.groupId)
    return {
      id: text(c.groupeId ?? c.groupId) || undefined,
      name: text(c.groupName ?? c.groupeName) || "Groupe non identifié",
      kind: "group",
    };
  return {
    id: text(c.clientId ?? c.memberId ?? c.benefactorId) || undefined,
    name:
      name(c.clientLastName, c.clientFirstName) ||
      name(c.memberLastName, c.memberFirstName) ||
      text(c.benefactorName ?? c.memberName) ||
      "Personne non identifiée",
    kind: "member",
  };
}

/** Run the exact report engines for each contributing contract/dossier, only
 * when a detail is opened. Normal dashboard/report generation stays unchanged. */
export function buildFinancialReportDetails(
  sources: FinancialReportSources,
  report: FinancialReport,
  selection: FinancialDetailSelection,
): FinancialReportDetails {
  const module = report.modules.find((m) => m.key === selection.module);
  const line = module?.blocks
    .find((b) => b.key === selection.block)
    ?.lines.find((l) => l.key === selection.line);
  if (!line) throw new Error("Ligne du bilan introuvable.");
  const index = selection.month ? report.months.indexOf(selection.month) : -1;
  if (selection.month && index < 0)
    throw new Error("Le mois choisi ne fait pas partie du bilan.");
  const rows: FinancialDetailRow[] = [];
  for (const entity of entities(sources)) {
    if (selection.module !== "synthesis" && selection.module !== entity.module)
      continue;
    let scoped = moduleForEntity(entity, report);
    const title = scoped.title;
    if (selection.module === "synthesis")
      scoped = buildSynthesisModule([scoped], report.months.length);
    const contribution = scoped.blocks
      .find((b) => b.key === selection.block)
      ?.lines.find((l) => l.key === selection.line);
    if (!contribution) continue;
    const amount = index >= 0 ? contribution.values[index] : contribution.total;
    if (
      amount === 0 &&
      !(
        index < 0 &&
        line.kind === "flow" &&
        contribution.values.some((value) => value !== 0)
      )
    )
      continue;
    const c = entity.record;
    const relatedParties: FinancialDetailParty[] = insuredMember(entity);
    if (entity.module === "caisses_collectives")
      relatedParties.push({
        id: text(c.groupId),
        name: text(c.groupName) || "Groupe",
        kind: "group",
      });
    for (const payment of entity.sources.guarantorPayments) {
      const month = monthKeyOf(payment.paymentDate);
      if (
        !month ||
        month < report.from ||
        month > report.to ||
        (selection.month && month !== selection.month)
      )
        continue;
      if (!relatedParties.some((p) => p.id === payment.guarantorId))
        relatedParties.push({
          id: payment.guarantorId,
          name:
            payment.guarantorId === c.guarantorId
              ? name(c.guarantorLastName, c.guarantorFirstName) ||
                "Garant non identifié"
              : "Garant non identifié",
          kind: "member",
        });
    }
    rows.push({
      key: `${entity.module}:${entity.id}`,
      module: entity.module,
      moduleTitle: title,
      sourceId: entity.id,
      sourceLabel:
        text(c.sourceLabel ?? c.contractNumber ?? c.reference ?? c.code) ||
        entity.id,
      sourceHref: sourceHref(entity),
      status: entity.exists
        ? text(c.status) || "Non renseigné"
        : "Contrat introuvable",
      party: owner(entity),
      relatedParties,
      values: contribution.values,
      amount,
    });
  }
  rows.sort(
    (a, b) =>
      Math.abs(b.amount) - Math.abs(a.amount) || a.key.localeCompare(b.key),
  );
  const amount = (index >= 0 ? line.values[index] : line.total) || 0;
  const allocatedAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  return {
    selection,
    lineLabel: line.label,
    description: line.description,
    kind: line.kind,
    unit: line.unit,
    from: report.from,
    to: report.to,
    months: report.months,
    monthLabels: report.monthLabels,
    reportGeneratedAt: report.generatedAt,
    loadedAt: new Date().toISOString(),
    amount,
    allocatedAmount,
    reconciliationDifference: amount - allocatedAmount || 0,
    rows,
  };
}

function moduleForEntity(
  entity: Entity,
  report: FinancialReport,
): FinancialReportModule {
  const context = {
    months: report.months,
    now: new Date(report.generatedAt),
    individual: !!report.subject,
  };
  let scoped: FinancialReportModule;
  switch (entity.module) {
    case "caisse_speciale":
      scoped = buildCaisseSpecialeModule(entity.sources, context);
      break;
    case "caisse_imprevue":
      scoped = buildCaisseImprevueModule(entity.sources, context);
      break;
    case "placements":
      scoped = buildPlacementsModule(entity.sources, context);
      break;
    case "caisses_collectives":
      scoped = buildCollectiveFundsModule(entity.sources, context);
      break;
    case "adhesions":
      scoped = buildAdhesionsModule(entity.sources, context);
      break;
    case "vehicules":
      scoped = buildVehiclesModule(entity.sources, context);
      break;
    default:
      scoped = buildCreditModule(entity.creditType!, entity.sources, context, {
        contractId: entity.id,
      });
  }
  return scoped;
}
function contractFacts(entity: Entity): FinancialContractReport["facts"] {
  const c = entity.record;
  const facts: FinancialContractReport["facts"] = [];
  const addDate = (label: string, value: unknown) => {
    const date = toReportDate(value);
    if (date)
      facts.push({
        label,
        value: date.toLocaleDateString("fr-FR", {
          timeZone: "Africa/Libreville",
        }),
      });
  };
  addDate("Création", c.createdAt);
  addDate(
    "Début / remise des fonds",
    c.disbursementDate ?? c.startDate ?? c.handoverDate,
  );
  addDate("Première échéance", c.firstPaymentDate);
  addDate("Fin prévue", c.endDate);
  if (c.duration && Number.isFinite(Number(c.duration)))
    facts.push({ label: "Durée prévue", value: `${c.duration} mois` });
  const money = (label: string, value: unknown) => {
    if (value !== null && value !== undefined && Number.isFinite(Number(value)))
      facts.push({
        label,
        value: `${Number(value).toLocaleString("fr-FR")} FCFA`,
      });
  };
  if (entity.module === "vehicules") {
    const insurance = c.insurance as Record<string, unknown> | undefined;
    const receipt = c.partnerReceipt as Record<string, unknown> | undefined;
    const payment = c.memberPayment as Record<string, unknown> | undefined;
    const addText = (label: string, value: unknown) => {
      if (text(value)) facts.push({ label, value: text(value) });
    };
    addText("Référence du reversement", c.id);
    addText("Assureur", c.insuranceCompany);
    addText("Véhicule", c.vehicleLabel);
    addText("Plaque", c.plateNumber);
    addText("Police d’assurance", insurance?.policyNumber);
    addText("Titulaire de l’assurance", insurance?.holderType === "member"
      ? name(insurance.memberLastName, insurance.memberFirstName)
      : name(insurance?.nonMemberLastName, insurance?.nonMemberFirstName));
    addText("Parrain bénéficiaire", c.beneficiaryName);
    facts.push({ label: "Période", value: Number(c.periodIndex) > 0 ? `Renouvellement ${Number(c.periodIndex)}` : "Période initiale" });
    addDate("Début de la période assurée", c.startDate);
    addDate("Fin de la période assurée", c.endDate);
    money("Prime d’assurance (information)", c.premiumAmount);
    money("Commission attendue (prévision)", c.expectedCommission);
    if (receipt) {
      money("Commission reçue", receipt.amount);
      money("Part réservée au parrain", c.memberAmount);
      money("Part acquise à KARA", Number(receipt.amount) - Number(c.memberAmount));
      addDate("Réception de la commission", receipt.receivedAt);
      addText("Référence de réception", receipt.reference);
      addText("Réception enregistrée par", receipt.recordedByName ?? receipt.recordedBy);
    }
    if (payment) {
      addDate("Remise enregistrée au parrain", payment.paidAt);
      addText("Mode de remise", PAYMENT_MODE_LABELS[text(payment.mode) as keyof typeof PAYMENT_MODE_LABELS] ?? payment.mode);
      addText("Référence de remise", payment.reference);
      addText("Remise enregistrée par", payment.paidByName ?? payment.paidBy);
      if (text(payment.proofUrl)) facts.push({ label: "Justificatif de remise", value: text(payment.proofUrl), href: text(payment.proofUrl) });
    }
    if (!insurance) facts.push({ label: "Fiche d’assurance", value: "Introuvable ; historique financier conservé" });
  }
  if (entity.creditType) {
    money("Montant du contrat", c.amount);
    money("Mensualité enregistrée", c.monthlyPaymentAmount);
    if (isUnknownGuarantor({ guarantorId: text(c.guarantorId) }))
      facts.push({ label: "Garantie", value: "LE KARA — aucune commission externe" });
  } else if (entity.module === "placements") money("Capital placé", c.amount);
  else if (
    entity.module === "caisse_speciale" ||
    entity.module === "caisse_imprevue"
  )
    money("Versement mensuel prévu", c.monthlyAmount);
  const link = c.groupProject as Record<string, unknown> | undefined;
  if (link?.projectName)
    facts.push({ label: "Projet du groupe", value: text(link.projectName) });
  if (c.period) facts.push({ label: text(c.period).length === 7 ? "Mois concerné" : "Période concernée", value: text(c.period) });
  return facts;
}
/** Complete dossiers, including flow/stock history; an inactive contract with no
 * financial value anywhere in the period is deliberately not a contributing dossier. */
export function buildFinancialReportContracts(
  sources: FinancialReportSources,
  report: FinancialReport,
): FinancialContractReport[] {
  const result: FinancialContractReport[] = [];
  for (const entity of entities(sources)) {
    const module = moduleForEntity(entity, report);
    if (
      !module.blocks.some((b) =>
        b.lines.some((l) => l.values.some((v) => v !== 0)),
      )
    )
      continue;
    const c = entity.record;
    const relatedParties: FinancialDetailParty[] = insuredMember(entity);
    const add = (party: FinancialDetailParty) => {
      if (
        party.id &&
        !relatedParties.some((p) => p.kind === party.kind && p.id === party.id)
      )
        relatedParties.push(party);
    };
    if (!isUnknownGuarantor({ guarantorId: text(c.guarantorId) }))
      add({
        id: text(c.guarantorId),
        name:
          name(c.guarantorLastName, c.guarantorFirstName) ||
          "Garant non identifié",
        kind: "member",
      });
    for (const payment of entity.sources.guarantorPayments)
      add({
        id: payment.guarantorId,
        name:
          payment.guarantorId === c.guarantorId
            ? name(c.guarantorLastName, c.guarantorFirstName) ||
              "Garant non identifié"
            : "Garant non identifié",
        kind: "member",
      });
    const link = c.groupProject as Record<string, unknown> | undefined;
    const groupId =
      entity.module === "caisses_collectives"
        ? text(c.groupId)
        : text(link?.groupId);
    if (groupId)
      add({
        id: groupId,
        name: text(c.groupName ?? link?.groupName) || "Groupe",
        kind: "group",
      });
    result.push({
      key: `${entity.module}:${entity.id}`,
      module: entity.module,
      moduleTitle: module.title,
      sourceId: entity.id,
      sourceLabel:
        text(c.sourceLabel ?? c.contractNumber ?? c.reference ?? c.code) ||
        entity.id,
      sourceHref: sourceHref(entity),
      sourceKind:
        entity.module === "adhesions"
          ? "Dossier"
          : entity.module === "caisses_collectives" || entity.module === "vehicules"
            ? "Opération"
            : "Contrat",
      status: entity.exists
        ? text(c.status) || "Non renseigné"
        : "Contrat introuvable",
      party: owner(entity),
      relatedParties,
      facts: contractFacts(entity),
      blocks: module.blocks,
    });
  }
  return result.sort(
    (a, b) =>
      a.moduleTitle.localeCompare(b.moduleTitle, "fr") ||
      a.party.name.localeCompare(b.party.name, "fr") ||
      a.sourceId.localeCompare(b.sourceId),
  );
}
