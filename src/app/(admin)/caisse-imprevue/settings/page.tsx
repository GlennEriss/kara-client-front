'use client'
import React from 'react'
import ListSubscriptionCISection from '@/components/caisse-imprevue/ListSubscriptionCISection'
import { SubscriptionCIProvider } from '@/components/caisse-imprevue/SubscriptionCIContext'

export default function CaisseImprevueSettingsPage() {
    return (
        <SubscriptionCIProvider>
            <div className="p-5">
                <section>
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                        Paramètres Caisse Imprévue
                    </h1>
                    <p className="text-gray-600 text-lg">Créer des forfaits et configurer les paramètres de la caisse imprévue</p>
                </section>
                <ListSubscriptionCISection />
            </div>
        </SubscriptionCIProvider>
    )
}
