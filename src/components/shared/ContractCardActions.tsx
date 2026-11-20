'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Eye, MoreVertical, type LucideIcon } from 'lucide-react'
import { Fragment } from 'react'

type ContractAction = {
  id: string
  label: string
  icon: LucideIcon
  onSelect?: () => void
  visible?: boolean
  group?: 'information' | 'operations' | 'documents'
  destructive?: boolean
}

/** Pied commun aux cartes : une rangée fixe, sans masquer les droits métier. */
export function ContractCardActions({
  contractId,
  onOpen,
  openDisabled = false,
  actions,
}: {
  contractId: string
  onOpen?: () => void
  openDisabled?: boolean
  actions: ContractAction[]
}) {
  const available = actions.filter(action => action.visible !== false && action.onSelect)
  const groups = [
    { key: 'information', label: '', items: available.filter(a => !a.destructive && (!a.group || a.group === 'information')) },
    { key: 'operations', label: 'Opérations', items: available.filter(a => !a.destructive && a.group === 'operations') },
    { key: 'documents', label: 'Documents', items: available.filter(a => !a.destructive && a.group === 'documents') },
    { key: 'danger', label: '', items: available.filter(a => a.destructive) },
  ].filter(group => group.items.length)

  return (
    <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-3" data-testid="contract-card-footer">
      {onOpen && (
        <Button
          size="sm"
          onClick={onOpen}
          disabled={openDisabled}
          className="h-9 min-w-0 flex-1 bg-[#234D65] text-xs font-semibold text-white hover:bg-[#2c5a73]"
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Ouvrir
        </Button>
      )}
      {!!available.length && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Actions du contrat ${contractId}`}
              className="h-9 shrink-0 gap-1.5 rounded-lg border-[#234D65]/30 px-3 text-xs font-semibold text-[#234D65] hover:bg-blue-50 hover:text-[#234D65] data-[state=open]:bg-blue-50"
            >
              <MoreVertical className="h-3.5 w-3.5" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)] rounded-xl p-1.5 shadow-lg">
            {groups.map((group, index) => (
              <Fragment key={group.key}>
                {index > 0 && <DropdownMenuSeparator />}
                {group.label && <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">{group.label}</DropdownMenuLabel>}
                {group.items.map(action => (
                  <DropdownMenuItem
                    key={action.id}
                    onSelect={action.onSelect}
                    variant={action.destructive ? 'destructive' : 'default'}
                    className={action.destructive
                      ? 'min-h-10 cursor-pointer rounded-lg whitespace-normal'
                      : 'min-h-10 cursor-pointer rounded-lg whitespace-normal focus:bg-blue-50 focus:text-[#234D65]'}
                  >
                    <action.icon />
                    <span>{action.label}</span>
                  </DropdownMenuItem>
                ))}
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
