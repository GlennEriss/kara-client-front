import type { ChangeEventHandler } from 'react'
import { Upload } from 'lucide-react'

export function RefundFileInput({ id, accept, disabled, onChange }: {
  id: string
  accept: string
  disabled?: boolean
  onChange: ChangeEventHandler<HTMLInputElement>
}) {
  return (
    <div className="relative flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-dashed border-[#234D65]/40 bg-[#234D65]/5 px-3 py-2 text-sm font-semibold text-[#234D65] focus-within:ring-2 focus-within:ring-[#234D65] has-disabled:opacity-50">
      <Upload aria-hidden className="size-4 shrink-0" />
      <span aria-hidden>Choisir un fichier</span>
      <input id={id} type="file" accept={accept} disabled={disabled} onChange={onChange}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
    </div>
  )
}
