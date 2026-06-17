'use client'

import { useState } from 'react'
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
  Users as UsersIcon,
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
  analyzeSheet,
  type AnalyzedRow,
  type ImportAnalysis,
} from './excelImportAnalyzer'
import { fetchForfaits, rollbackImport, writeImport, type ImportReport } from './excelImportWriter'

interface RowView extends AnalyzedRow {
  memberFound: boolean
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif',
  FINISHED: 'Terminé',
  CANCELED: 'Annulé (retrait)',
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

export function ExcelImportPage() {
  const { user } = useAuth()
  const [fileName, setFileName] = useState<string>('')
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null)
  const [rowViews, setRowViews] = useState<RowView[]>([])
  const [membersMap, setMembersMap] = useState<Map<string, User>>(new Map())
  const [forfaits, setForfaits] = useState<SubscriptionCI[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [rollingBack, setRollingBack] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'import' | 'rollback' | null>(null)

  const resetAnalysis = () => {
    setAnalysis(null)
    setRowViews([])
    setMembersMap(new Map())
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
      const result = analyzeSheet(selectedSheet, aoa)

      // Résolution des membres par matricule (Firestore) + forfaits A–E
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
    const importable = rowViews.filter((r) => r.memberFound)
    if (importable.length === 0) return
    setImporting(true)
    setReport(null)
    setProgress({ done: 0, total: importable.length })
    try {
      const res = await writeImport(
        importable,
        {
          adminId: user.uid,
          sheetName: analysis.sheetName,
          sourceFile: fileName,
          members: membersMap,
          forfaits,
        },
        (done, total) => setProgress({ done, total }),
      )
      setReport(res)
    } catch (err) {
      console.error(err)
      setError("Erreur pendant l'import.")
    } finally {
      setImporting(false)
    }
  }

  const handleRollback = async () => {
    if (!analysis) return
    setRollingBack(true)
    try {
      const { deleted } = await rollbackImport({
        sheetName: analysis.sheetName,
        sourceFile: fileName,
      })
      setReport(null)
      setError(deleted > 0 ? null : 'Aucun contrat migré trouvé pour cette feuille/fichier.')
      window.alert(`${deleted} contrat(s) migré(s) supprimé(s).`)
    } catch (err) {
      console.error(err)
      setError("Erreur pendant l'annulation de l'import.")
    } finally {
      setRollingBack(false)
    }
  }

  const membersFound = rowViews.filter((r) => r.memberFound).length
  const membersMissing = rowViews.filter((r) => !r.memberFound)
  const rowsWithIssues = rowViews.filter((r) => r.issues.length > 0)
  const isUnknown = analysis?.sheetType === 'UNKNOWN'

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
                disabled={sheetNames.length === 0}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Choisir une feuille…" />
                </SelectTrigger>
                <SelectContent>
                  {sheetNames.map((name) => (
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
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

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
                    {analysis.sheetType === 'CI_ACTIVE' ? 'Contrats actifs' : 'Contrats clôturés'}
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
                  label="Membres trouvés"
                  value={`${membersFound}/${rowViews.length}`}
                  hint={membersMissing.length > 0 ? `${membersMissing.length} introuvable(s)` : 'Tous résolus'}
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
                          {membersMissing.length} membre(s) introuvable(s) par matricule :
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

              {/* Aperçu détaillé */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                          <th className="px-4 py-3 font-semibold">Ligne</th>
                          <th className="px-4 py-3 font-semibold">Membre</th>
                          <th className="px-4 py-3 font-semibold">Matricule</th>
                          <th className="px-4 py-3 font-semibold">Cat. / Montant</th>
                          <th className="px-4 py-3 font-semibold">Statut</th>
                          <th className="px-4 py-3 font-semibold">Versements</th>
                          <th className="px-4 py-3 font-semibold">Aides / Retrait</th>
                          <th className="px-4 py-3 font-semibold">Membre ?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowViews.map((r) => (
                          <tr key={r.rowNumber} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-2.5 text-gray-400">{r.rowNumber}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              {r.lastName} {r.firstName}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.matricule}</td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {r.category || '—'} · {r.amountPerMonth.toLocaleString('fr-FR')}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant="secondary" className="text-[11px]">
                                {STATUS_LABEL[r.status] ?? r.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {r.paidCount} payé{r.paidCount > 1 ? 's' : ''}
                              {r.dueCount > 0 && <span className="text-gray-400"> · {r.dueCount} dû</span>}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {r.supportsCount > 0 && `${r.supportsCount} aide(s)`}
                              {r.hasEarlyRefund && (
                                <span className="text-amber-700">
                                  Retrait {r.earlyRefundAmount.toLocaleString('fr-FR')}
                                </span>
                              )}
                              {r.supportsCount === 0 && !r.hasEarlyRefund && <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              {r.memberFound ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
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
                      <span className="font-bold text-[#234D65]">{membersFound}</span> contrat(s) seront créés
                      {membersMissing.length > 0 && (
                        <span className="text-gray-500"> · {membersMissing.length} ignoré(s) (membre introuvable)</span>
                      )}
                      . IDs déterministes — relancer ne crée pas de doublon.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        type="button"
                        onClick={() => setConfirmAction('import')}
                        disabled={importing || rollingBack || membersFound === 0 || !user?.uid}
                        className="h-9 bg-[#234D65] hover:bg-[#1A3D4F]"
                      >
                        {importing ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Database className="mr-1 h-4 w-4" />
                        )}
                        Importer {membersFound} contrat(s)
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
                      <p className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Import terminé : {report.created} créé(s)
                        {report.skipped > 0 && <span className="text-amber-700">· {report.skipped} ignoré(s)</span>}
                      </p>
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
                <AlertDialogTitle>Confirmer l&apos;import ?</AlertDialogTitle>
                <AlertDialogDescription>
                  {membersFound} contrat(s) vont être créés dans la base (collection{' '}
                  <span className="font-mono">contractsCI</span>) à partir de la feuille «{' '}
                  {analysis?.sheetName} ». L&apos;opération est idempotente : relancer ne crée pas de
                  doublon.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-[#234D65] hover:bg-[#1A3D4F]"
                  onClick={() => {
                    setConfirmAction(null)
                    void handleImport()
                  }}
                >
                  Importer {membersFound} contrat(s)
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Annuler l&apos;import de cette feuille ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tous les contrats migrés depuis « {fileName} » / « {analysis?.sheetName} » (et leurs
                  versements, aides et retraits) seront <strong>définitivement supprimés</strong>.
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
