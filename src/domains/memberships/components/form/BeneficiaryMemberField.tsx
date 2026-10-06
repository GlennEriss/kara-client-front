'use client'

import { Button } from '@/components/ui/button'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatBeneficiary } from '@/constantes/beneficiary'
import { UNKNOWN_USER_MATRICULE } from '@/domains/financial/caisse-imprevue/import/unknownUser'
import { cn } from '@/lib/utils'
import type { RegisterFormData } from '@/schemas/schemas'
import { getMembersAlgoliaSearchService } from '@/services/search/MembersAlgoliaSearchService'
import { ChevronsUpDown, Info, Loader2, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useIntermediaryCodeSearch, type IntermediarySearchResult } from '../../hooks/useIntermediaryCodeSearch'
import { useIntermediary } from '@/hooks/useIntermediary'

/**
 * Ayant droit (bénéficiaire désigné en cas de décès) : un membre de LE KARA,
 * choisi dans la recherche des membres. Facultatif : sans ayant droit, le
 * membre « INCONNU » est enregistré automatiquement.
 */
export default function BeneficiaryMemberField() {
  const { watch, setValue } = useFormContext<RegisterFormData>()
  const beneficiary = watch('identity.beneficiary')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const searchService = useMemo(() => getMembersAlgoliaSearchService(), [])
  const isSearchAvailable = useMemo(() => searchService.isAvailable(), [searchService])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  const { results, isLoading } = useIntermediaryCodeSearch({
    query: debouncedQuery,
    enabled: isSearchAvailable && debouncedQuery.trim().length >= 2,
  })

  const matricule = beneficiary?.matricule?.trim() ?? ''
  const hasMember = !!matricule && matricule !== UNKNOWN_USER_MATRICULE
  // Matricule saisi par le membre (espace membre) sans le nom : on retrouve le
  // membre, comme pour « Qui vous a référé ? ».
  const needsLookup = hasMember && !beneficiary?.lastName
  const lookup = useIntermediary(needsLookup ? matricule : undefined)
  const [notFoundMatricule, setNotFoundMatricule] = useState<string | null>(null)

  useEffect(() => {
    if (!needsLookup || lookup.isLoading || lookup.isFetching) return
    if (lookup.data) {
      setValue(
        'identity.beneficiary',
        { matricule, lastName: lookup.data.lastName ?? '', firstName: lookup.data.firstName ?? '', isUnknown: false },
        { shouldValidate: true },
      )
    } else if (lookup.isSuccess) {
      // Aucun membre avec ce matricule : on le retire, INCONNU sera enregistré.
      setNotFoundMatricule(matricule)
      setValue('identity.beneficiary', { matricule: '', lastName: '', firstName: '' }, { shouldValidate: true })
    }
  }, [needsLookup, lookup.data, lookup.isLoading, lookup.isFetching, lookup.isSuccess, matricule, setValue])
  // Ancienne déclaration : une personne saisie à la main, qui n'est pas un membre.
  const legacyName = !matricule && beneficiary?.lastName ? [beneficiary.lastName, beneficiary.firstName].filter(Boolean).join(' ') : ''

  const select = (result: IntermediarySearchResult) => {
    setValue(
      'identity.beneficiary',
      {
        matricule: result.code,
        lastName: result.member.lastName ?? '',
        firstName: result.member.firstName ?? '',
        isUnknown: false,
      },
      { shouldValidate: true, shouldDirty: true },
    )
    setOpen(false)
    setQuery('')
    setNotFoundMatricule(null)
  }

  const clear = () => {
    setValue('identity.beneficiary', { matricule: '', lastName: '', firstName: '' }, { shouldValidate: true, shouldDirty: true })
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <ShieldCheck className="h-4 w-4 text-violet-600" />
        Ayant droit (bénéficiaire en cas de décès)
      </Label>
      <p className="text-xs text-violet-700">
        L&apos;ayant droit doit être un membre de LE KARA. Recherchez-le par son nom. Sans ayant droit, laissez vide :
        « INCONNU » sera enregistré automatiquement.
      </p>

      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                'h-12 flex-1 justify-between rounded-xl border-2 px-4 text-sm',
                hasMember ? 'border-violet-400 bg-violet-50/50' : 'border-violet-200 hover:border-violet-400',
              )}
            >
              <span className={cn('truncate', !hasMember && 'text-gray-400')}>
                {needsLookup && lookup.isLoading
                  ? `Recherche du membre ${matricule}…`
                  : hasMember
                    ? formatBeneficiary(beneficiary)
                    : 'Rechercher un membre…'}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput placeholder="Nom ou prénom du membre…" value={query} onValueChange={setQuery} />
              <CommandList>
                {!isSearchAvailable ? (
                  <p className="p-4 text-center text-sm text-amber-600">Service de recherche non disponible.</p>
                ) : isLoading ? (
                  <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recherche…
                  </div>
                ) : debouncedQuery.trim().length < 2 ? (
                  <p className="p-4 text-center text-sm text-gray-500">Tapez au moins 2 caractères</p>
                ) : results.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500">Aucun membre trouvé</p>
                ) : (
                  <CommandGroup>
                    {results.slice(0, 10).map((result) => (
                      <CommandItem key={result.member.id} value={result.displayName} onSelect={() => select(result)}>
                        {result.displayName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {hasMember && (
          <Button type="button" variant="ghost" size="icon" onClick={clear} aria-label="Retirer l'ayant droit">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!hasMember && notFoundMatricule && (
        <p className="text-xs font-medium text-amber-700">
          Aucun membre avec le matricule {notFoundMatricule} : choisissez un membre, sinon « INCONNU » sera enregistré.
        </p>
      )}
      {!hasMember && !notFoundMatricule && (
        <p className="flex items-center gap-1 text-xs text-gray-500">
          <Info className="h-3 w-3" />
          {legacyName
            ? `Ancien ayant droit saisi : ${legacyName} (pas un membre). Choisissez un membre, sinon « INCONNU » sera enregistré.`
            : 'Aucun ayant droit choisi : « INCONNU » sera enregistré.'}
        </p>
      )}
    </div>
  )
}
