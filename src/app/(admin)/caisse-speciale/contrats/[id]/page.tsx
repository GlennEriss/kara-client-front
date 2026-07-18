"use client"

import { useMemo, useState } from 'react'
import { backOr } from '@/lib/backNavigation'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import DailyContract from '@/components/contract/DailyContract'
import FreeContract from '@/components/contract/FreeContract'
import ContractDetailsSkeleton from '@/components/contract/ContractDetailsSkeleton'
import StandardContract from '@/components/contract/StandardContract'
import ValidateMemberSignedCSModal from '@/components/caisse-speciale/ValidateMemberSignedCSModal'
import ValidateRefundCSModal from '@/components/caisse-speciale/ValidateRefundCSModal'
import ValidateDeclaredVersementCSModal from '@/components/caisse-speciale/ValidateDeclaredVersementCSModal'
import CaisseSpecialePDFModal from '@/components/caisse-speciale/CaisseSpecialePDFModal'
import ContractPdfUploadModal from '@/components/caisse-speciale/ContractPdfUploadModal'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import routes from '@/constantes/routes'
import { useCaisseContract } from '@/hooks/useCaisseContracts'
import { useRefundsCS } from '@/hooks/caisse-speciale/useRefundsCS'
import { useDeclaredVersementsCS } from '@/hooks/caisse-speciale/useDeclaredVersementsCS'

import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	Download,
	FileText,
	Hourglass,
	RotateCcw,
	Upload,
} from 'lucide-react'

const hasValidContractPdf = (contract: any) => {
	const contractPdf = contract.contractPdf
	if (!contractPdf || typeof contractPdf !== 'object') return false
	const required = ['fileSize', 'originalFileName', 'path', 'uploadedAt', 'url']
	return required.every(
		(p) => Object.prototype.hasOwnProperty.call(contractPdf, p) && contractPdf[p] != null
	)
}

