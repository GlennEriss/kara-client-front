'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Eye, Loader2, ShieldAlert, Trash2 } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { auth } from '@/firebase/auth'
import { useAuth } from '@/domains/auth/hooks/useAuth'

const SUPERADMIN_EMAIL = 'phil@gmail.com'
const CONFIRM_PHRASE = 'SUPPRIMER TOUT KARA'

/** Sections métier réinitialisables individuellement (clés alignées sur l'API). */
const SECTIONS: { key: string; label: string }[] = [
  { key: 'caisseImprevue', label: 'Caisse Imprévue' },
  { key: 'caisseSpeciale', label: 'Caisse Spéciale' },
  { key: 'placements', label: 'Placements' },
  { key: 'credit', label: 'Crédit Spéciale' },
  { key: 'bienfaiteur', label: 'Bienfaiteur' },
  { key: 'membres', label: 'Membres (demandes & adhésions)' },
  { key: 'evenements', label: 'Événements' },
  { key: 'boutiques', label: 'Boutiques' },
]

/** Phrase de confirmation attendue pour une cible (section ou globale). */
function confirmPhraseFor(target: string): string {
  const s = SECTIONS.find((x) => x.key === target)
  return s ? `RÉINITIALISER ${s.label.toUpperCase()}` : CONFIRM_PHRASE
}

type PurgeTarget = string

type StepError = { error: string }
interface PurgeResult {
  mode: 'preview' | 'execute'
  target: PurgeTarget
  sectionLabel?: string
  keptEmail: string
  keptUid: string
  firestore?: { deleted: number; kept: number; perCollection: Record<string, number> } | StepError
  authUsers?: number | StepError
  storage?: { bucket: string; files: number; perPrefix?: Record<string, number>; error?: string } | StepError
  algolia?: { configured: boolean; indices: number; names?: string[]; error?: string } | StepError
  payments?: { deleted: number } | StepError
  backRefs?: { cleared: number } | StepError
  superAdminStillExists?: boolean
}

const hasError = (v: unknown): v is StepError =>
  Boolean(v) && typeof v === 'object' && 'error' in (v as Record<string, unknown>)

