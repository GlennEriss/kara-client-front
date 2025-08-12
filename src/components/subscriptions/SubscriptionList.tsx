"use client"

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, CreditCard, Clock, Download, FileText, ArrowLeft, User } from 'lucide-react'
import { useMemberSubscriptions, useMemberWithSubscription } from '@/hooks/useMembers'
import type { Subscription } from '@/types/types'

function formatDate(date: Date) {
    try { return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) } catch { return 'Date invalide' }
}
function formatShortDate(date: Date) {
    try { return new Date(date).toLocaleDateString('fr-FR') } catch { return 'Date invalide' }
}
function isSubscriptionValid(sub: Subscription) { return sub.dateEnd > new Date() }
function daysRemaining(endDate: Date) {
    const diff = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `Expiré depuis ${Math.abs(diff)} j`
    if (diff === 0) return `Expire aujourd'hui`
    return `Expire dans ${diff} j`
}

export default function SubscriptionList() {
    const params = useParams()
    const router = useRouter()
    const memberId = params.id as string
    const { data: subscriptions, isLoading } = useMemberSubscriptions(memberId)
    const { data: member } = useMemberWithSubscription(memberId)

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 lg:p-8">
                <Card className="shadow-2xl border-0">
                    <CardContent className="p-8">
                        <Skeleton className="h-8 w-64 mb-4" />
                        <Skeleton className="h-6 w-40 mb-6" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <Card key={i} className="p-6"><Skeleton className="h-6 w-48 mb-2" /><Skeleton className="h-4 w-32" /></Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center justify-between bg-gradient-to-r from-white to-gray-50/50 p-4 lg:p-6 rounded-2xl shadow-lg border-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-white hover:bg-gray-100 shadow-md border-0">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl lg:text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">Abonnements du membre</h1>
                        {member && (
                            <p className="text-sm text-gray-600">{member.firstName} {member.lastName} • Matricule: {member.matricule}</p>
                        )}
                    </div>
                </div>
                <div className="hidden sm:block">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-slate-600" />
                    </div>
                </div>
            </div>

            {subscriptions && subscriptions.length > 0 ? (
                <div className="space-y-6">
                    {/* Stats simples */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-6 text-center border-0 bg-gradient-to-br from-slate-50 to-slate-100"><div className="text-3xl font-bold text-slate-700 mb-2">{subscriptions.length}</div><p className="text-sm text-slate-600 font-medium">Total abonnements</p></Card>
                        <Card className="p-6 text-center border-0 bg-gradient-to-br from-emerald-50 to-emerald-100"><div className="text-3xl font-bold text-emerald-700 mb-2">{subscriptions.filter(isSubscriptionValid).length}</div><p className="text-sm text-emerald-700 font-medium">Actifs</p></Card>
                        <Card className="p-6 text-center border-0 bg-gradient-to-br from-rose-50 to-rose-100"><div className="text-3xl font-bold text-rose-700 mb-2">{subscriptions.filter(s => !isSubscriptionValid(s)).length}</div><p className="text-sm text-rose-700 font-medium">Expirés</p></Card>
                    </div>

                    {/* Liste */}
                    <div className="space-y-4">
                        {subscriptions.map((subscription, index) => {
                            const active = isSubscriptionValid(subscription)
                            return (
                                <Card key={subscription.id} className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg border-0 ${active ? 'bg-gradient-to-r from-emerald-50 to-emerald-50/50 ring-1 ring-emerald-200' : 'bg-white shadow-sm border border-gray-100'}`}>
                                    {active && (<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />)}
                                    <CardContent className="p-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-3 w-3 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-900">Abonnement {subscription.type}</h4>
                                                    {index === 0 && (<Badge variant="secondary" className="text-xs mt-1">Le plus récent</Badge>)}
                                                </div>
                                            </div>
                                            {active ? (
                                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Actif</Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">Expiré</Badge>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                                            <div className="flex items-start gap-3"><div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0"><Calendar className="h-4 w-4 text-blue-600" /></div><div className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date de début</p><p className="font-semibold text-gray-900 truncate">{formatShortDate(subscription.dateStart)}</p></div></div>
                                            <div className="flex items-start gap-3"><div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0"><Calendar className="h-4 w-4 text-amber-600" /></div><div className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date de fin</p><p className="font-semibold text-gray-900 truncate">{formatShortDate(subscription.dateEnd)}</p></div></div>
                                            <div className="flex items-start gap-3"><div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0"><CreditCard className="h-4 w-4 text-emerald-600" /></div><div className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Montant</p><p className="font-semibold text-gray-900 truncate">{subscription.montant} {subscription.currency}</p></div></div>
                                            <div className="flex items-start gap-3"><div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0"><Clock className="h-4 w-4 text-purple-600" /></div><div className="min-w-0"><p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Statut</p><p className={`font-semibold text-sm truncate ${active ? 'text-emerald-600' : 'text-rose-600'}`}>{daysRemaining(subscription.dateEnd)}</p></div></div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300">
                                                <FileText className="h-4 w-4 mr-2" /> Voir fiche d'adhésion
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100 "><CardContent className="text-center py-16 px-6"><div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6"><Calendar className="h-10 w-10 text-gray-400" /></div><div className="space-y-4"><div><h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun abonnement trouvé</h3><p className="text-gray-600 max-w-md mx-auto">Ce membre n'a pas encore d'abonnement enregistré.</p></div></div></CardContent></Card>
            )}
        </div>
    )
}

