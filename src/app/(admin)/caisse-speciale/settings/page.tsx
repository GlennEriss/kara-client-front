"use client"

import React from 'react'
import { useActiveCaisseSettings, useCaisseSettingsList, useCaisseSettingsMutations } from '@/hooks/useCaisseSettings'
import { toast } from 'sonner'
import { Plus, Edit3, Power, Trash2, Calendar, Settings, DollarSign, TrendingUp, AlertTriangle, Check, X, Loader2 } from 'lucide-react'

export default function AdminCaisseSettingsPage() {
  const active = useActiveCaisseSettings()
  const list = useCaisseSettingsList()
  const { create, update, activate, remove } = useCaisseSettingsMutations()
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = React.useState(false)
  const [editBonusTable, setEditBonusTable] = React.useState<Record<string, number>>({})
  const [editUseSteps, setEditUseSteps] = React.useState(false)
  const [editSteps, setEditSteps] = React.useState<Array<{ from: number; to: number; rate: number }>>([])
  const [editPerDay, setEditPerDay] = React.useState(0)

  const [createBonusTable, setCreateBonusTable] = React.useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (let m = 4; m <= 12; m++) initial[`M${m}`] = 0
    return initial
  })
  const [perDay, setPerDay] = React.useState(0)
  const [effectiveAt, setEffectiveAt] = React.useState<string>('')
  const [caisseType, setCaisseType] = React.useState<'STANDARD' | 'JOURNALIERE' | 'LIBRE'>('STANDARD')

  // Éditeur détaillé de la version active
  const [bonusTable, setBonusTable] = React.useState<Record<string, number>>({})
  const [useSteps, setUseSteps] = React.useState(false)
  const [steps, setSteps] = React.useState<Array<{ from: number; to: number; rate: number }>>([])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      isActive: false,
      bonusTable: createBonusTable,
      penaltyRules: { day4To12: { perDay: Number(perDay) } },
      businessTexts: {},
      caisseType,
    }
    if (effectiveAt) {
      const d = new Date(effectiveAt)
      if (!isNaN(d.getTime())) payload.effectiveAt = d
    } else {
      payload.effectiveAt = new Date()
    }
    try {
      await create.mutateAsync(payload)
      setEffectiveAt('')
      setCreateBonusTable(() => {
        const reset: Record<string, number> = {}
        for (let m = 4; m <= 12; m++) reset[`M${m}`] = 0
        return reset
      })
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

  const getCaisseTypeColor = (type: string) => {
    switch (type) {
      case 'STANDARD': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'JOURNALIERE': return 'bg-green-100 text-green-800 border-green-200'
      case 'LIBRE': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Paramètres Caisse Spéciale
            </h1>
            <p className="text-gray-600 text-lg">Configurez les bonus et pénalités par type de caisse</p>
          </div>
        </div>

        {/* Information sur l'activation */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-2 mt-0.5">
              <Settings className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">💡 Comment fonctionne l'activation ?</div>
              <div className="space-y-1">
                <div>• <strong>Une seule version active par type de caisse</strong> (STANDARD, JOURNALIERE, LIBRE)</div>
                <div>• L'activation d'une version <strong>désactive automatiquement</strong> les autres versions du même type</div>
                <div>• Les versions d'autres types de caisse <strong>ne sont pas affectées</strong></div>
                <div>• Chaque type de caisse peut avoir ses propres paramètres actifs simultanément</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section Créer une version */}
          <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] p-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Créer une nouvelle version</h2>
              </div>
            </div>
            
            <div className="p-6">
              <form className="space-y-6" onSubmit={onCreate}>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Settings className="h-4 w-4" />
                    Type de caisse
                  </label>
                  <select 
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200" 
                    value={caisseType} 
                    onChange={(e) => setCaisseType(e.target.value as any)}
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="JOURNALIERE">Journalière</option>
                    <option value="LIBRE">Libre</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4" />
                    Date d'effet
                  </label>
                  <input 
                    type="date" 
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200" 
                    value={effectiveAt} 
                    onChange={(e) => setEffectiveAt(e.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <TrendingUp className="h-4 w-4" />
                    Bonus par mois (M4 à M12)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 9 }).map((_, i) => {
                      const m = i + 4
                      const key = `M${m}` as const
                      return (
                        <div key={key} className="space-y-1">
                          <label className="block text-xs font-medium text-gray-700">{key} (%)</label>
                          <input
                            type="number"
                            className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
                            value={createBonusTable[key] ?? 0}
                            onChange={(e) =>
                              setCreateBonusTable(prev => ({ ...prev, [key]: Number(e.target.value) }))
                            }
                            placeholder="0"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    Pénalité par jour (%) (J+4..J+12)
                  </label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200" 
                    value={perDay} 
                    onChange={(e) => setPerDay(Number(e.target.value))} 
                    placeholder="0"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg hover:shadow-[#234D65]/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled={create.isPending}
                >
                  {create.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Créer la version
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Section Versions existantes */}
          <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-gray-100 overflow-hidden">
            <div className="bg-[#234D65] p-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Versions existantes</h2>
              </div>
            </div>

            <div className="p-6">
              {list.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Chargement des versions...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {(list.data || []).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune version configurée</p>
                    </div>
                  ) : (
                    (() => {
                      // Grouper les versions par type de caisse
                      const groupedVersions = (list.data || []).reduce((acc: any, s: any) => {
                        const type = (s as any).caisseType || 'STANDARD'
                        if (!acc[type]) acc[type] = []
                        acc[type].push(s)
                        return acc
                      }, {})

                      return Object.entries(groupedVersions).map(([type, versions]: [string, any]) => (
                        <div key={type} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${type === 'STANDARD' ? 'bg-blue-500' : type === 'JOURNALIERE' ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                            <h3 className="font-semibold text-gray-900 capitalize">{type.toLowerCase()}</h3>
                            <span className="text-xs text-gray-500">({versions.length} version{versions.length > 1 ? 's' : ''})</span>
                          </div>
                          
                          <div className="space-y-3">
                            {versions.map((s: any) => (
                              <div key={s.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all duration-200">
                                <div className="flex flex-col lg:flex-row items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                                      <span className="font-mono text-sm font-medium text-gray-900">{s.id}</span>
                                      <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getCaisseTypeColor((s as any).caisseType || 'STANDARD')}`}>
                                        {(s as any).caisseType || 'STANDARD'}
                                      </span>
                                      {s.isActive && (
                                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-600">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Effet: {(() => {
                                          const v = (s as any).effectiveAt
                                          if (!v) return '—'
                                          const d = v && typeof v === 'object' && 'seconds' in v ? new Date(v.seconds * 1000) : new Date(v)
                                          return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-600 hover:text-blue-600 transition-all duration-200"
                                      onClick={() => {
                                        setEditId(s.id)
                                        const bt = (s as any)?.bonusTable || {}
                                        const prefilled: Record<string, number> = {}
                                        for (let m = 4; m <= 12; m++) prefilled[`M${m}`] = Number(bt[`M${m}`] || 0)
                                        setEditBonusTable(prefilled)
                                        const pr = (s as any)?.penaltyRules || {}
                                        if (pr.day4To12?.steps) {
                                          setEditUseSteps(true)
                                          setEditSteps((pr.day4To12.steps || []).map((x: any) => ({ from: Number(x.from), to: Number(x.to), rate: Number(x.rate) })))
                                          setEditPerDay(0)
                                        } else {
                                          setEditUseSteps(false)
                                          setEditSteps([])
                                          setEditPerDay(Number(pr.day4To12?.perDay || 0))
                                        }
                                      }}
                                      title="Éditer"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    {!s.isActive && (
                                      <button 
                                        className="p-2 rounded-lg border border-green-200 hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200" 
                                        onClick={async () => { 
                                          try {
                                            await activate.mutateAsync(s.id)
                                            toast.success(`Version ${s.id} activée pour le type ${(s as any).caisseType || 'STANDARD'}`)
                                          } catch (error) {
                                            toast.error('Erreur lors de l\'activation')
                                          }
                                        }}
                                        title={`Activer cette version (désactivera les autres versions du type ${(s as any).caisseType || 'STANDARD'})`}
                                      >
                                        <Power className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button 
                                      className="p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200" 
                                      onClick={() => setConfirmDeleteId(s.id)}
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    })()
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de confirmation de suppression */}
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-red-50 border-b border-red-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 rounded-full p-2">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-red-900">Confirmer la suppression</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  Êtes-vous sûr de vouloir supprimer cette version ? Cette action est irréversible et ne peut pas être annulée.
                </p>
                <div className="flex gap-3">
                  <button 
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Annuler
                  </button>
                  <button 
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                    onClick={async () => { 
                      await remove.mutateAsync(confirmDeleteId); 
                      setConfirmDeleteId(null); 
                      toast.success('Version supprimée') 
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal d'édition */}
        {editId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-lg p-2">
                      <Edit3 className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Éditer la version {editId}</h3>
                  </div>
                  <button 
                    className="p-2 rounded-lg hover:bg-white/20 text-white transition-all duration-200"
                    onClick={() => setEditId(null)}
                    disabled={isSavingEdit}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                      <TrendingUp className="h-5 w-5" />
                      Bonus par mois (à partir de M4)
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Array.from({ length: 9 }).map((_, i) => {
                        const m = i + 4
                        const key = `M${m}`
                        return (
                          <div key={key} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">{key} (%)</label>
                            <input 
                              type="number" 
                              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200" 
                              value={editBonusTable[key] ?? 0} 
                              onChange={(e) => setEditBonusTable(prev => ({ ...prev, [key]: Number(e.target.value) }))} 
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input 
                        id="editUseSteps" 
                        type="checkbox" 
                        checked={editUseSteps} 
                        onChange={(e) => setEditUseSteps(e.target.checked)}
                        className="w-4 h-4 text-[#234D65] border-gray-300 rounded focus:ring-[#234D65]/20"
                      />
                      <label htmlFor="editUseSteps" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <DollarSign className="h-4 w-4" />
                        Utiliser des paliers de pénalité (J+4..J+12)
                      </label>
                    </div>

                    {!editUseSteps ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Pénalité par jour (%)</label>
                        <input 
                          type="number" 
                          className="w-full max-w-xs border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200" 
                          value={editPerDay} 
                          onChange={(e) => setEditPerDay(Number(e.target.value))} 
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-gray-700">Paliers de pénalité</div>
                        <div className="space-y-3">
                          {editSteps.map((s, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Jour</span>
                                  <input 
                                    type="number" 
                                    className="w-20 border border-gray-200 rounded-lg p-2 text-center focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200" 
                                    value={s.from} 
                                    onChange={(e) => { 
                                      const v = Number(e.target.value); 
                                      setEditSteps(prev => prev.map((x, i) => i === idx ? { ...x, from: v } : x)) 
                                    }} 
                                  />
                                </div>
                                <span className="text-gray-400">→</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Jour</span>
                                  <input 
                                    type="number" 
                                    className="w-20 border border-gray-200 rounded-lg p-2 text-center focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200" 
                                    value={s.to} 
                                    onChange={(e) => { 
                                      const v = Number(e.target.value); 
                                      setEditSteps(prev => prev.map((x, i) => i === idx ? { ...x, to: v } : x)) 
                                    }} 
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Taux/jour (%)</span>
                                  <input 
                                    type="number" 
                                    className="w-32 border border-gray-200 rounded-lg p-2 focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200" 
                                    value={s.rate} 
                                    onChange={(e) => { 
                                      const v = Number(e.target.value); 
                                      setEditSteps(prev => prev.map((x, i) => i === idx ? { ...x, rate: v } : x)) 
                                    }} 
                                  />
                                </div>
                                <button 
                                  type="button" 
                                  className="p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200" 
                                  onClick={() => setEditSteps(prev => prev.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button 
                          type="button" 
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 text-gray-700"
                          onClick={() => setEditSteps(prev => [...prev, { from: 1, to: 3, rate: 0 }])}
                        >
                          <Plus className="h-4 w-4" />
                          Ajouter un palier
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex gap-3 justify-end">
                  <button 
                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-white transition-all duration-200 font-medium" 
                    onClick={() => setEditId(null)} 
                    disabled={isSavingEdit}
                  >
                    Annuler
                  </button>
                  <button 
                    className="px-6 py-3 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white rounded-xl hover:shadow-lg hover:shadow-[#234D65]/25 transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                    disabled={isSavingEdit} 
                    onClick={async () => {
                      try {
                        setIsSavingEdit(true)
                        const updates: any = { 
                          bonusTable: editBonusTable, 
                          penaltyRules: { 
                            day4To12: editUseSteps ? { steps: editSteps } : { perDay: Number(editPerDay) } 
                          } 
                        }
                        await update.mutateAsync({ id: editId as string, updates })
                        toast.success('Version mise à jour')
                        setEditId(null)
                      } catch (e) {
                        console.error(e)
                        toast.error('Échec de la mise à jour')
                      } finally { 
                        setIsSavingEdit(false) 
                      }
                    }}
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}