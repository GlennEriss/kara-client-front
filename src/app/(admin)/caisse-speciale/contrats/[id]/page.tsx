"use client"

import React, { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import StandardContract from '@/components/contract/StandardContract'
import DailyContract from '@/components/contract/DailyContract'
import FreeContract from '@/components/contract/FreeContract'
import { toast } from 'sonner'
import { AlertTriangle, Upload } from 'lucide-react'

// Fonction pour vérifier si le contrat a un PDF valide
const hasValidContractPdf = (contract: any) => {
	const contractPdf = contract.contractPdf
	if (!contractPdf || typeof contractPdf !== 'object') {
		return false
	}
	
	// Vérifier que toutes les propriétés requises sont présentes
	const requiredProperties = ['fileSize', 'originalFileName', 'path', 'uploadedAt', 'url']
	return requiredProperties.every(prop => Object.prototype.hasOwnProperty.call(contractPdf, prop) && contractPdf[prop] !== null && contractPdf[prop] !== undefined)
}

export default function AdminCaisseContractDetailsPage() {
	const params = useParams() as { id: string }
	const id = params.id
	const router = useRouter()
	const { data, isLoading, isError, error } = useCaisseContract(id)

	// Rediriger si le contrat n'a pas de PDF téléversé
	useEffect(() => {
		if (data && !hasValidContractPdf(data)) {
			toast.error('Vous devez d\'abord téléverser le document PDF du contrat')
			router.push('/caisse-speciale')
		}
	}, [data, router])

	if (isLoading) return <div className="p-4">Chargement…</div>
	if (isError) return <div className="p-4 text-red-600">Erreur de chargement du contrat: {String((error as any)?.message || error)}</div>
	if (!data) return <div className="p-4">Contrat introuvable</div>

	// Bloquer l'affichage si pas de PDF
	if (!hasValidContractPdf(data)) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
					<div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
						<AlertTriangle className="h-10 w-10 text-orange-600" />
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-3">Document PDF requis</h2>
					<p className="text-gray-600 mb-6">
						Vous devez d'abord téléverser le document PDF signé du contrat avant d'accéder aux détails.
					</p>
					<button
						onClick={() => router.push('/caisse-speciale')}
						className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white rounded-xl hover:shadow-lg transition-all duration-200"
					>
						<Upload className="h-5 w-5" />
						Retour à la liste
					</button>
				</div>
			</div>
		)
	}
	const component = () => {
		const type = (data as any).caisseType || 'STANDARD'
		if (type === 'JOURNALIERE') return <DailyContract id={id} />
		if (type === 'LIBRE') return <FreeContract id={id} />
		return <StandardContract id={id} />
	}

	return (
		<div className="bg-gradient-to-br from-slate-50 to-blue-50 overflow-x-hidden">
			{component()}
		</div>
	)
}