async function callPurge(mode: 'preview' | 'execute', target: PurgeTarget, confirmText?: string): Promise<PurgeResult> {
  const token = await auth.currentUser?.getIdToken()
  const res = await fetch('/api/admin/purge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ mode, target, confirmText }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.details || data?.error || res.statusText)
  return data as PurgeResult
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-lg font-bold tabular-nums text-[#234D65]">{value}</p>
    </div>
  )
}

function ResultView({ r }: { r: PurgeResult }) {
  const verb = r.mode === 'execute' ? 'supprimés' : 'à supprimer'
  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {r.firestore && !hasError(r.firestore) && (
          <>
            <Stat label={`Firestore (${verb})`} value={r.firestore.deleted} />
            <Stat label="Conservés" value={r.firestore.kept} />
          </>
        )}
        {typeof r.authUsers === 'number' && <Stat label={`Comptes Auth (${verb})`} value={r.authUsers} />}
        {r.payments && !hasError(r.payments) && (
          <Stat label={`Versements centralisés (${verb})`} value={r.payments.deleted} />
        )}
        {r.storage && !hasError(r.storage) && (
          <Stat label={`Fichiers Storage (${verb})`} value={r.storage.files} />
        )}
        {r.backRefs && !hasError(r.backRefs) && (
          <Stat label="Fiches membres nettoyées" value={r.backRefs.cleared} />
        )}
        {r.algolia && !hasError(r.algolia) && (
          <Stat
            label={r.mode === 'execute' ? 'Index Algolia vidés' : 'Index Algolia'}
            value={r.algolia.configured ? r.algolia.indices : '—'}
          />
        )}
      </div>

      {r.firestore && !hasError(r.firestore) && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Détail par collection
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(r.firestore.perCollection).map(([name, count]) => (
              <span key={name} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                {name}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Erreurs par domaine */}
      {hasError(r.firestore) && <p className="text-xs text-red-700">Firestore : {r.firestore.error}</p>}
      {hasError(r.authUsers) && <p className="text-xs text-red-700">Auth : {r.authUsers.error}</p>}
      {hasError(r.payments) && <p className="text-xs text-red-700">Versements : {r.payments.error}</p>}
      {hasError(r.backRefs) && <p className="text-xs text-red-700">Back-références : {r.backRefs.error}</p>}
      {hasError(r.storage) && <p className="text-xs text-red-700">Storage : {r.storage.error}</p>}
      {!hasError(r.storage) && r.storage?.error && (
        <p className="text-xs text-amber-700">Storage ({r.storage.bucket}) : {r.storage.error}</p>
      )}
      {hasError(r.algolia) && <p className="text-xs text-red-700">Algolia : {r.algolia.error}</p>}

      {r.mode === 'execute' && r.superAdminStillExists !== undefined && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${
            r.superAdminStillExists
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-300 bg-red-50 text-red-800'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {r.superAdminStillExists
            ? `Compte superAdmin (${r.keptEmail}) toujours présent.`
            : `⚠️ ALERTE : ${r.keptEmail} introuvable après purge !`}
        </div>
      )}
    </div>
  )
}

const TARGET_LABEL: Record<string, string> = {
  all: 'TOUT (Firestore + Auth + Storage + Algolia)',
  firestore: 'Firestore',
  auth: 'comptes Auth',
  storage: 'fichiers Storage',
  algolia: 'index Algolia',
}

/** Libellé lisible d'une cible (domaine technique ou section métier). */
function targetLabel(target: string): string {
  return TARGET_LABEL[target] || SECTIONS.find((s) => s.key === target)?.label || target
}

export function PurgeDatabasePage() {
  const { user } = useAuth()
  const isSuperAdmin = (user?.email || '').toLowerCase() === SUPERADMIN_EMAIL

  const [loadingPreview, setLoadingPreview] = useState(false)
  const [busyTarget, setBusyTarget] = useState<PurgeTarget | null>(null)
  const [preview, setPreview] = useState<PurgeResult | null>(null)
  const [result, setResult] = useState<PurgeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [pendingTarget, setPendingTarget] = useState<PurgeTarget>('all')

  if (!isSuperAdmin) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-center gap-3 p-6 text-amber-800">
          <ShieldAlert className="h-6 w-6 shrink-0" />
          <p className="text-sm">
            Accès réservé au superAdmin (<strong>{SUPERADMIN_EMAIL}</strong>). Connecte-toi avec ce compte.
          </p>
        </CardContent>
      </Card>
    )
  }

  const runPreview = async () => {
    setLoadingPreview(true)
    setError(null)
    setResult(null)
    try {
      setPreview(await callPurge('preview', 'all'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoadingPreview(false)
    }
  }

  const askExecute = (target: PurgeTarget) => {
    setPendingTarget(target)
    setConfirmText('')
    setConfirmOpen(true)
  }

  const runExecute = async () => {
    setBusyTarget(pendingTarget)
    setError(null)
    try {
      const r = await callPurge('execute', pendingTarget, confirmText)
      setResult(r)
      setPreview(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusyTarget(null)
      setConfirmOpen(false)
      setConfirmText('')
    }
  }

  const anyBusy = busyTarget !== null || loadingPreview

  const RetryBtn = ({ t, label }: { t: PurgeTarget; label: string }) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => askExecute(t)}
      disabled={anyBusy}
      className="border-red-200 text-red-700 hover:bg-red-50"
    >
      {busyTarget === t ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
      {label}
    </Button>
  )

  return (
    <div className="space-y-5">
      <Card className="border-red-200 bg-red-50/60">
        <CardContent className="space-y-2 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
            <div className="text-sm text-red-900">
              <p className="font-bold">Réinitialisation totale de la base — IRRÉVERSIBLE</p>
              <p className="mt-1">
                Supprime <strong>tout</strong> (Firestore, comptes Auth, Storage, index Algolia) SAUF le
                superAdmin <strong>{SUPERADMIN_EMAIL}</strong>. Aucune sauvegarde. Lance d’abord l’aperçu.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={runPreview} disabled={anyBusy}>
          {loadingPreview ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Eye className="mr-1 h-4 w-4" />}
          Aperçu (ne supprime rien)
        </Button>
        <Button
          type="button"
          onClick={() => askExecute('all')}
          disabled={anyBusy}
          className="bg-red-600 hover:bg-red-700"
        >
          {busyTarget === 'all' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
          Tout supprimer
        </Button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Vider un domaine seul (si « Tout » a échoué/timeout sur l’un d’eux)
        </p>
        <div className="flex flex-wrap gap-2">
          <RetryBtn t="firestore" label="Vider Firestore" />
          <RetryBtn t="auth" label="Vider Auth" />
          <RetryBtn t="storage" label="Vider Storage" />
          <RetryBtn t="algolia" label="Vider Algolia" />
        </div>
      </div>

      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="space-y-2.5 p-4 md:p-5">
          <p className="text-sm font-bold text-orange-900">Réinitialiser une section</p>
          <p className="text-xs text-orange-800">
            Supprime tout ce qui appartient à la section choisie : documents Firestore (contrats,
            demandes, sous-collections en cascade), versements centralisés, fichiers Storage liés et
            back-références sur les membres. N’affecte ni les comptes de connexion, ni les autres
            sections. Confirmation par phrase spécifique à chaque section.
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <RetryBtn key={s.key} t={s.key} label={s.label} />
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {preview && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Aperçu (dry-run) — rien n’a été supprimé :</p>
          <ResultView r={preview} />
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Purge exécutée ({result.sectionLabel || targetLabel(result.target)}) :
          </p>
          <ResultView r={result} />
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && setConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">Confirmer la suppression ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cible : <strong>{targetLabel(pendingTarget)}</strong>. Action <strong>définitive</strong>
              {SECTIONS.some((s) => s.key === pendingTarget) ? '' : ` (sauf ${SUPERADMIN_EMAIL})`}. Pour
              confirmer, tape exactement :
              <span className="mt-1 block font-mono font-bold text-gray-900">{confirmPhraseFor(pendingTarget)}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmPhraseFor(pendingTarget)}
            className="font-mono"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={confirmText !== confirmPhraseFor(pendingTarget) || busyTarget !== null}
              onClick={(e) => {
                e.preventDefault()
                if (confirmText === confirmPhraseFor(pendingTarget)) void runExecute()
              }}
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
