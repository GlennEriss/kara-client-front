/**
 * Étape 1 : Sélection du membre
 * Utilise useEntitySearch pour la recherche
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Loader2, UserCheck, X } from 'lucide-react'
import { useEntitySearch } from '@/hooks/useEntitySearch'
import { useMember } from '@/hooks/useMembers'
import { Button } from '@/components/ui/button'
import type { CaisseSpecialeDemandFormInput } from '@/schemas/caisse-speciale.schema'

interface Step1MemberCSProps {
  form: UseFormReturn<CaisseSpecialeDemandFormInput>
}

export function Step1MemberCS({ form }: Step1MemberCSProps) {
  const memberId = form.watch('memberId')

  const {
    searchQuery,
    results,
    isLoading: isSearching,
    setSearchQuery,
  } = useEntitySearch('INDIVIDUAL')

  const { data: selectedMember, isLoading: isLoadingMember } = useMember(memberId)

  const handleEntitySelect = (entity: { id: string; displayName: string; type: string }) => {
    if (entity.type === 'member') {
      setSearchQuery('')
      form.setValue('memberId', entity.id)
    }
  }

  const handleClearSelection = () => {
    form.setValue('memberId', '')
    setSearchQuery('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-3">Sélection du membre</h3>
        <p className="text-sm text-gray-500 mb-4">
          Recherchez et sélectionnez le membre pour qui créer la demande
        </p>

        <div className="relative">
          <Input
            placeholder="Rechercher par nom, prénom ou matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-4"
            disabled={!!memberId}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>

        {searchQuery && results.length > 0 && !memberId && (
          <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto bg-white">
            {results
              .filter((entity) => entity.type === 'member')
              .map((entity) => (
                <div
                  key={entity.id}
                  onClick={() => handleEntitySelect(entity)}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center gap-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">{entity.displayName}</div>
                    {entity.additionalInfo && (
                      <div className="text-sm text-gray-500">{entity.additionalInfo}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
        )}

        {memberId && (
          <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-full bg-green-100 shrink-0">
                  <UserCheck className="h-5 w-5 text-green-700" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-green-900 mb-1">Membre sélectionné</div>
                  {isLoadingMember ? (
                    <div className="flex items-center gap-2 text-green-800">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  ) : selectedMember ? (
                    <div className="text-sm text-green-800">
                      <div className="text-green-600 text-xs mb-1">Nom et prénom</div>
                      <div className="font-semibold text-base text-green-900">
                        {selectedMember.lastName} {selectedMember.firstName}
                      </div>
                      <div className="text-green-700 font-mono text-xs mt-1">
                        Matricule: {selectedMember.matricule || '—'}
                      </div>
                      {(selectedMember.email || selectedMember.contacts?.[0]) && (
                        <div className="text-xs text-green-600 mt-1">
                          {selectedMember.contacts?.[0] && (
                            <span>{typeof selectedMember.contacts[0] === 'string' ? selectedMember.contacts[0] : String(selectedMember.contacts[0])}</span>
                          )}
                          {selectedMember.contacts?.[0] && selectedMember.email && ' • '}
                          {selectedMember.email && <span>{selectedMember.email}</span>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-green-700">ID: {memberId}</span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="shrink-0 text-green-700 hover:bg-green-100 hover:text-green-900"
                title="Changer de membre"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {form.formState.errors.memberId && (
          <p className="text-xs text-red-500 mt-2">{form.formState.errors.memberId.message}</p>
        )}
      </div>
    </div>
  )
}
