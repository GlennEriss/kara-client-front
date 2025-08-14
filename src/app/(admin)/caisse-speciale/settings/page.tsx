"use client"

import React from 'react'
import { useActiveCaisseSettings, useCaisseSettingsList, useCaisseSettingsMutations } from '@/hooks/useCaisseSettings'
import { toast } from 'sonner'

export default function AdminCaisseSettingsPage() {
  const active = useActiveCaisseSettings()
  const list = useCaisseSettingsList()
  const { create, update, activate, remove } = useCaisseSettingsMutations()
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)

  const [bonusM4, setBonusM4] = React.useState(0)
  const [perDay, setPerDay] = React.useState(0)
  const [effectiveAt, setEffectiveAt] = React.useState<string>('')
  const [caisseType, setCaisseType] = React.useState<'STANDARD'|'JOURNALIERE'|'LIBRE'>('STANDARD')

  // Éditeur détaillé de la version active
  const [bonusTable, setBonusTable] = React.useState<Record<string, number>>({})
  const [useSteps, setUseSteps] = React.useState(false)
  const [steps, setSteps] = React.useState<Array<{ from: number; to: number; rate: number }>>([])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      isActive: false,
      bonusTable: { M4: Number(bonusM4) },
      penaltyRules: { day4To12: { perDay: Number(perDay) } },
      businessTexts: {},
      caisseType,
    }
    if (effectiveAt) {
      const d = new Date(effectiveAt)
      if (!isNaN(d.getTime())) payload.effectiveAt = d
    }
    try {
      await create.mutateAsync(payload)
      setEffectiveAt('')
      setBonusM4(0)
      setPerDay(0)
      toast.success('Version créée')
    } catch (err) {
      console.error('Erreur de création des paramètres:', err)
      toast.error('Erreur lors de la création')
    }
  }

  React.useEffect(() => {
    if (active.data) {
      const a: any = active.data as any
      const bt = a?.bonusTable || {}
      const filled: Record<string, number> = {}
      for (let m = 4; m <= 12; m++) filled[`M${m}`] = Number(bt[`M${m}`] || 0)
      setBonusTable(filled)
      const pr = a?.penaltyRules || {}
      if (pr.day4To12?.steps) {
        setUseSteps(true)
        setSteps(pr.day4To12.steps.map((s: any) => ({ from: Number(s.from), to: Number(s.to), rate: Number(s.rate) })))
      } else {
        setUseSteps(false)
        setPerDay(Number(pr.day4To12?.perDay || 0))
      }
    }
  }, [active.data?.id])

  const updateActive = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!active.data) return
    const updates: any = {
      bonusTable,
      penaltyRules: { day4To12: useSteps ? { steps } : { perDay: Number(perDay) } },
    }
    try {
      await update.mutateAsync({ id: (active.data as any).id, updates })
      toast.success('Modifications enregistrées')
    } catch (err) {
      console.error('Erreur de mise à jour des paramètres:', err)
      toast.error("Échec de l'enregistrement")
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres Caisse Spéciale</h1>
        <div className="text-sm text-gray-600">Active: {active.data ? (active.data as any).id : '—'}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <div className="font-semibold mb-2">Créer une version</div>
          <form className="space-y-3" onSubmit={onCreate}>
            <div>
              <label className="block text-sm">Type de caisse</label>
              <select className="border rounded p-2 w-full" value={caisseType} onChange={(e)=> setCaisseType(e.target.value as any)}>
                <option value="STANDARD">Standard</option>
                <option value="JOURNALIERE">Journalière</option>
                <option value="LIBRE">Libre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm">Date d'effet</label>
              <input type="date" className="border rounded p-2 w-full" value={effectiveAt} onChange={(e)=>setEffectiveAt(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Bonus M4 (%)</label>
              <input type="number" className="border rounded p-2 w-full" value={bonusM4} onChange={(e)=>setBonusM4(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm">Pénalité par jour (J+4..12)</label>
              <input type="number" className="border rounded p-2 w-full" value={perDay} onChange={(e)=>setPerDay(Number(e.target.value))} />
            </div>
            <button className="px-4 py-2 rounded bg-[#234D65] text-white" disabled={create.isPending}>{create.isPending ? 'Création…' : 'Créer la version'}</button>
          </form>
        </div>

        <div className="border rounded p-4">
          <div className="font-semibold mb-2">Versions existantes</div>
          {list.isLoading ? (
            <div className="text-xs text-gray-500">Chargement…</div>
          ) : (
            <ul className="space-y-2">
              {(list.data || []).map((s: any) => (
                <li key={s.id} className="border rounded p-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{s.id} <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-gray-100">{(s as any).caisseType || '—'}</span></div>
                    <div className="text-xs text-gray-600">Effet: {(() => {
                      const v = (s as any).effectiveAt
                      if (!v) return '—'
                      const d = v && typeof v === 'object' && 'seconds' in v ? new Date(v.seconds * 1000) : new Date(v)
                      return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
                    })()} • Active: {s.isActive ? 'Oui' : 'Non'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.isActive && (
                      <button className="px-3 py-1 rounded border" onClick={async () => { await activate.mutateAsync(s.id); toast.success('Version activée') }}>Activer</button>
                    )}
                    {!s.isActive && (
                      <button className="px-3 py-1 rounded border border-red-300 text-red-600" onClick={() => setConfirmDeleteId(s.id)}>Supprimer</button>
                    )}
                  </div>
                </li>
              ))}
              {(list.data || []).length === 0 && (
                <li className="text-xs text-gray-500">—</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Éditer la version active */}
      <div className="border rounded p-4">
        <div className="font-semibold mb-3">Éditer la version active</div>
        {!active.data ? (
          <div className="text-xs text-gray-500">Aucune version active</div>
        ) : (
          <form className="space-y-4" onSubmit={updateActive}>
            <div>
              <div className="text-sm font-medium mb-2">Bonus par mois (à partir de M4)</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 9 }).map((_, i) => {
                  const m = i + 4
                  const key = `M${m}`
                  return (
                    <div key={key}>
                      <label className="block text-xs mb-1">{key} (%)</label>
                      <input type="number" className="border rounded p-2 w-full" value={bonusTable[key] ?? 0} onChange={(e) => setBonusTable(prev => ({ ...prev, [key]: Number(e.target.value) }))} />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input id="useSteps" type="checkbox" checked={useSteps} onChange={(e)=>setUseSteps(e.target.checked)} />
                <label htmlFor="useSteps" className="text-sm">Utiliser des paliers de pénalité (J+4..J+12)</label>
              </div>
              {!useSteps ? (
                <div>
                  <label className="block text-sm">Pénalité par jour</label>
                  <input type="number" className="border rounded p-2 w-full max-w-xs" value={perDay} onChange={(e)=>setPerDay(Number(e.target.value))} />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Paliers</div>
                  <div className="text-xs text-gray-500">Les jours vont de 1 à 9 (1 = J+4, …, 9 = J+12). Le montant est appliqué par jour en FCFA.</div>
                  <div className="space-y-2">
                    {steps.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="number" className="border rounded p-2 w-20" value={s.from} onChange={(e)=>{
                          const v = Number(e.target.value); setSteps(prev=> prev.map((x,i)=> i===idx?{...x, from: v}:x))
                        }} />
                        <span className="text-sm">→</span>
                        <input type="number" className="border rounded p-2 w-20" value={s.to} onChange={(e)=>{
                          const v = Number(e.target.value); setSteps(prev=> prev.map((x,i)=> i===idx?{...x, to: v}:x))
                        }} />
                        <span className="text-sm">Montant/jour (FCFA)</span>
                        <input type="number" className="border rounded p-2 w-24" value={s.rate} onChange={(e)=>{
                          const v = Number(e.target.value); setSteps(prev=> prev.map((x,i)=> i===idx?{...x, rate: v}:x))
                        }} />
                        <button type="button" className="text-red-600 text-sm" onClick={()=> setSteps(prev=> prev.filter((_,i)=> i!==idx))}>Supprimer</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="px-3 py-1 rounded border" onClick={()=> setSteps(prev=> [...prev, { from: 1, to: 3, rate: 0 }])}>Ajouter un palier</button>
                </div>
              )}
            </div>

            <div>
              <button className="px-4 py-2 rounded bg-[#234D65] text-white" disabled={update.isPending}>{update.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}</button>
            </div>
          </form>
        )}
      </div>

      {/* Confirmation suppression */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-4 w-full max-w-sm">
            <div className="font-semibold mb-2">Confirmer la suppression</div>
            <p className="text-sm text-gray-600">Voulez-vous supprimer cette version ? Cette action est irréversible.</p>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button className="px-3 py-2 border rounded" onClick={()=> setConfirmDeleteId(null)}>Annuler</button>
              <button className="px-3 py-2 rounded bg-red-600 text-white" onClick={async ()=> { await remove.mutateAsync(confirmDeleteId); setConfirmDeleteId(null); toast.success('Version supprimée') }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

