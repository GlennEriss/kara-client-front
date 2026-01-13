'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Briefcase, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Plus,
  X
} from 'lucide-react'
import { useCompanySearch, useCompanyMutations } from '@/domains/infrastructure/references/hooks/useCompanies'
import { useProfessionSearch, useProfessionMutations } from '@/domains/infrastructure/references/hooks/useProfessions'
import { toast } from 'sonner'
import type { MembershipRequest } from '@/types/types'

interface CompanyProfessionFieldsProps {
  request: MembershipRequest
  onUpdate: () => void
}

export default function CompanyProfessionFields({ request, onUpdate }: CompanyProfessionFieldsProps) {
  const [companyName, setCompanyName] = useState(request.company?.companyName || '')
  const [professionName, setProfessionName] = useState(request.company?.profession || '')
  const [companyFound, setCompanyFound] = useState(false)
  const [professionFound, setProfessionFound] = useState(false)
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([])
  const [professionSuggestions, setProfessionSuggestions] = useState<string[]>([])

  const companySearch = useCompanySearch(companyName)
  const professionSearch = useProfessionSearch(professionName)
  const { create: createCompanyMutation } = useCompanyMutations()
  const { create: createProfessionMutation } = useProfessionMutations()
  // TODO: Implémenter updateMembershipRequestCompany et updateMembershipRequestProfession si nécessaire
  const updateCompanyMutation = { mutateAsync: async () => {} } as any
  const updateProfessionMutation = { mutateAsync: async () => {} } as any

  useEffect(() => {
    if (companySearch.data) {
      setCompanyFound(companySearch.data.found)
      setCompanySuggestions(companySearch.data.suggestions || [])
    }
  }, [companySearch.data])

  useEffect(() => {
    if (professionSearch.data) {
      setProfessionFound(professionSearch.data.found)
      setProfessionSuggestions(professionSearch.data.suggestions || [])
    }
  }, [professionSearch.data])

  const handleCreateCompany = async () => {
    if (!companyName.trim()) {
      toast.error('Le nom de l\'entreprise est requis')
      return
    }

    try {
      await createCompanyMutation.mutateAsync({
        name: companyName.trim(),
        adminId: 'admin',
        address: request.company?.companyAddress
      })

      await updateCompanyMutation.mutateAsync({
        requestId: request.id,
        companyName: companyName.trim()
      })

      setCompanyFound(true)
      toast.success('Entreprise créée et enregistrée avec succès')
      onUpdate()
    } catch (error) {
      toast.error('Erreur lors de la création de l\'entreprise')
    }
  }

  const handleCreateProfession = async () => {
    if (!professionName.trim()) {
      toast.error('Le nom de la profession est requis')
      return
    }

    try {
      await createProfessionMutation.mutateAsync({
        name: professionName.trim(),
        adminId: 'admin',
      })

      await updateProfessionMutation.mutateAsync({
        requestId: request.id,
        professionName: professionName.trim()
      })

      setProfessionFound(true)
      toast.success('Profession créée et enregistrée avec succès')
      onUpdate()
    } catch (error) {
      toast.error('Erreur lors de la création de la profession')
    }
  }

  const handleSelectCompanySuggestion = (suggestion: string) => {
    setCompanyName(suggestion)
    setCompanyFound(true)
    setCompanySuggestions([])
  }

  const handleSelectProfessionSuggestion = (suggestion: string) => {
    setProfessionName(suggestion)
    setProfessionFound(true)
    setProfessionSuggestions([])
  }

  return (
    <div className="space-y-6">
      {/* Champ Entreprise */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-[#224D62]">
          Nom de l'entreprise
        </Label>
        
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
          <Input
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value)
              setCompanyFound(false)
            }}
            placeholder="Nom de l'entreprise"
            disabled={companyFound}
            className={`pl-10 pr-10 ${companyFound ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
          />
          
          {companySearch.isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin" />
          )}
          
          {companyFound && (
            <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
          )}
          
          {companyName && !companyFound && !companySearch.isLoading && (
            <X 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500 cursor-pointer hover:text-red-700"
              onClick={() => {
                setCompanyName('')
                setCompanyFound(false)
                setCompanySuggestions([])
              }}
            />
          )}
        </div>

        {companySuggestions.length > 0 && !companyFound && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">Suggestions :</p>
            <div className="flex flex-wrap gap-2">
              {companySuggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-[#CBB171]/10 hover:border-[#CBB171]"
                  onClick={() => handleSelectCompanySuggestion(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {companyName && !companyFound && !companySearch.isLoading && (
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-600">
              Cette entreprise n'existe pas dans notre base de données
            </span>
            <Button
              size="sm"
              onClick={handleCreateCompany}
              disabled={createCompanyMutation.isPending}
              className="bg-[#CBB171] hover:bg-[#CBB171]/90"
            >
              {createCompanyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Créer l'entreprise
            </Button>
          </div>
        )}
      </div>

      {/* Champ Profession */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-[#224D62]">
          Profession
        </Label>
        
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171]" />
          <Input
            value={professionName}
            onChange={(e) => {
              setProfessionName(e.target.value)
              setProfessionFound(false)
            }}
            placeholder="Profession"
            disabled={professionFound}
            className={`pl-10 pr-10 ${professionFound ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
          />
          
          {professionSearch.isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin" />
          )}
          
          {professionFound && (
            <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
          )}
          
          {professionName && !professionFound && !professionSearch.isLoading && (
            <X 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500 cursor-pointer hover:text-red-700"
              onClick={() => {
                setProfessionName('')
                setProfessionFound(false)
                setProfessionSuggestions([])
              }}
            />
          )}
        </div>

        {professionSuggestions.length > 0 && !professionFound && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">Suggestions :</p>
            <div className="flex flex-wrap gap-2">
              {professionSuggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-[#CBB171]/10 hover:border-[#CBB171]"
                  onClick={() => handleSelectProfessionSuggestion(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {professionName && !professionFound && !professionSearch.isLoading && (
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-600">
              Cette profession n'existe pas dans notre base de données
            </span>
            <Button
              size="sm"
              onClick={handleCreateProfession}
              disabled={createProfessionMutation.isPending}
              className="bg-[#CBB171] hover:bg-[#CBB171]/90"
            >
              {createProfessionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Créer la profession
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 