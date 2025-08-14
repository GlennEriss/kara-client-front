"use client"

import React, { useState } from 'react'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useActiveCaisseSettingsByType } from '@/hooks/useCaisseSettings'
import { pay, requestFinalRefund, requestEarlyRefund, approveRefund, markRefundPaid, cancelEarlyRefund } from '@/services/caisse/mutations'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then(m => m.PDFDownloadLink), { ssr: false })
import { RefundAttestationDoc } from '@/services/caisse/pdf'

type Props = { id: string }

export default function FreeContract({ id }: Props) {
  const { data, isLoading, isError, error, refetch } = useCaisseContract(id)
  const [amount, setAmount] = useState<number>(0)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [file, setFile] = useState<File | undefined>()
  const [isPaying, setIsPaying] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [refundFile, setRefundFile] = useState<File | undefined>()
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [confirmPaidId, setConfirmPaidId] = useState<string | null>(null)
  const [confirmFinal, setConfirmFinal] = useState(false)

  if (isLoading) return <div className="p-4">Chargement…</div>
  if (isError) return <div className="p-4 text-red-600">Erreur de chargement du contrat: {(error as any)?.message}</div>
  if (!data) return <div className="p-4">Contrat introuvable</div>

  const isClosed = data.status === 'CLOSED'
  const settings = useActiveCaisseSettingsByType((data as any).caisseType)

  function paymentStatusLabel(s: string): string {
    const map: Record<string, string> = {
      DUE: 'À payer',
      PAID: 'Payé',
      REFUSED: 'Refusé',
    }
    return map[s] || s
  }

  const onPay = async () => {
    if (isClosed) { toast.error('Contrat clos: paiement impossible.'); return }
    if (selectedIdx === null) { toast.error('Choisissez un mois.'); return }
    if (!file) { toast.error('Téléversez une preuve.'); return }
    if (!amount || amount <= 0) { toast.error('Saisissez un montant.'); return }
    try {
      setIsPaying(true)
      await pay({ contractId: id, dueMonthIndex: selectedIdx, memberId: data.memberId, amount, file })
      await refetch()
      toast.success('Contribution enregistrée')
      setAmount(0)
      setSelectedIdx(null)
      setFile(undefined)
    } finally { setIsPaying(false) }
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-2xl font-bold">Contrat Libre #{id}</h1>
      <div className="text-xs text-gray-500">Paramètres actifs ({String((data as any).caisseType)}): {settings.data ? (settings.data as any).id : '—'}</div>
      <div className="text-sm text-gray-600">Montant minimum par mois: 100 000 FCFA</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(data.payments||[]).map((p:any)=> (
          <div key={p.id} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">M{p.dueMonthIndex+1}</div>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{paymentStatusLabel(p.status)}</span>
            </div>
            <div className="text-xs text-gray-600">Accum.: {(p.accumulatedAmount||0).toLocaleString('fr-FR')} / 100 000</div>
            <div className="mt-2 flex items-center gap-2">
              <input type="radio" name="m" checked={selectedIdx===p.dueMonthIndex} onChange={()=> setSelectedIdx(p.dueMonthIndex)} disabled={p.status!=='DUE' || isClosed} />
              <span className="text-sm">Sélectionner</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm">Montant du versement</label>
          <input type="number" className="border rounded p-2 w-full" value={amount} onChange={(e)=> setAmount(Number(e.target.value))} disabled={isClosed} />
        </div>
        <div>
          <label className="block text-sm">Preuve</label>
          <input type="file" accept="image/*" onChange={(e)=> setFile(e.target.files?.[0])} disabled={isClosed} />
        </div>
        <div>
          <button className="px-4 py-2 rounded bg-[#234D65] text-white disabled:opacity-50" disabled={isPaying || !file || selectedIdx===null || !amount || isClosed} onClick={onPay}>{isPaying? 'Paiement…':'Payer'}</button>
        </div>
      </div>

      {/* Remboursements (mêmes règles que Standard) */}
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
                <div className="font-medium">{r.type === 'FINAL' ? 'Final' : r.type === 'EARLY' ? 'Anticipé' : 'Défaut'}</div>
                <span className={`text-xs px-2 py-1 rounded ${r.status==='PENDING' ? 'bg-yellow-100 text-yellow-700' : r.status==='APPROVED' ? 'bg-blue-100 text-blue-700' : r.status==='PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{r.status === 'PENDING' ? 'En attente' : r.status === 'APPROVED' ? 'Approuvé' : r.status === 'PAID' ? 'Payé' : 'Archivé'}</span>
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e)=> {
                        const f = e.target.files?.[0]
                        if (!f) { setRefundFile(undefined); return }
                        if (!f.type.startsWith('image/')) { toast.error('La preuve doit être une image'); setRefundFile(undefined); return }
                        try {
                          const mod = await import('@/lib/utils')
                          const dataUrl = await mod.compressImage(f, mod.IMAGE_COMPRESSION_PRESETS.document)
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
                    />
                    <button className="px-3 py-1 rounded bg-[#234D65] text-white disabled:opacity-50" disabled={!refundFile} onClick={()=> setConfirmPaidId(r.id)}>Marquer payé</button>
                  </>
                )}
                {r.status === 'PAID' && (
                  <PDFDownloadLink document={<RefundAttestationDoc contract={data} refund={r} />} fileName={`attestation_${id}_${r.id}.pdf`}>
                    {({ loading }) => <span className="text-xs underline cursor-pointer">{loading ? 'PDF…' : 'Attestation PDF'}</span>}
                  </PDFDownloadLink>
                )}
              </div>
            </div>
          ))}
          {(!data.refunds || data.refunds.length === 0) && (
            <div className="text-xs text-gray-500">Aucun remboursement</div>
          )}
        </div>
      </div>

      {/* Confirmations */}
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
      {confirmPaidId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-4 w-full max-w-sm">
            <div className="font-semibold mb-2">Marquer comme payé</div>
            <p className="text-sm text-gray-600">Confirmez le marquage en payé. Une preuve peut être ajoutée.</p>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button className="px-3 py-2 border rounded" onClick={()=> setConfirmPaidId(null)}>Annuler</button>
              <button className="px-3 py-2 rounded bg-[#234D65] text-white disabled:opacity-50" disabled={!refundFile} onClick={async()=>{ await markRefundPaid(id, confirmPaidId, refundFile); setRefundFile(undefined); setConfirmPaidId(null); await refetch(); toast.success('Remboursement marqué payé') }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

