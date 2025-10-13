'use client'
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet } from 'lucide-react'

export default function Step2() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[#224D62]/10">
          <Wallet className="w-6 h-6 text-[#224D62]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#224D62]">Forfait et remboursement</h3>
          <p className="text-sm text-muted-foreground">Sélectionnez le forfait et le type de remboursement</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Type de remboursement</CardTitle>
          <CardDescription>
            Choisissez entre un remboursement journalier ou mensuel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Contenu de l'étape 2 à implémenter...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
