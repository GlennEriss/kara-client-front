'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Phone, Mail, MapPin, User, Briefcase, CarFront, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/useMembers'
import routes from '@/constantes/routes'

export default function MembershipDetails() {
    const params = useParams()
    const router = useRouter()
    const userId = params.id as string

    const { data: user, isLoading, isError, error } = useUser(userId)

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
                <div className="flex items-center gap-4 self-start lg:self-auto">
                    <Button
                        onClick={() => router.push(routes.admin.membershipRequestDetails(user.dossier))}
                        className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-11 lg:h-12 px-6 lg:px-8"
                    >
                        <ExternalLink className="w-4 h-4 mr-2" /> Voir le dossier
                    </Button>
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
