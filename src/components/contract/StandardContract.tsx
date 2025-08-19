"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import routes from '@/constantes/routes'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
import { pay, requestFinalRefund, requestEarlyRefund, approveRefund, markRefundPaid, cancelEarlyRefund } from '@/services/caisse/mutations'
import { toast } from 'sonner'
// PDF generation désactivée pour build Next 15; à réactiver via import dynamique côté client si besoin
import { recomputeNow } from '@/services/caisse/readers'
import { compressImage, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'
import FileInput from '@/components/ui/file-input'
import type { PaymentMode } from '@/types/types'

type Props = { id: string }

export default function StandardContract({ id }: Props) {
  const { data, isLoading, isError, error, refetch } = useCaisseContract(id)
  const [file, setFile] = useState<File | undefined>()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [paymentDate, setPaymentDate] = useState(() => {
    // Initialiser avec la date du jour par défaut
    return new Date().toISOString().split('T')[0]
  })
  const [paymentTime, setPaymentTime] = useState(() => {
    // Initialiser avec l'heure actuelle par défaut
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })
  const [isPaying, setIsPaying] = useState(false)
  const [isRecomputing, setIsRecomputing] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundFile, setRefundFile] = useState<File | undefined>()
  const [refundReason, setRefundReason] = useState('')
  const [refundDate, setRefundDate] = useState(() => {
    // Initialiser avec la date du jour par défaut
    return new Date().toISOString().split('T')[0]
  })
  const [refundTime, setRefundTime] = useState(() => {
    // Initialiser avec l'heure actuelle par défaut
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  })
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)
  const [confirmFinal, setConfirmFinal] = useState(false)
  const [fileInputResetKey, setFileInputResetKey] = useState(0) // Clé pour réinitialiser le FileInput
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('airtel_money') // Mode de paiement par défaut

  function paymentStatusLabel(s: string): string {
    const map: Record<string, string> = {
      DUE: 'À payer',
      PAID: 'Payé',
      REFUSED: 'Refusé',
    }
    return map[s] || s
  }

  function contractStatusLabel(s: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Brouillon',
      ACTIVE: 'Actif',
      LATE_NO_PENALTY: 'Retard (J+0..3)',
      LATE_WITH_PENALTY: 'Retard (J+4..12)',
      DEFAULTED_AFTER_J12: 'Résilié (>J+12)',
      EARLY_WITHDRAW_REQUESTED: 'Retrait anticipé demandé',
      FINAL_REFUND_PENDING: 'Remboursement final en attente',
      EARLY_REFUND_PENDING: 'Remboursement anticipé en attente',
      RESCINDED: 'Résilié',
      CLOSED: 'Clos',
    }
    return map[s] || s
  }

  function refundStatusLabel(s: string): string {
    const map: Record<string, string> = {
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      PAID: 'Payé',
      ARCHIVED: 'Archivé',
    }
    return map[s] || s
  }

  function refundTypeLabel(t: string): string {
    const map: Record<string, string> = {
      FINAL: 'Final',
      EARLY: 'Anticipé',
      DEFAULT: 'Défaut',
    }
    return map[t] || t
  }

  if (isLoading) return <div className="p-4">Chargement…</div>
  if (isError) return <div className="p-4 text-red-600">Erreur de chargement du contrat: {(error as any)?.message}</div>
  if (!data) return <div className="p-4">Contrat introuvable</div>

  const isClosed = data.status === 'CLOSED'
  const settings = useActiveCaisseSettingsByType((data as any).caisseType)

  const onPay = async () => {
    if (isClosed) { toast.error('Contrat clos: paiement impossible.'); return }
    if (selectedIdx === null) { toast.error('Veuillez choisir un mois à payer.'); return }
    if (!file) { toast.error('Veuillez téléverser une preuve (capture) avant de payer.') ; return }
    if (!paymentDate) { toast.error('Veuillez sélectionner la date de paiement.'); return }
    if (!paymentTime) { toast.error('Veuillez sélectionner l\'heure de paiement.'); return }
    if (!paymentMode) { toast.error('Veuillez sélectionner le mode de paiement.'); return }
    
    try {
      setIsPaying(true)
      await pay({ 
        contractId: id, 
        dueMonthIndex: selectedIdx, 
        memberId: data.memberId, 
        file,
        paidAt: new Date(`${paymentDate}T${paymentTime}`),
        time: paymentTime,
        mode: paymentMode
      })
      await refetch()
      toast.success('Paiement enregistré')
      
      // Réinitialisation complète de tous les états
      setSelectedIdx(null)
      setFile(undefined)
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentTime(() => {
        const now = new Date()
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      })
      setPaymentMode('airtel_money') // Remettre le mode par défaut
      
      // Forcer la réinitialisation du FileInput
      setFileInputResetKey(prev => prev + 1)
      
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contrat #{id}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>Statut: {contractStatusLabel(data.status)}</span>
          <button onClick={async ()=>{ setIsRecomputing(true); await recomputeNow(id); await refetch(); setIsRecomputing(false) }} className="px-2 py-1 rounded border">
            {isRecomputing ? 'Recalcul…' : 'Recalculer maintenant'}
          </button>
          <Link className="px-2 py-1 rounded border underline" href={routes.admin.membershipDetails(data.memberId)}>Voir membre</Link>
        </div>
        <div className="text-xs text-gray-500 mt-1">Paramètres actifs ({String((data as any).caisseType)}): {settings.data ? (settings.data as any).id : '—'}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Montant mensuel</div>
          <div className="text-lg font-semibold">{(data.monthlyAmount || 0).toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Durée (mois)</div>
          <div className="text-lg font-semibold">{data.monthsPlanned || 0}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Nominal payé</div>
          <div className="text-lg font-semibold">{(data.nominalPaid || 0).toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Bonus cumulés</div>
          <div className="text-lg font-semibold text-emerald-700">{(data.bonusAccrued || 0).toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Pénalités cumulées</div>
          <div className="text-lg font-semibold text-red-700">{(data.penaltiesTotal || 0).toLocaleString('fr-FR')} FCFA</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500">Prochaine échéance</div>
          <div className="text-lg font-semibold">{data.nextDueAt ? new Date(data.nextDueAt).toLocaleDateString('fr-FR') : '—'}</div>
        </div>
        <div className="border rounded p-3 md:col-span-3 xl:col-span-2">
          <div className="text-xs text-gray-500">Récapitulatif</div>
          {(() => {
            const totalDue = (data.monthlyAmount || 0) * (data.monthsPlanned || 0)
            const paidCount = (data.payments || []).filter((p: any) => p.status === 'PAID').length
            return (
              <div className="text-sm text-gray-700 flex flex-wrap gap-3 mt-1">
                <span>Mois payés: <b>{paidCount}</b> / {data.monthsPlanned || 0}</span>
                <span>Total dû: <b>{totalDue.toLocaleString('fr-FR')} FCFA</b></span>
                <span>Reste: <b>{Math.max(0, totalDue - (data.nominalPaid||0)).toLocaleString('fr-FR')} FCFA</b></span>
              </div>
            )
          })()}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Calendrier des échéances</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.payments?.map((p: any) => {
            let badge = null
            if (p.status === 'DUE' && p.dueAt) {
              const now = new Date()
              const due = new Date(p.dueAt)
              const days = Math.floor((now.getTime() - due.getTime()) / 86400000)
              if (days > 12) badge = <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">{">"}J+12</span>
              else if (days >= 4) badge = <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700">J+4..J+12</span>
              else if (days >= 0) badge = <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700">J+0..J+3</span>
            }
            return (
              <div key={p.id} className="border rounded p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">M{p.dueMonthIndex + 1}</div>
                  <div className="flex items-center gap-2">
                    {badge}
                    <span className="text-xs px-2 py-1 rounded bg-gray-100">{paymentStatusLabel(p.status)}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600">Échéance: {p.dueAt ? new Date(p.dueAt).toLocaleDateString('fr-FR') : '—'}</div>
                <div className="text-xs text-gray-600">Payé le: {p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr-FR') : '—'}</div>
                {p.penaltyApplied ? (
                  <div className="text-xs text-red-600">Pénalité: {p.penaltyApplied}</div>
                ) : null}
                <div className="flex items-center gap-2 mt-1">
                <input type="radio" name="pay" onChange={() => setSelectedIdx(p.dueMonthIndex)} checked={selectedIdx === p.dueMonthIndex} disabled={p.status !== 'DUE' || isClosed} />
                  <span className="text-sm">Sélectionner pour payer</span>
                  {/* Lien PDF désactivé temporairement */}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">Payer l’échéance sélectionnée</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Date de paiement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de paiement *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
              required
            />
          </div>
          
          {/* Heure de paiement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heure de paiement *</label>
            <input
              type="time"
              value={paymentTime}
              onChange={(e) => setPaymentTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-[#234D65]/20 focus:border-[#234D65] transition-all duration-200"
              required
            />
          </div>
          
          {/* Mode de paiement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement *</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMode"
                  value="airtel_money"
                  checked={paymentMode === 'airtel_money'}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="text-[#234D65] focus:ring-[#234D65]"
                />
                <span className="text-sm text-gray-700">Airtel Money</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMode"
                  value="mobicash"
                  checked={paymentMode === 'mobicash'}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="text-[#234D65] focus:ring-[#234D65]"
                />
                <span className="text-sm text-gray-700">Mobicash</span>
              </label>
            </div>
          </div>
          
          {/* Preuve de paiement */}
          <div>
            <FileInput
              accept="image/*"
              maxSize={5}
              onFileSelect={async (selectedFile) => {
                if (!selectedFile) { 
                  setFile(undefined); 
                  return 
                }
                
                try {
                  const dataUrl = await compressImage(selectedFile, IMAGE_COMPRESSION_PRESETS.document)
                  const res = await fetch(dataUrl)
                  const blob = await res.blob()
                  const webpFile = new File([blob], 'proof.webp', { type: 'image/webp' })
                  setFile(webpFile)
                  toast.success('Preuve compressée (WebP) prête')
                } catch (err) {
                  console.error(err)
                  toast.error('Échec de la compression de l\'image')
                  setFile(undefined)
                }
              }}
              disabled={isClosed}
              label="Preuve de paiement *"
              placeholder="Glissez-déposez une image ou cliquez pour parcourir"
              currentFile={file}
              resetKey={fileInputResetKey}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="text-center">
          <button 
            onClick={onPay} 
            disabled={isPaying || !file || !paymentDate || !paymentTime || !paymentMode || isClosed} 
            className="px-6 py-3 rounded-lg bg-[#234D65] text-white font-medium hover:bg-[#1a3a4f] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
          >
            {isPaying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Paiement en cours...
              </>
            ) : (
              <>
                <span>Payer l'échéance M{selectedIdx !== null ? selectedIdx + 1 : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">Remboursements</h2>
        <div className="flex items-center gap-2">
          {(() => {
            const payments = data.payments || []
            const paidCount = payments.filter((x: any) => x.status === 'PAID').length
            const allPaid = payments.length > 0 && paidCount === payments.length
            const canEarly = paidCount >= 1 && !allPaid
            const hasFinalRefund = (data.refunds || []).some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED') || data.status === 'FINAL_REFUND_PENDING' || data.status === 'CLOSED'
            const hasEarlyRefund = (data.refunds || []).some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED') || data.status === 'EARLY_REFUND_PENDING'
            return (
              <>
                <button className="px-3 py-2 border rounded disabled:opacity-50" disabled={isRefunding || !allPaid || hasFinalRefund} onClick={()=> setConfirmFinal(true)}>Demander remboursement final</button>
                <button className="px-3 py-2 border rounded disabled:opacity-50" disabled={isRefunding || !canEarly || hasEarlyRefund} onClick={async()=>{ try{ setIsRefunding(true); await requestEarlyRefund(id); await refetch(); toast.success('Retrait anticipé demandé'); } catch(e:any){ toast.error(e?.message||'Action impossible') } finally { setIsRefunding(false)} }}>Demander retrait anticipé</button>
              </>
            )
          })()}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data.refunds || []).map((r: any) => (
            <div key={r.id} className="border rounded p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{refundTypeLabel(r.type)}</div>
                <span className={`text-xs px-2 py-1 rounded ${r.status==='PENDING' ? 'bg-yellow-100 text-yellow-700' : r.status==='APPROVED' ? 'bg-blue-100 text-blue-700' : r.status==='PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{refundStatusLabel(r.status)}</span>
              </div>
              <div className="text-xs text-gray-600">Nominal: {(r.amountNominal||0).toLocaleString('fr-FR')} FCFA</div>
              <div className="text-xs text-gray-600">Bonus: {(r.amountBonus||0).toLocaleString('fr-FR')} FCFA</div>
              <div className="text-xs text-gray-600">Échéance remboursement: {r.deadlineAt ? new Date(r.deadlineAt).toLocaleDateString('fr-FR') : '—'}</div>
              <div className="flex items-center gap-2 mt-2">
                {r.status === 'PENDING' && (
                  <>
                    <button className="px-3 py-1 rounded border" onClick={()=> setConfirmApproveId(r.id)}>Approuver</button>
                    {r.type === 'EARLY' && (
                      <button className="px-3 py-1 rounded border text-red-600" onClick={async()=>{ try{ await cancelEarlyRefund(id, r.id); await refetch(); toast.success('Demande anticipée annulée') } catch(e:any){ toast.error(e?.message||'Annulation impossible') } }}>Annuler</button>
                    )}
                  </>
                )}
                {r.status === 'APPROVED' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {/* Cause du retrait */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cause du retrait *</label>
                        <textarea
                          placeholder="Raison du retrait..."
                          className="w-full p-2 text-xs border border-gray-300 rounded-md resize-none"
                          rows={2}
                          value={refundReason || r.reason || ''}
                          onChange={(e) => setRefundReason(e.target.value)}
                          required
                        />
                      </div>
                      
                      {/* Date du retrait */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Date du retrait *</label>
                        <input
                          type="date"
                          value={refundDate}
                          onChange={(e) => setRefundDate(e.target.value)}
                          className="w-full p-2 text-xs border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      
                      {/* Heure du retrait */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Heure du retrait *</label>
                        <input
                          type="time"
                          value={refundTime}
                          onChange={(e) => setRefundTime(e.target.value)}
                          className="w-full p-2 text-xs border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      
                      {/* Preuve du retrait */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Preuve du retrait *</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e)=> {
                            const f = e.target.files?.[0]
                            if (!f) { setRefundFile(undefined); return }
                            if (!f.type.startsWith('image/')) { toast.error('La preuve doit être une image'); setRefundFile(undefined); return }
                            try {
                              const dataUrl = await compressImage(f, IMAGE_COMPRESSION_PRESETS.document)
                              const res = await fetch(dataUrl)
                              const blob = await res.blob()
                              const webpFile = new File([blob], 'refund-proof.webp', { type: 'image/webp' })
                              setRefundFile(webpFile)
                              toast.success('Preuve compressée (WebP) prête')
                            } catch (err) {
                              console.error(err)
                              toast.error('Échec de la compression de l\'image')
                              setRefundFile(undefined)
                            }
                          }}
                          className="w-full p-2 text-xs border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                    </div>
                    
                    <button 
                      className="px-3 py-1 rounded bg-[#234D65] text-white disabled:opacity-50" 
                      disabled={(() => {
                        const hasFile = !!refundFile
                        const hasReason = (refundReason && refundReason.trim()) || (r.reason && r.reason.trim())
                        const hasDate = refundDate || r.withdrawalDate
                        const hasTime = (refundTime && refundTime.trim()) || (r.withdrawalTime && r.withdrawalTime.trim() && r.withdrawalTime !== '--:--')
                        
                        // Debug temporaire
                        console.log('Validation bouton StandardContract:', {
                          hasFile,
                          hasReason,
                          hasDate,
                          hasTime,
                          refundFile: !!refundFile,
                          refundReason: refundReason || 'undefined',
                          refundDate: refundDate || 'undefined',
                          refundTime: refundTime || 'undefined',
                          rReason: r.reason || 'undefined',
                          rWithdrawalDate: r.withdrawalDate || 'undefined',
                          rWithdrawalTime: r.withdrawalTime || 'undefined'
                        })
                        
                        return !hasFile || !hasReason || !hasDate || !hasTime
                      })()}
                      onClick={async ()=> { 
                      try {
                        // Fonction utilitaire pour convertir n'importe quel type de date
                        const normalizeDate = (dateValue: any): string | null => {
                          if (!dateValue) return null
                          try {
                            let date: Date
                            if (dateValue && typeof dateValue.toDate === 'function') {
                              date = dateValue.toDate()
                            } else if (dateValue instanceof Date) {
                              date = dateValue
                            } else if (typeof dateValue === 'string') {
                              date = new Date(dateValue)
                            } else {
                              date = new Date(dateValue)
                            }
                            return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
                          } catch {
                            return null
                          }
                        }
                        
                        await markRefundPaid(id, r.id, refundFile, {
                          reason: refundReason || r.reason,
                          withdrawalDate: refundDate || normalizeDate(r.withdrawalDate) || undefined,
                          withdrawalTime: refundTime || r.withdrawalTime
                        })
                        setRefundReason('')
                        setRefundDate('')
                        setRefundTime('')
                        setRefundFile(undefined)
                        setConfirmPaidId(null)
                        await refetch()
                        toast.success('Remboursement marqué payé')
                      } catch (error: any) {
                        toast.error(error?.message || 'Erreur lors du marquage')
                      }
                    }}>Marquer payé</button>
                  </>
                )}
                {/* Attestation PDF désactivée temporairement */}
              </div>
            </div>
          ))}
          {(!data.refunds || data.refunds.length === 0) && (
            <div className="text-xs text-gray-500">Aucun remboursement</div>
          )}
        </div>
      </div>

      {confirmApproveId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-4 w-full max-w-sm">
            <div className="font-semibold mb-2">Confirmer l'approbation</div>
            <p className="text-sm text-gray-600">Voulez-vous approuver ce remboursement ?</p>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button className="px-3 py-2 border rounded" onClick={()=> setConfirmApproveId(null)}>Annuler</button>
              <button className="px-3 py-2 rounded bg-[#234D65] text-white" onClick={async()=>{ await approveRefund(id, confirmApproveId); setConfirmApproveId(null); await refetch(); toast.success('Remboursement approuvé') }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
      {confirmFinal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-4 w-full max-w-sm">
            <div className="font-semibold mb-2">Confirmer la demande</div>
            <p className="text-sm text-gray-600">Voulez-vous demander le remboursement final ? Toutes les échéances doivent être payées. Cette action est irréversible.</p>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button className="px-3 py-2 border rounded" onClick={()=> setConfirmFinal(false)} disabled={isRefunding}>Annuler</button>
              <button className="px-3 py-2 rounded bg-[#234D65] text-white" onClick={async()=>{ try{ setIsRefunding(true); await requestFinalRefund(id); await refetch(); toast.success('Remboursement final demandé'); } catch(e:any){ toast.error(e?.message||'Action impossible') } finally { setIsRefunding(false); setConfirmFinal(false)} }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

