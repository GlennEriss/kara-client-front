'use client'
import ListSubscriptionCISection from '@/components/caisse-imprevue/ListSubscriptionCISection'
import { SubscriptionCIProvider } from '@/components/caisse-imprevue/SubscriptionCIContext'
import { PageHero } from '@/components/ui/page-hero'
import { Settings } from 'lucide-react'

export default function CaisseImprevueSettingsPage() {
    return (
        <SubscriptionCIProvider>
            <div className="max-w-7xl mx-auto space-y-6 p-5">
                <PageHero
                    icon={Settings}
                    title="Paramètres Caisse Imprévue"
                    subtitle="Créer des forfaits et configurer les paramètres de la caisse imprévue"
                />
                <ListSubscriptionCISection />
            </div>
        </SubscriptionCIProvider>
    )
}
