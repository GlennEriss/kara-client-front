'use client'

import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { PERMISSION_MODULES, ALL_PERMISSION_KEYS } from '@/constantes/permissions'
import { cn } from '@/lib/utils'

interface PermissionsEditorProps {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}

/**
 * Éditeur d'accès fin par action, groupé par module.
 * `value` = liste des clés de permission accordées ; `onChange` renvoie la nouvelle liste.
 */
export function PermissionsEditor({ value, onChange, disabled }: PermissionsEditorProps) {
  const selected = useMemo(() => new Set(value), [value])

  const setKeys = (keys: string[], on: boolean) => {
    const next = new Set(selected)
    for (const k of keys) {
      if (on) next.add(k)
      else next.delete(k)
    }
    onChange(Array.from(next))
  }

  const toggleOne = (key: string) => setKeys([key], !selected.has(key))

  const mainModules = PERMISSION_MODULES.filter((m) => !m.system)
  const systemModules = PERMISSION_MODULES.filter((m) => m.system)

  const renderModule = (module: (typeof PERMISSION_MODULES)[number]) => {
    const moduleKeys = module.actions.map((a) => a.key)
    const grantedCount = moduleKeys.filter((k) => selected.has(k)).length
    const allGranted = grantedCount === moduleKeys.length
    const someGranted = grantedCount > 0 && !allGranted

    return (
      <div key={module.key} className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={allGranted ? true : someGranted ? 'indeterminate' : false}
              disabled={disabled}
              onCheckedChange={(c) => setKeys(moduleKeys, c === true)}
            />
            <span className="text-sm font-semibold text-gray-900">{module.label}</span>
          </label>
          <span className="text-[11px] text-gray-400 tabular-nums">
            {grantedCount}/{moduleKeys.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pl-6 sm:grid-cols-3">
          {module.actions.map((action) => (
            <label
              key={action.key}
              className={cn('flex cursor-pointer items-center gap-2 text-xs text-gray-700', disabled && 'cursor-not-allowed opacity-60')}
            >
              <Checkbox
                checked={selected.has(action.key)}
                disabled={disabled}
                onCheckedChange={() => toggleOne(action.key)}
              />
              {action.label}
            </label>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {selected.size} permission{selected.size !== 1 ? 's' : ''} accordée{selected.size !== 1 ? 's' : ''}
        </p>
        {!disabled && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setKeys(ALL_PERMISSION_KEYS, true)}>
              Tout cocher
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onChange([])}>
              Tout décocher
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {mainModules.map(renderModule)}
      </div>

      {systemModules.length > 0 && (
        <div className="space-y-2">
          <p className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Système</p>
          {systemModules.map(renderModule)}
        </div>
      )}
    </div>
  )
}