export default function AdminCaisseContractDetailsPage() {
	const params = useParams() as { id: string }
	const id = params.id
	const router = useRouter()

	const queryClient = useQueryClient()

	const [validateSignedOpen,    setValidateSignedOpen]    = useState(false)
	const [validateRefundOpen,    setValidateRefundOpen]    = useState(false)
	const [validateVersementOpen, setValidateVersementOpen] = useState(false)
	const [pdfModalOpen,          setPdfModalOpen]          = useState(false)
	const [uploadModalOpen,       setUploadModalOpen]       = useState(false)

	const { data, isLoading, isError, error } = useCaisseContract(id)
	const { data: refunds = [] }    = useRefundsCS(id)
	const { data: declared = [] }   = useDeclaredVersementsCS(id)

	const pendingRefund     = useMemo(() => refunds.find((r: any) => r.status === 'PENDING')          ?? null, [refunds])
	const pendingVersement  = useMemo(() => declared.find((v: any) => v.status === 'PENDING_MEMBER')  ?? null, [declared])

	if (isLoading) return <ContractDetailsSkeleton />

	if (isError) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
				<Card className="max-w-md border-0 shadow-2xl">
					<CardContent className="p-8 text-center">
						<div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
							<AlertTriangle className="h-10 w-10 text-red-600" />
						</div>
						<h2 className="text-2xl font-bold text-gray-900 mb-3">Erreur de chargement</h2>
						<p className="text-gray-600 mb-6">
							{error instanceof Error ? error.message : 'Une erreur est survenue'}
						</p>
						<Button onClick={() => backOr(router, routes.admin.caisseSpeciale)} className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
							<ArrowLeft className="h-5 w-5 mr-2" />
							Retour
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!data) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
				<Card className="max-w-md border-0 shadow-2xl">
					<CardContent className="p-8 text-center">
						<div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
							<FileText className="h-10 w-10 text-orange-600" />
						</div>
						<h2 className="text-2xl font-bold text-gray-900 mb-3">Contrat introuvable</h2>
						<p className="text-gray-600 mb-6">
							Le contrat avec l'ID <span className="font-mono font-semibold">{id}</span> n'existe pas.
						</p>
						<Button onClick={() => backOr(router, routes.admin.caisseSpeciale)} className="bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
							<ArrowLeft className="h-5 w-5 mr-2" />
							Retour
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Signature membre en attente de validation admin
	const hasMemberSigned = (data as any).memberSignedStatus === 'PENDING_ADMIN' && !!(data as any).memberSignedDocumentId

	// Contrat issu d'une migration (import Excel) : pas de PDF à préparer, on
	// affiche directement le détail comme pour la Caisse Imprévue.
	const isMigrated = !!(data as any).isMigrated

	// Pas encore de PDF contrat uploadé (et pas de signature membre en attente)
	if (!hasValidContractPdf(data) && !hasMemberSigned && !isMigrated) {
		return (
			<>
				<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
					<div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
						<div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
							<FileText className="h-10 w-10 text-orange-600" />
						</div>
						<h2 className="text-2xl font-bold text-gray-900 mb-2">Contrat PDF à préparer</h2>
						<p className="text-gray-600 mb-6 text-sm">
							Générez le contrat, signez-le, puis téléversez-le pour que le membre puisse le
							consulter, le signer à son tour, et vous le remettre.
						</p>
						<div className="flex flex-col gap-3">
							<Button
								onClick={() => setPdfModalOpen(true)}
								className="w-full gap-2 bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
							>
								<Download className="h-4 w-4" />
								Générer &amp; télécharger le contrat
							</Button>
							<Button
								variant="outline"
								onClick={() => setUploadModalOpen(true)}
								className="w-full gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
							>
								<Upload className="h-4 w-4" />
								Téléverser le PDF signé
							</Button>
							<Button
								variant="ghost"
								onClick={() => backOr(router, routes.admin.caisseSpeciale)}
								className="text-gray-500 text-sm"
							>
								<ArrowLeft className="h-4 w-4 mr-1" />
								Retour
							</Button>
						</div>
					</div>
				</div>

				<CaisseSpecialePDFModal
					isOpen={pdfModalOpen}
					onClose={() => setPdfModalOpen(false)}
					contractId={id}
					contractData={data}
				/>
				<ContractPdfUploadModal
					isOpen={uploadModalOpen}
					onClose={() => setUploadModalOpen(false)}
					contractId={id}
					contractName={`Contrat #${id.slice(-6)}`}
					contract={data as any}
					onSuccess={() => {
						setUploadModalOpen(false)
						queryClient.invalidateQueries({ queryKey: ['caisse-contract', id] })
					}}
				/>
			</>
		)
	}

	// Signature membre reçue — admin doit valider
	if (!hasValidContractPdf(data) && hasMemberSigned) {
		return (
			<>
				<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
					<Card className="max-w-md border-0 shadow-2xl">
						<CardContent className="p-8 text-center space-y-4">
							<div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
								<CheckCircle2 className="h-10 w-10 text-blue-600" />
							</div>
							<h2 className="text-2xl font-bold text-gray-900">Signature membre reçue</h2>
							<p className="text-gray-600">
								Le membre a téléversé son contrat signé. Téléchargez-le, signez-le à votre tour,
								puis téléversez le document doublement signé pour finaliser le contrat.
							</p>
							<div className="flex flex-col gap-2 pt-2">
								<Button
									onClick={() => setValidateSignedOpen(true)}
									className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73] gap-2"
								>
									<CheckCircle2 className="h-5 w-5" />
									Valider la signature
								</Button>
								<Button variant="ghost" onClick={() => backOr(router, routes.admin.caisseSpeciale)} className="text-gray-500">
									<ArrowLeft className="h-4 w-4 mr-2" />
									Retour
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
				<ValidateMemberSignedCSModal
					open={validateSignedOpen}
					onOpenChange={setValidateSignedOpen}
					contract={data as any}
				/>
			</>
		)
	}

	const renderContract = () => {
		const type = (data as any).caisseType || 'STANDARD'
		if (type === 'JOURNALIERE' || type === 'JOURNALIERE_CHARITABLE') return <DailyContract id={id} />
		if (type === 'LIBRE' || type === 'LIBRE_CHARITABLE') return <FreeContract id={id} />
		return <StandardContract id={id} />
	}

	return (
		<>
			{/* Bannière : signature membre en attente (contrat déjà uploadé) */}
			{hasMemberSigned && (
				<div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
					<div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-blue-100 p-2 shrink-0">
								<CheckCircle2 className="h-4 w-4 text-blue-700" />
							</div>
							<div>
								<p className="text-sm font-semibold text-blue-900">Contrat signé par le membre</p>
								<p className="text-xs text-blue-700">
									Le membre a soumis son contrat signé. Téléchargez-le, contre-signez, puis téléversez le document doublement signé.
								</p>
							</div>
						</div>
						<Button
							size="sm"
							onClick={() => setValidateSignedOpen(true)}
							className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white gap-2"
						>
							<CheckCircle2 className="h-4 w-4" />
							Valider la signature
						</Button>
					</div>
				</div>
			)}

			{/* Bannière : remboursement en attente */}
			{pendingRefund && (
				<div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
					<div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-orange-100 p-2 shrink-0">
								<RotateCcw className="h-4 w-4 text-orange-700" />
							</div>
							<div>
								<p className="text-sm font-semibold text-orange-900">
									Demande de remboursement en attente
								</p>
								<p className="text-xs text-orange-700">
									Le membre a soumis une demande de{' '}
									<strong>{(pendingRefund as any).type === 'FINAL' ? 'remboursement final' : 'retrait anticipé'}</strong>
									{(pendingRefund as any).withdrawalAmount
										? <> pour <strong>{new Intl.NumberFormat('fr-FR').format((pendingRefund as any).withdrawalAmount)} FCFA</strong></>
										: null
									}. Veuillez valider ou archiver.
								</p>
							</div>
						</div>
						<Button
							size="sm"
							onClick={() => setValidateRefundOpen(true)}
							className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white gap-2"
						>
							<CheckCircle2 className="h-4 w-4" />
							Traiter la demande
						</Button>
					</div>
				</div>
			)}

			{/* Bannière : versement déclaré en attente */}
			{pendingVersement && (
				<div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
					<div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-amber-100 p-2 shrink-0">
								<Hourglass className="h-4 w-4 text-amber-700" />
							</div>
							<div>
								<p className="text-sm font-semibold text-amber-900">
									Versement déclaré en attente de validation
								</p>
								<p className="text-xs text-amber-700">
									Le membre a déclaré un versement de{' '}
									<strong>{new Intl.NumberFormat('fr-FR').format((pendingVersement as any).amount ?? 0)} FCFA</strong>
									{' '}(Mois {((pendingVersement as any).monthIndex ?? 0) + 1}).
									Veuillez valider ou refuser.
								</p>
							</div>
						</div>
						<Button
							size="sm"
							onClick={() => setValidateVersementOpen(true)}
							className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white gap-2"
						>
							<CheckCircle2 className="h-4 w-4" />
							Traiter la déclaration
						</Button>
					</div>
				</div>
			)}

			<div className="bg-gradient-to-br from-slate-50 to-blue-50 overflow-x-hidden">
				{renderContract()}
			</div>

			{/* Modals */}
			<ValidateMemberSignedCSModal
				open={validateSignedOpen}
				onOpenChange={setValidateSignedOpen}
				contract={data as any}
			/>

			{pendingRefund && (
				<ValidateRefundCSModal
					open={validateRefundOpen}
					onClose={() => setValidateRefundOpen(false)}
					contractId={id}
					refund={pendingRefund}
					onSuccess={() => setValidateRefundOpen(false)}
				/>
			)}

			{pendingVersement && (
				<ValidateDeclaredVersementCSModal
					open={validateVersementOpen}
					onClose={() => setValidateVersementOpen(false)}
					contractId={id}
					versement={pendingVersement}
					onSuccess={() => setValidateVersementOpen(false)}
				/>
			)}
		</>
	)
}
