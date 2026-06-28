'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Info,
  Loader2,
  RotateCcw,
  Upload,
  UserPlus,
  Users as UsersIcon,
  UserX,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getUsersByMatricules } from '@/db/user.db'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import type { SubscriptionCI, User } from '@/types/types'
import {
  analyzeMembersSheet,
  analyzeSheet,
  detectSheetType,
  parseAdhesionMembersSheet,
  parseJournaliereSheet,
  parseMembersSheet,
  type AnalyzedMember,
  type AnalyzedRow,
  type ImportAdhesion,
  type ImportAnalysis,
  type ImportMemberData,
  type MembersAnalysis,
} from './excelImportAnalyzer'
import {
  contractIdForRow,
  fetchForfaits,
  linkUnknownMembers,
  rollbackImport,
  writeImport,
  writeMembers,
  type ImportReport,
  type WriteMembersReport,
} from './excelImportWriter'

interface RowView extends AnalyzedRow {
  memberFound: boolean
}

interface MemberView extends AnalyzedMember {
  exists: boolean
}

const MEMBERSHIP_LABEL: Record<string, string> = {
  adherant: 'Adhérent',
  bienfaiteur: 'Bienfaiteur',
  sympathisant: 'Sympathisant',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif',
  FINISHED: 'Terminé',
  CANCELED: 'Annulé (retrait)',
  RESCINDED: 'Résilié (retrait anticipé)',
  CLOSED: 'Clôturé (normal)',
}

const fmtAmount = (n: number) => n.toLocaleString('fr-FR')

function findMembersSheetName(sheetNames: string[]): string | undefined {
  return sheetNames.find((name) => name.trim().toUpperCase() === 'MEMBRES')
}

function findJournaliereSheetName(sheetNames: string[]): string | undefined {
  return sheetNames.find((name) => name.trim().toUpperCase() === 'JOURNALIERE')
}

function findAdhesionMembersSheetName(sheetNames: string[]): string | undefined {
  return sheetNames.find((name) => name.trim().toUpperCase() === 'ADHESION MEMBRES')
}

/** "2026-01-28" -> "28/01/2026" */
function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return y && m && d ? `${d}/${m}/${y}` : s
}

