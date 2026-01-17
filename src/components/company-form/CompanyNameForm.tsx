'use client'

import React, { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { RegisterFormData } from '@/schemas/schemas'
import { CompanySuggestion } from '@/services/interfaces/IService'
import { CompanyFormMediatorFactory } from '@/factories/CompanyFormMediatorFactory'
import { useCompanySuggestions } from '@/hooks/company/useCompanySuggestions'
import SuggestionsInput from '@/components/forms/SuggestionsInput'
import { Building } from 'lucide-react'

interface CompanyNameFormProps {
  form: UseFormReturn<RegisterFormData>
}

export default function CompanyNameForm({ form }: CompanyNameFormProps) {
  const [query, setQuery] = useState('')
  const mediator = CompanyFormMediatorFactory.create(form)

  // Utiliser le hook avec cache React Query
  const { 
    suggestions, 
    isLoading, 
    error,
    prefetchPopularCompanies,
  } = useCompanySuggestions({ 
    query,
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // Précharger les entreprises populaires au montage
  useEffect(() => {
    prefetchPopularCompanies()
  }, [prefetchPopularCompanies])

  const handleInputChange = (value: string) => {
    setQuery(value)
    form.setValue('company.companyName', value)
  }

  const handleSuggestionSelect = (suggestion: CompanySuggestion) => {
    const companyName = suggestion.isNew 
      ? suggestion.name.replace(/^Créer "(.+)"$/, '$1')
      : suggestion.name
    
    setQuery(companyName)
    form.setValue('company.companyName', companyName)
    
    // Si c'est une entreprise existante, récupérer l'adresse
    if (!suggestion.isNew && suggestion.hasAddress) {
      mediator.loadCompanyAddress(companyName)
    }
  }

  return (
    <SuggestionsInput
      value={query}
      onChange={handleInputChange}
      onSuggestionSelect={handleSuggestionSelect}
      placeholder="Ex: Total Gabon, Ministère de la Santé..."
      icon={Building}
      label="Nom de l'entreprise"
      error={form.formState.errors.company?.companyName?.message || error?.message}
      suggestions={suggestions}
      isLoading={isLoading}
    />
  )
}