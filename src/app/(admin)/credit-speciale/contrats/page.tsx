import React from 'react'
import ListContrats from '@/components/credit-speciale/ListContrats'

export default function ContratsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Contrats de Crédit Spéciale
            </h1>
            <p className="text-gray-600 text-base md:text-lg">Gestion des contrats de crédit et suivi des versements</p>
          </div>
        </div>

        {/* Composant principal */}
        <ListContrats />
      </div>
    </div>
  )
}

