"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import StandardContract from '@/components/contract/StandardContract'
import DailyContract from '@/components/contract/DailyContract'
import FreeContract from '@/components/contract/FreeContract'

export default function AdminCaisseContractDetailsPage() {
	const params = useParams() as { id: string }
	const id = params.id
	const { data, isLoading, isError, error } = useCaisseContract(id)
	if (isLoading) return <div className="p-4">Chargement…</div>
	if (isError) return <div className="p-4 text-red-600">Erreur de chargement du contrat: {String((error as any)?.message || error)}</div>
	if (!data) return <div className="p-4">Contrat introuvable</div>

	const type = (data as any).caisseType || 'STANDARD'
	if (type === 'JOURNALIERE') return <DailyContract id={id} />
	if (type === 'LIBRE') return <FreeContract id={id} />
	return <StandardContract id={id} />
}