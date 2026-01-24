'use client'

import React from 'react'
import { notFound, useParams } from 'next/navigation'
import Register from '@/components/register/Register'
import { RegisterProvider } from '@/providers/RegisterProvider'
import { useMembershipRequest } from '@/domains/memberships/hooks'
import { Loader2 } from 'lucide-react'

export default function UpdateMembershipPage() {
    const params = useParams()
    const requestId = params?.requestId as string

    if (!requestId) {
        notFound()
    }

    // Hook pour récupérer les données de la demande
    // Note: On utilisera useMembershipRequest qui existe déjà ou un fetch direct
    const { data: request, isLoading, error } = useMembershipRequest(requestId)

    if (isLoading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-kara-primary-dark" />
            </div>
        )
    }

    if (error || !request) {
        return (
            <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
                <h2 className="text-xl font-semibold text-red-600">Erreur lors du chargement</h2>
                <p className="text-gray-600">Impossible de charger la demande d'adhésion.</p>
            </div>
        )
    }

    // Préparation des données initiales (mapping si nécessaire)
    const initialData = {
        ...request,
        identity: {
            ...request.identity,
            photo: request.identity.photoURL, // Mapping critique pour l'affichage de la photo
        },
        documents: {
            ...request.documents,
            documentPhotoFront: request.documents.documentPhotoFrontURL, // Mapping critique pour l'affichage recto
            documentPhotoBack: request.documents.documentPhotoBackURL,   // Mapping critique pour l'affichage verso
            termsAccepted: true
        }
    }

    return (
        <div className="container mx-auto max-w-5xl py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-kara-primary-dark">
                    Modifier la demande d'adhésion
                </h1>
                <p className="text-gray-600">
                    Modification administrative de la demande de {request.identity.firstName} {request.identity.lastName}
                </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <RegisterProvider
                    initialData={initialData as any}
                    requestId={requestId}
                    isAdminMode={true}
                >
                    <Register />
                </RegisterProvider>
            </div>
        </div>
    )
}