/** Date de fin : FIN du contrat (Excel) si dispo, sinon début + durée. */
function contractEndDate(r: AnalyzedRow): string {
  if (r.entraide.contractEndDate) return fmtDate(r.entraide.contractEndDate)
  if (!r.startDate) return '—'
  const d = new Date(r.startDate)
  if (Number.isNaN(d.getTime())) return '—'
  d.setMonth(d.getMonth() + (r.durationMonths || 0))
  return fmtDate(d.toISOString().slice(0, 10))
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#234D65]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

type ImportScope = 'members' | 'caisse-imprevue' | 'caisse-speciale'

export function ExcelImportPage({ scope }: { scope?: ImportScope }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  /**
   * Invalide les caches des stats/listes impactées par un import ou un rollback,
   * pour que le site (Tableau de bord, Membres, Demandes, contrats) reflète
   * immédiatement les nouveaux chiffres.
   */
  const invalidateStatsCaches = () => {
    const keys = [
      ['dashboard'],
      ['members'],
      ['allMembers'],
      ['membership-requests'],
      ['membership-requests-stats'],
      ['memberships'],
      ['filleuls'],
      // Caisse Imprévue : listes + stats
      ['contractsCI'],
      ['contractsCIStats'],
      // Caisse Spéciale : listes + stats (clés distinctes)
      ['caisse-contracts'],
      ['caisse-contracts-stats'],
      ['all-contracts'],
      ['subscriptions'],
    ]
    keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
  }
  const [fileName, setFileName] = useState<string>('')
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null)
  const [rowViews, setRowViews] = useState<RowView[]>([])
  const [membersAnalysis, setMembersAnalysis] = useState<MembersAnalysis | null>(null)
  const [memberViews, setMemberViews] = useState<MemberView[]>([])
  const [membersReport, setMembersReport] = useState<WriteMembersReport | null>(null)
  const [membersMap, setMembersMap] = useState<Map<string, User>>(new Map())
  const [memberData, setMemberData] = useState<Map<string, ImportMemberData>>(new Map())
  const [adhesionData, setAdhesionData] = useState<Map<string, ImportAdhesion[]>>(new Map())
  const [forfaits, setForfaits] = useState<SubscriptionCI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [rollingBack, setRollingBack] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'import' | 'rollback' | null>(null)
  const [linkingUnknown, setLinkingUnknown] = useState(false)

  const resetAnalysis = () => {
    setAnalysis(null)
    setRowViews([])
    setMembersAnalysis(null)
    setMemberViews([])
    setMembersReport(null)
    setMembersMap(new Map())
    setMemberData(new Map())
    setAdhesionData(new Map())
    setReport(null)
    setProgress(null)
    setError(null)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    resetAnalysis()
    setSelectedSheet('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { cellDates: true })
      setWorkbook(wb)
      setSheetNames(wb.SheetNames)
      setFileName(file.name)
    } catch {
      setError('Fichier illisible. Vérifie que c’est bien un .xlsx.')
    }
  }

  const handleAnalyze = async () => {
    if (!workbook || !selectedSheet) return
    setLoading(true)
    resetAnalysis()
    try {
      const ws = workbook.Sheets[selectedSheet]
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: true,
        blankrows: false,
      })

      // Enrichissement depuis la feuille MEMBRES, utilisé pour créer les comptes liés aux contrats.
      const membersSheet = findMembersSheetName(workbook.SheetNames)
      const enrich = membersSheet
        ? parseMembersSheet(
            XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[membersSheet], {
              header: 1,
              raw: true,
              blankrows: false,
            }),
          )
        : new Map<string, ImportMemberData>()
      setMemberData(enrich)

      // Croisement ADHESION MEMBRES → abonnements (période + paiement) par matricule.
      const adhesionSheet = findAdhesionMembersSheetName(workbook.SheetNames)
      const adhesions = adhesionSheet
        ? parseAdhesionMembersSheet(
            XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[adhesionSheet], {
              header: 1,
              raw: true,
              blankrows: false,
            }),
          )
        : new Map<string, ImportAdhesion[]>()
      setAdhesionData(adhesions)

      // ----- Feuille MEMBRES : import de membres -----
      if (detectSheetType(selectedSheet) === 'MEMBERS') {
        const res = analyzeMembersSheet(selectedSheet, aoa)
        let mviews: MemberView[] = res.members.map((m) => ({ ...m, exists: false }))
        if (res.members.length > 0) {
          const existing = await getUsersByMatricules(res.members.map((m) => m.matricule))
          setMembersMap(existing)
          mviews = res.members.map((m) => ({ ...m, exists: existing.has(m.matricule.trim()) }))
        }
        setMembersAnalysis(res)
        setMemberViews(mviews)
        return
      }

      // ----- Croisement JOURNALIERE (contrats journaliers de la Caisse Spéciale) -----
      const journaliereSheet = findJournaliereSheetName(workbook.SheetNames)
      const journaliere = journaliereSheet
        ? parseJournaliereSheet(
            XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[journaliereSheet], {
              header: 1,
              raw: true,
              blankrows: false,
            }),
          )
        : undefined

      // ----- Feuilles contrats (CI_ACTIVE / CI_CLOSED / CS_ACTIVE / UNKNOWN) -----
      const result = analyzeSheet(selectedSheet, aoa, { journaliere })
      let views: RowView[] = result.rows.map((r) => ({ ...r, memberFound: false }))
      let map = new Map<string, User>()
      if (result.rows.length > 0) {
        map = await getUsersByMatricules(result.rows.map((r) => r.matricule))
        views = result.rows.map((r) => ({
          ...r,
          memberFound: map.has(r.matricule.trim()),
        }))
        try {
          setForfaits(await fetchForfaits())
        } catch {
          setForfaits([])
        }
      }
      setMembersMap(map)
      setAnalysis(result)
      setRowViews(views)
    } catch (err) {
      console.error(err)
      setError("Erreur pendant l'analyse de la feuille.")
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!analysis || !user?.uid) return
    // Toutes les lignes : les membres absents seront créés à la volée.
    if (rowViews.length === 0) return
    setImporting(true)
    setReport(null)
    setProgress({ done: 0, total: rowViews.length })
    try {
      const res = await writeImport(
        rowViews,
        {
          adminId: user.uid,
          sheetName: analysis.sheetName,
          sourceFile: fileName,
          members: membersMap,
          forfaits,
          memberData,
          target: analysis.target,
        },
        (done, total) => setProgress({ done, total }),
      )
      setReport(res)
      invalidateStatsCaches()
    } catch (err) {
      console.error(err)
      setError("Erreur pendant l'import.")
    } finally {
      setImporting(false)
    }
  }

  /**
   * Supprime tout ce que cet import a créé pour (fichier + feuille sélectionnés).
   * Autonome : ne nécessite pas d'avoir analysé — il suffit du fichier et de la feuille.
   */
  const handleRollback = async () => {
    if (!fileName || !selectedSheet) return
    setRollingBack(true)
    try {
      const { contractsDeleted, usersDeleted, subscriptionsDeleted, requestsDeleted = 0 } = await rollbackImport({
        sheetName: selectedSheet,
        sourceFile: fileName,
      })
      setReport(null)
      setMembersReport(null)
      invalidateStatsCaches()
      const total = contractsDeleted + usersDeleted + subscriptionsDeleted + requestsDeleted
      setError(total > 0 ? null : 'Aucun élément migré trouvé pour ce fichier/feuille.')
      window.alert(
        `Suppression : ${contractsDeleted} contrat(s), ${usersDeleted} membre(s), ${subscriptionsDeleted} adhésion(s), ${requestsDeleted} demande(s).`,
      )
    } catch (err) {
      console.error(err)
      setError("Erreur pendant l'annulation de l'import.")
    } finally {
      setRollingBack(false)
    }
  }

  const handleLinkUnknown = async () => {
    setLinkingUnknown(true)
    try {
      const { membersLinked, contractsLinked } = await linkUnknownMembers()
      window.alert(
        `Rattachement à INCONNU INCONNU :\n` +
          `• ${membersLinked} membre(s) sans parrain\n` +
          `• ${contractsLinked} contrat(s) CI sans contact d'urgence`,
      )
    } catch (err) {
      console.error(err)
      setError('Erreur pendant le rattachement à INCONNU.')
    } finally {
      setLinkingUnknown(false)
    }
  }

  const handleImportMembers = async () => {
    if (!membersAnalysis || !user?.uid || memberViews.length === 0) return
    setImporting(true)
    setMembersReport(null)
    setProgress({ done: 0, total: memberViews.length })
    try {
      const res = await writeMembers(
        memberViews,
        {
          adminId: user.uid,
          sheetName: membersAnalysis.sheetName,
          sourceFile: fileName,
          existing: membersMap,
          enrich: memberData,
          adhesions: adhesionData,
        },
        (done, total) => setProgress({ done, total }),
      )
      setMembersReport(res)
      invalidateStatsCaches()
    } catch (err) {
      console.error(err)
      setError("Erreur pendant l'import des membres.")
    } finally {
      setImporting(false)
    }
  }

  const membersFound = rowViews.filter((r) => r.memberFound).length
  const membersMissing = rowViews.filter((r) => !r.memberFound)
  const rowsWithIssues = rowViews.filter((r) => r.issues.length > 0)
  const isUnknown = analysis?.sheetType === 'UNKNOWN'

  // Détection des doublons : plusieurs lignes → même ID de contrat (= fusion).
  const idCount = new Map<string, number>()
  rowViews.forEach((r) => {
    const id = contractIdForRow(r, analysis?.target)
    idCount.set(id, (idCount.get(id) ?? 0) + 1)
  })
  const distinctContracts = idCount.size
  const duplicateRows = rowViews.length - distinctContracts
  // Membres distincts à créer (un membre peut avoir plusieurs contrats).
  const distinctNewMembers = new Set(membersMissing.map((r) => r.matricule.trim())).size

  // Import de membres (feuille MEMBRES)
  const membersToCreate = memberViews.filter((m) => !m.exists)
  const membersExisting = memberViews.length - membersToCreate.length
  // Abonnements (ADHESION MEMBRES) qui seront créés pour les membres à importer.
  const adhesionsToCreate = membersToCreate.reduce(
    (sum, m) => sum + (adhesionData.get(m.matricule.trim())?.length ?? 0),
    0,
  )

  // Feuilles proposées selon la section (membres / caisse imprévue / toutes).
  const availableSheets = sheetNames.filter((name) => {
    if (!scope) return true
    const t = detectSheetType(name)
    if (scope === 'members') return t === 'MEMBERS'
    if (scope === 'caisse-speciale') return t === 'CS_ACTIVE' || t === 'CS_CLOSED'
    return t === 'CI_ACTIVE' || t === 'CI_CLOSED'
  })

  return (
    <div className="space-y-5">
      {/* Étape 1 : fichier + feuille */}
      <Card className="border-0 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                1. Fichier Excel
              </label>
              <label className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 text-sm text-gray-600 transition-colors hover:border-[#234D65]">
                <Upload className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{fileName || 'Choisir un fichier .xlsx…'}</span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
              </label>
            </div>

            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                2. Feuille à importer
              </label>
              <Select
                value={selectedSheet}
                onValueChange={(v) => {
                  setSelectedSheet(v)
                  resetAnalysis()
                }}
                disabled={availableSheets.length === 0}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Choisir une feuille…" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={!selectedSheet || loading}
              className="h-9 bg-[#234D65] hover:bg-[#1A3D4F]"
            >
              {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-1 h-4 w-4" />}
              Analyser
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction('rollback')}
              disabled={!selectedSheet || !fileName || importing || rollingBack}
              className="h-9 border-red-300 text-red-700 hover:bg-red-50"
              title="Supprime tout ce que l'import de cette feuille a créé"
            >
              {rollingBack ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1 h-4 w-4" />}
              Supprimer cet import
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Maintenance : rattachement des manquants au membre INCONNU INCONNU */}
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-600">
              Rattacher rétroactivement les membres sans parrain et les contrats CI sans contact d'urgence au compte{' '}
              <span className="font-semibold">INCONNU INCONNU</span>.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLinkUnknown}
              disabled={linkingUnknown}
              className="h-9 shrink-0"
            >
              {linkingUnknown ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserX className="mr-1 h-4 w-4" />}
              Rattacher les manquants à INCONNU
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===================== IMPORT DE MEMBRES ===================== */}
      {membersAnalysis && (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-[#234D65]/15 bg-[#234D65]/5 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#234D65]" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">
                Feuille « {membersAnalysis.sheetName} »{' '}
                <Badge variant="outline" className="ml-1 border-[#234D65]/20 bg-white text-[#234D65]">
                  Import membres
                </Badge>
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                Cible : <span className="font-mono">users</span> · {membersAnalysis.totalRows} ligne(s) ·{' '}
                {membersAnalysis.uniqueMembers} membre(s) unique(s)
                {memberData.size > 0 && ' · identités enrichies via la feuille MEMBRES'}
                {adhesionsToCreate > 0 &&
                  ` · ${adhesionsToCreate} abonnement(s) via ADHESION MEMBRES`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Membres uniques" value={membersAnalysis.uniqueMembers} />
            <StatCard label="À créer" value={membersToCreate.length} />
            <StatCard label="Déjà présents" value={membersExisting} />
            {Object.entries(membersAnalysis.byType).map(([t, n]) => (
              <StatCard key={t} label={MEMBERSHIP_LABEL[t] ?? t} value={n} />
            ))}
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <h3 className="mb-2 text-sm font-bold text-[#234D65]">Comment ça sera importé</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                <li>Source : feuille <span className="font-mono">MEMBRES</span>. Chaque membre unique (dédoublonné par matricule) → 1 compte dans <span className="font-mono">users</span> (id = matricule, sans compte Auth).</li>
                <li>Type de compte : <strong>Adhérent</strong> par défaut (la feuille MEMBRES n’a pas de colonne « type »).</li>
                <li>Identité complète reprise de MEMBRES : naissance, e-mail, sexe, pièce, nationalité, adresse, profession, conjoint…</li>
                <li>Les membres déjà présents (même matricule) sont <strong>ignorés</strong> (non écrasés).</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="px-3 py-3 font-semibold">Ligne</th>
                      <th className="px-3 py-3 font-semibold">Matricule</th>
                      <th className="px-3 py-3 font-semibold">Nom</th>
                      <th className="px-3 py-3 font-semibold">Prénom</th>
                      <th className="px-3 py-3 font-semibold">Contacts</th>
                      <th className="px-3 py-3 font-semibold">Type de compte</th>
                      <th className="px-3 py-3 font-semibold">Compte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberViews.map((m) => (
                      <tr key={m.matricule} className="border-b border-gray-50 last:border-0">
                        <td className="px-3 py-2.5 text-gray-400">{m.rowNumber}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{m.matricule}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-800">{m.lastName || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-800">{m.firstName || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{m.contacts.join(' / ') || '—'}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary" className="text-[11px]">
                            {MEMBERSHIP_LABEL[m.membershipType] ?? m.membershipLabel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          {m.exists ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" /> Existant
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-[#234D65]">
                              <UserPlus className="h-4 w-4" /> À créer
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#234D65]/15 bg-[#234D65]/5 shadow-sm">
            <CardContent className="space-y-3 p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-700">
                  <span className="font-bold text-[#234D65]">{membersToCreate.length}</span> membre(s) seront créés
                  {membersExisting > 0 && (
                    <span className="text-gray-500"> · {membersExisting} déjà présent(s) (ignorés)</span>
                  )}
                  .
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    onClick={() => setConfirmAction('import')}
                    disabled={importing || rollingBack || membersToCreate.length === 0 || !user?.uid}
                    className="h-9 bg-[#234D65] hover:bg-[#1A3D4F]"
                  >
                    {importing ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-1 h-4 w-4" />
                    )}
                    Importer {membersToCreate.length} membre(s)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmAction('rollback')}
                    disabled={importing || rollingBack}
                    className="h-9 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    {rollingBack ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1 h-4 w-4" />
                    )}
                    Annuler l'import de cette feuille
                  </Button>
                </div>
              </div>

              {progress && importing && (
                <div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#234D65]/10">
                    <div
                      className="h-2 rounded-full bg-[#234D65] transition-all"
                      style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {progress.done} / {progress.total} membres traités…
                  </p>
                </div>
              )}

              {membersReport && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> Import terminé : {membersReport.created} membre(s) créé(s)
                    {membersReport.skipped > 0 && (
                      <span className="text-amber-700">· {membersReport.skipped} ignoré(s)</span>
                    )}
                    {membersReport.subscriptionsCreated > 0 && (
                      <span className="text-emerald-700">· {membersReport.subscriptionsCreated} abonnement(s)</span>
                    )}
                  </p>
                  {Object.keys(membersReport.byType).length > 0 && (
                    <p className="mt-1 text-xs text-emerald-700">
                      Par type :{' '}
                      {Object.entries(membersReport.byType)
                        .map(([t, n]) => `${MEMBERSHIP_LABEL[t] ?? t} ${n}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {analysis && (
        <>
          {/* Bandeau type de feuille */}
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              isUnknown ? 'border-amber-200 bg-amber-50' : 'border-[#234D65]/15 bg-[#234D65]/5'
            }`}
          >
            <Info className={`mt-0.5 h-5 w-5 shrink-0 ${isUnknown ? 'text-amber-600' : 'text-[#234D65]'}`} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">
                Feuille « {analysis.sheetName} »{' '}
                {!isUnknown && (
                  <Badge variant="outline" className="ml-1 border-[#234D65]/20 bg-white text-[#234D65]">
                    {analysis.sheetType === 'CS_ACTIVE'
                      ? 'Contrats Caisse Spéciale'
                      : analysis.sheetType === 'CS_CLOSED'
                        ? 'Contrats Caisse Spéciale clôturés'
                        : analysis.sheetType === 'CI_ACTIVE'
                          ? 'Contrats actifs'
                          : 'Contrats clôturés'}
                  </Badge>
                )}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                Cible : <span className="font-mono">{analysis.targetCollection}</span> ·{' '}
                {analysis.totalDataRows} ligne(s) de données · {analysis.importableRows} importable(s)
              </p>
            </div>
          </div>

          {isUnknown ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="space-y-3 p-4 md:p-5">
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                  {analysis.howItWillBeImported.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                {analysis.detectedColumns && analysis.detectedColumns.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Colonnes détectées
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.detectedColumns.map((c, i) => (
                        <Badge key={`${c}-${i}`} variant="secondary" className="text-[11px]">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Cartes de synthèse */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard label="Contrats importables" value={analysis.importableRows} />
                {analysis.totals.active > 0 && <StatCard label="Actifs" value={analysis.totals.active} />}
                {analysis.totals.finished > 0 && <StatCard label="Terminés" value={analysis.totals.finished} />}
                {analysis.totals.canceled > 0 && (
                  <StatCard label="Annulés (retrait)" value={analysis.totals.canceled} />
                )}
                <StatCard label="Versements payés" value={analysis.totals.paidVersements} />
                {analysis.totals.supports > 0 && <StatCard label="Aides (supports)" value={analysis.totals.supports} />}
                {analysis.totals.earlyRefunds > 0 && (
                  <StatCard label="Retraits anticipés" value={analysis.totals.earlyRefunds} />
                )}
                <StatCard
                  label="Membres existants"
                  value={`${membersFound}/${rowViews.length}`}
                  hint={
                    membersMissing.length > 0
                      ? `${membersMissing.length} compte(s) à créer`
                      : 'Tous déjà présents'
                  }
                />
              </div>

              {/* Comment ça sera importé */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 md:p-5">
                  <h3 className="mb-2 text-sm font-bold text-[#234D65]">Comment ça sera importé</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                    {analysis.howItWillBeImported.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Anomalies / membres introuvables */}
              {(membersMissing.length > 0 || rowsWithIssues.length > 0) && (
                <Card className="border border-amber-200 bg-amber-50/40 shadow-sm">
                  <CardContent className="space-y-3 p-4 md:p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800">
                      <AlertCircle className="h-4 w-4" /> Points d'attention
                    </h3>
                    {membersMissing.length > 0 && (
                      <div className="text-sm text-amber-900">
                        <p className="font-semibold">
                          <UsersIcon className="mr-1 inline h-4 w-4" />
                          {membersMissing.length} membre(s) absent(s) → seront créés (compte adhérent
                          {memberData.size > 0 ? ', enrichis depuis la feuille MEMBRES' : ', données de la ligne entraide'}) :
                        </p>
                        <p className="mt-1 font-mono text-xs text-amber-800">
                          {membersMissing.map((r) => r.matricule).join(', ')}
                        </p>
                      </div>
                    )}
                    {rowsWithIssues.length > 0 && (
                      <div className="text-sm text-amber-900">
                        <p className="font-semibold">{rowsWithIssues.length} ligne(s) avec anomalie :</p>
                        <ul className="mt-1 space-y-0.5 text-xs">
                          {rowsWithIssues.slice(0, 20).map((r) => (
                            <li key={r.rowNumber}>
                              L{r.rowNumber} ({r.matricule}) — {r.issues.join(' · ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Aperçu détaillé — attributs du contrat Caisse Imprévue */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                          <th className="px-3 py-3 font-semibold">Ligne</th>
                          <th className="px-3 py-3 font-semibold">Matricule contrat</th>
                          <th className="px-3 py-3 font-semibold">Statut</th>
                          <th className="px-3 py-3 font-semibold">Type</th>
                          <th className="px-3 py-3 font-semibold">Nom</th>
                          <th className="px-3 py-3 font-semibold">Prénom</th>
                          <th className="px-3 py-3 font-semibold">Matricule membre</th>
                          <th className="px-3 py-3 font-semibold">Forfait</th>
                          <th className="px-3 py-3 text-right font-semibold">Mensualité</th>
                          <th className="px-3 py-3 text-right font-semibold">Durée</th>
                          <th className="px-3 py-3 font-semibold">Début</th>
                          <th className="px-3 py-3 font-semibold">Date de fin</th>
                          <th className="px-3 py-3 font-semibold">Contacts</th>
                          <th className="px-3 py-3 font-semibold">Contact urgent</th>
                          <th className="px-3 py-3 text-right font-semibold">Mois payés</th>
                          <th className="px-3 py-3 text-right font-semibold">Versé</th>
                          <th className="px-3 py-3 font-semibold">Aides / Retrait</th>
                          <th className="px-3 py-3 font-semibold">Compte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowViews.map((r) => (
                          <tr key={r.rowNumber} className="border-b border-gray-50 last:border-0">
                            <td className="px-3 py-2.5 text-gray-400">{r.rowNumber}</td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-gray-500">
                              {contractIdForRow(r, analysis?.target)}
                              {(idCount.get(contractIdForRow(r, analysis?.target)) ?? 0) > 1 && (
                                <Badge
                                  variant="outline"
                                  className="ml-1 border-amber-300 bg-amber-50 text-[10px] text-amber-700"
                                >
                                  doublon
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge variant="secondary" className="text-[11px]">
                                {STATUS_LABEL[r.status] ?? r.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">Mensuel</td>
                            <td className="px-3 py-2.5 font-medium text-gray-800">{r.lastName || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-800">{r.firstName || '—'}</td>
                            <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{r.matricule}</td>
                            <td className="px-3 py-2.5 text-gray-700">{r.category || '—'}</td>
                            <td className="px-3 py-2.5 text-right text-gray-700">
                              {fmtAmount(r.amountPerMonth)}{' '}
                              <span className="text-[10px] text-gray-400">FCFA</span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-700">{r.durationMonths} mois</td>
                            <td className="px-3 py-2.5 text-gray-700">{fmtDate(r.startDate)}</td>
                            <td className="px-3 py-2.5 text-gray-700">{contractEndDate(r)}</td>
                            <td className="px-3 py-2.5 text-gray-600">{r.contacts.join(' / ') || '—'}</td>
                            <td className="px-3 py-2.5 text-gray-600">
                              {r.emergency.lastName === 'INCONNU' && !r.emergency.firstName
                                ? '—'
                                : `${r.emergency.lastName} ${r.emergency.firstName}`.trim()}
                              {r.emergency.relationship && r.emergency.relationship !== 'INCONNU' && (
                                <span className="text-gray-400"> ({r.emergency.relationship})</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-700">
                              {r.paidCount}
                              <span className="text-gray-400">/{r.durationMonths}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-700">
                              {fmtAmount(r.paidCount * r.amountPerMonth)}{' '}
                              <span className="text-[10px] text-gray-400">FCFA</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-700">
                              {r.supportsCount > 0 && `${r.supportsCount} aide(s)`}
                              {r.hasEarlyRefund && (
                                <span className="text-amber-700">
                                  Retrait {fmtAmount(r.earlyRefundAmount)}
                                </span>
                              )}
                              {r.supportsCount === 0 && !r.hasEarlyRefund && (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {r.memberFound ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                  <CheckCircle2 className="h-4 w-4" /> Existant
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-[#234D65]">
                                  <UserPlus className="h-4 w-4" /> À créer
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Barre d'import */}
              <Card className="border border-[#234D65]/15 bg-[#234D65]/5 shadow-sm">
                <CardContent className="space-y-3 p-4 md:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold text-[#234D65]">{distinctContracts}</span> contrat(s) seront créés
                      {duplicateRows > 0 && (
                        <span className="text-amber-700"> ({duplicateRows} doublon(s) fusionné(s))</span>
                      )}
                      {distinctNewMembers > 0 && (
                        <span className="text-gray-500">
                          {' '}
                          · dont {distinctNewMembers} nouveau(x) membre(s) (compte adhérent)
                        </span>
                      )}
                      . IDs déterministes — relancer ne crée pas de doublon.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        type="button"
                        onClick={() => setConfirmAction('import')}
                        disabled={importing || rollingBack || rowViews.length === 0 || !user?.uid}
                        className="h-9 bg-[#234D65] hover:bg-[#1A3D4F]"
                      >
                        {importing ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Database className="mr-1 h-4 w-4" />
                        )}
                        Importer {distinctContracts} contrat(s)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmAction('rollback')}
                        disabled={importing || rollingBack}
                        className="h-9 border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {rollingBack ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-4 w-4" />
                        )}
                        Annuler l'import de cette feuille
                      </Button>
                    </div>
                  </div>

                  {progress && importing && (
                    <div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#234D65]/10">
                        <div
                          className="h-2 rounded-full bg-[#234D65] transition-all"
                          style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {progress.done} / {progress.total} contrats écrits…
                      </p>
                    </div>
                  )}

                  {report && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Import terminé : {report.created} contrat(s) créé(s)
                        {report.membersCreated > 0 && (
                          <span className="text-[#234D65]">· {report.membersCreated} membre(s) créé(s)</span>
                        )}
                        {report.skipped > 0 && <span className="text-amber-700">· {report.skipped} ignoré(s)</span>}
                      </p>
                      {report.forfaitsCreated.length > 0 && (
                        <p className="mt-1 text-xs text-emerald-700">
                          Forfaits créés automatiquement : {report.forfaitsCreated.join(', ')}
                        </p>
                      )}
                      {report.toComplete > 0 && (
                        <p className="mt-1 text-xs text-amber-700">
                          {report.toComplete} contrat(s) à compléter (preuves de versement, contact d&apos;urgence ou
                          forfait) — repérables via le marqueur migration.
                        </p>
                      )}
                      {report.skipped > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                          {report.results
                            .filter((r) => r.status === 'skipped')
                            .slice(0, 20)
                            .map((r) => (
                              <li key={r.rowNumber}>
                                L{r.rowNumber} ({r.matricule}) — {r.reason}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Double confirmation */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          {confirmAction === 'import' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {membersAnalysis ? "Confirmer l'import des membres ?" : "Confirmer l'import ?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {membersAnalysis ? (
                    <>
                      {membersToCreate.length} membre(s) vont être créés dans{' '}
                      <span className="font-mono">users</span> (compte sans connexion) depuis la feuille «{' '}
                      {membersAnalysis.sheetName} ». Les membres déjà présents sont ignorés. Idempotent :
                      relancer ne crée pas de doublon.
                    </>
                  ) : (
                    <>
                      {distinctContracts} contrat(s) vont être créés dans{' '}
                      <span className="font-mono">contractsCI</span>
                      {distinctNewMembers > 0 && (
                        <> , et {distinctNewMembers} nouveau(x) membre(s) (compte adhérent) dans <span className="font-mono">users</span></>
                      )}{' '}
                      à partir de la feuille « {analysis?.sheetName} ». L&apos;opération est idempotente :
                      relancer ne crée pas de doublon.
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-[#234D65] hover:bg-[#1A3D4F]"
                  onClick={() => {
                    setConfirmAction(null)
                    if (membersAnalysis) void handleImportMembers()
                    else void handleImport()
                  }}
                >
                  {membersAnalysis
                    ? `Importer ${membersToCreate.length} membre(s)`
                    : `Importer ${distinctContracts} contrat(s)`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cet import ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tout ce qui a été créé par l&apos;import de « {selectedSheet || analysis?.sheetName || membersAnalysis?.sheetName} »
                  depuis le fichier « {fileName} » sera <strong>définitivement supprimé</strong> :
                  contrats (et versements / aides / retraits), membres et adhésions migrés correspondants.
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Retour</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setConfirmAction(null)
                    void handleRollback()
                  }}
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
