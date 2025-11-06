"use client"

import React from 'react'
import { useActiveCaisseSettings, useCaisseSettingsList, useCaisseSettingsMutations } from '@/hooks/useCaisseSettings'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Plus, Edit3, Power, Trash2, Calendar, Settings, DollarSign, TrendingUp, AlertTriangle, Check, X, Loader2, Download } from 'lucide-react'

export default function AdminCaisseSettingsPage() {
  const { user } = useAuth()
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
  const [isExporting, setIsExporting] = React.useState(false)

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

  // Fonction pour générer l'ID personnalisé
  const generateCustomId = (caisseType: string) => {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    return `MK_VERSION_${caisseType}_${day}${month}${year}_${hours}${minutes}`
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.uid) {
      toast.error('Utilisateur non authentifié')
      return
    }

    // Générer l'ID personnalisé
    const customId = generateCustomId(caisseType)
    
    const payload: any = {
      id: customId,
      isActive: false,
      bonusTable: createBonusTable,
      penaltyRules: { day4To12: { perDay: Number(perDay) } },
      businessTexts: {},
      caisseType,
      createdBy: user.uid,
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
      toast.success(`Version créée avec l'ID: ${customId}`)
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

  const exportToExcel = async () => {
    if (!list.data || list.data.length === 0) {
      toast.error('Aucune donnée à exporter')
      return
    }

    setIsExporting(true)
    try {
      // Préparer les données pour l'export
      const exportData = list.data.map((setting: any) => {
        const bonusTable = setting.bonusTable || {}
        const penaltyRules = setting.penaltyRules || {}
        const day4To12 = penaltyRules.day4To12 || {}
        
        return {
          'ID': setting.id,
          'Type de Caisse': setting.caisseType || 'STANDARD',
          'Statut': setting.isActive ? 'Active' : 'Inactive',
          'Date d\'effet': setting.effectiveAt ? (() => {
            const d = setting.effectiveAt && typeof setting.effectiveAt === 'object' && 'seconds' in setting.effectiveAt 
              ? new Date(setting.effectiveAt.seconds * 1000) 
              : new Date(setting.effectiveAt)
            return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
          })() : '—',
          'Bonus M4 (%)': bonusTable.M4 || 0,
          'Bonus M5 (%)': bonusTable.M5 || 0,
          'Bonus M6 (%)': bonusTable.M6 || 0,
          'Bonus M7 (%)': bonusTable.M7 || 0,
          'Bonus M8 (%)': bonusTable.M8 || 0,
          'Bonus M9 (%)': bonusTable.M9 || 0,
          'Bonus M10 (%)': bonusTable.M10 || 0,
          'Bonus M11 (%)': bonusTable.M11 || 0,
          'Bonus M12 (%)': bonusTable.M12 || 0,
          'Pénalité par jour (%)': day4To12.perDay || 0,
          'Utilise des paliers': day4To12.steps ? 'Oui' : 'Non',
          'Paliers (JSON)': day4To12.steps ? JSON.stringify(day4To12.steps) : '',
          'Date de création': setting.createdAt ? (() => {
            const d = setting.createdAt && typeof setting.createdAt === 'object' && 'seconds' in setting.createdAt 
              ? new Date(setting.createdAt.seconds * 1000) 
              : new Date(setting.createdAt)
            return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
          })() : '—',
          'Dernière modification': setting.updatedAt ? (() => {
            const d = setting.updatedAt && typeof setting.updatedAt === 'object' && 'seconds' in setting.updatedAt 
              ? new Date(setting.updatedAt.seconds * 1000) 
              : new Date(setting.updatedAt)
            return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
          })() : '—'
        }
      })

      // Créer le fichier CSV avec BOM pour Excel
      const headers = Object.keys(exportData[0])
      
      // Ajouter le BOM UTF-8 pour Excel
      const BOM = '\uFEFF'
      
      const csvContent = BOM + [
        headers.join(';'),
        ...exportData.map((row: Record<string, any>) => 
          headers.map(header => {
            const value = row[header]
            // Échapper les points-virgules et guillemets dans les valeurs
            if (typeof value === 'string' && (value.includes(';') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(';')
        )
      ].join('\r\n')

      // Créer et télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `parametres-caisse-speciale-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Export réussi !')
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent break-words">
              Paramètres Caisse Spéciale
            </h1>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg mt-1 break-words">Configurez les bonus et pénalités par type de caisse</p>
          </div>
          <button
            onClick={exportToExcel}
            disabled={isExporting || list.isLoading || !list.data || list.data.length === 0}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shrink-0"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Export en cours...</span>
                <span className="sm:hidden">Export...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exporter Excel</span>
                <span className="sm:hidden">Excel</span>
              </>
            )}
          </button>
        </div>

        {/* Information sur l'activation */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="bg-blue-100 rounded-full p-2 mt-0.5 shrink-0">
              <Settings className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-xs sm:text-sm text-blue-800 flex-1 min-w-0 break-words">
              <div className="font-medium mb-1 sm:mb-2">💡 Comment fonctionne l'activation ?</div>
              <div className="space-y-1 sm:space-y-1.5">
                <div className="break-words">• <strong>Une seule version active par type de caisse</strong> (STANDARD, JOURNALIERE, LIBRE)</div>
                <div className="break-words">• L'activation d'une version <strong>désactive automatiquement</strong> les autres versions du même type</div>
                <div className="break-words">• Les versions d'autres types de caisse <strong>ne sont pas affectées</strong></div>
                <div className="break-words">• Chaque type de caisse peut avoir ses propres paramètres actifs simultanément</div>
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
            <div className="bg-[#234D65] p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-white/20 rounded-lg p-2 shrink-0">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white break-words">Versions existantes</h2>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-x-hidden">
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className={`w-3 h-3 rounded-full shrink-0 ${type === 'STANDARD' ? 'bg-blue-500' : type === 'JOURNALIERE' ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 capitalize break-words">{type.toLowerCase()}</h3>
                            <span className="text-xs text-gray-500 shrink-0">({versions.length} version{versions.length > 1 ? 's' : ''})</span>
                          </div>
                          
                          <div className="space-y-3">
                            {versions.map((s: any) => (
                              <div key={s.id} className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100 hover:shadow-md transition-all duration-200">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
                                      <span className="font-mono text-xs sm:text-sm font-medium text-gray-900 break-all">{s.id}</span>
                                      <span className={`text-xs px-2 sm:px-3 py-1 rounded-full border font-medium shrink-0 ${getCaisseTypeColor((s as any).caisseType || 'STANDARD')}`}>
                                        {(s as any).caisseType || 'STANDARD'}
                                      </span>
                                      {s.isActive && (
                                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 shrink-0">
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-4 text-xs text-gray-600 break-words">
                                      <span className="flex items-center gap-1 shrink-0">
                                        <Calendar className="h-3 w-3" />
                                        <span className="hidden sm:inline">Effet:</span>
                                        <span className="font-medium">{(() => {
                                          const v = (s as any).effectiveAt
                                          if (!v) return '—'
                                          const d = v && typeof v === 'object' && 'seconds' in v ? new Date(v.seconds * 1000) : new Date(v)
                                          return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
                                        })()}</span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                    {process.env.NODE_ENV === 'development' && (
                                      <button
                                        className="p-2 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-600 hover:text-blue-600 transition-all duration-200 h-9 w-9 flex items-center justify-center"
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
                                    )}
                                    {!s.isActive && (
                                      <button 
                                        className="p-2 rounded-lg border border-green-200 hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200 h-9 w-9 flex items-center justify-center" 
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
                                    {process.env.NODE_ENV === 'development' && (
                                      <button 
                                        className="p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200 h-9 w-9 flex items-center justify-center" 
                                        onClick={() => setConfirmDeleteId(s.id)}
                                        title="Supprimer"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
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
        {process.env.NODE_ENV === 'development' && confirmDeleteId && (
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
        {process.env.NODE_ENV === 'development' && editId && (
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