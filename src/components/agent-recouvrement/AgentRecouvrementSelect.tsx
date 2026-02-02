'use client'

import { useAgentsActifs } from '@/hooks/agent-recouvrement'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface AgentRecouvrementSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function AgentRecouvrementSelect({
  value,
  onValueChange,
  placeholder = 'Sélectionner un agent',
  required = false,
  disabled = false,
  className,
}: AgentRecouvrementSelectProps) {
  const { data: agents, isLoading, error } = useAgentsActifs()

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />
  }

  if (error) {
    return <p className="text-sm text-destructive">Erreur chargement des agents</p>
  }

  const selectValue = value || '__none__'
  return (
    <Select value={selectValue} onValueChange={(v) => onValueChange?.(v === '__none__' ? '' : v)} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {!required && <SelectItem value="__none__">Aucun</SelectItem>}
        {agents?.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.nom} {agent.prenom} - {agent.tel1}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
