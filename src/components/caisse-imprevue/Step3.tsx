'use client'
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone } from 'lucide-react'

export default function Step3() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[#224D62]/10">
          <Phone className="w-6 h-6 text-[#224D62]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#224D62]">Contact d'urgence</h3>
          <p className="text-sm text-muted-foreground">Renseignez les informations du contact d'urgence</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du contact</CardTitle>
          <CardDescription>
            Personne à contacter en cas d'urgence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Contenu de l'étape 3 à implémenter...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
