'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Mail, MapPin, User, Briefcase, CarFront, ExternalLink, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/useMembers'
import routes from '@/constantes/routes'
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { listContractsByMember } from '@/db/caisse/contracts.db'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useCaisseSettingsValidation } from '@/hooks/useCaisseSettingsValidation'

export default function MembershipDetails() {
    const params = useParams()
    const router = useRouter()
    const userId = params.id as string

    const { data: user, isLoading, isError, error } = useUser(userId)
    const [caisseContracts, setCaisseContracts] = React.useState<any[]>([])

    React.useEffect(() => {
        ;(async () => {
            if (!userId) return
            try {
                const cs = await listContractsByMember(userId)
                setCaisseContracts(cs)
            } catch {
                // ignore
            }
        })()
    }, [userId])

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 lg:p-8">
                <Card className="shadow-2xl border-0">
                    <CardContent className="p-8">Chargement...</CardContent>
                </Card>
            </div>
        )
    }

    if (isError || !user) {
        return (
            <div className="container mx-auto p-4 lg:p-8">
                <Card className="shadow-2xl border-0">
                    <CardContent className="p-8 text-center">
                        <p className="text-gray-600 mb-6">Utilisateur introuvable</p>
                        <Button onClick={() => router.back()} className="bg-[#234D65] text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between bg-gradient-to-r from-white to-gray-50/50 p-4 lg:p-8 rounded-2xl shadow-lg border-0 space-y-4 lg:space-y-0">
                <div className="flex flex-col lg:flex-row lg:items-start space-y-3 lg:space-y-0 lg:space-x-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-10 lg:h-12 px-3 lg:px-4 bg-white hover:bg-gray-100 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl border self-start"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        <span className="text-sm lg:text-base">Retour</span>
                    </Button>
                    <div className="space-y-1 lg:space-y-2">
                        <h1 className="text-xl lg:text-3xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent leading-tight">
                            {user.firstName} {user.lastName}
                        </h1>
                        <div className="flex items-center gap-2 text-gray-600">
                            <Badge variant="outline" className="text-xs">Matricule: {user.matricule}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 self-start lg:self-auto">
                    <Button
                        onClick={() => router.push(routes.admin.membershipRequestDetails(user.dossier))}
                        className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-11 lg:h-12 px-6 lg:px-8"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" /> Voir le dossier
                    </Button>
                    {(() => {
                        const activeStatuses = ['ACTIVE','LATE_NO_PENALTY','LATE_WITH_PENALTY','FINAL_REFUND_PENDING','EARLY_REFUND_PENDING']
                        const hasActive = caisseContracts.some((c:any) => activeStatuses.includes(c.status))
                        return hasActive ? (
                            <Button className="bg-gray-300 text-gray-600 cursor-not-allowed" disabled>Contrat en cours</Button>
                        ) : (
                            <CreateCaisseContractButton
                                memberId={user.id}
                                onCreated={async () => {
                                    try {
                                        const cs = await listContractsByMember(user.id)
                                        setCaisseContracts(cs)
                                    } catch {}
                                }}
                            />
                        )
                    })()}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                    <Card className="group bg-gradient-to-br from-white to-gray-50/30 border-0 shadow-lg">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                                <User className="w-5 h-5 text-blue-600" /> Informations personnelles
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Genre</div>
                                <div className="font-medium">{user.gender}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Nationalité</div>
                                <div className="font-medium">{user.nationality}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Véhicule</div>
                                <div className="font-medium flex items-center gap-2">
                                    <CarFront className={`w-4 h-4 ${user.hasCar ? 'text-emerald-600' : 'text-gray-400'}`} />
                                    {user.hasCar ? 'Oui' : 'Non'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="group bg-gradient-to-br from-white to-gray-50/30 border-0 shadow-lg">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                                <Phone className="w-5 h-5 text-green-600" /> Contacts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Email</div>
                                <div className="font-medium flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-blue-600" /> {user.email || 'Non renseigné'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Téléphones</div>
                                <div className="font-medium">{user.contacts?.join(', ')}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="group bg-gradient-to-br from-white to-gray-50/30 border-0 shadow-lg">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                                <Briefcase className="w-5 h-5 text-purple-600" /> Profession
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Profession</div>
                                <div className="font-medium">{user.profession || 'Non renseigné'}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-gray-500">Entreprise</div>
                                <div className="font-medium">{user.companyName || 'Non renseigné'}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6 lg:space-y-8">
                    <Card className="group bg-gradient-to-br from-white to-gray-50/30 border-0 shadow-lg">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                                <User className="w-5 h-5 text-cyan-600" /> Photo du membre
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {user.photoURL ? (
                                <Image src={user.photoURL} alt={`Photo de ${user.firstName} ${user.lastName}`} width={300} height={300} className="w-full h-48 lg:h-72 object-cover rounded-xl border-2 border-gray-200 shadow-lg" />
                            ) : (
                                <div className="w-full h-48 lg:h-72 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border-2 border-gray-200 flex items-center justify-center">
                                    <div className="text-center">
                                        <User className="w-10 h-10 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-2 lg:mb-3" />
                                        <p className="text-gray-500 font-medium text-sm lg:text-base">Aucune photo fournie</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="group bg-gradient-to-br from-white to-gray-50/30 border-0 shadow-lg">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                                <Wallet className="w-5 h-5 text-emerald-600" /> Caisse Spéciale
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            {/* Helpers inline pour badge et libellé statut */}
                            {(() => {
                                if (caisseContracts.length === 0) {
                                    return <div className="text-sm text-gray-600">Aucun contrat</div>
                                }
                                const activeStatuses = ['ACTIVE','LATE_NO_PENALTY','LATE_WITH_PENALTY','FINAL_REFUND_PENDING','EARLY_REFUND_PENDING']
                                const latest = caisseContracts[0]
                                const hasActive = caisseContracts.some((c:any) => activeStatuses.includes(c.status))
                                return (
                                    <>
                                      <div className="text-sm">Dernier contrat: <b>#{String(latest.id).slice(-6)}</b> — <span className={`text-xs px-2 py-0.5 rounded ${(() => { const m: Record<string,string> = { DRAFT:'bg-slate-100 text-slate-700', ACTIVE:'bg-green-100 text-green-700', LATE_NO_PENALTY:'bg-yellow-100 text-yellow-700', LATE_WITH_PENALTY:'bg-orange-100 text-orange-700', DEFAULTED_AFTER_J12:'bg-red-100 text-red-700', EARLY_WITHDRAW_REQUESTED:'bg-blue-100 text-blue-700', FINAL_REFUND_PENDING:'bg-indigo-100 text-indigo-700', EARLY_REFUND_PENDING:'bg-blue-100 text-blue-700', RESCINDED:'bg-red-100 text-red-700', CLOSED:'bg-gray-200 text-gray-700' }; return m[latest.status] || 'bg-gray-100 text-gray-700' })()}`}>{(() => { const m: Record<string,string> = { DRAFT:'En cours', ACTIVE:'Actif', LATE_NO_PENALTY:'Retard (J+0..3)', LATE_WITH_PENALTY:'Retard (J+4..12)', DEFAULTED_AFTER_J12:'Résilié (>J+12)', EARLY_WITHDRAW_REQUESTED:'Retrait anticipé demandé', FINAL_REFUND_PENDING:'Remboursement final en attente', EARLY_REFUND_PENDING:'Remboursement anticipé en attente', RESCINDED:'Résilié', CLOSED:'Clos' }; return m[latest.status] || latest.status })()}</span></div>
                                      <ul className="space-y-2">
                                        {caisseContracts.map((c:any) => (
                                          <li key={c.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">Contrat #{String(c.id).slice(-6)}</span>
                                              <span className={`text-xs px-2 py-0.5 rounded ${(() => { const m: Record<string,string> = { DRAFT:'bg-slate-100 text-slate-700', ACTIVE:'bg-green-100 text-green-700', LATE_NO_PENALTY:'bg-yellow-100 text-yellow-700', LATE_WITH_PENALTY:'bg-orange-100 text-orange-700', DEFAULTED_AFTER_J12:'bg-red-100 text-red-700', EARLY_WITHDRAW_REQUESTED:'bg-blue-100 text-blue-700', FINAL_REFUND_PENDING:'bg-indigo-100 text-indigo-700', EARLY_REFUND_PENDING:'bg-blue-100 text-blue-700', RESCINDED:'bg-red-100 text-red-700', CLOSED:'bg-gray-200 text-gray-700' }; return m[c.status] || 'bg-gray-100 text-gray-700' })()}`}>{(() => { const m: Record<string,string> = { DRAFT:'En cours', ACTIVE:'Actif', LATE_NO_PENALTY:'Retard (J+0..3)', LATE_WITH_PENALTY:'Retard (J+4..12)', DEFAULTED_AFTER_J12:'Résilié (>J+12)', EARLY_WITHDRAW_REQUESTED:'Retrait anticipé demandé', FINAL_REFUND_PENDING:'Remboursement final en attente', EARLY_REFUND_PENDING:'Remboursement anticipé en attente', RESCINDED:'Résilié', CLOSED:'Clos' }; return m[c.status] || c.status })()}</span>
                                            </div>
                                            <Link href={routes.admin.caisseSpecialeContractDetails(c.id)} className="underline">Ouvrir</Link>
                                          </li>
                                        ))}
                                      </ul>
                                      <div className="pt-2">
                                        <Link href={routes.admin.caisseSpeciale} className="text-xs underline">Voir l’historique des contrats</Link>
                                      </div>
                                      {/* Désactiver la création si un contrat actif existe */}
                                      {!hasActive ? null : (
                                        <div className="text-xs text-red-600">Un contrat est en cours. La création d’un nouveau contrat est désactivée.</div>
                                      )}
                                    </>
                                )
                            })()}
                        </CardContent>
                    </Card>

                    {user.address && (
                        <Card className="group bg-gradient-to-br from-white to-gray-50/30 border-0 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                                    <MapPin className="w-5 h-5 text-red-600" /> Adresse
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500">Province</div>
                                    <div className="font-medium">{user.address.province}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500">Ville</div>
                                    <div className="font-medium">{user.address.city}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500">Quartier</div>
                                    <div className="font-medium">{user.address.district}</div>
                                </div>
                                {user.address.arrondissement && (
                                    <div className="space-y-1">
                                        <div className="text-xs text-gray-500">Arrondissement</div>
                                        <div className="font-medium">{user.address.arrondissement}</div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

function CreateCaisseContractButton({ memberId, onCreated }: { memberId: string; onCreated: () => Promise<void> | void }) {
    const router = useRouter()
    const [open, setOpen] = React.useState(false)
    const [amount, setAmount] = React.useState(10000)
    const [months, setMonths] = React.useState(12)
    const [caisseType, setCaisseType] = React.useState<'STANDARD' | 'JOURNALIERE' | 'LIBRE'>('STANDARD')
    const [firstPaymentDate, setFirstPaymentDate] = React.useState('')
    const [loading, setLoading] = React.useState(false)

    // Validation des paramètres de la Caisse Spéciale
    const { isValid, isLoading: isValidating, error: validationError, settings } = useCaisseSettingsValidation(caisseType)

    const isDaily = caisseType === 'JOURNALIERE'
    const isLibre = caisseType === 'LIBRE'

    React.useEffect(() => {
        if (isLibre && amount < 100000) {
            setAmount(100000)
        }
    }, [caisseType])

    const onCreate = async () => {
        try {
            setLoading(true)
            
            // Validation des paramètres de la Caisse Spéciale
            if (!isValid || isValidating) {
                toast.error('Les paramètres de la Caisse Spéciale ne sont pas configurés. Impossible de créer un contrat.')
                return
            }
            
            if (isLibre && amount < 100000) {
                toast.error('Pour un contrat Libre, le montant mensuel doit être au minimum 100 000 FCFA.')
                return
            }
            if (!firstPaymentDate) {
                toast.error('Veuillez sélectionner la date du premier versement.')
                return
            }
            const { subscribe } = await import('@/services/caisse/mutations')
            await subscribe({ memberId, monthlyAmount: amount, monthsPlanned: months, caisseType, firstPaymentDate })
            toast.success('Contrat créé')
            setOpen(false)
            await onCreated()
        } catch (e: any) {
            toast.error(e?.message || 'Création impossible')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Button className="bg-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-11 lg:h-12 px-6 lg:px-8" onClick={() => setOpen(true)}>Créer un contrat</Button>
            <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nouveau contrat Caisse Spéciale</DialogTitle>
                        <DialogDescription>Définissez le montant, la durée et la caisse.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm mb-1">
                                {caisseType === 'STANDARD' ? 'Montant mensuel' : caisseType === 'JOURNALIERE' ? 'Objectif mensuel' : 'Montant mensuel (minimum 100 000)'}
                            </label>
                            <input
                                type="number"
                                min={isLibre ? 100000 : 100}
                                step={100}
                                className="border rounded p-2 w-full"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                            {isDaily && (
                                <div className="text-xs text-gray-500 mt-1">L’objectif est atteint par contributions quotidiennes sur le mois.</div>
                            )}
                            {isLibre && (
                                <div className="text-xs text-gray-500 mt-1">Le total versé par mois doit être au moins 100 000 FCFA.</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Durée (mois)</label>
                            <input type="number" min={1} max={12} className="border rounded p-2 w-full" value={months} onChange={(e) => setMonths(Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Caisse</label>
                            <select className="border rounded p-2 w-full" value={caisseType} onChange={(e) => setCaisseType(e.target.value as 'STANDARD' | 'JOURNALIERE' | 'LIBRE')}>
                                <option value="STANDARD">Standard</option>
                                <option value="JOURNALIERE">Journalière</option>
                                <option value="LIBRE">Libre</option>
                            </select>
                            
                            {/* Validation des paramètres */}
                            {isValidating && (
                                <div className="text-xs text-blue-600 mt-1">Vérification des paramètres...</div>
                            )}
                            
                            {!isValidating && !isValid && validationError && (
                                <div className="flex items-start gap-2 p-3 mt-2 bg-red-50 border border-red-200 rounded-md">
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-red-700">
                                        <div className="font-medium mb-1">Paramètres manquants</div>
                                        <div>{validationError}</div>
                                        <div className="mt-2 text-red-600">
                                            Veuillez configurer les paramètres de la Caisse Spéciale dans l'administration avant de créer un contrat.
                                        </div>
                                        <div className="mt-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-8 px-3 border-red-300 text-red-700 hover:bg-red-100"
                                                onClick={() => router.push(routes.admin.caisseSpecialeSettings)}
                                            >
                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                Configurer les paramètres
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {!isValidating && isValid && settings && (
                                <div className="flex items-start gap-2 p-3 mt-2 bg-green-50 border border-green-200 rounded-md">
                                    <div className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0">✓</div>
                                    <div className="text-xs text-green-700">
                                        <div className="font-medium mb-1">Paramètres configurés</div>
                                        <div>Version active depuis le {new Date(settings.effectiveAt?.toDate?.() || settings.effectiveAt).toLocaleDateString('fr-FR')}</div>
                                        <div className="mt-2 text-green-600">
                                            Vous pouvez maintenant créer un contrat avec ce type de caisse.
                                        </div>
                                        <div className="mt-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-8 px-3 border-green-300 text-green-700 hover:bg-green-100"
                                                onClick={() => router.push(routes.admin.caisseSpeciale)}
                                            >
                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                Gérer les contrats
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Date du premier versement *</label>
                            <input 
                                type="date" 
                                className="border rounded p-2 w-full" 
                                value={firstPaymentDate} 
                                onChange={(e) => setFirstPaymentDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Annuler</Button>
                        <Button 
                            className="bg-[#234D65] text-white" 
                            onClick={onCreate} 
                            disabled={loading || !isValid || isValidating}
                        >
                            {loading ? 'Création…' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
